/****************************************************
 * ESTERILIZAÇÃO A BAIXA TEMPERATURA — MOTOR DETERMINÍSTICO
 *
 * Decide CONFORME / NÃO CONFORME. A IA nunca decide: ela só redige a partir
 * do resultado daqui (SGO_BaixaTemp_IA.js), e o texto é conferido contra ele.
 *
 *  BaixaTempMotor_analisarCiclo_(serie, ciclo, dados)  → resultado de um ciclo
 *  BaixaTempMotor_avaliarEnsaio_(dados, analises)       → travas, critérios e veredito do ensaio
 *  BaixaTempMotor_incertezas_(dados, intervaloS)        → incertezas expandidas (k = 2)
 *
 * Toda trava sai no padrão "o quê + por quê + o que fazer + como voltar".
 * Nenhuma função devolve Date (horários em ms "locais sem fuso", ver o Parser).
 ****************************************************/

var BAIXATEMP_FRACAO_AMBIENTE = 0.9;   // pressão acima de 90 % da inicial = câmara em pressão ambiente (início/fim do ciclo)

function BaixaTempMotor_num_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var n = BaixaTempParser_numero_(v, true);
  return n === null ? null : n;
}

function BaixaTempMotor_r_(v, casas) {
  if (v === null || v === undefined || !isFinite(v)) return null;
  var f = Math.pow(10, casas === undefined ? 2 : casas);
  return Math.round(v * f) / f;
}

function BaixaTempMotor_fmt_(v, casas, unidade) {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  return SGO_DocA4_num_(v, casas === undefined ? 2 : casas) + (unidade ? ' ' + unidade : '');
}

/** Estatística simples de uma lista (ignora null). */
function BaixaTempMotor_estat_(lista) {
  var v = (lista || []).filter(function (x) { return x !== null && x !== undefined && isFinite(x); });
  if (!v.length) return null;
  var soma = 0, min = Infinity, max = -Infinity;
  v.forEach(function (x) { soma += x; if (x < min) min = x; if (x > max) max = x; });
  var media = soma / v.length, q = 0;
  v.forEach(function (x) { q += (x - media) * (x - media); });
  return { n: v.length, min: min, max: max, media: media, dp: v.length > 1 ? Math.sqrt(q / (v.length - 1)) : 0, amplitude: max - min };
}

/* ============================================================ fases e pulsos */

/**
 * Vácuos e pulsos pela pressão (mbar).
 * Vácuo: trecho contínuo com pressão ≤ limiar. Pulso: saída de um vácuo em que a pressão sobe pelo menos
 * `elevacao` acima do mínimo do vácuo, sem chegar à pressão ambiente (≥ 90 % da inicial = ventilação).
 * Devolve { p0, inicioIdx, fimIdx, limiar, vacuos:[{i0,i1,pMin}], pulsos:[{i0,iPico,i1,pico}], pMin, iMin }.
 */
function BaixaTempMotor_pulsos_(tempos, p, limiarVacuo, elevacao) {
  var n = tempos.length, ini = [];
  for (var a = 0; a < n && ini.length < 3; a++) if (p[a] !== null && isFinite(p[a])) ini.push(p[a]);
  ini.sort(function (x, y) { return x - y; });
  var p0 = ini.length ? ini[Math.floor(ini.length / 2)] : 1013.25;
  if (p0 < 500) p0 = 1013.25;
  var amb = p0 * BAIXATEMP_FRACAO_AMBIENTE;
  var pMin = Infinity, iMin = -1, inicioIdx = -1, fimIdx = -1;
  for (var i = 0; i < n; i++) {
    if (p[i] === null) continue;
    if (p[i] < pMin) { pMin = p[i]; iMin = i; }
    if (p[i] < amb) { if (inicioIdx < 0) inicioIdx = i; fimIdx = i; }
  }
  if (!isFinite(pMin)) return { p0: p0, inicioIdx: -1, fimIdx: -1, limiar: null, vacuos: [], pulsos: [], pMin: null, iMin: -1 };
  var limiar = (limiarVacuo !== null && limiarVacuo !== undefined && isFinite(limiarVacuo)) ? limiarVacuo : pMin + elevacao;
  var vacuos = [], pulsos = [], emVacuo = false, vac = null, pulso = null;
  for (var k = 0; k < n; k++) {
    var x = p[k];
    if (x === null) continue;
    if (x <= limiar) {
      if (pulso) { pulso.i1 = k; pulsos.push(pulso); pulso = null; }
      if (!emVacuo) { emVacuo = true; vac = { i0: k, i1: k, pMin: x }; }
      vac.i1 = k; if (x < vac.pMin) vac.pMin = x;
      continue;
    }
    if (emVacuo) {
      if (x >= vac.pMin + elevacao) {
        emVacuo = false; vacuos.push(vac);
        if (x < amb) pulso = { i0: k, iPico: k, i1: k, pico: x };
        vac = null;
      }
      continue;
    }
    if (pulso) {
      if (x >= amb) pulso = null; // subiu até a pressão ambiente: é ventilação, não pulso de injeção
      else { pulso.i1 = k; if (x > pulso.pico) { pulso.pico = x; pulso.iPico = k; } }
    }
  }
  if (vac) vacuos.push(vac);
  if (pulso) pulsos.push(pulso); // terminou o arquivo ainda no pulso (sem voltar ao vácuo nem à pressão ambiente)
  return { p0: p0, inicioIdx: inicioIdx, fimIdx: fimIdx, limiar: limiar, vacuos: vacuos, pulsos: pulsos, pMin: pMin, iMin: iMin };
}

/** Maior trecho contínuo em que todos os sensores ativos com leitura estão ≥ limite. */
function BaixaTempMotor_janelaTemperatura_(serie, ativos, limite) {
  var melhor = null, atual = null;
  for (var i = 0; i < serie.tempos.length; i++) {
    var vals = ativos.map(function (s) { return serie.temperaturas[s][i]; }).filter(function (v) { return v !== null; });
    var ok = vals.length > 0 && vals.every(function (v) { return v >= limite; });
    if (ok) { if (!atual) atual = { i0: i, i1: i }; else atual.i1 = i; }
    if ((!ok || i === serie.tempos.length - 1) && atual) {
      if (!melhor || (serie.tempos[atual.i1] - serie.tempos[atual.i0]) > (serie.tempos[melhor.i1] - serie.tempos[melhor.i0])) melhor = atual;
      if (!ok) atual = null;
    }
  }
  return melhor;
}

