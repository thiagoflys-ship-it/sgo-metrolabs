/****************************************************
 * COMERCIAL — PRECIFICAÇÃO: CUSTOS DA VIAGEM, CHECKLIST, MARGEM E REAJUSTE (29/10/2026)
 *
 * Pedido do dono (29/10/2026): "Preciso de um especialista para precificação ao montar propostas: calcular o deslocamento
 * de 1 ou 2 técnicos ou engenheiros; despesas de viagem R$ 2,50 por km rodado, mais pedágios, despesas de alimentação e
 * combustíveis, mais diária de um ou mais técnicos; tudo tem que ser levado a sério. E também o código de conduta: R$ 300
 * por viagem que o colaborador ganha; se forem dois colaboradores já dobra. Esses benefícios têm que ser repassados, não
 * pode esquecer. Temos que ter esse checklist e não deixar passar jamais esses custos. Temos que ter política de acréscimos
 * e reajuste de produto e vendas, e um especialista cuidando sempre das oportunidades, estratégias e reajustes."
 * O dono não quis responder detalhes: as decisões abaixo são de bom senso, tudo configurável pela Diretoria.
 *
 * DECISÕES (também no manual, docs/MANUAL_MODULO_COMERCIAL.md, "Precificação"):
 *  - Política em Comercial > Metodologia > Política de precificação (metodologia.precificacao, COM_METODOLOGIA_PADRAO): só a
 *    Diretoria e o Administrador mudam; cada gravação é uma versão com o motivo (como os termos e condições).
 *  - Km rodado: R$ 2,50 por km, ida e volta (km do trecho x 2). O km cobre o veículo da empresa (combustível, desgaste,
 *    manutenção). "Combustível adicional ou passagem" é outra linha, para quando não é veículo da empresa (avião, ônibus,
 *    veículo locado). Nas propostas antigas do CRM o km a R$ 2,50 vinha como "DESLOCAMENTO/HORA TÉCNICA/PEDÁGIO" (720 km a
 *    R$ 2,50, por exemplo); agora pedágio e horas de deslocamento são linhas próprias, para nada ficar escondido.
 *  - Pedágio: valor informado por viagem (ida e volta), porque depende da rota. Alimentação por pessoa por dia; diária por
 *    pessoa por dia, diferente para técnico e engenheiro; hospedagem por pessoa por noite; horas de deslocamento (mão de
 *    obra parada na estrada) por hora e por função, opcional. Sem padrão conhecido: VAZIO; o checklist cobra.
 *  - Benefício do Programa de conduta: vem dos parâmetros do próprio programa (VALOR_INCENTIVO_MISSAO = R$ 300 e
 *    MISSAO_KM_MINIMO = 200 km, qual_parametro), por colaborador por viagem; dois colaboradores = o dobro. Trecho abaixo do
 *    mínimo do programa não gera benefício (regra 13 da Conduta), e a linha fica "não se aplica" sozinha, com o motivo.
 *    Ao cliente ele NUNCA aparece com esse nome: entra no custo de "Despesas de deslocamento e estadia".
 *  - Distância: sugestão pela tabela de distâncias da Conduta (qual_distancia_referencia: destino "Cidade/UF", km do trecho
 *    a partir da sede), pela cidade da unidade do cliente; sem referência, o vendedor digita o km.
 *  - Repasse: padrão = item separado "Despesas de deslocamento e estadia" (preço = custo mais impostos sobre o faturamento,
 *    mais a margem sobre deslocamento da política, arredondado para cima ao múltiplo da política, padrão R$ 10). A outra
 *    opção é "diluído no preço dos serviços": nenhum item a mais; o custo entra na margem e a tela mostra quanto diluir.
 *    Nos dois casos o custo interno (com o benefício) fica gravado na proposta (DESLOCAMENTO_JSON).
 *  - Checklist obrigatório: proposta com serviço (tipo Serviço ou Misto) só conclui com cada linha da viagem com valor ou
 *    "não se aplica" com o motivo, ou com "não há viagem" e o motivo (serviço no laboratório, por exemplo). Com produto
 *    (Produto ou Misto): o frete e a entrega, com o custo ou "não se aplica" com o motivo.
 *  - Margem: custo total (itens do catálogo com custo + viagem + frete), impostos (% da política sobre o total), preço e
 *    margem depois de impostos. Abaixo da margem mínima da política, a proposta vai para a aprovação (a mesma alçada da
 *    política de desconto, ComP_avaliarPolitica_) e só a Diretoria ou o Administrador aprovam. Itens sem custo cadastrado
 *    deixam a margem "parcial" (otimista): ela só trava quando nem a conta otimista alcança a mínima.
 *  - Reajuste do catálogo: Diretoria e Administrador, por percentual (índice informado à mão: IPCA, IGP-M...), em todos os
 *    itens ativos, por tipo, por categoria ou pela busca; prévia antes, vigência (hoje ou agendada), histórico (COM_REAJUSTES:
 *    preço anterior, novo, quem, quando, motivo) e "desfazer o último reajuste". Item sem reajuste há mais de 12 meses
 *    (configurável) aparece no catálogo, no painel e na gestora.
 *  - A gestora comercial (SGO_Comercial_Gestora.js) confere tudo isso em toda proposta e no panorama; o painel mostra o
 *    quadro "Precificação e estratégia". Só regras: nenhum número sai da IA.
 *
 * 01/11/2026 — COMERCIAL C2 (docs/COMERCIAL_C1_PRECIFICACAO_20261101.md):
 *  - Valores iniciais da C1 na política (impostos 14,25%, comissão 3%, margem alvo 20%, mínima 10%, custo da hora, custo fixo,
 *    alimentação, hotel, taxa por viagem e hora avulsa). Campo vazio vale o valor inicial ("preenche o que está vazio"); cada
 *    valor fica marcado como provisório até a Diretoria marcar "confirmado pelo dono".
 *  - Margem única (Com_unificarMargem_): depois de impostos, da comissão (sobre os itens que não são deslocamento nem frete) e
 *    dos custos da viagem. Abaixo da mínima, a proposta vai para a Caixa de decisões e só a Diretoria aprova.
 *  - Deslocamento: linha nova "Taxa por viagem" (fora da Grande Goiânia), horas de estrada pelo custo da hora com o custo fixo
 *    (trecho acima de 200 km), diária vazia na política = "não se aplica" sozinha. O vendedor pode digitar o preço do item; abaixo
 *    do custo, a tela e a gestora avisam.
 *  - Faixas de prazo (Normal 10 d.u.; Urgente 3 d.u. +110%; Prioritária 5 d.u. +50%, desligada até o dono aprovar) por item ou
 *    para a proposta inteira; "Licitação ou contrato" tira o acréscimo. O acréscimo vale só para serviço.
 *
 * 01/11/2026 — DECISÃO DO DONO (docs/COMERCIAL_MATERIAL_DO_DONO_20261101.md, seção 0):
 *   "Pra empresa tem que sobrar no mínimo 35%". "Os valores têm que ser os valores maiores, esses serviços estão muito baratos".
 *   "Os 300 é missão acima de 200 km, porém temos mais 300 por colaborador de incentivo de conduta, tem que incluir e diluir, a
 *   empresa precisa pagar esses custos". "2,50 km rodado; imposto: você tem que ver como é Goiás e como é Rio; aqui é lucro real."
 *  - Sobra mínima 35% (margemMinPct), alvo 40% (proposta nossa, provisória). Sobra = preço dos itens − impostos (com os créditos
 *    do produto) − comissão − custos diretos (mão de obra com custo fixo e bônus diluído, peças, viagem quando diluída). É antes
 *    de IR e CSLL (no Lucro Real eles incidem sobre o lucro, fora desta conta). Abaixo de 35%: Caixa de decisões, só a Diretoria
 *    aprova, qualquer que seja a alçada de desconto de quem vende.
 *  - O item "Despesas de deslocamento e estadia" (e o frete) é repasse a custo mais impostos, sem margem (MAN-VIA-001): fica FORA
 *    da conta da sobra (nem ajuda nem atrapalha) e o desconto geral nunca o reduz (ComP_calcular_ rateia o desconto só nos
 *    serviços e produtos). Viagem "diluída no preço dos serviços": o custo entra no custo dos serviços e a sobra tem que cobrir.
 *  - Preço do serviço = o MAIOR entre a tabela (catálogo ou C1), a planilha do dono de 30/10/2026 com o imposto por fora
 *    (valor ÷ (1 − impostos de serviço)) e a conta de custo com a sobra mínima (custo ÷ (1 − impostos − comissão − 35%)).
 *    Hora avulsa: o maior entre R$ 190 ÷ (1 − impostos) e a conta. Peça revendida: custo × (1 − créditos) ÷ (1 − impostos de
 *    produto − comissão − 35%) (ComPr_precoProduto_), no lugar do antigo "custo ÷ 0,7 com imposto dentro". Ficha em
 *    SGO_Comercial_Ficha.js; aplicação em produção em SGO_Comercial_Decisao20261101.js.
 *  - Custo da hora: técnico R$ 90 (MAN-VIA-001), engenheiro R$ 132, mais o Bônus Coletivo diluído (ComPr_bonusHora_): bônus do
 *    Programa de conduta x colaboradores ativos (mesmo filtro do fechamento da Conduta) ÷ horas faturáveis da equipe no mês.
 *  - A "Taxa por viagem" de R$ 300 era o Incentivo de Missão em dobro: desligada (valor 0, a linha fica "não se aplica" sozinha e
 *    não aparece na tela). Proposta antiga que gravou a taxa continua mostrando o que gravou. Fica só o Incentivo de Missão:
 *    R$ 300 por executante por missão com trecho de 200 km ou mais a partir da sede da unidade (parâmetros da Conduta).
 *  - Impostos por unidade emissora (Lucro Real, ComPr_polUnidade_): Goiânia/GO (padrão) e Rio de Janeiro/RJ. Serviço: PIS 1,65% +
 *    COFINS 7,6% + ISS 5% (provisório). Produto: PIS + COFINS + ICMS (GO 19%; RJ 20% + 2% FECP) sobre o preço, menos créditos
 *    sobre o custo (PIS/COFINS 9,25% + ICMS da compra 12%, provisório). A unidade fica na proposta (DESLOCAMENTO_JSON.unidade) e
 *    muda a origem da distância (e o Incentivo de Missão). Proposta sem unidade = Goiânia. CBS/IBS de 2026 só em teste na nota:
 *    nada é somado. Km R$ 2,50, alimentação R$ 100 e hotel R$ 150 seguem como estavam.
 ****************************************************/

var COM_PR_FUNCOES = { TECNICO: 'Técnico', ENGENHEIRO: 'Engenheiro' };
var COM_PR_TRANSPORTES = { VEICULO_EMPRESA: 'Veículo da empresa', VEICULO_LOCADO: 'Veículo locado', AVIAO: 'Avião', ONIBUS: 'Ônibus', OUTRO: 'Outro' };
var COM_PR_REPASSES = { ITEM: 'Item separado na proposta ("Despesas de deslocamento e estadia")', DILUIDO: 'Diluído no preço dos serviços' };
/** Linhas da viagem. obrigatoria: entra no checklist. porFuncao: valor diferente para técnico e engenheiro. */
var COM_PR_LINHAS = [
  { codigo: 'KM', nome: 'Km rodado (ida e volta)', unidade: 'por km', obrigatoria: true },
  { codigo: 'PEDAGIO', nome: 'Pedágios', unidade: 'por viagem (ida e volta)', obrigatoria: true },
  // 01/11/2026 (decisão do dono): a taxa por viagem era o Incentivo de Missão em dobro. A linha fica só para ler as propostas
  // antigas que a gravaram; nas novas ela é "não se aplica" sozinha e não aparece na tela (ComPr_normalizar_).
  { codigo: 'TAXA', nome: 'Taxa por viagem (proposta anterior a 01/11/2026)', unidade: 'por viagem', obrigatoria: true },
  { codigo: 'ALIMENTACAO', nome: 'Alimentação', unidade: 'por pessoa por dia', obrigatoria: true },
  { codigo: 'DIARIA', nome: 'Diárias', unidade: 'por pessoa por dia', obrigatoria: true, porFuncao: true },
  { codigo: 'HOSPEDAGEM', nome: 'Hospedagem', unidade: 'por pessoa por noite', obrigatoria: true },
  { codigo: 'CONDUTA', nome: 'Incentivo de Missão (Programa de conduta)', unidade: 'por executante por missão', obrigatoria: true },
  { codigo: 'COMBUSTIVEL', nome: 'Combustível adicional ou passagem', unidade: 'por viagem', obrigatoria: true },
  { codigo: 'HORAS', nome: 'Horas de estrada (mão de obra)', unidade: 'por hora por pessoa', obrigatoria: false, porFuncao: true },
  { codigo: 'OUTROS', nome: 'Outros custos da viagem', unidade: 'total', obrigatoria: false }
];
var COM_PR_ITEM_VIAGEM = 'Despesas de deslocamento e estadia';
var COM_PR_ITEM_FRETE = 'Frete e entrega';

// ------------------------------------------------------------
// NÚMEROS
// ------------------------------------------------------------
/** Número de entrada (tela ou banco) ou null quando vazio ou inválido. */
function ComPr_num_(v) {
  if (v === null || v === undefined || Com_s_(v) === '') return null;
  var n = Com_num_(v);
  return isFinite(n) ? n : null;
}
/** Valor em reais da tela: null quando vazio; lança quando não é número ou é negativo. */
function ComPr_valor_(v, rotulo) {
  if (v === null || v === undefined || Com_s_(v) === '') return null;
  var n = Com_num_(v);
  if (!isFinite(n)) throw new Error('Não foi possível salvar: o valor de ' + rotulo + ' ("' + Com_s_(v).slice(0, 20) + '") não é um número. Use, por exemplo, 45,00');
  if (n < 0) throw new Error('Não foi possível salvar: o valor de ' + rotulo + ' não pode ser negativo. Para tirar a linha da conta, marque "não se aplica" com o motivo');
  return Com_r2_(n);
}
/** Inteiro da tela entre min e max; padrao quando vazio; lança quando inválido. */
function ComPr_inteiro_(v, rotulo, min, max, padrao) {
  if (v === null || v === undefined || Com_s_(v) === '') return padrao;
  var n = Com_num_(v);
  if (!isFinite(n) || Math.round(n) !== n || n < min || n > max) throw new Error('Não foi possível salvar: ' + rotulo + ' precisa ser um número inteiro de ' + min + ' a ' + max + ' (veio "' + Com_s_(v).slice(0, 20) + '")');
  return n;
}
/** Arredonda para cima ao múltiplo (R$ 10 por padrão); múltiplo vazio ou zero = centavos. */
function ComPr_arredondarCima_(v, multiplo) {
  var m = Number(multiplo) > 0 ? Number(multiplo) : 0.01;
  return Com_r2_(Math.ceil(Com_r2_(v) / m - 1e-9) * m);
}
/** Arredonda ao múltiplo mais próximo (reajuste do catálogo). */
function ComPr_arredondar_(v, multiplo) {
  var m = Number(multiplo) > 0 ? Number(multiplo) : 0.01;
  return Com_r2_(Math.round(Com_r2_(v) / m + 1e-9) * m);
}
function ComPr_qtd_(n) { return typeof SGO_DocA4_num_ === 'function' ? SGO_DocA4_num_(Number(n) || 0, Math.round(n) === n ? 0 : 1) : String(n).replace('.', ','); }

// ------------------------------------------------------------
// POLÍTICA
// ------------------------------------------------------------
/** 01/11/2026 (C2): campos que nascem com o valor inicial da C1 e ficam "provisórios" até o dono confirmar. */
var COM_PR_PROVISORIOS = [
  { campo: 'custoHora', nome: 'custo da hora do técnico e do engenheiro (salários reais e horas faturáveis)' },
  { campo: 'custoFixoPct', nome: 'custo fixo sobre a mão de obra' },
  // 01/11/2026: a taxa por viagem foi decidida pelo dono (era o Incentivo de Missão; desligada). Novos provisórios abaixo.
  { campo: 'margemAlvoPct', nome: 'margem alvo de 40% (proposta nossa; a mínima de 35% é decisão do dono)' },
  { campo: 'impostosUnidade', nome: 'ISS de 5% (Goiânia e Rio) e ICMS da compra de 12% (confirmar com o contador)' },
  { campo: 'bonusHoras', nome: 'horas faturáveis da equipe por mês (diluição do Bônus Coletivo)' },
  { campo: 'calibracaoParceiro', nome: 'calibração feita pela equipe própria ou por parceiro' },
  { campo: 'comissaoPct', nome: 'comissão' },
  { campo: 'prioritaria', nome: 'aprovação da faixa prioritária de 5 dias úteis' },
  { campo: 'contratoUrgencia', nome: 'se o cliente de contrato paga urgência' },
  { campo: 'alcadas', nome: 'alçadas de desconto (vendedor, gerente e Diretoria)' },
  { campo: 'pontualidade', nome: 'fim do desconto por pagamento até o dia 10' },
  { campo: 'prazoConta', nome: 'se o prazo conta até a execução ou até o relatório' }
];
/** Campos da política que, vazios, recebem o valor inicial (preenche só o que está vazio; nunca troca valor gravado). */
// 01/11/2026: impostosPct saiu da lista (vazio = imposto de serviço da unidade emissora)
var COM_PR_INICIAIS = ['valorKm', 'velocidadeMediaKmh', 'alimentacaoPessoaDia', 'hospedagemPessoaNoite', 'comissaoPct', 'margemMinPct', 'margemAlvoPct', 'custoFixoPct', 'horaAvulsa', 'estradaKmMinimo', 'arredondarPara', 'reajusteAlertaMeses', 'margemPecasPct'];

