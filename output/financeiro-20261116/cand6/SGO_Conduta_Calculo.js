/****************************************************
 * PROGRAMA DE CONDUTA, PONTUAÇÃO E BONIFICAÇÃO — MOTOR DE CÁLCULO
 *
 * Motor puro, sem nenhuma dependência de Planilha/SGO_DATA — recebe
 * números já apurados (D, n, missões, flags) e devolve ICO, farol e a
 * apuração dos dois benefícios por colaborador. Tradução 1:1 do
 * pseudocódigo da especificação (ANX-CAT-001 Rev.00, seções 2/5/6).
 *
 * Regras centrais (não renegociáveis, ver briefing seção 2):
 *  - ICO = max(0, round(100 - (D/n) * K, 1)) — demérito per capita.
 *  - 1 infração GRAVÍSSIMA (GG) força farol VERMELHO, independente do
 *    ICO — é gatilho separado, não desconto (GG tem peso_ico = 0).
 *  - Incentivo de Missão NÃO depende do farol — só é zerado, por
 *    colaborador, se ELE MESMO tiver uma GG própria no mês.
 *  - Modo sombra: apura tudo, mas move os valores pra campo simulado
 *    (ninguém recebe de verdade).
 *
 * Validado por regressão (harness_conduta_calculo.js) contra os 20
 * cenários da seção 10 do briefing.
 ****************************************************/
