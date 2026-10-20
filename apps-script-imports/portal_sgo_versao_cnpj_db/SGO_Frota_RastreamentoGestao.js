/****************************************************
 * FROTA — RASTREAMENTO: GANTT, COPILOTO E RELATÓRIOS A4 (20/10/2026)
 *
 * Gantt da frota: retiradas, paradas, manutenções previstas (pela data e pela previsão do KM), documentos com
 * validade e ações dos planos (Minhas atividades, módulo frota), por veículo, no tempo.
 *
 * Copiloto de sugestões: regras simples sobre os dados do período (consumo acima da média do veículo,
 * abastecimento a conferir, excesso de velocidade por condutor, uso fora do expediente, uso sem registro
 * recorrente, preventiva próxima pelo KM estimado do rastreador, aparelho sem sinal, KM rodado sem
 * abastecimento registrado). Com a chave da IA, a IA só ordena e reescreve a recomendação de cada item a
 * partir dos mesmos números; texto da IA com número que não está nos fatos é descartado (vale o da regra).
 * Toda sugestão é só sugestão: a gestão aceita (vira caso no Kanban de Gestão e melhoria, atividade em Minhas
 * atividades ou pedido de comprovante) ou descarta com motivo. Decisões em REG_FROTA_COPILOTO; o que foi
 * decidido não volta (a chave leva o mês, então o mesmo problema no mês seguinte volta a aparecer).
 *
 * Relatórios A4 (moldura SGO_Documentos_RelatorioA4, HTML + PDF na pasta "Frota - Relatorios Gerados/
 * Rastreamento/<placa>"): rota da retirada, mensal do veículo, consumo da frota e uso fora do expediente.
 ****************************************************/

var FROTAR_ABA_COPILOTO = 'REG_FROTA_COPILOTO';
var FROTAR_COLUNAS_COPILOTO = ['ID', 'CHAVE', 'TIPO', 'TITULO', 'VEICULO_ID', 'PLACA', 'SITUACAO', 'DESTINO', 'REF_ID', 'MOTIVO', 'DECIDIDO_POR_ID', 'DECIDIDO_POR_NOME', 'DECIDIDO_EM', 'CRIADO_EM'];
var FROTAR_PREVENTIVA_KM_AVISO = 1000;
var FROTAR_SEM_SINAL_HORAS = 24;
var FROTAR_KM_SEM_ABAST = 600;
var FROTAR_FORA_EXP_KM = 20;

function FrotaR_mesAtual_() { var l = FrotaR_local_(Date.now()); return l.ano + '-' + ('0' + l.mes).slice(-2); }
function FrotaR_n_(v, casas) { return typeof Rastreador_num_ === 'function' ? Rastreador_num_(v, casas || 0) : String(v); }
function FrotaR_duracao_(min) { return typeof Frota_duracaoTexto_ === 'function' ? Frota_duracaoTexto_(min) : (Math.round(min) + ' min'); }
function FrotaR_veiculosAtivos_() {
  return Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).filter(function (v) { return SGO_UTILS.safeUpper(v.STATUS) !== 'INATIVO'; })
    .sort(function (a, b) { return SGO_UTILS.safe(a.PLACA).localeCompare(SGO_UTILS.safe(b.PLACA)); });
}

// ------------------------------------------------------------
// GANTT DA FROTA
// ------------------------------------------------------------
/** KM por dia do veículo (média das retiradas dos últimos 60 dias); null sem dado. */
function FrotaR_kmPorDia_(veiculoId, movs) {
  var desde = Date.now() - 60 * 86400000, km = 0, achou = false;
  movs.forEach(function (m) {
    if (SGO_UTILS.safe(m.VEICULO_ID) !== veiculoId || SGO_UTILS.safeUpper(m.STATUS) !== 'FINALIZADO') return;
    var p = FrotaR_periodoMov_(m);
    if (p.ateMs < desde) return;
    var k = Frota_num_(m.KM_CHEGADA, NaN) - Frota_num_(m.KM_SAIDA, NaN);
    if (isFinite(k) && k > 0) { km += k; achou = true; }
  });
  return achou ? km / 60 : null;
}

/** KM atual estimado: o maior entre o cadastro e o hodômetro do rastreador corrigido pela diferença ao painel. */
function FrotaR_kmEstimado_(v, posicoes, deslocamentos) {
  var cad = Frota_num_(v.KM_ATUAL, 0);
  var pos = posicoes ? posicoes[SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID)] : null;
  var d = deslocamentos ? deslocamentos[SGO_UTILS.safe(v.ID)] : null;
  if (pos && pos.odometroKm !== null && pos.odometroKm !== undefined && d) {
    var est = Math.round(pos.odometroKm + d.deslocamento);
    if (est > cad && est - cad < 20000) return { km: est, fonte: 'RASTREADOR' };
  }
  return { km: cad, fonte: 'CADASTRO' };
}

function Frota_apiRastrGantt(sessionId, payload) {
  FrotaR_exigirGestao_(sessionId);
  payload = payload || {};
  var per = FrotaR_periodo_(payload.de || FrotaR_diasAtrasBr_(7), payload.ate || FrotaR_local_(Date.now() + 30 * 86400000).data, 190);
  var movs = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO);
  var cnd = FrotaR_condutores_();
  var veics = FrotaR_veiculosAtivos_();
  var c = Rastreador_cfg_();
  var posicoes = c.ligado ? (Rastreador_posicoesGuardadas_(c, 3600) || {}) : {};
  var desl = Rastreador_deslocamentosPainel_(movs);
  var ultimas = Frota_ultimasManutencoesPorVeiculo_();
  var docs = Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO);
  var vig = Frota_documentosVigentes_(docs);
  var tipos = {};
  FROTA_CFG.TIPOS_MANUTENCAO.forEach(function (t) { tipos[t.codigo] = t.label; });
  var dentro = function (a, b) { return a <= per.ateMs && b >= per.deMs; };
  var linhas = veics.map(function (v) {
    var vid = SGO_UTILS.safe(v.ID), itens = [];
    movs.forEach(function (m) {
      if (SGO_UTILS.safe(m.VEICULO_ID) !== vid) return;
      var p = FrotaR_periodoMov_(m);
      if (!dentro(p.deMs, p.ateMs)) return;
      var aberta = SGO_UTILS.safeUpper(m.STATUS) === 'EM_ANDAMENTO';
      itens.push({ tipo: 'RETIRADA', ini: p.deMs, fim: aberta ? Math.max(Date.now(), p.deMs + 3600000) : p.ateMs, emAndamento: aberta,
        rotulo: SGO_UTILS.safe((cnd[SGO_UTILS.safe(m.CONDUTOR_ID)] || {}).NOME) || 'Condutor', detalhe: 'Retirada ' + FrotaR_textoMs_(p.deMs) + ' a ' + (aberta ? 'em andamento' : FrotaR_textoMs_(p.ateMs)) + (m.FINALIDADE ? ' — ' + SGO_UTILS.safe(m.FINALIDADE) : '') });
    });
    Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_PARADA).forEach(function (pa) {
      if (SGO_UTILS.safe(pa.VEICULO_ID) !== vid) return;
      var a = FrotaR_inicioDia_(Frota_textoData_(pa.DATA_INICIO)), b = SGO_UTILS.safe(pa.DATA_FIM) ? FrotaR_fimDia_(Frota_textoData_(pa.DATA_FIM)) : per.ateMs;
      if (a === null || b === null || !dentro(a, b)) return;
      itens.push({ tipo: 'PARADA', ini: a, fim: b, rotulo: SGO_UTILS.safe(pa.MOTIVO) || 'Parada', detalhe: 'Parada: ' + (SGO_UTILS.safe(pa.MOTIVO) || '') + (pa.DESCRICAO ? ' — ' + SGO_UTILS.safe(pa.DESCRICAO) : '') + (SGO_UTILS.safe(pa.DATA_FIM) ? '' : ' (sem data de fim)') });
    });
    var kmDia = FrotaR_kmPorDia_(vid, movs);
    var est = FrotaR_kmEstimado_(v, posicoes, desl);
    Object.keys(ultimas).forEach(function (k) {
      var m = ultimas[k];
      if (SGO_UTILS.safe(m.VEICULO_ID) !== vid) return;
      var rot = tipos[SGO_UTILS.safe(m.TIPO)] || SGO_UTILS.safe(m.TIPO);
      var dt = SGO_UTILS.safe(m.PROXIMA_DATA) ? FrotaR_inicioDia_(Frota_textoData_(m.PROXIMA_DATA)) : null;
      var pk = Frota_num_(m.PROXIMA_KM, NaN);
      var dk = null;
      if (isFinite(pk) && pk > 0 && kmDia) dk = Date.now() + Math.max(0, (pk - est.km) / kmDia) * 86400000;
      if (isFinite(pk) && pk > 0 && pk <= est.km) dk = Date.now();
      var quando = [dt, dk].filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; })[0];
      if (quando === undefined || quando < per.deMs || quando > per.ateMs) return;
      itens.push({ tipo: 'MANUTENCAO', ini: quando, fim: quando, rotulo: rot, vencida: quando <= Date.now(),
        detalhe: rot + ': prevista ' + (dt !== null && quando === dt ? 'para ' + FrotaR_local_(dt).data + ' (data)' : 'por volta de ' + FrotaR_local_(quando).data + ' (KM ' + FrotaR_n_(pk) + '; KM atual ' + (est.fonte === 'RASTREADOR' ? 'estimado pelo rastreador ' : '') + FrotaR_n_(est.km) + (kmDia ? ', média de ' + FrotaR_n_(kmDia, 0) + ' km/dia' : '') + ')') });
    });
    docs.forEach(function (d) {
      if (SGO_UTILS.safe(d.VEICULO_ID) !== vid || !SGO_UTILS.safe(d.VALIDADE)) return;
      if (Frota_statusDocumento_(d, vig) === 'SUBSTITUIDO') return;
      var q = FrotaR_inicioDia_(Frota_textoData_(d.VALIDADE));
      if (q === null || q < per.deMs || q > per.ateMs) return;
      itens.push({ tipo: 'DOCUMENTO', ini: q, fim: q, rotulo: SGO_UTILS.safe(d.TIPO_DOCUMENTO), vencida: q <= Date.now(), detalhe: SGO_UTILS.safe(d.TIPO_DOCUMENTO) + ' vence em ' + Frota_textoData_(d.VALIDADE) });
    });
    return { veiculoId: vid, placa: SGO_UTILS.safe(v.PLACA), modelo: SGO_UTILS.safe(v.MODELO), itens: itens.sort(function (a, b) { return a.ini - b.ini; }) };
  });
  // ações dos planos (Minhas atividades, módulo frota) em uma linha própria
  var acoes = [];
  if (typeof Atividades_todas_ === 'function') {
    try {
      Atividades_todas_().forEach(function (a) {
        if (SGO_UTILS.safe(a.MODULO) !== 'frota' || a.SITUACAO === 'Cancelada') return;
        var fim = new Date(String(a.PRAZO || '').replace(' ', 'T') + ':00-03:00').getTime();
        var ini = a.INICIO_PREVISTO ? new Date(String(a.INICIO_PREVISTO).replace(' ', 'T') + ':00-03:00').getTime() : new Date(a.CRIADO_EM || a.PRAZO).getTime();
        if (!isFinite(fim)) return;
        if (!isFinite(ini) || ini > fim) ini = fim - 86400000;
        if (!dentro(ini, fim)) return;
        acoes.push({ tipo: 'ACAO', ini: ini, fim: fim, rotulo: SGO_UTILS.safe(a.TITULO).slice(0, 60), concluida: a.SITUACAO === 'Concluída', vencida: a.SITUACAO !== 'Concluída' && fim < Date.now(),
          detalhe: SGO_UTILS.safe(a.TITULO) + ' — ' + SGO_UTILS.safe(a.RESPONSAVEL_NOME) + ', prazo ' + FrotaR_textoMs_(fim) + ' (' + a.SITUACAO + ')' });
      });
    } catch (e) {}
  }
  if (acoes.length) linhas.push({ veiculoId: '', placa: 'Ações dos planos', modelo: 'Minhas atividades', itens: acoes });
  return { ok: true, de: per.deMs, ate: per.ateMs, hoje: Date.now(), periodo: per.texto, linhas: linhas,
    legenda: [['RETIRADA', 'Retirada (em andamento com borda tracejada)'], ['PARADA', 'Parada do veículo'], ['MANUTENCAO', 'Manutenção prevista (data ou KM)'], ['DOCUMENTO', 'Documento vence'], ['ACAO', 'Ação de plano (Minhas atividades)']],
    nota: 'Reservas de veículo não existem no SGO+ hoje: o Gantt mostra as retiradas registradas. A previsão de manutenção pelo KM usa a média de km por dia dos últimos 60 dias.' };
}

