/**
 * Fotografia diária do Financeiro (Onda 2, E3, 16/11/2026). Especificação: ESPEC_ONDA2_FINANCEIRO.md, seção 1.3.
 *
 * POR QUÊ: os indicadores pedem leituras grandes do Omie (todas as páginas de títulos, 12 meses de pagamentos). Feitas a cada
 * clique, esbarram no limite do Omie (a mesma consulta só 1 vez por minuto) e demoram. A ROTINA lê o Omie uma vez por dia e
 * guarda só NÚMEROS AGREGADOS; a aba Indicadores lê a fotografia, sem chamar o Omie.
 *
 * Rotina: FinFoto_rodada_ chamada por Ges_rodada_ (SGO_Gestao_Escada.js, de 15 em 15 minutos), também fora do expediente.
 *  - A primeira fotografia do dia sai a partir de FIN_FOTO_HORA (padrão 06:00, antes do expediente). Uma por dia: depois de
 *    feita, a rodada não chama o Omie de novo no mesmo dia, a não ser que alguém da lista de sigilo toque em "Atualizar agora"
 *    (pedido, no máximo um a cada 15 minutos; o botão nunca chama o Omie direto: a próxima rodada faz a fotografia).
 *  - Passos com cursor guardado em propriedade (FIN_FOTO_CURSOR), para nunca passar do tempo de uma execução: posicao
 *    (ObterResumoFinancas) · categorias (uma vez por dia) · titulos (ListarMovimentos por vencimento, de 12 meses atrás a 90 dias
 *    à frente) · meses (pagamentos pela data de pagamento: o mês atual e os 3 anteriores todo dia; os 12 meses do gráfico só se
 *    faltarem na tabela ou no domingo, se o mês ainda não fechou) · orcamento · fechar (calcula e grava).
 *  - Limite por rodada: 20 páginas fora do expediente; 8 no expediente. No expediente, se a tela do Financeiro chamou o Omie nos
 *    últimos 3 minutos, a rodada espera a próxima (não disputa o mesmo método com a Wanessa). "Omie ocupado" ou "consulta
 *    repetida" (nada foi feito do lado do Omie) para a rodada e tenta de novo na seguinte, até 3 vezes; depois a fonte fica de
 *    fora e o indicador mostra "não calculado: motivo" (nunca zero).
 * Leituras do Omie: as mesmas funções da tela, sem sessão (OmieLer_*_ em SGO_Omie_Gestao.js), com a memória de 60 s de
 * Omie_requisitar_. Nada é gravado no Omie.
 *
 * Tabelas (lidas só por quem está na lista de sigilo, pela aba Indicadores):
 *  FIN_FOTOS: uma por dia (a do dia é substituída quando refeita); a do domingo vale como fotografia da semana (gráfico G4).
 *  FIN_FOTO_MES: recebido, pago e transferências por mês, e as despesas por categoria (sem nome de cliente nem CNPJ).
 * A lista de títulos NÃO é gravada (só somas e agrupamentos; os maiores clientes por código do Omie). Os nomes dos maiores
 * devedores ficam só na memória do servidor por 6 horas (FIN_FOTO_NOMES_<dia>). Nada de valor vai para o log.
 */
