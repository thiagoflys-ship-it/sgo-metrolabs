/****************************************************
 * SGO+ LICITAÇÕES — TABELA DE PREÇOS PRÓPRIA E SIMULADOR (02/11/2026)
 *
 * Decisão do dono (docs/LICITACOES_00_MISSAO_DIRETORIA_20261101.md): "Os preços não serão do Comercial; isso será cadastrado
 * no módulo". A tabela de preços de licitação é da Diretoria: por serviço (código do catálogo), preço de referência, custo de
 * referência (lido do catálogo ou informado pela Diretoria com motivo), custo do parceiro, execução, vigência e observações.
 * Cada mudança é uma versão nova (merge campo a campo, motivo obrigatório, LIC_PRECOS_VERSOES com a fotografia da linha e
 * LIC_HISTORICO com de → para). O catálogo do Comercial serve só de ponto de partida (importação com prévia) e de CUSTO.
 *
 * O cálculo REUTILIZA as funções do Comercial (nada da fórmula é copiado):
 *   - ComPr_politica_ / ComPr_polUnidade_: impostos por unidade (Lucro Real), custo da hora, km, origem da equipe;
 *   - ComF_custoProduto_ (ficha de custo: horas x custo da hora x (1 + custo fixo) + Bônus Coletivo diluído + padrões + consumíveis);
 *   - ComPr_normalizar_ + ComPr_calcularViagem_ (km R$ 2,50 ida e volta, pedágio, alimentação, hospedagem, horas de estrada e
 *     Incentivo de Missão de R$ 300 por executante em viagem de 200 km ou mais, pelos parâmetros do Programa de conduta);
 *   - ComPr_precoServicoConta_ / ComPr_precoProduto_ (preço que garante a sobra) e ComPr_arredondarCima_;
 *   - ComCatN_metade (REG-CAL-001: pontos em centavos inteiros, meio para cima) e ComPr_referencias_ (distâncias da Conduta).
 *
 * Padrões adotados em 02/11/2026 (o dono não soube responder; a Diretoria muda na tela "Preços de licitação", com versão):
 *   sobra mínima de 35% (piso) e alvo de 40% sobre o preço INTEIRO; deslocamento e seguro-garantia diluídos no unitário (o edital
 *   pede preço com todas as despesas), proporcionalmente ao custo de cada item; piso POR ITEM (nenhum item abaixo de 35%, mesmo que
 *   o lote feche); sem comissão; RJ e ES pela equipe do Rio, o resto pela de Goiânia; impostos sempre da matriz de Goiânia (CNPJ
 *   da proposta, EPP); balança e esfigmomanômetro pela equipe própria (Inmetro); eletromédicos por parceiro (custo do parceiro com a
 *   mesma sobra de 35%); seguro-garantia só quando o edital exigir, com o custo informado (corretora): sem o custo, pendência.
 *   Item com preço "a confirmar" (óxido de etileno, QT-AUTOCLAVE-BT): pendência, sem piso.
 *
 * Simulação: na aba "Preço" da ficha. "Calcular" não grava nada; "Salvar simulação" grava uma VERSÃO NOVA (LIC_SIMULACOES), com
 * a entrada, o resultado, as premissas e a fotografia da política e das versões da tabela usadas, e o hash do registro. Uma
 * simulação salva nunca muda (não existe ação de alterar; a tela confere o hash ao abrir).
 *
 * Nota (SGO_Licitacoes_Analise.js, Lic_criteriosCodigo_): com simulação salva, o critério "margem" usa a última versão
 * (LicP_margemNota_); a simulação entra na base da análise (LicP_baseNota_), e a ficha mostra a análise como desatualizada.
 *
 * Telas: JS_Licitacoes_Precos.html. Ações: Licitacoes_api(sessionId, 'precos', { op, ... }) — só Diretoria e Administrador
 * (o servidor confere em toda chamada, como no resto do módulo).
 ****************************************************/

var LICP_ABAS = { PRECOS: 'LIC_PRECOS', VERSOES: 'LIC_PRECOS_VERSOES', SIMULACOES: 'LIC_SIMULACOES' };
var LICP_COLUNAS = {
  LIC_PRECOS: ['ID', 'CODIGO', 'NOME', 'CATEGORIA', 'TIPO', 'UNIDADE', 'EXECUCAO', 'PRECO_REFERENCIA', 'PRECO_SITUACAO', 'CUSTO_REFERENCIA', 'CUSTO_ORIGEM', 'CUSTO_MOTIVO',
    'CUSTO_PARCEIRO', 'REGRA_PRECO', 'PONTOS_MINIMO', 'PRODUTO_ID', 'OBS', 'VIGENCIA_DESDE', 'VIGENCIA_ATE', 'ATIVO', 'VERSAO', 'MOTIVO', 'HASH',
    'ATUALIZADO_POR_ID', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  LIC_PRECOS_VERSOES: ['ID', 'PRECO_ID', 'CODIGO', 'VERSAO', 'DADOS_JSON', 'MUDOU', 'MOTIVO', 'POR_ID', 'POR_NOME', 'EM', 'HASH'],
  LIC_SIMULACOES: ['ID', 'OPORTUNIDADE_ID', 'CODIGO', 'VERSAO', 'MOTIVO', 'SITUACAO', 'ENTRADA_JSON', 'RESULTADO_JSON', 'TOTAL_CUSTO', 'TOTAL_PISO', 'TOTAL_ALVO',
    'TOTAL_EDITAL', 'TOTAL_PROPOSTA', 'MARGEM_EDITAL_PCT', 'MARGEM_PROPOSTA_PCT', 'ITENS_ABAIXO_PISO_PROPOSTA', 'ITENS_ABAIXO_PISO_EDITAL', 'PENDENCIAS', 'POLITICA_VERSAO', 'HASH', 'POR_ID', 'POR_NOME', 'CRIADO_EM']
};
var LICP_COLUNAS_TEXTO = { LIC_PRECOS: ['CODIGO', 'VIGENCIA_DESDE', 'VIGENCIA_ATE'] };
var LICP_REGRAS = 'LIC-PRECO-2026-11-02.1';
var LICP_EXECUCOES = { PROPRIA: 'Equipe própria', PARCEIRO: 'Parceiro' };
var LICP_SITUACOES_PRECO = { CONFIRMADO: 'Confirmado', A_CONFIRMAR: 'A confirmar pela Diretoria' };
// revisão de ca99fe5: 40 itens cabem com folga numa célula (o resultado gravado é enxuto); Calcular e Salvar usam o mesmo limite
var LICP_MAX_ITENS = 40;
var LICP_POLITICA_PADRAO = {
  margemMinPct: 35, margemAlvoPct: 40, comissaoPct: 0, pisoPorItem: true, diluir: true, ufsEquipeRio: ['RJ', 'ES'], unidadeEmissora: 'GO',
  origem: 'Padrões adotados em 02/11/2026 (o dono não soube responder; a Diretoria pode mudar nesta tela, com versão)'
};

// ------------------------------------------------------------ utilitários
/** Número da tela ou do banco (number, "1.234,56", "1234,5", "75.50") ou null. Nunca usa SGO_UTILS.toNumber. */
function LicP_n_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = Lic_s_(v).replace(/R\$|%|\s/g, '');
  if (!s) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  else if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  var n = Number(s);
  return isFinite(n) ? n : null;
}
function LicP_r2_(n) { return Math.round((Number(n) || 0) * 100 + 1e-9) / 100; }
/** "1.234,56" (pt-BR, sem depender do idioma do servidor). */
function LicP_fmt_(v, casas) {
  casas = casas === undefined ? 2 : casas;
  var n = Number(v) || 0, neg = n < 0, f = Math.pow(10, casas), a = Math.round(Math.abs(n) * f + 1e-7);
  var int = String(Math.floor(a / f)), dec = String(a % f);
  while (dec.length < casas) dec = '0' + dec;
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + int + (casas ? ',' + dec : '');
}
function LicP_moeda_(v) { return 'R$ ' + LicP_fmt_(v, 2); }
function LicP_pct_(v, casas) { return LicP_fmt_(v, casas === undefined ? 1 : casas) + '%'; }
function LicP_qtd_(v) { var n = Number(v) || 0; return Math.round(n) === n ? LicP_fmt_(n, 0) : LicP_fmt_(n, 2); }
function LicP_hoje_() { return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); }
function LicP_dia_(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(Lic_s_(iso)); return m ? m[3] + '/' + m[2] + '/' + m[1] : Lic_s_(iso); }
function LicP_norm_(t) { var s = Lic_s_(t).toLowerCase(); try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {} return s.replace(/[^a-z0-9]+/g, ' ').trim(); }
/** O Comercial (política, ficha e viagem) está no mesmo projeto? Sem ele não há cálculo (a tela diz o porquê). */
function LicP_temComercial_() {
  return typeof ComPr_politica_ === 'function' && typeof ComPr_polUnidade_ === 'function' && typeof ComPr_calcularViagem_ === 'function' && typeof ComPr_normalizar_ === 'function' &&
    typeof ComPr_precoServicoConta_ === 'function' && typeof ComPr_arredondarCima_ === 'function';
}
var LICP_MSG_SEM_COMERCIAL = 'a política de preços do Comercial (impostos, custo da hora, km e Incentivo de Missão) não está disponível neste ambiente';

function LicP_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('LICP_ABAS_OK_V2')) return; } catch (e) {}
  Object.keys(LICP_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, LICP_COLUNAS[aba]);
    LICP_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (LICP_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (cache) cache.put('LICP_ABAS_OK_V2', '1', 21600); } catch (e) {}
}