/** Política de precificação em vigor (metodologia), completa e normalizada. */
function ComPr_politica_(met) {
  met = met || Com_metodologia_();
  var pad = COM_METODOLOGIA_PADRAO.precificacao;
  var p = Com_copia_(pad), g = met.precificacao || {};
  Object.keys(g).forEach(function (k) { if (g[k] !== undefined) p[k] = Com_copia_(g[k] === undefined ? null : g[k]); });
  ['diariaPessoaDia', 'horaDeslocamento', 'custoHora'].forEach(function (k) {
    var o = p[k] && typeof p[k] === 'object' ? p[k] : {}, d = pad[k] || {};
    p[k] = { TECNICO: ComPr_num_(o.TECNICO), ENGENHEIRO: ComPr_num_(o.ENGENHEIRO) };
    if (k === 'custoHora') { if (p[k].TECNICO === null) p[k].TECNICO = d.TECNICO; if (p[k].ENGENHEIRO === null) p[k].ENGENHEIRO = d.ENGENHEIRO; }
  });
  p.beneficioConduta = Object.assign({ valorPorColaborador: 300, kmMinimoTrecho: 200 }, p.beneficioConduta && typeof p.beneficioConduta === 'object' ? p.beneficioConduta : {});
  var tv = p.taxaViagem && typeof p.taxaViagem === 'object' ? p.taxaViagem : {};
  p.taxaViagem = { valor: ComPr_num_(tv.valor), rotulo: Com_s_(tv.rotulo) || pad.taxaViagem.rotulo, kmMinimo: ComPr_num_(tv.kmMinimo) };
  if (p.taxaViagem.valor === null && (tv.valor === undefined || tv.valor === null || Com_s_(tv.valor) === '')) p.taxaViagem.valor = pad.taxaViagem.valor;
  if (p.taxaViagem.kmMinimo === null) p.taxaViagem.kmMinimo = pad.taxaViagem.kmMinimo;
  ['valorKm', 'velocidadeMediaKmh', 'alimentacaoPessoaDia', 'hospedagemPessoaNoite', 'impostosPct', 'comissaoPct', 'margemMinPct', 'margemAlvoPct', 'margemDeslocamentoPct', 'custoFixoPct', 'horaAvulsa', 'estradaKmMinimo', 'arredondarPara', 'reajusteAlertaMeses', 'margemPecasPct']
    .forEach(function (k) { p[k] = ComPr_num_(p[k]); });
  // 01/11/2026 (C2): campo vazio recebe o valor inicial da C1 (a política antiga nascia vazia)
  COM_PR_INICIAIS.forEach(function (k) { if (p[k] === null && pad[k] !== null && pad[k] !== undefined) p[k] = pad[k]; });
  p.alimentacaoForaDaRegiao = p.alimentacaoForaDaRegiao === undefined || p.alimentacaoForaDaRegiao === null ? pad.alimentacaoForaDaRegiao : !!p.alimentacaoForaDaRegiao && Com_s_(p.alimentacaoForaDaRegiao) !== 'false';
  p.prazo = ComPr_prazoNormal_(p.prazo);
  p.confirmados = Array.isArray(p.confirmados) ? p.confirmados.map(Com_s_).filter(Boolean) : [];
  if (!COM_PR_REPASSES[Com_up_(p.repassePadrao)]) p.repassePadrao = 'ITEM'; else p.repassePadrao = Com_up_(p.repassePadrao);
  p.origemPadrao = Com_s_(p.origemPadrao) || 'Goiânia/GO';
  // 01/11/2026 (decisão do dono): unidades emissoras (Lucro Real) e o Bônus Coletivo diluído na hora
  p.unidades = ComPr_unidadesNormal_(p.unidades);
  p.unidadePadrao = p.unidades[Com_up_(p.unidadePadrao)] ? Com_up_(p.unidadePadrao) : (p.unidades.GO ? 'GO' : Object.keys(p.unidades)[0]);
  var bc = p.bonusConduta && typeof p.bonusConduta === 'object' ? p.bonusConduta : {}, bp = pad.bonusConduta || {};
  p.bonusConduta = { valorMes: ComPr_num_(bc.valorMes), colaboradores: ComPr_num_(bc.colaboradores), horasFaturaveisMes: ComPr_num_(bc.horasFaturaveisMes),
    horasPorColaboradorCampo: ComPr_num_(bc.horasPorColaboradorCampo) === null ? bp.horasPorColaboradorCampo : ComPr_num_(bc.horasPorColaboradorCampo) };
  // impostosPct gravado = imposto de serviço fixo (todas as unidades); vazio = o da unidade padrão (o da proposta em ComPr_polUnidade_)
  p.impostosFixoPct = p.impostosPct;
  ComPr_aplicarUnidade_(p, p.unidadePadrao);
  p.versao = met.versao;
  return p;
}

// ------------------------------------------------------------
// UNIDADE EMISSORA E IMPOSTOS (Lucro Real, 01/11/2026)
// ------------------------------------------------------------
var COM_PR_CAMPOS_UNIDADE = ['pisPct', 'cofinsPct', 'issPct', 'icmsPct', 'fecpPct', 'creditoPisCofinsPct', 'icmsCompraPct'];
/** Tabela de unidades normalizada: cada unidade do padrão, com o que foi gravado por cima (campo vazio vale o padrão). */
function ComPr_unidadesNormal_(u) {
  var pad = COM_METODOLOGIA_PADRAO.precificacao.unidades || {}, g = u && typeof u === 'object' && !Array.isArray(u) ? u : {}, r = {};
  Object.keys(pad).concat(Object.keys(g).filter(function (k) { return !pad[Com_up_(k)]; })).forEach(function (k0) {
    var k = Com_up_(k0), b = pad[k] || {}, x = g[k] || g[k0] || {};
    var o = { codigo: k, nome: Com_s_(x.nome) || Com_s_(b.nome) || k, origem: Com_s_(x.origem) || Com_s_(b.origem) || '' };
    COM_PR_CAMPOS_UNIDADE.forEach(function (c) { var v = ComPr_num_(x[c]); o[c] = v === null ? (ComPr_num_(b[c]) === null ? 0 : ComPr_num_(b[c])) : v; });
    r[k] = o;
  });
  return r;
}
/** Percentuais da unidade: { servicoPct, produtoPct, creditoPct } (soma das alíquotas). */
function ComPr_impostosDaUnidade_(un) {
  var u = un || {}, n = function (c) { return Number(u[c]) || 0; };
  return { servicoPct: Math.round((n('pisPct') + n('cofinsPct') + n('issPct')) * 10000) / 10000,
    produtoPct: Math.round((n('pisPct') + n('cofinsPct') + n('icmsPct') + n('fecpPct')) * 10000) / 10000,
    creditoPct: Math.round((n('creditoPisCofinsPct') + n('icmsCompraPct')) * 10000) / 10000 };
}
/** Põe na política (no lugar) os impostos e a origem da unidade. */
function ComPr_aplicarUnidade_(p, cod) {
  var k = p.unidades[Com_up_(cod)] ? Com_up_(cod) : p.unidadePadrao, un = p.unidades[k], im = ComPr_impostosDaUnidade_(un);
  p.unidade = k; p.unidadeNome = un.nome;
  p.impostosServicoPct = p.impostosFixoPct === null || p.impostosFixoPct === undefined ? im.servicoPct : p.impostosFixoPct;
  p.impostosPct = p.impostosServicoPct;
  p.impostosProdutoPct = im.produtoPct; p.creditoProdutoPct = im.creditoPct;
  // a origem padrão segue a unidade (a sede de onde sai a equipe); "origemPadrao" gravada vale para a unidade padrão
  p.origemUnidade = k === p.unidadePadrao ? (Com_s_(p.origemPadrao) || un.origem) : (un.origem || p.origemPadrao);
  return p;
}
/** Cópia da política com os impostos e a origem da unidade emissora (vazio ou desconhecida = a unidade padrão, Goiânia). */
function ComPr_polUnidade_(pol, cod) {
  if (!pol || !pol.unidades) return pol;
  var k = Com_up_(cod);
  if (!pol.unidades[k]) k = pol.unidadePadrao;
  if (pol.unidade === k) return pol;
  var c = Object.assign({}, pol);
  return ComPr_aplicarUnidade_(c, k);
}
/** Unidades para a tela: [{ codigo, nome, origem, servicoPct, produtoPct, creditoPct, ...alíquotas }]. */
function ComPr_unidadesTela_(pol) {
  return Object.keys(pol.unidades).map(function (k) { var u = pol.unidades[k], im = ComPr_impostosDaUnidade_(u); return Object.assign({}, u, im, { servicoTxt: Com_pct_(pol.impostosFixoPct === null || pol.impostosFixoPct === undefined ? im.servicoPct : pol.impostosFixoPct, 2), produtoTxt: Com_pct_(im.produtoPct, 2), creditoTxt: Com_pct_(im.creditoPct, 2), padrao: k === pol.unidadePadrao }); });
}

/**
 * Preço de uma peça ou produto revendido que garante a sobra (padrão: a mínima). Lucro Real: imposto = alíquotas x preço − créditos
 * x custo. Sobra = P − aP·P + cr·C − com·P − C ≥ m·P  =>  P = C x (1 − cr) ÷ (1 − aP − com − m). Arredonda para cima a R$ 1.
 * null quando a conta não fecha.
 */
function ComPr_precoProduto_(custo, pol, margemPct) {
  var c = Number(custo) || 0;
  if (!(c > 0)) return 0;
  var m = margemPct === undefined || margemPct === null ? Number(pol.margemMinPct) || 0 : Number(margemPct) || 0;
  var d = 1 - ((Number(pol.impostosProdutoPct) || 0) + (Number(pol.comissaoPct) || 0) + m) / 100;
  if (!(d > 0.05)) return null;
  return ComPr_arredondarCima_(c * (1 - (Number(pol.creditoProdutoPct) || 0) / 100) / d, 1);
}
/** Preço de serviço que garante a sobra (padrão: a mínima): custo ÷ (1 − impostos de serviço − comissão − margem). Sem arredondar. */
function ComPr_precoServicoConta_(custo, pol, margemPct) {
  var c = Number(custo) || 0;
  if (!(c > 0)) return 0;
  var m = margemPct === undefined || margemPct === null ? Number(pol.margemMinPct) || 0 : Number(margemPct) || 0;
  var d = 1 - ((Number(pol.impostosServicoPct !== undefined ? pol.impostosServicoPct : pol.impostosPct) || 0) + (Number(pol.comissaoPct) || 0) + m) / 100;
  return d > 0.05 ? Com_r2_(c / d) : null;
}
/** Piso de um item da proposta (o preço unitário que garante a sobra mínima); null sem custo ou item automático. */
function ComPr_pisoItem_(i, pol) {
  if (!i || i.auto || i.custoUnitario === null || i.custoUnitario === undefined || i.custoUnitario === '') return null;
  var c = Number(i.custoUnitario) || 0;
  if (!(c > 0)) return null;
  return i.tipo === 'PRODUTO' ? ComPr_precoProduto_(c, pol) : (function () { var v = ComPr_precoServicoConta_(c, pol); return v === null ? null : ComPr_arredondarCima_(v, 0.01); })();
}

// ------------------------------------------------------------
// BÔNUS COLETIVO DILUÍDO NA HORA (01/11/2026)
// ------------------------------------------------------------
var COM_PR_BONUS_MEMO = null;
var COM_PR_HORAS_RESERVA = 1600; // POL-BON-001: R$ 68.400 por ano ÷ R$ 3,56 por hora ≈ 1.600 h faturadas por mês na empresa
/**
 * Custo do Bônus Coletivo por hora faturável: { valor, fonteValor, colaboradores, fonteColaboradores, campo, horas, fonteHoras,
 * porHora, provisorio }. valor = bônus mensal por colaborador (Programa de conduta, VALOR_BONUS_COLETIVO; reserva: a política ou
 * R$ 300); colaboradores = ativos pelo mesmo filtro do fechamento da Conduta (SGO_Conduta_Fechamento.js); horas = o campo da
 * política, ou 140 h x colaboradores de campo (técnico, metrologia ou área técnica), ou 1.600 h (provisório). Nunca lança.
 */
function ComPr_bonusHora_(pol) {
  pol = pol || ComPr_politica_();
  var b = pol.bonusConduta || {};
  var chave = JSON.stringify([b.valorMes, b.colaboradores, b.horasFaturaveisMes, b.horasPorColaboradorCampo]);
  if (COM_PR_BONUS_MEMO && COM_PR_BONUS_MEMO.chave === chave && Date.now() - COM_PR_BONUS_MEMO.em < 20000) return COM_PR_BONUS_MEMO.r;
  var r = { valor: null, fonteValor: '', colaboradores: null, fonteColaboradores: '', campo: 0, horas: null, fonteHoras: '', porHora: 0, provisorio: false };
  if (b.valorMes !== null && b.valorMes !== undefined) { r.valor = b.valorMes; r.fonteValor = 'política de precificação'; }
  else {
    try {
      if (typeof Conduta_obterParametros_ === 'function' && typeof CONDUTA_SHEETS !== 'undefined' && CONDUTA_SHEETS) {
        var v = ComPr_num_((Conduta_obterParametros_() || {}).VALOR_BONUS_COLETIVO);
        if (v !== null) { r.valor = v; r.fonteValor = 'Programa de conduta (Bônus Coletivo)'; }
      }
    } catch (e) { /* vale a reserva */ }
    if (r.valor === null) { r.valor = 300; r.fonteValor = 'reserva (R$ 300 do POL-BON-001; o Programa de conduta não respondeu)'; }
  }
  var ativos = [], campo = 0;
  try {
    var generica = function (u) { if (typeof Conduta_ehContaGenerica_ === 'function') return Conduta_ehContaGenerica_(u); var l = Com_s_(u.USUARIO).toLowerCase(), n = Com_s_(u.NOME).toLowerCase(); return l === 'admin' || n === 'administrador'; };
    ativos = Com_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) { return Com_up_(u.STATUS) === 'ATIVO' && Com_up_(u.PERFIL) !== 'CLIENTE' && !generica(u); });
    campo = ativos.filter(function (u) { var pf = Com_up_(u.PERFIL), ar = Com_up_(u.AREA); return pf === 'TECNICO' || pf === 'METROLOGIA' || ar === 'TECNICA'; }).length;
  } catch (e2) { ativos = []; }
  if (b.colaboradores !== null && b.colaboradores !== undefined) { r.colaboradores = b.colaboradores; r.fonteColaboradores = 'política de precificação'; }
  else { r.colaboradores = ativos.length; r.fonteColaboradores = 'colaboradores ativos no cadastro (mesmo filtro do fechamento da Conduta)'; }
  r.campo = campo;
  if (b.horasFaturaveisMes !== null && b.horasFaturaveisMes !== undefined && b.horasFaturaveisMes > 0) { r.horas = b.horasFaturaveisMes; r.fonteHoras = 'política de precificação'; }
  else if (campo > 0) { r.horas = campo * (Number(b.horasPorColaboradorCampo) || 140); r.fonteHoras = ComPr_qtd_(Number(b.horasPorColaboradorCampo) || 140) + ' h x ' + Com_plural_(campo, 'colaborador de campo', 'colaboradores de campo') + ' (provisório)'; r.provisorio = true; }
  else { r.horas = COM_PR_HORAS_RESERVA; r.fonteHoras = 'valor provisório de ' + ComPr_qtd_(COM_PR_HORAS_RESERVA) + ' h (base do POL-BON-001; ninguém de campo no cadastro)'; r.provisorio = true; }
  r.porHora = r.horas > 0 ? Com_r2_(r.valor * r.colaboradores / r.horas) : 0;
  r.totalMes = Com_r2_(r.valor * r.colaboradores);
  COM_PR_BONUS_MEMO = { chave: chave, em: Date.now(), r: r };
  return r;
}