var FIN_FOTOS_ABA = 'FIN_FOTOS', FIN_FOTO_MES_ABA = 'FIN_FOTO_MES';
var FIN_FOTOS_COLUNAS = ['ID', 'DIA', 'INICIADA_EM', 'CONCLUIDA_EM', 'SITUACAO', 'INDICADORES_JSON', 'AGING_JSON', 'TOP_CLIENTES_JSON', 'TITULOS_N', 'FALHAS_JSON', 'ORIGEM', 'EXTRA_JSON'];
var FIN_FOTO_MES_COLUNAS = ['ID', 'MES', 'RECEBIDO', 'PAGO', 'TRANSFERENCIAS', 'POR_CATEGORIA_JSON', 'LIDO_EM', 'FECHADO'];
var FIN_FOTO_CURSOR_PROP = 'FIN_FOTO_CURSOR', FIN_FOTO_PEDIDO_PROP = 'FIN_FOTO_PEDIDO';
var FIN_FOTO_PAGINAS_RODADA = 20, FIN_FOTO_PAGINAS_EXPEDIENTE = 8;
var FIN_FOTO_TELA_PAUSA_MS = 3 * 60000;     // no expediente: a tela chamou o Omie há menos disso, a rotina espera
var FIN_FOTO_PEDIDO_INTERVALO_MS = 15 * 60000;
var FIN_FOTO_TENTATIVAS = 3;
var FIN_FOTO_MESES = 12;
var FIN_FOTO_JANELA_ATRAS = 365, FIN_FOTO_JANELA_FRENTE = 90;
var FIN_FOTO_PASSOS = ['posicao', 'categorias', 'titulos', 'meses', 'orcamento', 'fechar', 'fim'];
var FIN_FOTO_FUSO = 'America/Sao_Paulo';
var FIN_FOTO_NOMES_PASSOS = { posicao: 'saldos das contas', categorias: 'plano de contas', titulos: 'títulos a pagar e a receber', meses: 'pagamentos e recebimentos dos meses', orcamento: 'orçamento do mês', fechar: 'cálculo' };

