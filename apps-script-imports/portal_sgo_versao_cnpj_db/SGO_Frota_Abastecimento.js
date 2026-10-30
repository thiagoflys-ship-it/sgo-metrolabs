/****************************************************
 * FROTA — ABASTECIMENTO: CONFERÊNCIA NA GRAVAÇÃO, CORREÇÃO E OBRIGATORIEDADE (30/10/2026)
 *
 * Pedido do dono (30/10/2026): "preciso de algo que faça com que o motorista não esqueça de inserir, tem que ter um
 * método que ele seja obrigado a inserir o abastecimento, e não passar despercebido".
 *
 *  1. Conferência na gravação (gestão, pedido de comprovante e devolução): litros com ponto ou vírgula sempre como
 *     casa decimal ("35.591" = 35,591 L); litros até 105% do tanque; preço por litro dentro de uma faixa; KM crescente
 *     e compatível com a retirada; lançamento repetido recusado. O que é impossível é recusado com o motivo e a saída;
 *     o resto grava como "a conferir" para a gestão. Antes de gravar, o resumo calculado (apiAbastPrevia).
 *  2. Corrigir abastecimento campo a campo (só a gestão), com justificativa e trilha (antes/depois, quem, quando);
 *     grava só os campos alterados e mantém o comprovante. O mesmo para data, hora e KM de uma retirada.
 *  3. Obrigatoriedade:
 *     - na devolução, a pergunta "Abasteceu durante este uso?" é obrigatória. Sim: lança ali (litros, valor, foto do
 *       comprovante; a foto do painel da devolução vai junto) ou fica um pedido com prazo de 1 dia útil. Não: registra.
 *     - detector: KM rodado desde o último abastecimento registrado acima de uma fração da autonomia (tanque x consumo
 *       do veículo; sem tanque, um limite padrão) gera a pendência "abastecimento não lançado" para quem devolveu.
 *     - pendência do detector (ou pedido da devolução vencido) trava a PRÓXIMA retirada da pessoa até ela enviar o
 *       comprovante ou justificar; a justificativa vai para a gestão conferir; a gestão pode liberar.
 *     - comprovante pendente há mais de 1 dia útil: aviso ao condutor e à gestão (sistema e e-mail; WhatsApp só na
 *       contagem do resumo do dia, no expediente, pela matriz de avisos S75/S76).
 *  Tela: SGO_Frota_AbastecimentoTela.js (aba Abastecimentos e despesas) e JS_Core (devolução no celular).
 ****************************************************/

var FROTAAB_PRECO_MIN = 1;          // R$/L abaixo disso: impossível (recusa)
var FROTAAB_PRECO_MAX = 15;         // R$/L acima disso: impossível (recusa)
var FROTAAB_LITROS_SEM_TANQUE = 150; // sem a capacidade do tanque cadastrada, nenhum veículo da frota passa disto
var FROTAAB_FOLGA_TANQUE = 1.05;
var FROTAAB_FOLGA_SEQUENCIA = 1.10;
var FROTAAB_SEQUENCIA_KM = 150;
var FROTAAB_FOLGA_RETIRADA_KM = 50;
var FROTAAB_KML_MIN = 2;            // intervalo abaixo disso (km/L) fica fora da média
var FROTAAB_KML_MAX = 30;           // intervalo acima disso (km/L) fica fora da média
var FROTAAB_DIAS_ATRASO_LANCAMENTO = 30;
// Faixa normal de preço por litro quando não há histórico suficiente (90 dias, 3 ou mais abastecimentos do combustível).
var FROTAAB_FAIXA_PADRAO = { 'GASOLINA': [4.5, 9.5], 'ETANOL': [2.8, 7.5], 'DIESEL': [4.5, 9.5], 'DIESEL S10': [4.5, 9.5], 'GNV': [3, 8], 'FLEX': [2.8, 9.5] };
var FROTAAB_SITUACAO = { PENDENTE: 'Pendente de conferência', A_CONFERIR: 'A conferir', CONFERIDO: 'Conferido', DIVERGENTE: 'Divergente', CORRIGIDO: 'Corrigido' };
var FROTAAB_EVENTO_CONDUTOR = 'S75';
var FROTAAB_EVENTO_GESTAO = 'S76';
var FROTAAB_COLUNAS_ABAST = ['SITUACAO_CONFERENCIA', 'APONTAMENTOS', 'TANQUE_CHEIO', 'MOVIMENTACAO_ID', 'FOTOS_PAINEL_JSON', 'REGISTRADO_POR_ID', 'REGISTRADO_POR_NOME',
  'CORRIGIDO_EM', 'CORRIGIDO_POR', 'CONFERIDO_EM', 'CONFERIDO_POR', 'CONFERENCIA_MOTIVO'];
var FROTAAB_COLUNAS_PEDIDO = ['TIPO_PEDIDO', 'MOVIMENTACAO_ID', 'KM_BASE', 'KM_RODADO', 'LIMITE_KM', 'BLOQUEIA_RETIRADA', 'PRAZO_EM', 'JUSTIFICATIVA', 'JUSTIFICADO_EM',
  'JUSTIFICATIVA_DECISAO', 'JUSTIFICATIVA_DECIDIDA_EM', 'JUSTIFICATIVA_DECIDIDA_POR', 'JUSTIFICATIVA_MOTIVO', 'LIBERADO_EM', 'LIBERADO_POR', 'LIBERADO_MOTIVO', 'AVISO_ATRASO_EM'];
var FROTAAB_COLUNAS_MOV = ['ABASTECEU_NO_USO', 'ABASTECIMENTO_ID', 'CORRIGIDO_EM', 'CORRIGIDO_POR', 'EXCLUIDO_EM', 'EXCLUIDO_POR', 'EXCLUIDO_MOTIVO'];

function FrotaAb_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function FrotaAb_up_(v) { return FrotaAb_s_(v).toUpperCase(); }
function FrotaAb_nome_(sessao) { return FrotaAb_s_(sessao && (sessao.nome || sessao.usuario)) || 'sistema'; }
// Litros sempre com a vírgula decimal visível (35591 sai "35.591,0", nunca "35.591", que se confunde com 35,591).
function FrotaAb_l_(n) { return Rastreador_num_(n, 3).replace(/(,\d*?[1-9])0+$/, '$1').replace(/,000$/, ',0'); }
function FrotaAb_moeda_(n) { return 'R$ ' + Rastreador_num_(n, 2); }
function FrotaAb_json_(t, padrao) { try { var v = JSON.parse(FrotaAb_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }

function FrotaAb_garantirAbas_() {
  if (typeof FrotaR_garantirAbas_ === 'function') FrotaR_garantirAbas_();
  FROTAAB_COLUNAS_ABAST.forEach(function (c) { CertCal_garantirColuna_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, c); });
  if (typeof FROTAR_ABA_PEDIDOS !== 'undefined') FROTAAB_COLUNAS_PEDIDO.forEach(function (c) { CertCal_garantirColuna_(FROTAR_ABA_PEDIDOS, c); });
  FROTAAB_COLUNAS_MOV.forEach(function (c) { CertCal_garantirColuna_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, c); });
  ['EXCLUIDO_EM', 'EXCLUIDO_POR', 'EXCLUIDO_MOTIVO'].forEach(function (c) { CertCal_garantirColuna_(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO, c); });
}

/** Configuração da obrigatoriedade (gestão grava em Abastecimentos e despesas > Obrigatoriedade). */
function FrotaAb_cfg_() {
  var p = PropertiesService.getScriptProperties();
  var n = function (k, pad, min, max) { var t = FrotaAb_s_(p.getProperty(k)).replace(',', '.'); var v = Number(t); return t !== '' && isFinite(v) && v >= min && v <= max ? v : pad; };
  return {
    fracaoAutonomia: n('FROTA_ABAST_FRACAO_AUTONOMIA', 0.75, 0.3, 1),
    kmLPadrao: n('FROTA_ABAST_KML_PADRAO', 9, 3, 25),
    limiteKmSemTanque: n('FROTA_ABAST_LIMITE_KM_PADRAO', 350, 100, 1500),
    ligado: FrotaAb_s_(p.getProperty('FROTA_ABAST_OBRIGATORIO')) !== '0'
  };
}

// ------------------------------------------------------------
// LEITURAS
// ------------------------------------------------------------
function FrotaAb_abastValidos_(veiculoId) {
  return Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO).filter(function (a) { return !veiculoId || FrotaAb_s_(a.VEICULO_ID) === FrotaAb_s_(veiculoId); });
}
function FrotaAb_msAbast_(a) { return FrotaR_msDe_(Frota_textoData_(a.DATA), Frota_textoHora_(a.HORA) || '12:00'); }
function FrotaAb_movValida_(m) { return !FrotaAb_s_(m.EXCLUIDO_EM); }
function FrotaAb_movsVeiculo_(veiculoId) {
  return Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).filter(function (m) { return FrotaAb_s_(m.VEICULO_ID) === FrotaAb_s_(veiculoId) && FrotaAb_movValida_(m); });
}
function FrotaAb_hojeMs_() { return FrotaR_inicioDia_(FrotaR_hojeBr_()); }

/** Faixa normal do preço por litro do combustível: média dos últimos 90 dias ± 30% (3 ou mais lançamentos) ou a faixa padrão. */
function FrotaAb_faixaPreco_(tipo, ignorarId) {
  var t = FrotaAb_up_(tipo);
  var desde = Date.now() - 90 * 86400000;
  var precos = FrotaAb_abastValidos_(null).filter(function (a) {
    if (FrotaAb_s_(a.ID) === FrotaAb_s_(ignorarId) || FrotaAb_up_(a.TIPO_COMBUSTIVEL) !== t) return false;
    var sit = FrotaAb_up_(a.SITUACAO_CONFERENCIA);
    if (sit === 'A_CONFERIR' || sit === 'DIVERGENTE') return false;
    var ms = FrotaAb_msAbast_(a);
    return ms !== null && ms >= desde;
  }).map(function (a) { var l = Frota_numLitros_(a.LITROS, 0), v = Frota_num_(a.VALOR, 0); return l > 0 && v > 0 ? v / l : null; })
    .filter(function (p) { return p !== null && p >= FROTAAB_PRECO_MIN && p <= FROTAAB_PRECO_MAX; });
  if (precos.length >= 3) {
    var media = precos.reduce(function (s, x) { return s + x; }, 0) / precos.length;
    return { min: Math.round(media * 0.7 * 100) / 100, max: Math.round(media * 1.3 * 100) / 100, origem: 'média dos últimos 90 dias (' + precos.length + ' abastecimentos), com 30% para mais ou para menos' };
  }
  var f = FROTAAB_FAIXA_PADRAO[t] || [2.8, 9.5];
  return { min: f[0], max: f[1], origem: 'faixa padrão do combustível (ainda sem 3 abastecimentos nos últimos 90 dias)' };
}

/**
 * Confere um abastecimento antes de gravar. d: { litros, valor, km, data, hora, tipoCombustivel, tanqueCheio } (já lidos).
 * o: { ignorarId, movAtual: { KM_SAIDA, kmChegada } , gestao }.
 * Devolve { erros: [texto], apontamentos: [{ tipo, texto }], resumo, precoLitro, kmDesdeAnterior }.
 */