// ------------------------------------------------------------ política de preços de licitação (LIC_CONFIG, uma linha por versão)
function LicP_politicaLinhas_() {
  return Lic_ler_(LIC_ABAS.CONFIG).filter(function (c) { return Lic_s_(c.CHAVE) === 'PRECOS_POLITICA'; }).sort(function (a, b) { return (Number(a.VERSAO) || 0) - (Number(b.VERSAO) || 0); });
}
function LicP_politica_() {
  var ls = LicP_politicaLinhas_(), u = ls[ls.length - 1], v = u ? Lic_json_(u.VALOR_JSON, {}) : {};
  var p = JSON.parse(JSON.stringify(LICP_POLITICA_PADRAO));
  Object.keys(p).forEach(function (k) { if (v[k] !== undefined && v[k] !== null) p[k] = v[k]; });
  p.ufsEquipeRio = (Array.isArray(p.ufsEquipeRio) ? p.ufsEquipeRio : Lic_lista_(p.ufsEquipeRio)).map(Lic_up_).filter(Boolean);
  p.versao = u ? Number(u.VERSAO) || 1 : 0;
  p.motivo = u ? Lic_s_(u.MOTIVO) : '';
  p.por = u ? Lic_s_(u.ATUALIZADO_POR_NOME) : '';
  p.em = u ? Lic_s_(u.ATUALIZADO_EM) : '';
  return p;
}
function LicP_politicaTexto_(p) {
  return [
    'Sobra mínima (piso) de ' + LicP_pct_(p.margemMinPct, 0) + ' e alvo de ' + LicP_pct_(p.margemAlvoPct, 0) + ' sobre o preço inteiro de cada item.',
    p.pisoPorItem ? 'Piso por item: nenhum item abaixo do piso, mesmo que o lote feche.' : 'Piso conferido no lote: item abaixo do piso só gera aviso.',
    p.diluir ? 'Deslocamento e seguro-garantia diluídos no preço unitário, proporcionalmente ao custo de cada item (o edital pede preço com todas as despesas).' : 'Deslocamento e seguro-garantia numa linha própria, com o mesmo piso.',
    Number(p.comissaoPct) > 0 ? 'Comissão de ' + LicP_pct_(p.comissaoPct, 2) + ' sobre o preço.' : 'Sem comissão.',
    'Equipe do Rio de Janeiro para ' + (p.ufsEquipeRio.length ? p.ufsEquipeRio.join(' e ') : 'nenhuma UF') + '; nas demais UFs, a equipe de Goiânia.',
    'Impostos da matriz de Goiânia (CNPJ da proposta, EPP), pela tabela de unidades do Comercial.',
    'Balança e esfigmomanômetro pela equipe própria (Inmetro); eletromédicos por parceiro, com o custo do parceiro e a mesma sobra (a Diretoria muda por item).',
    'Seguro-garantia só quando o edital exigir; o custo informado pela corretora entra no preço. Sem o custo, a simulação fica com pendência.'
  ];
}
function LicP_politicaSalvar_(eu, d) {
  var motivo = Lic_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Escreva o motivo da mudança da política (pelo menos 10 letras): ele fica no histórico com o seu nome e a data. Nada foi alterado');
  var c = d.campos || {}, atual = LicP_politica_(), novo = {};
  Object.keys(LICP_POLITICA_PADRAO).forEach(function (k) { novo[k] = atual[k]; });
  var num = function (k, rot, min, max) {
    if (c[k] === undefined) return;
    var n = LicP_n_(c[k]);
    if (n === null || n < min || n > max) throw new Error('Escreva ' + rot + ' entre ' + LicP_fmt_(min, 0) + ' e ' + LicP_fmt_(max, 0) + ' (por exemplo 35 ou 40,5). Nada foi alterado');
    novo[k] = Math.round(n * 100) / 100;
  };
  num('margemMinPct', 'a sobra mínima (%)', 35, 80);
  num('margemAlvoPct', 'a margem alvo (%)', 35, 90);
  num('comissaoPct', 'a comissão (%)', 0, 10);
  if (novo.margemAlvoPct < novo.margemMinPct) throw new Error('A margem alvo (' + LicP_pct_(novo.margemAlvoPct, 2) + ') não pode ficar abaixo da sobra mínima (' + LicP_pct_(novo.margemMinPct, 2) + '). Nada foi alterado');
  if (novo.margemMinPct + novo.comissaoPct > 70) throw new Error('A sobra mínima mais a comissão passa de 70% do preço: a conta do piso não fecha com os impostos. Nada foi alterado');
  if (c.pisoPorItem !== undefined) novo.pisoPorItem = c.pisoPorItem === true || Lic_up_(c.pisoPorItem) === 'SIM';
  if (c.diluir !== undefined) novo.diluir = c.diluir === true || Lic_up_(c.diluir) === 'SIM';
  if (c.ufsEquipeRio !== undefined) {
    var ufs = Lic_lista_(c.ufsEquipeRio).map(Lic_up_), erradas = ufs.filter(function (u) { return LIC_UFS.indexOf(u) < 0; });
    if (erradas.length) throw new Error('Escreva só siglas de UF válidas para a equipe do Rio (ex.: RJ, ES). Não reconhecidas: ' + erradas.join(', ') + '. Nada foi alterado');
    novo.ufsEquipeRio = ufs;
  }
  return Lic_comTrava_(function () {
    var a2 = LicP_politica_(), mud = [];
    var nomes = { margemMinPct: 'Sobra mínima', margemAlvoPct: 'Margem alvo', comissaoPct: 'Comissão', pisoPorItem: 'Piso', diluir: 'Deslocamento e seguro', ufsEquipeRio: 'UFs da equipe do Rio', unidadeEmissora: 'Unidade emissora' };
    var txtP = function (k, v) {
      if (/Pct$/.test(k)) return LicP_pct_(v, 2);
      if (k === 'pisoPorItem') return v ? 'por item' : 'só no lote';
      if (k === 'diluir') return v ? 'diluídos no preço unitário' : 'numa linha própria';
      if (k === 'ufsEquipeRio') return (v || []).length ? v.join(', ') : 'nenhuma';
      return Lic_s_(v);
    };
    Object.keys(LICP_POLITICA_PADRAO).forEach(function (k) { if (k !== 'origem' && JSON.stringify(a2[k]) !== JSON.stringify(novo[k])) mud.push((nomes[k] || k) + ': ' + txtP(k, a2[k]) + ' → ' + txtP(k, novo[k])); });
    if (!mud.length) return { politica: a2, semMudanca: true, texto: 'Nada mudou: os valores são iguais aos atuais. Nenhuma versão nova foi criada.' };
    var versao = (a2.versao || 0) + 1, agora = Lic_agora_();
    novo.origem = 'Decisão da Diretoria (' + eu.nome + ', ' + LicP_dia_(agora) + ')';
    SGO_DATA.insert(LIC_ABAS.CONFIG, { CHAVE: 'PRECOS_POLITICA', VALOR_JSON: JSON.stringify(novo), VERSAO: versao, MOTIVO: motivo, ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora, CRIADO_EM: agora });
    Lic_historico_('CONFIG', 'PRECOS_POLITICA', '', 'POLITICA_DE_PRECOS', eu, { de: 'versão ' + (a2.versao || 0) + (a2.versao ? '' : ' (padrões de 02/11/2026)'), para: 'versão ' + versao, texto: mud.join('; ') + '. Motivo: ' + motivo, versao: versao, fonte: 'Tela Preços de licitação' });
    return { politica: LicP_politica_(), versao: versao, texto: 'Política de preços de licitação gravada na versão ' + versao + '. As simulações já salvas continuam com a versão que usaram; as novas usam esta.' };
  });
}
function LicP_baseDaUf_(uf, lp) { return (lp.ufsEquipeRio || []).indexOf(Lic_up_(uf)) >= 0 ? 'RJ' : 'GO'; }
/** Execução sugerida na importação: eletromédicos por parceiro; o resto (balança e esfigmomanômetro incluídos) pela equipe própria. */
function LicP_execucaoSugerida_(nome, categoria) { return /eletrom[eé]dic/i.test(Lic_s_(categoria) + ' ' + Lic_s_(nome)) ? 'PARCEIRO' : 'PROPRIA'; }

/** Política do Comercial para a conta: impostos da unidade emissora (matriz de Goiânia), sobra e comissão da licitação. */
function LicP_polConta_(lp) {
  var polCom = ComPr_politica_(), pol = Object.assign({}, ComPr_polUnidade_(polCom, lp.unidadeEmissora || 'GO'));
  pol.comissaoPct = Number(lp.comissaoPct) || 0; pol.margemMinPct = Number(lp.margemMinPct); pol.margemAlvoPct = Number(lp.margemAlvoPct);
  return { com: polCom, pol: pol, imp: Number(pol.impostosServicoPct) || 0, impP: Number(pol.impostosProdutoPct) || 0, cred: Number(pol.creditoProdutoPct) || 0, comissao: pol.comissaoPct };
}
/** Preço unitário que garante a margem (piso ou alvo), pelas funções do Comercial. null quando a conta não fecha. */
function LicP_precoQueGarante_(custoUnit, tipo, pc, margem) {
  if (!(custoUnit > 0)) return null;
  if (tipo === 'PRODUTO' && typeof ComPr_precoProduto_ === 'function') return ComPr_precoProduto_(custoUnit, pc.pol, margem);
  // revisão de ca99fe5: a divisão é arredondada PARA CIMA no centavo (ComPr_precoServicoConta_ arredonda ao mais próximo antes, e o
  // piso podia ficar 1 centavo abaixo da sobra). Mesma fórmula do Comercial; só Licitações usa este arredondamento.
  var d = 1 - ((Number(pc.imp) || 0) + (Number(pc.comissao) || 0) + (Number(margem) || 0)) / 100;
  if (!(d > 0.05)) return null;
  return Math.ceil(custoUnit / d * 100 - 1e-7) / 100;
}
/** Sobra de um preço unitário: { sobra, pct, impostos, comissao }. */
function LicP_sobra_(preco, custoUnit, tipo, pc) {
  var P = Number(preco) || 0, C = Number(custoUnit) || 0;
  if (!(P > 0)) return null;
  var imp = tipo === 'PRODUTO' ? P * pc.impP / 100 - C * pc.cred / 100 : P * pc.imp / 100, com = P * pc.comissao / 100, s = P - imp - com - C;
  return { sobra: LicP_r2_(s), pct: Math.round(s / P * 10000) / 100, impostos: LicP_r2_(imp), comissao: LicP_r2_(com) };
}

