/****************************************************
 * FROTA — PLANO DE MANUTENÇÃO POR VEÍCULO (30/10/2026)
 *
 * Achado do estudo de 30/10/2026: o aviso de manutenção só nascia de uma manutenção registrada com "próxima troca";
 * três dos quatro veículos não tinham nenhuma e ninguém era avisado da troca de óleo. Agora cada veículo tem um plano
 * (óleo e filtros, freios, pneus, alinhamento, correia, arrefecimento, bateria, revisão), cada item com intervalo em km
 * e em meses (vence o que chegar primeiro), a última vez feita (data e KM) e o aviso antecipado:
 *   - faltam 1.000 km ou 30 dias: aviso no sistema para a gestão;
 *   - faltam 500 km ou 15 dias: "a vencer" (e-mail de resumo da gestão pela central de pendências);
 *   - vencido: aviso a cada dia; na retirada o condutor vê o aviso; óleo ou freio vencido há mais de 1.000 km trava
 *     a retirada até a gestão liberar (decisão do dono, 30/10/2026: recomendação do estudo).
 * Item sem a última troca informada vira a pendência "Plano de manutenção incompleto" para a gestão preencher.
 * A manutenção registrada em Frota > Manutenção e paradas atualiza o item sozinha (pelo tipo).
 * Licenciamento, seguro e IPVA continuam nos documentos do veículo (validade) e aparecem no mesmo quadro.
 * Intervalos iniciais: uso severo (atendimento urbano, muitas partidas curtas), a gestão ajusta pelo manual do veículo.
 ****************************************************/

var FROTAPLANO_ABA = 'REG_FROTA_PLANO_MANUTENCAO';
var FROTAPLANO_COLUNAS = ['ID', 'VEICULO_ID', 'ITEM', 'INTERVALO_KM', 'INTERVALO_MESES', 'ULTIMA_DATA', 'ULTIMA_KM', 'FONTE_INTERVALO', 'OBSERVACAO',
  'LIBERADO_ATE_KM', 'LIBERADO_EM', 'LIBERADO_POR', 'LIBERADO_MOTIVO', 'ATUALIZADO_EM', 'ATUALIZADO_POR', 'CRIADO_EM'];
var FROTAPLANO_AVISO_KM = 1000, FROTAPLANO_AVISO_DIAS = 30;
var FROTAPLANO_PERTO_KM = 500, FROTAPLANO_PERTO_DIAS = 15;
var FROTAPLANO_TRAVA_KM = 1000;          // óleo ou freio vencido há mais disto trava a retirada
var FROTAPLANO_LIBERACAO_KM = 500;       // liberação da gestão vale por mais estes km
// tipos: códigos de FROTA_CFG.TIPOS_MANUTENCAO que contam como "feito" para o item.
var FROTAPLANO_ITENS = [
  { codigo: 'OLEO', rotulo: 'Óleo do motor e filtro de óleo', km: 5000, meses: 6, critico: true, tipos: ['OLEO', 'FILTRO_OLEO'], nome: 'a última troca de óleo' },
  { codigo: 'FILTRO_AR', rotulo: 'Filtro de ar e filtro de cabine', km: 10000, meses: 12, tipos: ['FILTRO_AR'], nome: 'a última troca do filtro de ar' },
  { codigo: 'FILTRO_COMBUSTIVEL', rotulo: 'Filtro de combustível', km: 20000, meses: 12, tipos: ['FILTRO_COMBUSTIVEL'], nome: 'a última troca do filtro de combustível' },
  { codigo: 'FREIOS', rotulo: 'Pastilhas e discos de freio (inspeção)', km: 10000, meses: null, critico: true, tipos: ['FREIOS'], nome: 'a última revisão dos freios' },
  { codigo: 'FLUIDO_FREIO', rotulo: 'Fluido de freio', km: null, meses: 24, tipos: ['FLUIDO_FREIO'], nome: 'a última troca do fluido de freio' },
  { codigo: 'ALINHAMENTO', rotulo: 'Pneus: rodízio, alinhamento e balanceamento', km: 10000, meses: null, tipos: ['ALINHAMENTO'], nome: 'o último alinhamento e balanceamento' },
  { codigo: 'PNEUS', rotulo: 'Pneus: troca (ou antes, pela medida do sulco)', km: 40000, meses: null, tipos: ['PNEUS'], nome: 'a última troca de pneus' },
  { codigo: 'CORREIA', rotulo: 'Correia dentada', km: null, meses: null, tipos: ['CORREIA'], nome: 'a última troca da correia dentada', semPadrao: true },
  { codigo: 'ARREFECIMENTO', rotulo: 'Líquido de arrefecimento', km: null, meses: 24, tipos: ['ARREFECIMENTO'], nome: 'a última troca do líquido de arrefecimento' },
  { codigo: 'BATERIA', rotulo: 'Bateria (teste)', km: null, meses: 12, tipos: ['BATERIA'], nome: 'o último teste da bateria' },
  { codigo: 'REVISAO', rotulo: 'Revisão geral', km: 10000, meses: 12, tipos: ['REVISAO'], nome: 'a última revisão geral' }
];
var FROTAPLANO_DOCS = ['CRLV', 'LICENCIAMENTO', 'SEGURO', 'IPVA'];

