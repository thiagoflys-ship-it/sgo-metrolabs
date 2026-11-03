/****************************************************
 * SGO+ LICITAÇÕES — CENTRAL DE DISPUTAS (MODO ASSISTIDO) E RESULTADO (02/11/2026)
 *
 * Missão (docs/LICITACOES_00_MISSAO_DIRETORIA_20261101.md, "Disputas"): agenda de sessões, painel, itens, histórico de lances,
 * valor inicial, piso autorizado, margem mínima, intervalo, estratégia sugerida, alertas e registro de decisões. Nunca abaixo do
 * piso; nunca contornar CAPTCHA nem autenticação. Hoje nenhuma plataforma de disputa dá a sessão por API (doc 02, achados 5 e 6):
 * este módulo é SÓ o modo ASSISTIDO. O SGO+ nunca envia lance nem acessa portal: a Diretoria dá o lance no portal e DIGITA aqui o
 * que deu e o melhor lance do concorrente. A IA não participa: a sugestão do próximo lance é uma regra fixa (abaixo).
 * Manual: docs/MANUAL_MODULO_LICITACOES.md, seção "Disputas (Central de disputas e aba Disputa da ficha)".
 *
 * Abrir a disputa (aba Disputa da ficha): exige a proposta EMITIDA (SGO_Licitacoes_Proposta.js) e a simulação de preço que ela usou
 * (SGO_Licitacoes_Precos.js), as duas conferidas pelo hash. Cada item cotado entra com:
 *   - valor inicial = o preço unitário da proposta emitida;
 *   - piso autorizado = o piso da simulação (sobra mínima da política, 35% no padrão), por item. A Diretoria muda o piso de um item
 *     só com o motivo (fica no registro de decisões e no histórico); abaixo do custo mais os impostos (sobra zero) o prejuízo aparece
 *     em vermelho e só grava com "assumo o prejuízo";
 *   - margem mínima da política usada na simulação, custo unitário com o deslocamento diluído e os impostos da mesma conta;
 *   - intervalo mínimo entre lances: o do edital (a tela mostra a frase da leitura, quando há) ou digitado; sem nada, R$ 0,01.
 * A oportunidade vai para "Disputa" no Kanban (mesma regra de transição: motivo e LIC_HISTORICO).
 *
 * Painel da sessão: por item, o nosso lance atual e o melhor lance do concorrente (digitados), a sobra a cada valor (LicP_sobra_,
 * a mesma conta da simulação, com os impostos da política gravada nela), a distância ao piso e a SUGESTÃO do próximo lance:
 *   melhor lance do concorrente − intervalo (R$ ou %, centavo para baixo); se ficar abaixo do piso, não há sugestão de valor
 *   ("cobrir passaria do piso"); se o nosso já é o melhor, "não precisa dar lance". Lance nosso abaixo do piso é RECUSADO com o
 *   porquê (nada é gravado). "Parar sugestões" (botão de interrupção) e "Desistir do item" ficam no registro, com o motivo.
 *
 * Registro imutável: LIC_DISPUTA_LANCES (uma linha por lance ou decisão; SEQ e HASH encadeado com o anterior; o último fica em
 * LIC_DISPUTAS.ULTIMO_SEQ e ULTIMO_HASH). Não existe ação de alterar nem de apagar. Com a cadeia quebrada (linha mudada ou
 * apagada fora do SGO+), o SGO+ para de registrar lances e diz o que fazer. Piso, intervalo, desistência e sugestões paradas são
 * lidos do próprio registro (o estado de cada item é a soma das decisões gravadas).
 *
 * Resultado: LIC_RESULTADOS, uma linha por versão do resultado de cada item (ganho, perdido, fracassado, deserto, desclassificado
 * com motivo, habilitação pendente, recurso), com colocação, vencedor, valor final, adjudicação, homologação e a FONTE. Recurso e
 * contrarrazões criam os prazos na agenda (LIC_EVENTOS) como PENDENTE DE CONFIRMAÇÃO (natureza PREVISTO: sem alerta até alguém
 * confirmar a data). "Concluir o resultado" (todos os itens com resultado, motivo) leva a oportunidade para "Resultado" no Kanban e
 * prepara o dado da etapa de Contrato (LIC_DISPUTAS.CONTRATO_JSON: itens ganhos, valores e datas; o contrato é a próxima frente).
 *
 * Relatório A4 da disputa: SGO_Licitacoes_Relatorios.js (LicRel_gravar_, tipo DISPUTA), versão imutável com o SHA-256.
 * Ações: Licitacoes_api(sessionId, 'disputa', { op, ... }); só Diretoria e Administrador. Nenhuma função devolve Date cru.
 ****************************************************/

var LICD_REGRAS = 'LIC-DISPUTA-2026-11-02.1';
var LICD_ABAS = { DISPUTAS: 'LIC_DISPUTAS', LANCES: 'LIC_DISPUTA_LANCES', RESULTADOS: 'LIC_RESULTADOS' };
var LICD_COLUNAS = {
  LIC_DISPUTAS: ['ID', 'OPORTUNIDADE_ID', 'CODIGO', 'SITUACAO', 'MODO', 'PROPOSTA_ID', 'PROPOSTA_NUMERO', 'PROPOSTA_VERSAO', 'PROPOSTA_SHA256', 'SIMULACAO_VERSAO', 'SIMULACAO_HASH',
    'SESSAO_ISO', 'SESSAO_FONTE', 'PORTAL_NOME', 'INTERVALO_TIPO', 'INTERVALO_VALOR', 'INTERVALO_FONTE', 'BASE_JSON', 'BASE_HASH', 'MOTIVO', 'ABERTA_POR_ID', 'ABERTA_POR_NOME', 'ABERTA_EM',
    'ULTIMO_SEQ', 'ULTIMO_HASH', 'RESULTADO_EM', 'RESULTADO_POR_ID', 'RESULTADO_POR_NOME', 'RESULTADO_MOTIVO', 'CONTRATO_JSON', 'HASH', 'ATUALIZADO_EM'],
  // UMA LINHA POR LANCE OU DECISÃO; nunca muda depois de gravada (hash encadeado)
  LIC_DISPUTA_LANCES: ['ID', 'DISPUTA_ID', 'OPORTUNIDADE_ID', 'CODIGO', 'SEQ', 'ITEM', 'TIPO', 'AUTOR', 'CONCORRENTE', 'VALOR', 'VALOR_ANTERIOR', 'ORIGEM', 'SUGERIDO', 'SUGESTAO',
    'PISO', 'SOBRA', 'SOBRA_PCT', 'ASSUMO', 'MOTIVO', 'TEXTO', 'QUANDO', 'POR_ID', 'POR_NOME', 'HASH_ANTERIOR', 'HASH'],
  // UMA LINHA POR VERSÃO DO RESULTADO DE CADA ITEM; vale a versão mais alta; nada é alterado
  LIC_RESULTADOS: ['ID', 'DISPUTA_ID', 'OPORTUNIDADE_ID', 'CODIGO', 'ITEM', 'VERSAO', 'SITUACAO', 'COLOCACAO', 'VENCEDOR', 'VENCEDOR_CNPJ', 'VALOR_FINAL', 'VALOR_TOTAL', 'MOTIVO',
    'ADJUDICACAO_EM', 'HOMOLOGACAO_EM', 'ATA_EM', 'RECURSO_PARTE', 'FONTE', 'OBS', 'EVENTOS', 'POR_ID', 'POR_NOME', 'EM', 'HASH']
};
var LICD_COLUNAS_TEXTO = {
  LIC_DISPUTAS: ['PROPOSTA_NUMERO', 'PROPOSTA_SHA256', 'SIMULACAO_HASH', 'SESSAO_ISO', 'BASE_HASH', 'ABERTA_EM', 'ULTIMO_HASH', 'RESULTADO_EM', 'HASH', 'ATUALIZADO_EM'],
  LIC_DISPUTA_LANCES: ['ITEM', 'CONCORRENTE', 'MOTIVO', 'TEXTO', 'POR_ID', 'QUANDO', 'HASH_ANTERIOR', 'HASH'],
  LIC_RESULTADOS: ['ITEM', 'VENCEDOR_CNPJ', 'ADJUDICACAO_EM', 'HOMOLOGACAO_EM', 'ATA_EM', 'EM', 'HASH']
};
var LICD_SITUACOES = { ABERTA: 'Disputa aberta (modo assistido)', RESULTADO: 'Resultado registrado' };
var LICD_RESULTADOS = { GANHO: 'Ganho', PERDIDO: 'Perdido', FRACASSADO: 'Fracassado', DESERTO: 'Deserto', DESCLASSIFICADO: 'Desclassificado', HABILITACAO_PENDENTE: 'Habilitação pendente', RECURSO: 'Em recurso' };
var LICD_TIPOS = { LANCE: 'Lance', PISO: 'Piso autorizado', INTERVALO: 'Intervalo mínimo', DESISTENCIA: 'Desistência do item', SUGESTOES: 'Sugestões', ANCORA: 'Quebra do registro reconhecida pelo Administrador' };
var LICD_ABRIR_DE = ['RADAR', 'ANALISE', 'DECISAO', 'PROPOSTA'];
var LICD_INTERVALO_PADRAO = 0.01;
var LICD_AVISO_ASSISTIDO = 'Modo assistido: o SGO+ não envia lance nem acessa o portal. Dê o lance no portal e registre aqui o valor que você deu e o melhor lance do concorrente.';