// ------------------------------------------------------------
// COPILOTO
// ------------------------------------------------------------
function FrotaR_copilotoDecisoes_() {
  var m = {};
  Frota_lerSeExistir_(FROTAR_ABA_COPILOTO).forEach(function (d) { m[SGO_UTILS.safe(d.CHAVE)] = d; });
  return m;
}

/** Calcula as sugestões (regras). dias: janela de análise. Não grava nada. */
function FrotaR_sugestoes_(dias) {
  var cfg = FrotaR_cfg_();
  var hoje = FrotaR_hojeBr_();
  var per = FrotaR_periodo_(FrotaR_diasAtrasBr_(dias), hoje);
  var mes = FrotaR_mesAtual_();
  var veics = FrotaR_veiculosAtivos_();
  var cnd = FrotaR_condutores_();
  var movs = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO);
  var arm = FrotaR_armazem_();
  var out = [];
  var add = function (s) { s.gravidadeOrdem = { ALTA: 1, MEDIA: 2, BAIXA: 3 }[s.gravidade] || 3; out.push(s); };

  // 1. consumo e 2. abastecimentos
  veics.forEach(function (v) {
    var vid = SGO_UTILS.safe(v.ID);
    var c = FrotaR_consumoVeiculo_(FrotaR_abastecimentos_(vid), per, cfg);
    if (c.alerta) add({ chave: 'CONSUMO|' + vid + '|' + mes, tipo: 'CONSUMO', gravidade: c.desvioPct >= 2 * cfg.desvioConsumoPct ? 'ALTA' : 'MEDIA', veiculoId: vid, placa: SGO_UTILS.safe(v.PLACA),
      titulo: 'Veículo ' + v.PLACA + ': consumo ' + FrotaR_n_(c.desvioPct, 1) + '% acima da média do próprio veículo',
      detalhe: 'Nos últimos ' + dias + ' dias rendeu ' + FrotaR_n_(c.kmLPeriodo, 2) + ' km/L (' + FrotaR_n_(c.kmIntervalos) + ' km com ' + FrotaR_n_(c.litrosIntervalos, 2) + ' L); a média dele é ' + FrotaR_n_(c.kmLReferencia, 2) + ' km/L (' + c.intervalosHistorico + ' intervalos entre abastecimentos).',
      acao: 'Revisar o veículo (pneus calibrados, filtro de ar, injeção, freio arrastando) e conferir se os abastecimentos foram de tanque cheio.', destinos: ['CASO', 'ATIVIDADE'], casoTipo: 'CONSUMO' });
  });
  try {
    FrotaR_conferirAbastecimentos_(veics, per, cfg, !!arm).forEach(function (a) {
      a.apontamentos.forEach(function (p) {
        if (p.tipo === 'COMPROVANTE' && a.origem === 'CONDUTOR') return;
        var c = cnd[a.condutorId];
        add({ chave: 'ABAST|' + a.id + '|' + p.tipo, tipo: 'ABASTECIMENTO', gravidade: p.tipo === 'TANQUE' || p.tipo === 'POSICAO' ? 'ALTA' : 'MEDIA', veiculoId: a.veiculoId, placa: a.placa,
          condutorId: a.condutorId, condutorNome: c ? SGO_UTILS.safe(c.NOME) : '',
          titulo: 'Abastecimento de ' + a.data + ' do veículo ' + a.placa + ' a conferir', detalhe: p.texto + ' Abastecimento: ' + FrotaR_n_(a.litros, 2) + ' L, KM ' + FrotaR_n_(a.km) + (a.hora ? ', ' + a.hora : '') + '.',
          acao: c && SGO_UTILS.safe(c.USUARIO_ID) ? 'Pedir ao condutor o comprovante e a explicação.' : 'Conferir o comprovante e o registro com quem abasteceu.',
          destinos: c && SGO_UTILS.safe(c.USUARIO_ID) ? ['COMPROVANTE', 'CASO'] : ['CASO', 'ATIVIDADE'], casoTipo: 'ABASTECIMENTO', dataRef: a.data });
      });
    });
  } catch (eA) {}

  // 3. excesso de velocidade por condutor, 4. uso fora do expediente por veículo
  if (arm) {
    var porCond = {};
    var porVeic = {};
    veics.forEach(function (v) {
      var vid = SGO_UTILS.safe(v.ID);
      if (!SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID)) return;
      var pts = [];
      try { pts = arm.ler({ veiculoId: vid, de: new Date(per.deMs).toISOString(), ate: new Date(per.ateMs).toISOString(), limite: 60000 }) || []; } catch (e) { return; }
      if (!pts.length) return;
      var an = FrotaR_analisarRota_(pts, cfg);
      porVeic[vid] = { v: v, an: an };
      // atribui cada excesso à retirada que cobre o horário
      an.excessos.forEach(function (e) {
        var m = movs.filter(function (x) { if (SGO_UTILS.safe(x.VEICULO_ID) !== vid) return false; var p = FrotaR_periodoMov_(x); return e.inicioMs >= p.deMs && e.inicioMs <= p.ateMs; })[0];
        var cid = m ? SGO_UTILS.safe(m.CONDUTOR_ID) : '';
        if (!cid) return;
        var pc = porCond[cid] || (porCond[cid] = { n: 0, max: 0, retiradas: {}, placas: {} });
        pc.n++; pc.max = Math.max(pc.max, e.velMaxKmh); pc.retiradas[m.ID] = 1; pc.placas[SGO_UTILS.safe(v.PLACA)] = 1;
      });
    });
    Object.keys(porCond).forEach(function (cid) {
      var pc = porCond[cid], nRet = Object.keys(pc.retiradas).length;
      if (pc.n < 3 && nRet < 2) return;
      var c = cnd[cid] || {};
      add({ chave: 'EXCESSO|' + cid + '|' + mes, tipo: 'CONDUCAO', gravidade: pc.max >= cfg.limiteKmh + 30 ? 'ALTA' : 'MEDIA', condutorId: cid, condutorNome: SGO_UTILS.safe(c.NOME),
        veiculoId: '', placa: Object.keys(pc.placas).join(', '),
        titulo: 'Condutor ' + (SGO_UTILS.safe(c.NOME) || 'não identificado') + ': ' + pc.n + ' trechos acima de ' + cfg.limiteKmh + ' km/h',
        detalhe: pc.n + ' trechos acima do limite em ' + nRet + (nRet === 1 ? ' retirada' : ' retiradas') + ' nos últimos ' + dias + ' dias; máxima de ' + pc.max + ' km/h (veículo ' + Object.keys(pc.placas).join(', ') + '). Medido pelo rastreador.',
        acao: 'Conversar com o condutor sobre a velocidade e registrar a orientação; se repetir, avaliar no Programa de conduta.', destinos: ['ATIVIDADE', 'CASO'], casoTipo: 'CONDUCAO' });
    });
    Object.keys(porVeic).forEach(function (vid) {
      var x = porVeic[vid];
      if (x.an.foraExpediente.km < FROTAR_FORA_EXP_KM) return;
      add({ chave: 'FORA|' + vid + '|' + mes, tipo: 'USO', gravidade: 'MEDIA', veiculoId: vid, placa: SGO_UTILS.safe(x.v.PLACA),
        titulo: 'Veículo ' + x.v.PLACA + ': ' + FrotaR_n_(x.an.foraExpediente.km, 1) + ' km fora do expediente',
        detalhe: FrotaR_n_(x.an.foraExpediente.km, 1) + ' km e ' + FrotaR_duracao_(x.an.foraExpediente.min) + ' em movimento fora do expediente da frota (' + cfg.expedienteInicio + ' a ' + cfg.expedienteFim + ', ' + (cfg.sabadoExpediente ? 'segunda a sábado' : 'segunda a sexta') + ') nos últimos ' + dias + ' dias, em ' + x.an.foraExpediente.trechos.length + ' trecho(s).',
        acao: 'Conferir se o uso foi autorizado (viagem, plantão) no relatório de uso fora do expediente.', destinos: ['CASO', 'ATIVIDADE'], casoTipo: 'USO' });
    });
  }

  // 5. uso sem registro recorrente
  var usos = {};
  Frota_lerSeExistir_(typeof RASTR_ABA_ALERTAS !== 'undefined' ? RASTR_ABA_ALERTAS : 'REG_FROTA_RASTREADOR_ALERTAS').forEach(function (a) {
    if (SGO_UTILS.safeUpper(a.TIPO) !== 'USO_SEM_REGISTRO') return;
    var t = new Date(SGO_UTILS.safe(a.PRIMEIRO_EM)).getTime();
    if (!isFinite(t) || t < per.deMs) return;
    var vid = SGO_UTILS.safe(a.VEICULO_ID);
    (usos[vid] = usos[vid] || []).push(a);
  });
  Object.keys(usos).forEach(function (vid) {
    if (usos[vid].length < 2) return;
    var placa = SGO_UTILS.safe(usos[vid][0].PLACA);
    add({ chave: 'SEMREG|' + vid + '|' + mes, tipo: 'USO', gravidade: 'ALTA', veiculoId: vid, placa: placa,
      titulo: 'Veículo ' + placa + ': ' + usos[vid].length + ' usos sem retirada registrada',
      detalhe: usos[vid].length + ' alertas de uso sem registro nos últimos ' + dias + ' dias (' + usos[vid].map(function (a) { return SGO_UTILS.safe(a.QUANDO); }).slice(0, 4).join('; ') + ').',
      acao: 'Descobrir por que a retirada não está sendo registrada (chave fora do controle, pressa, sinal do celular) e combinar a regra com a equipe.', destinos: ['CASO'], casoTipo: 'USO' });
  });

  // 6. preventiva pelo KM estimado e 7. aparelho sem sinal
  var c0 = Rastreador_cfg_();
  var posicoes = c0.ligado ? (Rastreador_posicoesGuardadas_(c0, 3600) || {}) : {};
  var desl = Rastreador_deslocamentosPainel_(movs);
  var ultimas = Frota_ultimasManutencoesPorVeiculo_();
  var tipos = {};
  FROTA_CFG.TIPOS_MANUTENCAO.forEach(function (t) { tipos[t.codigo] = t.label; });
  veics.forEach(function (v) {
    var vid = SGO_UTILS.safe(v.ID);
    var est = FrotaR_kmEstimado_(v, posicoes, desl);
    Object.keys(ultimas).forEach(function (k) {
      var m = ultimas[k];
      if (SGO_UTILS.safe(m.VEICULO_ID) !== vid) return;
      var pk = Frota_num_(m.PROXIMA_KM, NaN);
      if (!isFinite(pk) || pk <= 0) return;
      var falta = pk - est.km;
      if (falta > FROTAR_PREVENTIVA_KM_AVISO) return;
      var rot = tipos[SGO_UTILS.safe(m.TIPO)] || SGO_UTILS.safe(m.TIPO);
      add({ chave: 'PREV|' + vid + '|' + SGO_UTILS.safe(m.TIPO) + '|' + pk, tipo: 'MANUTENCAO', gravidade: falta <= 0 ? 'ALTA' : 'MEDIA', veiculoId: vid, placa: SGO_UTILS.safe(v.PLACA),
        titulo: 'Veículo ' + v.PLACA + ': ' + rot + (falta <= 0 ? ' passou do KM previsto' : ' em ' + FrotaR_n_(falta) + ' km'),
        detalhe: rot + ' prevista para ' + FrotaR_n_(pk) + ' km; KM atual ' + (est.fonte === 'RASTREADOR' ? 'estimado pelo rastreador' : 'do cadastro') + ' ' + FrotaR_n_(est.km) + ' km' + (falta <= 0 ? ' (' + FrotaR_n_(-falta) + ' km além).' : '.'),
        acao: 'Agendar a manutenção com a oficina e, depois de feita, registrar em Manutenção e paradas.', destinos: ['ATIVIDADE', 'CASO'], casoTipo: 'MANUTENCAO' });
    });
    var dev = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID);
    if (c0.ligado && dev) {
      var pos = posicoes[dev];
      var ult = pos ? pos.quandoMs : 0;
      if (!ult && arm && typeof arm.ultimo === 'function') { try { var u = arm.ultimo({ deviceId: dev }); ult = u ? new Date(u.em).getTime() : 0; } catch (e2) {} }
      if (ult && Date.now() - ult > FROTAR_SEM_SINAL_HORAS * 3600000) {
        add({ chave: 'SINAL|' + vid + '|' + hoje, tipo: 'RASTREADOR', gravidade: 'MEDIA', veiculoId: vid, placa: SGO_UTILS.safe(v.PLACA),
          titulo: 'Veículo ' + v.PLACA + ': rastreador sem sinal desde ' + FrotaR_textoMs_(ult),
          detalhe: 'A última posição do aparelho é de ' + FrotaR_textoMs_(ult) + ' (mais de ' + FROTAR_SEM_SINAL_HORAS + ' horas). Sem sinal, o SGO+ não acompanha uso sem registro nem confere KM.',
          acao: 'Conferir com a empresa do rastreador se o aparelho está ligado (bateria, antena, chip) e se o veículo está parado em garagem sem sinal.', destinos: ['ATIVIDADE'], casoTipo: 'OUTRO' });
      }
    }
  });

  // 8. KM rodado sem abastecimento registrado
  var km = FrotaR_kmPeriodo_(per, veics);
  km.porVeiculo.forEach(function (x) {
    if (x.kmInformado < FROTAR_KM_SEM_ABAST) return;
    var n = FrotaR_abastecimentos_(x.veiculoId).filter(function (a) { var ms = FrotaR_msDe_(Frota_textoData_(a.DATA), '12:00'); return ms !== null && ms >= per.deMs && ms <= per.ateMs; }).length;
    if (n) return;
    var top = {};
    movs.forEach(function (m) { if (SGO_UTILS.safe(m.VEICULO_ID) !== x.veiculoId || SGO_UTILS.safeUpper(m.STATUS) !== 'FINALIZADO') return; var p = FrotaR_periodoMov_(m); if (p.ateMs < per.deMs) return; var k = Frota_num_(m.KM_CHEGADA, 0) - Frota_num_(m.KM_SAIDA, 0); if (k > 0) top[SGO_UTILS.safe(m.CONDUTOR_ID)] = (top[SGO_UTILS.safe(m.CONDUTOR_ID)] || 0) + k; });
    var cid = Object.keys(top).sort(function (a, b) { return top[b] - top[a]; })[0] || '';
    var c = cnd[cid] || {};
    add({ chave: 'SEMABAST|' + x.veiculoId + '|' + mes, tipo: 'ABASTECIMENTO', gravidade: 'MEDIA', veiculoId: x.veiculoId, placa: x.placa, condutorId: cid, condutorNome: SGO_UTILS.safe(c.NOME),
      titulo: 'Veículo ' + x.placa + ': ' + FrotaR_n_(x.kmInformado) + ' km rodados sem abastecimento registrado',
      detalhe: FrotaR_n_(x.kmInformado) + ' km em ' + x.retiradas + ' retirada(s) nos últimos ' + dias + ' dias e nenhum abastecimento lançado no período.' + (c.NOME ? ' Quem mais rodou: ' + c.NOME + ' (' + FrotaR_n_(top[cid]) + ' km).' : ''),
      acao: 'Pedir os comprovantes dos abastecimentos do período.', destinos: SGO_UTILS.safe(c.USUARIO_ID) ? ['COMPROVANTE', 'ATIVIDADE'] : ['ATIVIDADE'], casoTipo: 'ABASTECIMENTO' });
  });

  return out.sort(function (a, b) { return a.gravidadeOrdem - b.gravidadeOrdem || String(a.placa).localeCompare(String(b.placa)); });
}

