/**
 * Painel financeiro > Indicadores (Onda 2 do Financeiro, E4 e E5, 16/11/2026). Especificação: ESPEC_ONDA2_FINANCEIRO.md,
 * seções 1.2 (indicadores I01 a I19), 1.4 (gráficos) e 3.3 (nota de saúde, SGO_Financeiro_Saude.js).
 *
 * Números calculados pelo SISTEMA, em centavos inteiros, a partir da fotografia diária (SGO_Financeiro_Foto.js): a aba NÃO
 * chama o Omie. Cada indicador traz o valor, o da fotografia de 7 (ou 30) dias atrás, a seta, uma linha "como é calculado" e
 * uma linha "o que é e como ler". Fonte que falhou ou ficou incompleta: "não calculado: motivo" (nunca zero).
 * Sigilo: Fin_apiIndicadores passa por Omie_exigirAcesso_ (lista de sigilo + caixa FIN_OMIE_CONSULTAR) e fica no registro de
 * acessos ("Indicadores do Financeiro"). Gráficos em SVG no servidor, com as funções do A4 (RelA4_barras_,
 * RelA4_barrasEmpilhadas_) e duas no mesmo padrão (colunas agrupadas e linha), para a tela e o relatório semanal desenharem igual.
 * Saldo mínimo (FIN_SALDO_MINIMO) e nota de saúde (FIN_SAUDE_PESOS, FIN_SAUDE_LIMITES): Chaves e senhas > Regras do Financeiro;
 * sem valor = "a definir" / padrão da especificação.
 */
var FIN_IND_DEF = [
  { c: 'I01', nome: 'Saldo em contas', melhor: 'maior', calc: 'Soma dos saldos das contas correntes no resumo do Omie. O limite de crédito fica à parte e nunca é somado.', ler: 'Quanto a empresa tem hoje nos bancos e no caixa. Compare com o que vence a pagar nos próximos dias.' },
  { c: 'I01M', nome: 'Folga sobre o saldo mínimo', melhor: 'maior', calc: 'Saldo em contas menos o saldo mínimo de segurança definido em Chaves e senhas > Regras do Financeiro.', ler: 'Positivo: o caixa está acima do mínimo combinado. Negativo: está abaixo; priorize recebimentos e adie o que puder. Sem o mínimo definido, mostra "a definir".' },
  { c: 'I02', nome: 'A receber em aberto', melhor: '', calc: 'Soma do saldo em aberto (não o valor do documento) dos títulos a receber não cancelados, com vencimento de 12 meses atrás até 90 dias à frente.', ler: 'Tudo o que os clientes ainda devem, vencido ou não. Pagamentos parciais já estão descontados.' },
  { c: 'I03', nome: 'A receber vencido', melhor: 'menor', calc: 'Parte do "a receber em aberto" com vencimento antes de hoje.', ler: 'Dinheiro que já devia ter entrado. Quanto menor, melhor; o detalhe por cliente está em "Maiores devedores".' },
  { c: 'I04', nome: 'Inadimplência', melhor: 'menor', calc: 'A receber vencido dividido pelo a receber em aberto, vezes 100.', ler: 'Que parte do que os clientes devem já venceu. Atraso curto é rotina; veja também a parte acima de 30 dias.' },
  { c: 'I05', nome: 'Inadimplência acima de 30 dias', melhor: 'menor', calc: 'Vencidos há mais de 30 dias divididos pelo a receber em aberto, vezes 100.', ler: 'O risco de verdade: atraso longo costuma virar perda. É o critério C3 da nota de saúde.' },
  { c: 'I06', nome: 'A pagar em aberto', melhor: '', calc: 'Soma do saldo em aberto dos títulos a pagar não cancelados (mesma janela do a receber); o detalhe mostra a parte vencida.', ler: 'O que a empresa deve aos fornecedores. A parte vencida deve ser zero: se não for, gera juros e entra na nota de saúde.' },
  { c: 'I07', nome: 'Resultado de caixa do mês', melhor: 'maior', calc: 'Recebido menos pago no mês, pela data em que o dinheiro entrou ou saiu. Transferências entre contas da empresa ficam fora.', ler: 'Se o mês está fechando no positivo até hoje. O mês ainda não acabou: compare com o mesmo ponto do mês anterior.' },
  { c: 'I08', nome: 'Margem de caixa do mês', melhor: 'maior', calc: 'Recebido menos pago, dividido pelo recebido, vezes 100 (mês atual até hoje). A nota de saúde usa os 3 últimos meses fechados.', ler: 'De cada R$ 100 que entraram, quanto sobrou depois dos pagamentos. Negativo: saiu mais do que entrou.' },
  { c: 'I09', nome: 'Prazo médio de recebimento', melhor: 'menor', calc: 'Média, ponderada pelo valor, dos dias entre a emissão e o pagamento dos títulos recebidos nos últimos 90 dias.', ler: 'Quantos dias, em média, o dinheiro leva para entrar depois da venda. Se for maior que o prazo de pagamento, o caixa financia os clientes.' },
  { c: 'I10', nome: 'Atraso médio de recebimento', melhor: 'menor', calc: 'Média, ponderada pelo valor, dos dias de atraso (pagamento menos vencimento; pago em dia conta zero) dos títulos recebidos nos últimos 90 dias.', ler: 'Quantos dias depois do vencimento os clientes pagam, em média. Mesma conta da Ficha do cliente, agora pesando o valor.' },
  { c: 'I11', nome: 'Prazo médio de pagamento', melhor: 'maior', calc: 'Média, ponderada pelo valor, dos dias entre a emissão e o pagamento das contas pagas nos últimos 90 dias.', ler: 'Quantos dias a empresa leva para pagar depois da compra. Compare com o prazo de recebimento.' },
  { c: 'I12', nome: 'Cobertura de caixa', melhor: 'maior', calc: 'Saldo em contas dividido pela média diária de pagamentos dos últimos 90 dias (sem transferências).', ler: 'Quantos dias a empresa paga as contas só com o saldo de hoje, sem receber nada. É o critério C1 da nota de saúde.' },
  { c: 'I13', nome: 'Cobertura dos compromissos de 30 dias', melhor: 'maior', calc: '(Saldo em contas + a receber que vence nos próximos 30 dias × taxa de realização) dividido pelo a pagar até 30 dias (incluindo o vencido). Taxa de realização: quanto do que venceu nos últimos 90 dias foi recebido até o vencimento.', ler: 'Acima de 1, o caixa fecha os próximos 30 dias; abaixo de 1, vai faltar dinheiro se nada mudar. É o critério C2 da nota de saúde.' },
  { c: 'I14', nome: 'Concentração de recebíveis', melhor: 'menor', calc: 'Soma dos 5 maiores clientes no a receber em aberto, dividida pelo total a receber, vezes 100.', ler: 'Dependência de poucos clientes: quanto maior, maior o risco se um deles atrasar. É o critério C5 da nota de saúde.' },
  { c: 'I15', nome: 'Orçado × realizado do mês', melhor: '', calc: 'Realizado dividido pelo previsto, vezes 100, somando as categorias do orçamento do mês no Omie.', ler: 'Só aparece com orçamento cadastrado no Omie. Perto de 100 %: o mês está seguindo o planejado.' },
  { c: 'I16', nome: 'Execução da cobrança', melhor: 'maior', calc: 'Vencidos com ação de cobrança registrada nos últimos 7 dias, divididos pelos vencidos, vezes 100.', ler: 'Mede o trabalho de cobrança, não o cliente. Passa a ser calculado com a régua de cobrança.' },
  { c: 'I17', nome: 'Conciliação bancária em dia', melhor: 'menor', calc: 'Dias desde a última data de extrato conferida na aba Conciliação bancária, na conta mais atrasada.', ler: 'Até 7 dias é o combinado. Mais do que isso, o saldo do Omie pode não bater com o banco.' },
  { c: 'I18', nome: 'Envios incertos ao Omie', melhor: 'menor', calc: 'Quantidade de envios ao Omie sem resposta clara, aguardando conferência em Lançamentos e baixas > Envios a conferir.', ler: 'Deve ser zero. Cada um precisa ser conferido no Omie para não lançar em dobro.' },
  { c: 'I19', nome: 'Caju: prestações vencidas e divergências', melhor: 'menor', calc: 'Prestações de contas de viagem com prazo vencido mais as divergências abertas da Conciliação Caju.', ler: 'Pendências do cartão Caju que dependem de alguém agir. Deve ser zero.' }
];
var FIN_IND_DIAS_COMPARAR = [7, 30];