// ------------------------------------------------------------ utilitários
function LicD_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('LICD_ABAS_OK_V1')) return; } catch (e) {}
  Object.keys(LICD_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, LICD_COLUNAS[aba]);
    LICD_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (LICD_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (cache) cache.put('LICD_ABAS_OK_V1', '1', 21600); } catch (e) {}
}
function LicD_n_(v) { return LicP_n_(v); }
function LicD_r2_(v) { return LicP_r2_(v); }
function LicD_moeda_(v) { return LicP_moeda_(v); }
function LicD_pct_(v) { return LicP_pct_(v, 2); }
/** Número normalizado para o hash ('' fica ''). */
function LicD_h_(v) { if (v === '' || v === null || v === undefined) return ''; var n = Number(v); return isFinite(n) ? String(Math.round(n * 100) / 100) : Lic_s_(v); }
/** "02/11/2026 14:05:09" em Brasília (deslocamento fixo -03:00, como a agenda). */
function LicD_br_(iso) { var t = Date.parse(Lic_s_(iso)); if (!isFinite(t)) return ''; var d = new Date(t - 3 * 3600e3).toISOString(); return d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) + ' ' + d.slice(11, 19); }
function LicD_dia_(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(Lic_s_(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function LicD_diaValido_(v) {
  var t = Lic_s_(v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
  var ms = Date.parse(t + 'T12:00:00Z');
  return isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === t ? t : '';
}
/** Texto livre gravado: nunca começa com = + @ (célula não vira fórmula). */
function LicD_txt_(v, max) { return Lic_texto_(Lic_s_(v).replace(/\r\n/g, '\n').replace(/^(?:[=+@\s]|-(?!\d))+/, ''), max || 1000); }
function LicD_motivo_(v, oQue) {
  var m = LicD_txt_(v, 1000);
  if (m.length < 10) throw new Error('Escreva o motivo ' + oQue + ' (pelo menos 10 letras): ele fica no registro da disputa e no histórico, com o seu nome e a hora. Nada foi gravado');
  return m;
}
/**
 * Leitura ESTRITA de um valor digitado (revisão de bddf933): vírgula para os centavos, ponto só como milhar junto da vírgula
 * ("1.234,56"); no máximo 2 casas; sem "%". { valor } ou { erro } com o que fazer. Número (não texto) passa com até 2 casas.
 * É a mesma conferência da tela (LicDp_lerReais_, JS_Licitacoes_Disputa.html). O simulador de preços (LicP_n_) não muda.
 * o.pct: campo em % (aceita o sinal "%" no fim).
 */
function LicD_lerReais_(v, o) {
  o = o || {};
  if (typeof v === 'number') {
    if (!isFinite(v)) return { erro: 'valor inválido' };
    return Math.abs(Math.round(v * 100) - v * 100) > 1e-6 ? { erro: 'use no máximo 2 casas decimais (centavos)' } : { valor: v };
  }
  var s = Lic_s_(v).replace(/^R\$\s*/i, '').replace(/\s+/g, '');
  if (o.pct) s = s.replace(/%$/, '');
  if (!s) return { erro: 'vazio' };
  if (/%/.test(s)) return { erro: o.pct ? 'escreva só o número do percentual' : 'sem o sinal "%" (o campo é em reais)' };
  if (/\./.test(s) && !/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) return { erro: 'use vírgula para os centavos (por exemplo 185,40); ponto só para o milhar junto da vírgula (1.234,56)' };
  if (!/^\d{1,3}(\.\d{3})+(,\d+)?$|^\d+(,\d+)?$/.test(s)) return { erro: 'escreva só números (por exemplo 185,40)' };
  var dec = (s.split(',')[1] || '');
  if (dec.length > 2) return { erro: 'use no máximo 2 casas decimais (centavos)' };
  var n = Number(s.replace(/\./g, '').replace(',', '.'));
  return isFinite(n) ? { valor: n } : { erro: 'valor inválido' };
}
function LicD_valor_(v, rotulo) {
  var r = LicD_lerReais_(v);
  if (r.erro && r.erro !== 'vazio' && r.erro !== 'escreva só números (por exemplo 185,40)') throw new Error('Escreva ' + rotulo + ' em reais: ' + r.erro + '. Nada foi gravado');
  var n = r.erro ? null : r.valor;
  if (n === null || !(n > 0) || n > 100000000) throw new Error('Escreva ' + rotulo + ' em reais, maior que zero (por exemplo 185,40). Nada foi gravado');
  return LicD_r2_(n);
}
/** Percentual digitado (intervalo em %): mesmas regras, com "%" opcional no fim. */
function LicD_pctDigitado_(v, rotulo) {
  var r = LicD_lerReais_(v, { pct: true });
  if (r.erro) throw new Error('Escreva ' + rotulo + ': ' + (r.erro === 'vazio' ? 'o campo está vazio' : r.erro) + '. Nada foi gravado');
  return r.valor;
}

// ------------------------------------------------------------ conta (a mesma da simulação)
/** Impostos e comissão da conta, pela política GRAVADA na simulação (não a de hoje). */
function LicD_pc_(pol) {
  var c = (pol && pol.comercial) || {}, l = (pol && pol.licitacao) || {};
  return { imp: Number(c.impostosServicoPct) || 0, impP: Number(c.impostosProdutoPct) || 0, cred: Number(c.creditoProdutoPct) || 0, comissao: Number(l.comissaoPct) || 0 };
}
/** Preço unitário em que a sobra é zero (custo mais os impostos e a comissão), centavo para cima. null se a conta não fecha. */
function LicD_precoSobraZero_(custo, tipo, pc) {
  var C = Number(custo) || 0;
  if (!(C > 0)) return null;
  var d = tipo === 'PRODUTO' ? 1 - ((pc.impP || 0) + (pc.comissao || 0)) / 100 : 1 - ((pc.imp || 0) + (pc.comissao || 0)) / 100;
  if (!(d > 0.05)) return null;
  var p = tipo === 'PRODUTO' ? C * (1 - (pc.cred || 0) / 100) / d : C / d;
  return Math.ceil(p * 100 - 1e-7) / 100;
}
/** Sobra de um valor unitário no item: { sobra (unitária), pct, total (× quantidade) } ou null. */
function LicD_sobra_(it, valor) {
  if (valor === null || valor === undefined || !(Number(valor) > 0)) return null;
  var s = LicP_sobra_(Number(valor), it.custoUnit, it.tipo, it.pc);
  if (!s) return null;
  return { sobra: s.sobra, pct: s.pct, total: LicD_r2_(s.sobra * (Number(it.quantidade) || 0)) };
}
/** Intervalo em reais a partir de um valor de referência (o melhor lance do concorrente). */
function LicD_intervaloReais_(iv, ref) {
  if (!iv) return LICD_INTERVALO_PADRAO;
  if (iv.tipo === 'PERCENTUAL') return Math.max(0.01, Math.ceil((Number(ref) || 0) * (Number(iv.valor) || 0) / 100 * 100 - 1e-7) / 100);
  return Math.max(0.01, LicD_r2_(iv.valor));
}
function LicD_intervaloTxt_(iv) { return iv ? (iv.tipo === 'PERCENTUAL' ? LicP_pct_(iv.valor, 2) + ' do melhor lance' : LicD_moeda_(iv.valor)) : LicD_moeda_(LICD_INTERVALO_PADRAO); }

// ------------------------------------------------------------ fontes: proposta emitida e a simulação que ela usou
function LicD_disputasDe_(oid) { return Lic_ler_(LICD_ABAS.DISPUTAS).filter(function (x) { return Lic_s_(x.OPORTUNIDADE_ID) === Lic_s_(oid); }).sort(function (a, b) { return Lic_s_(b.ABERTA_EM) < Lic_s_(a.ABERTA_EM) ? -1 : 1; }); }
/** Revisão de bddf933: o hash cobre também o último registro (ULTIMO_SEQ e ULTIMO_HASH). u: { seq, hash } no lugar dos gravados. */
function LicD_hashDisputa_(r, u) {
  var seq = u ? u.seq : r.ULTIMO_SEQ, h = u ? u.hash : r.ULTIMO_HASH;
  return Lic_hash_([Lic_s_(r.OPORTUNIDADE_ID), Lic_s_(r.PROPOSTA_ID), Lic_s_(r.PROPOSTA_SHA256), Lic_s_(r.SIMULACAO_HASH), Lic_s_(r.BASE_HASH), Lic_s_(r.SESSAO_ISO), Lic_s_(r.INTERVALO_TIPO),
    LicD_h_(r.INTERVALO_VALOR), Lic_s_(r.MOTIVO), Lic_s_(r.ABERTA_POR_ID), Lic_s_(r.ABERTA_EM), Lic_s_(r.MODO), String(Number(seq) || 0), Lic_s_(h)].join('|'));
}
function LicD_integra_(r) { return LicD_hashDisputa_(r) === Lic_s_(r.HASH) && Lic_hash_(Lic_s_(r.BASE_JSON)) === Lic_s_(r.BASE_HASH); }
/**
 * O último registro que a disputa ASSINOU (o HASH da disputa confere com ele): o gravado, o começo (0) ou um registro da lista.
 * Prova que os dados da abertura não mudaram mesmo quando ULTIMO_* foi mexido. null: a abertura foi alterada fora do SGO+.
 */
function LicD_assinado_(r, lista) {
  if (Lic_hash_(Lic_s_(r.BASE_JSON)) !== Lic_s_(r.BASE_HASH)) return null;
  var cands = [{ seq: Number(r.ULTIMO_SEQ) || 0, hash: Lic_s_(r.ULTIMO_HASH) }, { seq: 0, hash: '' }].concat((lista || []).map(function (x) { return { seq: Number(x.SEQ) || 0, hash: Lic_s_(x.HASH) }; }));
  for (var i = 0; i < cands.length; i++) if (LicD_hashDisputa_(r, cands[i]) === Lic_s_(r.HASH)) return cands[i];
  return null;
}

/**
 * O que a disputa precisa para abrir: { bloqueios: [texto com o que fazer], avisos, proposta, simulacao, itens (base de cada item) }.
 * Nunca lança: a tela mostra os bloqueios.
 */
function LicD_fontes_(l) {
  var r = { bloqueios: [], avisos: [], proposta: null, simulacao: null, itens: [], politica: null };
  if (typeof LicProp_propostasDe_ !== 'function' || typeof LicP_simulacoesDe_ !== 'function') { r.bloqueios.push('A proposta e o simulador de preços não estão disponíveis neste ambiente.'); return r; }
  var props = LicProp_propostasDe_(l.ID), emitida = props.filter(function (p) { return Lic_up_(p.SITUACAO) === 'EMITIDA'; })[0] || null;
  if (!emitida) { r.bloqueios.push('Sem proposta emitida: a disputa começa do valor da proposta emitida. Monte, aprove e emita a proposta na aba Proposta.'); return r; }
  if (!LicProp_integra_(emitida)) { r.bloqueios.push('A proposta emitida ' + Lic_s_(emitida.NUMERO) + ' não confere com o hash gravado (alterada fora do SGO+): emita uma nova versão na aba Proposta e avise o Administrador.'); return r; }
  if (props[0] && Lic_s_(props[0].ID) !== Lic_s_(emitida.ID) && Lic_up_(props[0].SITUACAO) !== 'SUBSTITUIDA') r.avisos.push('Há uma versão mais nova da proposta ainda não emitida (' + Lic_s_(props[0].NUMERO) + '): a disputa usa a emitida, ' + Lic_s_(emitida.NUMERO) + '.');
  var c = LicProp_conteudo_(emitida);
  if (!c || !c.simulacao) { r.bloqueios.push('A proposta emitida não guarda a simulação de preço usada: emita uma nova versão a partir da simulação salva.'); return r; }
  r.proposta = { id: Lic_s_(emitida.ID), numero: Lic_s_(emitida.NUMERO), versao: Number(emitida.VERSAO) || 0, sha256: Lic_s_(emitida.HTML_SHA256), total: Number(emitida.TOTAL) || 0, emitidoEm: Lic_s_(emitida.EMITIDO_EM), emitidoPor: Lic_s_(emitida.EMITIDO_POR_NOME) };
  var s = LicP_simulacoesDe_(l.ID).filter(function (x) { return Number(x.VERSAO) === Number(c.simulacao.versao); })[0];
  if (!s) { r.bloqueios.push('A simulação de preço versão ' + c.simulacao.versao + ', usada na proposta, não foi encontrada: salve a simulação e emita a proposta de novo.'); return r; }
  if (LicP_hashSim_(s) !== Lic_s_(s.HASH) || Lic_s_(s.HASH) !== Lic_s_(c.simulacao.hash)) { r.bloqueios.push('A simulação de preço versão ' + c.simulacao.versao + ' não confere com o hash gravado na proposta (alterada fora do SGO+): salve uma versão nova na aba Preço e emita a proposta de novo.'); return r; }
  var res = Lic_json_(s.RESULTADO_JSON, null);
  if (!res || !Array.isArray(res.itens)) { r.bloqueios.push('O resultado da simulação versão ' + c.simulacao.versao + ' não pôde ser lido: salve uma versão nova na aba Preço.'); return r; }
  r.simulacao = { versao: Number(s.VERSAO) || 0, hash: Lic_s_(s.HASH), em: Lic_s_(s.CRIADO_EM), por: Lic_s_(s.POR_NOME) };
  r.politica = res.politica || {};
  var pc = LicD_pc_(res.politica), lp = (res.politica && res.politica.licitacao) || {}, vistos = {};
  (c.itens || []).filter(function (i) { return i.situacao === 'COTADO'; }).forEach(function (i) {
    var num = Lic_s_(i.numero);
    if (vistos[num]) { r.bloqueios.push('Dois itens com o número ' + num + ' na proposta: corrija os números na aba Preço, salve e emita a proposta de novo.'); return; }
    vistos[num] = true;
    var si = res.itens.filter(function (x) { return Lic_s_(x.numero || x.n) === num && Lic_up_(x.codigo) === Lic_up_(i.codigo); })[0];
    if (!si) { r.bloqueios.push('Item ' + num + ': não está na simulação usada pela proposta.'); return; }
    var custo = Number(si.custoUnitTotal), piso = si.pisoUnit === null || si.pisoUnit === undefined ? null : Number(si.pisoUnit);
    if (!(custo > 0) || !(piso > 0)) { r.bloqueios.push('Item ' + num + ' (' + Lic_s_(i.codigo) + ') sem piso na simulação versão ' + r.simulacao.versao + ': sem piso não há disputa. Resolva a pendência na aba Preço, salve e emita a proposta de novo.'); return; }
    var it = { item: num, codigo: Lic_up_(i.codigo), nome: Lic_s_(i.nome), descricao: Lic_texto_(i.descricao, 300), quantidade: Number(i.quantidade) || 0, valorInicial: LicD_r2_(i.precoUnit),
      pisoSimulacao: LicD_r2_(piso), custoUnit: Math.round(custo * 10000) / 10000, tipo: Lic_up_(si.tipo) || 'SERVICO', precoEdital: si.precoEdital === null || si.precoEdital === undefined ? null : Number(si.precoEdital),
      alvoUnit: si.alvoUnit === null || si.alvoUnit === undefined ? null : Number(si.alvoUnit), margemMinPct: Number(lp.margemMinPct) || 0, margemAlvoPct: Number(lp.margemAlvoPct) || 0, pc: pc };
    it.pisoCusto = LicD_precoSobraZero_(it.custoUnit, it.tipo, pc);
    if (it.valorInicial < it.pisoSimulacao - 0.004) r.avisos.push('Item ' + num + ': o valor da proposta (' + LicD_moeda_(it.valorInicial) + ') já está abaixo do piso da simulação (' + LicD_moeda_(it.pisoSimulacao) + '). Nenhum lance é possível sem a Diretoria autorizar um piso menor, com o motivo.');
    r.itens.push(it);
  });
  if (!r.itens.length && !r.bloqueios.length) r.bloqueios.push('A proposta emitida não tem item cotado: não há o que disputar.');
  return r;
}

/** Frase do edital sobre o intervalo mínimo entre lances (leitura consolidada), quando há. { trecho, fonte, sugestao: { tipo, valor } } ou null. */
function LicD_intervaloEdital_(l) {
  try {
    if (typeof LicProp_checklist_ !== 'function') return null;
    var ck = LicProp_checklist_(l), achado = null;
    (ck.itens || []).some(function (it) {
      var t = Lic_s_(it.trecho);
      if (!/intervalo\s+m[ií]nimo/i.test(t) && !/diferen[cç]a\s+m[ií]nima\s+entre\s+(os\s+)?lances/i.test(t)) return false;
      var sug = null, m = /(\d{1,3}(?:[.,]\d{1,2})?)\s*%/.exec(t), mr = /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/.exec(t);
      if (mr) sug = { tipo: 'VALOR', valor: LicD_n_(mr[1]) }; else if (m) sug = { tipo: 'PERCENTUAL', valor: LicD_n_(m[1]) };
      achado = { trecho: Lic_texto_(t, 600), fonte: typeof LicProp_fonteTxt_ === 'function' ? LicProp_fonteTxt_(it) : '', item: Lic_s_(it.id), sugestao: sug && sug.valor > 0 ? sug : null };
      return true;
    });
    return achado;
  } catch (e) { return null; }
}
/** Sessão pela agenda (sessão pública ou, no Compras.gov.br, o fim das propostas), sem gravar: { iso, texto, natureza, fonte } ou null. */
function LicD_sessaoAgenda_(l) {
  try {
    var evs = Lic_eventosDe_(l.ID).filter(function (e) { return Lic_eventoValendo_(e) && Lic_s_(e.QUANDO_ISO); });
    var ses = evs.filter(function (e) { return Lic_s_(e.TIPO) === 'SESSAO_PUBLICA'; })[0] || evs.filter(function (e) { return Lic_s_(e.TIPO) === 'LIMITE_PROPOSTA'; })[0];
    return ses ? { iso: Lic_s_(ses.QUANDO_ISO), texto: Lic_eventoQuandoTxt_(ses), natureza: Lic_up_(ses.NATUREZA), fonte: 'Agenda: ' + Lic_s_(ses.NOME) + ' (' + (LIC_NATUREZAS[Lic_up_(ses.NATUREZA)] || '').toLowerCase() + ')' } : null;
  } catch (e) { return null; }
}

// ------------------------------------------------------------ registro imutável (lances e decisões)
function LicD_hashLance_(x) {
  return Lic_hash_([Lic_s_(x.DISPUTA_ID), String(Number(x.SEQ) || 0), Lic_s_(x.ITEM), Lic_up_(x.TIPO), Lic_up_(x.AUTOR), Lic_s_(x.CONCORRENTE), LicD_h_(x.VALOR), LicD_h_(x.VALOR_ANTERIOR), Lic_up_(x.ORIGEM),
    Lic_up_(x.SUGERIDO), LicD_h_(x.SUGESTAO), LicD_h_(x.PISO), Lic_up_(x.ASSUMO), Lic_s_(x.MOTIVO), Lic_s_(x.TEXTO), Lic_s_(x.QUANDO), Lic_s_(x.POR_ID), Lic_s_(x.HASH_ANTERIOR),
    LicD_h_(x.SOBRA), LicD_h_(x.SOBRA_PCT), Lic_s_(x.POR_NOME)].join('|'));
}
function LicD_lancesDe_(did) { return Lic_ler_(LICD_ABAS.LANCES).filter(function (x) { return Lic_s_(x.DISPUTA_ID) === Lic_s_(did); }).sort(function (a, b) { return (Number(a.SEQ) || 0) - (Number(b.SEQ) || 0); }); }
/**
 * Confere a cadeia contra o último registro ASSINADO pela disputa (ass: LicD_assinado_). Conta a partir da última âncora válida
 * (quebra reconhecida pelo Administrador). { integra, problema, ajustar, ancora }:
 *   - ajustar: registros a mais, válidos e encadeados a partir do assinado (a gravação da linha deu certo e a da disputa não):
 *     a cadeia confere e ULTIMO_* avança sozinho na próxima gravação (revisão de bddf933, ALTA 1, a);
 *   - ancora: a quebra anterior reconhecida (quem, quando, motivo, o que estava quebrado).
 */
function LicD_cadeia_(d, lista, ass) {
  ass = ass || { seq: Number(d.ULTIMO_SEQ) || 0, hash: Lic_s_(d.ULTIMO_HASH) };
  var k = -1;
  for (var j = lista.length - 1; j >= 0; j--) if (Lic_up_(lista[j].TIPO) === 'ANCORA' && LicD_hashLance_(lista[j]) === Lic_s_(lista[j].HASH)) { k = j; break; }
  var seq0 = k >= 0 ? Number(lista[k].SEQ) || 0 : 0, ant = k >= 0 ? Lic_s_(lista[k].HASH) : '', problema = '', vistos = {};
  vistos[seq0] = ant;
  for (var i = k + 1; i < lista.length && !problema; i++) {
    var x = lista[i], esp = seq0 + (i - k);
    if ((Number(x.SEQ) || 0) !== esp) problema = 'falta o registro ' + esp + ' ou a ordem mudou';
    else if (Lic_s_(x.HASH_ANTERIOR) !== ant) problema = 'o registro ' + x.SEQ + ' não se liga ao anterior';
    else if (LicD_hashLance_(x) !== Lic_s_(x.HASH)) problema = 'o registro ' + x.SEQ + ' foi alterado';
    ant = Lic_s_(x.HASH); vistos[Number(x.SEQ) || 0] = ant;
  }
  var ultSeq = lista.length ? (k >= 0 ? seq0 + (lista.length - 1 - k) : lista.length) : 0, ajustar = null;
  if (!problema) {
    if (ass.seq === ultSeq && ass.hash === ant) { /* confere */ }
    else if (ass.seq < ultSeq && vistos[ass.seq] !== undefined && vistos[ass.seq] === ass.hash) ajustar = { de: ass.seq, seq: ultSeq, hash: ant };
    else if (ass.seq > ultSeq) problema = 'a disputa registra ' + ass.seq + ' registro(s) e há ' + ultSeq + ' (registro apagado)';
    else problema = 'o último registro não é o que a disputa guardou';
  }
  var anc = k >= 0 ? { seq: seq0, por: Lic_s_(lista[k].POR_NOME), quando: Lic_s_(lista[k].QUANDO), motivo: Lic_s_(lista[k].MOTIVO), texto: Lic_s_(lista[k].TEXTO) } : null;
  return { integra: !problema, problema: problema, ajustar: ajustar, ancora: anc };
}
/** Grava ULTIMO_* (e o HASH da disputa, que os cobre) e espelha em d. */
function LicD_gravarUltimo_(d, seq, hash, agora) {
  var mud = { ULTIMO_SEQ: seq, ULTIMO_HASH: hash, ATUALIZADO_EM: agora || Lic_agora_() };
  mud.HASH = LicD_hashDisputa_(d, { seq: seq, hash: hash });
  SGO_DATA.update(LICD_ABAS.DISPUTAS, d.ID, mud);
  d.ULTIMO_SEQ = seq; d.ULTIMO_HASH = hash; d.HASH = mud.HASH;
}
/** Grava uma linha no registro (quem chama segura a trava e já conferiu a cadeia). Atualiza ULTIMO_SEQ/ULTIMO_HASH. */
function LicD_registrar_(eu, d, campos) {
  var seq = (Number(d.ULTIMO_SEQ) || 0) + 1, agora = Lic_agora_();
  var x = Object.assign({ DISPUTA_ID: Lic_s_(d.ID), OPORTUNIDADE_ID: Lic_s_(d.OPORTUNIDADE_ID), CODIGO: Lic_s_(d.CODIGO), SEQ: seq, ITEM: '', TIPO: '', AUTOR: 'DIRETORIA', CONCORRENTE: '', VALOR: '', VALOR_ANTERIOR: '',
    ORIGEM: 'DIGITADO', SUGERIDO: 'NAO', SUGESTAO: '', PISO: '', SOBRA: '', SOBRA_PCT: '', ASSUMO: 'NAO', MOTIVO: '', TEXTO: '', QUANDO: agora, POR_ID: Lic_s_(eu.id), POR_NOME: Lic_s_(eu.nome), HASH_ANTERIOR: Lic_s_(d.ULTIMO_HASH) }, campos);
  x.SEQ = seq; x.QUANDO = agora; x.HASH_ANTERIOR = seq === 1 ? '' : Lic_s_(d.ULTIMO_HASH);
  x.HASH = LicD_hashLance_(x);
  var ins = SGO_DATA.insert(LICD_ABAS.LANCES, x); x.ID = Lic_s_(ins && ins.ID);
  // se esta segunda escrita falhar, a linha acima continua válida e encadeada: a próxima gravação avança ULTIMO_* (LicD_cadeia_)
  LicD_gravarUltimo_(d, seq, x.HASH, agora);
  return x;
}

// ------------------------------------------------------------ estado (base + registro) e sugestão
function LicD_resultadosDe_(did) { return Lic_ler_(LICD_ABAS.RESULTADOS).filter(function (x) { return Lic_s_(x.DISPUTA_ID) === Lic_s_(did); }).sort(function (a, b) { return (Number(a.VERSAO) || 0) - (Number(b.VERSAO) || 0); }); }
function LicD_hashResultado_(x) {
  return Lic_hash_([Lic_s_(x.DISPUTA_ID), Lic_s_(x.ITEM), String(Number(x.VERSAO) || 0), Lic_up_(x.SITUACAO), Lic_s_(x.COLOCACAO), Lic_s_(x.VENCEDOR), Lic_s_(x.VENCEDOR_CNPJ), LicD_h_(x.VALOR_FINAL), LicD_h_(x.VALOR_TOTAL), Lic_s_(x.MOTIVO),
    Lic_s_(x.ADJUDICACAO_EM), Lic_s_(x.HOMOLOGACAO_EM), Lic_s_(x.ATA_EM), Lic_up_(x.RECURSO_PARTE), Lic_s_(x.FONTE), Lic_s_(x.OBS), Lic_s_(x.POR_ID), Lic_s_(x.EM)].join('|'));
}
function LicD_resultadoTela_(x) {
  return { item: Lic_s_(x.ITEM), versao: Number(x.VERSAO) || 0, situacao: Lic_up_(x.SITUACAO), situacaoNome: LICD_RESULTADOS[Lic_up_(x.SITUACAO)] || Lic_s_(x.SITUACAO), colocacao: Lic_s_(x.COLOCACAO), vencedor: Lic_s_(x.VENCEDOR), vencedorCnpj: Lic_s_(x.VENCEDOR_CNPJ),
    valorFinal: LicD_n_(x.VALOR_FINAL), valorTotal: LicD_n_(x.VALOR_TOTAL), motivo: Lic_s_(x.MOTIVO), adjudicacao: Lic_s_(x.ADJUDICACAO_EM), homologacao: Lic_s_(x.HOMOLOGACAO_EM), ata: Lic_s_(x.ATA_EM), recursoParte: Lic_up_(x.RECURSO_PARTE),
    fonte: Lic_s_(x.FONTE), obs: Lic_s_(x.OBS), eventos: Lic_s_(x.EVENTOS), por: Lic_s_(x.POR_NOME), em: Lic_s_(x.EM), hash: Lic_s_(x.HASH), integra: LicD_hashResultado_(x) === Lic_s_(x.HASH) };
}
/** A sugestão do próximo lance (regra fixa; a IA não sugere valor). */
function LicD_sugestao_(it, paradas) {
  if (paradas) return { tipo: 'PARADA', valor: null, texto: 'Sugestões paradas pela Diretoria. Os lances continuam sendo registrados e conferidos contra o piso.' };
  if (it.desistiu) return { tipo: 'DESISTIU', valor: null, texto: 'A Diretoria desistiu deste item: não dê mais lances nele.' };
  if (it.melhorConcorrente === null) return { tipo: 'SEM_CONCORRENTE', valor: null, texto: 'Informe o melhor lance do concorrente (o que aparece no portal) para o SGO+ calcular o próximo lance.' };
  var m = it.melhorConcorrente, iv = LicD_intervaloReais_(it.intervalo, m);
  if (it.nossoAtual < m - 0.004) return { tipo: 'NA_FRENTE', valor: null, texto: 'O nosso lance (' + LicD_moeda_(it.nossoAtual) + ') é menor que o melhor do concorrente (' + LicD_moeda_(m) + '): não precisa dar lance agora.' };
  var alvo = LicD_r2_(m - iv);
  if (!(alvo > 0) || alvo < it.piso - 0.004) return { tipo: 'NO_PISO', valor: null, cobrir: alvo > 0 ? alvo : null, texto: 'Cobrir o melhor lance pede ' + (alvo > 0 ? LicD_moeda_(alvo) : 'um valor que não existe') + ' (melhor lance ' + LicD_moeda_(m) + ' − intervalo ' + LicD_moeda_(iv) + '), abaixo do piso autorizado (' + LicD_moeda_(it.piso) + '). Sugestão: não cobrir; mantenha o lance ou desista do item com o motivo.' };
  var s = LicD_sobra_(it, alvo);
  return { tipo: 'LANCE', valor: alvo, sobraPct: s ? s.pct : null, texto: 'Próximo lance: ' + LicD_moeda_(alvo) + ' (melhor lance ' + LicD_moeda_(m) + ' − intervalo ' + LicD_moeda_(iv) + ')' + (s ? ', sobra de ' + LicD_pct_(s.pct) + ' por unidade' : '') + '. Dê o lance no portal e registre aqui.' };
}
/** Estado de cada item: a base gravada na abertura e as decisões e lances do registro, na ordem. */
function LicD_estado_(d, lancesOrd, resultados) {
  var base = Lic_json_(d.BASE_JSON, {}) || {}, itens = {}, ordem = [], paradas = false, paradasTexto = '';
  var ivDisp = { tipo: Lic_up_(d.INTERVALO_TIPO) === 'PERCENTUAL' ? 'PERCENTUAL' : 'VALOR', valor: LicD_n_(d.INTERVALO_VALOR) || LICD_INTERVALO_PADRAO, fonte: Lic_s_(d.INTERVALO_FONTE) };
  (base.itens || []).forEach(function (b) {
    var it = Object.assign({}, b, { piso: b.pisoSimulacao, pisoOrigem: 'Piso da simulação versão ' + Lic_s_(d.SIMULACAO_VERSAO) + ' (sobra mínima de ' + LicP_pct_(b.margemMinPct, 0) + ')', pisoAssumido: false,
      intervalo: ivDisp, nossoAtual: b.valorInicial, nossoInformado: false, melhorConcorrente: null, concorrente: '', desistiu: false, desistenciaMotivo: '', lances: 0 });
    itens[b.item] = it; ordem.push(b.item);
  });
  lancesOrd.forEach(function (x) {
    var tipo = Lic_up_(x.TIPO), it = itens[Lic_s_(x.ITEM)];
    if (tipo === 'SUGESTOES') { paradas = Lic_up_(x.TEXTO).indexOf('PARADAS') === 0; paradasTexto = Lic_s_(x.MOTIVO); return; }
    if (tipo === 'INTERVALO' && !Lic_s_(x.ITEM)) { var iv0 = Lic_json_(x.TEXTO, null); if (iv0) ordem.forEach(function (k) { itens[k].intervalo = iv0; }); return; }
    if (!it) return;
    if (tipo === 'PISO') { it.piso = LicD_n_(x.VALOR); it.pisoOrigem = 'Autorizado por ' + Lic_s_(x.POR_NOME) + ' em ' + LicD_br_(x.QUANDO) + ': ' + Lic_s_(x.MOTIVO); it.pisoAssumido = Lic_up_(x.ASSUMO) === 'SIM'; }
    else if (tipo === 'INTERVALO') { var iv = Lic_json_(x.TEXTO, null); if (iv) it.intervalo = iv; }
    else if (tipo === 'DESISTENCIA') { it.desistiu = true; it.desistenciaMotivo = Lic_s_(x.MOTIVO); }
    else if (tipo === 'LANCE') {
      it.lances++;
      if (Lic_up_(x.AUTOR) === 'NOS') { it.nossoAtual = LicD_n_(x.VALOR); it.nossoInformado = true; }
      else { it.melhorConcorrente = LicD_n_(x.VALOR); it.concorrente = Lic_s_(x.CONCORRENTE); }
    }
  });
  var res = {};
  (resultados || []).forEach(function (x) { res[Lic_s_(x.ITEM)] = x; });
  return { itens: itens, ordem: ordem, paradas: paradas, paradasTexto: paradasTexto, resultados: res, base: base };
}
/** Item para a tela: valores, sobra, distância ao piso, sugestão e alertas. */
function LicD_itemTela_(it, paradas, resultado) {
  var s = LicD_sobra_(it, it.nossoAtual), sm = it.melhorConcorrente !== null ? LicD_sobra_(it, it.melhorConcorrente) : null, sp = LicD_sobra_(it, it.piso), sug = LicD_sugestao_(it, paradas);
  var dist = LicD_r2_(it.nossoAtual - it.piso), alertas = [], ivR = LicD_intervaloReais_(it.intervalo, it.melhorConcorrente !== null ? it.melhorConcorrente : it.nossoAtual);
  if (!it.desistiu && dist >= 0 && (dist <= 2 * ivR || dist <= it.piso * 0.03)) alertas.push({ tipo: 'PERTO_DO_PISO', texto: 'O nosso lance está a ' + LicD_moeda_(dist) + ' do piso: no máximo ' + Math.max(0, Math.floor(dist / ivR + 1e-9)) + ' lance(s) com o intervalo de ' + LicD_moeda_(ivR) + '.' });
  if (it.precoEdital > 0 && it.nossoAtual < it.precoEdital * 0.5) alertas.push({ tipo: 'INEXEQUIVEL', texto: 'O nosso lance está abaixo de 50% do preço de referência do edital (' + LicD_moeda_(it.precoEdital) + '): o pregoeiro pode pedir a prova do custo (IN SEGES/ME 73/2022, art. 34). Tenha a planilha de custo à mão.' });
  if (it.piso < it.pisoCusto - 0.004) alertas.push({ tipo: 'PREJUIZO', texto: 'Piso autorizado abaixo do custo mais os impostos (' + LicD_moeda_(it.pisoCusto) + '): no piso, o prejuízo é de ' + LicD_moeda_(LicD_r2_(it.pisoCusto - it.piso)) + ' por unidade. Assumido pela Diretoria.' });
  if (it.valorInicial < it.piso - 0.004) alertas.push({ tipo: 'PROPOSTA_ABAIXO', texto: 'O valor da proposta já está abaixo do piso autorizado: nenhum lance é possível sem a Diretoria autorizar um piso menor.' });
  var posicao = it.melhorConcorrente === null ? 'SEM_CONCORRENTE' : it.nossoAtual < it.melhorConcorrente - 0.004 ? 'NA_FRENTE' : Math.abs(it.nossoAtual - it.melhorConcorrente) <= 0.004 ? 'EMPATE' : 'ATRAS';
  return { item: it.item, codigo: it.codigo, nome: it.nome, descricao: it.descricao, quantidade: it.quantidade, valorInicial: it.valorInicial, pisoSimulacao: it.pisoSimulacao, piso: it.piso, pisoOrigem: it.pisoOrigem, pisoAssumido: it.pisoAssumido,
    pisoCusto: it.pisoCusto, custoUnit: it.custoUnit, tipo: it.tipo, pc: it.pc, margemMinPct: it.margemMinPct, margemAlvoPct: it.margemAlvoPct, precoEdital: it.precoEdital, intervalo: it.intervalo, intervaloTxt: LicD_intervaloTxt_(it.intervalo), intervaloReais: ivR,
    nossoAtual: it.nossoAtual, nossoInformado: it.nossoInformado, melhorConcorrente: it.melhorConcorrente, concorrente: it.concorrente, posicao: posicao, desistiu: it.desistiu, desistenciaMotivo: it.desistenciaMotivo, lances: it.lances,
    sobra: s, sobraMelhor: sm, sobraPiso: sp, distanciaPiso: dist, distanciaPisoPct: it.piso > 0 ? Math.round(dist / it.piso * 10000) / 100 : null, sugestao: sug, alertas: alertas,
    resultado: resultado ? LicD_resultadoTela_(resultado) : null };
}
function LicD_lanceTela_(x) {
  return { seq: Number(x.SEQ) || 0, item: Lic_s_(x.ITEM), tipo: Lic_up_(x.TIPO), tipoNome: LICD_TIPOS[Lic_up_(x.TIPO)] || Lic_s_(x.TIPO), autor: Lic_up_(x.AUTOR), concorrente: Lic_s_(x.CONCORRENTE), valor: LicD_n_(x.VALOR), anterior: LicD_n_(x.VALOR_ANTERIOR),
    origem: Lic_up_(x.ORIGEM), sugerido: Lic_up_(x.SUGERIDO) === 'SIM', sugestao: LicD_n_(x.SUGESTAO), piso: LicD_n_(x.PISO), sobraPct: LicD_n_(x.SOBRA_PCT), assumo: Lic_up_(x.ASSUMO) === 'SIM', motivo: Lic_s_(x.MOTIVO), texto: Lic_s_(x.TEXTO),
    quando: Lic_s_(x.QUANDO), quandoBr: LicD_br_(x.QUANDO), por: Lic_s_(x.POR_NOME), hash: Lic_s_(x.HASH), integra: LicD_hashLance_(x) === Lic_s_(x.HASH) };
}
/** Disputa completa para a tela e para o relatório. */
function LicD_montar_(d) {
  var lances = LicD_lancesDe_(d.ID), ass = LicD_assinado_(d, lances), cad = LicD_cadeia_(d, lances, ass || undefined), resultados = LicD_resultadosDe_(d.ID), est = LicD_estado_(d, lances, resultados);
  var itens = est.ordem.map(function (k) { return LicD_itemTela_(est.itens[k], est.paradas, est.resultados[k]); });
  var comResultado = itens.filter(function (i) { return i.resultado; }).length;
  return { id: Lic_s_(d.ID), situacao: Lic_up_(d.SITUACAO), situacaoNome: LICD_SITUACOES[Lic_up_(d.SITUACAO)] || Lic_s_(d.SITUACAO), modo: Lic_s_(d.MODO) || 'ASSISTIDO',
    proposta: { id: Lic_s_(d.PROPOSTA_ID), numero: Lic_s_(d.PROPOSTA_NUMERO), versao: Number(d.PROPOSTA_VERSAO) || 0, sha256: Lic_s_(d.PROPOSTA_SHA256) }, simulacao: { versao: Number(d.SIMULACAO_VERSAO) || 0, hash: Lic_s_(d.SIMULACAO_HASH) },
    sessaoIso: Lic_s_(d.SESSAO_ISO), sessaoTexto: Lic_s_(d.SESSAO_ISO) ? Lic_brDiaHora_(d.SESSAO_ISO) : '', sessaoFonte: Lic_s_(d.SESSAO_FONTE), portal: Lic_s_(d.PORTAL_NOME),
    intervalo: { tipo: Lic_up_(d.INTERVALO_TIPO) || 'VALOR', valor: LicD_n_(d.INTERVALO_VALOR), fonte: Lic_s_(d.INTERVALO_FONTE) }, motivo: Lic_s_(d.MOTIVO), abertaPor: Lic_s_(d.ABERTA_POR_NOME), abertaEm: Lic_s_(d.ABERTA_EM),
    resultadoEm: Lic_s_(d.RESULTADO_EM), resultadoPor: Lic_s_(d.RESULTADO_POR_NOME), resultadoMotivo: Lic_s_(d.RESULTADO_MOTIVO), contrato: Lic_json_(d.CONTRATO_JSON, null),
    integra: !!ass, cadeia: cad, podeReconhecer: !!ass && !cad.integra, paradas: est.paradas, paradasMotivo: est.paradasTexto, itens: itens, lances: lances.map(LicD_lanceTela_).reverse(), resultados: resultados.map(LicD_resultadoTela_).reverse(),
    comResultado: comResultado, podeConcluir: Lic_up_(d.SITUACAO) === 'ABERTA' && itens.length > 0 && comResultado === itens.length, hash: Lic_s_(d.HASH), regras: LICD_REGRAS, aviso: LICD_AVISO_ASSISTIDO };
}

// ------------------------------------------------------------ telas
function LicD_tela_(eu, d) {
  var l = Lic_acharOp_(d.id), lista = LicD_disputasDe_(l.ID), atual = lista[0] || null;
  var r = { op: { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), situacao: Lic_s_(l.SITUACAO), situacaoNome: LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || Lic_s_(l.SITUACAO), orgao: Lic_s_(l.ORGAO_NOME), lei: Lic_s_(l.LEI), modo: Lic_s_(l.MODO_DISPUTA) },
    disputa: null, previa: null, aviso: LICD_AVISO_ASSISTIDO, resultados: LICD_RESULTADOS, regras: LICD_REGRAS };
  if (atual) { r.disputa = LicD_montar_(atual); return { disputa: r }; }
  var f = LicD_fontes_(l), bloq = f.bloqueios.slice();
  if (Lic_s_(l.SITUACAO) === 'DESCARTADA') bloq.unshift('A oportunidade está descartada: reabra antes (com o motivo), se a Diretoria quiser disputar.');
  else if (LICD_ABRIR_DE.indexOf(Lic_s_(l.SITUACAO)) < 0) bloq.unshift('A oportunidade está em "' + (LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || l.SITUACAO) + '": a disputa abre a partir do Radar, Em análise, Decisão ou Proposta.');
  r.previa = { bloqueios: bloq, avisos: f.avisos, proposta: f.proposta, simulacao: f.simulacao, podeAbrir: !bloq.length, sessao: LicD_sessaoAgenda_(l), intervaloEdital: LicD_intervaloEdital_(l), intervaloPadrao: LICD_INTERVALO_PADRAO,
    itens: f.itens.map(function (it) { var x = Object.assign({}, it, { piso: it.pisoSimulacao, intervalo: null, nossoAtual: it.valorInicial, melhorConcorrente: null }); return { item: it.item, codigo: it.codigo, nome: it.nome, descricao: it.descricao, quantidade: it.quantidade,
      valorInicial: it.valorInicial, pisoSimulacao: it.pisoSimulacao, pisoCusto: it.pisoCusto, margemMinPct: it.margemMinPct, sobraInicial: LicD_sobra_(x, it.valorInicial), sobraPiso: LicD_sobra_(x, it.pisoSimulacao) }; }) };
  return { disputa: r };
}
/** Central de disputas (tela do menu): sessões, disputas abertas, com resultado e prontas para abrir. */
function LicD_central_(eu) {
  var ops = Lic_ativas_(), porId = {}, disputas = Lic_ler_(LICD_ABAS.DISPUTAS), comDisputa = {}, agora = Date.now();
  ops.forEach(function (l) { porId[Lic_s_(l.ID)] = l; });
  var linhas = disputas.filter(function (x) { return porId[Lic_s_(x.OPORTUNIDADE_ID)]; }).map(function (x) {
    var l = porId[Lic_s_(x.OPORTUNIDADE_ID)], m = LicD_montar_(x); comDisputa[Lic_s_(l.ID)] = true;
    return { opId: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), orgao: Lic_texto_(l.ORGAO_NOME, 160), uf: Lic_s_(l.UF), situacao: m.situacao, situacaoNome: m.situacaoNome, sessaoIso: m.sessaoIso, sessaoTexto: m.sessaoTexto, sessaoPassou: Date.parse(m.sessaoIso) < agora,
      itens: m.itens.length, desistidos: m.itens.filter(function (i) { return i.desistiu; }).length, comResultado: m.comResultado, ganhos: m.itens.filter(function (i) { return i.resultado && i.resultado.situacao === 'GANHO'; }).length,
      lances: m.lances.filter(function (y) { return y.tipo === 'LANCE'; }).length, integra: m.integra && m.cadeia.integra, proposta: m.proposta.numero };
  }).sort(function (a, b) { return (a.situacao === b.situacao ? 0 : a.situacao === 'ABERTA' ? -1 : 1) || ((a.sessaoIso || '9') < (b.sessaoIso || '9') ? -1 : 1); });
  var prontas = [];
  if (typeof LicProp_propostasDe_ === 'function') {
    var emitidas = {};
    Lic_ler_(LICPROP_ABAS.PROPOSTAS).forEach(function (p) { if (Lic_up_(p.SITUACAO) === 'EMITIDA') emitidas[Lic_s_(p.OPORTUNIDADE_ID)] = p; });
    ops.forEach(function (l) {
      var p = emitidas[Lic_s_(l.ID)];
      if (!p || comDisputa[Lic_s_(l.ID)] || LICD_ABRIR_DE.indexOf(Lic_s_(l.SITUACAO)) < 0) return;
      var s = LicD_sessaoAgenda_(l);
      prontas.push({ opId: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), orgao: Lic_texto_(l.ORGAO_NOME, 160), uf: Lic_s_(l.UF), proposta: Lic_s_(p.NUMERO), total: Number(p.TOTAL) || 0, sessaoIso: s ? s.iso : '', sessaoTexto: s ? s.texto : '', sessaoFonte: s ? s.fonte : '', situacaoNome: LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || '' });
    });
    prontas.sort(function (a, b) { return (a.sessaoIso || '9') < (b.sessaoIso || '9') ? -1 : 1; });
  }
  return { disputas: linhas, prontas: prontas, aviso: LICD_AVISO_ASSISTIDO, contagens: { abertas: linhas.filter(function (x) { return x.situacao === 'ABERTA'; }).length, resultado: linhas.filter(function (x) { return x.situacao === 'RESULTADO'; }).length, prontas: prontas.length } };
}

// ------------------------------------------------------------ ações
/** A disputa da oportunidade, conferida, para gravar (dentro da trava). o.situacao: a exigida ('ABERTA' padrão). */
function LicD_paraGravar_(l, o) {
  o = o || {};
  var d = LicD_disputasDe_(l.ID)[0];
  if (!d) throw new Error('Não foi possível: esta licitação ainda não tem disputa aberta. Abra a disputa na aba Disputa da ficha. Nada foi gravado');
  if (o.situacoes && o.situacoes.indexOf(Lic_up_(d.SITUACAO)) < 0) throw new Error('Não foi possível: a disputa está "' + (LICD_SITUACOES[Lic_up_(d.SITUACAO)] || d.SITUACAO) + '"' + (Lic_up_(d.SITUACAO) === 'RESULTADO' ? ' e não recebe mais lances nem decisões da sessão (o resultado pode ser atualizado)' : '') + '. Nada foi gravado');
  var lances = LicD_lancesDe_(d.ID), ass = LicD_assinado_(d, lances);
  if (!ass) throw new Error('Não foi possível: os dados da abertura da disputa (proposta, simulação, itens e pisos) não conferem com o hash gravado (alterados fora do SGO+). Nada foi gravado. Avise o Administrador do sistema: a disputa precisa ser conferida na planilha; durante a sessão, anote os lances fora do SGO+');
  // o último registro assinado vale (ULTIMO_* mexido na planilha não muda nada)
  d.ULTIMO_SEQ = ass.seq; d.ULTIMO_HASH = ass.hash;
  var cad = LicD_cadeia_(d, lances, ass), aviso = '';
  if (cad.integra && cad.ajustar) {
    // revisão de bddf933 (ALTA 1, a): linha gravada e disputa não atualizada (falha no meio da gravação): a cadeia confere, retoma sozinha
    LicD_gravarUltimo_(d, cad.ajustar.seq, cad.ajustar.hash);
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'DISPUTA_REGISTRO_RETOMADO', { id: '', nome: 'Central de disputas (sistema)' }, { de: 'registro ' + cad.ajustar.de, para: 'registro ' + cad.ajustar.seq,
      texto: 'O registro de lances tinha ' + (cad.ajustar.seq - cad.ajustar.de) + ' linha(s) gravada(s) sem a atualização da disputa (falha no meio da gravação). As linhas conferem e se ligam ao último registro assinado: a cadeia foi retomada.', versao: 'disputa · registro ' + cad.ajustar.seq, fonte: 'Central de disputas', hash: cad.ajustar.hash });
  } else if (!cad.integra) {
    var oQueFazer = 'Peça ao Administrador para conferir a planilha e tocar em "Reconhecer a quebra" na aba Disputa (ele escreve o motivo e o registro recomeça a partir dali); durante a sessão, anote os lances fora do SGO+';
    // revisão de bddf933 (ALTA 1, c): o resultado e a conclusão não dependem da cadeia de lances (gravam com o aviso)
    if (!o.semCadeia) throw new Error('Não foi possível: o registro de lances desta disputa foi mexido fora do SGO+ (' + cad.problema + '). O SGO+ não grava lance nem decisão sobre um registro alterado: nada foi gravado. ' + oQueFazer);
    aviso = 'Registro de lances com quebra (' + cad.problema + '): gravado mesmo assim; o relatório da disputa mostra a quebra.';
  }
  var est = LicD_estado_(d, lances, LicD_resultadosDe_(d.ID));
  return { d: d, lances: lances, est: est, cadeia: cad, aviso: aviso };
}
function LicD_item_(g, item) {
  var it = g.est.itens[Lic_s_(item)];
  if (!it) throw new Error('Não foi possível: o item ' + Lic_s_(item) + ' não está nesta disputa (atualize a tela). Nada foi gravado');
  return it;
}