/** 01/11/2026 (C2): faixas de prazo normalizadas (faixa que faltar vem do padrão; a Normal fica sempre ligada e sem acréscimo). */
function ComPr_prazoNormal_(pz) {
  var pad = COM_METODOLOGIA_PADRAO.precificacao.prazo, o = pz && typeof pz === 'object' ? pz : {};
  var faixas = Array.isArray(o.faixas) && o.faixas.length ? o.faixas : pad.faixas;
  var porCod = {};
  faixas.forEach(function (fx) { if (fx && Com_up_(fx.codigo)) porCod[Com_up_(fx.codigo)] = fx; });
  var l = pad.faixas.map(function (base) {
    var fx = porCod[base.codigo] || {};
    var dias = ComPr_num_(fx.diasUteis), acr = ComPr_num_(fx.acrescimoPct);
    return { codigo: base.codigo, nome: Com_s_(fx.nome) || base.nome, diasUteis: dias === null ? base.diasUteis : dias, acrescimoPct: base.codigo === 'NORMAL' ? 0 : (acr === null ? base.acrescimoPct : acr),
      ativa: base.codigo === 'NORMAL' ? true : (fx.ativa === undefined ? base.ativa : fx.ativa === true || Com_up_(fx.ativa) === 'SIM' || Com_up_(fx.ativa) === 'TRUE') };
  });
  var rd = ComPr_num_(o.relatorioDiasUteis);
  return { contaAte: Com_up_(o.contaAte) === 'EXECUCAO' ? 'EXECUCAO' : 'RELATORIO', relatorioDiasUteis: rd === null ? pad.relatorioDiasUteis : rd, faixas: l,
    licitacaoSemAcrescimo: o.licitacaoSemAcrescimo === undefined ? pad.licitacaoSemAcrescimo : !!o.licitacaoSemAcrescimo && Com_s_(o.licitacaoSemAcrescimo) !== 'false',
    licitacaoRotulo: Com_s_(o.licitacaoRotulo) || pad.licitacaoRotulo };
}
/** Faixa pelo código (ou a Normal). */
function ComPr_faixa_(pol, codigo) {
  var l = pol.prazo.faixas;
  return l.filter(function (x) { return x.codigo === Com_up_(codigo); })[0] || l[0];
}
/** Fator de preço da faixa: preço normal x (1 + acréscimo). Licitação ou contrato (quando a política manda) = 1. */
function ComPr_fatorFaixa_(pol, codigo, licitacao) {
  if (licitacao && pol.prazo.licitacaoSemAcrescimo) return 1;
  return 1 + (Number(ComPr_faixa_(pol, codigo).acrescimoPct) || 0) / 100;
}
/** Arredondamento da tabela (C1): para cima, a múltiplos de R$ 5 abaixo de R$ 100 e de R$ 10 a partir de R$ 100. */
function ComPr_arredondarTabela_(v) {
  var n = Com_r2_(v);
  if (!(n > 0)) return 0;
  return ComPr_arredondarCima_(n, n < 100 ? 5 : 10);
}
/** Preço de tabela de um item de serviço na faixa (produto e itens automáticos não levam acréscimo). */
function ComPr_precoNaFaixa_(normal, pol, codigo, licitacao, tipo) {
  var n = Number(normal) || 0, fat = tipo === 'PRODUTO' ? 1 : ComPr_fatorFaixa_(pol, codigo, licitacao);
  if (!(n > 0)) return 0;
  return fat === 1 ? Com_r2_(n) : ComPr_arredondarTabela_(n * fat);
}
/** Prazo da faixa em linguagem simples (vai para "Prazo de execução" do documento). */
function ComPr_textoFaixa_(pol, fx) {
  var dias = Com_plural_(fx.diasUteis, 'dia útil', 'dias úteis');
  return pol.prazo.contaAte === 'EXECUCAO'
    ? 'execução em até ' + dias + ' após o aceite da proposta e a liberação do equipamento; relatório ou certificado em até ' + Com_plural_(pol.prazo.relatorioDiasUteis, 'dia útil', 'dias úteis') + ' após a execução'
    : 'execução e entrega do relatório ou certificado em até ' + dias + ', contados do aceite da proposta e da liberação do equipamento pelo cliente';
}
/**
 * Texto do prazo da proposta pelas faixas dos itens de serviço. prazo: { faixa, licitacao }; itens: os da proposta.
 * Uma faixa: "Prazo normal: execução e entrega ... em até 10 dias úteis, ...". Várias: uma frase por faixa, dizendo os itens.
 */
function ComPr_textoPrazo_(pol, prazo, itens) {
  var pz = prazo || {}, usadas = {}, ordem = [];
  (itens || []).forEach(function (i, k) {
    if (!i || i.auto || i.tipo === 'PRODUTO') return;
    var c = ComPr_faixa_(pol, i.faixa || pz.faixa).codigo;
    if (!usadas[c]) { usadas[c] = []; ordem.push(c); }
    usadas[c].push(k + 1);
  });
  if (!ordem.length) ordem.push(ComPr_faixa_(pol, pz.faixa).codigo);
  var partes = ordem.map(function (c) {
    var fx = ComPr_faixa_(pol, c);
    return 'Prazo ' + fx.nome.toLowerCase() + (ordem.length > 1 ? ' (' + (usadas[c].length > 1 ? 'itens ' : 'item ') + usadas[c].join(', ') + ')' : '') + ': ' + ComPr_textoFaixa_(pol, fx) + '.';
  });
  if (pz.licitacao && pol.prazo.licitacaoSemAcrescimo) partes.push('Preço único de licitação ou contrato, sem acréscimo de urgência.');
  return partes.join(' ');
}
/** Revisão da C2: retrato das faixas que vai junto da proposta (PRAZO_JSON.politica). */
function ComPr_retratoPrazo_(pol) {
  var z = pol.prazo;
  return { contaAte: z.contaAte, relatorioDiasUteis: z.relatorioDiasUteis, licitacaoSemAcrescimo: z.licitacaoSemAcrescimo, licitacaoRotulo: z.licitacaoRotulo,
    faixas: z.faixas.map(function (x) { return { codigo: x.codigo, nome: x.nome, diasUteis: x.diasUteis, acrescimoPct: x.acrescimoPct, ativa: x.ativa }; }) };
}
/** Política para mostrar o prazo de uma proposta: a do retrato gravado nela; sem retrato (proposta anterior), a em vigor. */
function ComPr_politicaDoPrazo_(prazo, met) {
  var pol = ComPr_politica_(met);
  if (prazo && prazo.politica && typeof prazo.politica === 'object') pol.prazo = ComPr_prazoNormal_(prazo.politica);
  return pol;
}
/** O que da política ainda é valor provisório (não confirmado pelo dono). [{ campo, nome }] */
function ComPr_provisorios_(pol) {
  var c = (pol && pol.confirmados) || [];
  return COM_PR_PROVISORIOS.filter(function (x) { return c.indexOf(x.campo) < 0; });
}

/** O que falta na política (para a gestora e o painel): [{ campo, nome }]. */
function ComPr_politicaIncompleta_(pol) {
  var l = [];
  var f = function (v, campo, nome) { if (v === null || v === undefined) l.push({ campo: campo, nome: nome }); };
  f(pol.valorKm, 'valorKm', 'valor por km rodado');
  f(pol.alimentacaoPessoaDia, 'alimentacaoPessoaDia', 'alimentação por pessoa por dia');
  f(pol.hospedagemPessoaNoite, 'hospedagemPessoaNoite', 'hospedagem por pessoa por noite');
  f(pol.impostosPct, 'unidades', 'impostos da unidade emissora (%)');
  f(pol.margemMinPct, 'margemMinPct', 'margem mínima (%)');
  f(pol.margemAlvoPct, 'margemAlvoPct', 'margem alvo (%)');
  return l;
}

/** Confere a política antes de gravar (Com_validarMetodologia_). Lança no padrão "o quê + por quê + o que fazer". */
function ComPr_validarPolitica_(pr) {
  if (pr === null || typeof pr !== 'object' || Array.isArray(pr)) throw new Error('a política de precificação veio num formato inválido. Atualize a tela e salve de novo');
  var dinheiro = function (v, nome) {
    if (v === null || v === undefined || v === '') return;
    var n = Com_num_(v);
    if (!isFinite(n) || n < 0) throw new Error('na política de precificação, "' + nome + '" precisa ser um valor em reais (por exemplo 45,00) ou ficar em branco. Corrija e salve de novo');
  };
  var pct = function (v, nome, max) {
    if (v === null || v === undefined || v === '') return;
    var n = Com_num_(v);
    if (!isFinite(n) || n < 0 || n > max) throw new Error('na política de precificação, "' + nome + '" precisa ficar entre 0% e ' + max + '% (ou em branco). Corrija e salve de novo');
  };
  dinheiro(pr.valorKm, 'valor por km rodado'); dinheiro(pr.alimentacaoPessoaDia, 'alimentação por pessoa por dia'); dinheiro(pr.hospedagemPessoaNoite, 'hospedagem por pessoa por noite');
  ['diariaPessoaDia', 'horaDeslocamento'].forEach(function (k) {
    var o = pr[k];
    if (o === undefined || o === null) return;
    if (typeof o !== 'object' || Array.isArray(o)) throw new Error('na política de precificação, os valores por função vieram num formato inválido. Atualize a tela e salve de novo');
    dinheiro(o.TECNICO, (k === 'diariaPessoaDia' ? 'diária' : 'hora de deslocamento') + ' do técnico'); dinheiro(o.ENGENHEIRO, (k === 'diariaPessoaDia' ? 'diária' : 'hora de deslocamento') + ' do engenheiro');
  });
  if (pr.beneficioConduta && typeof pr.beneficioConduta === 'object') { dinheiro(pr.beneficioConduta.valorPorColaborador, 'benefício do Programa de conduta (reserva)'); dinheiro(pr.beneficioConduta.kmMinimoTrecho, 'km mínimo do trecho para o benefício (reserva)'); }
  pct(pr.impostosPct, 'impostos sobre o faturamento', 60); pct(pr.margemMinPct, 'margem mínima', 90); pct(pr.margemAlvoPct, 'margem alvo', 90); pct(pr.margemDeslocamentoPct, 'margem sobre o deslocamento', 100);
  // 01/11/2026 (C2): comissão, custo da hora, custo fixo, taxa por viagem, hora avulsa e faixas de prazo
  pct(pr.comissaoPct, 'comissão', 20); pct(pr.custoFixoPct, 'custo fixo sobre a mão de obra', 300);
  // 01/11/2026 (C3): margem sobre peças e produtos revendidos
  pct(pr.margemPecasPct, 'margem sobre peças e produtos', 90);
  dinheiro(pr.horaAvulsa, 'hora técnica avulsa'); dinheiro(pr.estradaKmMinimo, 'km mínimo para cobrar as horas de estrada');
  if (pr.custoHora !== undefined && pr.custoHora !== null) {
    if (typeof pr.custoHora !== 'object' || Array.isArray(pr.custoHora)) throw new Error('na política de precificação, o custo da hora veio num formato inválido. Atualize a tela e salve de novo');
    dinheiro(pr.custoHora.TECNICO, 'custo da hora do técnico'); dinheiro(pr.custoHora.ENGENHEIRO, 'custo da hora do engenheiro');
  }
  if (pr.taxaViagem !== undefined && pr.taxaViagem !== null) {
    if (typeof pr.taxaViagem !== 'object' || Array.isArray(pr.taxaViagem)) throw new Error('na política de precificação, a taxa por viagem veio num formato inválido. Atualize a tela e salve de novo');
    dinheiro(pr.taxaViagem.valor, 'taxa por viagem'); dinheiro(pr.taxaViagem.kmMinimo, 'km a partir do qual a taxa por viagem vale');
    if (Com_s_(pr.taxaViagem.rotulo).length > 80) throw new Error('na política de precificação, o nome da taxa por viagem passa de 80 letras. Resuma e salve de novo');
  }
  if (pr.prazo !== undefined && pr.prazo !== null) {
    var pz = pr.prazo;
    if (typeof pz !== 'object' || Array.isArray(pz)) throw new Error('na política de precificação, as faixas de prazo vieram num formato inválido. Atualize a tela e salve de novo');
    if (pz.contaAte !== undefined && ['RELATORIO', 'EXECUCAO'].indexOf(Com_up_(pz.contaAte)) < 0) throw new Error('na política de precificação, diga se o prazo conta até a entrega do relatório ou até a execução. Escolha e salve de novo');
    (Array.isArray(pz.faixas) ? pz.faixas : []).forEach(function (fx) {
      var nome = Com_s_(fx && fx.nome) || Com_s_(fx && fx.codigo), d = Com_num_(fx && fx.diasUteis), a = Com_num_(fx && fx.acrescimoPct);
      if (!(isFinite(d) && Math.round(d) === d && d >= 1 && d <= 90)) throw new Error('na faixa de prazo ' + nome + ', o prazo precisa ser um número inteiro de 1 a 90 dias úteis. Corrija e salve de novo');
      if (fx.acrescimoPct !== undefined && fx.acrescimoPct !== null && fx.acrescimoPct !== '' && !(isFinite(a) && a >= 0 && a <= 300)) throw new Error('na faixa de prazo ' + nome + ', o acréscimo fica entre 0% e 300%. Corrija e salve de novo');
    });
    var fl = ComPr_prazoNormal_(pz).faixas, nor = fl[0];
    fl.slice(1).forEach(function (fx) { if (fx.ativa && fx.diasUteis >= nor.diasUteis) throw new Error('a faixa ' + fx.nome + ' (' + fx.diasUteis + ' dias úteis) precisa ser mais rápida que a Normal (' + nor.diasUteis + ' dias úteis). Corrija e salve de novo'); });
  }
  // 01/11/2026 (decisão do dono): impostos por unidade emissora e o Bônus Coletivo diluído na hora
  if (pr.unidades !== undefined && pr.unidades !== null) {
    if (typeof pr.unidades !== 'object' || Array.isArray(pr.unidades)) throw new Error('na política de precificação, a tabela de impostos por unidade veio num formato inválido. Atualize a tela e salve de novo');
    Object.keys(pr.unidades).forEach(function (k) {
      var u = pr.unidades[k] || {}, nome = Com_s_(u.nome) || k;
      if (typeof u !== 'object' || Array.isArray(u)) throw new Error('na política de precificação, a unidade ' + k + ' veio num formato inválido. Atualize a tela e salve de novo');
      if (Com_s_(u.nome).length > 60 || Com_s_(u.origem).length > 200) throw new Error('na política de precificação, o nome ou a origem da unidade ' + nome + ' está longo demais. Resuma e salve de novo');
      COM_PR_CAMPOS_UNIDADE.forEach(function (c) { pct(u[c], c.replace('Pct', '').replace('creditoPisCofins', 'crédito de PIS/COFINS').replace('icmsCompra', 'ICMS da compra').replace('fecp', 'FECP').replace('pis', 'PIS').replace('cofins', 'COFINS').replace('iss', 'ISS').replace('icms', 'ICMS') + ' da unidade ' + nome, 40); });
    });
    if (Com_s_(pr.unidadePadrao) && !ComPr_unidadesNormal_(pr.unidades)[Com_up_(pr.unidadePadrao)]) throw new Error('na política de precificação, a unidade padrão "' + Com_s_(pr.unidadePadrao) + '" não está na tabela de unidades. Escolha Goiânia ou Rio de Janeiro e salve de novo');
  }
  if (pr.bonusConduta !== undefined && pr.bonusConduta !== null) {
    var bc = pr.bonusConduta;
    if (typeof bc !== 'object' || Array.isArray(bc)) throw new Error('na política de precificação, o Bônus Coletivo veio num formato inválido. Atualize a tela e salve de novo');
    dinheiro(bc.valorMes, 'Bônus Coletivo por colaborador por mês');
    var nb = function (v, nome, min, max) { if (v === null || v === undefined || v === '') return; var x = Com_num_(v); if (!(isFinite(x) && x >= min && x <= max)) throw new Error('na política de precificação, "' + nome + '" precisa ficar entre ' + min + ' e ' + SGO_DocA4_num_(max, 0) + ' (ou em branco para o sistema calcular). Corrija e salve de novo'); };
    nb(bc.colaboradores, 'colaboradores que recebem o Bônus Coletivo', 0, 1000); nb(bc.horasFaturaveisMes, 'horas faturáveis da equipe por mês', 1, 100000); nb(bc.horasPorColaboradorCampo, 'horas faturáveis por colaborador de campo', 1, 300);
  }
  var mn = ComPr_num_(pr.margemMinPct), al = ComPr_num_(pr.margemAlvoPct);
  var imFixo = ComPr_num_(pr.impostosPct), uns = ComPr_unidadesNormal_(pr.unidades), imMax = 0;
  Object.keys(uns).forEach(function (k) { var x = ComPr_impostosDaUnidade_(uns[k]); imMax = Math.max(imMax, imFixo === null ? x.servicoPct : imFixo, x.produtoPct); });
  var im = imMax + (ComPr_num_(pr.comissaoPct) || 0);
  if (mn !== null && al !== null && al < mn) throw new Error('na política de precificação, a margem alvo (' + Com_pct_(al, 1) + ') não pode ser menor que a margem mínima (' + Com_pct_(mn, 1) + '). Corrija e salve de novo');
  if (im + Math.max(mn || 0, al || 0) >= 95) throw new Error('na política de precificação, impostos, comissão e margem passam de 95% do preço: a conta do preço mínimo não fecha. Confira os percentuais e salve de novo');
  var v = ComPr_num_(pr.velocidadeMediaKmh);
  if (pr.velocidadeMediaKmh !== undefined && pr.velocidadeMediaKmh !== null && pr.velocidadeMediaKmh !== '' && !(v >= 20 && v <= 130)) throw new Error('na política de precificação, a velocidade média da viagem fica entre 20 e 130 km/h. Corrija e salve de novo');
  var ar = ComPr_num_(pr.arredondarPara);
  if (pr.arredondarPara !== undefined && pr.arredondarPara !== null && pr.arredondarPara !== '' && !(ar >= 0 && ar <= 1000)) throw new Error('na política de precificação, o arredondamento do item de deslocamento fica entre R$ 0,00 (centavos) e R$ 1.000,00. Corrija e salve de novo');
  var me = ComPr_num_(pr.reajusteAlertaMeses);
  if (pr.reajusteAlertaMeses !== undefined && pr.reajusteAlertaMeses !== null && pr.reajusteAlertaMeses !== '' && !(me >= 1 && me <= 60)) throw new Error('na política de precificação, o alerta de item sem reajuste fica entre 1 e 60 meses. Corrija e salve de novo');
  if (pr.repassePadrao !== undefined && pr.repassePadrao !== null && pr.repassePadrao !== '' && !COM_PR_REPASSES[Com_up_(pr.repassePadrao)]) throw new Error('na política de precificação, o repasse padrão é "ITEM" (item separado) ou "DILUIDO" (diluído nos serviços). Corrija e salve de novo');
}