function FinFoto_s_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function FinFoto_hoje_(q) { return Utilities.formatDate(q || new Date(), FIN_FOTO_FUSO, 'yyyy-MM-dd'); }
function FinFoto_hora_(q) { return Utilities.formatDate(q || new Date(), FIN_FOTO_FUSO, 'HH:mm'); }
function FinFoto_somarDias_(dia, n) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(FinFoto_s_(dia)); if (!m) return '';
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + n * 864e5).toISOString().slice(0, 10);
}
function FinFoto_diasEntre_(a, b) {
  var x = /^(\d{4})-(\d{2})-(\d{2})/.exec(FinFoto_s_(a)), y = /^(\d{4})-(\d{2})-(\d{2})/.exec(FinFoto_s_(b));
  if (!x || !y) return null;
  return Math.round((Date.UTC(+y[1], +y[2] - 1, +y[3]) - Date.UTC(+x[1], +x[2] - 1, +x[3])) / 864e5);
}
function FinFoto_br_(dia) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(FinFoto_s_(dia)); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function FinFoto_brOmie_(dia) { return FinFoto_br_(dia); }
function FinFoto_isoOmie_(t) { var x = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(FinFoto_s_(t)); return x ? x[3] + '-' + x[2] + '-' + x[1] : ''; }
function FinFoto_brHora_(iso) { var d = new Date(iso); if (isNaN(d.getTime())) return ''; return Utilities.formatDate(d, FIN_FOTO_FUSO, 'dd/MM/yyyy HH:mm'); }
function FinFoto_mesMenos_(mes, n) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7) - 1 - n; while (m < 0) { m += 12; a--; } return a + '-' + ('0' + (m + 1)).slice(-2); }
function FinFoto_json_(t, padrao) { try { var v = JSON.parse(FinFoto_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
function FinFoto_props_() { return PropertiesService.getScriptProperties(); }
function FinFoto_prop_(k) { try { return FinFoto_s_(FinFoto_props_().getProperty(k)); } catch (e) { return ''; } }
function FinFoto_apagarProp_(k) { try { var p = FinFoto_props_(); if (p.deleteProperty) p.deleteProperty(k); else p.setProperty(k, ''); } catch (e) {} }
function FinFoto_cache_() { try { return CacheService.getScriptCache(); } catch (e) { return null; } }
function FinFoto_cacheLer_(k) { var c = FinFoto_cache_(); if (!c) return null; try { var t = c.get(k); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function FinFoto_cacheGravar_(k, v, seg) { var c = FinFoto_cache_(); if (!c) return false; try { c.put(k, JSON.stringify(v), seg || 21600); return true; } catch (e) { return false; } }
function FinFoto_cacheApagar_(k) { var c = FinFoto_cache_(); if (c) { try { c.remove(k); } catch (e) {} } }
/** Texto de erro sem números (nada de valor no log nem na tabela): troca algarismos de valores por "…". */
function FinFoto_semValor_(t) { return FinFoto_s_(t).replace(/R\$\s?[\d.,]+/g, 'R$ …').slice(0, 220); }

function FinFoto_garantir_() {
  if (typeof CertCal_garantirTabela_ === 'function') {
    CertCal_garantirTabela_(FIN_FOTOS_ABA, FIN_FOTOS_COLUNAS);
    CertCal_garantirTabela_(FIN_FOTO_MES_ABA, FIN_FOTO_MES_COLUNAS);
    try { SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {}; } catch (e) {}
  }
}
function FinFoto_ler_(aba) { try { return SGO_DATA.getDB().getSheetByName(aba) ? SGO_DATA.getAll(aba) : []; } catch (e) { return []; } }
/** Fotografias gravadas, da mais recente para a mais antiga. */
function FinFoto_lista_() {
  return FinFoto_ler_(FIN_FOTOS_ABA).filter(function (f) { return /^\d{4}-\d{2}-\d{2}$/.test(FinFoto_s_(f.DIA).slice(0, 10)) && ['COMPLETA', 'INCOMPLETA'].indexOf(FinFoto_s_(f.SITUACAO)) >= 0; })
    .sort(function (a, b) { return FinFoto_s_(b.DIA).localeCompare(FinFoto_s_(a.DIA)) || FinFoto_s_(b.CONCLUIDA_EM).localeCompare(FinFoto_s_(a.CONCLUIDA_EM)); });
}
function FinFoto_doDia_(dia) { return FinFoto_lista_().filter(function (f) { return FinFoto_s_(f.DIA).slice(0, 10) === dia; })[0] || null; }
function FinFoto_mesesGravados_() { var m = {}; FinFoto_ler_(FIN_FOTO_MES_ABA).forEach(function (r) { m[FinFoto_s_(r.MES).slice(0, 7)] = r; }); return m; }

function FinFoto_ligada_() { return FinFoto_prop_('FIN_FOTO_ROTINA').toUpperCase() !== 'DESLIGADA'; }
function FinFoto_horaInicio_() { var h = FinFoto_prop_('FIN_FOTO_HORA'); return /^\d{2}:\d{2}$/.test(h) && h <= '23:59' ? h : '06:00'; }
function FinFoto_configurado_() { return !!(FinFoto_prop_('OMIE_APP_KEY') && FinFoto_prop_('OMIE_APP_SECRET')); }
function FinFoto_cursor_() { var c = FinFoto_json_(FinFoto_prop_(FIN_FOTO_CURSOR_PROP), null); return c && c.dia && c.passo ? c : null; }
function FinFoto_cursorGravar_(c) { FinFoto_props_().setProperty(FIN_FOTO_CURSOR_PROP, JSON.stringify(c)); }
function FinFoto_pedido_() { var p = FinFoto_json_(FinFoto_prop_(FIN_FOTO_PEDIDO_PROP), null); return p && p.em ? p : null; }
/** A tela do Financeiro chamou o Omie há pouco (marca gravada por Omie_requisitar_, SGO_Omie.js)? */
function FinFoto_telaUsando_() {
  var c = FinFoto_cache_(); if (!c) return false;
  try { var t = Number(c.get('FIN_OMIE_TELA_EM')) || 0; return t > 0 && Date.now() - t < FIN_FOTO_TELA_PAUSA_MS; } catch (e) { return false; }
}

// ------------------------------------------------------------ acumuladores (memória do servidor, 6 h)
function FinFoto_acumNovo_() {
  return { posicao: null, tit: { n: 0, cancelados: 0, semVenc: 0,
      R: { aberto: 0, vencido: 0, faixas: { aVencer: 0, ate30: 0, de31a90: 0, mais90: 0 }, ate30d: 0, base90: 0, noPrazo90: 0, cli: {}, vencCli: {} },
      P: { aberto: 0, vencido: 0, ate30d: 0 } },
    pgts: [], meses: {}, orc: null, falhas: {}, paginas: 0 };
}
function FinFoto_acum_(dia) { return FinFoto_cacheLer_('FIN_FOTO_ACUM_' + dia); }
function FinFoto_acumGravar_(dia, a) { return FinFoto_cacheGravar_('FIN_FOTO_ACUM_' + dia, a); }
function FinFoto_vistos_(dia) { return FinFoto_cacheLer_('FIN_FOTO_VISTOS_' + dia) || {}; }
function FinFoto_limparMemoria_(dia) { ['FIN_FOTO_ACUM_', 'FIN_FOTO_VISTOS_'].forEach(function (k) { FinFoto_cacheApagar_(k + dia); }); }

/** Um título da leitura por vencimento entra nas somas (centavos inteiros). */
function FinFoto_somarTitulo_(acum, vistos, hoje, m) {
  var d = m.detalhes || {}, s = m.resumo || {}, nat = FinFoto_s_(d.cNatureza);
  if (nat !== 'P' && nat !== 'R') return;
  var id = nat + ':' + FinFoto_s_(d.nCodTitulo);
  if (!d.nCodTitulo || vistos[id]) return;
  vistos[id] = 1;
  var t = acum.tit;
  if (FinFoto_s_(d.cStatus).toUpperCase() === 'CANCELADO') { t.cancelados++; return; }
  var venc = FinFoto_isoOmie_(d.dDtVenc);
  if (!venc) { t.semVenc++; return; }
  var aberto = Number(s.nValAberto), pago = Number(s.nValPago);
  var ab = isFinite(aberto) && aberto > 0 ? Math.round(aberto * 100) : 0, pg = isFinite(pago) && pago > 0 ? Math.round(pago * 100) : 0;
  t.n++;
  if (nat === 'R') {
    var r = t.R, cli = FinFoto_s_(d.nCodCliente) || '0';
    // taxa de realização: o que venceu nos últimos 90 dias (até ontem) e quanto disso foi recebido até o vencimento
    if (venc >= FinFoto_somarDias_(hoje, -90) && venc < hoje) {
      r.base90 += ab + pg;
      var pgEm = FinFoto_isoOmie_(d.dDtPagamento);
      if (pg > 0 && pgEm && pgEm <= venc) r.noPrazo90 += pg;
    }
    if (!ab) return;
    r.aberto += ab; r.cli[cli] = (r.cli[cli] || 0) + ab;
    if (venc < hoje) {
      var atraso = FinFoto_diasEntre_(venc, hoje), fx = atraso <= 30 ? 'ate30' : atraso <= 90 ? 'de31a90' : 'mais90';
      r.vencido += ab; r.faixas[fx] += ab; r.vencCli[cli] = (r.vencCli[cli] || 0) + ab;
    } else {
      r.faixas.aVencer += ab;
      if (venc <= FinFoto_somarDias_(hoje, 30)) r.ate30d += ab;
    }
  } else {
    if (!ab) return;
    var p = t.P;
    p.aberto += ab;
    if (venc < hoje) p.vencido += ab;
    if (venc <= FinFoto_somarDias_(hoje, 30)) p.ate30d += ab; // inclui o vencido: precisa ser pago
  }
}

function FinFoto_avancar_(cur) {
  var i = FIN_FOTO_PASSOS.indexOf(cur.passo);
  cur.passo = FIN_FOTO_PASSOS[Math.min(i + 1, FIN_FOTO_PASSOS.length - 1)];
  cur.pagina = 1;
}
/** Meses a ler: o atual e os 3 anteriores sempre; os outros do gráfico de 12 meses se faltarem ou, no domingo, se não fecharam. */
function FinFoto_mesesALer_(dia) {
  var mes = dia.slice(0, 7), grav = FinFoto_mesesGravados_(), domingo = new Date(dia + 'T12:00:00Z').getUTCDay() === 0, lista = [];
  for (var i = 0; i < FIN_FOTO_MESES; i++) {
    var m = FinFoto_mesMenos_(mes, i), g = grav[m];
    if (i <= 3 || !g || (domingo && FinFoto_s_(g.FECHADO) !== 'SIM')) lista.push(m);
  }
  return lista;
}
/** Plano de contas do Omie: uma leitura por dia (memória do servidor). */
function FinFoto_categorias_(dia, ctx) {
  var k = 'FIN_FOTO_CATS_' + dia, c = FinFoto_cacheLer_(k);
  if (c) return c;
  var mapa = Omie_categorias_();
  ctx.usadas++;
  FinFoto_cacheGravar_(k, mapa, 21600);
  return mapa;
}

/** Executa o passo do cursor (pode ler várias páginas). Lança o erro do Omie para quem chamou decidir. */
function FinFoto_passo_(cur, acum, ctx) {
  var dia = cur.dia;
  if (cur.passo === 'posicao') {
    ctx.usadas++;
    var p = OmieLer_posicao_();
    acum.posicao = { saldo: p.saldoContas, limite: p.limite, pagarAtraso: p.pagar.atraso, receberAtraso: p.receber.atraso };
    FinFoto_avancar_(cur); return;
  }
  if (cur.passo === 'categorias') { FinFoto_categorias_(dia, ctx); FinFoto_avancar_(cur); return; }
  if (cur.passo === 'titulos') {
    var vistos = FinFoto_vistos_(dia);
    var r = OmieLer_movimentos_({ cTpLancamento: 'CPCR', dDtVencDe: FinFoto_brOmie_(FinFoto_somarDias_(dia, -FIN_FOTO_JANELA_ATRAS)), dDtVencAte: FinFoto_brOmie_(FinFoto_somarDias_(dia, FIN_FOTO_JANELA_FRENTE)) }, {
      dePagina: cur.pagina || 1, maxNesta: Math.max(1, ctx.limite - ctx.usadas), limite: 200,
      msgFormato: 'O Omie não devolveu os títulos esperados.', msgLimite: 'Há mais de 10.000 títulos na janela de 15 meses; a fotografia não os lê.',
      aCada: function (m) { FinFoto_somarTitulo_(acum, vistos, dia, m); } });
    ctx.usadas += r.lidas; acum.paginas += r.lidas;
    FinFoto_cacheGravar_('FIN_FOTO_VISTOS_' + dia, vistos);
    if (r.proxima) { cur.pagina = r.proxima; return; }
    cur.meses = FinFoto_mesesALer_(dia); cur.mesIdx = 0;
    FinFoto_avancar_(cur); return;
  }
  if (cur.passo === 'meses') {
    var cats = FinFoto_categorias_(dia, ctx), limite90 = FinFoto_somarDias_(dia, -90);
    while ((cur.mesIdx || 0) < (cur.meses || []).length) {
      if (ctx.usadas >= ctx.limite) return; // continua na próxima rodada
      var mes = cur.meses[cur.mesIdx];
      try {
        var res = OmieLer_resultado_({ mes: mes }, { categorias: cats, aCada: function (x) {
          if (x.transferencia || x.pagoEm < limite90 || x.pagoEm > dia) return;
          acum.pgts.push([x.natureza, x.pagoEm, x.vencimento, x.emissao, x.centavos]);
        } });
        ctx.usadas += res.paginas || 1; acum.paginas += res.paginas || 1;
        acum.meses[mes] = { rec: res.totais.receitas, pag: res.totais.despesas, transf: res.totais.transferencias,
          despesas: res.despesas.slice(0, 30).map(function (c) { return [c.descricao, c.valor]; }) };
      } catch (e) {
        if (e && e.omieNaoExecutado) throw e;
        acum.falhas['mes:' + mes] = FinFoto_semValor_(e && e.message);
      }
      cur.mesIdx = (cur.mesIdx || 0) + 1;
      // cada mês lido fica guardado na hora: se o Omie recusar o próximo, a rodada seguinte continua daqui
      FinFoto_acumGravar_(dia, acum); FinFoto_cursorGravar_(cur);
    }
    FinFoto_avancar_(cur); return;
  }
  if (cur.passo === 'orcamento') {
    ctx.usadas++;
    var o = OmieLer_orcamento_({ mes: dia.slice(0, 7) });
    acum.orc = (o.itens || []).filter(function (i) { return i.previsto || i.realizado; }).sort(function (a, b) { return b.previsto - a.previsto; }).slice(0, 40);
    FinFoto_avancar_(cur); return;
  }
  if (cur.passo === 'fechar') { FinFoto_fechar_(cur, acum, ctx); FinFoto_avancar_(cur); return; }
  FinFoto_avancar_(cur);
}

/** Calcula os indicadores e grava a fotografia do dia e os meses lidos. */
function FinFoto_fechar_(cur, acum, ctx) {
  var dia = cur.dia, agora = new Date().toISOString();
  var calc = FinInd_montar_(acum, dia, FinFoto_mesesGravados_());
  var local = FinInd_local_(dia);
  Object.keys(local.indicadores).forEach(function (k) { calc.indicadores[k] = local.indicadores[k]; });
  calc.extra.g8 = local.g8;
  var falhas = {};
  Object.keys(acum.falhas || {}).forEach(function (k) { falhas[k] = acum.falhas[k]; });
  var reg = { DIA: dia, INICIADA_EM: cur.iniciadaEm, CONCLUIDA_EM: agora, SITUACAO: Object.keys(falhas).length ? 'INCOMPLETA' : 'COMPLETA',
    INDICADORES_JSON: JSON.stringify(calc.indicadores), AGING_JSON: JSON.stringify(calc.aging), TOP_CLIENTES_JSON: JSON.stringify(calc.top),
    TITULOS_N: acum.tit.n, FALHAS_JSON: JSON.stringify(falhas), ORIGEM: cur.origem || 'ROTINA', EXTRA_JSON: JSON.stringify(calc.extra) };
  var existente = FinFoto_ler_(FIN_FOTOS_ABA).filter(function (f) { return FinFoto_s_(f.DIA).slice(0, 10) === dia; })[0];
  if (existente) SGO_DATA.update(FIN_FOTOS_ABA, existente.ID, reg); else SGO_DATA.insert(FIN_FOTOS_ABA, Object.assign({ ID: Utilities.getUuid() }, reg));
  var grav = FinFoto_mesesGravados_();
  Object.keys(acum.meses || {}).forEach(function (mes) {
    var m = acum.meses[mes], fim = FinFoto_somarDias_(mes + '-01', 40).slice(0, 7) + '-01';
    var fechado = FinFoto_diasEntre_(FinFoto_somarDias_(fim, -1), dia) > 35 ? 'SIM' : '';
    var linha = { MES: mes, RECEBIDO: m.rec, PAGO: m.pag, TRANSFERENCIAS: m.transf, POR_CATEGORIA_JSON: JSON.stringify(m.despesas || []), LIDO_EM: agora, FECHADO: fechado };
    if (grav[mes]) SGO_DATA.update(FIN_FOTO_MES_ABA, grav[mes].ID, linha); else SGO_DATA.insert(FIN_FOTO_MES_ABA, Object.assign({ ID: Utilities.getUuid() }, linha));
  });
  // nomes dos maiores devedores e clientes: só na memória do servidor (6 h), nunca na tabela
  var cods = [];
  (calc.top.vencido || []).concat(calc.top.aberto || []).forEach(function (c) { var n = Number(c.codigo); if (n > 0 && cods.indexOf(n) < 0) cods.push(n); });
  if (cods.length && typeof Omie_nomesClientes_ === 'function') {
    try { ctx.usadas++; FinFoto_cacheGravar_('FIN_FOTO_NOMES_' + dia, Omie_nomesClientes_(cods.slice(0, 50)), 21600); } catch (e) {}
  }
  try { SGO_DATA.log('FIN_FOTO', 'sistema', 'Fotografia do Financeiro de ' + FinFoto_br_(dia) + ': ' + reg.SITUACAO.toLowerCase() + ' (' + acum.paginas + ' página(s) do Omie' + (Object.keys(falhas).length ? '; sem: ' + Object.keys(falhas).join(', ') : '') + ').', 'FINANCEIRO'); } catch (e) {}
  cur.situacao = reg.SITUACAO;
}

/**
 * Uma rodada da rotina (Ges_rodada_). Devolve só passos e contagens (nada de valor): { fora } | { adiada } | { passo, paginas,
 * concluida }. quando: Date da rodada (padrão agora).
 */
function FinFoto_rodada_(quando) {
  quando = quando || new Date();
  if (!FinFoto_ligada_()) return { fora: 'fotografia diária desligada em Chaves e senhas > Regras do Financeiro' };
  if (!FinFoto_configurado_()) return { fora: 'conexão com o Omie não configurada' };
  if (typeof OmieLer_movimentos_ !== 'function' || typeof FinInd_montar_ !== 'function') return { fora: 'módulo do Financeiro indisponível' };
  var lock = null;
  try { lock = LockService.getScriptLock(); lock.waitLock(5000); } catch (e) { return { fora: 'outra rodada da fotografia em andamento' }; }
  try {
    FinFoto_garantir_();
    var dia = FinFoto_hoje_(quando), hora = FinFoto_hora_(quando), cur = FinFoto_cursor_();
    if (cur && cur.dia !== dia) { FinFoto_limparMemoria_(cur.dia); FinFoto_apagarProp_(FIN_FOTO_CURSOR_PROP); cur = null; }
    if (!cur) {
      var pedido = FinFoto_pedido_();
      if (!pedido) {
        if (FinFoto_doDia_(dia)) return { fora: 'a fotografia de hoje já foi feita' };
        if (hora < FinFoto_horaInicio_()) return { fora: 'antes do horário da fotografia (' + FinFoto_horaInicio_() + ')' };
      }
      cur = { dia: dia, origem: pedido ? 'PEDIDO' : 'ROTINA', iniciadaEm: quando.toISOString(), passo: 'posicao', pagina: 1, tentativas: 0, rodadas: 0 };
      FinFoto_apagarProp_(FIN_FOTO_PEDIDO_PROP);
      FinFoto_limparMemoria_(dia);
      FinFoto_acumGravar_(dia, FinFoto_acumNovo_());
      FinFoto_cursorGravar_(cur);
    }
    var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(quando) : { dentro: false };
    if (ex && ex.dentro && FinFoto_telaUsando_()) return { adiada: 'a tela do Financeiro consultou o Omie há menos de 3 minutos; a fotografia continua na próxima rodada', passo: cur.passo };
    var acum = FinFoto_acum_(dia);
    if (!acum) { // a memória do servidor se perdeu no meio: recomeça do primeiro passo
      acum = FinFoto_acumNovo_(); cur.passo = 'posicao'; cur.pagina = 1; FinFoto_cacheApagar_('FIN_FOTO_VISTOS_' + dia);
    }
    var ctx = { usadas: 0, limite: ex && ex.dentro ? FIN_FOTO_PAGINAS_EXPEDIENTE : FIN_FOTO_PAGINAS_RODADA };
    var r = {};
    cur.rodadas = (cur.rodadas || 0) + 1;
    OMIE_EM_ROTINA = true;
    try {
      while (cur.passo !== 'fim') {
        if (cur.passo !== 'fechar' && ctx.usadas >= ctx.limite) break;
        if (ex && ex.dentro && ctx.usadas > 0 && FinFoto_telaUsando_()) { r.pausa = 'a tela do Financeiro começou a consultar o Omie'; break; }
        var antes = cur.passo + ':' + (cur.pagina || 1) + ':' + (cur.mesIdx || 0);
        try {
          FinFoto_passo_(cur, acum, ctx);
          cur.tentativas = 0;
        } catch (e) {
          if (e && e.omieNaoExecutado && (cur.tentativas = (cur.tentativas || 0) + 1) < FIN_FOTO_TENTATIVAS) { r.espera = FinFoto_semValor_(e.message); break; }
          acum.falhas[cur.passo] = FinFoto_semValor_(e && e.message) || 'falha na leitura';
          cur.tentativas = 0;
          if (cur.passo === 'fechar') throw e;
          FinFoto_avancar_(cur);
        }
        FinFoto_acumGravar_(dia, acum); FinFoto_cursorGravar_(cur);
        if (cur.passo !== 'fim' && antes === cur.passo + ':' + (cur.pagina || 1) + ':' + (cur.mesIdx || 0)) break; // nada andou: próxima rodada
      }
    } finally { OMIE_EM_ROTINA = false; }
    r.passo = cur.passo; r.paginas = ctx.usadas; r.rodadas = cur.rodadas;
    if (cur.passo === 'fim') {
      r.concluida = cur.situacao || 'COMPLETA';
      FinFoto_apagarProp_(FIN_FOTO_CURSOR_PROP); FinFoto_limparMemoria_(dia);
    } else FinFoto_cursorGravar_(cur);
    return r;
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

/** Situação para a tela: última fotografia, andamento, pedido e se o botão "Atualizar agora" pode ser usado (e por quê). */
function FinFoto_estado_() {
  var cur = FinFoto_cursor_(), pedido = FinFoto_pedido_(), ult = FinFoto_lista_()[0] || null, agora = Date.now();
  var r = { emAndamento: !!cur, passo: cur ? (FIN_FOTO_NOMES_PASSOS[cur.passo] || cur.passo) : '', pedido: !!pedido, pedidoEm: pedido ? FinFoto_brHora_(pedido.em) : '',
    ultima: ult ? FinFoto_brHora_(ult.CONCLUIDA_EM) : '', horaRotina: FinFoto_horaInicio_(), ligada: FinFoto_ligada_(), podePedir: true, motivo: '' };
  var concl = ult ? new Date(ult.CONCLUIDA_EM).getTime() : 0;
  if (!r.ligada) { r.podePedir = false; r.motivo = 'A fotografia diária está desligada (Chaves e senhas > Regras do Financeiro > Fotografia diária). Peça ao responsável pelo sistema para ligar.'; }
  else if (!FinFoto_configurado_()) { r.podePedir = false; r.motivo = 'A conexão com o Omie não está configurada. Peça ao responsável pelo sistema.'; }
  else if (cur) { r.podePedir = false; r.motivo = 'Uma fotografia já está em andamento (' + r.passo + '). Ela termina nas próximas rodadas automáticas, de 15 em 15 minutos; volte a esta aba depois.'; }
  else if (pedido) { r.podePedir = false; r.motivo = 'A nova fotografia já foi pedida às ' + r.pedidoEm.slice(11) + '. Ela sai na próxima rodada automática (até 15 minutos).'; }
  else if (concl && agora - concl < FIN_FOTO_PEDIDO_INTERVALO_MS) {
    r.podePedir = false; r.liberaEm = Utilities.formatDate(new Date(concl + FIN_FOTO_PEDIDO_INTERVALO_MS), FIN_FOTO_FUSO, 'HH:mm');
    r.motivo = 'A última fotografia foi às ' + r.ultima.slice(11) + ': o Omie aceita a mesma leitura poucas vezes, por isso o botão libera 15 minutos depois, às ' + r.liberaEm + '.';
  }
  return r;
}

/** "Atualizar agora": só marca o pedido; a próxima rodada faz a fotografia. Nunca chama o Omie. */
function Fin_apiFotoPedir(sessionId) {
  try {
    var eu = Omie_exigirAcesso_(sessionId);
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      FinFoto_garantir_();
      var e = FinFoto_estado_();
      if (!e.podePedir) return { ok: false, mensagem: 'Nada foi pedido: ' + e.motivo, estado: e };
      FinFoto_props_().setProperty(FIN_FOTO_PEDIDO_PROP, JSON.stringify({ em: new Date().toISOString(), porId: FinFoto_s_(eu.userId), por: FinFoto_s_(eu.nome || eu.usuario) }));
    } finally { lock.releaseLock(); }
    return { ok: true, mensagem: 'Pedido registrado. A nova fotografia sai na próxima rodada automática do sistema (até 15 minutos) e pode levar mais uma ou duas rodadas para ficar completa. Os números atuais continuam na tela até lá.', estado: FinFoto_estado_() };
  } catch (e) { return { ok: false, mensagem: e && e.omieOpsPublica ? e.message : 'Não foi possível registrar o pedido. Nada foi alterado; tente de novo.' }; }
}