var CondutaCalculo = (function () {

  var PESOS = Object.freeze({ L: 2, LR: 5, M: 8, MR: 15, G: 30, GG: 0 });

  function arred_(v, casas) {
    var f = Math.pow(10, casas || 0);
    return Math.round((v + Number.EPSILON) * f) / f;
  }

  function paraData_(d) {
    return (d instanceof Date) ? d : new Date(d);
  }

  function diasCorridosEntre_(dataA, dataB) {
    var a = paraData_(dataA);
    var b = paraData_(dataB);
    var ms = Math.abs(b.getTime() - a.getTime());
    return Math.round(ms / 86400000);
  }

  // ---------- ICO e farol (seção 2, regras 1-4; pseudocódigo seção 5) ----------

  function calcularICO(D, n, kSensibilidade) {
    if (!n || n <= 0) throw new Error('Divisor n inválido para cálculo do ICO (n=' + n + ').');
    var k = (kSensibilidade === undefined || kSensibilidade === null) ? 5.0 : Number(kSensibilidade);
    var bruto = 100 - (D / n) * k;
    return Math.max(0, arred_(bruto, 1));
  }

  function determinarFarol(ico, temGG, icoVerdeMin, icoAmareloMin) {
    var vMin = (icoVerdeMin === undefined || icoVerdeMin === null) ? 85.0 : Number(icoVerdeMin);
    var aMin = (icoAmareloMin === undefined || icoAmareloMin === null) ? 70.0 : Number(icoAmareloMin);
    if (temGG) return 'VERMELHO';
    if (ico < aMin) return 'VERMELHO';
    if (ico < vMin) return 'AMARELO';
    return 'VERDE';
  }

  // ---------- Reincidência (seção 2 regra 7; pseudocódigo seção 6) ----------
  // ultimaFirmeMesmoTipo: {id, dataFato} da última ocorrência FIRME do
  // mesmo código pro mesmo colaborador, ou null/undefined se não houver.
  // Ocorrências ANULADAS nunca chegam aqui como âncora (filtro é feito
  // por quem monta a chamada, antes de invocar esta função).
  function aplicarNivel(tipo, ultimaFirmeMesmoTipo, dataFato, janelaDias) {
    var janela = (janelaDias === undefined || janelaDias === null) ? 90 : Number(janelaDias);
    // CORREÇÃO 2026-09-24: o nível vinha CRU do catálogo (única leitura do
    // módulo sem safeUpper). Um tipo cadastrado na planilha com 'g' minúsculo,
    // 'Grave' ou o campo em branco produzia PESOS[...] === undefined, o peso
    // gravado ficava vazio e a ocorrência entrava FIRME contando ZERO no
    // demérito — e ainda deixava de disparar o gatilho de gravíssima. Erro
    // silencioso que vira bônus pago indevidamente. Agora falha explicitamente.
    var nivelNormalizado = String(tipo.nivel || '').trim().toUpperCase();
    if (PESOS[nivelNormalizado] === undefined) {
      throw new Error('Nível de ocorrência inválido no catálogo: "' + String(tipo.nivel || '(vazio)') +
        '". Os níveis aceitos são L, LR, M, MR, G e GG — corrija a coluna NIVEL na aba do catálogo.');
    }
    var base = { nivelAplicado: nivelNormalizado, pesoAplicado: PESOS[nivelNormalizado], reincidenciaDeId: null };

    if (!tipo.reincidivel || !ultimaFirmeMesmoTipo) return base;

    var dias = diasCorridosEntre_(ultimaFirmeMesmoTipo.dataFato, dataFato);
    if (dias > janela) return base;

    // 'L' vira 'LR'; os demais viram 'MR'. ATENÇÃO (registrado em 24/09): se um
    // dia um tipo G ou GG for marcado como reincidível no catálogo, esta regra
    // REDUZIRIA a punição (G=30 -> MR=15) e, no caso do GG, tiraria a
    // ocorrência do gatilho do farol — restaurando o bônus por reincidir. Hoje
    // nenhum G/GG é reincidível no seed, por isso não dispara; por segurança,
    // uma reincidência nunca rebaixa o peso.
    var nivelPromovido = (nivelNormalizado === 'L') ? 'LR' : 'MR';
    if (PESOS[nivelPromovido] < PESOS[nivelNormalizado] || nivelNormalizado === 'GG') return base;
    return {
      nivelAplicado: nivelPromovido,
      pesoAplicado: PESOS[nivelPromovido],
      reincidenciaDeId: ultimaFirmeMesmoTipo.id
    };
  }

  // ---------- Apuração por colaborador (pseudocódigo seção 5, corpo do for) ----------
  // params:
  //   farol                 'VERDE'|'AMARELO'|'VERMELHO' do mês
  //   desligado             bool — fora do quadro no fechamento
  //   ggPropria             bool — o próprio colaborador tem GG firme no mês
  //   qtdMissoesElegiveis   nº de missões qualificadas (km_trecho>=200) que
  //                         ele executou, já excluindo qualquer missão onde
  //                         haja ocorrência do próprio executante vinculada
  //                         (filtro é responsabilidade de quem chama)
  //   sombra                bool — competência ainda em modo sombra
  //   valorBonus/valorIncentivo  valores unitários (parâmetros do programa,
  //                         default 300.00 cada, mas nunca hardcoded aqui)
  function apurarColaborador(params) {
    var p = params || {};
    var valorBonusUnitario = (p.valorBonus === undefined || p.valorBonus === null) ? 300.0 : Number(p.valorBonus);
    var valorIncentivoUnitario = (p.valorIncentivo === undefined || p.valorIncentivo === null) ? 300.0 : Number(p.valorIncentivo);

    var recebeBonus = (p.farol === 'VERDE') && !p.desligado;
    var valorBonus = recebeBonus ? valorBonusUnitario : 0;

    var valorIncentivo = 0;
    if (!p.ggPropria) {
      valorIncentivo = (Number(p.qtdMissoesElegiveis) || 0) * valorIncentivoUnitario;
    }

    var resultado = {
      recebeBonus: recebeBonus,
      valorBonus: valorBonus,
      valorIncentivo: valorIncentivo,
      valorSimuladoBonus: 0,
      valorSimuladoIncentivo: 0
    };

    if (p.sombra) {
      resultado.valorSimuladoBonus = resultado.valorBonus;
      resultado.valorSimuladoIncentivo = resultado.valorIncentivo;
      resultado.valorBonus = 0;
      resultado.valorIncentivo = 0;
    }

    return resultado;
  }

  // ---------- Missão qualifica (seção 2 regra 13) ----------

  function missaoQualifica(kmTrecho, kmMinimo) {
    var minimo = (kmMinimo === undefined || kmMinimo === null) ? 200 : Number(kmMinimo);
    return Number(kmTrecho) >= minimo;
  }

  return {
    PESOS: PESOS,
    calcularICO: calcularICO,
    determinarFarol: determinarFarol,
    aplicarNivel: aplicarNivel,
    apurarColaborador: apurarColaborador,
    missaoQualifica: missaoQualifica,
    // expostos só pra teste/regressão (harness):
    _interno: {
      arred: arred_,
      diasCorridosEntre: diasCorridosEntre_
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CondutaCalculo;