/** Forma canônica da política (para saber se a tela mudou algo nela). */
function ComPr_politicaCanonica_(pr) {
  var met = { precificacao: pr || {}, versao: 0 };
  var p = ComPr_politica_(met);
  delete p.versao;
  p.texto = Com_texto_(p.texto).replace(/\s+/g, ' ').trim();
  return JSON.stringify(p);
}

/** Benefício do Programa de conduta: { valor, kmMinimo, fonte }. Fonte: os parâmetros do programa; sem o programa, a política. */
function ComPr_beneficio_(pol) {
  var b = (pol && pol.beneficioConduta) || {};
  var r = { valor: ComPr_num_(b.valorPorColaborador), kmMinimo: ComPr_num_(b.kmMinimoTrecho), fonte: 'política de precificação (reserva: o Programa de conduta não respondeu)' };
  try {
    if (typeof Conduta_obterParametros_ === 'function' && typeof CONDUTA_SHEETS !== 'undefined' && CONDUTA_SHEETS) {
      var par = Conduta_obterParametros_() || {};
      var v = ComPr_num_(par.VALOR_INCENTIVO_MISSAO), k = ComPr_num_(par.MISSAO_KM_MINIMO);
      if (v !== null) { r.valor = v; r.fonte = 'Programa de conduta (incentivo de missão)'; }
      if (k !== null) r.kmMinimo = k;
    }
  } catch (e) { /* vale a reserva da política */ }
  if (r.valor === null) r.valor = 300;
  if (r.kmMinimo === null) r.kmMinimo = 200;
  return r;
}

// ------------------------------------------------------------
// DISTÂNCIA (sugestão pela tabela da Conduta)
// ------------------------------------------------------------
/** Destinos com km do trecho cadastrados no Programa de conduta: [{ destino, km, clienteId, cnpj }]. Nunca lança. */
function ComPr_referencias_() {
  try {
    var aba = typeof CONDUTA_SHEETS !== 'undefined' && CONDUTA_SHEETS && CONDUTA_SHEETS.DISTANCIA_REFERENCIA ? CONDUTA_SHEETS.DISTANCIA_REFERENCIA : 'qual_distancia_referencia';
    return Com_ler_(aba).filter(function (d) { return Com_s_(d.DESTINO) && ComPr_num_(d.KM_TRECHO) !== null; })
      .map(function (d) { return { destino: Com_s_(d.DESTINO), km: ComPr_num_(d.KM_TRECHO), clienteId: Com_s_(d.CLIENTE_ID), cnpj: Com_s_(d.CNPJ).replace(/\D/g, '') }; })
      .sort(function (a, b) { return a.destino.localeCompare(b.destino, 'pt-BR'); });
  } catch (e) { return []; }
}

/**
 * Sugestão de destino e km para a proposta: unidade (cidade/UF), endereço e a referência da Conduta, se houver. 01/11/2026: a
 * tabela de distâncias da Conduta mede a partir da sede de Goiânia; com outra unidade emissora (Rio de Janeiro), o km não é
 * sugerido (o vendedor digita a distância a partir da sede dela).
 */
function ComPr_sugestaoDestino_(p, refs, unidade) {
  refs = unidade && Com_up_(unidade) !== 'GO' ? [] : (refs || ComPr_referencias_());
  var un = Com_s_(p.UNIDADE_ID) ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, Com_s_(p.UNIDADE_ID)) || {} : {};
  var cli = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, Com_s_(p.CLIENTE_ID)) || {};
  var cidade = Com_s_(un.CIDADE), uf = Com_s_(un.UF);
  var destino = cidade ? cidade + (uf ? '/' + uf : '') : '';
  var cnpjs = [Com_s_(un.CNPJ_UNIDADE), Com_s_(cli.CNPJ)].map(function (c) { return c.replace(/\D/g, ''); }).filter(function (c) { return c.length === 14; });
  var ref = refs.filter(function (r) { return r.cnpj && cnpjs.indexOf(r.cnpj) >= 0; })[0] ||
    (destino ? refs.filter(function (r) { return Com_normBusca_(r.destino) === Com_normBusca_(destino); })[0] : null) ||
    refs.filter(function (r) { return r.clienteId && r.clienteId === Com_s_(p.CLIENTE_ID); })[0] || null;
  return { destino: destino || (ref ? ref.destino : ''), endereco: [Com_s_(un.ENDERECO) || Com_s_(cli.ENDERECO)].filter(Boolean).join(''), kmTrecho: ref ? ref.km : null,
    referencia: ref ? ref.destino : '', kmFonte: ref ? 'REFERENCIA_CONDUTA' : '' };
}

// ------------------------------------------------------------
// CUSTOS DA VIAGEM: normalizar, calcular, conferir
// ------------------------------------------------------------
/** 01/11/2026 (C2): valor da hora de estrada por função: o da política; vazio, o custo da hora com o custo fixo. */
function ComPr_horaEstrada_(pol, f) {
  if (pol.horaDeslocamento[f] !== null && pol.horaDeslocamento[f] !== undefined) return pol.horaDeslocamento[f];
  var c = pol.custoHora && pol.custoHora[f];
  return c === null || c === undefined ? null : Com_r2_(c * (1 + (Number(pol.custoFixoPct) || 0) / 100));
}

/** Vazio: proposta sem nada preenchido sobre a viagem. */
function ComPr_vazio_(pol) {
  return { v: 1, unidade: pol.unidade || pol.unidadePadrao || 'GO', viagem: { ha: null, motivoSem: '', equipe: { TECNICO: 0, ENGENHEIRO: 0 }, transporte: 'VEICULO_EMPRESA', origem: pol.origemUnidade || pol.origemPadrao, destino: '', kmTrecho: null, kmFonte: '',
    viagens: 1, dias: 1, noites: 0, linhas: {} }, frete: { valor: null, nsa: false, motivo: '' }, repasse: pol.repassePadrao };
}

/**
 * Tela -> custos gravados (DESLOCAMENTO_JSON). Campo que a tela não mandou fica como estava. Valor em branco na linha vale o
 * da política (fonte POLITICA); "não se aplica" automático quando o fato manda (0 km, 0 noite, trecho abaixo do mínimo da
 * Conduta, veículo da empresa) e o vendedor não escolheu outra coisa. d: a parte "deslocamento" de salvarProposta.
 */
function ComPr_normalizar_(d, anterior, pol, ctx) {
  ctx = ctx || {};
  d = d && typeof d === 'object' ? d : {};
  // 01/11/2026: unidade emissora (Goiânia padrão; Rio de Janeiro quando a filial vende). Proposta antiga sem unidade = Goiânia.
  var unAnt = anterior && typeof anterior === 'object' && Com_up_(anterior.unidade) && pol.unidades && pol.unidades[Com_up_(anterior.unidade)] ? Com_up_(anterior.unidade) : (pol.unidadePadrao || 'GO');
  var unNova = unAnt;
  if (d.unidade !== undefined && Com_s_(d.unidade) !== '') {
    unNova = Com_up_(d.unidade);
    if (pol.unidades && !pol.unidades[unNova]) throw new Error('Não foi possível salvar: a unidade emissora "' + Com_s_(d.unidade) + '" não existe. Escolha ' + Object.keys(pol.unidades).map(function (k) { return pol.unidades[k].nome; }).join(' ou '));
  }
  var polAnt = ComPr_polUnidade_(pol, unAnt);
  pol = ComPr_polUnidade_(pol, unNova);
  var base = anterior && typeof anterior === 'object' && anterior.viagem ? Com_copia_(anterior) : ComPr_vazio_(pol);
  var vz = ComPr_vazio_(pol);
  base.unidade = unNova;
  // trocou a unidade e a origem era a padrão da unidade anterior: a origem passa a ser a sede da unidade nova
  if (unNova !== unAnt && base.viagem && (!Com_s_(base.viagem.origem) || Com_s_(base.viagem.origem) === Com_s_(polAnt.origemUnidade))) base.viagem.origem = pol.origemUnidade;
  base.viagem = Object.assign(vz.viagem, base.viagem || {}); base.viagem.linhas = base.viagem.linhas || {}; base.viagem.equipe = Object.assign({ TECNICO: 0, ENGENHEIRO: 0 }, base.viagem.equipe || {});
  base.frete = Object.assign(vz.frete, base.frete || {});
  var tv = d.viagem && typeof d.viagem === 'object' ? d.viagem : {}, v = base.viagem;
  if (tv.ha !== undefined) {
    var h = Com_up_(tv.ha);
    v.ha = tv.ha === true || h === 'SIM' || h === 'TRUE' ? true : (tv.ha === false || h === 'NAO' || h === 'NÃO' || h === 'FALSE' ? false : null);
  }
  if (tv.motivoSem !== undefined) v.motivoSem = Com_texto_(tv.motivoSem, 500);
  if (tv.tecnicos !== undefined) v.equipe.TECNICO = ComPr_inteiro_(tv.tecnicos, 'o número de técnicos', 0, 20, 0);
  if (tv.engenheiros !== undefined) v.equipe.ENGENHEIRO = ComPr_inteiro_(tv.engenheiros, 'o número de engenheiros', 0, 20, 0);
  if (tv.transporte !== undefined) { var tr = Com_up_(tv.transporte); if (tr && !COM_PR_TRANSPORTES[tr]) throw new Error('Não foi possível salvar: o transporte "' + Com_s_(tv.transporte) + '" não existe. Escolha veículo da empresa, veículo locado, avião, ônibus ou outro'); v.transporte = tr || 'VEICULO_EMPRESA'; }
  if (tv.origem !== undefined) v.origem = Com_texto_(tv.origem, 200) || pol.origemUnidade || pol.origemPadrao;
  if (tv.destino !== undefined) v.destino = Com_texto_(tv.destino, 300);
  if (tv.kmTrecho !== undefined) {
    var km = Com_s_(tv.kmTrecho) === '' ? null : Com_num_(tv.kmTrecho);
    if (km !== null && !(isFinite(km) && km >= 0 && km <= 5000)) throw new Error('Não foi possível salvar: o km do trecho (só a ida) precisa ser um número de 0 a 5.000 (veio "' + Com_s_(tv.kmTrecho).slice(0, 20) + '"). Use 0 para atendimento na mesma cidade');
    v.kmTrecho = km === null ? null : Math.round(km * 10) / 10;
    v.kmFonte = tv.kmFonte !== undefined ? Com_up_(tv.kmFonte) || 'DIGITADO' : 'DIGITADO';
  }
  if (tv.viagens !== undefined) v.viagens = ComPr_inteiro_(tv.viagens, 'o número de viagens', 1, 365, 1);
  if (tv.dias !== undefined) v.dias = ComPr_inteiro_(tv.dias, 'o número de dias por viagem', 1, 365, 1);
  if (tv.noites !== undefined) v.noites = ComPr_inteiro_(tv.noites, 'o número de noites por viagem', 0, 365, 0);
  var tl = tv.linhas && typeof tv.linhas === 'object' ? tv.linhas : {};
  var benef = ctx.beneficio || ComPr_beneficio_(pol);
  COM_PR_LINHAS.forEach(function (L) {
    // 01/11/2026 (decisão do dono): a taxa por viagem era o Incentivo de Missão em dobro; nas gravações novas fica sempre fora
    if (L.codigo === 'TAXA') { v.linhas.TAXA = { nsa: true, auto: true, motivo: 'Não se aplica: o R$ 300 por viagem é o Incentivo de Missão, que já está na linha do incentivo (decisão do dono, 01/11/2026).', fonte: '', valor: 0 }; return; }
    var a = v.linhas[L.codigo] || {}, t = tl[L.codigo] || {}, n = { nsa: false, motivo: '', auto: false, fonte: '' };
    // a tela devolve com "auto" a linha que estava em "não se aplica" automático: não é escolha do vendedor
    var telaAuto = !!t.auto && Com_s_(t.auto) !== 'false';
    var vendedorNsa = telaAuto ? false : (t.nsa !== undefined ? !!t.nsa && Com_s_(t.nsa) !== 'false' : (!!a.nsa && !a.auto));
    n.nsa = vendedorNsa;
    n.motivo = telaAuto ? '' : (t.motivo !== undefined ? Com_texto_(t.motivo, 300) : (a.auto ? '' : Com_s_(a.motivo)));
    if (L.porFuncao) {
      var av = a.valor && typeof a.valor === 'object' ? a.valor : {}, fonteAnt = a.fonteFuncao || {};
      n.valor = {}; n.fonteFuncao = {};
      Object.keys(COM_PR_FUNCOES).forEach(function (f) {
        var k = f === 'TECNICO' ? 'valorTecnico' : 'valorEngenheiro', ja = t[k] !== undefined;
        var val = ja ? ComPr_valor_(t[k], L.nome.toLowerCase() + ' do ' + COM_PR_FUNCOES[f].toLowerCase()) : (fonteAnt[f] === 'POLITICA' ? null : ComPr_num_(av[f]));
        var fonte = val === null ? '' : 'VENDEDOR';
        var padrao = L.codigo === 'DIARIA' ? pol.diariaPessoaDia[f] : ComPr_horaEstrada_(pol, f);
        if (val === null && padrao !== null) { val = padrao; fonte = 'POLITICA'; }
        n.valor[f] = val; n.fonteFuncao[f] = fonte;
      });
      if (L.codigo === 'HORAS') {
        var hs = t.horas !== undefined ? (Com_s_(t.horas) === '' ? null : Com_num_(t.horas)) : (a.horasFonte === 'VENDEDOR' ? ComPr_num_(a.horas) : null);
        if (hs !== null && !(isFinite(hs) && hs >= 0 && hs <= 200)) throw new Error('Não foi possível salvar: as horas de deslocamento por viagem precisam ser um número de 0 a 200');
        n.horasFonte = hs === null ? 'CALCULO' : 'VENDEDOR';
        n.horas = hs === null ? (v.kmTrecho !== null && pol.velocidadeMediaKmh ? Math.round(v.kmTrecho * 2 / pol.velocidadeMediaKmh * 10) / 10 : 0) : Math.round(hs * 10) / 10;
      }
    } else {
      var ja2 = t.valor !== undefined;
      var val2 = ja2 ? ComPr_valor_(t.valor, L.nome.toLowerCase()) : (a.fonte === 'POLITICA' ? null : ComPr_num_(a.valor));
      n.fonte = val2 === null ? '' : 'VENDEDOR';
      var padrao2 = L.codigo === 'KM' ? pol.valorKm : L.codigo === 'ALIMENTACAO' ? pol.alimentacaoPessoaDia : L.codigo === 'HOSPEDAGEM' ? pol.hospedagemPessoaNoite : L.codigo === 'CONDUTA' ? benef.valor : L.codigo === 'TAXA' ? pol.taxaViagem.valor : null;
      if (val2 === null && padrao2 !== null && padrao2 !== undefined) { val2 = padrao2; n.fonte = L.codigo === 'CONDUTA' ? 'CONDUTA' : 'POLITICA'; }
      n.valor = val2;
      if (L.codigo === 'OUTROS') n.descricao = t.descricao !== undefined ? Com_texto_(t.descricao, 200) : Com_s_(a.descricao);
    }
    // "não se aplica" automático pelos fatos (o vendedor pode marcar outra coisa; a Conduta abaixo do mínimo é regra do programa)
    var auto = '';
    if (L.codigo === 'KM' && v.kmTrecho === 0) auto = 'Atendimento local: 0 km de deslocamento.';
    if (L.codigo === 'PEDAGIO' && v.kmTrecho === 0) auto = 'Atendimento local: sem pedágio.';
    if (L.codigo === 'HOSPEDAGEM' && v.noites === 0) auto = 'Sem pernoite (0 noite por viagem).';
    if (L.codigo === 'COMBUSTIVEL' && v.transporte === 'VEICULO_EMPRESA') auto = 'Veículo da empresa: o valor por km rodado já cobre o combustível.';
    if (L.codigo === 'CONDUTA' && v.kmTrecho !== null && v.kmTrecho < benef.kmMinimo) auto = 'Trecho de ' + ComPr_qtd_(v.kmTrecho) + ' km, abaixo do mínimo de ' + ComPr_qtd_(benef.kmMinimo) + ' km do Programa de conduta: não há Incentivo de Missão nesta viagem.';
    // 01/11/2026 (C2): alimentação só fora da região da sede; diária sem valor na política; horas de estrada só em trecho longo
    if (L.codigo === 'ALIMENTACAO' && pol.alimentacaoForaDaRegiao && v.kmTrecho !== null && v.kmTrecho <= pol.taxaViagem.kmMinimo && n.fonte !== 'VENDEDOR') auto = 'Trecho de ' + ComPr_qtd_(v.kmTrecho) + ' km, até ' + ComPr_qtd_(pol.taxaViagem.kmMinimo) + ' km (região da sede): sem alimentação.';
    if (L.codigo === 'DIARIA' && !vendedorNsa && Object.keys(COM_PR_FUNCOES).every(function (fu) { return !(Number(v.equipe[fu]) > 0) || (n.fonteFuncao[fu] !== 'VENDEDOR' && pol.diariaPessoaDia[fu] === null); }))
      auto = 'Sem diária em dinheiro: a alimentação e a hospedagem cobrem a estadia (política de precificação).';
    if (L.codigo === 'HORAS' && !vendedorNsa && n.horasFonte !== 'VENDEDOR' && Object.keys(COM_PR_FUNCOES).every(function (fu) { return n.fonteFuncao[fu] !== 'VENDEDOR'; }) && v.kmTrecho !== null && v.kmTrecho <= (pol.estradaKmMinimo || 0))
      auto = 'Trecho de ' + ComPr_qtd_(v.kmTrecho) + ' km, até ' + ComPr_qtd_(pol.estradaKmMinimo) + ' km: o tempo de estrada já está nas horas faturáveis.';
    if (auto) {
      // pedágio e combustível: o vendedor pode informar um valor mesmo assim (pedágio urbano, abastecimento extra)
      var informou = (L.codigo === 'PEDAGIO' || L.codigo === 'COMBUSTIVEL') && !vendedorNsa && n.fonte === 'VENDEDOR' && Number(n.valor) > 0;
      var motivoProprio = vendedorNsa && Com_s_(n.motivo).length >= 5 && L.codigo !== 'CONDUTA';
      if (!informou && !motivoProprio) { n.nsa = true; n.auto = true; n.motivo = auto; }
    }
    v.linhas[L.codigo] = n;
  });
  if (d.frete && typeof d.frete === 'object') {
    var f = d.frete;
    if (f.valor !== undefined) base.frete.valor = ComPr_valor_(f.valor, 'frete e entrega');
    if (f.nsa !== undefined) base.frete.nsa = !!f.nsa && Com_s_(f.nsa) !== 'false';
    if (f.motivo !== undefined) base.frete.motivo = Com_texto_(f.motivo, 300);
  }
  // 01/11/2026 (C2): preço do item "Despesas de deslocamento e estadia" digitado pelo vendedor (vazio = o calculado)
  if (d.precoInformado !== undefined) base.precoInformado = Com_s_(d.precoInformado) === '' ? null : ComPr_valor_(d.precoInformado, 'preço do deslocamento');
  if (d.repasse !== undefined) { var rp = Com_up_(d.repasse); if (rp && !COM_PR_REPASSES[rp]) throw new Error('Não foi possível salvar: o repasse "' + Com_s_(d.repasse) + '" não existe. Escolha item separado ou diluído nos serviços'); base.repasse = rp || pol.repassePadrao; }
  if (!COM_PR_REPASSES[base.repasse]) base.repasse = pol.repassePadrao;
  base.v = 1;
  if (ctx.eu) { base.por = ctx.eu.nome; base.em = Com_agora_(); }
  return base;
}