// ------------------------------------------------------------ tabela de preços
function LicP_linhas_() { return Lic_ler_(LICP_ABAS.PRECOS).filter(function (r) { return Lic_s_(r.CODIGO); }); }
function LicP_porCodigo_() { var m = {}; LicP_linhas_().forEach(function (r) { m[Lic_up_(r.CODIGO)] = r; }); return m; }
function LicP_produtos_() {
  var m = { id: {}, cod: {} };
  if (typeof COM_ABAS === 'undefined') return m;
  Lic_ler_(COM_ABAS.PRODUTOS).forEach(function (p) { m.id[Lic_s_(p.ID)] = p; if (Lic_s_(p.CODIGO) && Lic_up_(p.ATIVO || 'SIM') !== 'NAO') m.cod[Lic_up_(p.CODIGO)] = p; });
  return m;
}
/** Custo de um equipamento no catálogo (ficha pela política em vigor, ou o custo cadastrado): { valor, fonte }. */
function LicP_custoCatalogo_(p, pc) {
  if (!p) return { valor: null, fonte: 'item não encontrado no catálogo' };
  var v = null, fonte = '';
  try {
    if (typeof ComF_fichaVale_ === 'function' && ComF_fichaVale_(p)) { v = ComF_custoProduto_(p, pc.com); fonte = 'ficha de custo do catálogo pela política do Comercial versão ' + (pc.com.versao || 0); }
    else if (Lic_s_(p.CUSTO) !== '') { v = Number(p.CUSTO) || 0; fonte = 'custo cadastrado no catálogo'; }
  } catch (e) { v = null; fonte = 'não foi possível ler o custo do catálogo (' + Lic_s_(e && e.message) + ')'; }
  return { valor: v === null ? null : LicP_r2_(v), fonte: v === null ? (fonte || 'o catálogo não tem custo para este item') : fonte };
}
/** Custo por equipamento usado na conta: parceiro, Diretoria ou catálogo (ao vivo). { valor, fonte, origem } */
function LicP_custoDoItem_(r, pc, prods, custoParceiroSim) {
  if (Lic_up_(r.EXECUCAO) === 'PARCEIRO') {
    var cp = LicP_n_(custoParceiroSim);
    if (cp !== null && cp > 0) return { valor: LicP_r2_(cp), fonte: 'custo do parceiro informado nesta simulação', origem: 'PARCEIRO' };
    var ct = LicP_n_(r.CUSTO_PARCEIRO);
    return ct !== null && ct > 0 ? { valor: LicP_r2_(ct), fonte: 'custo do parceiro da tabela (versão ' + (Number(r.VERSAO) || 1) + ')', origem: 'PARCEIRO' } : { valor: null, fonte: 'sem o custo do parceiro', origem: 'PARCEIRO' };
  }
  if (Lic_up_(r.CUSTO_ORIGEM) === 'DIRETORIA') {
    var cd = LicP_n_(r.CUSTO_REFERENCIA);
    return { valor: cd === null ? null : LicP_r2_(cd), fonte: 'custo informado pela Diretoria (versão ' + (Number(r.VERSAO) || 1) + ' da tabela)', origem: 'DIRETORIA' };
  }
  var p = prods.id[Lic_s_(r.PRODUTO_ID)] || prods.cod[Lic_up_(r.CODIGO)];
  if (p) { var c = LicP_custoCatalogo_(p, pc); if (c.valor !== null) return { valor: c.valor, fonte: c.fonte, origem: 'CATALOGO' }; }
  var g = LicP_n_(r.CUSTO_REFERENCIA);
  return { valor: g === null ? null : LicP_r2_(g), fonte: g === null ? 'sem custo no catálogo' : 'custo gravado na importação (o catálogo não respondeu agora)', origem: 'CATALOGO' };
}
function LicP_vigente_(r, hoje) {
  var de = Lic_s_(r.VIGENCIA_DESDE).slice(0, 10), ate = Lic_s_(r.VIGENCIA_ATE).slice(0, 10);
  if (de && de > hoje) return 'vigência começa em ' + LicP_dia_(de);
  if (ate && ate < hoje) return 'vigência terminou em ' + LicP_dia_(ate);
  return '';
}
function LicP_itemParaTela_(r, pc, prods, lp) {
  var custo = pc ? LicP_custoDoItem_(r, pc, prods) : { valor: LicP_n_(r.CUSTO_REFERENCIA), fonte: '' };
  var tipo = Lic_up_(r.TIPO) || 'SERVICO', preco = LicP_n_(r.PRECO_REFERENCIA);
  var piso = pc && custo.valor ? LicP_precoQueGarante_(custo.valor, tipo, pc, lp.margemMinPct) : null;
  var alvo = pc && custo.valor ? LicP_precoQueGarante_(custo.valor, tipo, pc, lp.margemAlvoPct) : null;
  var s = pc && preco && custo.valor !== null ? LicP_sobra_(preco, custo.valor, tipo, pc) : null;
  return { id: Lic_s_(r.ID), codigo: Lic_s_(r.CODIGO), nome: Lic_s_(r.NOME), categoria: Lic_s_(r.CATEGORIA), tipo: tipo, execucao: Lic_up_(r.EXECUCAO) || 'PROPRIA', execucaoNome: LICP_EXECUCOES[Lic_up_(r.EXECUCAO)] || LICP_EXECUCOES.PROPRIA,
    precoReferencia: preco, precoSituacao: Lic_up_(r.PRECO_SITUACAO) || 'CONFIRMADO', precoSituacaoNome: LICP_SITUACOES_PRECO[Lic_up_(r.PRECO_SITUACAO)] || LICP_SITUACOES_PRECO.CONFIRMADO,
    custoOrigem: Lic_up_(r.CUSTO_ORIGEM) || 'CATALOGO', custo: custo.valor, custoFonte: custo.fonte, custoGravado: LicP_n_(r.CUSTO_REFERENCIA), custoMotivo: Lic_s_(r.CUSTO_MOTIVO), custoParceiro: LicP_n_(r.CUSTO_PARCEIRO),
    regra: Lic_up_(r.REGRA_PRECO), pontosMinimo: Number(r.PONTOS_MINIMO) || 0, obs: Lic_s_(r.OBS), vigenciaDesde: Lic_s_(r.VIGENCIA_DESDE).slice(0, 10), vigenciaAte: Lic_s_(r.VIGENCIA_ATE).slice(0, 10),
    foraVigencia: LicP_vigente_(r, LicP_hoje_()), ativo: Lic_up_(r.ATIVO || 'SIM') !== 'NAO', versao: Number(r.VERSAO) || 1, motivo: Lic_s_(r.MOTIVO), atualizadoPor: Lic_s_(r.ATUALIZADO_POR_NOME), atualizadoEm: Lic_s_(r.ATUALIZADO_EM),
    pisoSemDeslocamento: piso, alvoSemDeslocamento: alvo, sobraNaReferenciaPct: s ? s.pct : null, abaixoDoPiso: !!(s && s.pct < Number(lp.margemMinPct) - 1e-9) };
}
function LicP_tabela_(eu) {
  var lp = LicP_politica_(), pc = null, aviso = '';
  if (LicP_temComercial_()) { try { pc = LicP_polConta_(lp); } catch (e) { aviso = 'Não foi possível ler a política do Comercial agora (' + Lic_s_(e && e.message) + '): custos e pisos ficam sem a conta.'; } }
  else aviso = 'Neste ambiente ' + LICP_MSG_SEM_COMERCIAL + ': custos e pisos ficam sem a conta.';
  var prods = LicP_produtos_();
  var itens = LicP_linhas_().map(function (r) { return LicP_itemParaTela_(r, pc, prods, lp); }).sort(function (a, b) { return a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : 0; });
  return { itens: itens, politica: lp, politicaTexto: LicP_politicaTexto_(lp), politicaVersoes: LicP_politicaLinhas_().map(function (l) { return { versao: Number(l.VERSAO) || 0, motivo: Lic_s_(l.MOTIVO), por: Lic_s_(l.ATUALIZADO_POR_NOME), em: Lic_s_(l.ATUALIZADO_EM) }; }).reverse(),
    comercial: pc ? { versao: pc.com.versao || 0, impostosPct: pc.imp, unidade: pc.pol.unidadeNome } : null, aviso: aviso, execucoes: LICP_EXECUCOES, situacoesPreco: LICP_SITUACOES_PRECO,
    resumo: { total: itens.length, aConfirmar: itens.filter(function (i) { return i.precoSituacao === 'A_CONFIRMAR'; }).length, semCusto: itens.filter(function (i) { return i.custo === null || !(i.custo > 0); }).length, abaixo: itens.filter(function (i) { return i.abaixoDoPiso; }).length } };
}
/** Valor de uma coluna da tabela em texto pt-BR, para o histórico (de → para). */
function LicP_valorTxt_(col, v) {
  if (Lic_s_(v) === '') return 'vazio';
  if (['PRECO_REFERENCIA', 'CUSTO_REFERENCIA', 'CUSTO_PARCEIRO'].indexOf(col) >= 0) { var n = LicP_n_(v); return n === null ? Lic_s_(v) : LicP_moeda_(n); }
  if (col === 'PRECO_SITUACAO') return LICP_SITUACOES_PRECO[Lic_up_(v)] || Lic_s_(v);
  if (col === 'EXECUCAO') return LICP_EXECUCOES[Lic_up_(v)] || Lic_s_(v);
  if (col === 'CUSTO_ORIGEM') return Lic_up_(v) === 'DIRETORIA' ? 'informado pela Diretoria' : 'do catálogo';
  if (col === 'VIGENCIA_DESDE' || col === 'VIGENCIA_ATE') return LicP_dia_(v);
  if (col === 'ATIVO') return Lic_up_(v) === 'NAO' ? 'Não' : 'Sim';
  return '"' + Lic_texto_(v, 200) + '"';
}
/** Fotografia da linha (o que a versão guarda). */
function LicP_foto_(r) { var o = {}; LICP_COLUNAS.LIC_PRECOS.forEach(function (k) { if (k !== 'HASH') o[k] = r[k] === undefined ? '' : r[k]; }); return o; }
function LicP_gravarVersao_(r, mudou, motivo, eu) {
  var foto = LicP_foto_(r), agora = Lic_agora_();
  var reg = { PRECO_ID: Lic_s_(r.ID), CODIGO: Lic_s_(r.CODIGO), VERSAO: Number(r.VERSAO) || 1, DADOS_JSON: JSON.stringify(foto), MUDOU: Lic_texto_(mudou, 4000), MOTIVO: Lic_texto_(motivo, 500), POR_ID: Lic_s_(eu && eu.id), POR_NOME: Lic_s_(eu && eu.nome), EM: agora };
  reg.HASH = Lic_hash_([reg.PRECO_ID, reg.VERSAO, reg.DADOS_JSON, reg.MOTIVO, reg.POR_ID, reg.EM].join('|'));
  SGO_DATA.insert(LICP_ABAS.VERSOES, reg);
  return reg.HASH;
}
function LicP_itemVersoes_(eu, d) {
  var r = SGO_DATA.getById(LICP_ABAS.PRECOS, Lic_s_(d.id));
  if (!r) throw new Error('Não foi possível abrir: o item não está na tabela de preços (atualize a tela)');
  var vs = Lic_ler_(LICP_ABAS.VERSOES).filter(function (v) { return Lic_s_(v.PRECO_ID) === Lic_s_(r.ID); }).sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); })
    .map(function (v) { var f = Lic_json_(v.DADOS_JSON, {}); return { versao: Number(v.VERSAO) || 0, mudou: Lic_s_(v.MUDOU), motivo: Lic_s_(v.MOTIVO), por: Lic_s_(v.POR_NOME), em: Lic_s_(v.EM), preco: LicP_n_(f.PRECO_REFERENCIA), situacao: Lic_s_(f.PRECO_SITUACAO), custoOrigem: Lic_s_(f.CUSTO_ORIGEM), custo: LicP_n_(f.CUSTO_REFERENCIA), execucao: Lic_s_(f.EXECUCAO), hash: Lic_s_(v.HASH),
      integra: Lic_hash_([Lic_s_(v.PRECO_ID), Number(v.VERSAO) || 1, Lic_s_(v.DADOS_JSON), Lic_s_(v.MOTIVO), Lic_s_(v.POR_ID), Lic_s_(v.EM)].join('|')) === Lic_s_(v.HASH) }; });
  return { item: LicP_tabela_(eu).itens.filter(function (i) { return i.id === Lic_s_(r.ID); })[0] || null, versoes: vs };
}
/**
 * Mudar um item da tabela: só os campos enviados (merge), versão + 1, motivo obrigatório, fotografia em LIC_PRECOS_VERSOES e cada
 * campo no histórico (de → para). campos: { precoReferencia, precoSituacao, custo (número; "CATALOGO" volta ao catálogo), custoParceiro,
 * execucao, obs, vigenciaDesde, vigenciaAte, ativo }.
 */