function FrotaPlano_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function FrotaPlano_item_(codigo) { return FROTAPLANO_ITENS.filter(function (i) { return i.codigo === FrotaPlano_s_(codigo).toUpperCase(); })[0] || null; }
function FrotaPlano_garantirAbas_() { CertCal_garantirTabela_(FROTAPLANO_ABA, FROTAPLANO_COLUNAS); CertCal_forcarColunaTexto_(FROTAPLANO_ABA, 'ULTIMA_DATA'); }
function FrotaPlano_linhas_() { return Frota_lerSeExistir_(FROTAPLANO_ABA); }

/** dd/mm/aaaa + n meses (último dia do mês quando o dia não existe). */
function FrotaPlano_somarMeses_(br, n) {
  var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(FrotaPlano_s_(br));
  if (!m || !n) return '';
  var a = Number(m[3]), me = Number(m[2]) - 1 + Number(n), d = Number(m[1]);
  a += Math.floor(me / 12); me = ((me % 12) + 12) % 12;
  var ult = new Date(Date.UTC(a, me + 1, 0)).getUTCDate();
  return ('0' + Math.min(d, ult)).slice(-2) + '/' + ('0' + (me + 1)).slice(-2) + '/' + a;
}

/** Última manutenção registrada de cada tipo do veículo (pela data, depois pelo KM). Manutenção excluída fica de fora. */
function FrotaPlano_manutPorTipo_(veiculoId) {
  var out = {};
  Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO).forEach(function (m) {
    if (FrotaPlano_s_(m.VEICULO_ID) !== FrotaPlano_s_(veiculoId)) return;
    var t = FrotaPlano_s_(m.TIPO).toUpperCase(), d = Frota_dataDia_(m.DATA);
    var x = { data: Frota_textoData_(m.DATA), km: Frota_num_(m.KM, NaN), ms: d ? d.getTime() : -1, id: FrotaPlano_s_(m.ID) };
    var atual = out[t];
    if (!atual || x.ms > atual.ms || (x.ms === atual.ms && (x.km || 0) > (atual.km || 0))) out[t] = x;
  });
  return out;
}

/**
 * Plano de um veículo: um objeto por item com a situação. kmAtual = KM do cadastro (atualizado em toda retirada e devolução).
 * situacao: OK, AVISO (faltam até 1.000 km ou 30 dias), VENCENDO (até 500 km ou 15 dias), VENCIDO, SEM_HISTORICO, SEM_INTERVALO.
 */