/** Abrir: d = { id, motivo, sessaoData, sessaoHora, sessaoFonte, portal, intervaloTipo, intervaloValor, intervaloFonte }. */
function LicD_abrir_(eu, d) {
  var motivo = LicD_motivo_(d.motivo, 'da abertura da disputa');
  var ivTipo = Lic_up_(d.intervaloTipo) === 'PERCENTUAL' ? 'PERCENTUAL' : 'VALOR', ivTxt = Lic_s_(d.intervaloValor), ivValor = ivTxt ? (ivTipo === 'PERCENTUAL' ? LicD_pctDigitado_(ivTxt, 'o intervalo em %') : LicD_valor_(ivTxt, 'o intervalo mínimo entre lances')) : null, ivFonte = LicD_txt_(d.intervaloFonte, 300);
  if (ivTxt && (ivValor === null || !(ivValor > 0) || (ivTipo === 'PERCENTUAL' && ivValor >= 50) || (ivTipo === 'VALOR' && ivValor > 1000000))) throw new Error('Escreva o intervalo mínimo entre lances ' + (ivTipo === 'PERCENTUAL' ? 'em %, maior que zero e menor que 50 (por exemplo 0,5)' : 'em reais, maior que zero (por exemplo 1,00)') + ', ou deixe em branco para R$ 0,01. Nada foi gravado');
  if (ivValor === null) { ivTipo = 'VALOR'; ivValor = LICD_INTERVALO_PADRAO; ivFonte = 'Padrão do SGO+: o edital não informa intervalo (menor variação, R$ 0,01)'; }
  else if (ivFonte.length < 5) throw new Error('Escreva de onde veio o intervalo (por exemplo "edital, item 7.3"). Nada foi gravado');
  var dia = Lic_s_(d.sessaoData), hora = Lic_s_(d.sessaoHora), sessaoIso = '', sessaoFonte = LicD_txt_(d.sessaoFonte, 300);
  if (dia) {
    if (!LicD_diaValido_(dia)) throw new Error('Escolha a data da sessão no calendário. Nada foi gravado');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) throw new Error('Escreva a hora da sessão no formato HH:MM (horário de Brasília). Nada foi gravado');
    sessaoIso = Lic_isoLocal_(dia, hora, '-03:00');
    if (sessaoFonte.length < 5) throw new Error('Escreva de onde veio a data da sessão (por exemplo "edital, preâmbulo" ou "agenda do SGO+"). Nada foi gravado');
  }
  var r = Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id);
    if (LicD_disputasDe_(l.ID).length) throw new Error('Não foi possível abrir: esta licitação já tem disputa. Atualize a aba Disputa. Nada foi gravado');
    if (Lic_s_(l.SITUACAO) === 'DESCARTADA') throw new Error('Não foi possível abrir: a oportunidade está descartada. Reabra antes (com o motivo). Nada foi gravado');
    var f = LicD_fontes_(l);
    if (f.bloqueios.length) throw new Error('Não foi possível abrir a disputa: ' + f.bloqueios.join(' ') + ' Nada foi gravado');
    if (!sessaoIso) { var s = LicD_sessaoAgenda_(l); if (s) { sessaoIso = s.iso; sessaoFonte = s.fonte; } }
    var agora = Lic_agora_(), base = { regras: LICD_REGRAS, itens: f.itens, politica: f.politica, avisos: f.avisos, propostaTotal: f.proposta.total }, baseJson = JSON.stringify(base);
    if (baseJson.length > 45000) throw new Error('A disputa ficou grande demais para gravar (' + f.itens.length + ' itens). Separe o edital em lotes na simulação. Nada foi gravado');
    var reg = { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), SITUACAO: 'ABERTA', MODO: 'ASSISTIDO', PROPOSTA_ID: f.proposta.id, PROPOSTA_NUMERO: f.proposta.numero, PROPOSTA_VERSAO: f.proposta.versao,
      PROPOSTA_SHA256: f.proposta.sha256, SIMULACAO_VERSAO: f.simulacao.versao, SIMULACAO_HASH: f.simulacao.hash, SESSAO_ISO: sessaoIso, SESSAO_FONTE: sessaoIso ? sessaoFonte : '', PORTAL_NOME: LicD_txt_(d.portal, 120),
      INTERVALO_TIPO: ivTipo, INTERVALO_VALOR: ivValor, INTERVALO_FONTE: ivFonte, BASE_JSON: baseJson, BASE_HASH: Lic_hash_(baseJson), MOTIVO: motivo, ABERTA_POR_ID: eu.id, ABERTA_POR_NOME: eu.nome, ABERTA_EM: agora,
      ULTIMO_SEQ: 0, ULTIMO_HASH: '', ATUALIZADO_EM: agora };
    reg.HASH = LicD_hashDisputa_(reg);
    var ins = SGO_DATA.insert(LICD_ABAS.DISPUTAS, reg); reg.ID = Lic_s_(ins && ins.ID);
    var de = Lic_s_(l.SITUACAO), txtItens = f.itens.map(function (i) { return 'item ' + i.item + ' ' + LicD_moeda_(i.valorInicial) + ' (piso ' + LicD_moeda_(i.pisoSimulacao) + ')'; }).join('; ');
    var texto = 'Disputa aberta no modo assistido (o SGO+ não envia lance nem acessa o portal). Proposta ' + f.proposta.numero + ' (SHA-256 ' + f.proposta.sha256.slice(0, 16) + '…), simulação versão ' + f.simulacao.versao +
      '. Itens: ' + Lic_texto_(txtItens, 2000) + '. Intervalo mínimo: ' + LicD_intervaloTxt_({ tipo: ivTipo, valor: ivValor }) + ' (' + ivFonte + '). Sessão: ' + (sessaoIso ? Lic_brDiaHora_(sessaoIso) + ' (' + sessaoFonte + ')' : 'a informar') + '. Motivo: ' + motivo;
    var mud = Lic_mudarSituacaoSemTrava_(eu, { id: l.ID, textoHistorico: texto, fonte: 'Central de disputas' }, LICD_ABRIR_DE, 'DISPUTA', 'DISPUTA_ABERTA', {}, 'abrir a disputa');
    return { disputaId: reg.ID, de: de, hash: mud.hash, itens: f.itens.length };
  });
  Lic_aposSituacao_(d.id, r);
  return { disputaId: r.disputaId, texto: 'Disputa aberta com ' + r.itens + ' item(ns). A licitação foi para "Disputa" no Kanban. ' + LICD_AVISO_ASSISTIDO };
}

