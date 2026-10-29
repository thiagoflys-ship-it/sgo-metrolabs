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
 ****************************************************/

var COM_PR_FUNCOES = { TECNICO: 'Técnico', ENGENHEIRO: 'Engenheiro' };
var COM_PR_TRANSPORTES = { VEICULO_EMPRESA: 'Veículo da empresa', VEICULO_LOCADO: 'Veículo locado', AVIAO: 'Avião', ONIBUS: 'Ônibus', OUTRO: 'Outro' };
var COM_PR_REPASSES = { ITEM: 'Item separado na proposta ("Despesas de deslocamento e estadia")', DILUIDO: 'Diluído no preço dos serviços' };
/** Linhas da viagem. obrigatoria: entra no checklist. porFuncao: valor diferente para técnico e engenheiro. */
var COM_PR_LINHAS = [
  { codigo: 'KM', nome: 'Km rodado (ida e volta)', unidade: 'por km', obrigatoria: true },
  { codigo: 'PEDAGIO', nome: 'Pedágios', unidade: 'por viagem (ida e volta)', obrigatoria: true },
  { codigo: 'ALIMENTACAO', nome: 'Alimentação', unidade: 'por pessoa por dia', obrigatoria: true },
  { codigo: 'DIARIA', nome: 'Diárias', unidade: 'por pessoa por dia', obrigatoria: true, porFuncao: true },
  { codigo: 'HOSPEDAGEM', nome: 'Hospedagem', unidade: 'por pessoa por noite', obrigatoria: true },
  { codigo: 'CONDUTA', nome: 'Benefício do Programa de conduta', unidade: 'por colaborador por viagem', obrigatoria: true },
  { codigo: 'COMBUSTIVEL', nome: 'Combustível adicional ou passagem', unidade: 'por viagem', obrigatoria: true },
  { codigo: 'HORAS', nome: 'Horas de deslocamento (mão de obra)', unidade: 'por hora por pessoa', obrigatoria: false, porFuncao: true },
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
/** Política de precificação em vigor (metodologia), completa e normalizada. */
function ComPr_politica_(met) {
  met = met || Com_metodologia_();
  var p = Com_copia_(COM_METODOLOGIA_PADRAO.precificacao), g = met.precificacao || {};
  Object.keys(g).forEach(function (k) { if (g[k] !== undefined) p[k] = Com_copia_(g[k] === undefined ? null : g[k]); });
  ['diariaPessoaDia', 'horaDeslocamento'].forEach(function (k) {
    var o = p[k] && typeof p[k] === 'object' ? p[k] : {};
    p[k] = { TECNICO: ComPr_num_(o.TECNICO), ENGENHEIRO: ComPr_num_(o.ENGENHEIRO) };
  });
  p.beneficioConduta = Object.assign({ valorPorColaborador: 300, kmMinimoTrecho: 200 }, p.beneficioConduta && typeof p.beneficioConduta === 'object' ? p.beneficioConduta : {});
  ['valorKm', 'velocidadeMediaKmh', 'alimentacaoPessoaDia', 'hospedagemPessoaNoite', 'impostosPct', 'margemMinPct', 'margemAlvoPct', 'margemDeslocamentoPct', 'arredondarPara', 'reajusteAlertaMeses']
    .forEach(function (k) { p[k] = ComPr_num_(p[k]); });
  if (!COM_PR_REPASSES[Com_up_(p.repassePadrao)]) p.repassePadrao = 'ITEM'; else p.repassePadrao = Com_up_(p.repassePadrao);
  p.origemPadrao = Com_s_(p.origemPadrao) || 'Goiânia/GO';
  p.versao = met.versao;
  return p;
}

/** O que falta na política (para a gestora e o painel): [{ campo, nome }]. */
function ComPr_politicaIncompleta_(pol) {
  var l = [];
  var f = function (v, campo, nome) { if (v === null || v === undefined) l.push({ campo: campo, nome: nome }); };
  f(pol.valorKm, 'valorKm', 'valor por km rodado');
  f(pol.alimentacaoPessoaDia, 'alimentacaoPessoaDia', 'alimentação por pessoa por dia');
  f(pol.diariaPessoaDia.TECNICO, 'diariaPessoaDia.TECNICO', 'diária do técnico');
  f(pol.diariaPessoaDia.ENGENHEIRO, 'diariaPessoaDia.ENGENHEIRO', 'diária do engenheiro');
  f(pol.hospedagemPessoaNoite, 'hospedagemPessoaNoite', 'hospedagem por pessoa por noite');
  f(pol.impostosPct, 'impostosPct', 'impostos sobre o faturamento (%)');
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
  var mn = ComPr_num_(pr.margemMinPct), al = ComPr_num_(pr.margemAlvoPct), im = ComPr_num_(pr.impostosPct) || 0;
  if (mn !== null && al !== null && al < mn) throw new Error('na política de precificação, a margem alvo (' + Com_pct_(al, 1) + ') não pode ser menor que a margem mínima (' + Com_pct_(mn, 1) + '). Corrija e salve de novo');
  if (im + Math.max(mn || 0, al || 0) >= 95) throw new Error('na política de precificação, impostos mais margem passam de 95% do preço: a conta do preço mínimo não fecha. Confira os percentuais e salve de novo');
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

/** Sugestão de destino e km para a proposta: unidade (cidade/UF), endereço e a referência da Conduta, se houver. */
function ComPr_sugestaoDestino_(p, refs) {
  refs = refs || ComPr_referencias_();
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
/** Vazio: proposta sem nada preenchido sobre a viagem. */
function ComPr_vazio_(pol) {
  return { v: 1, viagem: { ha: null, motivoSem: '', equipe: { TECNICO: 0, ENGENHEIRO: 0 }, transporte: 'VEICULO_EMPRESA', origem: pol.origemPadrao, destino: '', kmTrecho: null, kmFonte: '',
    viagens: 1, dias: 1, noites: 0, linhas: {} }, frete: { valor: null, nsa: false, motivo: '' }, repasse: pol.repassePadrao };
}

/**
 * Tela -> custos gravados (DESLOCAMENTO_JSON). Campo que a tela não mandou fica como estava. Valor em branco na linha vale o
 * da política (fonte POLITICA); "não se aplica" automático quando o fato manda (0 km, 0 noite, trecho abaixo do mínimo da
 * Conduta, veículo da empresa) e o vendedor não escolheu outra coisa. d: a parte "deslocamento" de salvarProposta.
 */
function ComPr_normalizar_(d, anterior, pol, ctx) {
  ctx = ctx || {};
  var base = anterior && typeof anterior === 'object' && anterior.viagem ? Com_copia_(anterior) : ComPr_vazio_(pol);
  var vz = ComPr_vazio_(pol);
  base.viagem = Object.assign(vz.viagem, base.viagem || {}); base.viagem.linhas = base.viagem.linhas || {}; base.viagem.equipe = Object.assign({ TECNICO: 0, ENGENHEIRO: 0 }, base.viagem.equipe || {});
  base.frete = Object.assign(vz.frete, base.frete || {});
  d = d && typeof d === 'object' ? d : {};
  var tv = d.viagem && typeof d.viagem === 'object' ? d.viagem : {}, v = base.viagem;
  if (tv.ha !== undefined) {
    var h = Com_up_(tv.ha);
    v.ha = tv.ha === true || h === 'SIM' || h === 'TRUE' ? true : (tv.ha === false || h === 'NAO' || h === 'NÃO' || h === 'FALSE' ? false : null);
  }
  if (tv.motivoSem !== undefined) v.motivoSem = Com_texto_(tv.motivoSem, 500);
  if (tv.tecnicos !== undefined) v.equipe.TECNICO = ComPr_inteiro_(tv.tecnicos, 'o número de técnicos', 0, 20, 0);
  if (tv.engenheiros !== undefined) v.equipe.ENGENHEIRO = ComPr_inteiro_(tv.engenheiros, 'o número de engenheiros', 0, 20, 0);
  if (tv.transporte !== undefined) { var tr = Com_up_(tv.transporte); if (tr && !COM_PR_TRANSPORTES[tr]) throw new Error('Não foi possível salvar: o transporte "' + Com_s_(tv.transporte) + '" não existe. Escolha veículo da empresa, veículo locado, avião, ônibus ou outro'); v.transporte = tr || 'VEICULO_EMPRESA'; }
  if (tv.origem !== undefined) v.origem = Com_texto_(tv.origem, 200) || pol.origemPadrao;
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
        var padrao = L.codigo === 'DIARIA' ? pol.diariaPessoaDia[f] : pol.horaDeslocamento[f];
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
      var padrao2 = L.codigo === 'KM' ? pol.valorKm : L.codigo === 'ALIMENTACAO' ? pol.alimentacaoPessoaDia : L.codigo === 'HOSPEDAGEM' ? pol.hospedagemPessoaNoite : L.codigo === 'CONDUTA' ? benef.valor : null;
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
    if (L.codigo === 'CONDUTA' && v.kmTrecho !== null && v.kmTrecho < benef.kmMinimo) auto = 'Trecho de ' + ComPr_qtd_(v.kmTrecho) + ' km, abaixo do mínimo de ' + ComPr_qtd_(benef.kmMinimo) + ' km do Programa de conduta: não há benefício nesta viagem.';
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
    var l = v.linhas[L.codigo] || { valor: null, nsa: false }, x = { codigo: L.codigo, nome: L.nome, unidade: L.unidade, nsa: !!l.nsa, motivo: Com_s_(l.motivo), auto: !!l.auto, fonte: Com_s_(l.fonte), total: 0, quantidade: 0, quantidadeTxt: '', valorTxt: '' };
    var val = Number(l.valor) || 0;
    if (L.codigo === 'KM') { x.quantidade = km * 2 * vg; x.quantidadeTxt = ComPr_qtd_(x.quantidade) + ' km (' + ComPr_qtd_(km) + ' km x 2' + (vg > 1 ? ' x ' + vg + ' viagens' : '') + ')'; x.total = x.quantidade * val; }
    else if (L.codigo === 'PEDAGIO') { x.quantidade = vg; x.quantidadeTxt = Com_plural_(vg, 'viagem', 'viagens'); x.total = vg * val; }
    else if (L.codigo === 'ALIMENTACAO') { x.quantidade = P * dias * vg; x.quantidadeTxt = Com_plural_(P, 'pessoa', 'pessoas') + ' x ' + Com_plural_(dias * vg, 'dia', 'dias'); x.total = x.quantidade * val; }
    else if (L.codigo === 'HOSPEDAGEM') { x.quantidade = P * noites * vg; x.quantidadeTxt = Com_plural_(P, 'pessoa', 'pessoas') + ' x ' + Com_plural_(noites * vg, 'noite', 'noites'); x.total = x.quantidade * val; }
    else if (L.codigo === 'CONDUTA') { x.quantidade = P * vg; x.quantidadeTxt = Com_plural_(P, 'colaborador', 'colaboradores') + ' x ' + Com_plural_(vg, 'viagem', 'viagens'); x.total = x.quantidade * val; }
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
  var l = [], calc = ComPr_calcularViagem_(desl, pol);
  if (calc.ha && calc.custo > 0) {
    var pv = ComPr_precoRepasse_(calc.custo, pol);
    l.push({ ordem: 0, produtoId: '', codigo: '', tipo: 'SERVICO', auto: 'DESLOCAMENTO', descricao: COM_PR_ITEM_VIAGEM, detalhe: ComPr_detalheCliente_(desl.viagem, calc), equipamentoId: '', equipamentoTexto: '',
      unidade: 'vb', quantidade: 1, precoUnitario: pv, precoTabela: pv, custoUnitario: calc.custo, precoDiferente: false });
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
 * Precificação da proposta: custo (itens com custo + viagem + frete), impostos, preço, margem depois dos impostos e o que
 * a viagem deixou de repassar. Itens sem custo deixam a margem parcial (otimista). Sem Date cru.
 */
function ComPr_analise_(itens, descontoGeral, desl, pol) {
  pol = pol || ComPr_politica_();
  var calc = ComP_calcular_(itens, descontoGeral);
  var total = calc.total, imp = pol.impostosPct === null ? 0 : pol.impostosPct;
  var custoItens = 0, semCusto = 0, receitaAuto = {};
  var fator = calc.subtotal > 0 ? total / calc.subtotal : 1;
  (itens || []).forEach(function (i) {
    var q = Number(i.quantidade) || 0;
    if (i.auto) { receitaAuto[i.auto] = (receitaAuto[i.auto] || 0) + q * (Number(i.precoUnitario) || 0) * fator; return; }
    if (i.custoUnitario !== null && i.custoUnitario !== undefined && i.custoUnitario !== '') custoItens += q * Number(i.custoUnitario);
    else semCusto++;
  });
  var cv = ComPr_calcularViagem_(desl, pol), cf = ComPr_custoFrete_(desl);
  var custoDesl = Com_r2_(cv.custo + cf), impostos = Com_r2_(total * imp / 100), custoTotal = Com_r2_(custoItens + custoDesl);
  var margemValor = Com_r2_(total - impostos - custoTotal);
  var margemPct = total > 0 ? Math.round(margemValor / total * 10000) / 100 : null;
  var mn = pol.margemMinPct, al = pol.margemAlvoPct;
  var abaixoMin = mn !== null && margemPct !== null && margemPct < mn - 1e-9;
  var abaixoAlvo = al !== null && margemPct !== null && margemPct < al - 1e-9;
  var divisor = function (m) { var x = 1 - imp / 100 - (m || 0) / 100; return x > 0.05 ? x : null; };
  var precoMin = semCusto === 0 && mn !== null && divisor(mn) ? Com_r2_(custoTotal / divisor(mn)) : null;
  var precoAlvo = semCusto === 0 && al !== null && divisor(al) ? Com_r2_(custoTotal / divisor(al)) : null;
  var repasse = desl ? desl.repasse : '';
  var naoRepassado = null;
  if (repasse === 'ITEM' && custoDesl > 0) {
    var receitaLiq = ((receitaAuto.DESLOCAMENTO || 0) + (receitaAuto.FRETE || 0)) * (1 - imp / 100);
    naoRepassado = Com_r2_(Math.max(0, custoDesl - receitaLiq));
  }
  var r = { total: total, impostosPct: pol.impostosPct, impostos: impostos, semImpostos: pol.impostosPct === null, custoItens: Com_r2_(custoItens), custoViagem: cv.custo, custoFrete: cf, custoDeslocamento: custoDesl,
    beneficio: cv.beneficio, custoTotal: custoTotal, margemValor: margemValor, margemPct: margemPct, completa: semCusto === 0, itensSemCusto: semCusto,
    margemMinPct: mn, margemAlvoPct: al, abaixoMin: abaixoMin, abaixoAlvo: abaixoAlvo, precoMinimo: precoMin, precoAlvo: precoAlvo, repasse: repasse,
    receitaDeslocamento: Com_r2_((receitaAuto.DESLOCAMENTO || 0) + (receitaAuto.FRETE || 0)), naoRepassado: naoRepassado };
  r.situacao = margemPct === null ? 'SEM_VALOR' : abaixoMin ? 'ABAIXO_MIN' : abaixoAlvo ? 'ABAIXO_ALVO' : (mn === null && al === null ? 'SEM_POLITICA' : 'OK');
  r.situacaoTxt = { SEM_VALOR: 'sem valor para calcular', ABAIXO_MIN: 'abaixo da margem mínima: precisa da aprovação da Diretoria', ABAIXO_ALVO: 'acima da mínima, abaixo da margem alvo', SEM_POLITICA: 'a política ainda não tem margem mínima nem alvo', OK: 'dentro da margem alvo' }[r.situacao];
  r.diluir = repasse === 'DILUIDO' && custoDesl > 0 ? Com_r2_(ComPr_precoRepasse_(custoDesl, Object.assign({}, pol, { arredondarPara: 0.01 }))) : 0;
  return r;
}

/** Precificação de uma linha de COM_PROPOSTAS. { desl, analise, checklist, tipo } */
function ComPr_daProposta_(p, pol, itens) {
  pol = pol || ComPr_politica_();
  itens = itens || Com_json_(p.ITENS_JSON, []) || [];
  var desl = Com_json_(p.DESLOCAMENTO_JSON, null);
  var tipo = ComP_tipoOrcamento_(p, itens).tipo;
  return { desl: desl, tipo: tipo, analise: ComPr_analise_(itens, p.DESCONTO_GERAL, desl, pol), checklist: ComPr_checklist_(desl, tipo, pol) };
}

/** Fotografia gravada ao concluir (PRECIFICACAO_JSON): números do painel sem recalcular com a política nova. */
function ComPr_fotografia_(x, pol) {
  var a = x.analise, d = x.desl || {}, v = d.viagem || {};
  return { em: Com_agora_(), politicaVersao: pol.versao, total: a.total, custoTotal: a.custoTotal, impostos: a.impostos, margemPct: a.margemPct, completa: a.completa, abaixoMin: a.abaixoMin, abaixoAlvo: a.abaixoAlvo,
    custoViagem: a.custoViagem, custoFrete: a.custoFrete, beneficio: a.beneficio, repasse: a.repasse, receitaDeslocamento: a.receitaDeslocamento, naoRepassado: a.naoRepassado,
    viagem: v.ha === true, semViagemMotivo: v.ha === false ? Com_s_(v.motivoSem) : '', pessoas: (Number((v.equipe || {}).TECNICO) || 0) + (Number((v.equipe || {}).ENGENHEIRO) || 0), kmTrecho: v.kmTrecho === undefined ? null : v.kmTrecho };
}

/** Para a tela da proposta. Vendedor: os custos da viagem (ele preenche) e só a situação da margem; gestão: tudo. */
function ComPr_paraTela_(eu, p, itens, editavel) {
  var pol = ComPr_politica_(), x = ComPr_daProposta_(p, pol, itens);
  var desl = x.desl || ComPr_vazio_(pol), calc = ComPr_calcularViagem_(desl, pol), benef = ComPr_beneficio_(pol);
  var t = { dados: desl, preenchido: !!x.desl, calculo: calc, custoFrete: ComPr_custoFrete_(desl), custoFreteTxt: Com_moeda_(ComPr_custoFrete_(desl)), checklist: x.checklist, tipo: x.tipo,
    linhas: COM_PR_LINHAS, funcoes: COM_PR_FUNCOES, transportes: COM_PR_TRANSPORTES, repasses: COM_PR_REPASSES, beneficio: benef,
    politica: { valorKm: pol.valorKm, alimentacaoPessoaDia: pol.alimentacaoPessoaDia, diariaPessoaDia: pol.diariaPessoaDia, hospedagemPessoaNoite: pol.hospedagemPessoaNoite, horaDeslocamento: pol.horaDeslocamento,
      velocidadeMediaKmh: pol.velocidadeMediaKmh, origemPadrao: pol.origemPadrao, repassePadrao: pol.repassePadrao, versao: pol.versao, incompleta: ComPr_politicaIncompleta_(pol).map(function (f) { return f.nome; }) } };
  var a = x.analise;
  t.precoRepasse = desl.repasse === 'ITEM' ? ComPr_precoRepasse_(calc.custo, pol) : 0; t.precoRepasseTxt = Com_moeda_(t.precoRepasse);
  t.diluir = a.diluir; t.diluirTxt = Com_moeda_(a.diluir);
  t.margem = { situacao: a.situacao, situacaoTxt: a.situacaoTxt, completa: a.completa };
  if (eu && eu.veCusto) {
    t.analise = a;
    t.analiseTxt = { custoTotal: Com_moeda_(a.custoTotal), custoItens: Com_moeda_(a.custoItens), custoDeslocamento: Com_moeda_(a.custoDeslocamento), impostos: Com_moeda_(a.impostos), total: Com_moeda_(a.total),
      margem: a.margemPct === null ? '—' : Com_pct_(a.margemPct) + ' (' + Com_moeda_(a.margemValor) + ')', minima: a.margemMinPct === null ? 'não definida' : Com_pct_(a.margemMinPct, 1), alvo: a.margemAlvoPct === null ? 'não definida' : Com_pct_(a.margemAlvoPct, 1),
      impostosPct: a.impostosPct === null ? 'não definido na política' : Com_pct_(a.impostosPct, 1), precoMinimo: a.precoMinimo === null ? '' : Com_moeda_(a.precoMinimo), precoAlvo: a.precoAlvo === null ? '' : Com_moeda_(a.precoAlvo),
      naoRepassado: a.naoRepassado === null ? '' : Com_moeda_(a.naoRepassado) };
  }
  if (editavel) { t.sugestao = ComPr_sugestaoDestino_(p); t.referencias = ComPr_referencias_().slice(0, 300); }
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
        SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, { PRECO: novo, PRECO_DESDE: Com_dia_(r.VIGENCIA), ATUALIZADO_POR_NOME: Com_s_(r.USUARIO_NOME) + ' (reajuste ' + Com_s_(r.LOTE) + ')', ATUALIZADO_EM: agora });
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
    if (c.nsa && !c.auto && Number(v.kmTrecho) >= ComPr_beneficio_(pol).kmMinimo) add('CONDUTA_FORA', 'o benefício do Programa de conduta ficou "não se aplica" numa viagem de ' + ComPr_qtd_(v.kmTrecho) + ' km (' + Com_s_(c.motivo) + ')', true);
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
  if (!x.checklist.ok && s === 'RASCUNHO') add('CHECKLIST', 'checklist de custos incompleto: ' + x.checklist.faltas.map(function (f) { return f.texto.split(':')[0]; }).slice(0, 4).join(', '), false);
  if (a.naoRepassado > 0.009) add('DESCONTO_NA_VIAGEM', 'o desconto geral reduz o repasse da viagem: ' + Com_moeda_(a.naoRepassado) + ' do custo de deslocamento não volta no preço', false);
  if (a.abaixoMin && ['APROVADO', 'EXCECAO_GESTAO'].indexOf(Com_up_(p.DESCONTO_SITUACAO)) < 0) add('MARGEM_MINIMA', 'margem de ' + Com_pct_(a.margemPct) + ' abaixo da mínima de ' + Com_pct_(a.margemMinPct, 1) + (a.completa ? '' : ' (mesmo sem o custo de ' + Com_plural_(a.itensSemCusto, 'item', 'itens') + ')'), true);
  else if (a.abaixoAlvo) add('MARGEM_ALVO', 'margem de ' + Com_pct_(a.margemPct) + ' abaixo da alvo de ' + Com_pct_(a.margemAlvoPct, 1), false);
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
      porque: 'Política de precificação: todo custo de campo (km, pedágio, alimentação, diárias, hospedagem, benefício do Programa de conduta de cada colaborador) entra no preço. Falta: ' + x.checklist.faltas.slice(0, 3).map(function (f) { return f.texto.split(';')[0]; }).join('; ') + '.',
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
  (ctx.propostas || Com_ler_(COM_ABAS.PROPOSTAS)).forEach(function (p) {
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
  var sr = ComPr_semReajuste_(null, pol.reajusteAlertaMeses || 12);
  if (sr.length) itens.push({ chave: 'SEM_REAJUSTE', regra: 'CATALOGO_SEM_REAJUSTE', prioridade: 4, titulo: Com_plural_(sr.length, 'item do catálogo está', 'itens do catálogo estão') + ' sem reajuste há mais de ' + Com_plural_(pol.reajusteAlertaMeses || 12, 'mês', 'meses'), ref: { tipo: 'catalogo' },
    porque: 'Política de reajuste: preço parado perde margem com a inflação e com o custo novo de peças e mão de obra.', acao: 'A Diretoria aplica o reajuste em Produtos e serviços > Reajustar preços (com prévia e histórico).' });
  return itens;
}

/** Quadro "Precificação e estratégia" do painel (gestão). comp 'aaaa-mm'; vendedorId opcional. */
function ComPr_quadroPainel_(comp, vendedorId) {
  var pol = ComPr_politica_();
  var props = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (p) { return !vendedorId || Com_s_(p.RESPONSAVEL_ID) === vendedorId; });
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
  if (r.abaixoMin.length) r.estrategia.push(Com_plural_(r.abaixoMin.length, 'proposta saiu', 'propostas saíram') + ' abaixo da margem mínima no mês: revise preço, escopo ou repasse da viagem antes de aprovar exceções.');
  if (r.naoRepassado > 0) r.estrategia.push(r.naoRepassadoTxt + ' de custo de viagem não voltou no preço (desconto sobre o item de deslocamento): dê desconto nos serviços, não na viagem.');
  if (r.semCalculo) r.estrategia.push(Com_plural_(r.semCalculo, 'proposta de serviço enviada', 'propostas de serviço enviadas') + ' sem o cálculo da viagem (anteriores ao checklist ou sem registro): confira se o custo de campo estava no preço.');
  if (r.semReajuste) r.estrategia.push(Com_plural_(r.semReajuste, 'item do catálogo', 'itens do catálogo') + ' sem reajuste há mais de ' + r.reajusteMeses + ' meses: avalie o reajuste anual.');
  if (r.margemMedia !== null && pol.margemAlvoPct !== null && r.margemMedia < pol.margemAlvoPct) r.estrategia.push('Margem média do mês (' + r.margemMediaTxt + ') abaixo da alvo (' + r.margemAlvoTxt + '): venda valor técnico e reduza desconto.');
  return r;
}