function FrotaPlano_doVeiculo_(veiculo, linhas, manut) {
  var vid = FrotaPlano_s_(veiculo.ID);
  linhas = (linhas || FrotaPlano_linhas_()).filter(function (l) { return FrotaPlano_s_(l.VEICULO_ID) === vid; });
  manut = manut || FrotaPlano_manutPorTipo_(vid);
  var kmAtual = Frota_num_(veiculo.KM_ATUAL, 0);
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return FROTAPLANO_ITENS.map(function (it) {
    var l = linhas.filter(function (x) { return FrotaPlano_s_(x.ITEM).toUpperCase() === it.codigo; })[0] || {};
    var ik = FrotaPlano_s_(l.INTERVALO_KM) !== '' ? Frota_num_(l.INTERVALO_KM, null) : it.km;
    var im = FrotaPlano_s_(l.INTERVALO_MESES) !== '' ? Frota_num_(l.INTERVALO_MESES, null) : it.meses;
    ik = ik > 0 ? ik : null; im = im > 0 ? im : null;
    var ult = { data: Frota_textoData_(l.ULTIMA_DATA), km: FrotaPlano_s_(l.ULTIMA_KM) !== '' ? Frota_num_(l.ULTIMA_KM, null) : null, origem: FrotaPlano_s_(l.ULTIMA_DATA) || FrotaPlano_s_(l.ULTIMA_KM) ? 'informado pela gestão' : '' };
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(ult.data)) ult.data = '';
    var ultMs = ult.data ? Frota_dataDia_(ult.data).getTime() : -1;
    it.tipos.forEach(function (t) {
      var m = manut[t];
      if (!m) return;
      if (m.ms > ultMs || (m.ms === ultMs && isFinite(m.km) && (ult.km === null || m.km > ult.km))) { ult = { data: m.data, km: isFinite(m.km) ? m.km : null, origem: 'manutenção registrada', manutencaoId: m.id }; ultMs = m.ms; }
    });
    var proxKm = ik && ult.km !== null ? ult.km + ik : null;
    var proxData = im && ult.data ? FrotaPlano_somarMeses_(ult.data, im) : '';
    var faltamKm = proxKm !== null ? proxKm - kmAtual : null;
    var faltamDias = proxData ? Math.ceil((Frota_dataDia_(proxData).getTime() - hoje.getTime()) / 86400000) : null;
    var faltaInfo = [];
    if (ik && ult.km === null) faltaInfo.push('o KM');
    if (im && !ult.data) faltaInfo.push('a data');
    var sit;
    if (!ik && !im) sit = 'SEM_INTERVALO';
    else if (faltamKm === null && faltamDias === null) sit = 'SEM_HISTORICO';
    else if ((faltamKm !== null && faltamKm < 0) || (faltamDias !== null && faltamDias < 0)) sit = 'VENCIDO';
    else if ((faltamKm !== null && faltamKm <= FROTAPLANO_PERTO_KM) || (faltamDias !== null && faltamDias <= FROTAPLANO_PERTO_DIAS)) sit = 'VENCENDO';
    else if ((faltamKm !== null && faltamKm <= FROTAPLANO_AVISO_KM) || (faltamDias !== null && faltamDias <= FROTAPLANO_AVISO_DIAS)) sit = 'AVISO';
    else sit = 'OK';
    var porData = faltamDias !== null && (faltamKm === null || (faltamDias < 0 && faltamKm >= 0) || (sit !== 'VENCIDO' && faltamDias <= FROTAPLANO_AVISO_DIAS && !(faltamKm !== null && faltamKm <= FROTAPLANO_AVISO_KM)));
    var liberadoAte = FrotaPlano_s_(l.LIBERADO_ATE_KM) !== '' ? Frota_num_(l.LIBERADO_ATE_KM, null) : null;
    var trava = !!it.critico && faltamKm !== null && faltamKm < -FROTAPLANO_TRAVA_KM && !(liberadoAte !== null && liberadoAte >= kmAtual);
    return { codigo: it.codigo, rotulo: it.rotulo, nome: it.nome, critico: !!it.critico, intervaloKm: ik, intervaloMeses: im, intervaloPadrao: FrotaPlano_s_(l.INTERVALO_KM) === '' && FrotaPlano_s_(l.INTERVALO_MESES) === '',
      fonteIntervalo: FrotaPlano_s_(l.FONTE_INTERVALO) || (it.semPadrao ? 'informe pelo manual do veículo' : 'padrão do SGO+ para uso severo (ajuste pelo manual do veículo)'),
      ultimaData: ult.data, ultimaKm: ult.km, ultimaOrigem: ult.origem, proximaKm: proxKm, proximaData: proxData, faltamKm: faltamKm, faltamDias: faltamDias, situacao: sit,
      vencimentoPorData: porData, incompleto: (sit !== 'SEM_INTERVALO') && faltaInfo.length > 0, faltaInfo: faltaInfo, trava: trava, liberadoAteKm: liberadoAte,
      liberadoPor: FrotaPlano_s_(l.LIBERADO_POR), liberadoMotivo: FrotaPlano_s_(l.LIBERADO_MOTIVO), observacao: FrotaPlano_s_(l.OBSERVACAO), linhaId: FrotaPlano_s_(l.ID), kmAtual: kmAtual };
  });
}