/** Custo da viagem, linha por linha. { pessoas, linhas[{codigo,nome,quantidadeTxt,valorTxt,total,nsa,motivo,auto}], custo, beneficio, horas } */
function ComPr_calcularViagem_(desl, pol) {
  var r = { pessoas: 0, linhas: [], custo: 0, beneficio: 0, ha: false };
  var v = desl && desl.viagem;
  if (!v || v.ha !== true) return r;
  r.ha = true;
  var T = Number(v.equipe.TECNICO) || 0, E = Number(v.equipe.ENGENHEIRO) || 0, P = T + E, km = Number(v.kmTrecho) || 0, vg = Number(v.viagens) || 1, dias = Number(v.dias) || 1, noites = Number(v.noites) || 0;
  r.pessoas = P;
  COM_PR_LINHAS.forEach(function (L) {
    var l = v.linhas[L.codigo] || { valor: null, nsa: false };
    // 01/11/2026: a taxa por viagem só aparece na proposta antiga que a gravou (com valor e sem "não se aplica")
    if (L.codigo === 'TAXA' && (l.nsa || !(Number(l.valor) > 0))) return;
    var x = { codigo: L.codigo, nome: L.nome, unidade: L.unidade, nsa: !!l.nsa, motivo: Com_s_(l.motivo), auto: !!l.auto, fonte: Com_s_(l.fonte), total: 0, quantidade: 0, quantidadeTxt: '', valorTxt: '' };
    var val = Number(l.valor) || 0;
    if (L.codigo === 'KM') { x.quantidade = km * 2 * vg; x.quantidadeTxt = ComPr_qtd_(x.quantidade) + ' km (' + ComPr_qtd_(km) + ' km x 2' + (vg > 1 ? ' x ' + vg + ' viagens' : '') + ')'; x.total = x.quantidade * val; }
    else if (L.codigo === 'PEDAGIO') { x.quantidade = vg; x.quantidadeTxt = Com_plural_(vg, 'viagem', 'viagens'); x.total = vg * val; }
    else if (L.codigo === 'ALIMENTACAO') { x.quantidade = P * dias * vg; x.quantidadeTxt = Com_plural_(P, 'pessoa', 'pessoas') + ' x ' + Com_plural_(dias * vg, 'dia', 'dias'); x.total = x.quantidade * val; }
    else if (L.codigo === 'HOSPEDAGEM') { x.quantidade = P * noites * vg; x.quantidadeTxt = Com_plural_(P, 'pessoa', 'pessoas') + ' x ' + Com_plural_(noites * vg, 'noite', 'noites'); x.total = x.quantidade * val; }
    else if (L.codigo === 'CONDUTA') { x.quantidade = P * vg; x.quantidadeTxt = Com_plural_(P, 'colaborador', 'colaboradores') + ' x ' + Com_plural_(vg, 'viagem', 'viagens'); x.total = x.quantidade * val; }
    else if (L.codigo === 'TAXA') { x.quantidade = vg; x.quantidadeTxt = Com_plural_(vg, 'viagem', 'viagens'); x.total = vg * val; }
    else if (L.codigo === 'COMBUSTIVEL') { x.quantidade = vg; x.quantidadeTxt = Com_plural_(vg, 'viagem', 'viagens'); x.total = vg * val; }
    else if (L.codigo === 'OUTROS') { x.quantidade = 1; x.quantidadeTxt = Com_s_(l.descricao) || 'total'; x.total = val; }
    else if (L.porFuncao) {
      var vv = l.valor && typeof l.valor === 'object' ? l.valor : {}, vt = Number(vv.TECNICO) || 0, ve = Number(vv.ENGENHEIRO) || 0;
      var fator = L.codigo === 'DIARIA' ? dias * vg : (Number(l.horas) || 0) * vg;
      x.quantidade = P * fator;
      x.quantidadeTxt = (L.codigo === 'DIARIA' ? Com_plural_(dias * vg, 'dia', 'dias') : ComPr_qtd_(Number(l.horas) || 0) + ' h por viagem' + (vg > 1 ? ' x ' + vg : '')) + ' · ' + [T ? Com_plural_(T, 'técnico', 'técnicos') : '', E ? Com_plural_(E, 'engenheiro', 'engenheiros') : ''].filter(Boolean).join(' e ');
      x.total = (T * vt + E * ve) * fator;
      x.valorTxt = [T ? 'técnico ' + Com_moeda_(vt) : '', E ? 'engenheiro ' + Com_moeda_(ve) : ''].filter(Boolean).join(' · ');
      x.horas = L.codigo === 'HORAS' ? Number(l.horas) || 0 : undefined;
    }
    if (!x.valorTxt) x.valorTxt = l.valor === null || l.valor === undefined ? '' : Com_moeda_(val) + ' ' + L.unidade;
    if (x.nsa) x.total = 0;
    x.total = Com_r2_(x.total);
    x.totalTxt = Com_moeda_(x.total);
    r.custo += x.total;
    if (L.codigo === 'CONDUTA') r.beneficio = x.total;
    r.linhas.push(x);
  });
  r.custo = Com_r2_(r.custo); r.custoTxt = Com_moeda_(r.custo); r.beneficioTxt = Com_moeda_(r.beneficio);
  return r;
}

/** Custo do frete (0 quando "não se aplica" ou sem valor). */
function ComPr_custoFrete_(desl) { var f = desl && desl.frete; return f && !f.nsa ? Com_r2_(Number(f.valor) || 0) : 0; }

/** Preço de repasse de um custo: custo x (1 + margem sobre deslocamento) / (1 - impostos), arredondado para cima. */
function ComPr_precoRepasse_(custo, pol) {
  if (!(custo > 0)) return 0;
  var imp = (pol.impostosPct || 0) / 100, md = (pol.margemDeslocamentoPct || 0) / 100;
  return ComPr_arredondarCima_(custo * (1 + md) / Math.max(0.05, 1 - imp), pol.arredondarPara);
}

/** O que precisa ser conferido nesta proposta pelo tipo de orçamento: { viagem, frete }. */
function ComPr_exige_(tipoOrc, desl) {
  var viagemHa = !!(desl && desl.viagem && desl.viagem.ha === true);
  return { viagem: tipoOrc !== 'PRODUTOS' || viagemHa, frete: tipoOrc !== 'SERVICOS' };
}

/**
 * Checklist obrigatório de custos. { exige{viagem,frete}, faltas[{codigo,texto}], ok }. Vale para o rascunho (Concluir) e
 * para a revisão da gestora. Mensagens dizem o que falta e o que fazer.
 */
function ComPr_checklist_(desl, tipoOrc, pol) {
  pol = pol || ComPr_politica_();
  var ex = ComPr_exige_(tipoOrc, desl), faltas = [];
  var add = function (c, t) { faltas.push({ codigo: c, texto: t }); };
  var v = desl && desl.viagem;
  if (ex.viagem) {
    if (!v || (v.ha !== true && v.ha !== false)) add('VIAGEM', 'diga se o serviço tem viagem (Sim, com os custos; ou Não, com o motivo, por exemplo "serviço no laboratório da Metrolabs")');
    else if (v.ha === false) { if (Com_s_(v.motivoSem).length < 10) add('VIAGEM', 'escreva por que não há viagem (pelo menos 10 letras)'); }
    else {
      if (!((Number(v.equipe.TECNICO) || 0) + (Number(v.equipe.ENGENHEIRO) || 0))) add('EQUIPE', 'informe quantos técnicos e quantos engenheiros vão');
      if (!Com_s_(v.destino)) add('DESTINO', 'informe o destino (cidade/UF ou endereço da unidade)');
      if (v.kmTrecho === null || v.kmTrecho === undefined) add('KM_TRECHO', 'informe o km do trecho, só a ida (0 para atendimento na mesma cidade)');
      COM_PR_LINHAS.forEach(function (L) {
        var l = v.linhas[L.codigo] || {};
        if (l.nsa) { if (!l.auto && Com_s_(l.motivo).length < 5) add(L.codigo, L.nome + ': "não se aplica" precisa do motivo (pelo menos 5 letras)'); return; }
        if (L.codigo === 'OUTROS') { if (Number(l.valor) > 0 && Com_s_(l.descricao).length < 3) add(L.codigo, 'outros custos da viagem: diga o que é o valor informado'); return; }
        if (!L.obrigatoria) return;
        if (L.porFuncao) {
          Object.keys(COM_PR_FUNCOES).forEach(function (f) {
            if (!(Number(v.equipe[f]) > 0)) return;
            if (!(Number((l.valor || {})[f]) > 0)) add(L.codigo + '_' + f, 'Diária do ' + COM_PR_FUNCOES[f].toLowerCase() + ': sem valor' + (pol.diariaPessoaDia[f] === null ? ' (a política ainda não tem o valor padrão)' : '') + '; informe o valor por pessoa por dia ou marque "não se aplica" com o motivo');
          });
          return;
        }
        if (!(Number(l.valor) > 0)) {
          var semPadrao = (L.codigo === 'ALIMENTACAO' && pol.alimentacaoPessoaDia === null) || (L.codigo === 'HOSPEDAGEM' && pol.hospedagemPessoaNoite === null) || (L.codigo === 'KM' && pol.valorKm === null);
          add(L.codigo, L.nome + ': sem valor' + (semPadrao ? ' (a política ainda não tem o valor padrão)' : '') + '; informe o valor ' + L.unidade + ' ou marque "não se aplica" com o motivo');
        }
      });
    }
  }
  if (ex.frete) {
    var f = (desl && desl.frete) || {};
    if (f.nsa) { if (Com_s_(f.motivo).length < 5) add('FRETE', 'frete e entrega: "não se aplica" precisa do motivo (por exemplo "cliente retira na Metrolabs")'); }
    else if (!(Number(f.valor) > 0)) add('FRETE', 'frete e entrega: informe o custo do frete ou marque "não se aplica" com o motivo (por exemplo "entrega junto com a visita técnica" ou "cliente retira")');
  }
  return { exige: ex, faltas: faltas, ok: !faltas.length };
}

/** Texto do item para o CLIENTE (nunca cita o benefício da Conduta nem valores internos). */
function ComPr_detalheCliente_(v, calc) {
  var T = Number(v.equipe.TECNICO) || 0, E = Number(v.equipe.ENGENHEIRO) || 0, P = T + E;
  var eq = Com_plural_(P, 'profissional', 'profissionais') + (T && E ? ' (' + Com_plural_(E, 'engenheiro', 'engenheiros') + ' e ' + Com_plural_(T, 'técnico', 'técnicos') + ')' : '');
  var trecho = Com_s_(v.origem) && Com_s_(v.destino) ? ' de ' + Com_s_(v.origem) + ' a ' + Com_s_(v.destino) : (Com_s_(v.destino) ? ' a ' + Com_s_(v.destino) : '');
  var tem = function (c) { return calc.linhas.some(function (l) { return l.codigo === c && l.total > 0; }); };
  var inclui = [];
  if (tem('KM') || tem('COMBUSTIVEL')) inclui.push('deslocamento');
  if (tem('PEDAGIO')) inclui.push('pedágios');
  if (tem('ALIMENTACAO')) inclui.push('alimentação');
  if (tem('HOSPEDAGEM')) inclui.push('hospedagem');
  if (tem('DIARIA')) inclui.push('diárias');
  if (tem('HORAS')) inclui.push('tempo de deslocamento da equipe');
  var lista = inclui.length > 1 ? inclui.slice(0, -1).join(', ') + ' e ' + inclui[inclui.length - 1] : inclui.join('');
  return 'Equipe de ' + eq + '; ' + Com_plural_(Number(v.viagens) || 1, 'viagem', 'viagens') + trecho + '; ' + Com_plural_(Number(v.dias) || 1, 'dia', 'dias') + (Number(v.noites) ? ' e ' + Com_plural_(v.noites, 'noite', 'noites') : '') + ' por viagem.' +
    (lista ? ' Inclui ' + lista + '.' : '');
}

/** Itens automáticos da proposta pelo repasse ITEM: viagem e frete (com o custo interno). Lista vazia no repasse diluído. */
function ComPr_itensAuto_(desl, pol) {
  if (!desl || desl.repasse !== 'ITEM') return [];
  pol = ComPr_polUnidade_(pol, desl.unidade);
  var l = [], calc = ComPr_calcularViagem_(desl, pol);
  if (calc.ha && calc.custo > 0) {
    var pv = ComPr_precoRepasse_(calc.custo, pol);
    // 01/11/2026 (C2): preço digitado pelo vendedor; a tabela fica a calculada (abaixo dela conta como desconto)
    var pi = desl.precoInformado !== null && desl.precoInformado !== undefined ? Com_r2_(desl.precoInformado) : null;
    l.push({ ordem: 0, produtoId: '', codigo: '', tipo: 'SERVICO', auto: 'DESLOCAMENTO', descricao: COM_PR_ITEM_VIAGEM, detalhe: ComPr_detalheCliente_(desl.viagem, calc), equipamentoId: '', equipamentoTexto: '',
      unidade: 'vb', quantidade: 1, precoUnitario: pi === null ? pv : pi, precoTabela: pv, custoUnitario: calc.custo, precoDiferente: pi !== null && Math.abs(pi - pv) > 0.004 });
  }
  var cf = ComPr_custoFrete_(desl);
  if (cf > 0) {
    var pf = ComPr_precoRepasse_(cf, pol);
    l.push({ ordem: 0, produtoId: '', codigo: '', tipo: 'PRODUTO', auto: 'FRETE', descricao: COM_PR_ITEM_FRETE, detalhe: 'Transporte dos produtos até o endereço de entrega indicado nesta proposta.', equipamentoId: '', equipamentoTexto: '',
      unidade: 'vb', quantidade: 1, precoUnitario: pf, precoTabela: pf, custoUnitario: cf, precoDiferente: false });
  }
  return l;
}

// ------------------------------------------------------------
// MARGEM
// ------------------------------------------------------------
/**
 * Precificação da proposta (01/11/2026, decisão do dono). Sobra = receita dos itens (serviços e produtos, já com o desconto geral)
 * − impostos (serviço: % da unidade sobre a receita; produto: % da unidade sobre a receita − créditos sobre o custo) − comissão −
 * custos diretos (itens com custo e, quando a viagem é diluída, o custo da viagem e do frete). O item de deslocamento e o frete
 * automáticos são repasse a custo mais impostos: ficam FORA da sobra (receita e custo) e o desconto geral não os reduz. A sobra
 * é antes de IR e CSLL. Itens sem custo deixam a margem parcial (otimista). Sem Date cru.
 */