/** Piso do item: d = { id, item, valor, motivo, assumo }. Abaixo do custo + impostos só com assumo. */
function LicD_piso_(eu, d) {
  var motivo = LicD_motivo_(d.motivo, 'do piso autorizado'), valor = LicD_valor_(d.valor, 'o piso autorizado');
  return Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), g = LicD_paraGravar_(l, { situacoes: ['ABERTA'] }), it = LicD_item_(g, d.item);
    if (it.desistiu) throw new Error('Não foi possível: a Diretoria desistiu do item ' + it.item + '. Nada foi gravado');
    if (valor > it.valorInicial + 0.004) throw new Error('O piso (' + LicD_moeda_(valor) + ') não pode passar do valor da proposta do item ' + it.item + ' (' + LicD_moeda_(it.valorInicial) + '): nenhum lance seria possível. Nada foi gravado');
    if (Math.abs(valor - it.piso) <= 0.004) return { semMudanca: true, texto: 'Nada mudou: o piso do item ' + it.item + ' já é ' + LicD_moeda_(valor) + '. Nada foi gravado.' };
    var abaixoCusto = it.pisoCusto !== null && valor < it.pisoCusto - 0.004, assumo = d.assumo === true || Lic_up_(d.assumo) === 'SIM';
    var prej = abaixoCusto ? LicD_r2_(it.pisoCusto - valor) : 0;
    if (abaixoCusto && !assumo) throw new Error('O piso de ' + LicD_moeda_(valor) + ' fica abaixo do custo mais os impostos do item ' + it.item + ' (' + LicD_moeda_(it.pisoCusto) + '): prejuízo de ' + LicD_moeda_(prej) + ' por unidade (' + LicD_moeda_(LicD_r2_(prej * it.quantidade)) + ' no item). Para autorizar, marque "Assumo o prejuízo" e escreva o motivo. Nada foi gravado');
    var s = LicD_sobra_(it, valor), abaixoSim = valor < it.pisoSimulacao - 0.004;
    var texto = 'Piso do item ' + it.item + ': ' + LicD_moeda_(it.piso) + ' → ' + LicD_moeda_(valor) + (s ? ' (sobra de ' + LicD_pct_(s.pct) + ' no piso)' : '') + (abaixoSim ? '; abaixo do piso da simulação (' + LicD_moeda_(it.pisoSimulacao) + ', sobra mínima de ' + LicP_pct_(it.margemMinPct, 0) + ')' : '') +
      (abaixoCusto ? '; ABAIXO DO CUSTO MAIS OS IMPOSTOS (' + LicD_moeda_(it.pisoCusto) + '): prejuízo de ' + LicD_moeda_(prej) + ' por unidade, assumido pela Diretoria' : '') + '.';
    var x = LicD_registrar_(eu, g.d, { ITEM: it.item, TIPO: 'PISO', AUTOR: 'DIRETORIA', VALOR: valor, VALOR_ANTERIOR: it.piso, PISO: valor, SOBRA: s ? s.sobra : '', SOBRA_PCT: s ? s.pct : '', ASSUMO: abaixoCusto && assumo ? 'SIM' : 'NAO', MOTIVO: motivo, TEXTO: texto });
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'DISPUTA_PISO', eu, { de: LicD_moeda_(it.piso), para: LicD_moeda_(valor), texto: texto + ' Motivo: ' + motivo, versao: 'disputa · registro ' + x.SEQ, fonte: 'Central de disputas', hash: x.HASH });
    return { texto: texto + ' Gravado no registro da disputa.', prejuizo: prej };
  });
}