function FrotaPlano_textoFalta_(i) {
  if (i.situacao !== 'VENCIDO') return i.situacao === 'SEM_HISTORICO' ? 'sem a última troca informada' : '';
  var p = [];
  if (i.faltamKm !== null && i.faltamKm < 0) p.push('vencido há ' + Frota_kmTexto_(-i.faltamKm) + ' km');
  if (i.faltamDias !== null && i.faltamDias < 0) p.push('vencido desde ' + i.proximaData);
  return p.join(' e ');
}

/**
 * Para Frota_calcularAlertasManutencao_: acrescenta os alertas do plano (VENCIDO, e VENCENDO para "a vencer" e o aviso de
 * 1.000 km/30 dias) e devolve os tipos de manutenção cobertos pelo plano (o registro antigo deixa de avisar por eles).
 */
function FrotaPlano_alertas_(veiculos, alertas) {
  var cobertos = {};
  FROTAPLANO_ITENS.forEach(function (it) { it.tipos.forEach(function (t) { cobertos[t] = true; }); });
  var linhas = FrotaPlano_linhas_();
  Object.keys(veiculos || {}).forEach(function (vid) {
    var v = veiculos[vid];
    FrotaPlano_doVeiculo_(v, linhas).forEach(function (i) {
      if (['VENCIDO', 'VENCENDO', 'AVISO'].indexOf(i.situacao) < 0) return;
      alertas.push({ veiculoId: FrotaPlano_s_(v.ID), veiculoPlaca: FrotaPlano_s_(v.PLACA), tipo: i.codigo, tipoLabel: i.rotulo, status: i.situacao === 'VENCIDO' ? 'VENCIDO' : 'VENCENDO',
        categoria: 'MANUTENCAO', vencimento: i.vencimentoPorData ? i.proximaData : '', origem: 'PLANO', faltamKm: i.faltamKm, proximaKm: i.proximaKm, trava: i.trava });
    });
  });
  return cobertos;
}

/** Retirada: óleo/freio vencido há mais de 1.000 km trava (até a gestão liberar); outro vencido só avisa. Devolve o aviso ou ''. */
function FrotaPlano_conferirRetirada_(veiculo) {
  var itens;
  try { itens = FrotaPlano_doVeiculo_(veiculo); } catch (e) { console.error('Plano de manutenção na retirada: ' + ((e && e.message) || e)); return ''; }
  var travam = itens.filter(function (i) { return i.trava; });
  if (travam.length) {
    throw new Error('Retirada travada: o veículo ' + FrotaPlano_s_(veiculo.PLACA) + ' está com ' + travam.map(function (i) { return i.rotulo.toLowerCase() + ' ' + FrotaPlano_textoFalta_(i); }).join(' e ') + '. ' +
      'Por quê: rodar com óleo ou freio vencido há mais de ' + Frota_kmTexto_(FROTAPLANO_TRAVA_KM) + ' km arrisca o motor e a segurança. ' +
      'O que fazer: escolha outro veículo, ou peça à gestão para levar o veículo à manutenção ou liberar o uso (Frota > Manutenção e paradas > Plano de manutenção > Liberar uso, com o motivo). Depois, toque em Confirmar retirada de novo.');
  }
  var venc = itens.filter(function (i) { return i.situacao === 'VENCIDO'; });
  if (!venc.length) return '';
  return 'Manutenção vencida neste veículo: ' + venc.map(function (i) { return i.rotulo.toLowerCase() + ' (' + FrotaPlano_textoFalta_(i) + ')'; }).join('; ') + '. A gestão já foi avisada.';
}

// ------------------------------------------------------------
// TELA (só a gestão)
// ------------------------------------------------------------
function FrotaPlano_exigirGestao_(sessionId) {
  var s = Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  Frota_bootstrap_(); FrotaPlano_garantirAbas_();
  return s;
}