function FrotaAb_analisar_(veiculo, d, o) {
  o = o || {};
  var erros = [], ap = [];
  var placa = FrotaAb_s_(veiculo.PLACA);
  var cap = Frota_num_(veiculo.CAPACIDADE_TANQUE_L, NaN);
  var litros = d.litros, valor = d.valor, km = d.km;
  if (!(litros > 0)) erros.push('Informe os litros abastecidos, como estão na nota (exemplo: 35,591).');
  else if (isFinite(cap) && cap > 0 && litros > cap * FROTAAB_FOLGA_TANQUE) {
    erros.push('Os litros informados (' + FrotaAb_l_(litros) + ' L) passam da capacidade do tanque do veículo ' + placa + ' (' + Rastreador_num_(cap, 0) + ' L). ' +
      'Confira o número na nota: litros com três casas, como 35,591, devem ser digitados com a vírgula (ou o ponto) no lugar certo. Se o abastecimento foi em mais de um veículo ou em galão, lance cada um separado.');
  } else if (!(isFinite(cap) && cap > 0) && litros > FROTAAB_LITROS_SEM_TANQUE) {
    erros.push('Os litros informados (' + FrotaAb_l_(litros) + ' L) passam de ' + FROTAAB_LITROS_SEM_TANQUE + ' L, mais do que cabe no tanque de qualquer veículo da frota. ' +
      'Confira o número na nota e digite com a vírgula (exemplo: 35,591). A gestão pode cadastrar a capacidade do tanque do veículo ' + placa + ' em Frota > Rastreamento > Combustível e KM.');
  }
  if (!(valor > 0)) erros.push('Informe o valor total pago, como está na nota (exemplo: 125,99).');
  var preco = litros > 0 && valor > 0 ? valor / litros : null;
  var faixa = null;
  if (preco !== null && !erros.length) {
    if (preco < FROTAAB_PRECO_MIN || preco > FROTAAB_PRECO_MAX) {
      erros.push('O preço por litro ficou em ' + FrotaAb_moeda_(preco) + ' (' + FrotaAb_moeda_(valor) + ' por ' + FrotaAb_l_(litros) + ' L), fora do possível (de ' + FrotaAb_moeda_(FROTAAB_PRECO_MIN) + ' a ' + FrotaAb_moeda_(FROTAAB_PRECO_MAX) + '). ' +
        'Confira os litros e o valor na nota: um dos dois foi digitado errado (por exemplo, a vírgula no lugar errado).');
    } else {
      faixa = FrotaAb_faixaPreco_(d.tipoCombustivel, o.ignorarId);
      if (preco < faixa.min || preco > faixa.max) ap.push({ tipo: 'PRECO', texto: 'Preço por litro de ' + FrotaAb_moeda_(preco) + ' fora da faixa normal do ' + (FrotaAb_s_(d.tipoCombustivel) || 'combustível') + ' (' + FrotaAb_moeda_(faixa.min) + ' a ' + FrotaAb_moeda_(faixa.max) + ', ' + faixa.origem + ').' });
    }
  }
  if (!(isFinite(km) && km > 0)) erros.push('Informe o KM do painel no momento do abastecimento (só números, exemplo: 197277).');
  var kmAtual = Frota_num_(veiculo.KM_ATUAL, 0);
  if (isFinite(km) && km > 0 && kmAtual > 0 && km > kmAtual + 5000 && !o.movAtual) {
    erros.push('O KM informado (' + Frota_kmTexto_(km) + ') está ' + Frota_kmTexto_(km - kmAtual) + ' km acima do KM atual do veículo ' + placa + ' (' + Frota_kmTexto_(kmAtual) + '). Confira o número no painel ou na nota.');
  }
  var msAb = FrotaR_msDe_(d.data, d.hora || '12:00');
  if (msAb === null) erros.push('Informe a data do abastecimento no formato dd/mm/aaaa (exemplo: 22/10/2026).');
  else {
    if (FrotaR_inicioDia_(d.data) > FrotaAb_hojeMs_()) erros.push('A data do abastecimento (' + d.data + ') está no futuro. Hoje é ' + FrotaR_hojeBr_() + '. Corrija a data.');
    var dias = Math.floor((FrotaAb_hojeMs_() - FrotaR_inicioDia_(d.data)) / 86400000);
    if (dias > FROTAAB_DIAS_ATRASO_LANCAMENTO) ap.push({ tipo: 'ATRASO', texto: 'Lançado ' + dias + ' dias depois do abastecimento (' + d.data + ').' });
  }
  // Abastecimentos do veículo (sem o próprio, na correção) para o KM, a sequência e o repetido.
  var outros = FrotaAb_abastValidos_(veiculo.ID).filter(function (a) { return FrotaAb_s_(a.ID) !== FrotaAb_s_(o.ignorarId); })
    .map(function (a) { return { a: a, ms: FrotaAb_msAbast_(a), km: Frota_num_(a.KM, NaN), litros: Frota_numLitros_(a.LITROS, 0), valor: Frota_num_(a.VALOR, 0), data: Frota_textoData_(a.DATA) }; });
  if (!erros.length) {
    var rep = outros.filter(function (x) { return x.data === d.data && Math.abs(x.valor - valor) < 0.01 && Math.abs(x.litros - litros) < 0.01; })[0];
    if (rep) erros.push('Este abastecimento já está lançado: veículo ' + placa + ', ' + rep.data + ', ' + FrotaAb_l_(rep.litros) + ' L, ' + FrotaAb_moeda_(rep.valor) + ' (lançado em ' + FrotaR_textoMs_(new Date(rep.a.CRIADO_EM).getTime()) + '). Nada foi gravado em dobro. Se for outro abastecimento com os mesmos valores, fale com a gestão.');
  }
  var anterior = null, kmDesde = null;
  if (isFinite(km) && km > 0 && msAb !== null) {
    var antes = outros.filter(function (x) { return x.ms !== null && x.ms < msAb && isFinite(x.km); }).sort(function (a, b) { return b.ms - a.ms; });
    var depois = outros.filter(function (x) { return x.ms !== null && x.ms > msAb && isFinite(x.km); }).sort(function (a, b) { return a.ms - b.ms; });
    anterior = antes[0] || null;
    if (anterior && anterior.km > km) ap.push({ tipo: 'KM', texto: 'KM ' + Frota_kmTexto_(km) + ' menor que o KM do abastecimento anterior (' + anterior.data + ', KM ' + Frota_kmTexto_(anterior.km) + '): o odômetro não volta.' });
    if (depois[0] && depois[0].km < km) ap.push({ tipo: 'KM', texto: 'KM ' + Frota_kmTexto_(km) + ' maior que o KM do abastecimento seguinte (' + depois[0].data + ', KM ' + Frota_kmTexto_(depois[0].km) + ').' });
    if (anterior && anterior.km <= km) kmDesde = km - anterior.km;
    // KM compatível com a retirada em que aconteceu.
    var mov = o.movAtual || null;
    if (mov) {
      var ks = Frota_num_(mov.KM_SAIDA, NaN), kc = Frota_num_(mov.kmChegada, NaN);
      if (isFinite(ks) && (km < ks - FROTAAB_FOLGA_RETIRADA_KM || (isFinite(kc) && km > kc + FROTAAB_FOLGA_RETIRADA_KM))) {
        ap.push({ tipo: 'KM_RETIRADA', texto: 'KM ' + Frota_kmTexto_(km) + ' fora desta retirada (saída com ' + Frota_kmTexto_(ks) + (isFinite(kc) ? ', chegada com ' + Frota_kmTexto_(kc) : '') + ').' });
      }
    } else {
      var movs = FrotaAb_movsVeiculo_(veiculo.ID).map(function (m) {
        var ini = FrotaR_msDe_(Frota_textoData_(m.DATA_SAIDA), Frota_textoHora_(m.HORA_SAIDA) || '00:00');
        var fim = FrotaAb_s_(m.DATA_CHEGADA) ? FrotaR_msDe_(Frota_textoData_(m.DATA_CHEGADA), Frota_textoHora_(m.HORA_CHEGADA) || '23:59') : Date.now();
        return { m: m, ini: ini, fim: fim, ks: Frota_num_(m.KM_SAIDA, NaN), kc: FrotaAb_s_(m.KM_CHEGADA) === '' ? Frota_num_(veiculo.KM_ATUAL, NaN) : Frota_num_(m.KM_CHEGADA, NaN) };
      }).filter(function (x) { return x.ini !== null && isFinite(x.ks); });
      var dia0 = FrotaR_inicioDia_(d.data), dia1 = dia0 + 86400000 - 1;
      var cobrem = d.hora ? movs.filter(function (x) { return msAb >= x.ini && msAb <= x.fim; }) : movs.filter(function (x) { return x.fim >= dia0 && x.ini <= dia1; });
      var cabe = function (x) { return km >= x.ks - FROTAAB_FOLGA_RETIRADA_KM && (!isFinite(x.kc) || km <= x.kc + FROTAAB_FOLGA_RETIRADA_KM); };
      if (cobrem.length && !cobrem.some(cabe)) {
        var faixas = cobrem.slice(0, 3).map(function (x) { return Frota_kmTexto_(x.ks) + ' a ' + (isFinite(x.kc) ? Frota_kmTexto_(x.kc) : '?'); }).join('; ');
        ap.push({ tipo: 'KM_RETIRADA', texto: 'KM ' + Frota_kmTexto_(km) + ' não bate com as retiradas do veículo ' + (d.hora ? 'nesse horário' : 'em ' + d.data) + ' (KM ' + faixas + '). Confira com o comprovante e a foto do painel.' });
      }
    }
    // Soma em sequência: dois abastecimentos com menos de 150 km entre eles somando mais que o tanque.
    if (isFinite(cap) && cap > 0 && litros > 0) {
      var perto = outros.filter(function (x) { return isFinite(x.km) && Math.abs(x.km - km) < FROTAAB_SEQUENCIA_KM && x.litros > 0; })[0];
      if (perto && perto.litros + litros > cap * FROTAAB_FOLGA_SEQUENCIA) {
        ap.push({ tipo: 'SEQUENCIA', texto: FrotaAb_l_(litros) + ' L agora e ' + FrotaAb_l_(perto.litros) + ' L em ' + perto.data + ' com ' + Frota_kmTexto_(Math.abs(perto.km - km)) + ' km entre eles: ' + FrotaAb_l_(perto.litros + litros) + ' L, mais que o tanque (' + Rastreador_num_(cap, 0) + ' L). Um dos dois comprovantes não corresponde a este veículo ou momento.' });
      }
    }
  }
  var resumo = '';
  if (litros > 0 && valor > 0 && isFinite(km)) {
    resumo = FrotaAb_l_(litros) + ' L de ' + (FrotaAb_s_(d.tipoCombustivel) || 'combustível') + ' × ' + FrotaAb_moeda_(preco) + ' por litro = ' + FrotaAb_moeda_(valor) + '; KM ' + Frota_kmTexto_(km) +
      (kmDesde !== null ? ' (rodou ' + Frota_kmTexto_(kmDesde) + ' km desde o abastecimento anterior, em ' + anterior.data + ')' : '') + (d.tanqueCheio === 'SIM' ? '; tanque completado' : (d.tanqueCheio === 'NAO' ? '; sem completar o tanque' : '')) + '.';
  }
  return { erros: erros, apontamentos: ap, resumo: resumo, precoLitro: preco === null ? null : Math.round(preco * 1000) / 1000, kmDesdeAnterior: kmDesde, faixaPreco: faixa };
}

/** Lê os campos digitados (litros sempre com a casa decimal no ponto ou na vírgula). */
function FrotaAb_ler_(payload, padrao) {
  padrao = padrao || {};
  var tc = FrotaAb_up_(payload.tanqueCheio);
  return {
    litros: Frota_numLitros_(payload.litros, NaN), valor: Frota_num_(payload.valor, NaN),
    km: FrotaAb_s_(payload.km) === '' && padrao.km !== undefined ? padrao.km : Frota_num_(payload.km, NaN),
    data: FrotaAb_s_(payload.data) || padrao.data || '', hora: FrotaAb_s_(payload.hora) || padrao.hora || '',
    tipoCombustivel: FrotaAb_s_(payload.tipoCombustivel) || 'Outro', posto: FrotaAb_s_(payload.posto).slice(0, 200),
    tanqueCheio: tc === 'SIM' || payload.tanqueCheio === true ? 'SIM' : (tc === 'NAO' || payload.tanqueCheio === false ? 'NAO' : '')
  };
}

function FrotaAb_textoErros_(erros) { return erros.length === 1 ? erros[0] : 'Confira antes de gravar: ' + erros.map(function (e, i) { return (i + 1) + ') ' + e; }).join(' '); }