/** Intervalo mínimo: d = { id, item ('' = todos), tipo, valor, fonte, motivo }. */
function LicD_intervalo_(eu, d) {
  var motivo = LicD_motivo_(d.motivo, 'da mudança do intervalo'), tipo = Lic_up_(d.tipo) === 'PERCENTUAL' ? 'PERCENTUAL' : 'VALOR', v = tipo === 'PERCENTUAL' ? LicD_pctDigitado_(d.valor, 'o intervalo em %') : LicD_valor_(d.valor, 'o intervalo em reais'), fonte = LicD_txt_(d.fonte, 300);
  if (v === null || !(v > 0) || (tipo === 'PERCENTUAL' && v >= 50)) throw new Error('Escreva o intervalo ' + (tipo === 'PERCENTUAL' ? 'em %, maior que zero e menor que 50' : 'em reais, maior que zero') + '. Nada foi gravado');
  if (fonte.length < 5) throw new Error('Escreva de onde veio o intervalo (por exemplo "edital, item 7.3" ou "aviso do pregoeiro no chat"). Nada foi gravado');
  return Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), g = LicD_paraGravar_(l, { situacoes: ['ABERTA'] }), item = Lic_s_(d.item);
    if (item) LicD_item_(g, item);
    var iv = { tipo: tipo, valor: LicD_r2_(v), fonte: fonte }, txt = 'Intervalo mínimo ' + (item ? 'do item ' + item : 'de todos os itens') + ': ' + LicD_intervaloTxt_(iv) + ' (' + fonte + ').';
    var x = LicD_registrar_(eu, g.d, { ITEM: item, TIPO: 'INTERVALO', AUTOR: 'DIRETORIA', VALOR: iv.valor, MOTIVO: motivo, TEXTO: JSON.stringify(iv) });
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'DISPUTA_INTERVALO', eu, { para: LicD_intervaloTxt_(iv), texto: txt + ' Motivo: ' + motivo, versao: 'disputa · registro ' + x.SEQ, fonte: 'Central de disputas', hash: x.HASH });
    return { texto: txt + ' Gravado no registro da disputa.' };
  });
}