function ComPr_analise_(itens, descontoGeral, desl, pol) {
  pol = ComPr_polUnidade_(pol || ComPr_politica_(), desl && desl.unidade);
  var calc = ComP_calcular_(itens, descontoGeral);
  var total = calc.total, imp = pol.impostosPct === null || pol.impostosPct === undefined ? 0 : pol.impostosPct, com = pol.comissaoPct === null || pol.comissaoPct === undefined ? 0 : pol.comissaoPct;
  var impP = Number(pol.impostosProdutoPct) || 0, cr = Number(pol.creditoProdutoPct) || 0, mn = pol.margemMinPct, al = pol.margemAlvoPct;
  var custoItens = 0, semCusto = 0, receitaAuto = {}, receitaServ = 0, receitaProd = 0, impItens = 0, custoServ = 0, custoProdBase = 0;
  var fator = calc.fatorItens === undefined ? 1 : calc.fatorItens;
  (itens || []).forEach(function (i) {
    var q = Number(i.quantidade) || 0, pu = Number(i.precoUnitario) || 0;
    if (i.auto) { receitaAuto[i.auto] = (receitaAuto[i.auto] || 0) + q * pu; return; }
    var rec = q * pu * fator, temCusto = i.custoUnitario !== null && i.custoUnitario !== undefined && i.custoUnitario !== '', c = temCusto ? q * Number(i.custoUnitario) : 0;
    if (i.tipo === 'PRODUTO') { receitaProd += rec; impItens += rec * impP / 100 - c * cr / 100; custoProdBase += c * (1 - cr / 100); }
    else { receitaServ += rec; impItens += rec * imp / 100; custoServ += c; }
    if (temCusto) custoItens += c; else semCusto++;
  });
  var cv = ComPr_calcularViagem_(desl, pol), cf = ComPr_custoFrete_(desl);
  var custoDesl = Com_r2_(cv.custo + cf), custoTotal = Com_r2_(custoItens + custoDesl);
  // custo coberto pelo item automático (repasse) fica fora da sobra; o resto (repasse diluído, ou sem o item) entra no custo
  var foraViagem = receitaAuto.DESLOCAMENTO !== undefined ? cv.custo : 0, foraFrete = receitaAuto.FRETE !== undefined ? cf : 0;
  var custoDiluido = Com_r2_(Math.max(0, custoDesl - foraViagem - foraFrete));
  var receitaAutoTotal = Com_r2_((receitaAuto.DESLOCAMENTO || 0) + (receitaAuto.FRETE || 0));
  var receitaItens = Com_r2_(receitaServ + receitaProd);
  var impostosItens = Com_r2_(impItens), impostosRepasse = Com_r2_(receitaAutoTotal * imp / 100);
  var impostos = Com_r2_(impostosItens + impostosRepasse);
  // comissão sobre a venda dos itens (o deslocamento e o frete são repasse de custo: sem comissão)
  var comissao = Com_r2_(Math.max(0, receitaItens) * com / 100);
  // Revisão de 01/11/2026: o deslocamento fica fora da sobra quando cobre custo + impostos; o que o preço digitado do deslocamento
  // deixar de cobrir (naoRepassado) sai da sobra. Sem isso, o vendedor baixava o deslocamento dentro da própria alçada de
  // desconto e a empresa perdia dinheiro com a sobra ainda "acima de 35%", sem passar pela Diretoria.
  var naoRepassado = null;
  if (foraViagem + foraFrete > 0) naoRepassado = Com_r2_(Math.max(0, foraViagem + foraFrete - receitaAutoTotal * (1 - imp / 100)));
  var perdaRepasse = naoRepassado > 0 ? naoRepassado : 0;
  var margemValor = Com_r2_(receitaItens - impostosItens - comissao - custoItens - custoDiluido - perdaRepasse);
  var margemPct = receitaItens > 0 ? Math.round(margemValor / receitaItens * 10000) / 100 : null;
  var abaixoMin = mn !== null && mn !== undefined && margemPct !== null && margemPct < mn - 1e-9;
  var abaixoAlvo = al !== null && al !== undefined && margemPct !== null && margemPct < al - 1e-9;
  // preço dos itens que garante a margem m: serviços (e viagem diluída) ÷ (1 − imp − com − m); produtos x (1 − créditos) ÷ (1 − impP − com − m)
  var precoItensPara = function (m) {
    if (semCusto || m === null || m === undefined) return null;
    var dS = 1 - (imp + com + m) / 100, dP = 1 - (impP + com + m) / 100;
    if (!(dS > 0.05) || (custoProdBase > 0 && !(dP > 0.05))) return null;
    return Com_r2_((custoServ + custoDiluido + perdaRepasse) / dS + (custoProdBase > 0 ? custoProdBase / dP : 0));
  };
  var piMin = precoItensPara(mn), piAlvo = precoItensPara(al);
  var precoMin = piMin === null ? null : Com_r2_(piMin + receitaAutoTotal), precoAlvo = piAlvo === null ? null : Com_r2_(piAlvo + receitaAutoTotal);
  var repasse = desl ? desl.repasse : '';
  var r = { total: total, impostosPct: pol.impostosPct, impostos: impostos, impostosItens: impostosItens, impostosRepasse: impostosRepasse, semImpostos: pol.impostosPct === null || pol.impostosPct === undefined,
    impostosServicoPct: imp, impostosProdutoPct: impP, creditoProdutoPct: cr, unidade: pol.unidade, unidadeNome: pol.unidadeNome,
    comissaoPct: com, comissao: comissao, custoItens: Com_r2_(custoItens), custoViagem: cv.custo, custoFrete: cf, custoDeslocamento: custoDesl, custoDiluido: custoDiluido,
    receitaItens: receitaItens, receitaServicos: Com_r2_(receitaServ), receitaProdutos: Com_r2_(receitaProd),
    beneficio: cv.beneficio, custoTotal: custoTotal, margemValor: margemValor, margemPct: margemPct, completa: semCusto === 0, itensSemCusto: semCusto,
    margemMinPct: mn, margemAlvoPct: al, abaixoMin: abaixoMin, abaixoAlvo: abaixoAlvo, precoMinimo: precoMin, precoAlvo: precoAlvo, precoMinimoItens: piMin, precoAlvoItens: piAlvo, repasse: repasse,
    receitaDeslocamento: receitaAutoTotal, naoRepassado: naoRepassado };
  r.situacao = margemPct === null ? 'SEM_VALOR' : abaixoMin ? 'ABAIXO_MIN' : abaixoAlvo ? 'ABAIXO_ALVO' : (mn === null && al === null ? 'SEM_POLITICA' : 'OK');
  r.situacaoTxt = { SEM_VALOR: 'sem valor para calcular', ABAIXO_MIN: 'sobra abaixo da mínima: precisa da aprovação da Diretoria', ABAIXO_ALVO: 'acima da sobra mínima, abaixo da margem alvo', SEM_POLITICA: 'a política ainda não tem margem mínima nem alvo', OK: 'dentro da margem alvo' }[r.situacao];
  // viagem diluída: quanto somar ao preço dos serviços para a sobra mínima cobrir o custo dela (custo ÷ (1 − impostos − comissão − mínima))
  r.diluir = repasse === 'DILUIDO' && custoDesl > 0 ? (ComPr_precoServicoConta_(custoDesl, pol) || Com_r2_(ComPr_precoRepasse_(custoDesl, Object.assign({}, pol, { arredondarPara: 0.01 })))) : 0;
  return r;
}

/** Precificação de uma linha de COM_PROPOSTAS. { desl, analise, checklist, tipo } */
function ComPr_daProposta_(p, pol, itens) {
  pol = pol || ComPr_politica_();
  itens = itens || Com_json_(p.ITENS_JSON, []) || [];
  var desl = Com_json_(p.DESLOCAMENTO_JSON, null);
  var tipo = ComP_tipoOrcamento_(p, itens).tipo;
  // 01/11/2026: impostos e origem da unidade emissora da proposta (sem unidade gravada = Goiânia)
  pol = ComPr_polUnidade_(pol, desl && desl.unidade);
  return { desl: desl, tipo: tipo, pol: pol, analise: ComPr_analise_(itens, p.DESCONTO_GERAL, desl, pol), checklist: ComPr_checklist_(desl, tipo, pol) };
}

/** Fotografia gravada ao concluir (PRECIFICACAO_JSON): números do painel sem recalcular com a política nova. */
function ComPr_fotografia_(x, pol) {
  var a = x.analise, d = x.desl || {}, v = d.viagem || {};
  return { em: Com_agora_(), politicaVersao: pol.versao, unidade: a.unidade || 'GO', receitaItens: a.receitaItens, margemValor: a.margemValor, custoDiluido: a.custoDiluido, margemMinPct: a.margemMinPct,
    total: a.total, custoTotal: a.custoTotal, impostos: a.impostos, margemPct: a.margemPct, completa: a.completa, abaixoMin: a.abaixoMin, abaixoAlvo: a.abaixoAlvo,
    custoViagem: a.custoViagem, custoFrete: a.custoFrete, beneficio: a.beneficio, repasse: a.repasse, receitaDeslocamento: a.receitaDeslocamento, naoRepassado: a.naoRepassado,
    viagem: v.ha === true, semViagemMotivo: v.ha === false ? Com_s_(v.motivoSem) : '', pessoas: (Number((v.equipe || {}).TECNICO) || 0) + (Number((v.equipe || {}).ENGENHEIRO) || 0), kmTrecho: v.kmTrecho === undefined ? null : v.kmTrecho };
}

/** Para a tela da proposta. Vendedor: os custos da viagem (ele preenche) e só a situação da margem; gestão: tudo. */
function ComPr_paraTela_(eu, p, itens, editavel) {
  var polBase = ComPr_politica_(), x = ComPr_daProposta_(p, polBase, itens), pol = x.pol || polBase;
  var desl = x.desl || ComPr_vazio_(pol), calc = ComPr_calcularViagem_(desl, pol), benef = ComPr_beneficio_(pol);
  // 01/11/2026: a taxa por viagem só aparece na proposta antiga que a gravou com valor
  var tx = desl.viagem && desl.viagem.linhas && desl.viagem.linhas.TAXA, mostraTaxa = !!(tx && !tx.nsa && Number(tx.valor) > 0);
  var t = { dados: desl, preenchido: !!x.desl, calculo: calc, custoFrete: ComPr_custoFrete_(desl), custoFreteTxt: Com_moeda_(ComPr_custoFrete_(desl)), checklist: x.checklist, tipo: x.tipo,
    linhas: COM_PR_LINHAS.filter(function (L) { return L.codigo !== 'TAXA' || mostraTaxa; }), funcoes: COM_PR_FUNCOES, transportes: COM_PR_TRANSPORTES, repasses: COM_PR_REPASSES, beneficio: benef,
    unidade: pol.unidade, unidades: Object.keys(pol.unidades).map(function (k) { return { codigo: k, nome: pol.unidades[k].nome, origem: pol.unidades[k].origem }; }),
    politica: { valorKm: pol.valorKm, alimentacaoPessoaDia: pol.alimentacaoPessoaDia, diariaPessoaDia: pol.diariaPessoaDia, hospedagemPessoaNoite: pol.hospedagemPessoaNoite, horaDeslocamento: pol.horaDeslocamento,
      velocidadeMediaKmh: pol.velocidadeMediaKmh, origemPadrao: pol.origemUnidade || pol.origemPadrao, repassePadrao: pol.repassePadrao, versao: pol.versao, incompleta: ComPr_politicaIncompleta_(pol).map(function (f) { return f.nome; }),
      taxaViagem: pol.taxaViagem, estradaKmMinimo: pol.estradaKmMinimo, horaEstrada: { TECNICO: ComPr_horaEstrada_(pol, 'TECNICO'), ENGENHEIRO: ComPr_horaEstrada_(pol, 'ENGENHEIRO') } } };
  // 01/11/2026: itens com preço abaixo do que garante a sobra mínima (o vendedor vê só o aviso; a gestão vê o piso)
  t.abaixoPiso = [];
  (itens || []).forEach(function (i, k) {
    var piso = ComPr_pisoItem_(i, pol);
    if (piso === null || !(Number(i.precoUnitario) < piso - 0.004)) return;
    var o = { ordem: k + 1, descricao: Com_s_(i.descricao).slice(0, 80) };
    if (eu && eu.veCusto) { o.piso = piso; o.pisoTxt = Com_moeda_(piso); }
    t.abaixoPiso.push(o);
  });
  // 01/11/2026 (C2): preço digitado do deslocamento e o alerta quando fica abaixo do custo
  t.precoInformado = desl.precoInformado === undefined ? null : desl.precoInformado;
  t.abaixoDoCusto = t.precoInformado !== null && calc.custo > 0 && t.precoInformado < calc.custo - 0.004;
  var a = x.analise;
  t.precoRepasse = desl.repasse === 'ITEM' ? ComPr_precoRepasse_(calc.custo, pol) : 0; t.precoRepasseTxt = Com_moeda_(t.precoRepasse);
  t.diluir = a.diluir; t.diluirTxt = Com_moeda_(a.diluir);
  t.margem = { situacao: a.situacao, situacaoTxt: a.situacaoTxt, completa: a.completa };
  if (eu && eu.veCusto) {
    t.analise = a;
    t.analiseTxt = { custoTotal: Com_moeda_(a.custoTotal), custoItens: Com_moeda_(a.custoItens), custoDeslocamento: Com_moeda_(a.custoDeslocamento), impostos: Com_moeda_(a.impostos), total: Com_moeda_(a.total),
      margem: a.margemPct === null ? '—' : Com_pct_(a.margemPct) + ' (' + Com_moeda_(a.margemValor) + ')', comissao: Com_moeda_(a.comissao), comissaoPct: Com_pct_(a.comissaoPct, 1), sobra: Com_moeda_(a.margemValor), minima: a.margemMinPct === null ? 'não definida' : Com_pct_(a.margemMinPct, 1), alvo: a.margemAlvoPct === null ? 'não definida' : Com_pct_(a.margemAlvoPct, 1),
      impostosPct: a.impostosPct === null ? 'não definido na política' : Com_pct_(a.impostosPct, 1), precoMinimo: a.precoMinimo === null ? '' : Com_moeda_(a.precoMinimo), precoAlvo: a.precoAlvo === null ? '' : Com_moeda_(a.precoAlvo),
      naoRepassado: a.naoRepassado === null ? '' : Com_moeda_(a.naoRepassado), receitaItens: Com_moeda_(a.receitaItens), custoDiluido: Com_moeda_(a.custoDiluido), receitaDeslocamento: Com_moeda_(a.receitaDeslocamento),
      impostosItens: Com_moeda_(a.impostosItens), unidade: a.unidadeNome || '', impostosProdutoPct: Com_pct_(a.impostosProdutoPct, 2), creditoProdutoPct: Com_pct_(a.creditoProdutoPct, 2),
      precoMinimoItens: a.precoMinimoItens === null ? '' : Com_moeda_(a.precoMinimoItens) };
  }
  if (editavel) { t.sugestao = ComPr_sugestaoDestino_(p, null, pol.unidade); t.referencias = pol.unidade === 'GO' ? ComPr_referencias_().slice(0, 300) : []; }
  return t;
}

/** Resumo SEM VALOR da viagem para as atividades dos setores (Área técnica e Financeiro). '' quando não há viagem. */
function ComPr_resumoSemValor_(p, setor) {
  var d = Com_json_(p.DESLOCAMENTO_JSON, null), v = d && d.viagem;
  if (!v || v.ha !== true) return '';
  var T = Number(v.equipe.TECNICO) || 0, E = Number(v.equipe.ENGENHEIRO) || 0;
  var eq = [E ? Com_plural_(E, 'engenheiro', 'engenheiros') : '', T ? Com_plural_(T, 'técnico', 'técnicos') : ''].filter(Boolean).join(' e ');
  var txt = 'Viagem prevista na proposta: ' + eq + '; ' + Com_plural_(Number(v.viagens) || 1, 'viagem', 'viagens') + (Com_s_(v.destino) ? ' a ' + Com_s_(v.destino) : '') +
    (v.kmTrecho !== null && v.kmTrecho !== undefined ? ' (' + ComPr_qtd_(v.kmTrecho) + ' km o trecho)' : '') + '; ' + Com_plural_(Number(v.dias) || 1, 'dia', 'dias') + (Number(v.noites) ? ' e ' + Com_plural_(v.noites, 'noite', 'noites') : '') + ' por viagem; transporte: ' + (COM_PR_TRANSPORTES[v.transporte] || 'veículo da empresa').toLowerCase() + '.';
  var c = v.linhas && v.linhas.CONDUTA;
  if (setor === 'FINANCEIRO' || setor === 'TECNICA') txt += c && !c.nsa ? ' A viagem dá direito ao incentivo de missão do Programa de conduta para cada colaborador (lance a missão na Conduta depois da viagem).' : '';
  return txt;
}

// ------------------------------------------------------------
// REAJUSTE DO CATÁLOGO
// ------------------------------------------------------------
function ComPr_podeReajustar_(eu) { return !!(eu && (eu.diretoria || eu.perfil === 'ADMIN')); }
function ComPr_exigirReajuste_(eu, acao) {
  if (!ComPr_podeReajustar_(eu)) throw new Error('Não foi possível ' + acao + ': o reajuste de preços do catálogo é da Diretoria (ou do Administrador). A gestão comercial e o Financeiro continuam editando item por item em Produtos e serviços; para um reajuste em lote, peça à Diretoria');
}

/** Data do último preço do item ('aaaa-mm-dd'): PRECO_DESDE; sem ela, a data do cadastro. */
function ComPr_desdePreco_(p) { return Com_dia_(p.PRECO_DESDE) || Com_dia_(p.CRIADO_EM) || ''; }