/** Grava o abastecimento com a situação da conferência. extra: campos a mais (ORIGEM, PEDIDO_ID, MOVIMENTACAO_ID, COMPROVANTE_LINK...). */
function FrotaAb_gravar_(sessao, veiculo, d, analise, extra) {
  var reg = SGO_DATA.normalizarObjetoParaSheet(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, SGO_DATA.gerarRegistroBase(Object.assign({
    VEICULO_ID: FrotaAb_s_(veiculo.ID), CONDUTOR_ID: '', DATA: d.data, HORA: d.hora, KM: d.km, TIPO_COMBUSTIVEL: d.tipoCombustivel, LITROS: d.litros, VALOR: d.valor, POSTO: d.posto,
    TANQUE_CHEIO: d.tanqueCheio, SITUACAO_CONFERENCIA: analise.apontamentos.length ? 'A_CONFERIR' : 'PENDENTE', APONTAMENTOS: analise.apontamentos.length ? JSON.stringify(analise.apontamentos) : '',
    REGISTRADO_POR_ID: FrotaAb_s_(sessao && sessao.userId), REGISTRADO_POR_NOME: FrotaAb_nome_(sessao)
  }, extra || {})));
  SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, reg);
  return reg;
}

function FrotaAb_veiculoDoPayload_(payload) {
  var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, FrotaAb_s_(payload.veiculoId));
  if (!v) throw new Error('Veículo não encontrado. Atualize a tela e escolha o veículo de novo.');
  return v;
}

/**
 * Resumo calculado antes de gravar (toda a equipe): { ok, erros, apontamentos, resumo }. Nada é gravado.
 * payload: os mesmos campos da gravação; pedidoId (resposta ao pedido) ou veiculoId; movimentacaoId + kmChegada (devolução).
 */
function Frota_apiAbastPrevia(sessionId, payload) {
  Frota_exigirEquipe_(sessionId);
  Frota_bootstrap_();
  payload = payload || {};
  var veiculo, mov = null, padrao = {};
  if (FrotaAb_s_(payload.pedidoId) && typeof FROTAR_ABA_PEDIDOS !== 'undefined') {
    var p = SGO_DATA.getById(FROTAR_ABA_PEDIDOS, FrotaAb_s_(payload.pedidoId));
    if (!p) throw new Error('Pedido não encontrado. Atualize a tela.');
    veiculo = FrotaAb_veiculoDoPayload_({ veiculoId: p.VEICULO_ID });
    padrao.data = FrotaAb_s_(p.DATA_REF);
  } else if (FrotaAb_s_(payload.movimentacaoId)) {
    var m = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, FrotaAb_s_(payload.movimentacaoId));
    if (!m) throw new Error('Retirada não encontrada. Atualize a tela.');
    veiculo = FrotaAb_veiculoDoPayload_({ veiculoId: m.VEICULO_ID });
    var kc = Frota_num_(payload.kmChegada, NaN);
    mov = { KM_SAIDA: m.KM_SAIDA, kmChegada: kc };
    padrao = { km: kc, data: Frota_agoraSP_().data, hora: Frota_agoraSP_().hora };
  } else veiculo = FrotaAb_veiculoDoPayload_(payload);
  var d = FrotaAb_ler_(payload, padrao);
  var a = FrotaAb_analisar_(veiculo, d, { movAtual: mov, ignorarId: payload.ignorarId });
  return { ok: true, erros: a.erros, apontamentos: a.apontamentos, resumo: a.resumo, precoLitro: a.precoLitro, aConferir: a.apontamentos.length > 0,
    mensagem: a.erros.length ? FrotaAb_textoErros_(a.erros) : (a.resumo + (a.apontamentos.length ? ' Vai gravar como "a conferir" para a gestão: ' + a.apontamentos.map(function (x) { return x.texto; }).join(' ') : '')) };
}

// ------------------------------------------------------------
// LANÇAMENTO PELA GESTÃO E RESPOSTA AO PEDIDO (substituem a gravação antiga)
// ------------------------------------------------------------
function FrotaAb_registrarPelaGestao_(sessao, payload) {
  var veiculo = FrotaAb_veiculoDoPayload_(payload);
  var d = FrotaAb_ler_(payload);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(d.data)) throw new Error('Informe a data no formato dd/mm/aaaa.');
  if (d.hora && !/^\d{1,2}:\d{2}$/.test(d.hora)) throw new Error('Informe a hora do abastecimento no formato hh:mm (exemplo: 14:35) ou deixe vazio.');
  var a = FrotaAb_analisar_(veiculo, d, { gestao: true });
  if (a.erros.length) throw new Error(FrotaAb_textoErros_(a.erros) + ' Nada foi gravado.');
  if (!payload.base64) throw new Error('Anexe o comprovante do abastecimento antes de registrar.');
  var link = Frota_uploadFoto_(veiculo.PLACA, payload.base64, payload.mimeType, payload.nomeArquivo || 'comprovante-abastecimento');
  var reg = FrotaAb_gravar_(sessao, veiculo, d, a, { CONDUTOR_ID: FrotaAb_s_(payload.condutorId), COMPROVANTE_LINK: link, ORIGEM: 'GESTAO' });
  SGO_DATA.log('FROTA_ABASTECIMENTO_REGISTRAR', sessao.usuario, 'Abastecimento registrado — veículo ' + veiculo.PLACA + ' (' + d.litros + ' L)' + (a.apontamentos.length ? ' a conferir' : ''), 'FROTA');
  return { ok: true, item: reg, resumo: a.resumo, apontamentos: a.apontamentos,
    mensagem: 'Abastecimento gravado: ' + a.resumo + (a.apontamentos.length ? ' Ficou "a conferir": ' + a.apontamentos.map(function (x) { return x.texto; }).join(' ') : '') };
}

function FrotaAb_responderPedido_(sessionId, sessao, p, payload) {
  var veiculo = FrotaAb_veiculoDoPayload_({ veiculoId: p.VEICULO_ID });
  var d = FrotaAb_ler_(payload, { data: FrotaAb_s_(p.DATA_REF) });
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(d.data)) throw new Error('Informe a data do abastecimento no formato dd/mm/aaaa.');
  if (d.hora && !/^\d{1,2}:\d{2}$/.test(d.hora)) throw new Error('Informe a hora no formato hh:mm (exemplo: 14:35) ou deixe vazio.');
  var mov = FrotaAb_s_(p.MOVIMENTACAO_ID) ? SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, p.MOVIMENTACAO_ID) : null;
  var a = FrotaAb_analisar_(veiculo, d, { movAtual: mov ? { KM_SAIDA: mov.KM_SAIDA, kmChegada: mov.KM_CHEGADA } : null });
  if (a.erros.length) throw new Error(FrotaAb_textoErros_(a.erros) + ' O pedido continua aberto; corrija e envie de novo.');
  if (!payload.base64) throw new Error('Anexe a foto da nota ou o PDF do comprovante. Sem o comprovante o pedido continua aberto.');
  var link = Frota_uploadFoto_(p.PLACA, payload.base64, payload.mimeType, payload.nomeArquivo || 'comprovante-abastecimento');
  var reg = FrotaAb_gravar_(sessao, veiculo, d, a, { CONDUTOR_ID: FrotaAb_s_(p.CONDUTOR_ID), COMPROVANTE_LINK: link, ORIGEM: 'CONDUTOR', PEDIDO_ID: FrotaAb_s_(p.ID), MOVIMENTACAO_ID: FrotaAb_s_(p.MOVIMENTACAO_ID) });
  SGO_DATA.update(FROTAR_ABA_PEDIDOS, p.ID, { SITUACAO: 'ENVIADO', ENVIADO_EM: SGO_UTILS.nowIso(), ABASTECIMENTO_ID: reg.ID });
  if (FrotaAb_s_(p.ATIVIDADE_ID) && typeof Atividades_apiMudarSituacao === 'function') {
    try { Atividades_apiMudarSituacao(sessionId, { id: p.ATIVIDADE_ID, situacao: 'Concluída', observacao: 'Comprovante enviado pela Frota (abastecimento de ' + d.data + ', ' + FrotaAb_l_(d.litros) + ' L).' }); } catch (e) {}
  }
  Frota_auditar_(sessao, { acao: 'COMPROVANTE_ENVIADO', veiculoId: FrotaAb_s_(p.VEICULO_ID), placa: FrotaAb_s_(p.PLACA), condutorId: FrotaAb_s_(p.CONDUTOR_ID), condutorNome: FrotaAb_s_(p.CONDUTOR_NOME),
    detalhe: 'Comprovante enviado: abastecimento de ' + d.data + (d.hora ? ' ' + d.hora : '') + ', ' + FrotaAb_l_(d.litros) + ' L, KM ' + Frota_kmTexto_(d.km) + '.' + (a.apontamentos.length ? ' A conferir.' : '') });
  return { ok: true, mensagem: 'Comprovante enviado: ' + a.resumo + ' O pedido foi encerrado' + (FrotaAb_s_(p.BLOQUEIA_RETIRADA) === 'SIM' ? ', a sua próxima retirada está livre' : '') + ' e a atividade marcada como concluída.' +
    (a.apontamentos.length ? ' A gestão vai conferir: ' + a.apontamentos.map(function (x) { return x.texto; }).join(' ') : '') };
}

// ------------------------------------------------------------
// PRAZO EM DIAS ÚTEIS E PEDIDOS AUTOMÁTICOS
// ------------------------------------------------------------
/** ms + 24 horas, pulando os dias sem expediente (fim de semana e feriado): "1 dia útil" a partir de agora. */
function FrotaAb_somarDiaUtil_(ms) {
  var alvo = ms + 86400000;
  for (var i = 0; i < 10; i++) {
    var util = typeof SGO_ehDiaUtil_ === 'function' ? SGO_ehDiaUtil_(new Date(alvo)) : [0, 6].indexOf(FrotaR_local_(alvo).semana) < 0;
    if (util) return alvo;
    alvo += 86400000;
  }
  return alvo;
}

function FrotaAb_pedidos_() { return typeof FROTAR_ABA_PEDIDOS === 'undefined' ? [] : Frota_lerSeExistir_(FROTAR_ABA_PEDIDOS); }
function FrotaAb_prazoMs_(p) {
  var t = new Date(FrotaAb_s_(p.PRAZO_EM)).getTime();
  if (isFinite(t) && FrotaAb_s_(p.PRAZO_EM)) return t;
  var f = FrotaR_fimDia_(FrotaAb_s_(p.PRAZO));
  return f === null ? null : f;
}
function FrotaAb_atrasado_(p, agora) { var t = FrotaAb_prazoMs_(p); return FrotaAb_up_(p.SITUACAO) === 'PENDENTE' && t !== null && t < (agora || Date.now()); }
/** O pedido trava a próxima retirada? Detector: na hora. Pedido da devolução: depois do prazo. Liberado/enviado/justificado: não. */
function FrotaAb_pedidoTrava_(p, agora) {
  if (FrotaAb_up_(p.SITUACAO) !== 'PENDENTE' || FrotaAb_up_(p.BLOQUEIA_RETIRADA) !== 'SIM') return false;
  return FrotaAb_up_(p.TIPO_PEDIDO) === 'DETECTOR' || FrotaAb_atrasado_(p, agora);
}