/** Lance digitado: d = { id, item, autor: NOS|CONCORRENTE, valor, concorrente, obs }. O nosso abaixo do piso é recusado. */
function LicD_lance_(eu, d) {
  var autor = Lic_up_(d.autor) === 'CONCORRENTE' ? 'CONCORRENTE' : Lic_up_(d.autor) === 'NOS' ? 'NOS' : '';
  if (!autor) throw new Error('Escolha de quem é o lance: nosso ou do melhor concorrente. Nada foi gravado');
  var valor = LicD_valor_(d.valor, autor === 'NOS' ? 'o nosso lance' : 'o lance do concorrente'), obs = LicD_txt_(d.obs, 300), conc = LicD_txt_(d.concorrente, 120);
  return Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), g = LicD_paraGravar_(l, { situacoes: ['ABERTA'] }), it = LicD_item_(g, d.item), avisos = [];
    if (it.desistiu) throw new Error('Não foi possível: a Diretoria desistiu do item ' + it.item + ' (' + it.desistenciaMotivo + '). Nada foi gravado');
    var sug = LicD_sugestao_(it, g.est.paradas), s = LicD_sobra_(it, valor);
    if (autor === 'NOS') {
      if (valor < it.piso - 0.004) {
        var ss = s ? ' (sobra de ' + LicD_pct_(s.pct) + ' por unidade)' : '';
        throw new Error('Não foi possível registrar, lance recusado: ' + LicD_moeda_(valor) + ' fica abaixo do piso autorizado do item ' + it.item + ' (' + LicD_moeda_(it.piso) + ')' + ss + '. O SGO+ não registra lance abaixo do piso: não dê esse lance no portal. Se a Diretoria decidir baixar o piso, use "Piso do item", com o motivo. Nada foi gravado');
      }
      if (valor >= it.nossoAtual - 0.004) throw new Error('Não foi possível registrar, lance recusado: o nosso lance tem de ser menor que o atual do item ' + it.item + ' (' + LicD_moeda_(it.nossoAtual) + (it.nossoInformado ? ', o último registrado' : ', o valor da proposta') + '). Nada foi gravado');
      var ivR = LicD_intervaloReais_(it.intervalo, it.melhorConcorrente !== null ? it.melhorConcorrente : it.nossoAtual);
      if (it.melhorConcorrente !== null && valor < it.melhorConcorrente - 0.004 && it.melhorConcorrente - valor < ivR - 0.004) avisos.push('O lance cobre o melhor lance por menos que o intervalo mínimo (' + LicD_moeda_(ivR) + '): confira se o portal aceitou.');
      if (it.nossoAtual - valor < ivR - 0.004) avisos.push('A diferença para o nosso lance anterior é menor que o intervalo mínimo (' + LicD_moeda_(ivR) + '): confira se o portal aceitou.');
    } else if (it.melhorConcorrente !== null && valor > it.melhorConcorrente + 0.004) avisos.push('O lance informado do concorrente é maior que o melhor anterior (' + LicD_moeda_(it.melhorConcorrente) + '): o SGO+ passa a considerar este como o melhor lance (o último informado).');
    var sugerido = autor === 'NOS' && sug.tipo === 'LANCE' && Math.abs(sug.valor - valor) <= 0.004;
    var texto = (autor === 'NOS' ? 'Nosso lance' : 'Melhor lance do concorrente' + (conc ? ' (' + conc + ')' : '')) + ' no item ' + it.item + ': ' + LicD_moeda_(valor) + (s ? ' (sobra de ' + LicD_pct_(s.pct) + ' por unidade)' : '') +
      '; valor digitado por ' + eu.nome + (sugerido ? ', igual à sugestão do SGO+' : '') + '. Piso ' + LicD_moeda_(it.piso) + '.' + (obs ? ' Obs.: ' + obs : '') + (avisos.length ? ' Avisos: ' + avisos.join(' ') : '');
    var x = LicD_registrar_(eu, g.d, { ITEM: it.item, TIPO: 'LANCE', AUTOR: autor, CONCORRENTE: autor === 'CONCORRENTE' ? conc : '', VALOR: valor, VALOR_ANTERIOR: autor === 'NOS' ? it.nossoAtual : (it.melhorConcorrente === null ? '' : it.melhorConcorrente),
      ORIGEM: 'DIGITADO', SUGERIDO: sugerido ? 'SIM' : 'NAO', SUGESTAO: sug.tipo === 'LANCE' ? sug.valor : '', PISO: it.piso, SOBRA: s ? s.sobra : '', SOBRA_PCT: s ? s.pct : '', TEXTO: Lic_texto_(texto, 1500) });
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'DISPUTA_LANCE', eu, { de: x.VALOR_ANTERIOR === '' ? '' : LicD_moeda_(x.VALOR_ANTERIOR), para: LicD_moeda_(valor), texto: texto, versao: 'disputa · registro ' + x.SEQ, fonte: 'Central de disputas (valor digitado)', hash: x.HASH });
    return { seq: x.SEQ, avisos: avisos, texto: (autor === 'NOS' ? 'Nosso lance' : 'Lance do concorrente') + ' de ' + LicD_moeda_(valor) + ' registrado no item ' + it.item + ' (registro ' + x.SEQ + ', ' + LicD_br_(x.QUANDO) + ').' + (avisos.length ? ' ' + avisos.join(' ') : '') };
  });
}

/** Desistir do item: d = { id, item, motivo }. */
function LicD_desistir_(eu, d) {
  var motivo = LicD_motivo_(d.motivo, 'da desistência do item');
  return Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), g = LicD_paraGravar_(l, { situacoes: ['ABERTA'] }), it = LicD_item_(g, d.item);
    if (it.desistiu) return { semMudanca: true, texto: 'A Diretoria já desistiu do item ' + it.item + '. Nada foi gravado.' };
    var texto = 'Desistência do item ' + it.item + ' com o nosso lance em ' + LicD_moeda_(it.nossoAtual) + (it.melhorConcorrente !== null ? ' e o melhor do concorrente em ' + LicD_moeda_(it.melhorConcorrente) : '') + '.';
    var x = LicD_registrar_(eu, g.d, { ITEM: it.item, TIPO: 'DESISTENCIA', AUTOR: 'DIRETORIA', VALOR: it.nossoAtual, PISO: it.piso, MOTIVO: motivo, TEXTO: texto });
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'DISPUTA_DESISTENCIA', eu, { de: 'em disputa', para: 'desistência', texto: texto + ' Motivo: ' + motivo, versao: 'disputa · registro ' + x.SEQ, fonte: 'Central de disputas', hash: x.HASH });
    return { texto: texto + ' Registrado. Não dê mais lances neste item; o resultado dele é registrado depois da sessão.' };
  });
}

/** Parar (ou voltar) as sugestões: d = { id, parar, motivo }. */
function LicD_sugestoes_(eu, d) {
  var parar = d.parar === true || Lic_up_(d.parar) === 'SIM', motivo = LicD_motivo_(d.motivo, parar ? 'para parar as sugestões' : 'para voltar as sugestões');
  return Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), g = LicD_paraGravar_(l, { situacoes: ['ABERTA'] });
    if (g.est.paradas === parar) return { semMudanca: true, texto: 'As sugestões já estão ' + (parar ? 'paradas' : 'ligadas') + '. Nada foi gravado.' };
    var x = LicD_registrar_(eu, g.d, { TIPO: 'SUGESTOES', AUTOR: 'DIRETORIA', MOTIVO: motivo, TEXTO: parar ? 'PARADAS' : 'LIGADAS' });
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'DISPUTA_SUGESTOES', eu, { de: parar ? 'ligadas' : 'paradas', para: parar ? 'paradas' : 'ligadas', texto: 'Sugestões do próximo lance ' + (parar ? 'paradas' : 'ligadas de novo') + ' pela Diretoria. Motivo: ' + motivo, versao: 'disputa · registro ' + x.SEQ, fonte: 'Central de disputas', hash: x.HASH });
    return { texto: parar ? 'Sugestões paradas. O piso continua valendo para todo lance registrado.' : 'Sugestões ligadas de novo.' };
  });
}

/** Prazos de recurso e contrarrazões na agenda, como PENDENTE DE CONFIRMAÇÃO (dentro da trava). Devolve os nomes criados. */
function LicD_prazosRecurso_(eu, l, parte, ataDia, fonte, agora) {
  var lei = Lic_s_(l.LEI), n = lei === '13303' ? 5 : 3, criados = [];
  var leiTxt = lei === '14133' ? 'Lei 14.133/2021, art. 165' : lei === '13303' ? 'Lei 13.303/2016, art. 59' : 'regime jurídico a confirmar no edital';
  var tipos = parte === 'AMBOS' ? ['PRAZO_RECURSO', 'PRAZO_CONTRARRAZOES'] : parte === 'CONCORRENTE' ? ['PRAZO_CONTRARRAZOES'] : ['PRAZO_RECURSO'];
  var evs = Lic_eventosDe_(l.ID);
  tipos.forEach(function (tipo) {
    var quando = '', regra = '';
    if (ataDia && (lei === '14133' || lei === '13303')) {
      var raz = Lic_diasUteisDepois_(ataDia, n), fim = tipo === 'PRAZO_RECURSO' ? raz : Lic_diasUteisDepois_(raz.dia, n);
      quando = Lic_isoLocal_(fim.dia, '23:59');
      regra = tipo === 'PRAZO_RECURSO' ? leiTxt + ': razões de recurso em ' + n + ' dias úteis da ata ou da intimação (' + Lic_brDia_(ataDia) + ').' : leiTxt + ': contrarrazões no mesmo prazo do recurso, contado da intimação da interposição; a data é uma estimativa (fim das razões + ' + n + ' dias úteis).';
    } else regra = 'Sem a data da ata' + (lei === '14133' || lei === '13303' ? '' : ' ou com o regime jurídico a confirmar') + ': informe a data pelo edital ou pelo portal ("Confirmar data").';
    var ant = evs.filter(function (e) { return Lic_s_(e.TIPO) === tipo; }), at = ant.filter(Lic_eventoValendo_)[0], vmax = ant.reduce(function (m, e) { return Math.max(m, Number(e.VERSAO) || 0); }, 0);
    if (at && Lic_s_(at.QUANDO_ISO) === quando && Lic_up_(at.NATUREZA) === 'PREVISTO') return;
    if (at && Lic_up_(at.NATUREZA) !== 'PREVISTO' && Lic_up_(at.FONTE) === 'PESSOA') return;   // data já conferida por pessoa: não troca
    var nd = { tipo: tipo, natureza: 'PREVISTO', quandoIso: quando, quandoTexto: quando ? quando.slice(0, 10) : '', diaTodo: !!quando, fuso: 'America/Sao_Paulo', fusoPresumido: false, limiteInternoIso: '',
      fonte: 'PESSOA', fonteRef: 'Resultado registrado por ' + eu.nome + ' (' + fonte + ')' + (ataDia ? ', ata de ' + Lic_brDia_(ataDia) : ''), regra: regra + ' Feriado do órgão não chega por API.',
      obs: 'Pendente de confirmação: sem alerta até alguém conferir a data no portal e tocar em "Confirmar data".', baseIso: ataDia ? Lic_isoLocal_(ataDia, '00:00') : '' };
    var mot = at ? 'Resultado do item com recurso: o prazo foi refeito (' + Lic_eventoQuandoTxt_(at) + ' → ' + (quando ? Lic_eventoQuandoTxt_({ QUANDO_ISO: quando, DIA_TODO: 'SIM' }) : 'data a informar') + ').' : '';
    var nova = Lic_eventoLinha_(l, nd, vmax + 1, at || null, mot, agora);
    if (at) SGO_DATA.update(LIC_ABAS.EVENTOS, at.ID, { SITUACAO: 'RETIFICADO', SUBSTITUIDO_POR_ID: nova.ID, MOTIVO_MUDANCA: mot, ATUALIZADO_EM: agora });
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'AGENDA_RECURSO', eu, { de: at ? Lic_eventoQuandoTxt_(at) : '', para: Lic_eventoQuandoTxt_(nova), texto: (LIC_EVENTO_TIPOS[tipo] || { nome: tipo }).nome + ' na agenda, pendente de confirmação. ' + regra, versao: nova.VERSAO, fonte: 'Central de disputas (resultado)', hash: nova.HASH });
    criados.push((LIC_EVENTO_TIPOS[tipo] || { nome: tipo }).nome + ' ' + Lic_eventoQuandoTxt_(nova));
  });
  return criados;
}

var LICD_PRAZOS_RECURSO = { NOS: ['PRAZO_RECURSO'], CONCORRENTE: ['PRAZO_CONTRARRAZOES'], AMBOS: ['PRAZO_RECURSO', 'PRAZO_CONTRARRAZOES'] };
/**
 * Revisão de bddf933 (BAIXA 6): quando nenhum item continua em recurso (ou ninguém mais recorre de um lado), os prazos PENDENTES que
 * vieram do resultado (natureza PREVISTO, fonte "Resultado registrado por") são cancelados com o motivo. Prazo já confirmado por
 * pessoa fica (o alerta dele é decisão de quem confirmou). ultimos: { item: linha de LIC_RESULTADOS mais nova }.
 */
function LicD_cancelarPrazosOrfaos_(eu, l, ultimos, agora) {
  var precisa = {}, cancelados = [];
  Object.keys(ultimos).forEach(function (k) { var x = ultimos[k]; if (Lic_up_(x.SITUACAO) === 'RECURSO') (LICD_PRAZOS_RECURSO[Lic_up_(x.RECURSO_PARTE)] || []).forEach(function (t) { precisa[t] = true; }); });
  Lic_eventosDe_(l.ID).forEach(function (e) {
    var t = Lic_s_(e.TIPO);
    if (!/^PRAZO_(RECURSO|CONTRARRAZOES)$/.test(t) || precisa[t] || Lic_up_(e.SITUACAO) !== 'ATIVO' || Lic_up_(e.NATUREZA) !== 'PREVISTO' || Lic_s_(e.FONTE_REF).indexOf('Resultado registrado por') !== 0) return;
    var mot = 'Nenhum item continua em recurso com ' + (t === 'PRAZO_RECURSO' ? 'razões nossas' : 'contrarrazões nossas') + ' (resultado atualizado por ' + eu.nome + '): o prazo pendente foi cancelado.';
    SGO_DATA.update(LIC_ABAS.EVENTOS, e.ID, { SITUACAO: 'CANCELADO', MOTIVO_MUDANCA: mot, ATUALIZADO_EM: agora });
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'AGENDA_PRAZO_CANCELADO', eu, { de: Lic_eventoQuandoTxt_(e), para: 'cancelado', texto: (LIC_EVENTO_TIPOS[t] || { nome: t }).nome + ': ' + mot, versao: e.VERSAO, fonte: 'Central de disputas (resultado)' });
    cancelados.push((LIC_EVENTO_TIPOS[t] || { nome: t }).nome);
  });
  return cancelados;
}
/** Revisão de bddf933 (ALTA 2): com a disputa em RESULTADO, o dado do Contrato acompanha cada resultado gravado (com histórico). */
function LicD_atualizarContrato_(eu, l, d) {
  if (Lic_up_(d.SITUACAO) !== 'RESULTADO') return null;
  var antes = Lic_json_(d.CONTRATO_JSON, null), novo = LicD_contratoDado_(l, LicD_montar_(d));
  var txt = function (c) { return c ? (c.itens || []).length + ' item(ns) ganho(s), total ' + LicD_moeda_(c.total || 0) + (c.pronto ? ', pronto' : '') : 'sem dado'; };
  var chave = function (c) { return c ? JSON.stringify([c.itens, c.total, c.pendentes, c.pronto, c.homologadoEm]) : ''; };
  if (chave(antes) === chave(novo)) return null;
  var agora = Lic_agora_();
  SGO_DATA.update(LICD_ABAS.DISPUTAS, d.ID, { CONTRATO_JSON: JSON.stringify(novo), ATUALIZADO_EM: agora });
  d.CONTRATO_JSON = JSON.stringify(novo);
  Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'DISPUTA_CONTRATO_ATUALIZADO', eu, { de: txt(antes), para: txt(novo), texto: 'Dado preparado para a etapa de Contrato refeito depois do resultado novo: ' + txt(novo) + '. ' + novo.aviso, versao: LICD_REGRAS, fonte: 'Central de disputas' });
  return novo;
}