/** Itens ativos com preço e sem reajuste há mais de N meses (padrão da política). [{ id, codigo, nome, desde, meses }] */
/** Data de corte 'aaaa-mm-dd': hoje menos N meses (dia 31 em mês curto vira o último dia daquele mês). */
function ComPr_corteMeses_(meses) {
  var n = Number(meses) || 12, m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(Com_hoje_());
  var a = +m[1], mm = +m[2] - n;
  while (mm < 1) { mm += 12; a--; }
  var ult = new Date(Date.UTC(a, mm, 0)).getUTCDate();
  return a + '-' + Com_2_(mm) + '-' + Com_2_(Math.min(+m[3], ult));
}
function ComPr_semReajuste_(produtos, meses) {
  var hoje = Com_hoje_(), corte = ComPr_corteMeses_(meses);
  return (produtos || Com_ler_(COM_ABAS.PRODUTOS)).filter(function (p) {
    if (Com_up_(p.ATIVO || 'SIM') === 'NAO' || !(Number(p.PRECO) > 0)) return false;
    var d = ComPr_desdePreco_(p);
    return !!d && d < corte;
  }).map(function (p) { var d = ComPr_desdePreco_(p); return { id: Com_s_(p.ID), codigo: Com_s_(p.CODIGO), nome: Com_s_(p.NOME), desde: Com_brDia_(d), dias: Com_diasEntre_(d, hoje) }; });
}

/** Itens escolhidos para o reajuste. s: { modo: TODOS|TIPO|CATEGORIA|BUSCA|IDS, tipo, categoria, busca, ids } */
function ComPr_selecionar_(s) {
  s = s || {};
  var modo = Com_up_(s.modo) || 'TODOS', termos = Com_termosBusca_(s.busca), ids = (Array.isArray(s.ids) ? s.ids : []).map(Com_s_);
  if (modo === 'TIPO' && !COM_TIPOS_ITEM[Com_up_(s.tipo)]) throw new Error('Não foi possível montar o reajuste: escolha o tipo (serviço, produto ou contrato)');
  if (modo === 'CATEGORIA' && !Com_s_(s.categoria)) throw new Error('Não foi possível montar o reajuste: escolha a categoria');
  if (modo === 'BUSCA' && !termos.length) throw new Error('Não foi possível montar o reajuste: escreva a busca (parte do nome ou do código) dos itens a reajustar');
  if (modo === 'IDS' && !ids.length) throw new Error('Não foi possível montar o reajuste: marque os itens a reajustar');
  if (modo === 'SEM_REAJUSTE') { var lim = ComPr_politica_().reajusteAlertaMeses || 12; var sr = {}; ComPr_semReajuste_(null, lim).forEach(function (x) { sr[x.id] = 1; }); ids = Object.keys(sr); }
  return Com_ler_(COM_ABAS.PRODUTOS).filter(function (p) {
    if (Com_up_(p.ATIVO || 'SIM') === 'NAO') return false;
    // 01/11/2026: a tabela oficial da Diretoria fica fora do reajuste por percentual (preço próprio, com versão e vigência no catálogo oficial)
    if (typeof ComCat_ehOficial_ === 'function' && ComCat_ehOficial_(p)) return false;
    if (modo === 'TIPO') return Com_up_(p.TIPO || 'SERVICO') === Com_up_(s.tipo);
    if (modo === 'CATEGORIA') return Com_normBusca_(p.CATEGORIA) === Com_normBusca_(s.categoria);
    if (modo === 'BUSCA') return Com_casaBusca_(termos, [Com_s_(p.CODIGO), Com_s_(p.NOME), Com_s_(p.DESCRICAO), Com_s_(p.CATEGORIA)]);
    if (modo === 'IDS' || modo === 'SEM_REAJUSTE') return ids.indexOf(Com_s_(p.ID)) >= 0;
    return true;
  });
}

/** Parâmetros do reajuste conferidos. */
function ComPr_paramsReajuste_(d) {
  var pct = Com_num_(d.percentual);
  if (!isFinite(pct) || pct === 0 || pct < -50 || pct > 100) throw new Error('Não foi possível montar o reajuste: informe o percentual (por exemplo 4,5 para 4,5%; negativo para redução), diferente de zero, entre -50% e 100%');
  var vig = Com_dia_(d.vigencia) || Com_hoje_();
  if (vig < Com_hoje_()) throw new Error('Não foi possível montar o reajuste: a vigência (' + Com_brDia_(vig) + ') não pode ser no passado. Use a data de hoje para aplicar agora ou uma data futura para agendar');
  var arr = Com_num_(d.arredondarPara);
  if (!isFinite(arr) || [0.01, 0.1, 1, 5, 10].indexOf(arr) < 0) arr = 0.01;
  return { percentual: Math.round(pct * 10000) / 10000, vigencia: vig, arredondarPara: arr, indice: Com_texto_(d.indice, 120), motivo: Com_texto_(d.motivo, 500) };
}

/** Prévia: nada é gravado. { linhas (até 300), qtd, ignorados, somaAntes, somaDepois, marca, ... } */
function ComPr_previaReajuste_(eu, d) {
  ComPr_exigirReajuste_(eu, 'ver a prévia do reajuste');
  d = d || {};
  var par = ComPr_paramsReajuste_(d), sel = ComPr_selecionar_(d.selecao);
  var linhas = [], ignorados = 0, antes = 0, depois = 0;
  sel.forEach(function (p) {
    var preco = Number(p.PRECO) || 0;
    if (!(preco > 0)) { ignorados++; return; }
    var novo = Math.max(0.01, ComPr_arredondar_(preco * (1 + par.percentual / 100), par.arredondarPara));
    antes += preco; depois += novo;
    linhas.push({ id: Com_s_(p.ID), codigo: Com_s_(p.CODIGO), nome: Com_s_(p.NOME), tipoNome: COM_TIPOS_ITEM[Com_up_(p.TIPO)] || 'Serviço', categoria: Com_s_(p.CATEGORIA), precoAtual: preco, precoNovo: novo,
      precoAtualTxt: Com_moeda_(preco), precoNovoTxt: Com_moeda_(novo), desde: Com_brDia_(ComPr_desdePreco_(p)) });
  });
  if (!linhas.length) throw new Error('Não foi possível montar o reajuste: nenhum item ativo com preço nesta seleção' + (ignorados ? ' (' + Com_plural_(ignorados, 'item está', 'itens estão') + ' sem preço no catálogo)' : '') + '. Mude a seleção');
  var marca = Com_marca_(JSON.stringify({ p: par.percentual, a: par.arredondarPara, l: linhas.map(function (x) { return [x.id, x.precoAtual]; }) })).slice(0, 32);
  return { linhas: linhas.slice(0, 300), qtd: linhas.length, mostrando: Math.min(300, linhas.length), ignorados: ignorados, somaAntes: Com_r2_(antes), somaDepois: Com_r2_(depois), somaAntesTxt: Com_moeda_(antes), somaDepoisTxt: Com_moeda_(depois),
    percentual: par.percentual, percentualTxt: Com_pct_(par.percentual, 2), vigencia: Com_brDia_(par.vigencia), agendado: par.vigencia > Com_hoje_(), marca: marca, _todas: linhas };
}

/** Aplica (ou agenda) o reajuste conferido na prévia. d: os mesmos dados da prévia + { marca, motivo } */
function ComPr_aplicarReajuste_(eu, d) {
  ComPr_exigirReajuste_(eu, 'aplicar o reajuste');
  d = d || {};
  var par = ComPr_paramsReajuste_(d);
  if (par.motivo.length < 10) throw new Error('Não foi possível aplicar o reajuste: escreva o motivo (pelo menos 10 letras, por exemplo "Reajuste anual pelo IPCA de 12 meses"). Ele fica no histórico de cada item');
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var prev = ComPr_previaReajuste_(eu, d);
    if (Com_s_(d.marca) !== prev.marca) throw new Error('Não foi possível aplicar o reajuste: o catálogo ou a seleção mudou desde a prévia (preço editado, item novo ou arquivado). Toque em "Ver a prévia" de novo e confira antes de aplicar');
    var lote = Com_proximoNumero_('RJ', COM_ABAS.REAJUSTES, 'LOTE'), agora = Com_agora_(), agendar = par.vigencia > Com_hoje_();
    var registros = [];
    prev._todas.forEach(function (x) {
      var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, x.id);
      registros.push({ LOTE: lote, PRODUTO_ID: x.id, CODIGO: x.codigo, NOME: x.nome, PRECO_ANTERIOR: x.precoAtual, PRECO_NOVO: x.precoNovo, PRECO_DESDE_ANTERIOR: Com_s_(p && p.PRECO_DESDE),
        PERCENTUAL: par.percentual, ARREDONDAR_PARA: par.arredondarPara, INDICE: par.indice, VIGENCIA: par.vigencia, MOTIVO: par.motivo, SITUACAO: agendar ? 'AGENDADO' : 'APLICADO',
        USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, DATA: agora, APLICADO_EM: agendar ? '' : agora });
      if (!agendar) SGO_DATA.update(COM_ABAS.PRODUTOS, x.id, { PRECO: x.precoNovo, PRECO_DESDE: par.vigencia, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
    });
    SGO_DATA.insertMany(COM_ABAS.REAJUSTES, registros);
    Com_historico_('REAJUSTE', lote, agendar ? 'AGENDADO' : 'APLICADO', eu, { para: Com_pct_(par.percentual, 2), texto: Com_plural_(registros.length, 'item', 'itens') + (par.indice ? '; índice ' + par.indice : '') + '; vigência ' + Com_brDia_(par.vigencia) + '. ' + par.motivo });
    return { lote: lote, qtd: registros.length, agendado: agendar,
      message: agendar ? 'Reajuste ' + lote + ' agendado: ' + Com_plural_(registros.length, 'item muda', 'itens mudam') + ' de preço em ' + Com_brDia_(par.vigencia) + ' (a rotina aplica no dia). Até lá dá para cancelar em "Desfazer o último reajuste".'
        : 'Reajuste ' + lote + ' aplicado em ' + Com_plural_(registros.length, 'item', 'itens') + '. As propostas já salvas guardam o preço antigo; as novas usam o preço reajustado. Se precisar, use "Desfazer o último reajuste".' };
  });
}

/** Rotina: aplica os reajustes agendados que chegaram à vigência. Nunca lança. */
function ComPr_rotinaReajustes_() {
  var n = 0;
  try {
    var hoje = Com_hoje_();
    var pend = Com_ler_(COM_ABAS.REAJUSTES).filter(function (r) { return Com_up_(r.SITUACAO) === 'AGENDADO' && Com_dia_(r.VIGENCIA) && Com_dia_(r.VIGENCIA) <= hoje; });
    if (!pend.length) return 0;
    Com_comTrava_(function () {
      var agora = Com_agora_();
      pend.forEach(function (r) {
        var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(r.PRODUTO_ID));
        if (!p || Com_up_(p.ATIVO || 'SIM') === 'NAO') { SGO_DATA.update(COM_ABAS.REAJUSTES, r.ID, { SITUACAO: 'IGNORADO', APLICADO_EM: agora, DESFEITO_MOTIVO: 'item arquivado ou excluído antes da vigência' }); return; }
        var atual = Number(p.PRECO) || 0, novo = Number(r.PRECO_NOVO) || 0;
        // o preço mudou entre o agendamento e a vigência: aplica o mesmo percentual sobre o preço de agora
        if (Math.abs(atual - (Number(r.PRECO_ANTERIOR) || 0)) > 0.004) novo = Math.max(0.01, ComPr_arredondar_(atual * (1 + (Number(r.PERCENTUAL) || 0) / 100), Number(r.ARREDONDAR_PARA) || 0.01));
        var cpR = { PRECO: novo, PRECO_DESDE: Com_dia_(r.VIGENCIA), ATUALIZADO_POR_NOME: Com_s_(r.USUARIO_NOME) + ' (reajuste ' + Com_s_(r.LOTE) + ')', ATUALIZADO_EM: agora };
        // 01/11/2026: preço-base agendado da tabela oficial da Diretoria: a vigência e a versão da tabela do item acompanham
        if (typeof ComCat_ehOficial_ === 'function' && ComCat_ehOficial_(p)) { cpR.VIGENCIA_DESDE = Com_dia_(r.VIGENCIA); cpR.CATALOGO_VERSAO = ComCat_proximaVersao_(p, Com_dia_(r.VIGENCIA)); }
        SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, cpR);
        SGO_DATA.update(COM_ABAS.REAJUSTES, r.ID, { SITUACAO: 'APLICADO', APLICADO_EM: agora, PRECO_ANTERIOR: atual, PRECO_NOVO: novo, PRECO_DESDE_ANTERIOR: Com_s_(p.PRECO_DESDE) });
        n++;
      });
    });
  } catch (e) { console.error('Comercial, reajustes agendados: ' + ((e && e.message) || e)); }
  return n;
}

/** Lotes de reajuste (mais recente primeiro) e o que dá para desfazer. */
function ComPr_historicoReajustes_(eu) {
  if (!(eu.gestao || eu.catalogo)) Com_exigir_(eu, 'GESTAO', 'ver o histórico de reajustes');
  var lotes = {};
  Com_ler_(COM_ABAS.REAJUSTES).forEach(function (r) {
    var k = Com_s_(r.LOTE);
    var l = lotes[k] = lotes[k] || { lote: k, data: Com_iso_(r.DATA), em: Com_br_(r.DATA), por: Com_s_(r.USUARIO_NOME), percentualTxt: Com_pct_(Number(r.PERCENTUAL) || 0, 2), indice: Com_s_(r.INDICE), vigencia: Com_brDia_(r.VIGENCIA),
      motivo: Com_s_(r.MOTIVO), qtd: 0, situacoes: {}, desfeitoEm: '', desfeitoPor: '', itens: [] };
    l.qtd++; l.situacoes[Com_up_(r.SITUACAO)] = (l.situacoes[Com_up_(r.SITUACAO)] || 0) + 1;
    if (Com_s_(r.DESFEITO_EM)) { l.desfeitoEm = Com_br_(r.DESFEITO_EM); l.desfeitoPor = Com_s_(r.DESFEITO_POR_NOME); }
    if (l.itens.length < 60) l.itens.push({ codigo: Com_s_(r.CODIGO), nome: Com_s_(r.NOME), de: Com_moeda_(r.PRECO_ANTERIOR), para: Com_moeda_(r.PRECO_NOVO), situacao: Com_up_(r.SITUACAO) });
  });
  var lista = Object.keys(lotes).map(function (k) { return lotes[k]; }).sort(function (a, b) { return String(b.data).localeCompare(String(a.data)) || b.lote.localeCompare(a.lote); });
  var ultimo = lista.filter(function (l) { return l.situacoes.APLICADO || l.situacoes.AGENDADO; })[0] || null;
  return { lotes: lista.slice(0, 30), podeReajustar: ComPr_podeReajustar_(eu), desfazivel: ultimo && ComPr_podeReajustar_(eu) ? ultimo.lote : '', alertaMeses: ComPr_politica_().reajusteAlertaMeses || 12 };
}

/** Desfaz o último lote aplicado (ou cancela o agendado). Item com preço mudado depois do reajuste fica como está. d: { lote, motivo } */
function ComPr_desfazerReajuste_(eu, d) {
  ComPr_exigirReajuste_(eu, 'desfazer o reajuste');
  d = d || {};
  var motivo = Com_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível desfazer: escreva o motivo (pelo menos 10 letras). Ele fica no histórico');
  return Com_comTrava_(function () {
    var h = ComPr_historicoReajustes_(eu);
    if (!h.desfazivel) throw new Error('Não foi possível desfazer: não há reajuste aplicado ou agendado para desfazer');
    if (Com_s_(d.lote) && Com_s_(d.lote) !== h.desfazivel) throw new Error('Não foi possível desfazer o ' + Com_s_(d.lote) + ': só o último reajuste (' + h.desfazivel + ') pode ser desfeito, para os preços não se misturarem. Desfaça primeiro o ' + h.desfazivel);
    var agora = Com_agora_(), voltou = 0, mantidos = [], cancelados = 0;
    Com_ler_(COM_ABAS.REAJUSTES).filter(function (r) { return Com_s_(r.LOTE) === h.desfazivel; }).forEach(function (r) {
      var sit = Com_up_(r.SITUACAO), base = { DESFEITO_EM: agora, DESFEITO_POR_NOME: eu.nome, DESFEITO_MOTIVO: motivo };
      if (sit === 'AGENDADO') { SGO_DATA.update(COM_ABAS.REAJUSTES, r.ID, Object.assign({ SITUACAO: 'CANCELADO' }, base)); cancelados++; return; }
      if (sit !== 'APLICADO') return;
      var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(r.PRODUTO_ID));
      if (p && Math.abs((Number(p.PRECO) || 0) - (Number(r.PRECO_NOVO) || 0)) <= 0.004) {
        SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, { PRECO: Number(r.PRECO_ANTERIOR) || 0, PRECO_DESDE: Com_s_(r.PRECO_DESDE_ANTERIOR), ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
        SGO_DATA.update(COM_ABAS.REAJUSTES, r.ID, Object.assign({ SITUACAO: 'DESFEITO' }, base)); voltou++;
      } else { SGO_DATA.update(COM_ABAS.REAJUSTES, r.ID, Object.assign({ SITUACAO: 'MANTIDO' }, base, { DESFEITO_MOTIVO: motivo + ' (o preço do item mudou depois do reajuste e ficou como está)' })); mantidos.push(Com_s_(r.CODIGO)); }
    });
    Com_historico_('REAJUSTE', h.desfazivel, 'DESFEITO', eu, { texto: motivo + '. Voltaram ao preço anterior: ' + voltou + (cancelados ? '; agendados cancelados: ' + cancelados : '') + (mantidos.length ? '; mantidos (preço mudou depois): ' + mantidos.slice(0, 20).join(', ') : '') + '.' });
    return { message: 'Reajuste ' + h.desfazivel + ' desfeito: ' + (cancelados ? Com_plural_(cancelados, 'item agendado cancelado', 'itens agendados cancelados') : Com_plural_(voltou, 'item voltou', 'itens voltaram') + ' ao preço anterior') +
      (mantidos.length ? '. ' + Com_plural_(mantidos.length, 'item ficou', 'itens ficaram') + ' como está (o preço foi mudado depois do reajuste): ' + mantidos.slice(0, 10).join(', ') + (mantidos.length > 10 ? '...' : '') : '') + '.' };
  });
}