/** Cria o pedido automático (devolução ou detector) e a atividade do condutor. Nunca derruba a devolução. */
function FrotaAb_criarPedido_(sessionId, sessao, o) {
  var c = o.condutor || {};
  var uid = FrotaAb_s_(c.USUARIO_ID);
  var agora = Date.now();
  var prazoMs = FrotaAb_somarDiaUtil_(agora);
  var prazo = FrotaR_local_(prazoMs);
  var atv = null;
  if (uid && typeof Atividades_apiCriar === 'function') {
    try {
      var r = Atividades_apiCriar(sessionId, { titulo: o.tituloAtividade, descricao: o.descricao + '\nComo resolver: Frota > Abastecimentos e despesas > "Comprovantes pedidos a você": "Enviar comprovante" (foto da nota, litros, valor e KM) ou "Não abasteci" (escreva o motivo; a gestão confere). Esta atividade é concluída sozinha.',
        prazo: prazo.iso + 'T' + prazo.hora, prioridade: 'Normal', responsavelId: uid, modulo: 'frota', moduloNome: 'Frota',
        porQue: 'Todo abastecimento da frota precisa estar lançado com o comprovante (conferência de consumo e custo)', onde: 'Frota > Abastecimentos e despesas', como: 'Foto da nota ou PDF, litros, valor e KM; ou "Não abasteci" com o motivo' });
      if (r && r.ok === true) atv = r.item;
    } catch (e) { console.error('Frota, atividade do abastecimento: ' + ((e && e.message) || e)); }
  }
  var reg = SGO_DATA.normalizarObjetoParaSheet(FROTAR_ABA_PEDIDOS, SGO_DATA.gerarRegistroBase({
    VEICULO_ID: FrotaAb_s_(o.veiculo.ID), PLACA: FrotaAb_s_(o.veiculo.PLACA), CONDUTOR_ID: FrotaAb_s_(c.ID), CONDUTOR_NOME: FrotaAb_s_(c.NOME), USUARIO_ID: uid, DATA_REF: o.dataRef || '',
    VALOR_REF: '', MOTIVO: String(o.motivo || '').slice(0, 500), SITUACAO: 'PENDENTE', PRAZO: prazo.data, PRAZO_EM: new Date(prazoMs).toISOString(), ATIVIDADE_ID: atv ? FrotaAb_s_(atv.ID) : '',
    ABASTECIMENTO_ID: '', PEDIDO_POR_ID: FrotaAb_s_(sessao && sessao.userId), PEDIDO_POR_NOME: o.tipo === 'DETECTOR' ? 'Conferência automática da Frota' : FrotaAb_nome_(sessao), PEDIDO_EM: SGO_UTILS.nowIso(),
    ENVIADO_EM: '', CANCELADO_EM: '', CANCELADO_POR: '', CANCELADO_MOTIVO: '',
    TIPO_PEDIDO: o.tipo, MOVIMENTACAO_ID: FrotaAb_s_(o.movimentacaoId), KM_BASE: o.kmBase === undefined ? '' : o.kmBase, KM_RODADO: o.kmRodado === undefined ? '' : o.kmRodado,
    LIMITE_KM: o.limiteKm === undefined ? '' : o.limiteKm, BLOQUEIA_RETIRADA: 'SIM'
  }));
  SGO_DATA.insert(FROTAR_ABA_PEDIDOS, reg);
  Frota_auditar_(sessao, { acao: o.tipo === 'DETECTOR' ? 'ABASTECIMENTO_NAO_LANCADO' : 'ABASTECIMENTO_A_LANCAR', veiculoId: FrotaAb_s_(o.veiculo.ID), placa: FrotaAb_s_(o.veiculo.PLACA), movimentacaoId: FrotaAb_s_(o.movimentacaoId),
    condutorId: FrotaAb_s_(c.ID), condutorNome: FrotaAb_s_(c.NOME), detalhe: String(o.motivo || '').slice(0, 900) });
  return reg;
}

// ------------------------------------------------------------
// DETECTOR: KM DESDE O ÚLTIMO ABASTECIMENTO X AUTONOMIA
// ------------------------------------------------------------
function FrotaAb_chaveBase_(veiculoId) { return 'FROTA_ABAST_BASE_KM_' + FrotaAb_s_(veiculoId); }
/** Ponto de partida do detector: o KM em que ele começou a valer para o veículo, ou o de uma justificativa aceita. */
function FrotaAb_baseGuardada_(veiculoId) { return FrotaAb_json_(PropertiesService.getScriptProperties().getProperty(FrotaAb_chaveBase_(veiculoId)), null); }
function FrotaAb_gravarBase_(veiculoId, km, motivo) {
  var atual = FrotaAb_baseGuardada_(veiculoId);
  if (atual && Number(atual.km) >= Number(km)) return atual;
  var b = { km: Number(km), em: SGO_UTILS.nowIso(), motivo: String(motivo || '').slice(0, 200) };
  PropertiesService.getScriptProperties().setProperty(FrotaAb_chaveBase_(veiculoId), JSON.stringify(b));
  return b;
}

/** Consumo de referência do veículo (mediana dos intervalos coerentes) ou null. */
function FrotaAb_kmLVeiculo_(veiculoId) {
  if (typeof FrotaR_intervalosConsumo_ !== 'function') return null;
  var h = FrotaR_intervalosConsumo_(FrotaAb_abastValidos_(veiculoId));
  return h.intervalos.length >= 3 && h.mediana >= FROTAAB_KML_MIN && h.mediana <= FROTAAB_KML_MAX ? h.mediana : null;
}

/**
 * Situação do veículo para a obrigatoriedade: { kmAtual, ultimo: {data, km}, base, kmDesde, limite, origemLimite, autonomia }.
 * kmAtual opcional (na devolução, o KM de chegada). iniciar: grava o ponto de partida quando ainda não existe.
 */
function FrotaAb_situacaoVeiculo_(veiculo, kmAtual, iniciar, cfg) {
  cfg = cfg || FrotaAb_cfg_();
  var vid = FrotaAb_s_(veiculo.ID);
  kmAtual = isFinite(Number(kmAtual)) && kmAtual !== '' && kmAtual !== null && kmAtual !== undefined ? Number(kmAtual) : Frota_num_(veiculo.KM_ATUAL, 0);
  var ultimo = null;
  FrotaAb_abastValidos_(vid).forEach(function (a) {
    if (FrotaAb_up_(a.SITUACAO_CONFERENCIA) === 'DIVERGENTE') return;
    var k = Frota_num_(a.KM, NaN);
    if (isFinite(k) && k <= kmAtual + FROTAAB_FOLGA_RETIRADA_KM && (!ultimo || k > ultimo.km)) ultimo = { km: k, data: Frota_textoData_(a.DATA), id: FrotaAb_s_(a.ID) };
  });
  var guardada = FrotaAb_baseGuardada_(vid);
  if (!guardada && iniciar) guardada = FrotaAb_gravarBase_(vid, iniciar === true ? kmAtual : Number(iniciar), 'início da conferência automática');
  var base = ultimo ? ultimo.km : null, origemBase = ultimo ? 'último abastecimento registrado (' + ultimo.data + ')' : '';
  if (guardada && (base === null || Number(guardada.km) > base)) { base = Number(guardada.km); origemBase = guardada.motivo + ' (' + FrotaR_textoMs_(new Date(guardada.em).getTime()).slice(0, 10) + ')'; }
  var cap = Frota_num_(veiculo.CAPACIDADE_TANQUE_L, NaN);
  var kmL = FrotaAb_kmLVeiculo_(vid);
  var limite, origem, autonomia = null;
  if (isFinite(cap) && cap > 0) {
    autonomia = cap * (kmL || cfg.kmLPadrao);
    limite = Math.round(autonomia * cfg.fracaoAutonomia);
    origem = Math.round(cfg.fracaoAutonomia * 100) + '% da autonomia (' + Rastreador_num_(cap, 0) + ' L × ' + Rastreador_num_(kmL || cfg.kmLPadrao, 1) + ' km/L ' + (kmL ? 'do próprio veículo' : 'padrão') + ' = ' + Frota_kmTexto_(autonomia) + ' km)';
  } else {
    limite = cfg.limiteKmSemTanque;
    origem = 'limite padrão (o veículo está sem a capacidade do tanque cadastrada)';
  }
  var kmDesde = base === null ? null : Math.max(0, kmAtual - base);
  return { veiculoId: vid, placa: FrotaAb_s_(veiculo.PLACA), kmAtual: kmAtual, ultimo: ultimo, base: base, origemBase: origemBase, kmDesde: kmDesde, limite: limite, origemLimite: origem,
    autonomia: autonomia === null ? null : Math.round(autonomia), passou: kmDesde !== null && kmDesde > limite, capacidade: isFinite(cap) && cap > 0 ? cap : null, kmL: kmL };
}

// ------------------------------------------------------------
// DEVOLUÇÃO: PERGUNTA OBRIGATÓRIA, LANÇAMENTO E DETECTOR
// ------------------------------------------------------------
/**
 * Antes de gravar a devolução (Frota_apiFinalizarViagem): confere a resposta e, se for lançar agora, o abastecimento.
 * Recusa aqui (nada é gravado) para a pessoa corrigir na mesma tela. Devolve o plano para FrotaAb_aposDevolucao_.
 */
function FrotaAb_antesDaDevolucao_(payload, mov, veiculo, kmChegada, pelaGestao) {
  FrotaAb_garantirAbas_();
  var r = FrotaAb_up_(payload.abasteceu);
  if (r === 'NAO SEI') r = 'NAO_SEI';
  // 30/10/2026 (leva 2): "Já lancei pelo Abasteci" só vale se há abastecimento desta retirada lançado pelo "Abasteci".
  if (r === 'JA_LANCADO') {
    var jaLancado = FrotaAb_abastValidos_(mov.VEICULO_ID).some(function (a) { return FrotaAb_s_(a.MOVIMENTACAO_ID) === FrotaAb_s_(mov.ID); });
    if (!jaLancado) throw new Error('Não há abastecimento lançado pelo "Abasteci" nesta retirada. Responda "Abasteci" (e lance agora ou depois) ou "Não abasteci". Nada foi gravado.');
    return { resposta: r, lancarAgora: false };
  }
  if (['SIM', 'NAO', 'NAO_SEI'].indexOf(r) < 0 || (r === 'NAO_SEI' && !pelaGestao)) {
    throw new Error('Responda "Abasteceu durante este uso?" antes de confirmar a devolução (passo "Abastecimento" na tela). ' +
      'Todo abastecimento da frota precisa ser lançado com o comprovante: se abasteceu, lance agora (litros, valor e foto da nota) ou escolha "Lançar depois" (prazo de 1 dia útil). Nada foi gravado.');
  }
  var plano = { resposta: r, lancarAgora: false };
  if (r !== 'SIM') return plano;
  var ab = payload.abastecimento || {};
  plano.lancarAgora = ab.lancarAgora === true || FrotaAb_up_(ab.lancarAgora) === 'SIM';
  if (!plano.lancarAgora) return plano;
  var agora = Frota_agoraSP_();
  var d = FrotaAb_ler_(ab, { km: kmChegada, data: agora.data, hora: agora.hora });
  var a = FrotaAb_analisar_(veiculo, d, { movAtual: { KM_SAIDA: mov.KM_SAIDA, kmChegada: kmChegada } });
  if (a.erros.length) throw new Error('Abastecimento: ' + FrotaAb_textoErros_(a.erros) + ' Corrija no passo "Abastecimento" (ou escolha "Lançar depois") e toque em Confirmar de novo. Nada foi gravado.');
  var link = FrotaAb_s_(ab.comprovanteLink);
  if (!/^(https?:\/\/|\/arquivos\/)/.test(link)) {
    if (ab.base64) link = Frota_uploadFoto_(veiculo.PLACA, ab.base64, ab.mimeType, ab.nomeArquivo || 'comprovante-abastecimento');
    else throw new Error('Abastecimento: tire a foto da nota (ou do cupom) no passo "Abastecimento". Sem o comprovante, escolha "Lançar depois": fica um pedido com prazo de 1 dia útil. Nada foi gravado.');
  }
  plano.dados = d; plano.analise = a; plano.link = link;
  return plano;
}