/**
 * Resultado de um item (versão nova; nada é alterado): d = { id, item, situacao, colocacao, vencedor, vencedorCnpj, valorFinal, motivo,
 * adjudicacao, homologacao, fonte, ata, recursoParte (NOS|CONCORRENTE|AMBOS), obs }.
 */
function LicD_resultado_(eu, d) {
  var sit = Lic_up_(d.situacao);
  if (!LICD_RESULTADOS[sit]) throw new Error('Escolha a situação do item na lista (ganho, perdido, fracassado, deserto, desclassificado, habilitação pendente ou em recurso). Nada foi gravado');
  var fonte = LicD_txt_(d.fonte, 300);
  if (fonte.length < 5) throw new Error('Escreva a fonte do resultado (por exemplo "ata da sessão no Compras.gov.br" ou "termo de homologação publicado no PNCP"). Nada foi gravado');
  var motivo = LicD_txt_(d.motivo, 1000);
  if (sit === 'DESCLASSIFICADO' && motivo.length < 10) throw new Error('Escreva o motivo da desclassificação (pelo menos 10 letras, como está na ata). Nada foi gravado');
  var col = Lic_s_(d.colocacao);
  if (col && !/^\d{1,3}$/.test(col)) throw new Error('Escreva a colocação como número inteiro (1, 2, 3...). Nada foi gravado');
  if (sit === 'GANHO') col = col || '1';
  var vf = Lic_s_(d.valorFinal) ? LicD_valor_(d.valorFinal, 'o valor final unitário') : null;
  if (sit === 'GANHO' && vf === null) throw new Error('Escreva o valor final unitário do item ganho (o da ata ou da negociação). Nada foi gravado');
  var adj = Lic_s_(d.adjudicacao), hom = Lic_s_(d.homologacao), ata = Lic_s_(d.ata);
  [[adj, 'da adjudicação'], [hom, 'da homologação'], [ata, 'da ata ou da intimação']].forEach(function (p) { if (p[0] && !LicD_diaValido_(p[0])) throw new Error('Escolha a data ' + p[1] + ' no calendário. Nada foi gravado'); });
  if (adj && hom && hom < adj) throw new Error('A homologação não pode ser antes da adjudicação: confira as datas. Nada foi gravado');
  var parte = Lic_up_(d.recursoParte);
  if (sit === 'RECURSO' && ['NOS', 'CONCORRENTE', 'AMBOS'].indexOf(parte) < 0) throw new Error('Diga quem recorre: nós (razões de recurso), o concorrente (nós fazemos as contrarrazões) ou os dois. Nada foi gravado');
  if (sit !== 'RECURSO') parte = '';
  var venc = LicD_txt_(d.vencedor, 200), cnpj = Lic_s_(d.vencedorCnpj).replace(/\D/g, '');
  if (cnpj && cnpj.length !== 14) throw new Error('Escreva o CNPJ do vencedor com os 14 números (ou deixe em branco). Nada foi gravado');
  var r = Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), g = LicD_paraGravar_(l, { situacoes: ['ABERTA', 'RESULTADO'], semCadeia: true }), it = LicD_item_(g, d.item), agora = Lic_agora_();
    // revisão de bddf933 (MÉDIA-ALTA 3): item desistido não é ganho; valor final acima do nosso último lance (ou da proposta) só com o motivo
    if (sit === 'GANHO' && it.desistiu) throw new Error('Não foi possível: a Diretoria desistiu do item ' + it.item + ' na sessão (' + it.desistenciaMotivo + '); ele não pode ficar como ganho. Registre perdido (ou o resultado da ata). Nada foi gravado');
    if (sit === 'GANHO' && vf > it.nossoAtual + 0.004 && motivo.length < 10) throw new Error('Não foi possível: o valor final de ' + LicD_moeda_(vf) + ' é maior que o nosso último lance do item ' + it.item + ' (' + LicD_moeda_(it.nossoAtual) + (it.nossoInformado ? '' : ', o valor da proposta') + '). Confira a ata; se o valor está certo, escreva o motivo (pelo menos 10 letras). Nada foi gravado');
    if (sit === 'GANHO' && vf < it.piso - 0.004) throw new Error('O valor final de ' + LicD_moeda_(vf) + ' fica abaixo do piso autorizado do item ' + it.item + ' (' + LicD_moeda_(it.piso) + '). Se a Diretoria aceitou um valor menor na negociação, autorize antes o piso menor (com o motivo). Nada foi gravado');
    var ant = LicD_resultadosDe_(g.d.ID).filter(function (x) { return Lic_s_(x.ITEM) === it.item; }), versao = ant.reduce(function (m, x) { return Math.max(m, Number(x.VERSAO) || 0); }, 0) + 1, prev = ant[ant.length - 1];
    var eventos = sit === 'RECURSO' ? LicD_prazosRecurso_(eu, l, parte, ata, fonte, agora) : [];
    var acima = sit === 'GANHO' && vf > it.nossoAtual + 0.004;
    var reg = { DISPUTA_ID: Lic_s_(g.d.ID), OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), ITEM: it.item, VERSAO: versao, SITUACAO: sit, COLOCACAO: col, VENCEDOR: sit === 'GANHO' ? 'Metrolabs (nós)' : venc, VENCEDOR_CNPJ: sit === 'GANHO' ? '' : cnpj,
      VALOR_FINAL: vf === null ? '' : vf, VALOR_TOTAL: vf === null ? '' : LicD_r2_(vf * it.quantidade), MOTIVO: motivo, ADJUDICACAO_EM: adj, HOMOLOGACAO_EM: hom, ATA_EM: ata, RECURSO_PARTE: parte, FONTE: fonte, OBS: LicD_txt_(d.obs, 500),
      EVENTOS: Lic_texto_(eventos.join('; '), 500), POR_ID: eu.id, POR_NOME: eu.nome, EM: agora };
    reg.HASH = LicD_hashResultado_(reg);
    SGO_DATA.insert(LICD_ABAS.RESULTADOS, reg);
    var ultimos = {}; LicD_resultadosDe_(g.d.ID).forEach(function (x) { ultimos[Lic_s_(x.ITEM)] = x; });
    var cancelados = LicD_cancelarPrazosOrfaos_(eu, l, ultimos, agora);
    var deTxt = prev ? (LICD_RESULTADOS[Lic_up_(prev.SITUACAO)] || prev.SITUACAO) + ' (versão ' + prev.VERSAO + ')' : 'sem resultado';
    var texto = 'Resultado do item ' + it.item + ': ' + LICD_RESULTADOS[sit] + (col ? ', ' + col + 'º lugar' : '') + (vf !== null ? ', valor final ' + LicD_moeda_(vf) + ' (total ' + LicD_moeda_(reg.VALOR_TOTAL) + ')' : '') + (sit !== 'GANHO' && venc ? ', vencedor ' + venc : '') +
      (motivo ? '. Motivo: ' + motivo : '') + (adj ? '. Adjudicação em ' + LicD_dia_(adj) : '') + (hom ? '. Homologação em ' + LicD_dia_(hom) : '') + (eventos.length ? '. Prazos na agenda, pendentes de confirmação: ' + eventos.join('; ') : '') + (cancelados.length ? '. Prazos pendentes cancelados (sem recurso): ' + cancelados.join('; ') : '') +
      (acima ? '. Valor final acima do nosso último lance (' + LicD_moeda_(it.nossoAtual) + '), aceito com o motivo' : '') + '. Fonte: ' + fonte + '.' + (g.aviso ? ' ' + g.aviso : '');
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'DISPUTA_RESULTADO_ITEM', eu, { de: deTxt, para: LICD_RESULTADOS[sit] + ' (versão ' + versao + ')', texto: texto, versao: 'resultado ' + versao, fonte: 'Central de disputas', hash: reg.HASH });
    var contrato = LicD_atualizarContrato_(eu, l, g.d);
    return { texto: texto, eventos: eventos, cancelados: cancelados, op: l, contrato: contrato };
  });
  return { texto: r.texto + (r.eventos.length ? ' Confirme as datas na aba Prazos: sem confirmação não há alerta.' : '') + (r.contrato ? ' O dado do Contrato foi refeito: ' + r.contrato.aviso : ''), eventos: r.eventos, cancelados: r.cancelados, contrato: r.contrato };
}

/** Dado preparado para a etapa de Contrato (só o dado): itens ganhos, valores, datas e o que ainda falta. */
function LicD_contratoDado_(l, m) {
  var ganhos = m.itens.filter(function (i) { return i.resultado && i.resultado.situacao === 'GANHO'; });
  var pend = m.itens.filter(function (i) { return i.resultado && (i.resultado.situacao === 'HABILITACAO_PENDENTE' || i.resultado.situacao === 'RECURSO'); });
  var total = LicD_r2_(ganhos.reduce(function (s, i) { return s + (Number(i.resultado.valorTotal) || 0); }, 0));
  var hom = ganhos.map(function (i) { return i.resultado.homologacao; }).filter(Boolean).sort();
  return { regras: LICD_REGRAS, orgao: Lic_s_(l.ORGAO_NOME), orgaoCnpj: Lic_s_(l.ORGAO_CNPJ), processo: Lic_s_(l.NUMERO_CONTROLE_PNCP), uf: Lic_s_(l.UF), municipio: Lic_s_(l.MUNICIPIO), proposta: m.proposta.numero,
    itens: ganhos.map(function (i) { return { item: i.item, codigo: i.codigo, nome: i.nome, descricao: i.descricao, quantidade: i.quantidade, valorFinal: i.resultado.valorFinal, total: i.resultado.valorTotal, adjudicacao: i.resultado.adjudicacao, homologacao: i.resultado.homologacao, fonte: i.resultado.fonte }; }),
    total: total, homologadoEm: hom.length === ganhos.length && hom.length ? hom[hom.length - 1] : '', pendentes: pend.map(function (i) { return { item: i.item, situacao: i.resultado.situacaoNome }; }),
    pronto: ganhos.length > 0 && !pend.length && hom.length === ganhos.length, aviso: ganhos.length ? (hom.length === ganhos.length ? 'Itens ganhos homologados: o dado está pronto para a etapa de Contrato.' : 'Falta a data da homologação de algum item ganho.') : 'Nenhum item ganho: não há contrato.' };
}

/** Concluir: todos os itens com resultado; a oportunidade vai para "Resultado" (motivo e histórico). d = { id, motivo, fonte }. */
function LicD_concluir_(eu, d) {
  var motivo = LicD_motivo_(d.motivo, 'da conclusão do resultado');
  var r = Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), g = LicD_paraGravar_(l, { situacoes: ['ABERTA'], semCadeia: true }), m = LicD_montar_(g.d), faltam = m.itens.filter(function (i) { return !i.resultado; });
    if (faltam.length) throw new Error('Não foi possível concluir: falta o resultado do(s) item(ns) ' + faltam.map(function (i) { return i.item; }).join(', ') + '. Registre o resultado de cada item na aba Disputa (com a fonte). Nada foi alterado');
    if (Lic_s_(l.SITUACAO) !== 'DISPUTA') throw new Error('Não foi possível concluir: a oportunidade está em "' + (LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || l.SITUACAO) + '", não em Disputa (alguém mudou agora há pouco). Atualize e confira. Nada foi alterado');
    var contrato = LicD_contratoDado_(l, m), agora = Lic_agora_();
    var cont = {}; m.itens.forEach(function (i) { cont[i.resultado.situacaoNome] = (cont[i.resultado.situacaoNome] || 0) + 1; });
    var resumo = Object.keys(cont).map(function (k) { return cont[k] + ' ' + k.toLowerCase(); }).join(', ');
    SGO_DATA.update(LICD_ABAS.DISPUTAS, g.d.ID, { SITUACAO: 'RESULTADO', RESULTADO_EM: agora, RESULTADO_POR_ID: eu.id, RESULTADO_POR_NOME: eu.nome, RESULTADO_MOTIVO: motivo, CONTRATO_JSON: JSON.stringify(contrato), ATUALIZADO_EM: agora });
    var texto = 'Resultado da disputa registrado: ' + resumo + (contrato.itens.length ? '; ' + contrato.itens.length + ' item(ns) ganho(s), total ' + LicD_moeda_(contrato.total) + ' (dado preparado para a etapa de Contrato)' : '') + '. Motivo: ' + motivo + (g.aviso ? '. ' + g.aviso : '');
    var mud = Lic_mudarSituacaoSemTrava_(eu, { id: l.ID, textoHistorico: texto, fonte: d.fonte === 'Kanban' ? 'Kanban' : 'Central de disputas' }, ['DISPUTA'], 'RESULTADO', 'RESULTADO_REGISTRADO', {}, 'concluir o resultado');
    return { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), situacao: 'RESULTADO', hash: mud.hash, resumo: resumo, contrato: contrato };
  });
  Lic_aposSituacao_(d.id, r);
  return Object.assign({}, r, { texto: 'Resultado concluído (' + r.resumo + '). A licitação foi para "Resultado" no Kanban. ' + r.contrato.aviso });
}