function Frota_apiPlanoListar(sessionId) {
  FrotaPlano_exigirGestao_(sessionId);
  var linhas = FrotaPlano_linhas_();
  var docs = Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO);
  var vig = Frota_documentosVigentes_(docs);
  var veiculos = Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).filter(function (v) { return FrotaPlano_s_(v.STATUS).toUpperCase() !== 'INATIVO'; })
    .sort(function (a, b) { return FrotaPlano_s_(a.PLACA).localeCompare(FrotaPlano_s_(b.PLACA)); }).map(function (v) {
      var itens = FrotaPlano_doVeiculo_(v, linhas);
      var documentos = FROTAPLANO_DOCS.map(function (t) {
        var d = docs.filter(function (x) { return FrotaPlano_s_(x.VEICULO_ID) === FrotaPlano_s_(v.ID) && FrotaPlano_s_(x.TIPO_DOCUMENTO).toUpperCase() === t && Frota_statusDocumento_(x, vig) !== 'SUBSTITUIDO'; })[0];
        return { tipo: t, validade: d ? Frota_textoData_(d.VALIDADE) : '', situacao: d ? Frota_statusDocumento_(d, vig) : 'SEM_DOCUMENTO' };
      });
      return { id: FrotaPlano_s_(v.ID), placa: FrotaPlano_s_(v.PLACA), modelo: FrotaPlano_s_(v.MODELO), marca: FrotaPlano_s_(v.MARCA), ano: FrotaPlano_s_(v.ANO), kmAtual: Frota_num_(v.KM_ATUAL, 0),
        itens: itens, documentos: documentos, incompletos: itens.filter(function (i) { return i.incompleto; }).length };
    });
  return { ok: true, veiculos: veiculos, limites: { avisoKm: FROTAPLANO_AVISO_KM, avisoDias: FROTAPLANO_AVISO_DIAS, pertoKm: FROTAPLANO_PERTO_KM, pertoDias: FROTAPLANO_PERTO_DIAS, travaKm: FROTAPLANO_TRAVA_KM } };
}

/**
 * Grava um item do plano (última vez feita e/ou intervalo). Só os campos enviados mudam (merge); cada um vai para a trilha.
 * payload: { veiculoId, item, ultimaData?, ultimaKm?, intervaloKm?, intervaloMeses?, fonteIntervalo?, observacao? }. "" apaga o campo.
 */