/** Depois de gravar a devolução: grava o abastecimento, o pedido e roda o detector. Nunca derruba a devolução já gravada. */
function FrotaAb_aposDevolucao_(sessionId, sessao, plano, mov, veiculo, condutor, kmChegada, fotosPainel) {
  var out = { abastecimento: null, pedido: null, detector: null, mensagens: [] };
  try {
    var movId = FrotaAb_s_(mov.ID);
    var upd = { ABASTECEU_NO_USO: plano.resposta };
    if (plano.resposta === 'SIM' && plano.lancarAgora) {
      var reg = FrotaAb_gravar_(sessao, veiculo, plano.dados, plano.analise, { CONDUTOR_ID: FrotaAb_s_(mov.CONDUTOR_ID), COMPROVANTE_LINK: plano.link, ORIGEM: 'DEVOLUCAO', MOVIMENTACAO_ID: movId,
        FOTOS_PAINEL_JSON: fotosPainel && fotosPainel.length ? JSON.stringify(fotosPainel) : '' });
      upd.ABASTECIMENTO_ID = reg.ID;
      out.abastecimento = { id: reg.ID, resumo: plano.analise.resumo, aConferir: plano.analise.apontamentos.length > 0 };
      out.mensagens.push('Abastecimento lançado: ' + plano.analise.resumo + (plano.analise.apontamentos.length ? ' A gestão vai conferir.' : ''));
      Frota_auditar_(sessao, { acao: 'ABASTECIMENTO_NA_DEVOLUCAO', veiculoId: FrotaAb_s_(veiculo.ID), placa: FrotaAb_s_(veiculo.PLACA), movimentacaoId: movId, condutorId: FrotaAb_s_(condutor.ID), condutorNome: FrotaAb_s_(condutor.NOME), detalhe: plano.analise.resumo });
    } else if (plano.resposta === 'SIM' || plano.resposta === 'NAO_SEI') {
      var p = FrotaAb_criarPedido_(sessionId, sessao, { tipo: 'DEVOLUCAO', veiculo: veiculo, condutor: condutor, movimentacaoId: movId, dataRef: Frota_textoData_(mov.DATA_SAIDA),
        tituloAtividade: 'Lançar o abastecimento do veículo ' + veiculo.PLACA + ' (devolução de ' + Frota_agoraSP_().data + ')',
        descricao: plano.resposta === 'SIM' ? 'Na devolução do veículo ' + veiculo.PLACA + ' você respondeu que abasteceu e que vai lançar depois. Prazo: 1 dia útil. Depois do prazo, a sua próxima retirada fica travada até lançar.'
          : 'A gestão registrou a devolução do veículo ' + veiculo.PLACA + ' no seu lugar e não soube dizer se você abasteceu. Se abasteceu, envie o comprovante; se não, toque em "Não abasteci".',
        motivo: plano.resposta === 'SIM' ? 'Abasteceu durante a retirada e vai lançar depois (resposta na devolução).' : 'Devolução registrada pela gestão: falta o condutor dizer se abasteceu.' });
      out.pedido = { id: p.ID, prazo: p.PRAZO };
      out.mensagens.push(plano.resposta === 'SIM' ? 'Lance o abastecimento até ' + FrotaR_textoMs_(FrotaAb_prazoMs_(p)) + ' em Frota > Abastecimentos e despesas > Comprovantes pedidos a você. Depois disso, a sua próxima retirada fica travada até lançar.'
        : 'Ficou um pedido para ' + FrotaAb_s_(condutor.NOME) + ' dizer se abasteceu (prazo de 1 dia útil).');
    }
    SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movId, upd);
    out.detector = FrotaAb_detector_(sessionId, sessao, veiculo, mov, condutor, kmChegada, plano);
    if (out.detector && out.detector.pedidoId) out.mensagens.push(out.detector.mensagem);
  } catch (e) { console.error('Frota, abastecimento na devolução: ' + ((e && e.message) || e)); }
  out.mensagem = out.mensagens.join(' ');
  return out;
}

/** Detector: depois da devolução, KM desde o último abastecimento acima do limite gera a pendência para quem devolveu. */
function FrotaAb_detector_(sessionId, sessao, veiculo, mov, condutor, kmChegada, plano) {
  var cfg = FrotaAb_cfg_();
  if (!cfg.ligado) return null;
  if (plano && plano.resposta === 'SIM') return null; // lançou agora ou já tem o pedido da devolução
  var s = FrotaAb_situacaoVeiculo_(veiculo, kmChegada, Frota_num_(mov.KM_SAIDA, kmChegada), cfg);
  if (!s.passou) return { passou: false, kmDesde: s.kmDesde, limite: s.limite };
  var jaTem = FrotaAb_pedidos_().filter(function (p) { return FrotaAb_up_(p.SITUACAO) === 'PENDENTE' && FrotaAb_up_(p.TIPO_PEDIDO) === 'DETECTOR' && FrotaAb_s_(p.VEICULO_ID) === s.veiculoId && FrotaAb_s_(p.CONDUTOR_ID) === FrotaAb_s_(condutor.ID); })[0];
  if (jaTem) return { passou: true, pedidoId: FrotaAb_s_(jaTem.ID), jaExistia: true, mensagem: 'Continua pendente o abastecimento do veículo ' + s.placa + ' (pedido anterior).' };
  var texto = 'O veículo ' + s.placa + ' rodou ' + Frota_kmTexto_(s.kmDesde) + ' km desde o ' + s.origemBase + ' (KM ' + Frota_kmTexto_(s.base) + ' até ' + Frota_kmTexto_(s.kmAtual) + '), acima do limite de ' + Frota_kmTexto_(s.limite) + ' km (' + s.origemLimite + '), e nenhum abastecimento foi lançado. ' +
    (plano && plano.resposta === 'NAO' ? 'Na devolução, a resposta foi "não abasteci". ' : '');
  var p = FrotaAb_criarPedido_(sessionId, sessao, { tipo: 'DETECTOR', veiculo: veiculo, condutor: condutor, movimentacaoId: FrotaAb_s_(mov.ID), dataRef: '',
    kmBase: s.base, kmRodado: s.kmDesde, limiteKm: s.limite, tituloAtividade: 'Abastecimento não lançado: veículo ' + s.placa,
    descricao: texto + 'Enquanto isto estiver pendente, a sua próxima retirada de veículo fica travada.', motivo: texto });
  return { passou: true, pedidoId: p.ID, kmDesde: s.kmDesde, limite: s.limite,
    mensagem: 'Abastecimento não lançado: ' + texto + 'A sua próxima retirada fica travada até você enviar o comprovante ou tocar em "Não abasteci" e escrever o motivo (Frota > Abastecimentos e despesas > Comprovantes pedidos a você).' };
}

// ------------------------------------------------------------
// RETIRADA: TRAVA DA PENDÊNCIA DE ABASTECIMENTO
// ------------------------------------------------------------
function FrotaAb_pendenciasQueTravam_(condutorId) {
  var agora = Date.now();
  return FrotaAb_pedidos_().filter(function (p) { return FrotaAb_s_(p.CONDUTOR_ID) === FrotaAb_s_(condutorId) && FrotaAb_pedidoTrava_(p, agora); });
}

/** Chamado por Frota_apiIniciarViagem antes de qualquer gravação. Recusa com o quê, por quê e o que fazer. */
function FrotaAb_conferirRetirada_(condutor, gestao) {
  if (!FrotaAb_cfg_().ligado) return;
  var lista = FrotaAb_pendenciasQueTravam_(condutor.ID);
  if (!lista.length) return;
  var itens = lista.slice(0, 3).map(function (p) {
    return 'veículo ' + FrotaAb_s_(p.PLACA) + (FrotaAb_up_(p.TIPO_PEDIDO) === 'DETECTOR' ? ' (rodou ' + Frota_kmTexto_(Frota_num_(p.KM_RODADO, 0)) + ' km sem abastecimento lançado)' : ' (abastecimento da devolução não lançado no prazo de ' + FrotaAb_s_(p.PRAZO) + ')');
  }).join('; ');
  var quem = FrotaAb_s_(condutor.NOME);
  throw new Error('Retirada travada: ' + (gestao ? quem + ' tem' : 'você tem') + ' abastecimento pendente de lançamento: ' + itens + '. ' +
    'Por quê: todo abastecimento da frota precisa estar lançado com o comprovante, para conferir o consumo e o custo. ' +
    'O que fazer: em Frota > Abastecimentos e despesas > "Comprovantes pedidos a você", toque em "Enviar comprovante" (se abasteceu) ou em "Não abasteci" e escreva o motivo; a retirada fica livre na hora. ' +
    (gestao ? 'Como gestão, você também pode liberar em Frota > Abastecimentos e despesas > Obrigatoriedade do abastecimento > Liberar (com o motivo). ' : 'Se precisar sair agora, peça à gestão para liberar. ') +
    'Depois, toque em Confirmar retirada de novo.');
}

// ------------------------------------------------------------
// CONDUTOR: "NÃO ABASTECI" (JUSTIFICATIVA)
// ------------------------------------------------------------
function Frota_apiAbastJustificar(sessionId, payload) {
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_bootstrap_(); FrotaAb_garantirAbas_();
  payload = payload || {};
  var p = SGO_DATA.getById(FROTAR_ABA_PEDIDOS, FrotaAb_s_(payload.pedidoId));
  if (!p) throw new Error('Pedido não encontrado. Atualize a tela.');
  var gestao = Frota_ehGestao_(sessionId);
  if (FrotaAb_s_(p.USUARIO_ID) !== FrotaAb_s_(sessao.userId) && !gestao) throw new Error('Este pedido é de ' + FrotaAb_s_(p.CONDUTOR_NOME) + '. Só ele (ou a gestão) responde.');
  if (FrotaAb_up_(p.SITUACAO) !== 'PENDENTE') return { ok: true, jaRespondido: true, mensagem: 'Este pedido já foi respondido. Nada foi gravado em dobro.' };
  var j = Frota_exigirJustificativa_(payload.justificativa, ['"Não abasteci" precisa do motivo, que a gestão vai conferir'], 'o carro saiu com o tanque cheio e voltou com meio tanque; não precisei abastecer');
  SGO_DATA.update(FROTAR_ABA_PEDIDOS, p.ID, { SITUACAO: 'JUSTIFICADO', JUSTIFICATIVA: j, JUSTIFICADO_EM: SGO_UTILS.nowIso() });
  if (FrotaAb_s_(p.ATIVIDADE_ID) && typeof Atividades_apiMudarSituacao === 'function') {
    try { Atividades_apiMudarSituacao(sessionId, { id: p.ATIVIDADE_ID, situacao: 'Concluída', observacao: 'Respondido na Frota: não abasteci. Motivo: ' + j }); } catch (e) {}
  }
  // O KM desta retirada deixa de contar para o próximo condutor (a justificativa é conferida pela gestão).
  var mov = FrotaAb_s_(p.MOVIMENTACAO_ID) ? SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, p.MOVIMENTACAO_ID) : null;
  if (mov && FrotaAb_up_(p.TIPO_PEDIDO) === 'DETECTOR') FrotaAb_gravarBase_(p.VEICULO_ID, Frota_num_(mov.KM_CHEGADA, 0), 'justificativa de ' + FrotaAb_s_(p.CONDUTOR_NOME) + ' a conferir');
  Frota_auditar_(sessao, { acao: 'ABASTECIMENTO_JUSTIFICADO', veiculoId: FrotaAb_s_(p.VEICULO_ID), placa: FrotaAb_s_(p.PLACA), movimentacaoId: FrotaAb_s_(p.MOVIMENTACAO_ID), condutorId: FrotaAb_s_(p.CONDUTOR_ID), condutorNome: FrotaAb_s_(p.CONDUTOR_NOME),
    justificativa: j, detalhe: '"Não abasteci" respondido para o pedido de abastecimento do veículo ' + FrotaAb_s_(p.PLACA) + '. A gestão confere.' });
  return { ok: true, mensagem: 'Resposta gravada. A sua próxima retirada está livre; a gestão vai conferir o motivo com a foto do painel da devolução.' };
}

// ------------------------------------------------------------
// GESTÃO: PAINEL, LIBERAR, CONFERIR JUSTIFICATIVA, CONFERIR LANÇAMENTO, CONFIGURAR
// ------------------------------------------------------------
function FrotaAb_exigirGestao_(sessionId) {
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  Frota_bootstrap_(); FrotaAb_garantirAbas_();
  return sessao;
}