function LicP_itemSalvar_(eu, d) {
  var motivo = Lic_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Escreva o motivo da mudança (pelo menos 10 letras): ele fica no histórico do item com o seu nome e a data. Nada foi alterado');
  var c = d.campos || {};
  return Lic_comTrava_(function () {
    var r = SGO_DATA.getById(LICP_ABAS.PRECOS, Lic_s_(d.id));
    if (!r) throw new Error('Não foi possível salvar: o item não está na tabela de preços (atualize a tela). Nada foi alterado');
    var mud = {}, rot = {};
    var trocar = function (col, v, nome) { if (Lic_s_(r[col]) !== Lic_s_(v)) { mud[col] = v; rot[col] = nome; } };
    var valor = function (v, nome) {
      if (Lic_s_(v) === '') return '';
      var n = LicP_n_(v);
      if (n === null || n < 0 || n > 10000000) throw new Error('Escreva ' + nome + ' em reais (por exemplo 75,50). Nada foi alterado');
      return LicP_r2_(n);
    };
    if (c.precoReferencia !== undefined) trocar('PRECO_REFERENCIA', valor(c.precoReferencia, 'o preço de referência'), 'Preço de referência');
    if (c.precoSituacao !== undefined) {
      var s = Lic_up_(c.precoSituacao);
      if (!LICP_SITUACOES_PRECO[s]) throw new Error('Escolha a situação do preço na lista (Confirmado ou A confirmar pela Diretoria). Nada foi alterado');
      trocar('PRECO_SITUACAO', s, 'Situação do preço');
    }
    var precoFinal = mud.PRECO_REFERENCIA !== undefined ? mud.PRECO_REFERENCIA : r.PRECO_REFERENCIA, sitFinal = mud.PRECO_SITUACAO || Lic_up_(r.PRECO_SITUACAO) || 'CONFIRMADO';
    if (sitFinal === 'CONFIRMADO' && !(LicP_n_(precoFinal) > 0)) throw new Error('Para marcar o preço como confirmado, escreva o preço de referência. Nada foi alterado');
    if (c.custo !== undefined) {
      if (Lic_up_(c.custo) === 'CATALOGO') trocar('CUSTO_ORIGEM', 'CATALOGO', 'Origem do custo');
      else {
        var cv = valor(c.custo, 'o custo de referência');
        if (cv === '' || !(cv > 0)) throw new Error('Escreva o custo de referência por equipamento (maior que zero) ou escolha "usar o custo do catálogo". Nada foi alterado');
        trocar('CUSTO_REFERENCIA', cv, 'Custo de referência'); trocar('CUSTO_ORIGEM', 'DIRETORIA', 'Origem do custo');
        if (mud.CUSTO_REFERENCIA !== undefined || mud.CUSTO_ORIGEM !== undefined) mud.CUSTO_MOTIVO = motivo;
      }
    }
    if (c.custoParceiro !== undefined) trocar('CUSTO_PARCEIRO', valor(c.custoParceiro, 'o custo do parceiro'), 'Custo do parceiro');
    if (c.execucao !== undefined) { var ex = Lic_up_(c.execucao); if (!LICP_EXECUCOES[ex]) throw new Error('Escolha a execução na lista (Equipe própria ou Parceiro). Nada foi alterado'); trocar('EXECUCAO', ex, 'Execução'); }
    if (c.obs !== undefined) trocar('OBS', Lic_texto_(c.obs, 2000), 'Observações');
    ['vigenciaDesde', 'vigenciaAte'].forEach(function (k) {
      if (c[k] === undefined) return;
      var v = Lic_s_(c[k]).slice(0, 10);
      if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('Escolha a data da vigência no calendário. Nada foi alterado');
      if (k === 'vigenciaDesde' && !v) throw new Error('A vigência precisa da data de início. Nada foi alterado');
      trocar(k === 'vigenciaDesde' ? 'VIGENCIA_DESDE' : 'VIGENCIA_ATE', v, k === 'vigenciaDesde' ? 'Vigência desde' : 'Vigência até');
    });
    var de = mud.VIGENCIA_DESDE !== undefined ? mud.VIGENCIA_DESDE : Lic_s_(r.VIGENCIA_DESDE), ate = mud.VIGENCIA_ATE !== undefined ? mud.VIGENCIA_ATE : Lic_s_(r.VIGENCIA_ATE);
    if (ate && de && ate < de) throw new Error('A vigência termina antes de começar: confira as datas. Nada foi alterado');
    if (c.ativo !== undefined) trocar('ATIVO', c.ativo === true || Lic_up_(c.ativo) === 'SIM' ? 'SIM' : 'NAO', 'Ativo');
    var cols = Object.keys(rot);
    if (!cols.length) return { semMudanca: true, texto: 'Nada mudou: os valores enviados são iguais aos atuais. Nenhuma versão nova foi criada.' };
    var versao = (Number(r.VERSAO) || 1) + 1, agora = Lic_agora_();
    var antes = {};
    cols.forEach(function (k) { antes[k] = LicP_valorTxt_(k, r[k]); });
    var txt = cols.map(function (k) { return rot[k] + ': ' + antes[k] + ' → ' + LicP_valorTxt_(k, mud[k]); }).join('; ');
    Object.assign(mud, { VERSAO: versao, MOTIVO: motivo, ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
    Object.keys(mud).forEach(function (k) { r[k] = mud[k]; });
    mud.HASH = LicP_gravarVersao_(r, txt, motivo, eu);
    SGO_DATA.update(LICP_ABAS.PRECOS, r.ID, mud);
    cols.forEach(function (k) { Lic_historico_('PRECO', r.ID, r.CODIGO, 'PRECO_ITEM', eu, { de: antes[k], para: LicP_valorTxt_(k, mud[k]), texto: rot[k] + '. Motivo: ' + motivo, versao: versao, fonte: 'Tela Preços de licitação' }); });
    return { versao: versao, mudou: cols.map(function (k) { return rot[k]; }), texto: 'Item ' + r.CODIGO + ' gravado na versão ' + versao + ' (' + txt + '). As simulações já salvas guardam a versão que usaram.' };
  });
}

// ------------------------------------------------------------ importação do catálogo (prévia antes de aplicar)
function LicP_aConfirmarIds_() {
  var m = {};
  try { if (typeof ComCat_produtosExtrasComPreco_ === 'function') ComCat_produtosExtrasComPreco_().forEach(function (x) { m[Lic_s_(x.p.ID)] = Lic_s_(x.ex.precoAConfirmar) || 'preço a confirmar pela Diretoria'; }); } catch (e) {}
  return m;
}
function LicP_importarPrevia_(eu) {
  if (typeof COM_ABAS === 'undefined') throw new Error('Não foi possível ver a prévia: o catálogo do Comercial não está disponível neste ambiente');
  var lp = LicP_politica_(), pc = LicP_temComercial_() ? LicP_polConta_(lp) : null, ja = LicP_porCodigo_(), conf = LicP_aConfirmarIds_(), linhas = [], fora = 0, vistos = {}, duplicados = [];
  // revisão de ca99fe5: o mesmo código ativo duas vezes no catálogo entra uma vez só (vale o oficial; senão o primeiro)
  var prods = Lic_ler_(COM_ABAS.PRODUTOS).filter(function (p) { return Lic_up_(p.ATIVO || 'SIM') !== 'NAO' && Lic_s_(p.CODIGO); });
  prods = prods.filter(function (p) { return Lic_s_(p.CATALOGO_OFICIAL) !== ''; }).concat(prods.filter(function (p) { return Lic_s_(p.CATALOGO_OFICIAL) === ''; }));
  prods.forEach(function (p) {
    if (vistos[Lic_up_(p.CODIGO)]) { duplicados.push(Lic_up_(p.CODIGO)); return; }
    vistos[Lic_up_(p.CODIGO)] = true;
    var tipo = Lic_up_(p.TIPO) || 'SERVICO';
    if (tipo !== 'SERVICO') { fora++; return; }
    var cod = Lic_up_(p.CODIGO), custo = pc ? LicP_custoCatalogo_(p, pc) : { valor: LicP_n_(p.CUSTO), fonte: 'custo cadastrado' };
    var def = null;
    try { if (typeof ComCat_temRegra_ === 'function' && ComCat_temRegra_(p)) def = ComCat_def_(p); } catch (e) { def = null; }
    var aConf = conf[Lic_s_(p.ID)] || '';
    linhas.push({ codigo: cod, produtoId: Lic_s_(p.ID), nome: Lic_s_(p.NOME), categoria: Lic_s_(p.CATEGORIA), preco: LicP_n_(p.PRECO), custo: custo.valor, custoFonte: custo.fonte,
      situacao: aConf ? 'A_CONFIRMAR' : 'CONFIRMADO', aConfirmar: aConf, execucao: LicP_execucaoSugerida_(p.NOME, p.CATEGORIA), regra: def ? def.regra : '', minimo: def && def.regra === 'PONTOS' ? Number(def.minimo) || 3 : 0,
      oficial: Lic_s_(p.CATALOGO_OFICIAL) !== '', acao: ja[cod] ? 'JA_NA_TABELA' : 'NOVO' });
  });
  linhas.sort(function (a, b) { return (a.oficial === b.oficial ? 0 : a.oficial ? -1 : 1) || (a.codigo < b.codigo ? -1 : 1); });
  var marca = Lic_hash_(JSON.stringify(linhas.map(function (l) { return [l.codigo, l.preco, l.custo, l.situacao, l.acao]; }))).slice(0, 32);
  return { linhas: linhas, novos: linhas.filter(function (l) { return l.acao === 'NOVO'; }).length, jaNaTabela: linhas.filter(function (l) { return l.acao !== 'NOVO'; }).length, foraNaoServico: fora, duplicados: duplicados, marca: marca };
}
/** Aplicar: só os códigos NOVOS escolhidos entram (versão 1); o que já está na tabela fica como está (nunca sobrescreve). d: { marca, codigos, motivo } */
function LicP_importar_(eu, d) {
  var motivo = Lic_texto_(d.motivo, 500) || 'Ponto de partida: catálogo do Comercial';
  return Lic_comTrava_(function () {
    var prev = LicP_importarPrevia_(eu);
    if (Lic_s_(d.marca) !== prev.marca) throw new Error('Não foi possível importar: o catálogo ou a tabela mudou desde a prévia. Veja a prévia de novo e confira antes de aplicar. Nada foi gravado');
    var quero = Array.isArray(d.codigos) ? d.codigos.map(Lic_up_) : null, hoje = LicP_hoje_(), agora = Lic_agora_(), feitos = [];
    prev.linhas.forEach(function (l) {
      if (l.acao !== 'NOVO' || (quero && quero.indexOf(l.codigo) < 0)) return;
      var r = { CODIGO: l.codigo, NOME: l.nome, CATEGORIA: l.categoria, TIPO: 'SERVICO', UNIDADE: 'equip.', EXECUCAO: l.execucao, PRECO_REFERENCIA: l.preco === null ? '' : l.preco,
        PRECO_SITUACAO: l.situacao, CUSTO_REFERENCIA: l.custo === null ? '' : l.custo, CUSTO_ORIGEM: 'CATALOGO', CUSTO_MOTIVO: '', CUSTO_PARCEIRO: '', REGRA_PRECO: l.regra, PONTOS_MINIMO: l.minimo || '',
        PRODUTO_ID: l.produtoId, OBS: l.aConfirmar ? 'Preço do catálogo ' + l.aConfirmar + '.' : '', VIGENCIA_DESDE: hoje, VIGENCIA_ATE: '', ATIVO: 'SIM', VERSAO: 1, MOTIVO: motivo,
        ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora, CRIADO_EM: agora };
      var ins = SGO_DATA.insert(LICP_ABAS.PRECOS, r);
      r.ID = ins && ins.ID ? ins.ID : r.ID;
      var h = LicP_gravarVersao_(r, 'Importado do catálogo do Comercial (preço ' + (l.preco === null ? 'sem preço' : LicP_moeda_(l.preco)) + ', custo ' + (l.custo === null ? 'sem custo' : LicP_moeda_(l.custo)) + ')', motivo, eu);
      SGO_DATA.update(LICP_ABAS.PRECOS, r.ID, { HASH: h });
      feitos.push(l.codigo);
    });
    if (feitos.length) Lic_historico_('PRECO', 'TABELA', '', 'IMPORTACAO_CATALOGO', eu, { para: feitos.length + ' item(ns)', texto: 'Importados do catálogo do Comercial: ' + feitos.join(', ').slice(0, 3000) + '. O que já estava na tabela ficou como estava. Motivo: ' + motivo, versao: 1, fonte: 'Tela Preços de licitação' });
    return { importados: feitos.length, codigos: feitos, texto: feitos.length ? feitos.length + ' item(ns) entraram na tabela (versão 1). Confira os preços "a confirmar" e o custo dos itens por parceiro.' : 'Nenhum item novo para importar: os escolhidos já estão na tabela.' };
  });
}

// ------------------------------------------------------------ distância
/** Km do trecho (só a ida) a partir da base: mesma cidade = 0; Goiânia pela tabela de distâncias da Conduta; senão null. */
function LicP_distancia_(uf, mun, base) {
  var u = Lic_up_(uf), m = LicP_norm_(mun);
  if (base === 'GO' && u === 'GO' && m === 'goiania') return { km: 0, fonte: 'mesma cidade da base de Goiânia' };
  if (base === 'RJ' && u === 'RJ' && m === 'rio de janeiro') return { km: 0, fonte: 'mesma cidade da base do Rio de Janeiro' };
  if (base !== 'GO' || !m || typeof ComPr_referencias_ !== 'function') return null;
  var alvo = LicP_norm_(mun + '/' + u), ref = ComPr_referencias_().filter(function (r) { return LicP_norm_(r.destino) === alvo; })[0];
  return ref ? { km: ref.km, fonte: 'tabela de distâncias do Programa de conduta (a partir de Goiânia): ' + ref.destino } : null;
}

// ------------------------------------------------------------ simulador
/** Rascunho: a última versão salva (para continuar) ou os itens do edital (PNCP/Compras.gov.br). */
function LicP_rascunho_(l, fonte) {
  var lp = LicP_politica_(), base = LicP_baseDaUf_(l.UF, lp), dist = LicP_distancia_(l.UF, l.MUNICIPIO, base);
  var todos = (fonte && fonte.itens) || [];
  var itens = todos.slice(0, LICP_MAX_ITENS).map(function (i) {
    return { numero: Lic_s_(i.numeroItem), descricao: Lic_texto_(i.descricao, 300), codigo: '', quantidade: i.quantidade === null || i.quantidade === undefined ? '' : i.quantidade, pontos: '',
      precoEdital: i.sigiloso || i.valorUnitario === null || i.valorUnitario === undefined ? '' : i.valorUnitario, precoProposta: '', custoParceiro: '', origem: 'PNCP' };
  });
  if (!itens.length) itens.push({ numero: '1', descricao: '', codigo: '', quantidade: 1, pontos: '', precoEdital: '', precoProposta: '', custoParceiro: '', origem: 'DIGITADO' });
  return { cortados: Math.max(0, todos.length - LICP_MAX_ITENS), itens: itens, execucao: { uf: Lic_up_(l.UF), municipio: Lic_s_(l.MUNICIPIO), kmTrecho: dist ? dist.km : '', kmFonte: dist ? 'SUGERIDO' : '', viagens: 1, tecnicos: 1, engenheiros: 0, dias: 1, noites: 0,
    transporte: 'VEICULO_EMPRESA', passagem: '', pedagio: '', outros: '', outrosDescricao: '' }, seguro: { exige: false, custo: '', obs: '' } };
}
function LicP_int_(v, padrao, min, max, rotulo) {
  if (Lic_s_(v) === '') return padrao;
  var n = LicP_n_(v);
  if (n === null || Math.round(n) !== n || n < min || n > max) throw new Error('Escreva ' + rotulo + ' como número inteiro de ' + min + ' a ' + max + ' (veio "' + Lic_texto_(v, 20) + '"). Nada foi gravado');
  return n;
}
function LicP_valorOuNull_(v, rotulo) {
  if (Lic_s_(v) === '') return null;
  var n = LicP_n_(v);
  if (n === null || n < 0 || n > 100000000) throw new Error('Escreva ' + rotulo + ' em reais (por exemplo 1.250,00); veio "' + Lic_texto_(v, 20) + '". Nada foi gravado');
  return LicP_r2_(n);
}

/**
 * A conta inteira. l: a oportunidade; e: a entrada da tela (itens, execucao, seguro). Não grava nada. Lança só erro de digitação
 * (o que a tela deve mostrar); o que falta para a conta ficar completa vira PENDÊNCIA, com o que fazer.
 */
function LicP_calcular_(l, e) {
  if (!LicP_temComercial_()) throw new Error('Não foi possível calcular: ' + LICP_MSG_SEM_COMERCIAL + '. Nada foi alterado');
  e = e || {};
  var lp = LicP_politica_(), pc = LicP_polConta_(lp), tabela = LicP_porCodigo_(), prods = LicP_produtos_(), hoje = LicP_hoje_();
  var pend = [], avisos = [];
  // ---- execução e deslocamento (funções do Comercial)
  var x = e.execucao || {}, uf = Lic_up_(x.uf || l.UF), mun = Lic_texto_(x.municipio !== undefined ? x.municipio : l.MUNICIPIO, 120);
  if (uf && LIC_UFS.indexOf(uf) < 0) throw new Error('Escolha a UF de execução na lista. Nada foi gravado');
  var base = LicP_baseDaUf_(uf, lp), polBase = ComPr_polUnidade_(pc.com, base);
  var km = LicP_n_(x.kmTrecho), kmFonte = '';
  if (km !== null && (km < 0 || km > 5000)) throw new Error('Escreva o km do trecho (só a ida) de 0 a 5.000. Nada foi gravado');
  if (km !== null) kmFonte = Lic_up_(x.kmFonte) === 'SUGERIDO' ? 'sugerido pelo SGO+ e mantido' : 'informado na simulação';
  else { var dist = LicP_distancia_(uf, mun, base); if (dist) { km = dist.km; kmFonte = dist.fonte; } }
  // revisão de ca99fe5: a viagem é da equipe própria; lote só de parceiro não tem viagem da equipe (o parceiro põe a dele no custo)
  var temPropria = (Array.isArray(e.itens) ? e.itens : []).some(function (it) { var t0 = tabela[Lic_up_(it.codigo)]; return !t0 || Lic_up_(t0.EXECUCAO) !== 'PARCEIRO'; });
  if (!temPropria) avisos.push('O lote só tem itens por parceiro: sem viagem da equipe própria (o deslocamento do parceiro entra no custo dele).');
  if (km === null && temPropria) pend.push({ codigo: 'KM', texto: 'Informe o km do trecho (só a ida) de ' + (polBase.origemUnidade || (base === 'RJ' ? 'Rio de Janeiro/RJ' : 'Goiânia/GO')) + ' até ' + (mun ? mun + '/' : '') + (uf || 'o local de execução') + ': o SGO+ não tem essa distância. Sem o km, o deslocamento fica sem o custo do km.' });
  var T = LicP_int_(x.tecnicos, 1, 0, 20, 'o número de técnicos'), E = LicP_int_(x.engenheiros, 0, 0, 20, 'o número de engenheiros');
  var vg = LicP_int_(x.viagens, 1, 1, 365, 'o número de viagens'), dias = LicP_int_(x.dias, 1, 1, 365, 'os dias por viagem'), noites = LicP_int_(x.noites, 0, 0, 365, 'as noites por viagem');
  if (temPropria && !(T + E)) pend.push({ codigo: 'EQUIPE', texto: 'Informe quantos técnicos e engenheiros vão (pelo menos 1): o Incentivo de Missão, a alimentação e a hospedagem são por pessoa.' });
  var tr = Lic_up_(x.transporte) || 'VEICULO_EMPRESA';
  if (typeof COM_PR_TRANSPORTES !== 'undefined' && !COM_PR_TRANSPORTES[tr]) throw new Error('Escolha o transporte na lista. Nada foi gravado');
  var pedagio = LicP_valorOuNull_(x.pedagio, 'o pedágio por viagem'), passagem = LicP_valorOuNull_(x.passagem, 'a passagem ou combustível por viagem'), outros = LicP_valorOuNull_(x.outros, 'os outros custos da viagem');
  if (temPropria && km !== null && km > 0 && pedagio === null) pend.push({ codigo: 'PEDAGIO', texto: 'Informe o pedágio por viagem (ida e volta), ou 0 se a rota não tem pedágio.' });
  if (temPropria && tr !== 'VEICULO_EMPRESA' && passagem === null) pend.push({ codigo: 'PASSAGEM', texto: 'Com transporte que não é o veículo da empresa, informe a passagem ou o combustível por viagem.' });
  var linhasViagem = { PEDAGIO: { valor: pedagio === null ? '' : pedagio }, COMBUSTIVEL: { valor: passagem === null ? '' : passagem }, OUTROS: { valor: outros === null ? '' : outros, descricao: Lic_texto_(x.outrosDescricao, 200) } };
  var desl = ComPr_normalizar_({ unidade: base, viagem: { ha: true, tecnicos: T, engenheiros: E, transporte: tr, origem: polBase.origemUnidade, destino: (mun ? mun + '/' : '') + uf, kmTrecho: km === null ? '' : km, kmFonte: 'DIGITADO',
    viagens: vg, dias: dias, noites: noites, linhas: linhasViagem } }, null, pc.com, {});
  var cv = temPropria ? ComPr_calcularViagem_(desl, polBase) : { pessoas: 0, custo: 0, beneficio: 0, linhas: [] };
  var viagem = { base: base, baseNome: base === 'RJ' ? 'Equipe do Rio de Janeiro' : 'Equipe de Goiânia', origem: Lic_s_(polBase.origemUnidade), destino: (mun ? mun + '/' : '') + uf, km: km, kmFonte: kmFonte,
    pessoas: cv.pessoas, viagens: vg, dias: dias, noites: noites, custo: LicP_r2_(cv.custo), incentivo: LicP_r2_(cv.beneficio),
    linhas: cv.linhas.map(function (L) { return { nome: L.nome, quantidade: L.quantidadeTxt, valor: L.valorTxt, total: L.total, nsa: L.nsa, motivo: L.nsa ? Lic_texto_(L.motivo, 200) : '' }; }) };
  // ---- seguro-garantia
  var sg = e.seguro || {}, exige = sg.exige === true || Lic_up_(sg.exige) === 'SIM', sgCusto = LicP_valorOuNull_(sg.custo, 'o custo do seguro-garantia');
  if (exige && sgCusto === null) pend.push({ codigo: 'SEGURO', texto: 'O edital exige seguro-garantia: informe o custo cotado com a corretora (entra no preço). Sem o custo, o piso fica incompleto.' });
  var seguro = { exige: exige, custo: exige ? sgCusto || 0 : 0, obs: Lic_texto_(sg.obs, 300) };
  // ---- itens
  var entrada = Array.isArray(e.itens) ? e.itens : [];
  if (!entrada.length) pend.push({ codigo: 'ITENS', texto: 'Inclua pelo menos um item do edital.' });
  if (entrada.length > LICP_MAX_ITENS) throw new Error('A simulação aceita até ' + LICP_MAX_ITENS + ' itens. Separe o edital em lotes. Nada foi gravado');
  var itens = entrada.map(function (it, i) {
    var r = { n: i + 1, numero: Lic_texto_(it.numero, 20), descricao: Lic_texto_(it.descricao, 120), codigo: Lic_up_(it.codigo), pendencias: [], semPiso: false };
    var q = LicP_n_(it.quantidade);
    if (q === null || !(q > 0) || q > 1000000) { r.pendencias.push('informe a quantidade (maior que zero)'); q = 0; }
    r.quantidade = q;
    r.precoEdital = LicP_valorOuNull_(it.precoEdital, 'o preço do edital do item ' + (r.numero || r.n));
    r.precoProposta = LicP_valorOuNull_(it.precoProposta, 'o preço da proposta do item ' + (r.numero || r.n));
    var t = r.codigo ? tabela[r.codigo] : null;
    if (!r.codigo) r.pendencias.push('escolha o serviço da tabela de preços de licitação');
    else if (!t) r.pendencias.push('o código ' + r.codigo + ' não está na tabela de preços de licitação (Preços de licitação > Importar do catálogo)');
    else if (Lic_up_(t.ATIVO || 'SIM') === 'NAO') r.pendencias.push(r.codigo + ' está inativo na tabela de preços de licitação');
    if (!t) { r.semPiso = true; r.custoUnitBase = null; return r; }
    r.nome = Lic_s_(t.NOME); r.tipo = Lic_up_(t.TIPO) || 'SERVICO'; r.execucao = Lic_up_(t.EXECUCAO) || 'PROPRIA'; r.precoId = Lic_s_(t.ID); r.precoVersao = Number(t.VERSAO) || 1;
    var vig = LicP_vigente_(t, hoje); if (vig) r.pendencias.push(r.codigo + ': ' + vig + ' (Preços de licitação)');
    // REG-CAL-001: pontos (mínimo incluído); o custo acompanha o mesmo fator
    var min = Lic_up_(t.REGRA_PRECO) === 'PONTOS' ? Number(t.PONTOS_MINIMO) || 3 : 0, cob = 0;
    if (min) {
      var np = LicP_int_(it.pontos, min, 1, 200, 'os pontos do item ' + (r.numero || r.n));
      cob = Math.max(min, np); r.pontos = np; r.cobrados = cob; r.minimo = min;
    }
    r.fator = min ? cob / min : 1;
    r.precoRefSituacao = Lic_up_(t.PRECO_SITUACAO) || 'CONFIRMADO';
    var ref = LicP_n_(t.PRECO_REFERENCIA);
    if (ref !== null && ref > 0) {
      var baseC = Math.round(ref * 100);
      if (min && typeof ComCatN_metade === 'function') { r.precoRefUnit = ComCatN_metade(baseC * cob, min) / 100; r.precoRefTotal = Math.round(q) === q ? ComCatN_metade(baseC * cob * q, min) / 100 : LicP_r2_(r.precoRefUnit * q); }
      else { r.precoRefUnit = LicP_r2_(ref * r.fator); r.precoRefTotal = LicP_r2_(r.precoRefUnit * q); }
    } else { r.precoRefUnit = null; r.precoRefTotal = null; }
    if (r.precoRefSituacao === 'A_CONFIRMAR') { r.semPiso = true; r.pendencias.push('preço de ' + r.codigo + ' a confirmar pela Diretoria: sem preço confirmado, o simulador não calcula o piso deste item (Preços de licitação > Editar)'); }
    var cu = LicP_custoDoItem_(t, pc, prods, it.custoParceiro);
    r.custoFonte = cu.fonte; r.custoOrigem = cu.origem; r.custoParceiroInformado = LicP_n_(it.custoParceiro);
    if (cu.valor === null || !(cu.valor > 0)) {
      r.semPiso = true; r.custoUnitBase = null;
      r.pendencias.push(r.execucao === 'PARCEIRO' ? 'informe o custo do parceiro por equipamento (aqui ou em Preços de licitação)' : 'o item não tem custo de referência: informe em Preços de licitação > Editar');
    } else r.custoUnitBase = LicP_r2_(cu.valor * r.fator);
    return r;
  });
  // ---- rateio do deslocamento e do seguro (em centavos; o resto vai ao último item com custo)
  var comCusto = itens.filter(function (r) { return r.custoUnitBase !== null && r.custoUnitBase > 0 && r.quantidade > 0; });
  var propria = comCusto.filter(function (r) { return r.execucao !== 'PARCEIRO'; });
  itens.forEach(function (r) { r.custoDireto = r.custoUnitBase !== null && r.quantidade > 0 ? LicP_r2_(r.custoUnitBase * r.quantidade) : 0; r.rateioDeslocamento = 0; r.rateioSeguro = 0; });
  var soma = function (l) { return l.reduce(function (s, r) { return s + r.custoDireto; }, 0); };
  var linhaExtra = null, sobraExtra = 0;
  // rateio em centavos, proporcional ao custo direto; o resto vai ao último item da lista
  var ratear = function (valor, campo, lista) {
    var cent = Math.round(valor * 100), usado = 0, tot0 = soma(lista);
    lista.forEach(function (r, k) { var c = k === lista.length - 1 ? cent - usado : Math.floor(cent * r.custoDireto / tot0); usado += c; r[campo] = c / 100; });
  };
  var naoDiluido = 0;
  if (lp.diluir) {
    // a viagem só entre os itens da equipe própria; o seguro entre todos os itens com custo
    if (viagem.custo > 0) { if (propria.length) ratear(viagem.custo, 'rateioDeslocamento', propria); else naoDiluido += viagem.custo; }
    if (seguro.custo > 0) { if (comCusto.length) ratear(seguro.custo, 'rateioSeguro', comCusto); else naoDiluido += seguro.custo; }
    if (naoDiluido > 0) pend.push({ codigo: 'RATEIO', texto: 'Nenhum item ' + (viagem.custo > 0 && !propria.length ? 'da equipe própria ' : '') + 'tem custo: o deslocamento e o seguro não têm onde ser diluídos. Informe o custo dos itens.' });
  } else naoDiluido = viagem.custo + seguro.custo;
  if (naoDiluido > 0) {
    var cx = LicP_r2_(naoDiluido);
    linhaExtra = { nome: 'Despesas de deslocamento e estadia' + (seguro.custo ? ' e seguro-garantia' : ''), custo: cx, piso: LicP_precoQueGarante_(cx, 'SERVICO', pc, lp.margemMinPct), alvo: LicP_precoQueGarante_(cx, 'SERVICO', pc, lp.margemAlvoPct) };
    // revisão de ca99fe5 (grave): na linha própria, o edital e a proposta digitada não pagam a viagem: a sobra do lote desconta o custo dela
    sobraExtra = cx;
    if (linhaExtra.piso === null) pend.push({ codigo: 'LINHA', texto: 'A conta do piso da linha de deslocamento não fecha com os impostos e a sobra da política.' });
  }
  // ---- piso, alvo e margens por item
  var tot = { custoDireto: 0, deslocamento: viagem.custo, seguro: seguro.custo, custo: 0, piso: 0, alvo: 0, pisoCompleto: true, edital: 0, editalSobra: 0, editalItens: 0, proposta: 0, propostaSobra: 0, propostaItens: 0, referencia: 0, abaixoEdital: 0, abaixoProposta: 0, semPiso: 0 };
  itens.forEach(function (r) {
    r.custoTotal = LicP_r2_(r.custoDireto + r.rateioDeslocamento + r.rateioSeguro);
    r.custoUnitTotal = r.quantidade > 0 && r.custoUnitBase !== null ? Math.round(r.custoTotal / r.quantidade * 10000) / 10000 : null;
    r.impostosPct = r.tipo === 'PRODUTO' ? pc.impP : pc.imp; r.comissaoPct = pc.comissao;
    r.pisoUnit = null; r.alvoUnit = null; r.pisoTotal = null; r.alvoTotal = null;
    if (!r.semPiso && r.custoUnitTotal > 0) {
      r.pisoUnit = LicP_precoQueGarante_(r.custoUnitTotal, r.tipo, pc, lp.margemMinPct);
      r.alvoUnit = LicP_precoQueGarante_(r.custoUnitTotal, r.tipo, pc, lp.margemAlvoPct);
      if (r.pisoUnit === null) { r.semPiso = true; r.pendencias.push('a conta do piso não fecha com os impostos e a sobra da política'); }
      else { r.pisoTotal = LicP_r2_(r.pisoUnit * r.quantidade); r.alvoTotal = r.alvoUnit === null ? null : LicP_r2_(r.alvoUnit * r.quantidade); }
    }
    if (r.pisoUnit === null) { tot.pisoCompleto = false; tot.semPiso++; } else { tot.piso += r.pisoTotal; tot.alvo += r.alvoTotal || 0; }
    tot.custoDireto += r.custoDireto; tot.custo += r.custoTotal;
    if (r.precoRefTotal) tot.referencia += r.precoRefTotal;
    var marg = function (preco, chave) {
      if (preco === null || !(r.custoUnitTotal > 0)) return;
      var s = LicP_sobra_(preco, r.custoUnitTotal, r.tipo, pc); if (!s) return;
      r['margem' + chave + 'Pct'] = s.pct; r['sobra' + chave] = LicP_r2_(s.sobra * r.quantidade);
      r['abaixoPiso' + chave] = r.pisoUnit !== null ? preco < r.pisoUnit - 0.004 : s.pct < lp.margemMinPct - 1e-9;
      var k = chave === 'Edital' ? 'edital' : 'proposta';
      tot[k] += LicP_r2_(preco * r.quantidade); tot[k + 'Sobra'] += s.sobra * r.quantidade; tot[k + 'Itens']++;
      if (r['abaixoPiso' + chave]) tot[chave === 'Edital' ? 'abaixoEdital' : 'abaixoProposta']++;
    };
    marg(r.precoEdital, 'Edital'); marg(r.precoProposta, 'Proposta');
    if (r.semPiso && r.precoRefSituacao !== 'A_CONFIRMAR' && !r.pendencias.length) r.pendencias.push('sem piso');
    r.pendencias.forEach(function (p) { pend.push({ codigo: 'ITEM', item: r.numero || String(r.n), texto: 'Item ' + (r.numero || r.n) + ': ' + p + '.' }); });
  });
  if (linhaExtra) {
    tot.custo += linhaExtra.custo;
    if (linhaExtra.piso !== null) { tot.piso += linhaExtra.piso; tot.alvo += linhaExtra.alvo || 0; } else tot.pisoCompleto = false;
    // a viagem e o seguro da linha própria saem da sobra do lote (o preço digitado por item não os paga)
    if (tot.editalItens) tot.editalSobra -= sobraExtra;
    if (tot.propostaItens) tot.propostaSobra -= sobraExtra;
    tot.linhaPropriaCusto = sobraExtra;
    avisos.push('Deslocamento e seguro numa linha própria (' + LicP_moeda_(sobraExtra) + ' de custo): a sobra do lote no edital e na proposta já desconta esse custo. Para cobrir, a proposta precisa da linha com o preço de ' + (linhaExtra.piso === null ? '(sem piso)' : LicP_moeda_(linhaExtra.piso)) + ' ou mais.');
  }
  // revisão de ca99fe5: item com piso e sem preço do edital (a nota não calcula a sobra só com parte dos itens)
  tot.semEdital = itens.filter(function (r) { return r.pisoUnit !== null && r.precoEdital === null; }).length;
  ['custoDireto', 'custo', 'piso', 'alvo', 'edital', 'editalSobra', 'proposta', 'propostaSobra', 'referencia'].forEach(function (k) { tot[k] = LicP_r2_(tot[k]); });
  tot.margemEditalPct = tot.edital > 0 ? Math.round(tot.editalSobra / tot.edital * 10000) / 100 : null;
  tot.margemPropostaPct = tot.proposta > 0 ? Math.round(tot.propostaSobra / tot.proposta * 10000) / 100 : null;
  tot.itens = itens.length;
  if (!lp.pisoPorItem && tot.abaixoProposta) avisos.push('Há item da proposta abaixo do piso; a política confere o piso no lote (margem da proposta ' + LicP_pct_(tot.margemPropostaPct) + ').');
  if (tot.abaixoProposta && lp.pisoPorItem) avisos.push(tot.abaixoProposta + ' item(ns) da proposta abaixo do piso de ' + LicP_pct_(lp.margemMinPct, 0) + ': piso por item (nenhum item abaixo, mesmo que o lote feche). Suba o preço desses itens ou leve à Diretoria.');
  if (tot.abaixoEdital) avisos.push(tot.abaixoEdital + ' item(ns) com o preço de referência do edital abaixo do piso: participar nesses itens não deixa a sobra mínima.');
  var benef = typeof ComPr_beneficio_ === 'function' ? ComPr_beneficio_(polBase) : { valor: 300, kmMinimo: 200 };
  var bh = typeof ComPr_bonusHora_ === 'function' ? ComPr_bonusHora_(pc.com) : { porHora: 0 };
  var un = (pc.pol.unidades || {})[pc.pol.unidade] || {};
  var premissas = LicP_politicaTexto_(lp).concat([
    'Impostos de serviço: ' + LicP_pct_(pc.imp, 2) + ' (' + Lic_s_(pc.pol.unidadeNome) + ': PIS ' + LicP_pct_(un.pisPct || 0, 2) + ' + COFINS ' + LicP_pct_(un.cofinsPct || 0, 2) + ' + ISS ' + LicP_pct_(un.issPct || 0, 2) + '), política do Comercial versão ' + (pc.com.versao || 0) + '.',
    'Custo da hora: técnico ' + LicP_moeda_(pc.com.custoHora.TECNICO) + ', engenheiro ' + LicP_moeda_(pc.com.custoHora.ENGENHEIRO) + ', custo fixo de ' + LicP_pct_(pc.com.custoFixoPct || 0, 0) + ' e Bônus Coletivo diluído de ' + LicP_moeda_(bh.porHora || 0) + ' por hora (ficha de custo do catálogo).',
    'Km ' + LicP_moeda_(pc.com.valorKm) + ' ida e volta; Incentivo de Missão de ' + LicP_moeda_(benef.valor) + ' por executante por viagem com trecho de ' + LicP_qtd_(benef.kmMinimo) + ' km ou mais (Programa de conduta).',
    'Execução: ' + viagem.baseNome + ', saindo de ' + viagem.origem + '.'
  ]);
  return { regras: LICP_REGRAS, calculadoEm: Lic_agora_(), viagem: viagem, seguro: seguro, linhaExtra: linhaExtra, itens: itens, totais: tot, pendencias: pend, avisos: avisos, premissas: premissas,
    situacao: pend.length ? 'COM_PENDENCIA' : 'COMPLETA', valorEstimado: l.VALOR_ESTIMADO === '' || l.VALOR_ESTIMADO === null || l.VALOR_ESTIMADO === undefined ? null : Number(l.VALOR_ESTIMADO),
    politica: { licitacao: { versao: lp.versao, margemMinPct: lp.margemMinPct, margemAlvoPct: lp.margemAlvoPct, comissaoPct: lp.comissaoPct, pisoPorItem: lp.pisoPorItem, diluir: lp.diluir, ufsEquipeRio: lp.ufsEquipeRio, origem: lp.origem },
      comercial: { versao: pc.com.versao || 0, unidade: pc.pol.unidade, impostosServicoPct: pc.imp, impostosProdutoPct: pc.impP, creditoProdutoPct: pc.cred, custoHora: pc.com.custoHora, custoFixoPct: pc.com.custoFixoPct, bonusHora: bh.porHora || 0,
        valorKm: pc.com.valorKm, incentivo: benef.valor, incentivoKmMinimo: benef.kmMinimo } } };
}

function LicP_simulacoesDe_(oid) {
  return Lic_ler_(LICP_ABAS.SIMULACOES).filter(function (s) { return Lic_s_(s.OPORTUNIDADE_ID) === Lic_s_(oid); }).sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); });
}
function LicP_hashSim_(s) { return Lic_hash_([Lic_s_(s.OPORTUNIDADE_ID), Number(s.VERSAO) || 0, Lic_s_(s.MOTIVO), Lic_s_(s.ENTRADA_JSON), Lic_s_(s.RESULTADO_JSON), Lic_s_(s.POR_ID), Lic_s_(s.CRIADO_EM)].join('|')); }
function LicP_versaoResumo_(s) {
  return { versao: Number(s.VERSAO) || 0, motivo: Lic_s_(s.MOTIVO), situacao: Lic_s_(s.SITUACAO), por: Lic_s_(s.POR_NOME), em: Lic_s_(s.CRIADO_EM), piso: LicP_n_(s.TOTAL_PISO), alvo: LicP_n_(s.TOTAL_ALVO),
    edital: LicP_n_(s.TOTAL_EDITAL), proposta: LicP_n_(s.TOTAL_PROPOSTA), margemEditalPct: LicP_n_(s.MARGEM_EDITAL_PCT), margemPropostaPct: LicP_n_(s.MARGEM_PROPOSTA_PCT), abaixoProposta: Number(s.ITENS_ABAIXO_PISO_PROPOSTA) || 0, abaixoEdital: Number(s.ITENS_ABAIXO_PISO_EDITAL) || 0, hash: Lic_s_(s.HASH) };
}
function LicP_simulacaoCompleta_(s) {
  var v = LicP_versaoResumo_(s);
  v.entrada = Lic_json_(s.ENTRADA_JSON, {}); v.resultado = Lic_json_(s.RESULTADO_JSON, null); v.integra = LicP_hashSim_(s) === Lic_s_(s.HASH); v.politicaVersao = Number(s.POLITICA_VERSAO) || 0;
  return v;
}
function LicP_tabelaParaSelecao_() {
  return LicP_linhas_().filter(function (r) { return Lic_up_(r.ATIVO || 'SIM') !== 'NAO'; }).map(function (r) {
    return { codigo: Lic_s_(r.CODIGO), nome: Lic_s_(r.NOME), execucao: Lic_up_(r.EXECUCAO) || 'PROPRIA', regra: Lic_up_(r.REGRA_PRECO), minimo: Number(r.PONTOS_MINIMO) || 0, aConfirmar: Lic_up_(r.PRECO_SITUACAO) === 'A_CONFIRMAR', preco: LicP_n_(r.PRECO_REFERENCIA) };
  }).sort(function (a, b) { return a.codigo < b.codigo ? -1 : 1; });
}
/** Aba Preço: rascunho (última versão ou itens do edital), as versões salvas, a tabela para escolher e a política. */
function LicP_simulacao_(eu, d) {
  var l = Lic_acharOp_(d.id), sims = LicP_simulacoesDe_(l.ID), ultima = sims[0] ? LicP_simulacaoCompleta_(sims[0]) : null, fonte = null, aviso = '';
  if (!ultima) { try { var srv = Lic_lerFonteServidor_(l); fonte = srv.fonte; if (srv.aviso && !fonte) aviso = srv.aviso; } catch (e) { aviso = 'Não foi possível ler os itens do edital agora (' + Lic_s_(e && e.message) + '): digite os itens.'; } }
  var lp = LicP_politica_();
  return { oportunidade: { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), uf: Lic_s_(l.UF), municipio: Lic_s_(l.MUNICIPIO), valor: l.VALOR_ESTIMADO === '' || l.VALOR_ESTIMADO === undefined ? null : Number(l.VALOR_ESTIMADO) },
    rascunho: ultima ? ultima.entrada : LicP_rascunho_(l, fonte), limiteItens: LICP_MAX_ITENS, rascunhoDe: ultima ? 'VERSAO' : (fonte && (fonte.itens || []).length ? 'PNCP' : 'VAZIO'), aviso: aviso,
    ultima: ultima, versoes: sims.map(LicP_versaoResumo_), tabela: LicP_tabelaParaSelecao_(), politica: lp, politicaTexto: LicP_politicaTexto_(lp), comercialDisponivel: LicP_temComercial_(),
    msgSemComercial: LicP_temComercial_() ? '' : 'Neste ambiente ' + LICP_MSG_SEM_COMERCIAL + '. O simulador calcula no SGO+ completo.', ufsEquipeRio: lp.ufsEquipeRio };
}
function LicP_simulacaoCalcular_(eu, d) { var l = Lic_acharOp_(d.id); return { resultado: LicP_calcular_(l, d.entrada || {}) }; }
function LicP_entradaLimpa_(e) {
  e = e || {};
  var x = e.execucao || {}, s = e.seguro || {};
  return { itens: (Array.isArray(e.itens) ? e.itens : []).slice(0, LICP_MAX_ITENS + 1).map(function (i) { return { numero: Lic_texto_(i.numero, 20), descricao: Lic_texto_(i.descricao, 300), codigo: Lic_up_(i.codigo), quantidade: Lic_texto_(i.quantidade, 20), pontos: Lic_texto_(i.pontos, 10), precoEdital: Lic_texto_(i.precoEdital, 20), precoProposta: Lic_texto_(i.precoProposta, 20), custoParceiro: Lic_texto_(i.custoParceiro, 20), origem: Lic_up_(i.origem) === 'PNCP' ? 'PNCP' : 'DIGITADO' }; }),
    execucao: { uf: Lic_up_(x.uf), municipio: Lic_texto_(x.municipio, 120), kmTrecho: Lic_texto_(x.kmTrecho, 10), kmFonte: Lic_up_(x.kmFonte) === 'SUGERIDO' ? 'SUGERIDO' : '', viagens: Lic_texto_(x.viagens, 5), tecnicos: Lic_texto_(x.tecnicos, 3), engenheiros: Lic_texto_(x.engenheiros, 3), dias: Lic_texto_(x.dias, 5), noites: Lic_texto_(x.noites, 5),
      transporte: Lic_up_(x.transporte), passagem: Lic_texto_(x.passagem, 20), pedagio: Lic_texto_(x.pedagio, 20), outros: Lic_texto_(x.outros, 20), outrosDescricao: Lic_texto_(x.outrosDescricao, 200) },
    seguro: { exige: s.exige === true || Lic_up_(s.exige) === 'SIM', custo: Lic_texto_(s.custo, 20), obs: Lic_texto_(s.obs, 300) } };
}
/** Salvar: a conta é refeita no servidor (nunca vale a da tela) e vira a VERSÃO NOVA; nada anterior muda. d: { id, entrada, motivo } */
function LicP_simulacaoSalvar_(eu, d) {
  var motivo = Lic_texto_(d.motivo, 1000);
  if (motivo.length < 10) throw new Error('Escreva o motivo desta versão da simulação (pelo menos 10 letras): ele fica no histórico com o seu nome e a data. Nada foi gravado');
  var l = Lic_acharOp_(d.id), entrada = LicP_entradaLimpa_(d.entrada), res = LicP_calcular_(l, entrada);
  var resJson = JSON.stringify(res);
  if (resJson.length > 48000) throw new Error('A simulação ficou grande demais para gravar (' + res.itens.length + ' itens com textos longos). Encurte as descrições dos itens ou separe o edital em lotes. Nada foi gravado');
  return Lic_comTrava_(function () {
    var ant = LicP_simulacoesDe_(l.ID)[0] || null, versao = (ant ? Number(ant.VERSAO) || 0 : 0) + 1, agora = Lic_agora_(), t = res.totais;
    var reg = { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), VERSAO: versao, MOTIVO: motivo, SITUACAO: res.situacao, ENTRADA_JSON: JSON.stringify(entrada), RESULTADO_JSON: resJson,
      TOTAL_CUSTO: t.custo, TOTAL_PISO: t.piso, TOTAL_ALVO: t.alvo, TOTAL_EDITAL: t.edital || '', TOTAL_PROPOSTA: t.proposta || '', MARGEM_EDITAL_PCT: t.margemEditalPct === null ? '' : t.margemEditalPct,
      MARGEM_PROPOSTA_PCT: t.margemPropostaPct === null ? '' : t.margemPropostaPct, ITENS_ABAIXO_PISO_PROPOSTA: t.abaixoProposta || 0, ITENS_ABAIXO_PISO_EDITAL: t.abaixoEdital || 0, PENDENCIAS: res.pendencias.length, POLITICA_VERSAO: res.politica.licitacao.versao,
      POR_ID: eu.id, POR_NOME: eu.nome, CRIADO_EM: agora };
    reg.HASH = LicP_hashSim_(reg);
    SGO_DATA.insert(LICP_ABAS.SIMULACOES, reg);
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'SIMULACAO_DE_PRECO', eu, { de: ant ? 'versão ' + ant.VERSAO + ' · piso ' + LicP_moeda_(LicP_n_(ant.TOTAL_PISO) || 0) : 'sem simulação',
      para: 'versão ' + versao + ' · piso ' + LicP_moeda_(t.piso) + (t.pisoCompleto ? '' : ' (parcial)'),
      texto: 'Simulação de preço salva: custo ' + LicP_moeda_(t.custo) + ', piso ' + LicP_moeda_(t.piso) + ', alvo ' + LicP_moeda_(t.alvo) + (t.edital ? ', edital ' + LicP_moeda_(t.edital) + ' (sobra ' + LicP_pct_(t.margemEditalPct) + ')' : '') +
        (t.proposta ? ', proposta ' + LicP_moeda_(t.proposta) + ' (sobra ' + LicP_pct_(t.margemPropostaPct) + ')' : '') + (res.pendencias.length ? '; ' + res.pendencias.length + ' pendência(s)' : '') + '. Motivo: ' + motivo,
      versao: 'simulação ' + versao + ' · política ' + res.politica.licitacao.versao + ' · Comercial ' + res.politica.comercial.versao, fonte: 'Aba Preço (simulador)', hash: reg.HASH });
    return { versao: versao, simulacao: LicP_simulacaoCompleta_(reg), texto: 'Simulação salva na versão ' + versao + '. Ela não muda mais; para corrigir, salve uma versão nova. A nota da análise passa a usar esta simulação no critério margem: abra a aba Análise e toque em "Refazer análise".' };
  });
}
function LicP_simulacaoVer_(eu, d) {
  var l = Lic_acharOp_(d.id), s = LicP_simulacoesDe_(l.ID).filter(function (x) { return Number(x.VERSAO) === Number(d.versao); })[0];
  if (!s) throw new Error('Não foi possível abrir: a versão ' + Lic_s_(d.versao) + ' da simulação não existe (atualize a ficha)');
  return { simulacao: LicP_simulacaoCompleta_(s) };
}