/** Números citados num texto ("18,5", "1.234", "110") normalizados para comparação. */
function FrotaR_numeros_(t) {
  return (String(t || '').match(/\d[\d.]*(?:,\d+)?/g) || []).map(function (s) { return s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.').replace(/\.$/, ''); })
    .map(function (s) { return String(Number(s)); });
}

/** IA (opcional): ordena e reescreve. Texto com número fora dos fatos é descartado. Devolve { aplicada, aviso }. */
function FrotaR_copilotoIa_(lista) {
  if (!lista.length || typeof RelA4_gemini_ !== 'function') return { aplicada: false, aviso: '' };
  var entrada = lista.slice(0, 25).map(function (s) { return { chave: s.chave, titulo: s.titulo, fatos: s.detalhe, acaoSugerida: s.acao }; });
  var prompt = 'Você apoia a gestão da frota de uma empresa de engenharia clínica. Abaixo está a lista de sugestões calculadas pelo sistema a partir dos registros da frota e do rastreador (JSON).\n' +
    'Tarefa: dê a cada sugestão uma prioridade de 1 (agir hoje) a 5 (pode esperar) e escreva uma recomendação objetiva de até 240 caracteres para a gestão, ' +
    'usando SOMENTE os fatos e números de cada item (copie os números exatamente como estão, com vírgula decimal). Não invente causa, nome, valor ou data. Se não houver o que acrescentar, repita a ação sugerida.\n' +
    'Responda apenas com JSON, sem texto antes ou depois, no formato: [{"chave":"...","prioridade":1,"texto":"..."}].\n\n' + JSON.stringify(entrada);
  var txt;
  try { txt = RelA4_gemini_(prompt + '\n\n' + RELA4_REGRAS_REDACAO, { tokens: 3000, raciocinio: 4096, temperatura: 0.2 }); }
  catch (e) { return { aplicada: false, aviso: e && e.semChave ? 'A chave da IA não está cadastrada: as sugestões saem só pelas regras do sistema (funcionam do mesmo jeito).' : 'A IA não respondeu agora (' + String((e && e.message) || e).slice(0, 160) + '); as sugestões saem pelas regras do sistema.' }; }
  var resp = null;
  try { var a = txt.indexOf('['), b = txt.lastIndexOf(']'); resp = JSON.parse(txt.slice(a, b + 1)); } catch (e2) { return { aplicada: false, aviso: 'A resposta da IA veio fora do formato; as sugestões saem pelas regras do sistema.' }; }
  var porChave = {};
  lista.forEach(function (s) { porChave[s.chave] = s; });
  var aceitos = 0, recusados = 0;
  (Array.isArray(resp) ? resp : []).forEach(function (r) {
    var s = r && porChave[String(r.chave)];
    if (!s) return;
    var p = parseInt(r.prioridade, 10);
    if (p >= 1 && p <= 5) s.prioridadeIa = p;
    var t = RelA4_limparTextoIa_(String(r.texto || '')).replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!t) return;
    var permitidos = {};
    FrotaR_numeros_(s.titulo + ' ' + s.detalhe + ' ' + s.acao).forEach(function (n) { permitidos[n] = 1; });
    var estranhos = FrotaR_numeros_(t).filter(function (n) { return !permitidos[n]; });
    if (estranhos.length) { recusados++; return; }
    s.textoIa = t; aceitos++;
  });
  lista.sort(function (a, b) { return (a.prioridadeIa || 9) - (b.prioridadeIa || 9) || a.gravidadeOrdem - b.gravidadeOrdem; });
  return { aplicada: aceitos > 0, aviso: recusados ? recusados + ' recomendação(ões) da IA citavam números fora dos dados e foram trocadas pelo texto das regras.' : '' };
}

function Frota_apiRastrCopiloto(sessionId, payload) {
  FrotaR_exigirGestao_(sessionId);
  payload = payload || {};
  CertCal_garantirTabela_(FROTAR_ABA_COPILOTO, FROTAR_COLUNAS_COPILOTO);
  var dias = [30, 60, 90].indexOf(Number(payload.dias)) >= 0 ? Number(payload.dias) : 30;
  var todas = FrotaR_sugestoes_(dias);
  var dec = FrotaR_copilotoDecisoes_();
  var abertas = todas.filter(function (s) { return !dec[s.chave]; });
  var ia = payload.ia ? FrotaR_copilotoIa_(abertas) : { aplicada: false, aviso: '' };
  var decididas = Object.keys(dec).map(function (k) { return dec[k]; }).sort(function (a, b) { return String(b.DECIDIDO_EM || '').localeCompare(String(a.DECIDIDO_EM || '')); }).slice(0, 30)
    .map(function (d) { return { titulo: SGO_UTILS.safe(d.TITULO), situacao: SGO_UTILS.safeUpper(d.SITUACAO), destino: SGO_UTILS.safe(d.DESTINO), motivo: SGO_UTILS.safe(d.MOTIVO), por: SGO_UTILS.safe(d.DECIDIDO_POR_NOME), em: SGO_UTILS.safe(d.DECIDIDO_EM) ? FrotaR_textoMs_(new Date(d.DECIDIDO_EM).getTime()) : '' }; });
  return { ok: true, dias: dias, sugestoes: abertas, decididas: decididas, ia: ia.aplicada, aviso: ia.aviso, rotasGuardadas: !!FrotaR_armazem_(),
    usuarios: typeof FrotaG_usuariosAtivos_ === 'function' ? FrotaG_usuariosAtivos_() : [] };
}

/** Caso no Kanban de Gestão e melhoria a partir de uma sugestão (mesma tabela e mesmo fluxo dos outros casos). */
function FrotaR_casoDaSugestao_(sessao, s) {
  CertCal_garantirTabela_(FROTA_ABA_CASO, FROTA_COLUNAS_CASO);
  var casos = FrotaG_casos_();
  var origem = 'COP|' + s.chave;
  var ja = casos.filter(function (c) { return SGO_UTILS.safe(c.ORIGEM_CHAVE) === origem; })[0];
  if (ja) return { id: SGO_UTILS.safe(ja.ID), codigo: SGO_UTILS.safe(ja.CODIGO), jaExistia: true };
  var caso = SGO_DATA.normalizarObjetoParaSheet(FROTA_ABA_CASO, SGO_DATA.gerarRegistroBase({
    CODIGO: FrotaG_proximoCodigo_(casos), TIPO: FROTA_CASO_TIPOS[s.casoTipo] ? s.casoTipo : 'OUTRO', ORIGEM_CHAVE: origem, ORIGEM_ID: s.chave.split('|')[1] || '',
    VEICULO_ID: s.veiculoId || '', PLACA: s.placa || '', CONDUTOR_ID: s.condutorId || '', CONDUTOR_NOME: s.condutorNome || '', DATA_FATO: FrotaR_hojeBr_(),
    TITULO: String(s.titulo).slice(0, 200), DESCRICAO: (s.detalhe + ' Sugestão do copiloto: ' + s.acao).slice(0, 1500), ETAPA: 'ANALISE',
    RESPONSAVEL_ID: SGO_UTILS.safe(sessao.userId), RESPONSAVEL_NOME: SGO_UTILS.safe(sessao.nome || sessao.usuario), CICLO: 1,
    CRIADO_POR_ID: SGO_UTILS.safe(sessao.userId), CRIADO_POR_NOME: SGO_UTILS.safe(sessao.nome || sessao.usuario), ATUALIZADO_EM: SGO_UTILS.nowIso()
  }));
  caso.HISTORICO_JSON = FrotaG_hist_(null, sessao, 'ABERTO', 'Caso aberto a partir do copiloto da Frota (' + s.tipo + ').');
  SGO_DATA.insert(FROTA_ABA_CASO, caso);
  return { id: caso.ID, codigo: caso.CODIGO };
}

function Frota_apiRastrCopilotoDecidir(sessionId, payload) {
  var sessao = FrotaR_exigirGestao_(sessionId);
  payload = payload || {};
  CertCal_garantirTabela_(FROTAR_ABA_COPILOTO, FROTAR_COLUNAS_COPILOTO);
  var chave = SGO_UTILS.safe(payload.chave);
  if (FrotaR_copilotoDecisoes_()[chave]) return { ok: true, jaDecidida: true, mensagem: 'Esta sugestão já foi decidida por outra pessoa. Atualize a lista.' };
  var dias = [30, 60, 90].indexOf(Number(payload.dias)) >= 0 ? Number(payload.dias) : 30;
  var s = FrotaR_sugestoes_(dias).filter(function (x) { return x.chave === chave; })[0];
  if (!s) throw new Error('Esta sugestão não aparece mais nos dados (o problema foi resolvido ou o período mudou). Clique em Atualizar.');
  var decisao = SGO_UTILS.safeUpper(payload.decisao);
  var reg = { CHAVE: chave, TIPO: s.tipo, TITULO: String(s.titulo).slice(0, 200), VEICULO_ID: s.veiculoId || '', PLACA: s.placa || '', DECIDIDO_POR_ID: SGO_UTILS.safe(sessao.userId),
    DECIDIDO_POR_NOME: SGO_UTILS.safe(sessao.nome || sessao.usuario), DECIDIDO_EM: SGO_UTILS.nowIso() };
  var msg;
  if (decisao === 'DESCARTAR') {
    var motivo = String(payload.motivo || '').replace(/\s+/g, ' ').trim();
    if (motivo.length < 10) throw new Error('Escreva o motivo do descarte (mínimo de 10 caracteres), por exemplo: "Viagem autorizada para atendimento em outra cidade".');
    reg.SITUACAO = 'DESCARTADA'; reg.DESTINO = ''; reg.MOTIVO = motivo.slice(0, 500);
    msg = 'Sugestão descartada. O motivo fica guardado e ela não volta neste mês.';
  } else {
    var destino = SGO_UTILS.safeUpper(payload.destino);
    if (s.destinos.indexOf(destino) < 0) throw new Error('Escolha o que fazer com a sugestão: ' + s.destinos.map(function (d) { return { CASO: 'abrir caso no Kanban', ATIVIDADE: 'lançar atividade', COMPROVANTE: 'pedir comprovante' }[d]; }).join(', ') + '.');
    reg.SITUACAO = 'ACEITA'; reg.DESTINO = destino; reg.MOTIVO = '';
    if (destino === 'CASO') {
      var c = FrotaR_casoDaSugestao_(sessao, s);
      reg.REF_ID = c.id;
      msg = c.jaExistia ? 'Esta sugestão já tinha o caso ' + c.codigo + ' no Kanban.' : 'Caso ' + c.codigo + ' aberto em "Em análise" (Gestão e melhoria > Quadro dos casos).';
    } else if (destino === 'ATIVIDADE') {
      if (typeof Atividades_apiCriar !== 'function') throw new Error('Minhas atividades não está disponível nesta instalação.');
      var prazo = String(payload.prazo || '').trim() || FrotaR_local_(Date.now() + 7 * 86400000).data;
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(prazo)) throw new Error('Informe o prazo no formato dd/mm/aaaa.');
      var r = Atividades_apiCriar(sessionId, { titulo: (s.placa ? s.placa + ': ' : '') + s.acao.slice(0, 170), descricao: s.titulo + '.\n' + s.detalhe + '\nSugestão do copiloto da Frota, aceita por ' + (sessao.nome || sessao.usuario) + '.',
        prazo: prazo.split('/').reverse().join('-') + 'T18:00', prioridade: s.gravidade === 'ALTA' ? 'Alta' : 'Normal', responsavelId: SGO_UTILS.safe(payload.responsavelId) || SGO_UTILS.safe(sessao.userId),
        modulo: 'frota', moduloNome: 'Frota', porQue: s.titulo.slice(0, 300), onde: s.placa ? 'Veículo ' + s.placa : 'Frota', como: s.acao.slice(0, 500) });
      if (!r || r.ok !== true) throw new Error('A atividade não foi lançada: ' + ((r && r.message) || 'sem resposta') + ' Nada foi gravado.');
      reg.REF_ID = SGO_UTILS.safe(r.item && r.item.ID);
      msg = 'Atividade lançada em Minhas atividades (' + r.message + ').';
    } else {
      var pr = FrotaR_pedirComprovante_(sessionId, sessao, { veiculoId: s.veiculoId, condutorId: s.condutorId, dataRef: s.dataRef || '', motivo: s.titulo + '. ' + s.detalhe, prazoDias: FROTAR_PRAZO_COMPROVANTE_DIAS });
      reg.REF_ID = SGO_UTILS.safe(pr.id);
      msg = pr.mensagem;
    }
  }
  SGO_DATA.insert(FROTAR_ABA_COPILOTO, SGO_DATA.normalizarObjetoParaSheet(FROTAR_ABA_COPILOTO, SGO_DATA.gerarRegistroBase(reg)));
  SGO_DATA.log('FROTA_COPILOTO_' + reg.SITUACAO, sessao.usuario, reg.TITULO + (reg.DESTINO ? ' -> ' + reg.DESTINO : ' (' + reg.MOTIVO.slice(0, 200) + ')'), 'FROTA');
  return { ok: true, mensagem: msg };
}