function FrotaAb_pedidoParaTela_(p) {
  var prazo = FrotaAb_prazoMs_(p);
  return { id: FrotaAb_s_(p.ID), veiculoId: FrotaAb_s_(p.VEICULO_ID), placa: FrotaAb_s_(p.PLACA), condutor: FrotaAb_s_(p.CONDUTOR_NOME), condutorId: FrotaAb_s_(p.CONDUTOR_ID),
    tipo: FrotaAb_up_(p.TIPO_PEDIDO) || 'GESTAO', situacao: FrotaAb_up_(p.SITUACAO), motivo: FrotaAb_s_(p.MOTIVO), prazo: prazo ? FrotaR_textoMs_(prazo) : FrotaAb_s_(p.PRAZO),
    atrasado: FrotaAb_atrasado_(p), trava: FrotaAb_pedidoTrava_(p), kmRodado: Frota_num_(p.KM_RODADO, null), limiteKm: Frota_num_(p.LIMITE_KM, null),
    justificativa: FrotaAb_s_(p.JUSTIFICATIVA), justificadoEm: FrotaAb_s_(p.JUSTIFICADO_EM) ? FrotaR_textoMs_(new Date(p.JUSTIFICADO_EM).getTime()) : '',
    decisao: FrotaAb_up_(p.JUSTIFICATIVA_DECISAO), movimentacaoId: FrotaAb_s_(p.MOVIMENTACAO_ID), pedidoEm: FrotaAb_s_(p.PEDIDO_EM) ? FrotaR_textoMs_(new Date(p.PEDIDO_EM).getTime()) : '' };
}

function FrotaAb_abastParaTela_(a, veiculos, condutores) {
  var v = veiculos[FrotaAb_s_(a.VEICULO_ID)] || {}, c = condutores[FrotaAb_s_(a.CONDUTOR_ID)] || {};
  var l = Frota_numLitros_(a.LITROS, 0), val = Frota_num_(a.VALOR, 0);
  return { id: FrotaAb_s_(a.ID), veiculoId: FrotaAb_s_(a.VEICULO_ID), placa: FrotaAb_s_(v.PLACA), data: Frota_textoData_(a.DATA), hora: Frota_textoHora_(a.HORA), km: Frota_num_(a.KM, null), litros: l, valor: val,
    precoLitro: l > 0 && val > 0 ? Math.round(val / l * 1000) / 1000 : null, tipoCombustivel: FrotaAb_s_(a.TIPO_COMBUSTIVEL), posto: FrotaAb_s_(a.POSTO), condutorId: FrotaAb_s_(a.CONDUTOR_ID), condutor: FrotaAb_s_(c.NOME),
    origem: FrotaAb_up_(a.ORIGEM) || 'GESTAO', situacao: FrotaAb_up_(a.SITUACAO_CONFERENCIA) || 'PENDENTE', apontamentos: FrotaAb_json_(a.APONTAMENTOS, []), comprovante: FrotaAb_s_(a.COMPROVANTE_LINK),
    painel: FrotaAb_json_(a.FOTOS_PAINEL_JSON, []), tanqueCheio: FrotaAb_up_(a.TANQUE_CHEIO), corrigidoEm: FrotaAb_s_(a.CORRIGIDO_EM), corrigidoPor: FrotaAb_s_(a.CORRIGIDO_POR) };
}

function Frota_apiAbastPainel(sessionId, payload) {
  FrotaAb_exigirGestao_(sessionId);
  payload = payload || {};
  var cfg = FrotaAb_cfg_();
  var veiculosL = Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).filter(function (v) { return FrotaAb_up_(v.STATUS) !== 'INATIVO'; })
    .sort(function (a, b) { return FrotaAb_s_(a.PLACA).localeCompare(FrotaAb_s_(b.PLACA)); });
  var veiculos = {}, condutores = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function (v) { veiculos[FrotaAb_s_(v.ID)] = v; });
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { condutores[FrotaAb_s_(c.ID)] = c; });
  var situacao = veiculosL.map(function (v) { var s = FrotaAb_situacaoVeiculo_(v, null, false, cfg); s.modelo = FrotaAb_s_(v.MODELO); return s; });
  var pedidos = FrotaAb_pedidos_().filter(function (p) { return ['DETECTOR', 'DEVOLUCAO'].indexOf(FrotaAb_up_(p.TIPO_PEDIDO)) >= 0; }).map(FrotaAb_pedidoParaTela_);
  var abertos = pedidos.filter(function (p) { return p.situacao === 'PENDENTE'; });
  var justificar = pedidos.filter(function (p) { return p.situacao === 'JUSTIFICADO' && !p.decisao; });
  var dias = Math.max(7, Math.min(400, parseInt(payload.dias, 10) || 90));
  var desde = Date.now() - dias * 86400000;
  var lanc = FrotaAb_abastValidos_(null).filter(function (a) { var ms = FrotaAb_msAbast_(a); return ms === null || ms >= desde; })
    .map(function (a) { return FrotaAb_abastParaTela_(a, veiculos, condutores); })
    .sort(function (a, b) { return String(b.data.split('/').reverse().join('')).localeCompare(String(a.data.split('/').reverse().join(''))); });
  return { ok: true, cfg: cfg, veiculos: situacao, pendencias: abertos, justificativas: justificar, aConferir: lanc.filter(function (a) { return a.situacao === 'A_CONFERIR' || a.situacao === 'DIVERGENTE'; }),
    lancamentos: lanc, condutores: Object.keys(condutores).map(function (k) { return { id: k, nome: FrotaAb_s_(condutores[k].NOME) }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome); }),
    tiposCombustivel: typeof FROTA_CFG !== 'undefined' ? FROTA_CFG.TIPOS_COMBUSTIVEL : [], situacoes: FROTAAB_SITUACAO };
}

function Frota_apiAbastLiberar(sessionId, payload) {
  var sessao = FrotaAb_exigirGestao_(sessionId);
  payload = payload || {};
  var p = SGO_DATA.getById(FROTAR_ABA_PEDIDOS, FrotaAb_s_(payload.pedidoId));
  if (!p || FrotaAb_up_(p.SITUACAO) !== 'PENDENTE') throw new Error('Esta pendência já foi resolvida ou liberada. Atualize a tela.');
  var m = Frota_exigirJustificativa_(payload.motivo, ['liberar a pendência de abastecimento sem o comprovante'], 'comprovante entregue em papel ao financeiro; lançado pela gestão');
  SGO_DATA.update(FROTAR_ABA_PEDIDOS, p.ID, { SITUACAO: 'LIBERADO', LIBERADO_EM: SGO_UTILS.nowIso(), LIBERADO_POR: FrotaAb_nome_(sessao), LIBERADO_MOTIVO: m });
  if (FrotaAb_s_(p.ATIVIDADE_ID) && typeof Atividades_apiMudarSituacao === 'function') {
    try { Atividades_apiMudarSituacao(sessionId, { id: p.ATIVIDADE_ID, situacao: 'Cancelada', motivo: 'Liberado pela gestão: ' + m }); } catch (e) {}
  }
  Frota_auditar_(sessao, { acao: 'ABASTECIMENTO_LIBERADO', veiculoId: FrotaAb_s_(p.VEICULO_ID), placa: FrotaAb_s_(p.PLACA), condutorId: FrotaAb_s_(p.CONDUTOR_ID), condutorNome: FrotaAb_s_(p.CONDUTOR_NOME), justificativa: m, detalhe: 'Pendência de abastecimento liberada pela gestão.' });
  return { ok: true, mensagem: 'Pendência liberada: a próxima retirada de ' + FrotaAb_s_(p.CONDUTOR_NOME) + ' está livre. O motivo ficou na trilha.' };
}

/** Gestão confere o "Não abasteci": aceita (encerra) ou não aceita (volta a pendente e trava, com o motivo para o condutor). */
function Frota_apiAbastDecidirJustificativa(sessionId, payload) {
  var sessao = FrotaAb_exigirGestao_(sessionId);
  payload = payload || {};
  var p = SGO_DATA.getById(FROTAR_ABA_PEDIDOS, FrotaAb_s_(payload.pedidoId));
  if (!p || FrotaAb_up_(p.SITUACAO) !== 'JUSTIFICADO') throw new Error('Esta justificativa já foi conferida. Atualize a tela.');
  var aceita = FrotaAb_up_(payload.decisao) === 'ACEITA';
  var motivo = String(payload.motivo || '').replace(/\s+/g, ' ').trim();
  if (!aceita && motivo.length < 15) throw new Error('Para não aceitar, escreva o motivo (mínimo de 15 caracteres), por exemplo: "o painel da devolução mostra o tanque na reserva". O condutor recebe o motivo.');
  SGO_DATA.update(FROTAR_ABA_PEDIDOS, p.ID, aceita ? { JUSTIFICATIVA_DECISAO: 'ACEITA', JUSTIFICATIVA_DECIDIDA_EM: SGO_UTILS.nowIso(), JUSTIFICATIVA_DECIDIDA_POR: FrotaAb_nome_(sessao), JUSTIFICATIVA_MOTIVO: motivo.slice(0, 500) }
    : { SITUACAO: 'PENDENTE', JUSTIFICATIVA_DECISAO: 'NAO_ACEITA', JUSTIFICATIVA_DECIDIDA_EM: SGO_UTILS.nowIso(), JUSTIFICATIVA_DECIDIDA_POR: FrotaAb_nome_(sessao), JUSTIFICATIVA_MOTIVO: motivo.slice(0, 500),
        TIPO_PEDIDO: 'DETECTOR', BLOQUEIA_RETIRADA: 'SIM', MOTIVO: ('Justificativa não aceita pela gestão: ' + motivo + ' ' + FrotaAb_s_(p.MOTIVO)).slice(0, 500) });
  if (!aceita) {
    Frota_avisarCondutor_({ USUARIO_ID: p.USUARIO_ID }, sessao, 'Abastecimento do veículo ' + FrotaAb_s_(p.PLACA) + ': justificativa não aceita',
      'A gestão não aceitou o "Não abasteci" do veículo ' + FrotaAb_s_(p.PLACA) + '. Motivo: ' + motivo + '\n\nEnvie o comprovante em Frota > Abastecimentos e despesas > Comprovantes pedidos a você, ou fale com ' + FrotaAb_nome_(sessao) + '. Até lá, a sua próxima retirada fica travada.', p.ID, FROTAAB_EVENTO_CONDUTOR);
  }
  Frota_auditar_(sessao, { acao: aceita ? 'JUSTIFICATIVA_ACEITA' : 'JUSTIFICATIVA_NAO_ACEITA', veiculoId: FrotaAb_s_(p.VEICULO_ID), placa: FrotaAb_s_(p.PLACA), condutorId: FrotaAb_s_(p.CONDUTOR_ID), condutorNome: FrotaAb_s_(p.CONDUTOR_NOME),
    justificativa: motivo, detalhe: 'Conferência do "Não abasteci": ' + (aceita ? 'aceita' : 'não aceita') + '. Justificativa do condutor: ' + FrotaAb_s_(p.JUSTIFICATIVA) });
  return { ok: true, mensagem: aceita ? 'Justificativa aceita.' : 'Justificativa não aceita: o pedido voltou para ' + FrotaAb_s_(p.CONDUTOR_NOME) + ' (com o motivo) e a próxima retirada dele fica travada até enviar o comprovante ou a gestão liberar.' };
}

/** Gestão marca o lançamento como conferido ou divergente (com o motivo). */
function Frota_apiAbastConferir(sessionId, payload) {
  var sessao = FrotaAb_exigirGestao_(sessionId);
  payload = payload || {};
  var sit = FrotaAb_up_(payload.situacao);
  if (['CONFERIDO', 'DIVERGENTE'].indexOf(sit) < 0) throw new Error('Escolha "Conferido" ou "Divergente".');
  var ids = (Array.isArray(payload.ids) ? payload.ids : [payload.id]).map(FrotaAb_s_).filter(String).slice(0, 200);
  if (!ids.length) throw new Error('Escolha o lançamento a conferir.');
  // 30/10/2026 (leva 2): a marcação é a mesma da conferência de gastos (SGO_Frota_Gastos.js), para abastecimento, despesa e manutenção.
  var n = FrotaGas_marcar_(sessao, ids.map(function (id) { return { origem: 'ABASTECIMENTO', id: id }; }), sit, payload.motivo).marcados;
  return { ok: true, mensagem: n + (n === 1 ? ' lançamento marcado' : ' lançamentos marcados') + ' como ' + (sit === 'CONFERIDO' ? 'conferido' : 'divergente') + '.' };
}