function Frota_apiPlanoSalvarItem(sessionId, payload) {
  var sessao = FrotaPlano_exigirGestao_(sessionId);
  payload = payload || {};
  var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, FrotaPlano_s_(payload.veiculoId));
  if (!v) throw new Error('Veículo não encontrado. Atualize a tela.');
  var it = FrotaPlano_item_(payload.item);
  if (!it) throw new Error('Item do plano não encontrado. Atualize a tela.');
  var kmAtual = Frota_num_(v.KM_ATUAL, 0);
  var upd = {};
  if ('ultimaData' in payload) {
    var d = FrotaPlano_s_(payload.ultimaData);
    if (d && !/^\d{2}\/\d{2}\/\d{4}$/.test(d)) throw new Error('Data da última vez inválida (' + d + '). Use dd/mm/aaaa, por exemplo 15/08/2026.');
    if (d) { var dd = Frota_dataDia_(d), hoje = new Date(); hoje.setHours(0, 0, 0, 0); if (!dd || dd.getTime() > hoje.getTime()) throw new Error('A data da última vez (' + d + ') não pode ser no futuro. Informe quando foi feita de fato (está na nota ou na etiqueta da oficina).'); }
    upd.ULTIMA_DATA = d;
  }
  if ('ultimaKm' in payload) {
    var tk = FrotaPlano_s_(payload.ultimaKm), k = tk === '' ? '' : Frota_num_(tk, NaN);
    if (k !== '' && !(k >= 0)) throw new Error('KM da última vez inválido. Use só números (exemplo: 194601).');
    if (k !== '' && k > kmAtual + 50) throw new Error('O KM da última vez (' + Frota_kmTexto_(k) + ') é maior que o KM atual do veículo ' + v.PLACA + ' (' + Frota_kmTexto_(kmAtual) + '). Confira o número na nota ou na etiqueta da oficina.');
    upd.ULTIMA_KM = k;
  }
  if ('intervaloKm' in payload) {
    var ik = FrotaPlano_s_(payload.intervaloKm) === '' ? '' : Frota_num_(payload.intervaloKm, NaN);
    if (ik !== '' && !(ik >= 500 && ik <= 200000)) throw new Error('O intervalo em km vai de 500 a 200.000 (exemplo: 5000). Deixe vazio para usar o padrão.');
    upd.INTERVALO_KM = ik;
  }
  if ('intervaloMeses' in payload) {
    var im = FrotaPlano_s_(payload.intervaloMeses) === '' ? '' : Frota_num_(payload.intervaloMeses, NaN);
    if (im !== '' && !(im >= 1 && im <= 120)) throw new Error('O intervalo em meses vai de 1 a 120 (exemplo: 6). Deixe vazio para usar o padrão.');
    upd.INTERVALO_MESES = im;
  }
  if ('fonteIntervalo' in payload) upd.FONTE_INTERVALO = FrotaPlano_s_(payload.fonteIntervalo).slice(0, 200);
  if ('observacao' in payload) upd.OBSERVACAO = FrotaPlano_s_(payload.observacao).slice(0, 500);
  var linha = FrotaPlano_linhas_().filter(function (l) { return FrotaPlano_s_(l.VEICULO_ID) === FrotaPlano_s_(v.ID) && FrotaPlano_s_(l.ITEM).toUpperCase() === it.codigo; })[0];
  var mudou = Object.keys(upd).filter(function (k) { return FrotaPlano_s_(linha ? linha[k] : '') !== FrotaPlano_s_(upd[k]); });
  if (!mudou.length) return { ok: true, mensagem: 'Nada mudou.' };
  var dif = {}; mudou.forEach(function (k) { dif[k] = upd[k]; });
  dif.ATUALIZADO_EM = SGO_UTILS.nowIso(); dif.ATUALIZADO_POR = FrotaPlano_s_(sessao.nome || sessao.usuario);
  if (linha) SGO_DATA.update(FROTAPLANO_ABA, linha.ID, dif);
  else SGO_DATA.insert(FROTAPLANO_ABA, SGO_DATA.normalizarObjetoParaSheet(FROTAPLANO_ABA, SGO_DATA.gerarRegistroBase(Object.assign({ VEICULO_ID: FrotaPlano_s_(v.ID), ITEM: it.codigo }, dif))));
  mudou.forEach(function (k) {
    Frota_auditar_(sessao, { acao: 'PLANO_MANUTENCAO', veiculoId: FrotaPlano_s_(v.ID), placa: FrotaPlano_s_(v.PLACA), campo: it.codigo + '.' + k, antes: linha ? linha[k] : '', depois: upd[k],
      detalhe: 'Plano de manutenção do veículo ' + v.PLACA + ', ' + it.rotulo + ': ' + k + ' alterado.' });
  });
  var agora = FrotaPlano_doVeiculo_(SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, v.ID)).filter(function (i) { return i.codigo === it.codigo; })[0];
  return { ok: true, item: agora, mensagem: it.rotulo + ' do veículo ' + v.PLACA + ' gravado' + (agora && agora.proximaKm !== null ? ': próxima em ' + Frota_kmTexto_(agora.proximaKm) + ' km' : '') + (agora && agora.proximaData ? (agora.proximaKm !== null ? ' ou ' : ': próxima em ') + agora.proximaData : '') + '.' };
}