function FinInd_s_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function FinInd_num_(n, casas) {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  casas = casas === undefined ? 0 : casas;
  var f = Math.abs(Number(n)).toFixed(casas).split('.'), i = f[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  var t = i + (casas > 0 ? ',' + f[1] : '');
  return (Number(n) < 0 && /[1-9]/.test(t) ? '-' : '') + t;
}
function FinInd_moeda_(n) { return n === null || n === undefined || !isFinite(n) ? '—' : (Number(n) < 0 ? '-R$ ' : 'R$ ') + FinInd_num_(Math.abs(Number(n)), 2); }
function FinInd_pct_(n) { return FinInd_num_(n, 1) + ' %'; }
function FinInd_dias_(n) { var r = Math.round(Number(n)); return FinInd_num_(r, 0) + (Math.abs(r) === 1 ? ' dia' : ' dias'); }
function FinInd_r2_(n) { return Math.round(Number(n) * 100) / 100; }
function FinInd_r1_(n) { return Math.round(Number(n) * 10) / 10; }
function FinInd_nao_(motivo) { return { valor: null, texto: 'não calculado', motivo: motivo }; }

/** Saldo mínimo de segurança em Chaves e senhas (null = a definir). */
function FinInd_saldoMinimo_() {
  var t = '';
  try { t = FinInd_s_(PropertiesService.getScriptProperties().getProperty('FIN_SALDO_MINIMO')); } catch (e) { t = ''; }
  if (!t) return null;
  var n = typeof OmieRegras_dinheiro_ === 'function' ? OmieRegras_dinheiro_(t) : Number(t);
  return isFinite(n) && n >= 0 ? n : null;
}

/** Média ponderada pelo valor de (fim − início) em dias; só positivos se soPositivos. registros: [{c, ini, fim}]. */
function FinInd_mediaPonderada_(regs, soPositivos) {
  var soma = 0, peso = 0;
  regs.forEach(function (x) {
    var d = FinFoto_diasEntre_(x.ini, x.fim); if (d === null) return;
    if (soPositivos && d < 0) d = 0;
    soma += d * x.c; peso += x.c;
  });
  return peso > 0 ? soma / peso : null;
}

/**
 * Indicadores I01 a I15 a partir dos acumuladores da rotina (centavos). Função sem leitura do Omie: os testes montam o acum à
 * mão. mesesGravados: FIN_FOTO_MES (para os meses que a rotina não conseguiu ler hoje). Devolve { indicadores, aging, top, extra }.
 */
function FinInd_montar_(acum, dia, mesesGravados) {
  acum = acum || FinFoto_acumNovo_(); mesesGravados = mesesGravados || {};
  var f = acum.falhas || {}, ind = {}, t = acum.tit, R = t.R, P = t.P;
  var falhou = function (k) { return f[k] ? 'a leitura do Omie (' + (FIN_FOTO_NOMES_PASSOS[k] || k) + ') falhou: ' + f[k] : ''; };
  // I01 saldo
  var saldo = acum.posicao && !f.posicao ? acum.posicao.saldo : null;
  ind.I01 = saldo === null ? FinInd_nao_(falhou('posicao') || 'o resumo do Omie não foi lido') : { valor: saldo, texto: FinInd_moeda_(saldo),
    detalhe: acum.posicao.limite ? 'Limite de crédito à parte (não somado): ' + FinInd_moeda_(acum.posicao.limite) + '.' : '' };
  // I02 a I06 (títulos por vencimento)
  var semTit = falhou('titulos');
  var aberto = R.aberto / 100, vencido = R.vencido / 100, mais30 = (R.faixas.de31a90 + R.faixas.mais90) / 100;
  if (semTit) {
    ['I02', 'I03', 'I04', 'I05', 'I06', 'I14'].forEach(function (k) { ind[k] = FinInd_nao_(semTit); });
  } else {
    ind.I02 = { valor: aberto, texto: FinInd_moeda_(aberto), detalhe: t.n + ' título(s) lido(s) na janela; ' + t.cancelados + ' cancelado(s) fora da conta.' };
    ind.I03 = { valor: vencido, texto: FinInd_moeda_(vencido) };
    ind.I04 = R.aberto > 0 ? { valor: FinInd_r1_(R.vencido / R.aberto * 100), texto: FinInd_pct_(R.vencido / R.aberto * 100) } : { valor: 0, texto: FinInd_pct_(0), detalhe: 'Não há nada a receber em aberto.' };
    ind.I05 = R.aberto > 0 ? { valor: FinInd_r1_((R.faixas.de31a90 + R.faixas.mais90) / R.aberto * 100), texto: FinInd_pct_((R.faixas.de31a90 + R.faixas.mais90) / R.aberto * 100), detalhe: 'Vencido há mais de 30 dias: ' + FinInd_moeda_(mais30) + '.' }
      : { valor: 0, texto: FinInd_pct_(0), detalhe: 'Não há nada a receber em aberto.' };
    ind.I06 = { valor: P.aberto / 100, texto: FinInd_moeda_(P.aberto / 100), vencido: P.vencido / 100, detalhe: 'Vencido: ' + FinInd_moeda_(P.vencido / 100) + (P.vencido ? ' (deveria ser zero).' : '.') };
    var tops = Object.keys(R.cli).map(function (k) { return R.cli[k]; }).sort(function (a, b) { return b - a; }).slice(0, 5), soma5 = tops.reduce(function (a, b) { return a + b; }, 0);
    ind.I14 = R.aberto > 0 ? { valor: FinInd_r1_(soma5 / R.aberto * 100), texto: FinInd_pct_(soma5 / R.aberto * 100), detalhe: 'Os ' + tops.length + ' maiores somam ' + FinInd_moeda_(soma5 / 100) + '.' }
      : FinInd_nao_('não há nada a receber em aberto');
  }
  // I07 e I08 (mês atual) e margem dos 3 meses fechados
  var mesAtual = dia.slice(0, 7), mes = function (m) {
    var a = (acum.meses || {})[m]; if (a) return { rec: Number(a.rec) || 0, pag: Number(a.pag) || 0 };
    var g = mesesGravados[m]; return g && !f['mes:' + m] && FinInd_s_(g.LIDO_EM) ? { rec: Number(g.RECEBIDO) || 0, pag: Number(g.PAGO) || 0 } : null;
  };
  var m0 = (acum.meses || {})[mesAtual] ? mes(mesAtual) : null;
  if (!m0) { var mot0 = f['mes:' + mesAtual] ? 'a leitura dos pagamentos do mês falhou: ' + f['mes:' + mesAtual] : falhou('meses') || 'os pagamentos do mês não foram lidos'; ind.I07 = FinInd_nao_(mot0); ind.I08 = FinInd_nao_(mot0); }
  else {
    var ate = FinFoto_br_(dia).slice(0, 5);
    ind.I07 = { valor: FinInd_r2_(m0.rec - m0.pag), texto: FinInd_moeda_(m0.rec - m0.pag), recebido: m0.rec, pago: m0.pag, detalhe: 'Até ' + ate + ': recebido ' + FinInd_moeda_(m0.rec) + ', pago ' + FinInd_moeda_(m0.pag) + '.' };
    ind.I08 = m0.rec > 0 ? { valor: FinInd_r1_((m0.rec - m0.pag) / m0.rec * 100), texto: FinInd_pct_((m0.rec - m0.pag) / m0.rec * 100), rotulo: 'até ' + ate } : FinInd_nao_('nada foi recebido no mês até ' + ate);
  }
  var tres = [1, 2, 3].map(function (i) { return mes(FinFoto_mesMenos_(mesAtual, i)); });
  if (!ind.I08 || ind.I08.valor === null) ind.I08 = ind.I08 || FinInd_nao_('sem dados');
  if (tres.some(function (x) { return !x; })) { ind.I08.margem3m = null; ind.I08.motivo3m = 'faltam pagamentos de algum dos 3 últimos meses fechados'; }
  else {
    var r3 = tres.reduce(function (a, x) { return a + x.rec; }, 0), p3 = tres.reduce(function (a, x) { return a + x.pag; }, 0);
    if (r3 > 0) { ind.I08.margem3m = FinInd_r1_((r3 - p3) / r3 * 100); ind.I08.detalhe3m = 'Três últimos meses fechados: ' + FinInd_pct_((r3 - p3) / r3 * 100) + '.'; }
    else { ind.I08.margem3m = null; ind.I08.motivo3m = 'nada recebido nos 3 últimos meses fechados'; }
  }
  // I09 a I12 (pagamentos dos últimos 90 dias)
  var semMeses = (f.meses || f.categorias) ? 'a leitura dos pagamentos falhou: ' + (f.meses || f.categorias) : '';
  var falhaMes90 = [0, 1, 2, 3].map(function (i) { return f['mes:' + FinFoto_mesMenos_(mesAtual, i)]; }).filter(Boolean)[0];
  if (!semMeses && falhaMes90) semMeses = 'a leitura dos pagamentos de um dos últimos meses falhou: ' + falhaMes90;
  var pg = (acum.pgts || []).map(function (x) { return { n: x[0], pg: x[1], venc: x[2], em: x[3], c: x[4] }; });
  var rec = pg.filter(function (x) { return x.n === 'R'; }), pag = pg.filter(function (x) { return x.n === 'P'; });
  var prazoMedio = function (lista, rotulo) {
    if (semMeses) return FinInd_nao_(semMeses);
    if (!lista.length) return FinInd_nao_('nenhum ' + rotulo + ' nos últimos 90 dias');
    var com = lista.filter(function (x) { return x.em; });
    if (!com.length) return FinInd_nao_('o Omie não devolveu a data de emissão dos títulos (campo a confirmar na primeira operação acompanhada); veja o atraso médio');
    var v = FinInd_mediaPonderada_(com.map(function (x) { return { c: x.c, ini: x.em, fim: x.pg }; }), false);
    return { valor: FinInd_r1_(v), texto: FinInd_dias_(v), detalhe: com.length < lista.length ? (lista.length - com.length) + ' de ' + lista.length + ' sem data de emissão ficaram fora.' : lista.length + ' título(s) nos últimos 90 dias.' };
  };
  ind.I09 = prazoMedio(rec, 'recebimento');
  ind.I11 = prazoMedio(pag, 'pagamento');
  if (semMeses) ind.I10 = FinInd_nao_(semMeses);
  else if (!rec.length) ind.I10 = FinInd_nao_('nenhum recebimento nos últimos 90 dias');
  else { var at = FinInd_mediaPonderada_(rec.filter(function (x) { return x.venc; }).map(function (x) { return { c: x.c, ini: x.venc, fim: x.pg }; }), true); ind.I10 = at === null ? FinInd_nao_('os recebimentos vieram sem vencimento') : { valor: FinInd_r1_(at), texto: FinInd_dias_(at), detalhe: rec.length + ' recebimento(s) nos últimos 90 dias.' }; }
  var pago90 = pag.reduce(function (a, x) { return a + x.c; }, 0) / 100;
  if (saldo === null) ind.I12 = FinInd_nao_(ind.I01.motivo);
  else if (semMeses) ind.I12 = FinInd_nao_(semMeses);
  else if (!(pago90 > 0)) ind.I12 = FinInd_nao_('nenhum pagamento nos últimos 90 dias');
  else { var c12 = saldo / (pago90 / 90); ind.I12 = { valor: FinInd_r1_(c12), texto: FinInd_dias_(c12), detalhe: 'Média diária de pagamentos: ' + FinInd_moeda_(pago90 / 90) + '.' }; }
  // I13 compromissos de 30 dias
  if (saldo === null) ind.I13 = FinInd_nao_(ind.I01.motivo);
  else if (semTit) ind.I13 = FinInd_nao_(semTit);
  else {
    var taxa = R.base90 > 0 ? R.noPrazo90 / R.base90 : 1, entra = R.ate30d / 100 * taxa, sai = P.ate30d / 100;
    var det13 = 'Taxa de realização: ' + FinInd_pct_(taxa * 100) + (R.base90 > 0 ? '' : ' (nada venceu nos últimos 90 dias; considerada 100 %)') + '; a receber em 30 dias: ' + FinInd_moeda_(R.ate30d / 100) + '; a pagar até 30 dias: ' + FinInd_moeda_(sai) + '.';
    ind.I13 = sai > 0 ? { valor: FinInd_r2_((saldo + entra) / sai), texto: FinInd_num_((saldo + entra) / sai, 2) + ' vezes', detalhe: det13, taxa: FinInd_r1_(taxa * 100) }
      : { valor: null, infinito: true, texto: 'sem contas a pagar em 30 dias', detalhe: det13, taxa: FinInd_r1_(taxa * 100) };
  }
  // I15 orçado × realizado
  if (f.orcamento) ind.I15 = FinInd_nao_(falhou('orcamento'));
  else if (!acum.orc || !acum.orc.length) ind.I15 = FinInd_nao_('não há orçamento cadastrado no Omie para este mês');
  else {
    var prev = acum.orc.reduce(function (a, x) { return a + Math.round((Number(x.previsto) || 0) * 100); }, 0) / 100, real = acum.orc.reduce(function (a, x) { return a + Math.round((Number(x.realizado) || 0) * 100); }, 0) / 100;
    ind.I15 = prev > 0 ? { valor: FinInd_r1_(real / prev * 100), texto: FinInd_pct_(real / prev * 100), detalhe: 'Previsto ' + FinInd_moeda_(prev) + ', realizado ' + FinInd_moeda_(real) + ' (' + acum.orc.length + ' categorias).' }
      : FinInd_nao_('o orçamento do mês está sem valor previsto');
  }
  ind.I16 = FinInd_nao_('a régua de cobrança (próxima etapa) ainda não registra as ações; este índice aparece com ela');
  // aging e maiores clientes (só códigos do Omie e valores; nunca CNPJ)
  var ordenar = function (m) { return Object.keys(m).map(function (k) { return { codigo: Number(k) || 0, valor: m[k] / 100 }; }).sort(function (a, b) { return b.valor - a.valor; }).slice(0, 10); };
  return { indicadores: ind,
    aging: semTit ? null : { aVencer: R.faixas.aVencer / 100, ate30: R.faixas.ate30 / 100, de31a90: R.faixas.de31a90 / 100, mais90: R.faixas.mais90 / 100 },
    top: semTit ? { aberto: [], vencido: [] } : { aberto: ordenar(R.cli), vencido: ordenar(R.vencCli) },
    extra: { orc: (acum.orc || []).slice(0, 15), paginas: acum.paginas } };
}

function FinInd_diasUteis_(de, ate) {
  var n = 0, d = de;
  for (var i = 0; i < 400 && d < ate; i++) {
    d = FinFoto_somarDias_(d, 1);
    var util = typeof Via_diaUtil_ === 'function' ? Via_diaUtil_(d) : [0, 6].indexOf(new Date(d + 'T12:00:00Z').getUTCDay()) < 0;
    if (util) n++;
  }
  return n;
}
/** I17, I18, I19 e o gráfico G8, das tabelas do próprio SGO+ (sem Omie). */
function FinInd_local_(dia) {
  var ind = {}, g8 = null;
  // I17 conciliação bancária (OMIE_CONCILIACOES): última data de extrato conferida por conta
  try {
    var linhas = FinFoto_ler_(typeof OMIE_CONC_ABA === 'string' ? OMIE_CONC_ABA : 'OMIE_CONCILIACOES'), emp = typeof OmieConc_empresa_ === 'function' ? OmieConc_empresa_() : '';
    var porConta = {};
    linhas.forEach(function (r) {
      var conta = FinInd_s_(r.CONTA_ID); if (emp && conta.indexOf(emp + ':') !== 0) return;
      var d = FinFoto_json_(r.DADOS_JSON, {}), data = FinInd_s_(d && d.banco && d.banco.data).slice(0, 10) || FinInd_s_(r.CRIADO_EM).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
      if (!porConta[conta] || data > porConta[conta]) porConta[conta] = data;
    });
    var contas = Object.keys(porConta);
    if (!contas.length) ind.I17 = FinInd_nao_('nenhuma conferência de extrato registrada no SGO+ (aba Conciliação bancária)');
    else {
      var pior = contas.map(function (k) { return porConta[k]; }).sort()[0], dias = Math.max(0, FinFoto_diasEntre_(pior, dia));
      ind.I17 = { valor: dias, texto: FinInd_dias_(dias), detalhe: contas.length + ' conta(s) conferida(s); a mais atrasada foi conferida até ' + FinFoto_br_(pior) + '.' };
    }
  } catch (e) { ind.I17 = FinInd_nao_('não foi possível ler as conferências bancárias'); }
  // I18 envios incertos
  try { var inc = typeof OmieOps_incertos_ === 'function' ? OmieOps_incertos_().length : null; ind.I18 = inc === null ? FinInd_nao_('módulo de lançamentos indisponível') : { valor: inc, texto: String(inc) }; }
  catch (e) { ind.I18 = FinInd_nao_('não foi possível ler os envios a conferir'); }
  // I19 Caju: prestações vencidas (Depósito de viagem) e divergências abertas (Conciliação Caju)
  try {
    var sols = typeof VIA_ABAS !== 'undefined' ? FinFoto_ler_(VIA_ABAS.SOLICITACOES) : [], venc = 0, venc10 = 0;
    if (typeof Via_prazoInfo_ === 'function') sols.forEach(function (r) { var pz = Via_prazoInfo_(r); if (pz && pz.vencida) { venc++; if (FinInd_diasUteis_(pz.prazo, dia) > 10) venc10++; } });
    var divs = FinFoto_ler_(typeof CJU_ABAS !== 'undefined' ? CJU_ABAS.DIVERGENCIAS : 'CJU_DIVERGENCIAS').filter(function (d) { return FinInd_s_(d.SITUACAO).toUpperCase() === 'ABERTA'; });
    var somaDiv = divs.reduce(function (a, d) { return a + Math.round(Math.abs(Number(d.VALOR) || 0) * 100); }, 0) / 100;
    ind.I19 = { valor: venc + divs.length, texto: String(venc + divs.length), vencidas: venc, vencidas10: venc10, divergencias: divs.length,
      detalhe: venc + ' prestação(ões) vencida(s)' + (venc10 ? ' (' + venc10 + ' há mais de 10 dias úteis)' : '') + ' e ' + divs.length + ' divergência(s) aberta(s)' + (divs.length ? ' somando ' + FinInd_moeda_(somaDiv) : '') + '.' };
  } catch (e) { ind.I19 = FinInd_nao_('não foi possível ler as pendências do Caju'); }
  // G8: viagem no Caju, 6 meses: carregado (VIA_CARGAS), gasto conciliado e gasto sem comprovante (CJU_EXTRATO)
  try {
    var meses = [], mesAt = dia.slice(0, 7); for (var i = 5; i >= 0; i--) meses.push(FinFoto_mesMenos_(mesAt, i));
    var base = {}; meses.forEach(function (m) { base[m] = [0, 0, 0]; });
    var tem = false;
    FinFoto_ler_(typeof VIA_ABAS !== 'undefined' ? VIA_ABAS.CARGAS : 'VIA_CARGAS').forEach(function (c) { var m = FinInd_s_(c.DATA).slice(0, 7); if (base[m]) { base[m][0] += Math.round((Number(c.VALOR) || 0) * 100); tem = true; } });
    FinFoto_ler_(typeof CJU_ABAS !== 'undefined' ? CJU_ABAS.EXTRATO : 'CJU_EXTRATO').forEach(function (x) {
      if (FinInd_s_(x.TIPO).toUpperCase() !== 'GASTO' || FinInd_s_(x.REMOVIDA_EM)) return;
      var m = FinInd_s_(x.DATA).slice(0, 7); if (!base[m]) return;
      base[m][FinInd_s_(x.GASTO_ID) ? 1 : 2] += Math.round(Math.abs(Number(x.VALOR) || 0) * 100); tem = true;
    });
    g8 = tem ? meses.map(function (m) { return [m, base[m][0] / 100, base[m][1] / 100, base[m][2] / 100]; }) : [];
  } catch (e) { g8 = null; }
  return { indicadores: ind, g8: g8 };
}

/** Entrada da nota de saúde a partir dos indicadores gravados (SGO_Financeiro_Saude.js). */
function FinInd_paraSaude_(ind) {
  ind = ind || {};
  var chk = function (nome, k, teste) { var x = ind[k]; if (!x || x.valor === null || x.valor === undefined) return { nome: nome, ok: null, motivo: (x && x.motivo) || 'sem dado' }; return { nome: nome, ok: !!teste(x) }; };
  return { I12: ind.I12, I13: ind.I13, I05: ind.I05, I08: ind.I08, I14: ind.I14,
    disciplina: [
      chk('conciliação bancária com até 7 dias', 'I17', function (x) { return x.valor <= 7; }),
      chk('nenhum envio incerto ao Omie', 'I18', function (x) { return x.valor === 0; }),
      chk('nenhuma prestação Caju vencida há mais de 10 dias úteis', 'I19', function (x) { return !x.vencidas10; }),
      chk('nenhum título a pagar vencido', 'I06', function (x) { return !(x.vencido > 0); })
    ] };
}

// ------------------------------------------------------------ gráficos (SVG, padrão do A4)
function FinInd_cor_(k) { return (typeof RELA4_CORES !== 'undefined' && RELA4_CORES[k]) || { azul: '#1f5fa8', verde: '#1d6b3f', vermelho: '#a61b1b', laranja: '#b45309', ambar: '#c98a12', cinza: '#7b8794' }[k]; }
function FinInd_txt_(x, y, t, extra) { return typeof RelA4_txtSvg_ === 'function' ? RelA4_txtSvg_(x, y, t, extra) : ''; }
function FinInd_figura_(svg, titulo, legenda) { return typeof RelA4_figura_ === 'function' ? RelA4_figura_(svg, titulo, legenda) : svg; }
function FinInd_milhar_(v) { var a = Math.abs(v); return a >= 1e6 ? FinInd_num_(v / 1e6, 1) + ' mi' : a >= 1e3 ? FinInd_num_(v / 1e3, 0) + ' mil' : FinInd_num_(v, 0); }
/** Colunas agrupadas por mês (até 3 séries) e, se houver, uma linha (ex.: o resultado). */
function FinInd_svgColunas_(rotulos, series, opts) {
  opts = opts || {};
  var vals = [];
  series.forEach(function (s) { s.valores.forEach(function (v) { vals.push(Number(v) || 0); }); });
  if (opts.linha) opts.linha.valores.forEach(function (v) { vals.push(Number(v) || 0); });
  var max = Math.max.apply(null, vals.concat([1])), min = Math.min.apply(null, vals.concat([0]));
  var W = 680, H = 230, esq = 52, dir = 10, topo = 14, base = 30, alt = H - topo - base, larg = W - esq - dir;
  var passo = larg / Math.max(rotulos.length, 1), wb = Math.min(22, passo * 0.8 / series.length);
  var y = function (v) { return topo + alt - (v - min) / (max - min || 1) * alt; };
  var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img" aria-label="' + (opts.aria || '') + '">'];
  [min, (min + max) / 2, max].forEach(function (v) {
    s.push('<line x1="' + esq + '" y1="' + y(v).toFixed(1) + '" x2="' + (W - dir) + '" y2="' + y(v).toFixed(1) + '" stroke="#e7ebef" stroke-width="0.7"/>');
    s.push(FinInd_txt_(esq - 5, y(v) + 3, FinInd_milhar_(v), 'font-size="8.5" fill="#52606d" text-anchor="end"'));
  });
  s.push('<line x1="' + esq + '" y1="' + y(0).toFixed(1) + '" x2="' + (W - dir) + '" y2="' + y(0).toFixed(1) + '" stroke="#9aa5b1" stroke-width="0.8"/>');
  rotulos.forEach(function (r, k) {
    var x0 = esq + passo * k + (passo - wb * series.length) / 2;
    series.forEach(function (se, j) {
      var v = Number(se.valores[k]) || 0, y1 = y(Math.max(v, 0)), y2 = y(Math.min(v, 0));
      s.push('<rect x="' + (x0 + j * wb).toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + (wb - 1).toFixed(1) + '" height="' + Math.max(y2 - y1, 0.8).toFixed(1) + '" fill="' + se.cor + '" fill-opacity="0.88"/>');
    });
    s.push(FinInd_txt_(esq + passo * k + passo / 2, H - base + 14, r, 'font-size="9.5" fill="#1f2933" text-anchor="middle"'));
  });
  if (opts.linha) {
    var pts = opts.linha.valores.map(function (v, k) { return (esq + passo * k + passo / 2).toFixed(1) + ',' + y(Number(v) || 0).toFixed(1); });
    s.push('<polyline fill="none" stroke="' + opts.linha.cor + '" stroke-width="1.8" points="' + pts.join(' ') + '"/>');
    pts.forEach(function (p) { var xy = p.split(','); s.push('<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="2.2" fill="' + opts.linha.cor + '"/>'); });
  }
  if (opts.unidade) s.push(FinInd_txt_(esq - 5, topo - 4, opts.unidade, 'font-size="8.5" fill="#52606d" text-anchor="start"'));
  s.push('</svg>');
  var leg = series.map(function (x) { return { cor: x.cor, rotulo: x.rotulo }; });
  if (opts.linha) leg.push({ cor: opts.linha.cor, rotulo: opts.linha.rotulo });
  return FinInd_figura_(s.join(''), opts.titulo, leg);
}
/** Linha simples (ex.: inadimplência semana a semana), com o valor em cada ponto. */
function FinInd_svgLinha_(pontos, opts) {
  opts = opts || {};
  var W = 680, H = 200, esq = 40, dir = 14, topo = 18, base = 26, alt = H - topo - base, larg = W - esq - dir;
  var max = Math.max.apply(null, pontos.map(function (p) { return p.valor; }).concat([1])) * 1.15;
  var x = function (k) { return esq + (pontos.length === 1 ? larg / 2 : k / (pontos.length - 1) * larg); }, y = function (v) { return topo + alt - v / max * alt; };
  var cor = opts.cor || FinInd_cor_('vermelho');
  var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img" aria-label="' + (opts.aria || '') + '">'];
  [0, max / 2, max].forEach(function (v) {
    s.push('<line x1="' + esq + '" y1="' + y(v).toFixed(1) + '" x2="' + (W - dir) + '" y2="' + y(v).toFixed(1) + '" stroke="#e7ebef" stroke-width="0.7"/>');
    s.push(FinInd_txt_(esq - 5, y(v) + 3, FinInd_num_(v, 0) + (opts.unidade || ''), 'font-size="8.5" fill="#52606d" text-anchor="end"'));
  });
  s.push('<polyline fill="none" stroke="' + cor + '" stroke-width="1.8" points="' + pontos.map(function (p, k) { return x(k).toFixed(1) + ',' + y(p.valor).toFixed(1); }).join(' ') + '"/>');
  pontos.forEach(function (p, k) {
    s.push('<circle cx="' + x(k).toFixed(1) + '" cy="' + y(p.valor).toFixed(1) + '" r="2.4" fill="' + cor + '"/>');
    s.push(FinInd_txt_(x(k), y(p.valor) - 6, FinInd_num_(p.valor, 1), 'font-size="8.5" fill="#1f2933" text-anchor="middle"'));
    s.push(FinInd_txt_(x(k), H - base + 14, p.rotulo, 'font-size="8.5" fill="#1f2933" text-anchor="middle"'));
  });
  s.push('</svg>');
  return FinInd_figura_(s.join(''), opts.titulo, opts.legenda);
}
function FinInd_semFigura_(html) { return String(html || '').replace(/<b data-rela4-fig>Figura<\/b> — /g, ''); }
function FinInd_nota_(t) { return '<p class="nota">' + (typeof RelA4_esc_ === 'function' ? RelA4_esc_(t) : FinInd_s_(t).replace(/[<>&]/g, '')) + '</p>'; }

/** Os gráficos G1 a G8 da aba (G2, previsão de 90 dias, entra com a Agenda financeira). */
function FinInd_graficos_(atual, fotos, mesesGravados, nomes) {
  var g = [], esc = function (t) { return t; };
  var ind = FinFoto_json_(atual.INDICADORES_JSON, {}), aging = FinFoto_json_(atual.AGING_JSON, null), top = FinFoto_json_(atual.TOP_CLIENTES_JSON, {}), extra = FinFoto_json_(atual.EXTRA_JSON, {});
  var dia = FinInd_s_(atual.DIA).slice(0, 10), mesAt = dia.slice(0, 7);
  var add = function (id, titulo, html, frase) { g.push({ id: id, titulo: titulo, svg: FinInd_semFigura_(html), frase: frase }); };
  // G1 recebido × pago, 12 meses
  var meses = []; for (var i = 11; i >= 0; i--) meses.push(FinFoto_mesMenos_(mesAt, i));
  var comDado = meses.filter(function (m) { return mesesGravados[m]; });
  add('G1', 'Recebido × pago, 12 meses', comDado.length ? FinInd_svgColunas_(meses.map(function (m) { return m.slice(5, 7) + '/' + m.slice(2, 4); }),
    [{ rotulo: 'Recebido', cor: FinInd_cor_('verde'), valores: meses.map(function (m) { return mesesGravados[m] ? Number(mesesGravados[m].RECEBIDO) || 0 : 0; }) },
     { rotulo: 'Pago', cor: FinInd_cor_('vermelho'), valores: meses.map(function (m) { return mesesGravados[m] ? Number(mesesGravados[m].PAGO) || 0 : 0; }) }],
    { linha: { rotulo: 'Resultado (recebido − pago)', cor: FinInd_cor_('azul'), valores: meses.map(function (m) { var r = mesesGravados[m]; return r ? (Number(r.RECEBIDO) || 0) - (Number(r.PAGO) || 0) : 0; }) }, titulo: 'Recebido e pago por mês (R$)', unidade: 'R$', aria: 'Recebido e pago nos últimos 12 meses' })
    : FinInd_nota_('Os meses aparecem depois da primeira fotografia completa.'),
    'Quanto entrou e quanto saiu em cada mês, pela data do pagamento; a linha azul é o resultado. Transferências entre contas ficam fora. O mês atual vai até hoje.');
  add('G2', 'Saldo previsto 90 dias', FinInd_nota_('A previsão de caixa de 90 dias, com a faixa do saldo mínimo, entra com a Agenda financeira (próxima etapa).'), 'Mostrará o saldo previsto dia a dia, pelo vencimento e pela realização.');
  // G3 envelhecimento do a receber
  var cores3 = [FinInd_cor_('verde'), FinInd_cor_('ambar'), FinInd_cor_('laranja'), FinInd_cor_('vermelho')];
  add('G3', 'Envelhecimento do a receber', aging && typeof RelA4_barrasEmpilhadas_ === 'function'
    ? RelA4_barrasEmpilhadas_([{ rotulo: 'A receber', partes: [aging.aVencer, aging.ate30, aging.de31a90, aging.mais90], rotuloValor: FinInd_moeda_(aging.aVencer + aging.ate30 + aging.de31a90 + aging.mais90) }],
      [{ rotulo: 'A vencer ' + FinInd_moeda_(aging.aVencer), cor: cores3[0] }, { rotulo: '1 a 30 dias ' + FinInd_moeda_(aging.ate30), cor: cores3[1] }, { rotulo: '31 a 90 dias ' + FinInd_moeda_(aging.de31a90), cor: cores3[2] }, { rotulo: 'Acima de 90 dias ' + FinInd_moeda_(aging.mais90), cor: cores3[3] }],
      { titulo: 'A receber em aberto por faixa de atraso', vazio: 'Nada a receber em aberto.' })
    : FinInd_nota_('Sem a leitura dos títulos nesta fotografia.'),
    'O que os clientes devem, separado pelo tempo de atraso. Quanto mais à direita (vermelho), maior o risco de não receber.');
  // G4 inadimplência semana a semana (fotografia de domingo, ou a última da semana)
  var pts = [], dom = new Date(dia + 'T12:00:00Z').getUTCDay();
  var fimSemana = FinFoto_somarDias_(dia, dom === 0 ? 0 : -dom); // domingo anterior (ou hoje, se domingo)
  var semanas = [];
  for (var w = 11; w >= 0; w--) { var fs = FinFoto_somarDias_(fimSemana, -7 * w); semanas.push([FinFoto_somarDias_(fs, -6), fs]); }
  if (dom !== 0) semanas.push([FinFoto_somarDias_(fimSemana, 1), dia]); // a semana em curso, até hoje
  semanas.forEach(function (s) {
    var f = fotos.filter(function (x) { var di = FinInd_s_(x.DIA).slice(0, 10); return di >= s[0] && di <= s[1]; })[0];
    var i4 = f ? (FinFoto_json_(f.INDICADORES_JSON, {}).I04 || {}) : {};
    if (f && i4.valor !== null && i4.valor !== undefined) pts.push({ rotulo: FinFoto_br_(FinInd_s_(f.DIA)).slice(0, 5), valor: Number(i4.valor) });
  });
  pts = pts.slice(-12);
  add('G4', 'Inadimplência semana a semana', pts.length >= 2 ? FinInd_svgLinha_(pts, { titulo: 'Inadimplência (%) na fotografia de cada semana', unidade: '%', aria: 'Inadimplência semana a semana' })
    : FinInd_nota_('A evolução aparece quando houver fotografias de pelo menos duas semanas.'), 'A inadimplência (vencido ÷ a receber) no fim de cada semana, nas últimas 12 semanas. Linha subindo: a cobrança precisa de atenção.');
  // G5 despesas por categoria do mês (Pareto: as que somam 80 %)
  var m0 = mesesGravados[mesAt], cats = m0 ? FinFoto_json_(m0.POR_CATEGORIA_JSON, []) : [];
  var tot5 = cats.reduce(function (a, c) { return a + (Number(c[1]) || 0); }, 0), acc = 0;
  add('G5', 'Despesas por categoria no mês', cats.length && typeof RelA4_barras_ === 'function' ? RelA4_barras_(cats.slice(0, 12).map(function (c) {
      var antes = acc; acc += Number(c[1]) || 0;
      return { rotulo: String(c[0]).slice(0, 34), valor: Number(c[1]) || 0, rotuloValor: FinInd_moeda_(c[1]), cor: antes < tot5 * 0.8 ? FinInd_cor_('azul') : FinInd_cor_('cinza') };
    }), { titulo: 'Pago no mês por categoria (R$)', legenda: [{ cor: FinInd_cor_('azul'), rotulo: 'Categorias que somam 80 % do pago' }, { cor: FinInd_cor_('cinza'), rotulo: 'Demais' }] })
    : FinInd_nota_('Nenhum pagamento no mês até a fotografia.'), 'Para onde foi o dinheiro no mês. Em azul, as poucas categorias que somam 80 % do total: é nelas que uma economia faz diferença.');
  // G6 maiores devedores
  var dev = (top.vencido || []).slice(0, 10);
  add('G6', 'Maiores devedores', dev.length && typeof RelA4_barras_ === 'function' ? RelA4_barras_(dev.map(function (c) { return { rotulo: (nomes && nomes[String(c.codigo)]) || 'Cliente código ' + c.codigo, valor: c.valor, rotuloValor: FinInd_moeda_(c.valor) }; }), { titulo: 'Vencido a receber por cliente (10 maiores)', cor: FinInd_cor_('vermelho') })
    : FinInd_nota_('Nenhum cliente com título vencido nesta fotografia.'), 'Os clientes com mais dinheiro vencido. O detalhe de cada um está na Ficha do cliente.' + (nomes ? '' : ' Os nomes do Omie ficam só na memória do servidor por 6 horas; depois disso aparece o código.'));
  // G7 orçado × realizado
  var orc = (extra.orc || []).slice(0, 8);
  add('G7', 'Orçado × realizado', orc.length && typeof RelA4_barras_ === 'function' ? RelA4_barras_([].concat.apply([], orc.map(function (o) {
      return [{ rotulo: String(o.categoria).slice(0, 24) + ' · previsto', valor: o.previsto, rotuloValor: FinInd_moeda_(o.previsto), cor: FinInd_cor_('cinza') },
        { rotulo: String(o.categoria).slice(0, 24) + ' · realizado', valor: o.realizado, rotuloValor: FinInd_moeda_(o.realizado), cor: FinInd_cor_('azul') }];
    })), { titulo: 'Orçamento do mês: previsto e realizado por categoria (R$)', legenda: [{ cor: FinInd_cor_('cinza'), rotulo: 'Previsto' }, { cor: FinInd_cor_('azul'), rotulo: 'Realizado' }] })
    : FinInd_nota_('Não há orçamento cadastrado no Omie para este mês.'), 'Cada categoria do orçamento do Omie com o previsto e o realizado lado a lado.');
  // G8 viagem no Caju
  var g8 = extra.g8;
  add('G8', 'Viagens no Caju', g8 && g8.length ? FinInd_svgColunas_(g8.map(function (x) { return x[0].slice(5, 7) + '/' + x[0].slice(2, 4); }),
    [{ rotulo: 'Carregado', cor: FinInd_cor_('azul'), valores: g8.map(function (x) { return x[1]; }) }, { rotulo: 'Gasto conciliado', cor: FinInd_cor_('verde'), valores: g8.map(function (x) { return x[2]; }) },
     { rotulo: 'Gasto sem comprovante ligado', cor: FinInd_cor_('ambar'), valores: g8.map(function (x) { return x[3]; }) }], { titulo: 'Depósito de viagem no cartão Caju, 6 meses (R$)', unidade: 'R$', aria: 'Viagens no Caju' })
    : FinInd_nota_('Sem cargas nem extrato do Caju nos últimos 6 meses.'), 'Quanto foi carregado nos cartões para viagens, quanto do gasto já está ligado a um comprovante e quanto ainda falta comprovar. A Recarga Caju entra numa etapa própria.');
  return g;
}

/** Cartão de um indicador para a tela: valor, o de antes, a seta e as duas linhas de explicação. */
function FinInd_cartao_(def, x, antes) {
  x = x || FinInd_nao_('sem dado'); antes = antes || null;
  var c = { codigo: def.c, nome: def.nome, comoCalculado: def.calc, comoLer: def.ler, valor: x.valor === undefined ? null : x.valor, texto: x.texto || 'não calculado',
    motivo: x.motivo || '', detalhe: [x.detalhe, x.detalhe3m, x.rotulo ? 'Mês atual ' + x.rotulo + '.' : ''].filter(Boolean).join(' '), aDefinir: !!x.aDefinir,
    anteriorTexto: antes ? antes.texto || 'não calculado' : '', tendencia: '', leitura: '' };
  if (antes && x.valor !== null && x.valor !== undefined && antes.valor !== null && antes.valor !== undefined && isFinite(x.valor) && isFinite(antes.valor)) {
    var dif = Number(x.valor) - Number(antes.valor);
    c.tendencia = Math.abs(dif) < 0.05 ? 'igual' : dif > 0 ? 'sobe' : 'desce';
    c.leitura = c.tendencia === 'igual' || !def.melhor ? 'neutro' : (c.tendencia === 'sobe') === (def.melhor === 'maior') ? 'melhor' : 'pior';
  }
  return c;
}

/**
 * Aba Indicadores. payload: { dias: 7 | 30 } (com qual fotografia comparar). Só lê o SGO+ (a fotografia); não chama o Omie.
 * Devolve: foto (dia, situação, falhas), comparação, indicadores (cartões), saude (nota e critérios), graficos, estado da rotina.
 */
function Fin_apiIndicadores(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    var p = payload || {}, dias = FIN_IND_DIAS_COMPARAR.indexOf(Number(p.dias)) >= 0 ? Number(p.dias) : 7;
    FinFoto_garantir_();
    var fotos = FinFoto_lista_(), estado = FinFoto_estado_(), minimo = FinInd_saldoMinimo_();
    var cfgTxt = { saldoMinimo: minimo === null ? 'a definir' : FinInd_moeda_(minimo) };
    if (!fotos.length) {
      return { ok: true, foto: null, estado: estado, config: cfgTxt,
        mensagem: 'Ainda não há fotografia do Financeiro. A primeira sai na rodada automática a partir das ' + estado.horaRotina + (estado.podePedir ? ', ou toque em "Atualizar agora" para pedir agora.' : '. ' + estado.motivo) };
    }
    var atual = fotos[0], diaAt = FinInd_s_(atual.DIA).slice(0, 10), limite = FinFoto_somarDias_(diaAt, -dias);
    var ref = fotos.filter(function (f) { return FinInd_s_(f.DIA).slice(0, 10) <= limite; })[0] || null;
    var ind = FinFoto_json_(atual.INDICADORES_JSON, {}), indRef = ref ? FinFoto_json_(ref.INDICADORES_JSON, {}) : null;
    var folga = function (i) {
      if (minimo === null) return { valor: null, texto: 'a definir', aDefinir: true, motivo: 'o saldo mínimo de segurança ainda não foi definido (Administração > Chaves e senhas > Regras do Financeiro > Saldo mínimo de segurança do caixa)' };
      var s = i && i.I01; if (!s || s.valor === null || s.valor === undefined) return FinInd_nao_((s && s.motivo) || 'sem o saldo em contas');
      return { valor: FinInd_r2_(s.valor - minimo), texto: FinInd_moeda_(s.valor - minimo), detalhe: 'Saldo mínimo de segurança: ' + FinInd_moeda_(minimo) + '.' + (s.valor < minimo ? ' O caixa está ABAIXO do mínimo.' : '') };
    };
    ind.I01M = folga(ind); if (indRef) indRef.I01M = folga(indRef);
    var cfg = FinSaude_config_();
    var saude = FinSaude_calcular_(FinInd_paraSaude_(ind), cfg), saudeRef = indRef ? FinSaude_calcular_(FinInd_paraSaude_(indRef), cfg) : null;
    saude.anterior = saudeRef && saudeRef.nota !== null ? saudeRef.nota : null;
    saude.anteriorFaixa = saudeRef ? saudeRef.faixa : '';
    saude.config = { pesos: cfg.origem.pesos, limites: cfg.origem.limites };
    var nomes = FinFoto_cacheLer_('FIN_FOTO_NOMES_' + diaAt);
    var falhas = FinFoto_json_(atual.FALHAS_JSON, {});
    return { ok: true, config: cfgTxt, estado: estado, dias: dias,
      foto: { dia: diaAt, diaBr: FinFoto_br_(diaAt), concluidaEm: FinFoto_brHora_(atual.CONCLUIDA_EM), situacao: FinInd_s_(atual.SITUACAO), origem: FinInd_s_(atual.ORIGEM),
        falhas: Object.keys(falhas).map(function (k) { return (FIN_FOTO_NOMES_PASSOS[k] || (k.indexOf('mes:') === 0 ? 'pagamentos de ' + k.slice(8, 10) + '/' + k.slice(4, 8) : k)) + ': ' + falhas[k]; }) },
      comparadoCom: ref ? { dia: FinInd_s_(ref.DIA).slice(0, 10), diaBr: FinFoto_br_(ref.DIA) } : null,
      indicadores: FIN_IND_DEF.map(function (def) { return FinInd_cartao_(def, ind[def.c], indRef ? indRef[def.c] : null); }),
      saude: saude, graficos: FinInd_graficos_(atual, fotos, FinFoto_mesesGravados_(), nomes) };
  } catch (e) { return { ok: false, mensagem: e && e.omieOpsPublica ? e.message : 'Não foi possível abrir os indicadores: ' + FinInd_s_(e && e.message).slice(0, 160) + '. Nada foi alterado; tente de novo.' }; }
}