function Frota_apiAbastConfig(sessionId, payload) {
  var sessao = FrotaAb_exigirGestao_(sessionId);
  payload = payload || {};
  var props = PropertiesService.getScriptProperties();
  var antes = FrotaAb_cfg_();
  var num = function (v) { return Number(String(v === undefined || v === null ? '' : v).replace(',', '.')); };
  var f = num(payload.fracaoAutonomiaPct) / 100, k = num(payload.kmLPadrao), l = num(payload.limiteKmSemTanque);
  if (!(f >= 0.3 && f <= 1)) throw new Error('A fração da autonomia vai de 30% a 100% (padrão 75%). Corrija e grave de novo.');
  if (!(k >= 3 && k <= 25)) throw new Error('O consumo padrão vai de 3 a 25 km/L (padrão 9). Corrija e grave de novo.');
  if (!(l >= 100 && l <= 1500)) throw new Error('O limite sem tanque cadastrado vai de 100 a 1.500 km (padrão 350). Corrija e grave de novo.');
  props.setProperty('FROTA_ABAST_FRACAO_AUTONOMIA', String(f)); props.setProperty('FROTA_ABAST_KML_PADRAO', String(k)); props.setProperty('FROTA_ABAST_LIMITE_KM_PADRAO', String(l));
  props.setProperty('FROTA_ABAST_OBRIGATORIO', payload.ligado === false ? '0' : '1');
  Frota_auditar_(sessao, { acao: 'ABASTECIMENTO_CONFIG', campo: 'CONFIG', antes: JSON.stringify(antes), depois: JSON.stringify(FrotaAb_cfg_()), detalhe: 'Configuração da obrigatoriedade do abastecimento alterada.' });
  return { ok: true, mensagem: 'Configuração gravada.', cfg: FrotaAb_cfg_() };
}

// ------------------------------------------------------------
// CORREÇÃO CAMPO A CAMPO (só a gestão): abastecimento e retirada
// ------------------------------------------------------------
var FROTAAB_CAMPOS_CORRECAO = [
  { k: 'litros', col: 'LITROS', rot: 'Litros' }, { k: 'valor', col: 'VALOR', rot: 'Valor' }, { k: 'km', col: 'KM', rot: 'KM' }, { k: 'data', col: 'DATA', rot: 'Data' },
  { k: 'hora', col: 'HORA', rot: 'Hora' }, { k: 'tipoCombustivel', col: 'TIPO_COMBUSTIVEL', rot: 'Combustível' }, { k: 'posto', col: 'POSTO', rot: 'Posto' },
  { k: 'condutorId', col: 'CONDUTOR_ID', rot: 'Condutor' }, { k: 'tanqueCheio', col: 'TANQUE_CHEIO', rot: 'Tanque completado' }];

/**
 * Corrige o abastecimento: só os campos que mudaram são gravados (o resto da linha, o comprovante e a origem ficam como
 * estão); cada campo vai para a trilha com antes, depois, quem e quando, com a justificativa. A conferência roda de novo.
 * payload: { id, campos: { litros?, valor?, km?, data?, hora?, tipoCombustivel?, posto?, condutorId?, tanqueCheio? }, justificativa }.
 */
function FrotaAb_corrigir_(sessao, payload, o) {
  o = o || {};
  var a = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, FrotaAb_s_(payload.id));
  if (!a || FrotaAb_s_(a.EXCLUIDO_EM)) throw new Error('Abastecimento não encontrado (ou excluído). Atualize a tela.');
  var veiculo = FrotaAb_veiculoDoPayload_({ veiculoId: a.VEICULO_ID });
  var campos = payload.campos || {};
  var atual = { litros: Frota_numLitros_(a.LITROS, NaN), valor: Frota_num_(a.VALOR, NaN), km: Frota_num_(a.KM, NaN), data: Frota_textoData_(a.DATA), hora: Frota_textoHora_(a.HORA),
    tipoCombustivel: FrotaAb_s_(a.TIPO_COMBUSTIVEL), posto: FrotaAb_s_(a.POSTO), condutorId: FrotaAb_s_(a.CONDUTOR_ID), tanqueCheio: FrotaAb_up_(a.TANQUE_CHEIO) };
  var novo = Object.assign({}, atual), mudou = [];
  FROTAAB_CAMPOS_CORRECAO.forEach(function (c) {
    if (!(c.k in campos) || campos[c.k] === undefined || campos[c.k] === null) return;
    var bruto = campos[c.k], v;
    if (c.k === 'litros') v = Frota_numLitros_(bruto, NaN);
    else if (c.k === 'valor' || c.k === 'km') v = Frota_num_(bruto, NaN);
    else if (c.k === 'tanqueCheio') { var t = FrotaAb_up_(bruto); v = t === 'SIM' ? 'SIM' : (t === 'NAO' ? 'NAO' : ''); }
    else v = FrotaAb_s_(bruto);
    if (c.k === 'data' && !/^\d{2}\/\d{2}\/\d{4}$/.test(v)) throw new Error('Data inválida (' + v + '). Use dd/mm/aaaa.');
    if (c.k === 'hora' && v && !/^\d{1,2}:\d{2}$/.test(v)) throw new Error('Hora inválida (' + v + '). Use hh:mm ou deixe vazio.');
    if ((c.k === 'litros' || c.k === 'valor' || c.k === 'km') && !isFinite(v)) throw new Error(c.rot + ' inválido (' + bruto + '). Use só números (litros e valor com vírgula: 35,591 e 125,99).');
    var igual = typeof v === 'number' ? Math.abs(v - atual[c.k]) < 1e-9 : String(v) === String(atual[c.k]);
    if (igual) return;
    novo[c.k] = v;
    mudou.push(c);
  });
  if (!mudou.length) throw new Error('Nenhum campo mudou: altere o valor que está errado e grave de novo. Nada foi gravado.');
  var just = Frota_exigirJustificativa_(payload.justificativa, ['correção de abastecimento (campos: ' + mudou.map(function (c) { return c.rot.toLowerCase(); }).join(', ') + ')'], 'conferido com o comprovante: a nota mostra 35,591 L');
  var an = FrotaAb_analisar_(veiculo, novo, { ignorarId: a.ID, gestao: true });
  if (an.erros.length) throw new Error('A correção não passa na conferência: ' + FrotaAb_textoErros_(an.erros) + ' Nada foi gravado.');
  var upd = {};
  mudou.forEach(function (c) { upd[c.col] = novo[c.k]; });
  upd.CORRIGIDO_EM = SGO_UTILS.nowIso(); upd.CORRIGIDO_POR = FrotaAb_nome_(sessao);
  upd.SITUACAO_CONFERENCIA = an.apontamentos.length ? 'A_CONFERIR' : 'CORRIGIDO';
  upd.APONTAMENTOS = an.apontamentos.length ? JSON.stringify(an.apontamentos) : '';
  if (!o.simular) {
    SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, a.ID, upd);
    mudou.forEach(function (c) {
      Frota_auditar_(sessao, { acao: 'ABASTECIMENTO_CORRIGIDO', veiculoId: FrotaAb_s_(a.VEICULO_ID), placa: FrotaAb_s_(veiculo.PLACA), condutorId: FrotaAb_s_(a.CONDUTOR_ID), campo: c.col,
        antes: atual[c.k], depois: novo[c.k], justificativa: just, detalhe: 'Abastecimento ' + FrotaAb_s_(a.ID) + ' de ' + atual.data + ': ' + c.rot + ' corrigido. O comprovante continua o mesmo.' });
    });
  }
  return { ok: true, id: FrotaAb_s_(a.ID), campos: mudou.map(function (c) { return { campo: c.col, rotulo: c.rot, antes: atual[c.k], depois: novo[c.k] }; }), resumo: an.resumo, apontamentos: an.apontamentos,
    mensagem: 'Abastecimento corrigido (' + mudou.map(function (c) { return c.rot; }).join(', ') + '): ' + an.resumo + (an.apontamentos.length ? ' Continua "a conferir": ' + an.apontamentos.map(function (x) { return x.texto; }).join(' ') : '') + ' O valor anterior ficou na trilha.' };
}

function Frota_apiAbastCorrigir(sessionId, payload) {
  var sessao = FrotaAb_exigirGestao_(sessionId);
  return FrotaAb_corrigir_(sessao, payload || {});
}

var FROTAAB_CAMPOS_RETIRADA = [
  { k: 'dataSaida', col: 'DATA_SAIDA', rot: 'Data de saída', tipo: 'data' }, { k: 'horaSaida', col: 'HORA_SAIDA', rot: 'Hora de saída', tipo: 'hora' }, { k: 'kmSaida', col: 'KM_SAIDA', rot: 'KM de saída', tipo: 'km' },
  { k: 'dataChegada', col: 'DATA_CHEGADA', rot: 'Data de chegada', tipo: 'data' }, { k: 'horaChegada', col: 'HORA_CHEGADA', rot: 'Hora de chegada', tipo: 'hora' }, { k: 'kmChegada', col: 'KM_CHEGADA', rot: 'KM de chegada', tipo: 'km' }];

/** Corrige data, hora e KM de uma retirada já devolvida. Só os campos alterados; trilha campo a campo. Não muda o KM do veículo (Ajustar KM). */
function FrotaAb_corrigirRetirada_(sessao, payload, o) {
  o = o || {};
  var m = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, FrotaAb_s_(payload.id));
  if (!m) throw new Error('Retirada não encontrada. Atualize a tela.');
  if (FrotaAb_up_(m.STATUS) !== 'FINALIZADO') throw new Error('Só se corrige retirada já devolvida. Esta ainda está em andamento: registre a devolução primeiro.');
  var campos = payload.campos || {};
  var atual = { dataSaida: Frota_textoData_(m.DATA_SAIDA), horaSaida: Frota_textoHora_(m.HORA_SAIDA), kmSaida: Frota_num_(m.KM_SAIDA, NaN), dataChegada: Frota_textoData_(m.DATA_CHEGADA), horaChegada: Frota_textoHora_(m.HORA_CHEGADA), kmChegada: Frota_num_(m.KM_CHEGADA, NaN) };
  // Data gravada como data da planilha antiga com dia e mês trocados: o texto mostrado é o que a tela vê.
  var novo = Object.assign({}, atual), mudou = [];
  FROTAAB_CAMPOS_RETIRADA.forEach(function (c) {
    if (!(c.k in campos) || campos[c.k] === undefined || campos[c.k] === null || FrotaAb_s_(campos[c.k]) === '') return;
    var v = c.tipo === 'km' ? Frota_num_(campos[c.k], NaN) : FrotaAb_s_(campos[c.k]);
    if (c.tipo === 'data' && !/^\d{2}\/\d{2}\/\d{4}$/.test(v)) throw new Error(c.rot + ' inválida (' + v + '). Use dd/mm/aaaa.');
    if (c.tipo === 'hora' && !/^\d{2}:\d{2}$/.test(v)) throw new Error(c.rot + ' inválida (' + v + '). Use hh:mm.');
    if (c.tipo === 'km' && !(v >= 0)) throw new Error(c.rot + ' inválido. Use só números.');
    var bruto = m[c.col];
    var cru = bruto !== null && typeof bruto === 'object'; // Date da planilha antiga: grava o texto mesmo que pareça igual
    if (!cru && (typeof v === 'number' ? v === atual[c.k] : v === atual[c.k])) return;
    novo[c.k] = v; mudou.push(c);
  });
  if (!mudou.length) throw new Error('Nenhum campo mudou: altere o valor que está errado e grave de novo. Nada foi gravado.');
  var ini = Frota_parseDataHora_(novo.dataSaida, novo.horaSaida || '00:00'), fim = Frota_parseDataHora_(novo.dataChegada, novo.horaChegada || '23:59');
  if (ini && fim && fim.getTime() < ini.getTime()) throw new Error('A chegada (' + novo.dataChegada + ' ' + novo.horaChegada + ') ficaria antes da saída (' + novo.dataSaida + ' ' + novo.horaSaida + '). Confira as datas. Nada foi gravado.');
  if (isFinite(novo.kmSaida) && isFinite(novo.kmChegada) && novo.kmChegada < novo.kmSaida) throw new Error('O KM de chegada (' + Frota_kmTexto_(novo.kmChegada) + ') ficaria menor que o de saída (' + Frota_kmTexto_(novo.kmSaida) + '). Confira os números. Nada foi gravado.');
  var just = o.justificativa || Frota_exigirJustificativa_(payload.justificativa, ['correção de retirada (campos: ' + mudou.map(function (c) { return c.rot.toLowerCase(); }).join(', ') + ')'], 'data gravada com dia e mês trocados pela planilha antiga');
  var upd = { CORRIGIDO_EM: SGO_UTILS.nowIso(), CORRIGIDO_POR: FrotaAb_nome_(sessao) };
  mudou.forEach(function (c) { upd[c.col] = novo[c.k]; });
  if (!o.simular) {
    SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, m.ID, upd);
    mudou.forEach(function (c) {
      Frota_auditar_(sessao, { acao: 'RETIRADA_CORRIGIDA', veiculoId: FrotaAb_s_(m.VEICULO_ID), movimentacaoId: FrotaAb_s_(m.ID), condutorId: FrotaAb_s_(m.CONDUTOR_ID), campo: c.col,
        antes: atual[c.k], depois: novo[c.k], justificativa: just, detalhe: 'Retirada ' + FrotaAb_s_(m.ID) + ': ' + c.rot + ' corrigido. O KM do veículo não muda (use Ajustar KM).' });
    });
  }
  return { ok: true, id: FrotaAb_s_(m.ID), campos: mudou.map(function (c) { return { campo: c.col, rotulo: c.rot, antes: atual[c.k], depois: novo[c.k] }; }),
    mensagem: 'Retirada corrigida (' + mudou.map(function (c) { return c.rot; }).join(', ') + '). O valor anterior ficou na trilha.' };
}