// ------------------------------------------------------------ nota (critério margem; chamado por SGO_Licitacoes_Analise.js)
/** Marca da última simulação para a base da análise ('' sem simulação: a base das análises antigas não muda). Nunca lança. */
function LicP_baseNota_(l) {
  try { var s = LicP_simulacoesDe_(l.ID)[0]; return s ? 'SIM:' + Number(s.VERSAO) + ':' + Lic_s_(s.HASH).slice(0, 16) : ''; } catch (e) { return ''; }
}
/**
 * Critério margem pela última simulação salva (null sem simulação: vale o padrão de 5 com pendência). Pontos em 15 (escala no peso):
 *   com pendência ou sem preço do edital: 5, como pendência; edital abaixo do piso no lote: 0; algum item do edital abaixo do piso
 *   (com piso por item): 6; sobra no edital a partir da mínima: 11; a partir do alvo: 15.
 */
function LicP_margemNota_(l, pesos) {
  try {
    var s = LicP_simulacoesDe_(l.ID)[0];
    if (!s) return null;
    var res = Lic_json_(s.RESULTADO_JSON, null);
    if (!res || !res.totais) return null;
    var t = res.totais, pl = (res.politica && res.politica.licitacao) || LICP_POLITICA_PADRAO, v = Number(s.VERSAO) || 0, peso = pesos.margem;
    var onde = 'Simulação de preço versão ' + v + ' (' + LicP_dia_(s.CRIADO_EM) + ', ' + Lic_s_(s.POR_NOME) + ')';
    // a IA externa recebe só a pontuação (nem piso, nem preço do edital, nem sobra): textoIA vai ao pedido no lugar de "como"
    var crit = function (pts, como) { return { pontos: pts * peso / 15, peso: peso, origem: 'SIMULACAO', como: como, textoIA: LicP_fmt_(pts * peso / 15, 1).replace(/,0$/, '') + ' de ' + peso + ', calculada pelo sistema.', simulacaoVersao: v }; };
    // revisão de ca99fe5: registro alterado fora do SGO+ não vale para a nota
    if (LicP_hashSim_(s) !== Lic_s_(s.HASH)) return { criterio: crit(5, onde + ': o registro não confere com o hash gravado (simulação alterada fora do SGO+): 5 de 15, como pendência.'),
      afirmacoes: [{ tipo: 'PENDENCIA', criterio: 'margem', texto: 'Simulação de preço alterada fora do SGO+: salve uma versão nova na aba Preço.' }] };
    var fonte = { ref: 'SIMULACAO:v' + v, rotulo: onde + ' — aba Preço', trecho: 'piso ' + LicP_moeda_(t.piso) };
    var af = [], pts, como;
    var pend = (res.pendencias || []).length;
    var semEdital = t.semEdital !== undefined ? t.semEdital : (res.itens || []).filter(function (r) { return r.pisoUnit !== null && r.precoEdital === null; }).length;
    if (pend || !t.editalItens || semEdital) {
      pts = 5;
      como = onde + (pend ? ' com ' + pend + ' pendência(s)' : semEdital && t.editalItens ? ' com ' + semEdital + ' item(ns) sem o preço de referência do edital' : ' sem o preço de referência do edital nos itens') + ': 5 de 15, como pendência.';
      af.push({ tipo: 'PENDENCIA', criterio: 'margem', texto: pend ? 'Resolver as pendências da simulação de preço (aba Preço): ' + res.pendencias.slice(0, 3).map(function (p) { return p.texto; }).join(' ') : 'Informar o preço de referência do edital em todos os itens da simulação (aba Preço) para comparar com o piso.' });
    } else {
      var m = t.margemEditalPct, abaixo = t.abaixoEdital || 0;
      if (m < pl.margemMinPct - 1e-9) pts = 0;
      else if (abaixo && pl.pisoPorItem) pts = 6;
      else if (m >= pl.margemAlvoPct - 1e-9) pts = 15;
      else pts = 11;
      como = onde + ': piso ' + LicP_moeda_(t.piso) + ', preço de referência do edital ' + LicP_moeda_(t.edital) + ', sobra de ' + LicP_pct_(m) + ' no edital (mínima ' + LicP_pct_(pl.margemMinPct, 0) + ', alvo ' + LicP_pct_(pl.margemAlvoPct, 0) + ')' +
        (abaixo ? '; ' + abaixo + ' item(ns) com o edital abaixo do piso' : '') + ': ' + pts + ' de 15.';
      af.push({ tipo: 'FATO', criterio: 'margem', texto: onde + ': piso total ' + LicP_moeda_(t.piso) + ' e alvo ' + LicP_moeda_(t.alvo) + '; preço de referência do edital ' + LicP_moeda_(t.edital) + ', sobra de ' + LicP_pct_(m) + '.', fonte: fonte });
      (res.itens || []).filter(function (r) { return r.abaixoPisoEdital; }).slice(0, 5).forEach(function (r) {
        af.push({ tipo: 'FATO', criterio: 'margem', texto: 'Item ' + (r.numero || r.n) + ' (' + r.codigo + '): edital ' + LicP_moeda_(r.precoEdital) + ' abaixo do piso de ' + LicP_moeda_(r.pisoUnit) + ' por unidade.', fonte: fonte });
      });
      if (pts === 0) af.push({ tipo: 'INFERENCIA', criterio: 'margem', texto: 'Pelo preço do edital, a sobra fica abaixo da mínima: participar só com decisão da Diretoria.' });
    }
    return { criterio: crit(pts, como), afirmacoes: af };
  } catch (e) { return null; }
}