// ------------------------------------------------------------ relatório A4 (SGO_Licitacoes_Relatorios.js)
function LicD_relatorioHtml_(l, m, o) {
  var esc = RelA4_esc_, F = typeof LicRel_fonte_ === 'function' ? LicRel_fonte_ : function (t) { return '<p class="nota"><b>Fonte:</b> ' + esc(t) + '</p>'; }, corpo = '';
  corpo += RelA4_caixa_(LICD_AVISO_ASSISTIDO, 'aviso');
  corpo += RelA4_secao_('Identificação', RelA4_identificacao_([['Licitação', Lic_s_(l.CODIGO)], ['Órgão', [l.ORGAO_NOME, l.UNIDADE_NOME].filter(Boolean).join(' · ') || '—', { largo: true }], ['Processo (PNCP)', Lic_s_(l.NUMERO_CONTROLE_PNCP) || '—'],
    ['Modalidade', Lic_s_(l.MODALIDADE) || '—'], ['Situação da disputa', m.situacaoNome], ['Sessão', m.sessaoTexto ? m.sessaoTexto + ' (' + m.sessaoFonte + ')' : 'não informada'], ['Portal', m.portal || '—'],
    ['Proposta', m.proposta.numero + ' · versão ' + m.proposta.versao], ['Simulação de preço', 'versão ' + m.simulacao.versao], ['Aberta', LicD_br_(m.abertaEm) + ' · ' + m.abertaPor], ['Motivo da abertura', m.motivo, { largo: true }]]) +
    (m.integra ? '' : RelA4_caixa_('Os dados da disputa não conferem com o hash gravado (alterados fora do SGO+).', 'critico')) +
    F('LIC_DISPUTAS (registro ' + m.hash.slice(0, 16) + '), proposta emitida ' + m.proposta.numero + ' (SHA-256 ' + m.proposta.sha256 + ') e LIC_SIMULACOES versão ' + m.simulacao.versao + ' (hash ' + m.simulacao.hash.slice(0, 16) + ').'));
  corpo += RelA4_secao_('Itens, valores e piso', RelA4_tabela_([{ t: 'Item', cen: true, w: '11mm' }, { t: 'Serviço' }, { t: 'Qtd.', num: true }, { t: 'Valor inicial', num: true }, { t: 'Piso da simulação', num: true }, { t: 'Piso autorizado', num: true }, { t: 'Custo + impostos', num: true }, { t: 'Intervalo' }],
    m.itens.map(function (i) { return [i.item, { html: '<b>' + esc(i.codigo) + '</b><span class="sub">' + esc(Lic_texto_(i.descricao || i.nome, 200)) + '</span>' }, LicP_qtd_(i.quantidade), LicD_moeda_(i.valorInicial), LicD_moeda_(i.pisoSimulacao),
      i.pisoAssumido ? RelA4_marca_(LicD_moeda_(i.piso) + ' (prejuízo assumido)', 'critico') : LicD_moeda_(i.piso), i.pisoCusto === null ? '—' : LicD_moeda_(i.pisoCusto), i.intervaloTxt]; }), { legenda: 'Configuração de cada item', vazio: 'Sem itens.' }) +
    F('Valor inicial = preço unitário da proposta emitida. Piso da simulação = preço que garante a sobra mínima da política gravada na simulação (' + (m.itens[0] ? LicP_pct_(m.itens[0].margemMinPct, 0) : '—') + '). Custo + impostos = preço de sobra zero, com os impostos da mesma simulação. Piso autorizado e intervalo: decisões do registro da disputa (LIC_DISPUTA_LANCES).'));
  var dec = m.lances.filter(function (x) { return x.tipo !== 'LANCE'; }).slice().reverse();
  corpo += RelA4_secao_('Decisões da Diretoria', RelA4_tabela_([{ t: 'Nº', cen: true, w: '10mm' }, { t: 'Quando (Brasília)' }, { t: 'Quem' }, { t: 'Item', cen: true }, { t: 'Decisão' }, { t: 'Motivo' }],
    dec.map(function (x) { return [String(x.seq), x.quandoBr, x.por, x.item || 'todos', x.tipo === 'INTERVALO' ? 'Intervalo: ' + LicD_intervaloTxt_(Lic_json_(x.texto, null)) : x.tipo === 'SUGESTOES' ? 'Sugestões ' + (x.texto === 'PARADAS' ? 'paradas' : 'ligadas') : x.texto, x.motivo]; }),
    { legenda: 'Piso, intervalo, desistências e sugestões', vazio: 'Nenhuma decisão registrada além da abertura.', compacta: true }) + F('LIC_DISPUTA_LANCES, registros de decisão (tipo PISO, INTERVALO, DESISTENCIA e SUGESTOES), com o motivo escrito.'));
  var lan = m.lances.filter(function (x) { return x.tipo === 'LANCE'; }).slice().reverse();
  corpo += RelA4_secao_('Histórico de lances', RelA4_tabela_([{ t: 'Nº', cen: true, w: '10mm' }, { t: 'Quando (Brasília)' }, { t: 'Item', cen: true }, { t: 'De quem' }, { t: 'Valor', num: true }, { t: 'Sobra', num: true }, { t: 'Origem' }, { t: 'Quem registrou' }, { t: 'Hash' }],
    lan.map(function (x) { return [String(x.seq), x.quandoBr, x.item, x.autor === 'NOS' ? 'Nós' : 'Concorrente' + (x.concorrente ? ' (' + x.concorrente + ')' : ''), LicD_moeda_(x.valor), x.autor === 'NOS' && x.sobraPct !== null ? LicP_pct_(x.sobraPct, 2) : '—',
      'Digitado' + (x.sugerido ? ' (= sugestão)' : ''), x.por, x.hash.slice(0, 12)]; }), { legenda: 'Lances digitados pela Diretoria, na ordem', vazio: 'Nenhum lance registrado.', compacta: true }) +
    (m.cadeia.integra ? '<p>' + esc('Cadeia do registro conferida: ' + m.lances.length + ' registro(s), cada um ligado ao anterior pelo hash, sem alteração.') + '</p>' : RelA4_caixa_('Registro de lances alterado fora do SGO+: ' + m.cadeia.problema + '.', 'critico')) +
    (m.cadeia.ancora ? RelA4_caixa_('Quebra do registro reconhecida pelo Administrador ' + m.cadeia.ancora.por + ' em ' + LicD_br_(m.cadeia.ancora.quando) + ' (âncora ' + m.cadeia.ancora.seq + '): ' + m.cadeia.ancora.motivo + '. A conferência vale a partir da âncora; os registros anteriores ficam como estavam.', 'aviso') : '') +
    F('LIC_DISPUTA_LANCES (uma linha por lance, imutável; hash encadeado). O SGO+ não envia lance: todo valor foi digitado por quem registrou. Sobra pela conta da simulação (LicP_sobra_).'));
  corpo += RelA4_secao_('Resultado', RelA4_tabela_([{ t: 'Item', cen: true, w: '11mm' }, { t: 'Situação' }, { t: 'Colocação', cen: true }, { t: 'Vencedor' }, { t: 'Valor final', num: true }, { t: 'Adjudicação' }, { t: 'Homologação' }, { t: 'Fonte' }],
    m.itens.map(function (i) { var r = i.resultado; return r ? [i.item, r.situacaoNome + (r.motivo ? ': ' + Lic_texto_(r.motivo, 200) : '') + (r.eventos ? ' (' + r.eventos + ')' : ''), r.colocacao || '—', r.vencedor || '—', r.valorFinal === null ? '—' : LicD_moeda_(r.valorFinal), LicD_dia_(r.adjudicacao) || '—', LicD_dia_(r.homologacao) || '—', r.fonte + ' · versão ' + r.versao + (r.integra ? '' : ' (alterado fora do SGO+)')] : [i.item, 'sem resultado', '—', '—', '—', '—', '—', '—']; }),
    { legenda: 'Resultado de cada item (a última versão)', vazio: 'Sem itens.' }) + (m.contrato ? '<p>' + esc('Etapa de Contrato: ' + m.contrato.aviso + (m.contrato.itens.length ? ' Total dos itens ganhos: ' + LicD_moeda_(m.contrato.total) + '.' : '')) + '</p>' : '') +
    F('LIC_RESULTADOS (uma linha por versão do resultado de cada item, com a fonte informada por quem registrou) e LIC_DISPUTAS.CONTRATO_JSON.' + (m.resultadoEm ? ' Concluído em ' + LicD_br_(m.resultadoEm) + ' por ' + m.resultadoPor + ': ' + m.resultadoMotivo : '')));
  return RelA4_documento_({ titulo: 'Relatório da disputa', subtitulo: [Lic_s_(l.CODIGO), Lic_s_(l.ORGAO_NOME)].filter(Boolean).join(' · '), tituloCurto: 'Relatório de disputa', tituloArquivo: 'Relatorio de disputa', numero: o.numero, revisao: Math.max(0, (o.versao || 1) - 1),
    identificacao: Lic_s_(l.CODIGO), rotuloIdentificacao: 'Licitação', emitidoPor: o.por, ficha: [['Regras', LICD_REGRAS]], corpo: corpo, capa: false, sumario: false });
}
function LicD_relatorio_(eu, d) {
  if (typeof LicRel_gravar_ !== 'function') throw new Error('Não foi possível: os relatórios em A4 não estão disponíveis neste ambiente');
  try { LicRel_garantirAbas_(); } catch (e) {}
  var l = Lic_acharOp_(d.id), x = LicD_disputasDe_(l.ID)[0];
  if (!x) throw new Error('Não foi possível gerar: esta licitação ainda não tem disputa. Abra a disputa na aba Disputa');
  var m = LicD_montar_(x), lances = m.lances.filter(function (y) { return y.tipo === 'LANCE'; }).length;
  var resumo = m.itens.length + ' item(ns); ' + lances + ' lance(s) e ' + (m.lances.length - lances) + ' decisão(ões) no registro' + (m.cadeia.integra ? '' : ' (registro alterado fora do SGO+)') + '; ' + m.comResultado + ' item(ns) com resultado; situação: ' + m.situacaoNome + '.';
  return LicRel_gravar_(eu, 'DISPUTA', 'DISP:' + Lic_s_(x.ID), { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), PERIODO_DE: '', PERIODO_ATE: '' }, function (o) { return LicD_relatorioHtml_(l, m, o); }, m, resumo, 'Relatório da disputa ' + Lic_s_(l.CODIGO),
    function (reg) { Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'RELATORIO_GERADO', eu, { para: reg.NUMERO, texto: 'Relatório da disputa gerado em A4 e guardado (SHA-256 ' + reg.HTML_SHA256 + '). ' + resumo, versao: 'relatório ' + reg.VERSAO + ' · ' + LICD_REGRAS, fonte: 'Central de disputas', hash: reg.HASH }); });
}

/**
 * Revisão de bddf933 (ALTA 1, b): só o Administrador. Com o registro quebrado (linha mudada ou apagada na planilha), grava uma
 * ÂNCORA com o motivo e o que estava quebrado; a cadeia recomeça dela (o que veio antes fica marcado no painel e no relatório).
 * Os dados da abertura (proposta, simulação, pisos) precisam conferir: âncora não "limpa" abertura alterada. d = { id, motivo }.
 */
function LicD_reconhecerQuebra_(eu, d) {
  if (Lic_up_(eu.perfil) !== 'ADMIN') throw new Error('Não foi possível: só o Administrador reconhece a quebra do registro de lances (ele confere a planilha antes). Peça ao Administrador. Nada foi gravado');
  var motivo = LicD_txt_(d.motivo, 1000);
  if (motivo.length < 20) throw new Error('Escreva o motivo da quebra com o que você conferiu na planilha (pelo menos 20 letras): fica na âncora do registro e no histórico. Nada foi gravado');
  return Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), x = LicD_disputasDe_(l.ID)[0];
    if (!x) throw new Error('Não foi possível: esta licitação não tem disputa. Nada foi gravado');
    var lances = LicD_lancesDe_(x.ID), ass = LicD_assinado_(x, lances);
    if (!ass) throw new Error('Não foi possível: os dados da abertura da disputa foram alterados fora do SGO+; a âncora não vale para eles. A disputa precisa ser conferida na planilha pelo Administrador do sistema. Nada foi gravado');
    var cad = LicD_cadeia_(x, lances, ass);
    if (cad.integra) throw new Error('Não há quebra: o registro de lances confere' + (cad.ajustar ? ' (a retomada automática acontece na próxima gravação)' : '') + '. Nada foi gravado');
    var ult = lances[lances.length - 1], maxSeq = lances.reduce(function (m, y) { return Math.max(m, Number(y.SEQ) || 0); }, 0);
    x.ULTIMO_SEQ = maxSeq; x.ULTIMO_HASH = ult ? Lic_s_(ult.HASH) : '';
    var texto = 'Quebra reconhecida pelo Administrador: ' + cad.problema + '. ' + lances.length + ' registro(s) antes desta âncora ficam como estão, marcados no painel e no relatório.';
    var reg = LicD_registrar_(eu, x, { TIPO: 'ANCORA', AUTOR: 'ADMINISTRADOR', MOTIVO: motivo, TEXTO: texto });
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'DISPUTA_QUEBRA_RECONHECIDA', eu, { de: 'registro quebrado', para: 'âncora ' + reg.SEQ, texto: texto + ' Motivo: ' + motivo, versao: 'disputa · registro ' + reg.SEQ, fonte: 'Central de disputas', hash: reg.HASH });
    return { texto: 'Quebra reconhecida (âncora ' + reg.SEQ + '). O registro de lances recomeça a partir dela; o que veio antes fica marcado no relatório.' };
  });
}

// ------------------------------------------------------------ ações (Licitacoes_api 'disputa', { op })
var LICD_OPS = {
  central: function (eu) { return LicD_central_(eu); },
  tela: function (eu, d) { return LicD_tela_(eu, d); },
  abrir: function (eu, d) { return LicD_abrir_(eu, d); },
  piso: function (eu, d) { return LicD_piso_(eu, d); },
  intervalo: function (eu, d) { return LicD_intervalo_(eu, d); },
  lance: function (eu, d) { return LicD_lance_(eu, d); },
  desistir: function (eu, d) { return LicD_desistir_(eu, d); },
  sugestoes: function (eu, d) { return LicD_sugestoes_(eu, d); },
  resultado: function (eu, d) { return LicD_resultado_(eu, d); },
  concluir: function (eu, d) { return LicD_concluir_(eu, d); },
  relatorio: function (eu, d) { return LicD_relatorio_(eu, d); },
  reconhecerQuebra: function (eu, d) { return LicD_reconhecerQuebra_(eu, d); }
};
/** Licitacoes_api já conferiu a sessão e a permissão (Diretoria e Administrador). */
function LicD_acao_(eu, d) {
  Lic_exigir_(eu, 'usar a Central de disputas');
  var op = Lic_s_(d && d.op), fn = Object.prototype.hasOwnProperty.call(LICD_OPS, op) ? LICD_OPS[op] : null;
  if (!fn) throw new Error('Não foi possível: ação de disputa desconhecida (' + Lic_s_(d && d.op) + '). Atualize a página (F5) e tente de novo');
  LicD_garantirAbas_();
  try { if (typeof LicProp_garantirAbas_ === 'function') LicProp_garantirAbas_(); } catch (e) {}
  try { if (typeof LicP_garantirAbas_ === 'function') LicP_garantirAbas_(); } catch (e) {}
  return fn(eu, d || {});
}