/** Horário digitado ("hh:mm[:ss]" ou "dd/mm/aaaa hh:mm[:ss]") → índice da 1ª leitura ≥ (início) ou última ≤ (fim). */
function BaixaTempMotor_indiceDoHorario_(tempos, texto, dataCiclo, ehFim) {
  var s = String(texto || '').trim();
  if (!s) return -1;
  var t = BaixaTempParser_dataHora_(s, 'BR');
  if (t === null) {
    var h = BaixaTempParser_hora_(s);
    if (h === null) return -2;
    var base = BaixaTempParser_lerDataBr_(dataCiclo);
    if (base === null && tempos.length) { var d = new Date(tempos[0]); base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
    t = base + h;
  }
  if (ehFim) { for (var i = tempos.length - 1; i >= 0; i--) if (tempos[i] <= t) return i; return -3; }
  for (var j = 0; j < tempos.length; j++) if (tempos[j] >= t) return j;
  return -3;
}

/* ============================================================ ciclo */

/**
 * Analisa UM ciclo. serie: saída do Parser (já unida). ciclo: dados do ciclo na tela.
 * dados: ensaio inteiro (tipo, cicloProgramado, instrumentos). Devolve o resultado do ciclo.
 */
function BaixaTempMotor_analisarCiclo_(serie, ciclo, dados) {
  var tipo = BaixaTemp_tipoCfg_(dados.tipo);
  var P = BaixaTempMotor_parametros_(dados.programa);
  var travas = [], avisos = [], rotulo = BaixaTempMotor_rotuloCiclo_(ciclo);
  var etapa = String(ciclo.etapa || 'QD').toUpperCase();
  var r = { cicloId: ciclo.id, rotulo: rotulo, etapa: etapa, travas: travas, avisos: avisos, criterios: [], resultado: null };
  if (!serie || !serie.tempos || !serie.tempos.length) {
    travas.push(rotulo + ': não há leituras do registrador. Envie o arquivo do ciclo no cartão do ciclo, toque em "Ler arquivo" e confira a prévia; depois toque em "Calcular resultado" de novo.');
    return r;
  }
  (serie.avisos || []).forEach(function (a) { avisos.push(rotulo + ': ' + a); });
  var n = serie.tempos.length;
  var sensores = BaixaTempMotor_sensoresDoCiclo_(serie, ciclo, etapa);
  var ativos = sensores.filter(function (s) { return s.ativo; }).map(function (s) { return s.k; });
  if (!ativos.length) {
    travas.push(rotulo + ': todos os sensores estão desmarcados. Marque como ativo ao menos um sensor na lista "Sensores do ciclo" e calcule de novo.');
    return r;
  }
  var lac = BaixaTempParser_lacunas_(serie.tempos);
  var dt = lac.intervaloTipicoS;
  r.leitura = {
    n: n, intervaloS: dt, inicio: serie.tempos[0], fim: serie.tempos[n - 1],
    inicioTxt: BaixaTempParser_fmtDataHora_(serie.tempos[0]), fimTxt: BaixaTempParser_fmtDataHora_(serie.tempos[n - 1]),
    duracaoMin: (serie.tempos[n - 1] - serie.tempos[0]) / 60000, lacunas: lac.lacunas.length, fracaoLacunas: lac.fracao,
    temPressao: !!serie.pressao, temUmidade: !!serie.umidade, temConcentracao: !!serie.concentracao
  };
  if (dt < BAIXATEMP_CFG.LEITURA.INTERVALO_MIN_S || dt > BAIXATEMP_CFG.LEITURA.INTERVALO_MAX_S) {
    travas.push(rotulo + ': o intervalo típico entre leituras é de ' + BaixaTempMotor_fmt_(dt, 0, 's') + ', fora da faixa aceita (' + BAIXATEMP_CFG.LEITURA.INTERVALO_MIN_S + ' s a ' + BAIXATEMP_CFG.LEITURA.INTERVALO_MAX_S + ' s). Confira na prévia se a coluna do horário está certa; se o registrador foi programado assim, exporte com intervalo dentro da faixa.');
  }
  if (lac.fracao > BAIXATEMP_CFG.LEITURA.LACUNA_MAX_FRACAO) {
    travas.push(rotulo + ': o arquivo tem falhas de registro que somam ' + BaixaTempMotor_fmt_(lac.fracao * 100, 1, '%') + ' do período (limite ' + BaixaTempMotor_fmt_(BAIXATEMP_CFG.LEITURA.LACUNA_MAX_FRACAO * 100, 0, '%') + '). Sem leituras contínuas não é possível demonstrar o ciclo. Exporte o arquivo completo do registrador ou repita o ciclo.');
  } else if (lac.lacunas.length) {
    avisos.push(rotulo + ': ' + lac.lacunas.length + ' intervalo(s) sem leitura maior(es) que ' + BAIXATEMP_CFG.LEITURA.LACUNA_FATOR_AVISO + ' vezes o intervalo típico.');
  }

  // Pressão: vácuos, pulsos e limites do ciclo
  var pr = null;
  if (serie.pressao) {
    var limiarVac = P.pressaoVacuoMbar !== null ? P.pressaoVacuoMbar + (P.tolVacuoMbar || 0) : null;
    var elev = BaixaTempMotor_num_(dados.programa && dados.programa.elevacaoPulsoMbar);
    pr = BaixaTempMotor_pulsos_(serie.tempos, serie.pressao, limiarVac, elev !== null && elev > 0 ? elev : tipo.deteccao.elevacaoMinimaPulsoMbar);
  }

  // Janela de exposição
  var jan = ciclo.janela || {}, modo = String(jan.modo || 'AUTO').toUpperCase();
  var i0 = -1, i1 = -1, origem = '';
  if (modo === 'MANUAL') {
    i0 = BaixaTempMotor_indiceDoHorario_(serie.tempos, jan.inicio, ciclo.data, false);
    i1 = BaixaTempMotor_indiceDoHorario_(serie.tempos, jan.fim, ciclo.data, true);
    if (!String(jan.justificativa || '').trim()) travas.push(rotulo + ': a janela de exposição foi informada à mão sem justificativa. Escreva em "Justificativa" de onde vieram o início e o fim (por exemplo, o registro impresso do equipamento) ou volte a janela para "Automática".');
    if (i0 < 0 || i1 < 0 || i1 <= i0) {
      travas.push(rotulo + ': o início e o fim da exposição digitados (' + (jan.inicio || '—') + ' a ' + (jan.fim || '—') + ') não estão dentro do período das leituras (' + r.leitura.inicioTxt + ' a ' + r.leitura.fimTxt + ') ou estão invertidos. Corrija no formato hh:mm:ss e calcule de novo.');
      i0 = i1 = -1;
    }
    origem = 'manual';
  } else {
    var preferePulsos = tipo.janelaAuto === 'PULSOS';
    var tentarPulsos = function () {
      if (!pr || !pr.pulsos.length) return false;
      var a = pr.pulsos[0], b = pr.pulsos[pr.pulsos.length - 1];
      i0 = a.i0; i1 = b.i1; origem = 'pulsos'; return i1 > i0;
    };
    var tentarTemp = function () {
      if (P.temperaturaProgramada === null || P.tolInf === null) return false;
      var w = BaixaTempMotor_janelaTemperatura_(serie, ativos, P.temperaturaProgramada - P.tolInf);
      if (!w || w.i1 <= w.i0) return false;
      i0 = w.i0; i1 = w.i1; origem = 'temperatura'; return true;
    };
    var achou = preferePulsos ? (tentarPulsos() || tentarTemp()) : (tentarTemp() || tentarPulsos());
    if (!achou) {
      i0 = i1 = -1;
      travas.push(rotulo + ': a janela de exposição não foi identificada pelos dados (' + (preferePulsos ? 'sem pulsos de pressão reconhecíveis e sem patamar de temperatura' : 'nenhum trecho com todos os sensores na temperatura mínima, nem pulsos de pressão') + '). Confira a temperatura programada, as tolerâncias e as colunas na prévia; se o arquivo estiver certo, informe a janela à mão ("Manual") com a justificativa, a partir do registro do equipamento.');
    }
  }
  if (i0 < 0) return r;

  var lo = P.temperaturaProgramada !== null && P.tolInf !== null ? P.temperaturaProgramada - P.tolInf : null;
  var hi = P.temperaturaProgramada !== null && P.tolSup !== null ? P.temperaturaProgramada + P.tolSup : null;
  var inc = BaixaTempMotor_incertezas_(dados, dt);
  var guarda = String(BAIXATEMP_CFG.REGRA_DECISAO) === 'BANDA_GUARDA';
  var Ut = inc.temperatura ? inc.temperatura.U : 0;
  var loD = lo !== null ? lo + (guarda ? Ut : 0) : null, hiD = hi !== null ? hi - (guarda ? Ut : 0) : null;
  var duracaoMin = (serie.tempos[i1] - serie.tempos[i0]) / 60000;
  r.janela = {
    modo: modo, origem: origem, i0: i0, i1: i1, inicio: serie.tempos[i0], fim: serie.tempos[i1],
    inicioTxt: BaixaTempParser_fmtHora_(serie.tempos[i0]), fimTxt: BaixaTempParser_fmtHora_(serie.tempos[i1]),
    duracaoMin: duracaoMin, justificativa: String(jan.justificativa || '').trim()
  };

  // Sensores na janela
  var porSensor = sensores.map(function (s) {
    var vals = serie.temperaturas[s.k].slice(i0, i1 + 1);
    var e = BaixaTempMotor_estat_(vals);
    var fora = 0;
    if (s.ativo && e && loD !== null && hiD !== null) vals.forEach(function (v) { if (v !== null && (v < loD || v > hiD)) fora++; });
    return { nome: s.nome, papel: s.papel, posicao: s.posicao, ativo: s.ativo, instrumento: s.instrumento,
      min: e ? e.min : null, max: e ? e.max : null, media: e ? e.media : null, n: e ? e.n : 0,
      foraFaixa: fora, minutosForaFaixa: fora * dt / 60, semLeitura: !e };
  });
  porSensor.forEach(function (s) { if (s.ativo && s.semLeitura) travas.push(rotulo + ': o sensor "' + s.nome + '" está ativo mas não tem leitura na janela de exposição. Desmarque o sensor (registrando o motivo nas observações) ou envie o arquivo dele.'); });
  function grupo(papel) {
    var todos = [];
    sensores.forEach(function (s) { if (s.ativo && (!papel || s.papel === papel)) serie.temperaturas[s.k].slice(i0, i1 + 1).forEach(function (v) { todos.push(v); }); });
    return BaixaTempMotor_estat_(todos);
  }
  var unif = { valor: null, instante: null };
  for (var i = i0; i <= i1; i++) {
    var vs = ativos.map(function (k) { return serie.temperaturas[k][i]; }).filter(function (v) { return v !== null; });
    if (vs.length < 2) continue;
    var d = Math.max.apply(null, vs) - Math.min.apply(null, vs);
    if (unif.valor === null || d > unif.valor) { unif.valor = d; unif.instante = serie.tempos[i]; }
  }
  r.sensores = porSensor;
  r.temperatura = { carga: grupo('CARGA'), camara: grupo('CAMARA'), todos: grupo(null), uniformidade: unif, limiteInferior: lo, limiteSuperior: hi, limiteInferiorDecisao: loD, limiteSuperiorDecisao: hiD };
  if (serie.pressao && pr) {
    var pj = BaixaTempMotor_estat_(serie.pressao.slice(i0, i1 + 1));
    var naJanela = pr.pulsos.filter(function (p) { return p.i0 >= i0 && p.i0 <= i1; });
    r.pressao = {
      p0: pr.p0, minCiclo: pr.pMin, minCicloHora: pr.iMin >= 0 ? BaixaTempParser_fmtHora_(serie.tempos[pr.iMin]) : '',
      minJanela: pj ? pj.min : null, maxJanela: pj ? pj.max : null, mediaJanela: pj ? pj.media : null, limiarVacuo: pr.limiar,
      vacuos: pr.vacuos.length, pulsosTotal: pr.pulsos.length, pulsosJanela: naJanela.length,
      pulsos: pr.pulsos.map(function (p, ix) { return { n: ix + 1, inicio: BaixaTempParser_fmtHora_(serie.tempos[p.i0]), pico: p.pico, naJanela: p.i0 >= i0 && p.i0 <= i1 }; })
    };
  }
  if (serie.concentracao) r.concentracao = BaixaTempMotor_estat_(serie.concentracao.slice(i0, i1 + 1));
  if (serie.umidade) r.umidade = BaixaTempMotor_estat_(serie.umidade.slice(i0, i1 + 1));

  // Fases
  var cIni = pr && pr.inicioIdx >= 0 ? Math.min(pr.inicioIdx, i0) : 0;
  var cFim = pr && pr.fimIdx >= 0 ? Math.max(Math.min(n - 1, pr.fimIdx + 1), i1) : n - 1;
  var fases = [];
  if (i0 > cIni) fases.push({ nome: tipo.fases[0], i0: cIni, i1: i0 });
  fases.push({ nome: tipo.fases[1], i0: i0, i1: i1 });
  if (cFim > i1) fases.push({ nome: tipo.fases[2], i0: i1, i1: cFim });
  r.fases = fases.map(function (f) { return { nome: f.nome, inicio: BaixaTempParser_fmtHora_(serie.tempos[f.i0]), fim: BaixaTempParser_fmtHora_(serie.tempos[f.i1]), duracaoMin: (serie.tempos[f.i1] - serie.tempos[f.i0]) / 60000, i0: f.i0, i1: f.i1 }; });
  r.cicloDuracaoMin = (serie.tempos[cFim] - serie.tempos[cIni]) / 60000;

  // Critérios do ciclo
  var crit = r.criterios;
  var add = function (chave, requisito, obtido, conforme, nota) {
    var c = BaixaTempMotor_criterioCfg_(chave);
    crit.push({ codigo: c.codigo, chave: chave, titulo: c.titulo, requisito: requisito, obtido: obtido, conforme: conforme, fonte: BAIXATEMP_CFG.FONTES[c.fonte] || c.fonte, nota: nota || '' });
  };
  var faixaTxt = lo !== null && hi !== null ? BaixaTempMotor_fmt_(lo, 1, '°C') + ' a ' + BaixaTempMotor_fmt_(hi, 1, '°C') : '';
  var faixaReq = function (onde) {
    return 'Todas as leituras dos sensores ' + onde + ' na faixa de ' + faixaTxt + (guarda && Ut ? ' (limites reduzidos pela incerteza expandida de ' + BaixaTempMotor_fmt_(Ut, 2, '°C') + ')' : '');
  };
  var sensoresDe = function (papel) { return porSensor.filter(function (s) { return s.ativo && s.papel === papel; }); };
  var avaliarFaixa = function (papel, chave, onde) {
    var lst = sensoresDe(papel), g = papel === 'CARGA' ? r.temperatura.carga : r.temperatura.camara;
    if (!lst.length) {
      if (chave === 'TEMP_CARGA') travas.push(rotulo + ': nenhum sensor está marcado como "Carga". No ciclo de desempenho a temperatura precisa ser medida na carga. Em "Sensores do ciclo", marque o papel de cada sensor e calcule de novo.');
      return;
    }
    if (lo === null || hi === null) return; // trava de parâmetro já registrada no ensaio
    var foraTot = lst.reduce(function (a, s) { return a + s.foraFaixa; }, 0);
    add(chave, faixaReq(onde), 'Mínima ' + BaixaTempMotor_fmt_(g.min, 2, '°C') + ' e máxima ' + BaixaTempMotor_fmt_(g.max, 2, '°C') + (foraTot ? '; ' + foraTot + ' leitura(s) fora da faixa' : ''), foraTot === 0);
  };
  if (etapa === 'QD') avaliarFaixa('CARGA', 'TEMP_CARGA', 'da carga');
  avaliarFaixa('CAMARA', 'TEMP_CAMARA', 'da câmara');
  if (unif.valor !== null) {
    if (P.uniformidadeMax !== null) add('UNIFORMIDADE', 'Maior diferença entre sensores no mesmo instante ≤ ' + BaixaTempMotor_fmt_(P.uniformidadeMax, 2, '°C'), BaixaTempMotor_fmt_(unif.valor, 2, '°C') + ' às ' + BaixaTempParser_fmtHora_(unif.instante), unif.valor <= P.uniformidadeMax + 1e-9);
    else add('UNIFORMIDADE', 'Sem limite declarado pelo fabricante (informativo)', BaixaTempMotor_fmt_(unif.valor, 2, '°C') + ' às ' + BaixaTempParser_fmtHora_(unif.instante), null);
  }
  if (P.tempoExposicaoMin !== null) {
    var exige = P.tempoExposicaoMin + (guarda ? inc.tempo.Umin : 0);
    add('TEMPO_EXPOSICAO', 'Duração da exposição ≥ ' + BaixaTempMotor_fmt_(exige, 2, 'min') + (guarda ? ' (programado mais a incerteza do tempo)' : ''), BaixaTempMotor_fmt_(duracaoMin, 2, 'min') + ' (' + r.janela.inicioTxt + ' a ' + r.janela.fimTxt + ', janela ' + (origem === 'manual' ? 'informada à mão' : 'identificada pelos ' + (origem === 'pulsos' ? 'pulsos de pressão' : 'dados de temperatura')) + ')', duracaoMin + 1e-9 >= exige);
  }
  if (P.pulsosProgramados !== null) {
    if (!r.pressao) travas.push(rotulo + ': o número de pulsos programado foi informado, mas o arquivo do ciclo não tem pressão. Marque a coluna de pressão na prévia do arquivo ou apague o "Número de pulsos programado" em 2. Ciclo e critérios (o critério deixa de ser avaliado).');
    else add('PULSOS', 'Número de pulsos na exposição = ' + P.pulsosProgramados, r.pressao.pulsosJanela + ' pulso(s) identificado(s)', r.pressao.pulsosJanela === P.pulsosProgramados);
  }
  if (P.pressaoVacuoMbar !== null) {
    if (!r.pressao) travas.push(rotulo + ': a pressão de vácuo programada foi informada, mas o arquivo do ciclo não tem pressão. Marque a coluna de pressão na prévia do arquivo ou apague a "Pressão de vácuo programada" em 2. Ciclo e critérios.');
    else {
      var limVac = P.pressaoVacuoMbar + (P.tolVacuoMbar || 0);
      add('VACUO', 'Pressão mínima do ciclo ≤ ' + BaixaTempMotor_fmt_(limVac, 2, 'mbar'), BaixaTempMotor_fmt_(r.pressao.minCiclo, 2, 'mbar') + (r.pressao.minCicloHora ? ' às ' + r.pressao.minCicloHora : ''), r.pressao.minCiclo <= limVac + 1e-9);
    }
  }
  var cc = r.concentracao || r.umidade;
  if (cc) {
    var rot = r.concentracao ? 'concentração' : 'umidade';
    if (P.concentracaoMin !== null) add('CONCENTRACAO', 'Menor ' + rot + ' registrada na exposição ≥ ' + BaixaTempMotor_fmt_(P.concentracaoMin, 2, P.unidadeConcentracao), 'Mínima ' + BaixaTempMotor_fmt_(cc.min, 2, P.unidadeConcentracao) + ', média ' + BaixaTempMotor_fmt_(cc.media, 2, P.unidadeConcentracao), cc.min + 1e-9 >= P.concentracaoMin);
    else add('CONCENTRACAO', 'Sem limite declarado (informativo)', 'Mínima ' + BaixaTempMotor_fmt_(cc.min, 2, P.unidadeConcentracao) + ', média ' + BaixaTempMotor_fmt_(cc.media, 2, P.unidadeConcentracao) + ', máxima ' + BaixaTempMotor_fmt_(cc.max, 2, P.unidadeConcentracao), null);
  }
  BaixaTempMotor_indicadores_(ciclo, etapa, rotulo, dados, add, travas);
  if (!travas.length) r.resultado = crit.every(function (c) { return c.conforme !== false; }) ? 'CONFORME' : 'NAO_CONFORME';
  return r;
}

function BaixaTempMotor_criterioCfg_(chave) {
  return BAIXATEMP_CFG.CRITERIOS.filter(function (c) { return c.chave === chave; })[0] || { codigo: '', titulo: chave, fonte: '' };
}

function BaixaTempMotor_rotuloCiclo_(ciclo) {
  return 'Ciclo ' + String(ciclo.etapa || 'QD').toUpperCase() + ' nº ' + (String(ciclo.numero || '').trim() || '—');
}

/** Parâmetros programados (números ou null). */
function BaixaTempMotor_parametros_(p) {
  p = p || {};
  return {
    temperaturaProgramada: BaixaTempMotor_num_(p.temperaturaProgramada), tolInf: BaixaTempMotor_num_(p.tolInf), tolSup: BaixaTempMotor_num_(p.tolSup),
    tempoExposicaoMin: BaixaTempMotor_num_(p.tempoExposicaoMin), pulsosProgramados: BaixaTempMotor_num_(p.pulsosProgramados),
    pressaoVacuoMbar: BaixaTempMotor_num_(p.pressaoVacuoMbar), tolVacuoMbar: BaixaTempMotor_num_(p.tolVacuoMbar) || 0,
    uniformidadeMax: BaixaTempMotor_num_(p.uniformidadeMax), concentracaoMin: BaixaTempMotor_num_(p.concentracaoMin),
    unidadeConcentracao: String(p.unidadeConcentracao || '').trim()
  };
}

/** Sensores do ciclo alinhados com as colunas da série. Sem configuração: QO = câmara, QD = carga. */
function BaixaTempMotor_sensoresDoCiclo_(serie, ciclo, etapa) {
  var cfg = Array.isArray(ciclo.sensores) ? ciclo.sensores : [];
  return serie.temperaturas.map(function (col, k) {
    var nome = serie.nomes[k] || ('Sensor ' + (k + 1));
    var c = cfg.filter(function (x) { return x && String(x.nome) === String(nome); })[0] || cfg[k] || {};
    var papel = String(c.papel || (etapa === 'QO' ? 'CAMARA' : 'CARGA')).toUpperCase();
    return { k: k, nome: nome, papel: papel === 'CAMARA' ? 'CAMARA' : 'CARGA', posicao: String(c.posicao || '').trim(), ativo: c.ativo !== false, instrumento: String(c.instrumento || '').trim() };
  });
}

/** Indicadores químicos e biológicos do ciclo (critérios C07 e C08). */
function BaixaTempMotor_indicadores_(ciclo, etapa, rotulo, dados, add, travas) {
  var dataRef = BaixaTempParser_lerDataBr_(ciclo.data) || BaixaTempParser_lerDataBr_((dados.identificacao || {}).dataInicio);
  var vencido = function (validade) { var v = BaixaTempParser_lerDataBr_(validade); return v !== null && dataRef !== null && v < dataRef; };
  var iqs = (Array.isArray(ciclo.iqs) ? ciclo.iqs : []).filter(function (x) { return x && (x.posicao || x.lote || x.resultado); });
  if (!iqs.length && etapa === 'QD' && BAIXATEMP_CFG.EXIGE_IQ_NO_QD) travas.push(rotulo + ': nenhum indicador químico foi registrado. O plano de validação exige indicadores químicos nos ciclos de desempenho. Em "Indicadores químicos" do ciclo, toque em "Acrescentar" e informe posição, lote, validade e resultado.');
  if (iqs.length) {
    var pendIq = iqs.filter(function (x) { return ['CONFORME', 'NAO_CONFORME'].indexOf(String(x.resultado || '').toUpperCase()) < 0; });
    if (pendIq.length) travas.push(rotulo + ': ' + pendIq.length + ' indicador(es) químico(s) sem resultado lido (posição ' + pendIq.map(function (x) { return x.posicao || '—'; }).join(', ') + '). Leia a mudança de cor conforme as instruções do fabricante do indicador e escolha "Conforme" ou "Não conforme".');
    iqs.forEach(function (x) { if (vencido(x.validade)) travas.push(rotulo + ': o indicador químico do lote ' + (x.lote || '—') + ' (posição ' + (x.posicao || '—') + ') estava vencido na data do ciclo (validade ' + x.validade + '). Indicador vencido não serve de evidência: repita o ciclo com indicador válido ou corrija a validade digitada.'); });
    var nokIq = iqs.filter(function (x) { return String(x.resultado || '').toUpperCase() === 'NAO_CONFORME'; });
    if (!pendIq.length) add('IQ', 'Todos os indicadores químicos com a mudança prevista pelo fabricante do indicador', iqs.length - nokIq.length + ' de ' + iqs.length + ' conforme(s)' + (nokIq.length ? '; não conforme(s) na(s) posição(ões) ' + nokIq.map(function (x) { return x.posicao || '—'; }).join(', ') : ''), nokIq.length === 0);
  }
  if (etapa !== 'QD') return;
  var ibs = (Array.isArray(ciclo.ibs) ? ciclo.ibs : []).filter(function (x) { return x && (x.posicao || x.lote || x.resultado); });
  if (!ibs.length) {
    if (BAIXATEMP_CFG.EXIGE_IB_NO_QD) travas.push(rotulo + ': nenhum indicador biológico foi registrado. O plano de validação exige indicadores biológicos nos ciclos de desempenho. Em "Indicadores biológicos" do ciclo, toque em "Acrescentar" e informe posição, lote, validade e resultado após a incubação.');
    return;
  }
  var cp = ciclo.controlePositivo || {};
  var inc = ciclo.incubacao || {};
  var pend = ibs.filter(function (x) { return ['SEM_CRESCIMENTO', 'CRESCIMENTO'].indexOf(String(x.resultado || '').toUpperCase()) < 0; });
  if (pend.length || inc.concluida === false || String(inc.concluida) === 'false') travas.push(rotulo + ': a incubação dos indicadores biológicos ainda não terminou ou há resultado pendente (' + (pend.length ? 'posição ' + pend.map(function (x) { return x.posicao || '—'; }).join(', ') : 'incubação não concluída') + '). Aguarde o tempo de incubação indicado pelo fabricante do indicador, registre o resultado de cada um e marque "Incubação concluída".');
  if (BAIXATEMP_CFG.EXIGE_CONTROLE_POSITIVO) {
    var cpr = String(cp.resultado || '').toUpperCase();
    if (cpr !== 'CRESCIMENTO') travas.push(rotulo + ': o controle positivo dos indicadores biológicos ' + (cpr === 'SEM_CRESCIMENTO' ? 'não apresentou crescimento; isso invalida a leitura do lote (o indicador ou a incubação podem estar com problema). Repita a incubação com outro indicador do mesmo lote ou repita o ciclo.' : 'não foi registrado. Em "Controle positivo", informe o lote e o resultado da incubação do indicador não exposto.'));
    if (vencido(cp.validade)) travas.push(rotulo + ': o controle positivo (lote ' + (cp.lote || '—') + ') estava vencido na data do ciclo. Repita a incubação com indicador válido ou corrija a validade digitada.');
  }
  ibs.forEach(function (x) { if (vencido(x.validade)) travas.push(rotulo + ': o indicador biológico do lote ' + (x.lote || '—') + ' (posição ' + (x.posicao || '—') + ') estava vencido na data do ciclo (validade ' + x.validade + '). Repita o ciclo com indicador válido ou corrija a validade digitada.'); });
  if (!pend.length) {
    var cresc = ibs.filter(function (x) { return String(x.resultado || '').toUpperCase() === 'CRESCIMENTO'; });
    add('IB', 'Todos os indicadores biológicos expostos sem crescimento após a incubação, com o controle positivo apresentando crescimento', (ibs.length - cresc.length) + ' de ' + ibs.length + ' sem crescimento' + (cresc.length ? '; crescimento na(s) posição(ões) ' + cresc.map(function (x) { return x.posicao || '—'; }).join(', ') : '') + '; controle positivo: ' + (String(cp.resultado || '').toUpperCase() === 'CRESCIMENTO' ? 'com crescimento' : 'sem registro válido'), cresc.length === 0);
  }
}

/* ============================================================ incertezas */

/**
 * Incerteza expandida (k = 2) por grandeza: combinação da incerteza do certificado
 * (U/k do certificado) com a resolução do registrador (distribuição retangular: res / (2·√3)).
 * Tempo: cada limite da janela é conhecido com resolução igual ao intervalo de leitura;
 * u = Δt / (2·√3) por limite, dois limites → U = 2 · √2 · u.
 */
function BaixaTempMotor_incertezas_(dados, intervaloS) {
  var lista = Array.isArray(dados.instrumentos) ? dados.instrumentos : [];
  function porGrandeza(g) {
    var maior = null;
    lista.forEach(function (it) {
      if (String(it.grandeza || '').toUpperCase() !== g) return;
      var U = BaixaTempMotor_num_(it.U), k = BaixaTempMotor_num_(it.k) || 2, res = BaixaTempMotor_num_(it.resolucao) || 0;
      if (U === null) return;
      var uc = Math.sqrt(Math.pow(U / k, 2) + Math.pow(res / (2 * Math.sqrt(3)), 2));
      var Ue = 2 * uc;
      if (!maior || Ue > maior.U) maior = { tag: it.tag, Ucert: U, kCert: k, resolucao: res, uc: uc, U: Ue };
    });
    return maior;
  }
  var dt = Number(intervaloS) || 0;
  var ut = dt / (2 * Math.sqrt(3));
  var Utempo = 2 * Math.sqrt(2) * ut;
  return { temperatura: porGrandeza('TEMPERATURA'), pressao: porGrandeza('PRESSAO'), umidade: porGrandeza('UMIDADE'), concentracao: porGrandeza('CONCENTRACAO'), tempo: { intervaloS: dt, U: Utempo, Umin: Utempo / 60 } };
}

/* ============================================================ ensaio */

/**
 * Junta tudo: travas do ensaio (identificação, parâmetros, instrumentos, etapas), critérios de QI e QO,
 * critérios de cada ciclo e o veredito. analises: { cicloId: resultado de BaixaTempMotor_analisarCiclo_ }.
 * Devolve { travas, avisos, criteriosEnsaio, ciclos:[...], resultado: 'CONFORME'|'NAO_CONFORME'|null, resumo, incertezas }.
 */
function BaixaTempMotor_avaliarEnsaio_(dados, analises) {
  dados = dados || {};
  analises = analises || {};
  var travas = [], avisos = [], crit = [];
  var tipo;
  try { tipo = BaixaTemp_tipoCfg_(dados.tipo); } catch (e) { return { travas: [e.message], avisos: [], criteriosEnsaio: [], ciclos: [], resultado: null, resumo: '' }; }
  var id = dados.identificacao || {}, et = dados.etapas || {};
  var etapas = ['QI', 'QO', 'QD'].filter(function (k) { return et[k]; });
  if (!etapas.length) travas.push('Nenhuma etapa de qualificação foi marcada. Em 1. Identificação, marque QI, QO e/ou QD conforme o que foi executado.');
  if (!id.clienteId) travas.push('O cliente não foi escolhido. Em 1. Identificação, busque o cliente pelo nome ou CNPJ e escolha da lista.');
  if (!id.unidadeId) travas.push('A unidade do cliente não foi escolhida. Em 1. Identificação, escolha a unidade (cadastre em Cadastros > Unidades se ela não aparecer).');
  if (!id.equipamentoId) travas.push('O equipamento não foi escolhido. Em 1. Identificação, escolha o esterilizador na lista (cadastre em Cadastros > Equipamentos se ele não aparecer).');
  var dIni = BaixaTempParser_lerDataBr_(id.dataInicio), dFim = id.dataFim ? BaixaTempParser_lerDataBr_(id.dataFim) : dIni;
  if (dIni === null) travas.push('A data de início do ensaio não foi informada ou não é uma data válida. Em 1. Identificação, use o formato dd/mm/aaaa.');
  else if (dFim === null || dFim < dIni) travas.push('A data de término do ensaio é inválida ou anterior ao início. Corrija em 1. Identificação (dd/mm/aaaa) ou deixe em branco se foi um dia só.');
  if (!String(id.tecnicoExecutor || '').trim()) travas.push('O técnico executor não foi informado. Em 1. Identificação, preencha quem executou o ensaio.');

  var P = BaixaTempMotor_parametros_(dados.programa);
  var precisaCiclos = et.QO || et.QD;
  if (precisaCiclos) {
    if (P.temperaturaProgramada === null || P.tolInf === null || P.tolSup === null) travas.push('A temperatura programada do ciclo e as tolerâncias inferior e superior não foram todas informadas. Elas definem a faixa de aceitação (fonte: especificação do ciclo declarada pelo fabricante). Preencha em 2. Ciclo e critérios.');
    else if (P.tolInf < 0 || P.tolSup < 0) travas.push('As tolerâncias de temperatura não podem ser negativas. Informe os valores como aparecem na especificação do fabricante (por exemplo, 2 para "−2 °C") em 2. Ciclo e critérios.');
    if (P.tempoExposicaoMin === null || P.tempoExposicaoMin <= 0) travas.push('O tempo de exposição programado não foi informado. Preencha em 2. Ciclo e critérios, conforme a especificação do ciclo do fabricante.');
    if (!String((dados.programa || {}).fonteParametros || '').trim()) travas.push('A origem dos parâmetros programados não foi informada. Em 2. Ciclo e critérios, diga de onde vieram (por exemplo, "manual de operação do fabricante, revisão X" ou "tela de programas do equipamento").');
  }

  // Instrumentos
  var instr = Array.isArray(dados.instrumentos) ? dados.instrumentos : [];
  if (precisaCiclos) {
    var temps = instr.filter(function (i) { return String(i.grandeza || '').toUpperCase() === 'TEMPERATURA'; });
    if (!temps.length) travas.push('Nenhum instrumento de temperatura foi informado. Em 3. Instrumentos, escolha o registrador usado no cadastro de padrões; sem ele a rastreabilidade das medições não é demonstrada.');
  }
  instr.forEach(function (i) {
    var v = BaixaTempParser_lerDataBr_(i.validade);
    if (!String(i.certificado || '').trim()) travas.push('O instrumento ' + (i.tag || '—') + ' está sem número de certificado de calibração. Atualize o padrão em Calibração > Padrões de referência e escolha-o de novo em 3. Instrumentos.');
    if (v === null) travas.push('O instrumento ' + (i.tag || '—') + ' está sem validade do certificado. Atualize o padrão em Calibração > Padrões de referência e escolha-o de novo em 3. Instrumentos.');
    else if (dFim !== null && v < dFim) travas.push('O certificado de calibração do instrumento ' + (i.tag || '—') + ' (' + (i.certificado || 'sem número') + ') estava vencido no período do ensaio (validade ' + BaixaTempParser_fmtData_(v) + '). Medição com instrumento vencido não pode ser emitida: use um instrumento válido ou, se o certificado foi renovado, atualize o padrão e escolha-o de novo.');
    if (BaixaTempMotor_num_(i.U) === null) travas.push('A incerteza expandida (U) do instrumento ' + (i.tag || '—') + ' não foi informada. Copie do certificado de calibração em 3. Instrumentos (campo "U do certificado").');
  });

  // QI
  if (et.QI) BaixaTempMotor_checklist_((dados.qi || {}).itens, tipo.checklistQI, 'QI_CHECKLIST', 'de instalação (QI)', '4. Qualificação de instalação', crit, travas);
  // QO
  var ciclos = Array.isArray(dados.ciclos) ? dados.ciclos : [];
  var ciclosQO = ciclos.filter(function (c) { return String(c.etapa).toUpperCase() === 'QO'; });
  var ciclosQD = ciclos.filter(function (c) { return String(c.etapa).toUpperCase() === 'QD'; });
  if (et.QO) {
    BaixaTempMotor_checklist_((dados.qo || {}).itens, tipo.checklistQO, 'QO_CHECKLIST', 'funcionais (QO)', '5. Qualificação de operação', crit, travas);
    var est = (dados.qo || {}).estanqueidade || {};
    if (est.aplicavel) {
      var pI = BaixaTempMotor_num_(est.pressaoInicial), pF = BaixaTempMotor_num_(est.pressaoFinal), tm = BaixaTempMotor_num_(est.tempoMin), lim = BaixaTempMotor_num_(est.limite);
      if (pI === null || pF === null || tm === null || tm <= 0 || lim === null) travas.push('O ensaio de estanqueidade está marcado como aplicável, mas faltam dados (pressão no início e no fim do período de espera, duração em minutos e limite declarado pelo fabricante). Complete em 5. Qualificação de operação ou desmarque "Estanqueidade aplicável".');
      else {
        var taxa = (pF - pI) / tm;
        crit.push({ codigo: 'C10', chave: 'ESTANQUEIDADE', titulo: BaixaTempMotor_criterioCfg_('ESTANQUEIDADE').titulo, requisito: 'Elevação de pressão ≤ ' + BaixaTempMotor_fmt_(lim, 2, 'mbar/min'), obtido: BaixaTempMotor_fmt_(taxa, 2, 'mbar/min') + ' (de ' + BaixaTempMotor_fmt_(pI, 2, 'mbar') + ' a ' + BaixaTempMotor_fmt_(pF, 2, 'mbar') + ' em ' + BaixaTempMotor_fmt_(tm, 2, 'min') + ')', conforme: taxa <= lim + 1e-9, fonte: BAIXATEMP_CFG.FONTES.FABRICANTE_CICLO, etapa: 'QO', valor: taxa });
      }
    }
    if (ciclosQO.length < BAIXATEMP_CFG.CICLOS_QO_MINIMOS) travas.push('A qualificação de operação (QO) está marcada, mas há ' + ciclosQO.length + ' ciclo(s) de operação registrado(s); o mínimo é ' + BAIXATEMP_CFG.CICLOS_QO_MINIMOS + '. Em 5. Qualificação de operação, toque em "Acrescentar ciclo de operação" e envie o arquivo do ciclo com a câmara vazia.');
  }
  if (et.QD && ciclosQD.length < BAIXATEMP_CFG.CICLOS_QD_MINIMOS) travas.push('A qualificação de desempenho (QD) está marcada, mas há ' + ciclosQD.length + ' ciclo(s) de desempenho registrado(s); o plano de validação pede ' + BAIXATEMP_CFG.CICLOS_QD_MINIMOS + '. Em 6. Qualificação de desempenho, acrescente os ciclos que faltam (ou confirme com o responsável técnico se o plano deste cliente é outro).');
  ciclos.forEach(function (c) {
    var e = String(c.etapa).toUpperCase();
    if ((e === 'QO' && !et.QO) || (e === 'QD' && !et.QD)) avisos.push(BaixaTempMotor_rotuloCiclo_(c) + ' está registrado, mas a etapa ' + e + ' não está marcada em 1. Identificação; ele não entra no resultado.');
  });

  var resultadosCiclos = ciclos.filter(function (c) { var e = String(c.etapa).toUpperCase(); return (e === 'QO' && et.QO) || (e === 'QD' && et.QD); }).map(function (c) {
    var a = analises[c.id];
    if (!a) { travas.push(BaixaTempMotor_rotuloCiclo_(c) + ': o ciclo ainda não foi calculado. Toque em "Calcular resultado".'); return null; }
    a.travas.forEach(function (t) { travas.push(t); });
    a.avisos.forEach(function (t) { avisos.push(t); });
    if (dIni !== null && a.leitura) {
      var lim0 = dIni - 86400000, lim1 = (dFim !== null ? dFim : dIni) + 2 * 86400000;
      if (a.leitura.inicio < lim0 || a.leitura.inicio > lim1) avisos.push(a.rotulo + ': as leituras começam em ' + a.leitura.inicioTxt + ', fora do período do ensaio informado em 1. Identificação. Confira o arquivo e as datas.');
    }
    return a;
  }).filter(Boolean);
  var usaVacuo = resultadosCiclos.some(function (a) { return a.criterios.some(function (c) { return c.chave === 'VACUO'; }); });
  if (usaVacuo && !instr.some(function (i) { return String(i.grandeza || '').toUpperCase() === 'PRESSAO'; })) travas.push('O critério de vácuo foi avaliado com a pressão do arquivo, mas nenhum instrumento de pressão calibrado foi informado. Em 3. Instrumentos, escolha o transdutor de pressão usado, ou apague a "Pressão de vácuo programada" em 2. Ciclo e critérios para não avaliar o vácuo.');

  if (et.QD && ciclosQD.length >= BAIXATEMP_CFG.CICLOS_QD_MINIMOS) {
    var qd = resultadosCiclos.filter(function (a) { return a.etapa === 'QD'; });
    var aprov = qd.filter(function (a) { return a.resultado === 'CONFORME'; }).length;
    if (qd.length === ciclosQD.length && qd.every(function (a) { return a.resultado; })) crit.push({ codigo: 'C13', chave: 'CICLOS_QD', titulo: BaixaTempMotor_criterioCfg_('CICLOS_QD').titulo, requisito: 'Pelo menos ' + BAIXATEMP_CFG.CICLOS_QD_MINIMOS + ' ciclos de desempenho conformes, sem ciclo não conforme', obtido: aprov + ' de ' + qd.length + ' ciclo(s) conforme(s)', conforme: aprov >= BAIXATEMP_CFG.CICLOS_QD_MINIMOS && aprov === qd.length, fonte: BAIXATEMP_CFG.FONTES.PLANO_VALIDACAO, etapa: 'QD' });
  }

  var todos = crit.concat.apply(crit.slice(), resultadosCiclos.map(function (a) { return a.criterios; }));
  var resultado = null;
  if (!travas.length) resultado = todos.every(function (c) { return c.conforme !== false; }) ? 'CONFORME' : 'NAO_CONFORME';
  var ncs = [];
  crit.forEach(function (c) { if (c.conforme === false) ncs.push(c.titulo + ': ' + c.obtido + ' (requisito: ' + c.requisito + ')'); });
  resultadosCiclos.forEach(function (a) { a.criterios.forEach(function (c) { if (c.conforme === false) ncs.push(a.rotulo + ' — ' + c.titulo + ': ' + c.obtido + ' (requisito: ' + c.requisito + ')'); }); });
  var dtMax = 0;
  resultadosCiclos.forEach(function (a) { if (a.leitura && a.leitura.intervaloS > dtMax) dtMax = a.leitura.intervaloS; });
  return {
    travas: BaixaTempMotor_unicos_(travas), avisos: BaixaTempMotor_unicos_(avisos), criteriosEnsaio: crit, ciclos: resultadosCiclos,
    etapas: etapas, resultado: resultado, naoConformidades: ncs,
    resumo: resultado === null ? 'Resultado não emitido: há pendências que impedem a conclusão.' : (resultado === 'CONFORME' ? 'Todos os critérios de aceitação avaliados foram atendidos.' : (ncs.length === 1 ? 'Um critério de aceitação não foi atendido' : ncs.length + ' critérios de aceitação não foram atendidos') + ' (ver a seção de não conformidades).'),
    incertezas: BaixaTempMotor_incertezas_(dados, dtMax),
    regraDecisao: BAIXATEMP_CFG.REGRA_DECISAO
  };
}

function BaixaTempMotor_unicos_(l) { var v = {}; return l.filter(function (x) { if (v[x]) return false; v[x] = 1; return true; }); }

/** Lista de verificação de QI/QO: sem resposta trava; "Não" é não conformidade. */
function BaixaTempMotor_checklist_(respostas, modelo, chave, rotulo, secao, crit, travas) {
  var r = {};
  (Array.isArray(respostas) ? respostas : []).forEach(function (x) { if (x && x.codigo) r[x.codigo] = x; });
  var falta = [], nao = [], na = 0;
  modelo.forEach(function (m) {
    var x = r[m[0]] || {}, v = String(x.resposta || '').toUpperCase();
    if (v === 'NAO') nao.push(m[1] + (x.observacao ? ' (' + x.observacao + ')' : ''));
    else if (v === 'NA') { na++; if (!String(x.observacao || '').trim()) falta.push(m[1] + ' — "Não se aplica" exige observação'); }
    else if (v !== 'SIM') falta.push(m[1]);
  });
  if (falta.length) travas.push('Há verificações ' + rotulo + ' sem resposta ou sem a observação obrigatória: ' + falta.join('; ') + '. Responda cada item em ' + secao + ' (Sim, Não ou Não se aplica com observação).');
  else {
    var c = BaixaTempMotor_criterioCfg_(chave);
    crit.push({ codigo: c.codigo, chave: chave, titulo: c.titulo, requisito: 'Todos os itens verificados e atendidos (' + modelo.length + ' itens)', obtido: (modelo.length - nao.length - na) + ' atendido(s), ' + nao.length + ' não atendido(s), ' + na + ' não se aplica' + (nao.length ? ': ' + nao.join('; ') : ''), conforme: nao.length === 0, fonte: BAIXATEMP_CFG.FONTES[c.fonte], etapa: chave === 'QI_CHECKLIST' ? 'QI' : 'QO' });
  }
}