// ------------------------------------------------------------
// GESTORA E PAINEL ("Precificação e estratégia")
// ------------------------------------------------------------
/** Problemas de precificação de uma proposta (só regras). [{ regra, texto, grave }] */
function ComPr_problemas_(p, pol, x) {
  x = x || ComPr_daProposta_(p, pol);
  var l = [], a = x.analise, d = x.desl, v = d && d.viagem, s = Com_up_(p.SITUACAO);
  var add = function (regra, texto, grave) { l.push({ regra: regra, texto: texto, grave: !!grave }); };
  if (x.checklist.exige.viagem && (!v || v.ha === null || v.ha === undefined)) add('VIAGEM_SEM_CALCULO', 'serviço sem o cálculo da viagem (nem "não há viagem" com o motivo)', true);
  else if (v && v.ha === true) {
    if (!(a.custoViagem > 0)) add('VIAGEM_SEM_CUSTO', 'viagem marcada sem nenhum custo calculado', true);
    var c = v.linhas.CONDUTA || {};
    if (c.nsa && !c.auto && Number(v.kmTrecho) >= ComPr_beneficio_(pol).kmMinimo) add('CONDUTA_FORA', 'o Incentivo de Missão ficou "não se aplica" numa viagem de ' + ComPr_qtd_(v.kmTrecho) + ' km (' + Com_s_(c.motivo) + ')', true);
    var k = v.linhas.KM || {};
    if (k.nsa && !k.auto && Number(v.kmTrecho) > 0) add('KM_FORA', 'o km rodado ficou "não se aplica" numa viagem de ' + ComPr_qtd_(v.kmTrecho) + ' km (' + Com_s_(k.motivo) + ')', true);
    var lk = v.linhas.KM || {};
    if (!lk.nsa && lk.fonte === 'VENDEDOR' && pol.valorKm !== null && Number(lk.valor) < pol.valorKm - 0.004) add('KM_ABAIXO', 'km rodado a ' + Com_moeda_(lk.valor) + ', abaixo dos ' + Com_moeda_(pol.valorKm) + ' da política', false);
  }
  // o catálogo trouxe do CRM itens como "DESLOCAMENTO GO/DF" e "DESLOCAMENTO/HORA TÉCNICA/PEDÁGIO": junto com o cálculo, cobra duas vezes
  if (v && v.ha === true) {
    var manuais = (Com_json_(p.ITENS_JSON, []) || []).filter(function (i) { return i && !i.auto && /desloc|di[aá]ria|ped[aá]gio|hosped|quil[oô]metr|\bkm\b|estadia/i.test(Com_s_(i.descricao)); });
    if (manuais.length) add('VIAGEM_EM_DOBRO', 'há item digitado de deslocamento (' + manuais.slice(0, 2).map(function (i) { return Com_s_(i.descricao).slice(0, 50); }).join('; ') + ') além do cálculo da viagem: confira para não cobrar duas vezes', false);
  }
  // 01/11/2026 (C2): preço do deslocamento digitado abaixo do custo (a C1 achou o deslocamento cobrado abaixo do custo no CRM)
  var autoD = (Com_json_(p.ITENS_JSON, []) || []).filter(function (i) { return i && i.auto === 'DESLOCAMENTO'; })[0];
  if (autoD && Number(autoD.custoUnitario) > 0 && Number(autoD.precoUnitario) < Number(autoD.custoUnitario) - 0.004) add('DESLOCAMENTO_ABAIXO_CUSTO', 'o deslocamento está a ' + Com_moeda_(autoD.precoUnitario) + ', abaixo do custo de ' + Com_moeda_(autoD.custoUnitario) + ' da viagem: a empresa paga para ir', true);
  if (v && v.ha === true) {
    var manD = (Com_json_(p.ITENS_JSON, []) || []).filter(function (i) { return i && !i.auto && /desloc|di[aá]ria|ped[aá]gio|hosped|estadia/i.test(Com_s_(i.descricao)); });
    var somaMan = manD.reduce(function (t, i) { return t + (Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0); }, 0);
    if (manD.length && d.repasse !== 'ITEM' && a.custoViagem > 0 && somaMan < a.custoViagem - 0.004) add('DESLOCAMENTO_ABAIXO_CUSTO', 'o deslocamento digitado soma ' + Com_moeda_(somaMan) + ', abaixo do custo de ' + Com_moeda_(a.custoViagem) + ' calculado para a viagem', true);
  }
  if (typeof ComF_problemasItens_ === 'function') ComF_problemasItens_(p, pol).forEach(function (q) { add(q.regra, q.texto, q.grave); });
  if (!x.checklist.ok && s === 'RASCUNHO') add('CHECKLIST', 'checklist de custos incompleto: ' + x.checklist.faltas.map(function (f) { return f.texto.split(':')[0]; }).slice(0, 4).join(', '), false);
  // 01/11/2026: o desconto geral não reduz mais o deslocamento; sobra só o preço digitado abaixo de custo + impostos
  if (a.naoRepassado > 0.009) add('DESCONTO_NA_VIAGEM', 'o preço digitado do deslocamento não cobre o custo mais os impostos: ' + Com_moeda_(a.naoRepassado) + ' do custo da viagem não volta no preço e sai da sobra (o deslocamento é repasse, sem desconto)', false);
  if (a.abaixoMin && ['APROVADO', 'EXCECAO_GESTAO'].indexOf(Com_up_(p.DESCONTO_SITUACAO)) < 0) add('MARGEM_MINIMA', 'sobra de ' + Com_pct_(a.margemPct) + ' abaixo da mínima de ' + Com_pct_(a.margemMinPct, 1) + ' (depois de impostos, comissão e custos diretos; o deslocamento fica fora)' + (a.completa ? '' : ' (mesmo sem o custo de ' + Com_plural_(a.itensSemCusto, 'item', 'itens') + ')'), true);
  else if (a.abaixoAlvo) add('MARGEM_ALVO', 'sobra de ' + Com_pct_(a.margemPct) + ' abaixo da alvo de ' + Com_pct_(a.margemAlvoPct, 1), false);
  return l;
}

/** Itens da lista do dia do vendedor (rascunhos dele): checklist de custos e viagem sem custo. */
function ComPr_itensVendedor_(props, pol) {
  pol = pol || ComPr_politica_();
  var itens = [];
  (props || []).forEach(function (p) {
    if (Com_up_(p.SITUACAO) !== 'RASCUNHO') return;
    var itensP = Com_json_(p.ITENS_JSON, []) || [];
    if (!itensP.length) return;
    var x = ComPr_daProposta_(p, pol, itensP);
    if (x.checklist.ok) return;
    itens.push({ chave: 'CUSTOS:' + p.ID, regra: 'CHECKLIST_CUSTOS', prioridade: 2, titulo: ComP_rotulo_(p) + ' · ' + Com_s_(p.CLIENTE_NOME) + ': custos da viagem ou do frete incompletos', ref: { tipo: 'proposta', id: Com_s_(p.ID) }, valor: Number(p.TOTAL) || 0,
      porque: 'Política de precificação: todo custo de campo (km, pedágio, alimentação, diárias, hospedagem, Incentivo de Missão de cada executante) entra no preço. Falta: ' + x.checklist.faltas.slice(0, 3).map(function (f) { return f.texto.split(';')[0]; }).join('; ') + '.',
      acao: 'Abra a proposta, preencha "Custos da viagem e do frete" e salve. Sem isso a proposta não conclui.' });
  });
  return itens;
}

/** Itens do panorama da gestão: política incompleta, propostas com problema de precificação e catálogo sem reajuste. */
function ComPr_itensGestora_(ctx) {
  ctx = ctx || {};
  var pol = ComPr_politica_(ctx.met), itens = [];
  var inc = ComPr_politicaIncompleta_(pol);
  if (inc.length) itens.push({ chave: 'POLITICA_PRECOS', regra: 'POLITICA_INCOMPLETA', prioridade: 2, titulo: 'Política de precificação incompleta: ' + inc.map(function (f) { return f.nome; }).join(', '), ref: { tipo: 'metodologia' },
    porque: 'Sem esses valores o vendedor preenche cada proposta à mão e a margem não é conferida' + (pol.impostosPct === null ? ' (sem impostos, a margem sai maior do que é)' : '') + '.', acao: 'Peça à Diretoria para preencher em Comercial > Metodologia > Política de precificação.' });
  (ctx.propostas || ComP_lerPropostas_()).forEach(function (p) {
    var s = Com_up_(p.SITUACAO);
    // rascunho é do vendedor (lista dele); proposta concluída antes do checklist (29/10/2026, sem DESLOCAMENTO_JSON) não é
    // reavaliada aqui (o painel conta como "sem cálculo da viagem")
    if (['AGUARDANDO_APROVACAO', 'PRONTA', 'ENVIADA'].indexOf(s) < 0 || !Com_s_(p.DESLOCAMENTO_JSON)) return;
    var itensP = Com_json_(p.ITENS_JSON, []) || [];
    if (!itensP.length) return;
    var pr = ComPr_problemas_(p, pol).filter(function (x) { return x.regra !== 'CHECKLIST'; });
    if (!pr.length) return;
    var grave = pr.some(function (x) { return x.grave; });
    itens.push({ chave: 'PRECO:' + p.ID, regra: 'PRECIFICACAO', prioridade: grave ? 2 : 3, titulo: ComP_rotulo_(p) + ' · ' + Com_s_(p.CLIENTE_NOME) + ': ' + pr[0].texto, ref: { tipo: 'proposta', id: Com_s_(p.ID) }, valor: Number(p.TOTAL) || 0,
      porque: 'Revisão de precificação (' + Com_s_(p.RESPONSAVEL_NOME) + ', ' + (COM_SITUACOES_PROP[s] || s).toLowerCase() + '): ' + pr.map(function (x) { return x.texto; }).join('; ') + '.',
      acao: s === 'ENVIADA' ? 'Se o custo ficou de fora, faça nova revisão com a viagem completa antes do aceite do cliente.' : 'Abra a proposta e ajuste com ' + ComG_primeiroNome_(p.RESPONSAVEL_NOME) + ' antes do envio.' });
  });
  var prov = ComPr_provisorios_(pol);
  if (prov.length) itens.push({ chave: 'PARAMETROS_PROVISORIOS', regra: 'PARAMETROS_PROVISORIOS', prioridade: 4, titulo: Com_plural_(prov.length, 'valor da política de preço ainda é provisório', 'valores da política de preço ainda são provisórios') + ' (falta a confirmação do dono)', ref: { tipo: 'metodologia' },
    porque: 'Os preços da tabela usam os valores iniciais da C1 até o dono confirmar: ' + prov.map(function (x) { return x.nome; }).join('; ') + '.', acao: 'Confirme com o dono e marque cada valor em Comercial > Metodologia > Preço e desconto.' });
  var sr = ComPr_semReajuste_(null, pol.reajusteAlertaMeses || 12);
  if (sr.length) itens.push({ chave: 'SEM_REAJUSTE', regra: 'CATALOGO_SEM_REAJUSTE', prioridade: 4, titulo: Com_plural_(sr.length, 'item do catálogo está', 'itens do catálogo estão') + ' sem reajuste há mais de ' + Com_plural_(pol.reajusteAlertaMeses || 12, 'mês', 'meses'), ref: { tipo: 'catalogo' },
    porque: 'Política de reajuste: preço parado perde margem com a inflação e com o custo novo de peças e mão de obra.', acao: 'A Diretoria aplica o reajuste em Produtos e serviços > Reajustar preços (com prévia e histórico).' });
  return itens;
}

/** Quadro "Precificação e estratégia" do painel (gestão). comp 'aaaa-mm'; vendedorId opcional. */
function ComPr_quadroPainel_(comp, vendedorId) {
  var pol = ComPr_politica_();
  var props = ComP_lerPropostas_().filter(function (p) { return !vendedorId || Com_s_(p.RESPONSAVEL_ID) === vendedorId; });
  var noMes = function (v) { return Com_dia_(v).slice(0, 7) === comp; };
  var r = { enviadas: 0, comMargem: 0, margemMedia: null, abaixoMin: [], abaixoAlvo: 0, viagens: 0, custoViagem: 0, repassadoItem: 0, diluido: 0, naoRepassado: 0, beneficio: 0, semCalculo: 0, abertasComProblema: 0 };
  var somaM = 0;
  props.forEach(function (p) {
    var s = Com_up_(p.SITUACAO);
    var itensP = Com_json_(p.ITENS_JSON, []) || [];
    if (noMes(p.ENVIADA_EM)) {
      r.enviadas++;
      var f = Com_json_(p.PRECIFICACAO_JSON, null), x = null;
      if (!f) { x = ComPr_daProposta_(p, pol, itensP); f = ComPr_fotografia_(x, pol); f.legado = !Com_s_(p.DESLOCAMENTO_JSON); }
      if (f.margemPct !== null && f.margemPct !== undefined && f.completa) { r.comMargem++; somaM += Number(f.margemPct); }
      if (f.abaixoMin) r.abaixoMin.push({ id: Com_s_(p.ID), rotulo: ComP_rotulo_(p), cliente: Com_s_(p.CLIENTE_NOME), margemTxt: Com_pct_(f.margemPct), decisao: Com_s_(p.DESCONTO_DECISAO_POR_NOME) });
      else if (f.abaixoAlvo) r.abaixoAlvo++;
      if (f.viagem) {
        r.viagens++; r.custoViagem += Number(f.custoViagem) || 0; r.beneficio += Number(f.beneficio) || 0;
        if (f.repasse === 'DILUIDO') r.diluido += Number(f.custoViagem) || 0;
        else { r.repassadoItem += Math.max(0, (Number(f.custoViagem) || 0) + (Number(f.custoFrete) || 0) - (Number(f.naoRepassado) || 0)); r.naoRepassado += Number(f.naoRepassado) || 0; }
      } else if (ComP_tipoOrcamento_(p, itensP).tipo !== 'PRODUTOS' && !f.semViagemMotivo) r.semCalculo++;
    }
    if (['AGUARDANDO_APROVACAO', 'PRONTA', 'ENVIADA'].indexOf(s) >= 0 && Com_s_(p.DESLOCAMENTO_JSON) && itensP.length && ComPr_problemas_(p, pol).some(function (q) { return q.grave; })) r.abertasComProblema++;
  });
  r.margemMedia = r.comMargem ? Math.round(somaM / r.comMargem * 100) / 100 : null;
  r.margemMediaTxt = r.margemMedia === null ? 'sem propostas com custo completo' : Com_pct_(r.margemMedia);
  ['custoViagem', 'repassadoItem', 'diluido', 'naoRepassado', 'beneficio'].forEach(function (k) { r[k] = Com_r2_(r[k]); r[k + 'Txt'] = Com_moeda_(r[k]); });
  var sr = ComPr_semReajuste_(null, pol.reajusteAlertaMeses || 12);
  r.semReajuste = sr.length; r.reajusteMeses = pol.reajusteAlertaMeses || 12;
  r.reajustesAgendados = Com_ler_(COM_ABAS.REAJUSTES).filter(function (x) { return Com_up_(x.SITUACAO) === 'AGENDADO'; }).length;
  r.politicaIncompleta = ComPr_politicaIncompleta_(pol).map(function (f) { return f.nome; });
  r.margemMinTxt = pol.margemMinPct === null ? 'não definida' : Com_pct_(pol.margemMinPct, 1); r.margemAlvoTxt = pol.margemAlvoPct === null ? 'não definida' : Com_pct_(pol.margemAlvoPct, 1);
  r.estrategia = [];
  if (r.politicaIncompleta.length) r.estrategia.push('Preencher a política de precificação (' + r.politicaIncompleta.join(', ') + '): sem ela a margem não é conferida.');
  if (r.abaixoMin.length) r.estrategia.push(Com_plural_(r.abaixoMin.length, 'proposta saiu', 'propostas saíram') + ' abaixo da sobra mínima no mês: revise preço, escopo ou repasse da viagem antes de aprovar exceções.');
  if (r.naoRepassado > 0) r.estrategia.push(r.naoRepassadoTxt + ' de custo de viagem não voltou no preço (deslocamento digitado abaixo de custo mais impostos): o deslocamento é repasse, sem desconto.');
  if (r.semCalculo) r.estrategia.push(Com_plural_(r.semCalculo, 'proposta de serviço enviada', 'propostas de serviço enviadas') + ' sem o cálculo da viagem (anteriores ao checklist ou sem registro): confira se o custo de campo estava no preço.');
  if (r.semReajuste) r.estrategia.push(Com_plural_(r.semReajuste, 'item do catálogo', 'itens do catálogo') + ' sem reajuste há mais de ' + r.reajusteMeses + ' meses: avalie o reajuste anual.');
  if (r.margemMedia !== null && pol.margemAlvoPct !== null && r.margemMedia < pol.margemAlvoPct) r.estrategia.push('Margem média do mês (' + r.margemMediaTxt + ') abaixo da alvo (' + r.margemAlvoTxt + '): venda valor técnico e reduza desconto.');
  return r;
}