function Frota_apiRetiradaCorrigir(sessionId, payload) {
  var sessao = FrotaAb_exigirGestao_(sessionId);
  return FrotaAb_corrigirRetirada_(sessao, payload || {});
}

/** Retiradas devolvidas de um veículo, para a correção (gestão). */
function Frota_apiRetiradasParaCorrigir(sessionId, payload) {
  FrotaAb_exigirGestao_(sessionId);
  payload = payload || {};
  var vid = FrotaAb_s_(payload.veiculoId);
  if (!vid) throw new Error('Escolha o veículo.');
  var cond = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { cond[FrotaAb_s_(c.ID)] = FrotaAb_s_(c.NOME); });
  var itens = FrotaAb_movsVeiculo_(vid).filter(function (m) { return FrotaAb_up_(m.STATUS) === 'FINALIZADO'; }).map(function (m) {
    var cru = (m.DATA_SAIDA !== null && typeof m.DATA_SAIDA === 'object') || (m.DATA_CHEGADA !== null && typeof m.DATA_CHEGADA === 'object');
    return { id: FrotaAb_s_(m.ID), condutor: cond[FrotaAb_s_(m.CONDUTOR_ID)] || '', dataSaida: Frota_textoData_(m.DATA_SAIDA), horaSaida: Frota_textoHora_(m.HORA_SAIDA), kmSaida: Frota_num_(m.KM_SAIDA, null),
      dataChegada: Frota_textoData_(m.DATA_CHEGADA), horaChegada: Frota_textoHora_(m.HORA_CHEGADA), kmChegada: Frota_num_(m.KM_CHEGADA, null), dataDaPlanilha: cru, criadoEm: FrotaAb_s_(m.CRIADO_EM) };
  }).sort(function (a, b) { return b.criadoEm.localeCompare(a.criadoEm); }).slice(0, 80);
  return { ok: true, itens: itens };
}

// ------------------------------------------------------------
// ROTINA: AVISO DO COMPROVANTE PENDENTE HÁ MAIS DE 1 DIA ÚTIL
// ------------------------------------------------------------
/** Chamada pela rotina da Frota (a cada 2 minutos); trabalha no máximo a cada 15 minutos. */
function FrotaAb_rodada_(forcar) {
  var props = PropertiesService.getScriptProperties();
  var ult = Number(props.getProperty('FROTA_ABAST_RODADA_EM') || 0);
  if (!forcar && Date.now() - ult < 15 * 60000) return { pulou: true };
  props.setProperty('FROTA_ABAST_RODADA_EM', String(Date.now()));
  var n = 0, agora = Date.now();
  FrotaAb_pedidos_().forEach(function (p) {
    if (FrotaAb_up_(p.SITUACAO) !== 'PENDENTE' || FrotaAb_s_(p.AVISO_ATRASO_EM) || !FrotaAb_atrasado_(p, agora)) return;
    var auto = ['DETECTOR', 'DEVOLUCAO'].indexOf(FrotaAb_up_(p.TIPO_PEDIDO)) >= 0;
    var titulo = 'Abastecimento do veículo ' + FrotaAb_s_(p.PLACA) + ' sem comprovante há mais de 1 dia útil';
    var uid = FrotaAb_s_(p.USUARIO_ID);
    if (uid && typeof SGO_notificar_ === 'function') {
      try {
        SGO_notificar_({ usuarios: [uid], titulo: titulo, canais: ['sgo', 'email', 'whatsapp'], origem: 'FROTA', refId: FrotaAb_s_(p.ID), evento: FROTAAB_EVENTO_CONDUTOR,
          texto: 'O prazo para lançar o abastecimento do veículo ' + FrotaAb_s_(p.PLACA) + ' passou (' + FrotaAb_s_(p.PRAZO) + ').\n' + FrotaAb_s_(p.MOTIVO) + '\n\nComo resolver: Frota > Abastecimentos e despesas > Comprovantes pedidos a você: "Enviar comprovante" ou "Não abasteci" (com o motivo).' +
            (auto ? ' Enquanto estiver pendente, a sua próxima retirada de veículo fica travada.' : '') });
      } catch (e) { console.error('Frota, aviso do comprovante: ' + ((e && e.message) || e)); }
    }
    try {
      var ids = typeof Rastreador_gestores_ === 'function' ? Rastreador_gestores_() : [];
      if (ids.length && typeof SGO_notificar_ === 'function') SGO_notificar_({ usuarios: ids, titulo: titulo + ': ' + FrotaAb_s_(p.CONDUTOR_NOME), canais: ['sgo', 'email'], origem: 'FROTA', refId: FrotaAb_s_(p.ID), evento: FROTAAB_EVENTO_GESTAO,
        texto: FrotaAb_s_(p.CONDUTOR_NOME) + ' não lançou o abastecimento do veículo ' + FrotaAb_s_(p.PLACA) + ' no prazo (' + FrotaAb_s_(p.PRAZO) + ').\n' + FrotaAb_s_(p.MOTIVO) + '\n\nConfira em Frota > Abastecimentos e despesas > Obrigatoriedade do abastecimento (fale com o condutor ou libere com o motivo).' });
    } catch (e2) { console.error('Frota, aviso à gestão: ' + ((e2 && e2.message) || e2)); }
    SGO_DATA.update(FROTAR_ABA_PEDIDOS, p.ID, { AVISO_ATRASO_EM: SGO_UTILS.nowIso() });
    n++;
  });
  return { avisos: n };
}

// ------------------------------------------------------------
// CENTRAL DE PENDÊNCIAS (chamado por Pend_fonteFrota_)
// ------------------------------------------------------------
function FrotaAb_pendencias_(add) {
  if (typeof Pend_item_ !== 'function' || typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.frota_abast_pendente) return;
  var agora = Date.now();
  FrotaAb_pedidos_().forEach(function (p) {
    var tipo = FrotaAb_up_(p.TIPO_PEDIDO);
    if (['DETECTOR', 'DEVOLUCAO'].indexOf(tipo) < 0) return;
    var sit = FrotaAb_up_(p.SITUACAO);
    var trava = FrotaAb_pedidoTrava_(p, agora);
    if (sit === 'PENDENTE') {
      add(Pend_item_('frota_abast_pendente', {
        id: 'FROTA:ABAST:' + FrotaAb_s_(p.ID), nome: FrotaAb_s_(p.PLACA), publico: 'GESTAO', paraUsuarios: [FrotaAb_s_(p.USUARIO_ID)], responsavel: FrotaAb_s_(p.CONDUTOR_NOME), responsavelId: FrotaAb_s_(p.USUARIO_ID),
        gravidade: trava ? 'CRITICO' : 'ATENCAO', dias: null, vencimento: FrotaAb_s_(p.PRAZO),
        titulo: (tipo === 'DETECTOR' ? 'Abastecimento não lançado: ' : 'Abastecimento a lançar: ') + FrotaAb_s_(p.CONDUTOR_NOME) + ' (veículo ' + FrotaAb_s_(p.PLACA) + ')',
        detalhe: FrotaAb_s_(p.MOTIVO) + (trava ? ' A próxima retirada do condutor está travada.' : ' Prazo: ' + FrotaAb_s_(p.PRAZO) + '.'),
        oQueFazer: 'Envie o comprovante ou toque em "Não abasteci" em Frota > Abastecimentos e despesas > Comprovantes pedidos a você.',
        oQueFazerOutro: 'Fale com ' + FrotaAb_s_(p.CONDUTOR_NOME) + ' ou libere com o motivo em Frota > Abastecimentos e despesas > Obrigatoriedade do abastecimento.',
        textoEstavel: 'Abastecimento do veículo ' + FrotaAb_s_(p.PLACA) + ' pendente de lançamento por ' + FrotaAb_s_(p.CONDUTOR_NOME) + '.'
      }));
    } else if (sit === 'JUSTIFICADO' && !FrotaAb_s_(p.JUSTIFICATIVA_DECISAO)) {
      add(Pend_item_('frota_abast_justificativa', {
        id: 'FROTA:ABASTJ:' + FrotaAb_s_(p.ID), nome: FrotaAb_s_(p.PLACA), publico: 'GESTAO', responsavel: 'Gestão da frota', gravidade: 'ATENCAO', dias: null,
        titulo: '"Não abasteci" a conferir: ' + FrotaAb_s_(p.CONDUTOR_NOME) + ' (veículo ' + FrotaAb_s_(p.PLACA) + ')',
        detalhe: 'Motivo do condutor: ' + FrotaAb_s_(p.JUSTIFICATIVA) + ' ' + FrotaAb_s_(p.MOTIVO),
        oQueFazer: 'Confira com a foto do painel da devolução e aceite ou não aceite em Frota > Abastecimentos e despesas > Obrigatoriedade do abastecimento.',
        textoEstavel: 'Justificativa de abastecimento não lançado do veículo ' + FrotaAb_s_(p.PLACA) + ' a conferir.'
      }));
    }
  });
  var aConf = FrotaAb_abastValidos_(null).filter(function (a) { return FrotaAb_up_(a.SITUACAO_CONFERENCIA) === 'A_CONFERIR'; });
  if (aConf.length) {
    add(Pend_item_('frota_abast_conferir', {
      id: 'FROTA:ABASTCONF', nome: aConf.length + (aConf.length === 1 ? ' lançamento' : ' lançamentos'), publico: 'GESTAO', responsavel: 'Gestão da frota', gravidade: 'ATENCAO', dias: null,
      titulo: aConf.length + (aConf.length === 1 ? ' abastecimento a conferir' : ' abastecimentos a conferir'),
      detalhe: 'A conferência na gravação apontou algo (preço por litro, KM ou litros em sequência). O consumo desses lançamentos fica de fora da média até a conferência.',
      oQueFazer: 'Confira com o comprovante em Frota > Abastecimentos e despesas > Obrigatoriedade do abastecimento > A conferir (corrija ou marque como conferido).',
      textoEstavel: 'Há abastecimentos a conferir na Frota.'
    }));
  }
}