// ------------------------------------------------------------ ações (Licitacoes_api 'precos', { op })
var LICP_OPS = {
  tabela: function (eu) { return LicP_tabela_(eu); },
  itemVersoes: function (eu, d) { return LicP_itemVersoes_(eu, d); },
  itemSalvar: function (eu, d) { return LicP_itemSalvar_(eu, d); },
  importarPrevia: function (eu) { return LicP_importarPrevia_(eu); },
  importar: function (eu, d) { return LicP_importar_(eu, d); },
  politicaSalvar: function (eu, d) { return LicP_politicaSalvar_(eu, d); },
  simulacao: function (eu, d) { return LicP_simulacao_(eu, d); },
  simulacaoCalcular: function (eu, d) { return LicP_simulacaoCalcular_(eu, d); },
  simulacaoSalvar: function (eu, d) { return LicP_simulacaoSalvar_(eu, d); },
  simulacaoVer: function (eu, d) { return LicP_simulacaoVer_(eu, d); }
};
/** Licitacoes_api já conferiu a sessão e a permissão (Diretoria e Administrador). */
function LicP_acao_(eu, d) {
  Lic_exigir_(eu, 'usar os preços de licitação');
  var fn = LICP_OPS[Lic_s_(d && d.op)];
  if (!fn) throw new Error('Não foi possível: ação de preços desconhecida (' + Lic_s_(d && d.op) + '). Atualize a página (F5) e tente de novo');
  try { LicP_garantirAbas_(); } catch (e) {}
  return fn(eu, d || {});
}