/** Libera o uso do veículo com óleo/freio vencido por mais 500 km (gestão, com o motivo). */
function Frota_apiPlanoLiberar(sessionId, payload) {
  var sessao = FrotaPlano_exigirGestao_(sessionId);
  payload = payload || {};
  var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, FrotaPlano_s_(payload.veiculoId));
  if (!v) throw new Error('Veículo não encontrado. Atualize a tela.');
  var it = FrotaPlano_item_(payload.item);
  if (!it || !it.critico) throw new Error('Só óleo e freio travam a retirada; os outros itens não precisam de liberação.');
  var motivo = Frota_exigirJustificativa_(payload.motivo, ['liberar o uso do veículo com ' + it.rotulo.toLowerCase() + ' vencido'], 'troca agendada para amanhã às 8h; uso só na cidade até lá');
  var ate = Frota_num_(v.KM_ATUAL, 0) + FROTAPLANO_LIBERACAO_KM;
  var linha = FrotaPlano_linhas_().filter(function (l) { return FrotaPlano_s_(l.VEICULO_ID) === FrotaPlano_s_(v.ID) && FrotaPlano_s_(l.ITEM).toUpperCase() === it.codigo; })[0];
  var dif = { LIBERADO_ATE_KM: ate, LIBERADO_EM: SGO_UTILS.nowIso(), LIBERADO_POR: FrotaPlano_s_(sessao.nome || sessao.usuario), LIBERADO_MOTIVO: motivo, ATUALIZADO_EM: SGO_UTILS.nowIso(), ATUALIZADO_POR: FrotaPlano_s_(sessao.nome || sessao.usuario) };
  if (linha) SGO_DATA.update(FROTAPLANO_ABA, linha.ID, dif);
  else SGO_DATA.insert(FROTAPLANO_ABA, SGO_DATA.normalizarObjetoParaSheet(FROTAPLANO_ABA, SGO_DATA.gerarRegistroBase(Object.assign({ VEICULO_ID: FrotaPlano_s_(v.ID), ITEM: it.codigo }, dif))));
  Frota_auditar_(sessao, { acao: 'PLANO_LIBERADO', veiculoId: FrotaPlano_s_(v.ID), placa: FrotaPlano_s_(v.PLACA), campo: it.codigo + '.LIBERADO_ATE_KM', antes: linha ? linha.LIBERADO_ATE_KM : '', depois: ate, justificativa: motivo,
    detalhe: 'Uso do veículo ' + v.PLACA + ' liberado com ' + it.rotulo.toLowerCase() + ' vencido, até ' + Frota_kmTexto_(ate) + ' km.' });
  return { ok: true, mensagem: 'Uso liberado até ' + Frota_kmTexto_(ate) + ' km (mais ' + Frota_kmTexto_(FROTAPLANO_LIBERACAO_KM) + ' km). Registre a manutenção assim que for feita.' };
}

// ------------------------------------------------------------
// CENTRAL DE PENDÊNCIAS: PLANO INCOMPLETO (um por veículo, com a lista do que falta)
// ------------------------------------------------------------
function FrotaPlano_pendencias_(add) {
  if (typeof Pend_item_ !== 'function' || typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.frota_plano_incompleto) return;
  if (!Pend_abaExiste_(SGO_CFG.SHEETS.CAD_VEICULOS)) return;
  var linhas = FrotaPlano_linhas_();
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function (v) {
    if (FrotaPlano_s_(v.STATUS).toUpperCase() === 'INATIVO') return;
    var falta = FrotaPlano_doVeiculo_(v, linhas).filter(function (i) { return i.incompleto; });
    if (!falta.length) return;
    var placa = FrotaPlano_s_(v.PLACA);
    var rot = typeof FrotaId_rotuloRapido_ === 'function' ? FrotaId_rotuloRapido_(placa) : placa;
    var oleo = falta.filter(function (i) { return i.codigo === 'OLEO'; })[0];
    add(Pend_item_('frota_plano_incompleto', {
      id: 'FROTA:PLANO:' + FrotaPlano_s_(v.ID), nome: rot, publico: 'GESTAO', responsavel: 'Responsável da frota', gravidade: oleo ? 'CRITICO' : 'ATENCAO', dias: null,
      titulo: 'Plano de manutenção incompleto: informe ' + (oleo ? oleo.nome : falta[0].nome) + ' do ' + rot + (falta.length > 1 ? ' (e mais ' + (falta.length - 1) + (falta.length === 2 ? ' item' : ' itens') + ')' : ''),
      detalhe: 'Sem a última vez feita (data e KM), o SGO+ não sabe quando vence: ' + falta.map(function (i) { return i.rotulo.toLowerCase() + ' (falta ' + i.faltaInfo.join(' e ') + ')'; }).join('; ') + '.',
      oQueFazer: 'Em Frota > Manutenção e paradas > Plano de manutenção, veículo ' + rot + ', toque em "Informar" em cada item e preencha a data e o KM da última vez (estão na nota ou na etiqueta da oficina). Se não souber, informe a data e o KM de hoje depois de fazer a manutenção.',
      textoEstavel: 'O plano de manutenção do veículo \'' + placa + '\' está incompleto.'
    }));
  });
}