// ------------------------------------------------------------
// RELATÓRIOS A4
// ------------------------------------------------------------
/** Desenho da rota em SVG (sem mapa de fundo; o PDF não carrega mapa). desenho: [[lat, lon, kmh, ms]]. */
function FrotaR_svgRota_(desenho, paradas, excessos, limite) {
  var pts = (desenho || []).filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); });
  if (pts.length < 2) return '';
  var lat0 = pts.reduce(function (s, p) { return s + p[0]; }, 0) / pts.length;
  var kx = Math.cos(lat0 * Math.PI / 180);
  var xs = pts.map(function (p) { return p[1] * kx; }), ys = pts.map(function (p) { return p[0]; });
  var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
  var W = 680, H = 380, m = 24;
  var sx = (maxX - minX) || 1e-6, sy = (maxY - minY) || 1e-6;
  var esc = Math.min((W - 2 * m) / sx, (H - 2 * m) / sy);
  var X = function (lat, lon) { return (m + (lon * kx - minX) * esc + ((W - 2 * m) - sx * esc) / 2).toFixed(1); };
  var Y = function (lat) { return (H - m - (lat - minY) * esc - ((H - 2 * m) - sy * esc) / 2).toFixed(1); };
  var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img"><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#f7f9fb" stroke="#d9e0e7"/>'];
  // trechos: azul normal; vermelho acima do limite
  var seg = [], corAtual = null;
  var fechar = function () { if (seg.length > 1) s.push('<polyline fill="none" stroke="' + corAtual + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" points="' + seg.join(' ') + '"/>'); };
  pts.forEach(function (p, i) {
    var cor = p[2] !== null && p[2] > limite ? RELA4_CORES.vermelho : RELA4_CORES.azul;
    var xy = X(p[0], p[1]) + ',' + Y(p[0]);
    if (cor !== corAtual) { fechar(); seg = i ? [seg[seg.length - 1] || xy] : []; corAtual = cor; }
    seg.push(xy);
  });
  fechar();
  (paradas || []).forEach(function (pa, i) {
    if (!isFinite(pa.lat)) return;
    s.push('<circle cx="' + X(pa.lat, pa.lon) + '" cy="' + Y(pa.lat) + '" r="7" fill="' + RELA4_CORES.laranja + '" stroke="#fff" stroke-width="1.2"/>');
    s.push(RelA4_txtSvg_(Number(X(pa.lat, pa.lon)), Number(Y(pa.lat)) + 3, String(i + 1), 'font-size="8" fill="#fff" text-anchor="middle" font-weight="bold"'));
  });
  var a = pts[0], b = pts[pts.length - 1];
  s.push('<circle cx="' + X(a[0], a[1]) + '" cy="' + Y(a[0]) + '" r="6" fill="' + RELA4_CORES.verde + '"/>' + RelA4_txtSvg_(Number(X(a[0], a[1])) + 9, Number(Y(a[0])) - 6, 'Saída', 'font-size="9" fill="#1f2933"'));
  s.push('<circle cx="' + X(b[0], b[1]) + '" cy="' + Y(b[0]) + '" r="6" fill="#1f2933"/>' + RelA4_txtSvg_(Number(X(b[0], b[1])) + 9, Number(Y(b[0])) + 12, 'Chegada', 'font-size="9" fill="#1f2933"'));
  // escala
  var kmLarg = (W - 2 * m) / esc * 111.32;
  var alvo = [0.5, 1, 2, 5, 10, 20, 50, 100, 200].filter(function (k) { return k <= kmLarg / 4; }).pop() || 0.5;
  var px = alvo / 111.32 * esc;
  s.push('<line x1="' + m + '" y1="' + (H - 10) + '" x2="' + (m + px).toFixed(1) + '" y2="' + (H - 10) + '" stroke="#1f2933" stroke-width="2"/>' + RelA4_txtSvg_(m + px + 6, H - 7, FrotaR_n_(alvo, alvo < 1 ? 1 : 0) + ' km', 'font-size="8.5" fill="#1f2933"'));
  s.push('</svg>');
  return RelA4_figura_(s.join(''), 'Trajeto registrado pelo rastreador (sem mapa de fundo; norte para cima)', [
    { cor: RELA4_CORES.azul, rotulo: 'Trajeto' }, { cor: RELA4_CORES.vermelho, rotulo: 'Acima de ' + limite + ' km/h' }, { cor: RELA4_CORES.laranja, rotulo: 'Parada (número da tabela)' },
    { cor: RELA4_CORES.verde, rotulo: 'Saída' }, { cor: '#1f2933', rotulo: 'Chegada' }]);
}

var FROTAR_NOTA_LGPD = 'Dados de localização do veículo, tratados pela Metrolabs para segurança da frota, conferência de quilometragem e consumo. Acesso restrito à gestão, com registro de quem consultou; os pontos de rota são apagados automaticamente após o prazo de guarda. O registro é do veículo, não da pessoa.';

function FrotaR_pastaRel_(placa) {
  return function () { return RelA4_subpasta_(RelA4_subpasta_(FrotaRel_obterPastaRelatorios_(), 'Rastreamento'), placa || 'Frota completa'); };
}

function FrotaR_tabelaParadas_(paradas) {
  return RelA4_tabela_([{ t: 'Nº', cen: true, w: '6%' }, { t: 'Início', nw: true }, { t: 'Fim', nw: true }, { t: 'Duração', num: true }, { t: 'Ignição' }, { t: 'Local' }],
    paradas.slice(0, 80).map(function (p, i) { return [String(i + 1), p.inicio, p.fim || 'em curso', FrotaR_duracao_(p.duracaoMin), p.ligado ? 'ligada' : 'desligada', p.endereco || ('lat. ' + FrotaR_n_(p.lat, 5) + ', long. ' + FrotaR_n_(p.lon, 5))]; }),
    { legenda: 'Paradas de ' + FROTAR_PARADA_MIN + ' minutos ou mais', vazio: 'Nenhuma parada de ' + FROTAR_PARADA_MIN + ' minutos ou mais.', compacta: true });
}
function FrotaR_tabelaExcessos_(excessos, limite) {
  return RelA4_tabela_([{ t: 'Início', nw: true }, { t: 'Duração', num: true }, { t: 'Máxima (km/h)', num: true }, { t: 'Acima do limite', num: true }],
    excessos.slice(0, 80).map(function (e) { return [e.inicio, FrotaR_duracao_(e.duracaoMin), FrotaR_n_(e.velMaxKmh), '+' + FrotaR_n_(e.velMaxKmh - limite) + ' km/h']; }),
    { legenda: 'Trechos acima de ' + limite + ' km/h', vazio: 'Nenhum trecho acima de ' + limite + ' km/h.', compacta: true });
}

function FrotaR_relRota_(sessao, movId) {
  var cfg = FrotaR_cfg_();
  var r = FrotaR_rotaRetirada_(movId, cfg);
  var an = r.analise, ret = r.retirada;
  var difTxt = ret.kmInformado !== null && an.distanciaKm ? (Math.abs(ret.kmInformado - an.distanciaKm) <= Math.max(5, ret.kmInformado * 0.05) ? 'compatível com a distância medida pela rota' : 'diferente da distância medida pela rota (' + FrotaR_n_(an.distanciaKm, 1) + ' km)') : '';
  var padrao = 'Retirada do veículo ' + ret.placa + ' por ' + ret.condutor + (ret.situacao === 'EM_ANDAMENTO' ? ', desde ' + ret.saida + ' (ainda em andamento na emissão). ' : ', de ' + ret.saida + ' a ' + ret.chegada + '. ') +
    (an.pontos ? 'O rastreador registrou ' + FrotaR_n_(an.distanciaKm, 1) + ' km de trajeto, ' + FrotaR_duracao_(an.movimentoMin) + ' em movimento e ' + FrotaR_duracao_(an.paradoMin) + ' parado, com velocidade máxima de ' + an.velMaxKmh + ' km/h. ' +
      (an.excessos.length ? 'Houve ' + an.excessos.length + ' trecho(s) acima de ' + cfg.limiteKmh + ' km/h, que merecem conversa com o condutor. ' : 'Não houve trecho acima de ' + cfg.limiteKmh + ' km/h. ') +
      (an.foraExpediente.km ? FrotaR_n_(an.foraExpediente.km, 1) + ' km foram rodados fora do expediente da frota. ' : '') : 'Não há pontos de rota guardados para este período. ') +
    (ret.kmInformado !== null ? 'O KM informado no painel foi ' + FrotaR_n_(ret.kmInformado) + ' km' + (difTxt ? ', ' + difTxt : '') + '.' : '');
  var prompt = 'Escreva a análise (2 a 3 parágrafos curtos) do relatório de rota de uma retirada de veículo da frota, para a gestão. Use só os dados abaixo.\n' +
    JSON.stringify({ veiculo: ret.placa, condutor: ret.condutor, saida: ret.saida, chegada: ret.chegada, finalidade: ret.finalidade, kmInformado: ret.kmInformado, distanciaRotaKm: an.distanciaKm,
      movimento: FrotaR_duracao_(an.movimentoMin), parado: FrotaR_duracao_(an.paradoMin), velocidadeMaxima: an.velMaxKmh, limite: cfg.limiteKmh, excessos: an.excessos.length, paradas: an.paradas.length,
      foraDoExpedienteKm: an.foraExpediente.km, atendimentos: r.atendimentos.length });
  var analise = an.pontos ? RelA4_analise_(prompt, padrao) : { texto: padrao, origem: 'PADRAO', aviso: '' };
  var corpo = RelA4_secao_('Identificação', RelA4_identificacao_([['Veículo', ret.placa + (ret.modelo ? ' — ' + ret.modelo : '')], ['Condutor', ret.condutor], ['Saída', ret.saida], ['Chegada', ret.chegada],
      ['Finalidade', ret.finalidade || '—'], ['KM informado', ret.kmInformado !== null ? FrotaR_n_(ret.kmSaida) + ' a ' + FrotaR_n_(ret.kmChegada) + ' (' + FrotaR_n_(ret.kmInformado) + ' km)' : '—']])) +
    RelA4_secao_('Resumo', RelA4_kpis_([[FrotaR_n_(an.distanciaKm, 1) + ' km', 'Trajeto medido pela rota'], [FrotaR_duracao_(an.movimentoMin), 'Em movimento'], [FrotaR_duracao_(an.paradoMin), 'Parado'],
      [an.velMaxKmh + ' km/h', 'Velocidade máxima', an.velMaxKmh > cfg.limiteKmh ? 'aviso' : ''], [String(an.excessos.length), 'Trechos acima de ' + cfg.limiteKmh + ' km/h', an.excessos.length ? 'critico' : 'ok'],
      [String(an.paradas.length), 'Paradas']]) + RelA4_paragrafos_(analise.texto)) +
    (an.pontos ? RelA4_secao_('Trajeto', FrotaR_svgRota_(an.desenho, an.paradas, an.excessos, cfg.limiteKmh)) : '') +
    RelA4_secao_('Paradas e velocidade', FrotaR_tabelaParadas_(an.paradas) + FrotaR_tabelaExcessos_(an.excessos, cfg.limiteKmh)) +
    (r.atendimentos.length ? RelA4_secao_('Atendimentos do condutor no período (Auvo)', RelA4_tabela_([{ t: 'O.S.' }, { t: 'Cliente' }, { t: 'Check-in', nw: true }, { t: 'Check-out', nw: true }, { t: 'Deslocamento', num: true }, { t: 'Km até o local', num: true }],
      r.atendimentos.map(function (x) { return [x.os, x.cliente, x.checkin, x.checkout || '—', FrotaR_duracao_(Math.max(0, x.deslocamentoMin)), x.deslocamentoKm === null ? '—' : FrotaR_n_(x.deslocamentoKm, 1)]; }),
      { legenda: 'Deslocamento desde a saída (ou o atendimento anterior) até o check-in' })) : '') +
    RelA4_secao_('Método e privacidade', '<p class="nota">Distância somada entre as posições do rastreador, sem os trechos parados e sem saltos do GPS. Parado: abaixo de 5 km/h (com a ignição desligada, abaixo de 20 km/h, oscilação normal do sinal). Limite de velocidade configurado pela gestão: ' + cfg.limiteKmh + ' km/h. A API do rastreador não informa trânsito.</p><p class="nota">' + RelA4_esc_(FROTAR_NOTA_LGPD) + '</p>') +
    RelA4_assinaturas_(['Gestão da frota']);
  var html = RelA4_documento_({ titulo: 'Relatório de rota da retirada', tituloCurto: 'Rota da retirada', sigla: 'FRT-ROT', identificacao: r.periodo.texto, emitidoPor: SGO_UTILS.safe(sessao.nome || sessao.usuario),
    ficha: [['Veículo', ret.placa], ['Condutor', ret.condutor]], corpo: corpo, tituloArquivo: 'Rota da retirada' });
  FrotaR_registrarConsulta_(sessao, 'RELATORIO', { veiculoId: SGO_UTILS.safe(r.veiculo.ID), placa: ret.placa, periodo: r.periodo.texto, detalhe: 'Relatório de rota da retirada' });
  return { html: html, analise: analise, identificador: ret.placa + ' ' + r.periodo.texto.replace(/\//g, '-').replace(/:/g, 'h'), placa: ret.placa };
}

function FrotaR_custosMes_(vid, per) {
  var soma = function (aba, campoData, campoValor) {
    var t = 0;
    Frota_lerSeExistir_(aba).forEach(function (x) { if (SGO_UTILS.safe(x.EXCLUIDO_EM) || SGO_UTILS.safe(x.VEICULO_ID) !== vid) return; var ms = FrotaR_msDe_(Frota_textoData_(x[campoData]), '12:00'); if (ms !== null && ms >= per.deMs && ms <= per.ateMs) t += Frota_num_(x[campoValor], 0); });
    return Math.round(t * 100) / 100;
  };
  return { combustivel: soma(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, 'DATA', 'VALOR'), manutencao: soma(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO, 'DATA', 'CUSTO'), despesas: soma(SGO_CFG.SHEETS.REG_FROTA_DESPESA, 'DATA', 'VALOR') };
}

function FrotaR_relVeiculoMes_(sessao, veiculoId, comp) {
  var cfg = FrotaR_cfg_();
  var v = Rastreador_veiculo_(veiculoId);
  var mes = FrotaR_mes_(comp);
  if (!mes) throw new Error('Escolha o mês do relatório (aaaa-mm).');
  var per = FrotaR_periodo_(mes.de, mes.ate);
  var vid = SGO_UTILS.safe(v.ID);
  var arm = FrotaR_armazem_();
  var an = null;
  if (arm) an = FrotaR_analisarRota_(arm.ler({ veiculoId: vid, de: new Date(per.deMs).toISOString(), ate: new Date(per.ateMs).toISOString(), limite: 60000 }) || [], cfg);
  var km = FrotaR_kmPeriodo_(per, [v]);
  var kv = km.porVeiculo[0] || { kmInformado: 0, retiradas: 0 };
  var cons = FrotaR_consumoVeiculo_(FrotaR_abastecimentos_(vid), per, cfg);
  var custos = FrotaR_custosMes_(vid, per);
  var total = custos.combustivel + custos.manutencao + custos.despesas;
  var kmBase = an && an.distanciaKm ? an.distanciaKm : kv.kmInformado;
  var abast = FrotaR_conferirAbastecimentos_([v], per, cfg, !!arm);
  var cnd = FrotaR_condutores_();
  var porCond = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function (m) {
    if (SGO_UTILS.safe(m.VEICULO_ID) !== vid || SGO_UTILS.safeUpper(m.STATUS) !== 'FINALIZADO') return;
    var p = FrotaR_periodoMov_(m);
    if (p.ateMs < per.deMs || p.ateMs > per.ateMs) return;
    var nome = SGO_UTILS.safe((cnd[SGO_UTILS.safe(m.CONDUTOR_ID)] || {}).NOME) || 'Condutor não localizado';
    var x = porCond[nome] || (porCond[nome] = { n: 0, km: 0 });
    x.n++; var k = Frota_num_(m.KM_CHEGADA, 0) - Frota_num_(m.KM_SAIDA, 0); if (k > 0) x.km += k;
  });
  var tipos = {}; FROTA_CFG.TIPOS_MANUTENCAO.forEach(function (t) { tipos[t.codigo] = t.label; });
  var manut = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO).filter(function (x) { if (SGO_UTILS.safe(x.VEICULO_ID) !== vid) return false; var ms = FrotaR_msDe_(Frota_textoData_(x.DATA), '12:00'); return ms !== null && ms >= per.deMs && ms <= per.ateMs; });
  var nomeMes = RelA4_competencia_(comp);
  var padrao = 'Em ' + nomeMes + ' o veículo ' + v.PLACA + ' rodou ' + FrotaR_n_(kv.kmInformado) + ' km informados em ' + kv.retiradas + ' retirada(s)' + (an && an.pontos ? ' (' + FrotaR_n_(an.distanciaKm, 1) + ' km medidos pela rota)' : '') + '. ' +
    (cons.kmLPeriodo !== null ? 'O consumo foi de ' + FrotaR_n_(cons.kmLPeriodo, 2) + ' km/L' + (cons.kmLReferencia ? ' para uma média de ' + FrotaR_n_(cons.kmLReferencia, 2) + ' km/L do próprio veículo' + (cons.alerta ? ', acima do desvio aceito de ' + cfg.desvioConsumoPct + '%: recomenda-se revisão' : '') : '') + '. ' : 'Não houve abastecimentos suficientes para calcular o consumo do mês. ') +
    'Os custos somaram ' + RelA4_moeda_(total) + (kmBase > 0 && total > 0 ? ' (' + RelA4_moeda_(total / kmBase) + ' por km)' : '') + '. ' +
    (an && an.pontos ? (an.excessos.length ? an.excessos.length + ' trecho(s) acima de ' + cfg.limiteKmh + ' km/h foram registrados. ' : 'Nenhum trecho acima de ' + cfg.limiteKmh + ' km/h. ') + (an.foraExpediente.km ? FrotaR_n_(an.foraExpediente.km, 1) + ' km rodados fora do expediente.' : '') : '');
  var analise = RelA4_analise_('Escreva a análise (2 a 3 parágrafos curtos) do relatório mensal de um veículo da frota para a gestão, com recomendações objetivas. Use só estes dados:\n' + JSON.stringify({
    veiculo: v.PLACA, mes: nomeMes, kmInformado: kv.kmInformado, kmRota: an ? an.distanciaKm : null, retiradas: kv.retiradas, consumoKmL: cons.kmLPeriodo, mediaVeiculoKmL: cons.kmLReferencia, desvioPct: cons.desvioPct,
    desvioAceitoPct: cfg.desvioConsumoPct, custos: custos, excessos: an ? an.excessos.length : null, velocidadeMaxima: an ? an.velMaxKmh : null, foraExpedienteKm: an ? an.foraExpediente.km : null,
    paradas: an ? an.paradas.length : null, manutencoesNoMes: manut.length, abastecimentosAConferir: abast.filter(function (a) { return a.apontamentos.length; }).length }), padrao);
  var dias = an ? Object.keys(an.porDia).filter(function (d) { return an.porDia[d].km > 0; }) : [];
  var grafico = '';
  if (dias.length >= 3) {
    var itens = [];
    for (var d = new Date(per.deMs + 3 * 3600000); d.getTime() <= per.ateMs; d = new Date(d.getTime() + 86400000)) {
      var br = FrotaR_local_(d.getTime()).data;
      itens.push({ rotulo: br.slice(0, 2), valor: an.porDia[br] ? an.porDia[br].km : 0 });
    }
    grafico = RelA4_colunas_(itens, { titulo: 'Km por dia medidos pela rota em ' + nomeMes, unidade: 'km', altura: 180 });
  }
  var corpo = RelA4_secao_('Resumo do mês', RelA4_kpis_([[FrotaR_n_(kv.kmInformado) + ' km', 'KM informado nas retiradas'], [an && an.pontos ? FrotaR_n_(an.distanciaKm, 1) + ' km' : '—', 'KM medido pela rota'],
      [cons.kmLPeriodo !== null ? FrotaR_n_(cons.kmLPeriodo, 2) + ' km/L' : '—', 'Consumo do mês', cons.alerta ? 'critico' : ''], [cons.kmLReferencia ? FrotaR_n_(cons.kmLReferencia, 2) + ' km/L' : '—', 'Média do veículo'],
      [RelA4_moeda_(total), 'Custos do mês'], [an ? String(an.excessos.length) : '—', 'Trechos acima de ' + cfg.limiteKmh + ' km/h', an && an.excessos.length ? 'aviso' : '']]) + RelA4_paragrafos_(analise.texto)) +
    (grafico ? RelA4_secao_('Uso ao longo do mês', grafico) : '') +
    RelA4_secao_('Custos', RelA4_tabela_([{ t: 'Item' }, { t: 'Valor', num: true }], [['Combustível', RelA4_moeda_(custos.combustivel)], ['Manutenção', RelA4_moeda_(custos.manutencao)], ['Outras despesas', RelA4_moeda_(custos.despesas)]],
      { total: ['Total', RelA4_moeda_(total)] })) +
    RelA4_secao_('Abastecimentos', RelA4_tabela_([{ t: 'Data', nw: true }, { t: 'Litros', num: true }, { t: 'KM', num: true }, { t: 'Valor', num: true }, { t: 'Conferência' }],
      abast.map(function (a) { return [a.data + (a.hora ? ' ' + a.hora : ''), FrotaR_n_(a.litros, 2), FrotaR_n_(a.km), RelA4_moeda_(a.valor), a.apontamentos.length ? a.apontamentos.map(function (p) { return p.texto; }).join(' ') : 'Sem apontamento'] ; }),
      { vazio: 'Nenhum abastecimento no mês.', compacta: true })) +
    RelA4_secao_('Retiradas por condutor', RelA4_tabela_([{ t: 'Condutor' }, { t: 'Retiradas', num: true }, { t: 'KM informado', num: true }],
      Object.keys(porCond).sort().map(function (n) { return [n, String(porCond[n].n), FrotaR_n_(porCond[n].km)]; }), { vazio: 'Nenhuma retirada concluída no mês.' })) +
    (an && an.pontos ? RelA4_secao_('Velocidade, paradas e horários', RelA4_kpis_([[FrotaR_duracao_(an.movimentoMin), 'Em movimento'], [FrotaR_duracao_(an.paradoMin), 'Parado'], [String(an.paradas.length), 'Paradas de 5 min ou mais'],
      [FrotaR_n_(an.foraExpediente.km, 1) + ' km', 'Fora do expediente']]) + FrotaR_tabelaExcessos_(an.excessos, cfg.limiteKmh)) : '') +
    RelA4_secao_('Manutenção', RelA4_tabela_([{ t: 'Data', nw: true }, { t: 'Tipo' }, { t: 'KM', num: true }, { t: 'Custo', num: true }, { t: 'Próxima' }],
      manut.map(function (x) { return [Frota_textoData_(x.DATA), tipos[SGO_UTILS.safe(x.TIPO)] || SGO_UTILS.safe(x.TIPO), FrotaR_n_(Frota_num_(x.KM, 0)), RelA4_moeda_(Frota_num_(x.CUSTO, 0)), [SGO_UTILS.safe(x.PROXIMA_KM) ? FrotaR_n_(Frota_num_(x.PROXIMA_KM, 0)) + ' km' : '', Frota_textoData_(x.PROXIMA_DATA)].filter(Boolean).join(' ou ') || '—']; }),
      { vazio: 'Nenhuma manutenção registrada no mês.' })) +
    RelA4_secao_('Método e privacidade', '<p class="nota">Consumo pelo método do tanque cheio (km entre dois abastecimentos divididos pelos litros do segundo); média do veículo = mediana de todo o histórico dele. Custo por km sobre o KM medido pela rota quando existe, senão sobre o KM informado. A API do rastreador não informa trânsito.</p><p class="nota">' + RelA4_esc_(FROTAR_NOTA_LGPD) + '</p>');
  var html = RelA4_documento_({ titulo: 'Relatório mensal do veículo', tituloCurto: 'Mensal do veículo', sigla: 'FRT-MES', rotuloIdentificacao: 'Competência', identificacao: nomeMes,
    emitidoPor: SGO_UTILS.safe(sessao.nome || sessao.usuario), ficha: [['Veículo', v.PLACA + (v.MODELO ? ' — ' + v.MODELO : '')]], corpo: corpo, tituloArquivo: 'Mensal do veiculo' });
  if (arm) FrotaR_registrarConsulta_(sessao, 'RELATORIO', { veiculoId: vid, placa: SGO_UTILS.safe(v.PLACA), periodo: per.texto, detalhe: 'Relatório mensal do veículo' });
  return { html: html, analise: analise, identificador: v.PLACA + ' ' + comp, placa: SGO_UTILS.safe(v.PLACA) };
}

function FrotaR_relConsumo_(sessao, de, ate) {
  var cfg = FrotaR_cfg_();
  var per = FrotaR_periodo_(de, ate, 400);
  var veics = FrotaR_veiculosAtivos_();
  var linhas = veics.map(function (v) {
    var vid = SGO_UTILS.safe(v.ID);
    var c = FrotaR_consumoVeiculo_(FrotaR_abastecimentos_(vid), per, cfg);
    var litros = 0, valor = 0;
    FrotaR_abastecimentos_(vid).forEach(function (a) { var ms = FrotaR_msDe_(Frota_textoData_(a.DATA), SGO_UTILS.safe(a.HORA) || '12:00'); if (ms !== null && ms >= per.deMs && ms <= per.ateMs) { litros += Frota_num_(a.LITROS, 0); valor += Frota_num_(a.VALOR, 0); } });
    return { placa: SGO_UTILS.safe(v.PLACA), c: c, litros: litros, valor: valor };
  });
  var abast = FrotaR_conferirAbastecimentos_(veics, per, cfg, !!FrotaR_armazem_()).filter(function (a) { return a.apontamentos.length; });
  var alertas = linhas.filter(function (l) { return l.c.alerta; });
  var padrao = 'No período de ' + per.texto + ', ' + linhas.filter(function (l) { return l.c.kmLPeriodo !== null; }).length + ' veículo(s) tiveram consumo calculado. ' +
    (alertas.length ? alertas.map(function (l) { return l.placa + ' gastou ' + FrotaR_n_(l.c.desvioPct, 1) + '% a mais que a própria média (' + FrotaR_n_(l.c.kmLPeriodo, 2) + ' contra ' + FrotaR_n_(l.c.kmLReferencia, 2) + ' km/L)'; }).join('; ') + '. Recomenda-se revisar esses veículos e confirmar se os abastecimentos foram de tanque cheio. ' : 'Nenhum veículo passou do desvio aceito de ' + cfg.desvioConsumoPct + '% em relação à própria média. ') +
    (abast.length ? abast.length + ' abastecimento(s) têm apontamento para conferir (tabela 2).' : 'Nenhum abastecimento com apontamento.');
  var analise = RelA4_analise_('Escreva a análise (2 parágrafos curtos) do relatório de consumo de combustível da frota para a gestão, com recomendações. Use só estes dados:\n' + JSON.stringify({ periodo: per.texto, desvioAceitoPct: cfg.desvioConsumoPct,
    veiculos: linhas.map(function (l) { return { placa: l.placa, kmL: l.c.kmLPeriodo, media: l.c.kmLReferencia, desvioPct: l.c.desvioPct, litros: Math.round(l.litros * 100) / 100, valor: Math.round(l.valor * 100) / 100 }; }), abastecimentosAConferir: abast.length }), padrao);
  var comKmL = linhas.filter(function (l) { return l.c.kmLPeriodo !== null; });
  var corpo = RelA4_secao_('Análise', RelA4_paragrafos_(analise.texto)) +
    RelA4_secao_('Consumo por veículo', RelA4_tabela_([{ t: 'Veículo' }, { t: 'Litros', num: true }, { t: 'Valor', num: true }, { t: 'Consumo (km/L)', num: true }, { t: 'Média do veículo', num: true }, { t: 'Desvio', num: true }],
      linhas.map(function (l) { return [l.placa, FrotaR_n_(l.litros, 2), RelA4_moeda_(l.valor), l.c.kmLPeriodo !== null ? FrotaR_n_(l.c.kmLPeriodo, 2) : '—', l.c.kmLReferencia ? FrotaR_n_(l.c.kmLReferencia, 2) : '—',
        l.c.desvioPct !== null ? RelA4_marca_((l.c.desvioPct > 0 ? '+' : '') + FrotaR_n_(l.c.desvioPct, 1) + '%', l.c.alerta ? 'critico' : 'ok') : '—']; }),
      { legenda: 'Consumo no período e média do próprio veículo (desvio positivo = gastou mais)' }) +
      (comKmL.length >= 2 ? RelA4_barras_(comKmL.map(function (l) { return { rotulo: l.placa, valor: l.c.kmLPeriodo, rotuloValor: FrotaR_n_(l.c.kmLPeriodo, 2) + ' km/L', cor: l.c.alerta ? RELA4_CORES.vermelho : RELA4_CORES.azul }; }),
        { titulo: 'Consumo por veículo no período (em vermelho, acima do desvio aceito)' }) : '')) +
    RelA4_secao_('Abastecimentos a conferir', RelA4_tabela_([{ t: 'Veículo' }, { t: 'Data', nw: true }, { t: 'Litros', num: true }, { t: 'Apontamento' }],
      abast.map(function (a) { return [a.placa, a.data + (a.hora ? ' ' + a.hora : ''), FrotaR_n_(a.litros, 2), a.apontamentos.map(function (p) { return p.texto; }).join(' ')]; }), { vazio: 'Nenhum abastecimento com apontamento no período.' })) +
    RelA4_secao_('Método', '<p class="nota">Consumo pelo método do tanque cheio: os km entre dois abastecimentos divididos pelos litros do segundo. A média do veículo é a mediana de todos os intervalos dele (mínimo de ' + FROTAR_CONSUMO_MIN_INTERVALOS + '). Desvio aceito: ' + cfg.desvioConsumoPct + '% (configurado pela gestão). Abastecimento parcial distorce o intervalo dele. Litros acima de 105% da capacidade do tanque e abastecimento sem parada do veículo no horário (com a hora informada e a rota guardada) também são apontados.</p>');
  var html = RelA4_documento_({ titulo: 'Relatório de consumo da frota', tituloCurto: 'Consumo da frota', sigla: 'FRT-CON', identificacao: per.texto, emitidoPor: SGO_UTILS.safe(sessao.nome || sessao.usuario), corpo: corpo, tituloArquivo: 'Consumo da frota' });
  return { html: html, analise: analise, identificador: 'Frota ' + per.texto.replace(/\//g, '-'), placa: '' };
}

function FrotaR_relForaExpediente_(sessao, de, ate) {
  var cfg = FrotaR_cfg_();
  var per = FrotaR_periodo_(de, ate, 93);
  var arm = FrotaR_armazem_();
  if (!arm) throw new Error(FROTAR_TEXTO_SEM_ARMAZEM);
  var movs = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO);
  var cnd = FrotaR_condutores_();
  var linhas = [], totKm = 0, totMin = 0, semRet = 0;
  FrotaR_veiculosAtivos_().forEach(function (v) {
    var vid = SGO_UTILS.safe(v.ID);
    if (!SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID)) return;
    var an = FrotaR_analisarRota_(arm.ler({ veiculoId: vid, de: new Date(per.deMs).toISOString(), ate: new Date(per.ateMs).toISOString(), limite: 60000 }) || [], cfg);
    an.foraExpediente.trechos.forEach(function (t) {
      var m = movs.filter(function (x) { if (SGO_UTILS.safe(x.VEICULO_ID) !== vid) return false; var p = FrotaR_periodoMov_(x); return t.inicioMs >= p.deMs - 600000 && t.inicioMs <= p.ateMs + 600000; })[0];
      if (!m) semRet++;
      totKm += t.km; totMin += t.duracaoMin;
      linhas.push([SGO_UTILS.safe(v.PLACA), t.inicio, t.fim.slice(-5), FrotaR_duracao_(t.duracaoMin), FrotaR_n_(t.km, 1), m ? SGO_UTILS.safe((cnd[SGO_UTILS.safe(m.CONDUTOR_ID)] || {}).NOME) + (m.FINALIDADE ? ' (' + SGO_UTILS.safe(m.FINALIDADE) + ')' : '') : RelA4_marca_('Sem retirada registrada', 'critico')]);
    });
  });
  var usos = Frota_lerSeExistir_(RASTR_ABA_ALERTAS).filter(function (a) { var t = new Date(SGO_UTILS.safe(a.PRIMEIRO_EM)).getTime(); return SGO_UTILS.safeUpper(a.TIPO) === 'USO_SEM_REGISTRO' && isFinite(t) && t >= per.deMs && t <= per.ateMs; });
  var padrao = 'No período de ' + per.texto + ' os veículos rodaram ' + FrotaR_n_(totKm, 1) + ' km em ' + linhas.length + ' trecho(s) fora do expediente da frota (' + cfg.expedienteInicio + ' a ' + cfg.expedienteFim + ', ' + (cfg.sabadoExpediente ? 'segunda a sábado' : 'segunda a sexta') + ', sem feriados). ' +
    (semRet ? semRet + ' trecho(s) não têm retirada registrada e devem ser esclarecidos. ' : 'Todos os trechos têm retirada registrada; confira se o uso foi autorizado. ') + (usos.length ? usos.length + ' alerta(s) de uso sem registro no período.' : '');
  var analise = RelA4_analise_('Escreva a análise (2 parágrafos curtos) do relatório de uso fora do expediente dos veículos da frota para a gestão. Lembre que uso fora do horário pode ser autorizado (viagem, plantão). Use só estes dados:\n' + JSON.stringify({ periodo: per.texto, trechos: linhas.length, km: Math.round(totKm * 10) / 10, minutos: totMin, semRetirada: semRet, alertasUsoSemRegistro: usos.length }), padrao);
  var corpo = RelA4_secao_('Resumo', RelA4_kpis_([[FrotaR_n_(totKm, 1) + ' km', 'Fora do expediente'], [FrotaR_duracao_(totMin), 'Em movimento'], [String(linhas.length), 'Trechos'], [String(semRet), 'Sem retirada registrada', semRet ? 'critico' : 'ok']]) + RelA4_paragrafos_(analise.texto)) +
    RelA4_secao_('Trechos fora do expediente', RelA4_tabela_([{ t: 'Veículo' }, { t: 'Início', nw: true }, { t: 'Fim', nw: true }, { t: 'Duração', num: true }, { t: 'Km', num: true }, { t: 'Retirada (condutor)' }], linhas, { vazio: 'Nenhum uso fora do expediente no período.', compacta: true })) +
    RelA4_secao_('Uso sem registro (alertas do rastreador)', RelA4_tabela_([{ t: 'Veículo' }, { t: 'Quando', nw: true }, { t: 'Situação' }, { t: 'Conferência' }],
      usos.map(function (a) { return [SGO_UTILS.safe(a.PLACA), SGO_UTILS.safe(a.QUANDO), SGO_UTILS.safeUpper(a.SITUACAO) === 'ABERTO' ? 'Aberto' : 'Conferido', SGO_UTILS.safe(a.RESOLUCAO) || '—']; }), { vazio: 'Nenhum alerta de uso sem registro no período.' })) +
    RelA4_secao_('Método e privacidade', '<p class="nota">Expediente da frota configurado pela gestão: ' + cfg.expedienteInicio + ' a ' + cfg.expedienteFim + ', ' + (cfg.sabadoExpediente ? 'segunda a sábado' : 'segunda a sexta') + '; feriados do SGO+ contam como fora do expediente. Conta só o tempo em movimento.</p><p class="nota">' + RelA4_esc_(FROTAR_NOTA_LGPD) + '</p>');
  var html = RelA4_documento_({ titulo: 'Relatório de uso fora do expediente', tituloCurto: 'Uso fora do expediente', sigla: 'FRT-FEX', identificacao: per.texto, emitidoPor: SGO_UTILS.safe(sessao.nome || sessao.usuario), corpo: corpo, tituloArquivo: 'Uso fora do expediente' });
  FrotaR_registrarConsulta_(sessao, 'RELATORIO', { periodo: per.texto, detalhe: 'Relatório de uso fora do expediente' });
  return { html: html, analise: analise, identificador: 'Frota ' + per.texto.replace(/\//g, '-'), placa: '' };
}

function Frota_apiRastrRelatorio(sessionId, payload) {
  var sessao = FrotaR_exigirGestao_(sessionId);
  payload = payload || {};
  var tipo = SGO_UTILS.safeUpper(payload.tipo);
  var r;
  if (tipo === 'ROTA') r = FrotaR_relRota_(sessao, payload.movimentacaoId);
  else if (tipo === 'VEICULO_MES') r = FrotaR_relVeiculoMes_(sessao, payload.veiculoId, payload.competencia);
  else if (tipo === 'CONSUMO') r = FrotaR_relConsumo_(sessao, payload.de, payload.ate);
  else if (tipo === 'FORA_EXPEDIENTE') r = FrotaR_relForaExpediente_(sessao, payload.de, payload.ate);
  else throw new Error('Escolha o relatório: rota da retirada, mensal do veículo, consumo da frota ou uso fora do expediente.');
  var gravacao = RelA4_salvar_(FrotaR_pastaRel_(r.placa), r.identificador, r.html, { compartilhar: true });
  SGO_DATA.log('FROTA_RASTREAMENTO_RELATORIO', sessao.usuario, tipo + ' ' + r.identificador + ' (análise: ' + (r.analise.origem === 'IA' ? 'IA' : 'texto padrão') + ')', 'FROTA');
  return { ok: true, html: RelA4_injetarAvisos_(gravacao.html, RelA4_avisosPadrao_(gravacao, [r.analise])), link: gravacao.pdfUrl, htmlUrl: gravacao.htmlUrl, pastaUrl: gravacao.pastaUrl,
    analise: r.analise.origem, aviso: [gravacao.aviso, r.analise.aviso].filter(Boolean).join(' ') };
}
