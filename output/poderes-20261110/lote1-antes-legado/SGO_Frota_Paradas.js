/****************************************************
 * FROTA — AGENDAR PARADA A PARTIR DO PLANO DE MANUTENÇÃO (30/10/2026, leva 2)
 *
 * Do item vencido ou perto de vencer no plano de manutenção, a gestão toca em "Agendar parada" (data, oficina, o que
 * fazer, quem leva). A parada:
 *  - usa a manutenção programada das Reservas (SGO_Frota_Reservas.js, FrotaRes_criar_ com tipo MANUTENCAO): o veículo fica
 *    indisponível para reserva e retirada no período, com a mensagem de quem, quando e o que fazer;
 *  - aparece na agenda única (Minhas atividades) de quem leva o carro, como atividade com início e prazo;
 *  - ao concluir: itens feitos, KM, data, custo e nota fiscal (obrigatória quando há custo). Cada item feito vira uma
 *    manutenção registrada (que zera o item no plano: a próxima conta a partir dela) e entra na conferência de gastos
 *    como "Oficina e manutenção". A manutenção programada é encerrada (o veículo volta a ficar livre) e a atividade concluída.
 * Nada é apagado: cancelar exige o motivo e cancela a manutenção programada e a atividade.
 ****************************************************/

var FROTAPAR_ABA = 'REG_FROTA_PARADA_AGENDADA';
var FROTAPAR_COLUNAS = ['ID', 'VEICULO_ID', 'PLACA', 'ITENS_JSON', 'DATA_INICIO', 'HORA_INICIO', 'DATA_FIM', 'HORA_FIM', 'OFICINA', 'O_QUE_FAZER',
  'RESPONSAVEL_ID', 'RESPONSAVEL_NOME', 'RESERVA_ID', 'RESERVA_CODIGO', 'ATIVIDADE_ID', 'SITUACAO', 'AGENDADA_POR', 'AGENDADA_EM',
  'CONCLUIDA_EM', 'CONCLUIDA_POR', 'DATA_REALIZADA', 'KM_REALIZADA', 'CUSTO', 'NOTA_LINK', 'MANUTENCOES_JSON', 'OBSERVACAO',
  'CANCELADA_EM', 'CANCELADA_POR', 'CANCELADA_MOTIVO', 'CRIADO_EM'];

function FrotaPar_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function FrotaPar_garantirAbas_() { CertCal_garantirTabela_(FROTAPAR_ABA, FROTAPAR_COLUNAS); ['DATA_INICIO', 'DATA_FIM', 'DATA_REALIZADA', 'HORA_INICIO', 'HORA_FIM'].forEach(function (c) { CertCal_forcarColunaTexto_(FROTAPAR_ABA, c); }); }
function FrotaPar_todas_() { return Frota_lerSeExistir_(FROTAPAR_ABA); }
function FrotaPar_json_(t) { try { var v = JSON.parse(FrotaPar_s_(t)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function FrotaPar_iso_(br) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(FrotaPar_s_(br)); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
function FrotaPar_exigirGestao_(sessionId) {
  var s = Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  Frota_bootstrap_(); FrotaPar_garantirAbas_(); if (typeof FrotaGas_garantirAbas_ === 'function') FrotaGas_garantirAbas_();
  return s;
}
function FrotaPar_itens_(codigos) {
  return (Array.isArray(codigos) ? codigos : [codigos]).map(function (c) { return FrotaPlano_item_(c); }).filter(Boolean)
    .filter(function (it, i, l) { return l.indexOf(it) === i; });
}
function FrotaPar_paraTela_(p) {
  var itens = FrotaPar_json_(p.ITENS_JSON);
  return { id: FrotaPar_s_(p.ID), veiculoId: FrotaPar_s_(p.VEICULO_ID), placa: FrotaPar_s_(p.PLACA), rotulo: typeof FrotaId_rotuloRapido_ === 'function' ? FrotaId_rotuloRapido_(FrotaPar_s_(p.PLACA)) : FrotaPar_s_(p.PLACA),
    itens: itens, itensTexto: itens.map(function (c) { var it = FrotaPlano_item_(c); return it ? it.rotulo : c; }).join('; '),
    inicio: FrotaPar_s_(p.DATA_INICIO) + ' ' + FrotaPar_s_(p.HORA_INICIO), fim: FrotaPar_s_(p.DATA_FIM) + ' ' + FrotaPar_s_(p.HORA_FIM), dataInicio: FrotaPar_s_(p.DATA_INICIO),
    oficina: FrotaPar_s_(p.OFICINA), oQueFazer: FrotaPar_s_(p.O_QUE_FAZER), responsavel: FrotaPar_s_(p.RESPONSAVEL_NOME), situacao: FrotaPar_s_(p.SITUACAO).toUpperCase(),
    reservaCodigo: FrotaPar_s_(p.RESERVA_CODIGO), agendadaPor: FrotaPar_s_(p.AGENDADA_POR), dataRealizada: FrotaPar_s_(p.DATA_REALIZADA), kmRealizada: Frota_num_(p.KM_REALIZADA, null),
    custo: Frota_num_(p.CUSTO, null), nota: FrotaPar_s_(p.NOTA_LINK), concluidaPor: FrotaPar_s_(p.CONCLUIDA_POR), canceladaMotivo: FrotaPar_s_(p.CANCELADA_MOTIVO), observacao: FrotaPar_s_(p.OBSERVACAO) };
}
/** Paradas agendadas (abertas) de um veículo, para o plano mostrar "parada agendada". */
function FrotaPar_agendadasVeiculo_(veiculoId) {
  return FrotaPar_todas_().filter(function (p) { return FrotaPar_s_(p.VEICULO_ID) === FrotaPar_s_(veiculoId) && FrotaPar_s_(p.SITUACAO).toUpperCase() === 'AGENDADA'; }).map(FrotaPar_paraTela_);
}

/**
 * payload: { veiculoId, itens: [códigos do plano], dataInicio, horaInicio?, dataFim?, horaFim?, oficina, oQueFazer?, responsavelId? }.
 * Devolve { ok:true, id, mensagem } ou, com o veículo ocupado no período, { ok:false, conflito:true, message, livres }.
 */
function Frota_apiParadaAgendar(sessionId, payload) {
  var sessao = FrotaPar_exigirGestao_(sessionId);
  payload = payload || {};
  var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, FrotaPar_s_(payload.veiculoId));
  if (!v) throw new Error('Veículo não encontrado. Atualize a tela.');
  var itens = FrotaPar_itens_(payload.itens);
  if (!itens.length) throw new Error('Marque pelo menos um item do plano que será feito na parada (por exemplo, "Óleo do motor e filtro de óleo"). Nada foi gravado.');
  var oficina = FrotaPar_s_(payload.oficina).replace(/\s+/g, ' ');
  if (oficina.length < 3) throw new Error('Informe a oficina (ou o local) da parada, por exemplo "Oficina Centro Automotivo". Nada foi gravado.');
  var di = FrotaPar_s_(payload.dataInicio), hi = FrotaPar_s_(payload.horaInicio) || '08:00';
  var df = FrotaPar_s_(payload.dataFim) || di, hf = FrotaPar_s_(payload.horaFim) || '18:00';
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(di) || !/^\d{2}\/\d{2}\/\d{4}$/.test(df)) throw new Error('Informe a data da parada no formato dd/mm/aaaa (início e, se passar de um dia, o fim). Nada foi gravado.');
  var oQue = FrotaPar_s_(payload.oQueFazer).replace(/\s+/g, ' ').slice(0, 400) || itens.map(function (i) { return i.rotulo; }).join('; ');
  var resp = FrotaPar_s_(payload.responsavelId) || FrotaPar_s_(sessao.userId);
  var respU = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, resp);
  var respNome = FrotaPar_s_(respU && respU.NOME) || FrotaPar_s_(sessao.nome || sessao.usuario);
  // 1. Manutenção programada nas Reservas: bloqueia reserva e retirada no período (e recusa se o veículo estiver ocupado).
  var res = FrotaRes_criar_(FrotaRes_sessao_(sessionId), { tipo: 'MANUTENCAO', veiculoId: v.ID, dataInicio: di, horaInicio: hi, dataFim: df, horaFim: hf,
    motivo: ('Parada de manutenção: ' + itens.map(function (i) { return i.rotulo.toLowerCase(); }).join(', ')).slice(0, 300), destino: oficina.slice(0, 200) });
  if (!res || res.ok !== true) return { ok: false, conflito: true, message: (res && res.message ? res.message : 'O veículo não está livre no período.') + ' A parada não foi agendada: escolha outra data ou resolva a reserva antes.', livres: (res && res.livres) || [] };
  // 2. Atividade de quem leva o carro (agenda única).
  var atv = null, avisoAtv = '';
  if (typeof Atividades_apiCriar === 'function') {
    try {
      var ra = Atividades_apiCriar(sessionId, { titulo: ('Levar o veículo ' + v.PLACA + ' à oficina: parada de manutenção').slice(0, 200),
        descricao: 'Parada agendada na Frota: ' + oQue + '.\nOficina: ' + oficina + '.\nPeríodo: ' + di + ' ' + hi + ' a ' + df + ' ' + hf + ' (o veículo fica bloqueado para retirada).\n' +
          'Ao voltar, a gestão conclui a parada em Frota > Manutenção e paradas > Paradas agendadas, com a nota fiscal.',
        inicioPrevisto: FrotaPar_iso_(di) + 'T' + hi, prazo: FrotaPar_iso_(df) + 'T' + hf, prioridade: 'Normal', responsavelId: resp, modulo: 'frota', moduloNome: 'Frota',
        porQue: 'Manutenção preventiva do plano do veículo', onde: oficina, como: 'Levar e buscar o veículo; entregar a nota à gestão' });
      if (ra && ra.ok === true && ra.item) atv = ra.item; else avisoAtv = (ra && (ra.message || ra.mensagem)) || '';
    } catch (eA) { avisoAtv = (eA && eA.message) || String(eA); }
  }
  var reg = SGO_DATA.normalizarObjetoParaSheet(FROTAPAR_ABA, SGO_DATA.gerarRegistroBase({
    VEICULO_ID: FrotaPar_s_(v.ID), PLACA: FrotaPar_s_(v.PLACA), ITENS_JSON: JSON.stringify(itens.map(function (i) { return i.codigo; })), DATA_INICIO: di, HORA_INICIO: hi, DATA_FIM: df, HORA_FIM: hf,
    OFICINA: oficina.slice(0, 200), O_QUE_FAZER: oQue, RESPONSAVEL_ID: resp, RESPONSAVEL_NOME: respNome, RESERVA_ID: FrotaPar_s_(res.id), RESERVA_CODIGO: FrotaPar_s_(res.codigo),
    ATIVIDADE_ID: atv ? FrotaPar_s_(atv.ID || atv.id) : '', SITUACAO: 'AGENDADA', AGENDADA_POR: FrotaPar_s_(sessao.nome || sessao.usuario), AGENDADA_EM: SGO_UTILS.nowIso() }));
  SGO_DATA.insert(FROTAPAR_ABA, reg);
  Frota_auditar_(sessao, { acao: 'PARADA_AGENDADA', veiculoId: FrotaPar_s_(v.ID), placa: FrotaPar_s_(v.PLACA),
    detalhe: 'Parada agendada de ' + di + ' ' + hi + ' a ' + df + ' ' + hf + ' na oficina ' + oficina + ': ' + oQue + ' (manutenção programada ' + res.codigo + ').' });
  return { ok: true, id: reg.ID, reservaCodigo: res.codigo,
    mensagem: 'Parada agendada: veículo ' + v.PLACA + ' bloqueado para reserva e retirada de ' + di + ' ' + hi + ' a ' + df + ' ' + hf + ' (' + res.codigo + '). ' +
      (atv ? 'A atividade "Levar o veículo à oficina" está na agenda de ' + respNome + '. ' : 'A atividade da agenda não foi criada' + (avisoAtv ? ' (' + avisoAtv + ')' : '') + '; avise ' + respNome + '. ') +
      'Na volta, toque em "Concluir parada" e anexe a nota fiscal: o plano se atualiza sozinho.' };
}

/**
 * payload: { id, itensFeitos?: [códigos] (padrão: os da parada), dataRealizada, km, custo?, oficina?, observacao?,
 *   base64/mimeType/nomeArquivo (nota fiscal; obrigatória com custo) }.
 */
function Frota_apiParadaConcluir(sessionId, payload) {
  var sessao = FrotaPar_exigirGestao_(sessionId);
  payload = payload || {};
  var p = SGO_DATA.getById(FROTAPAR_ABA, FrotaPar_s_(payload.id));
  if (!p || FrotaPar_s_(p.SITUACAO).toUpperCase() !== 'AGENDADA') throw new Error('Esta parada já foi concluída ou cancelada. Atualize a tela.');
  var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, p.VEICULO_ID);
  if (!v) throw new Error('Veículo da parada não encontrado. Atualize a tela.');
  var itens = FrotaPar_itens_(payload.itensFeitos && payload.itensFeitos.length ? payload.itensFeitos : FrotaPar_json_(p.ITENS_JSON));
  if (!itens.length) throw new Error('Marque os itens que foram feitos na oficina. Nada foi gravado.');
  var data = FrotaPar_s_(payload.dataRealizada);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) throw new Error('Informe a data em que o serviço foi feito (dd/mm/aaaa, está na nota). Nada foi gravado.');
  if (FrotaR_inicioDia_(data) > FrotaR_inicioDia_(Frota_agoraSP_().data)) throw new Error('A data do serviço (' + data + ') está no futuro. Hoje é ' + Frota_agoraSP_().data + '. Nada foi gravado.');
  var km = Frota_num_(payload.km, NaN), kmAtual = Frota_num_(v.KM_ATUAL, 0);
  if (!(km > 0)) throw new Error('Informe o KM do veículo no serviço (está na nota ou na etiqueta da oficina). Nada foi gravado.');
  if (km > kmAtual + 2000) throw new Error('O KM informado (' + Frota_kmTexto_(km) + ') passa em mais de 2.000 km o KM atual do veículo ' + v.PLACA + ' (' + Frota_kmTexto_(kmAtual) + '). Confira o número na nota. Nada foi gravado.');
  var custo = FrotaPar_s_(payload.custo) === '' ? 0 : Frota_num_(payload.custo, NaN);
  if (!(custo >= 0)) throw new Error('Custo inválido. Use só números (exemplo: 285,90) ou deixe vazio. Nada foi gravado.');
  var link = /^(https?:\/\/|\/arquivos\/)/.test(FrotaPar_s_(payload.notaLink)) ? FrotaPar_s_(payload.notaLink) : '';
  if (!link && payload.base64) link = Frota_uploadFoto_(v.PLACA, payload.base64, payload.mimeType, payload.nomeArquivo || 'nota-manutencao');
  if (custo > 0 && !link) throw new Error('Com custo, anexe a nota fiscal (ou o orçamento pago) do serviço: ela vai para a conferência de gastos. Nada foi gravado.');
  var oficina = FrotaPar_s_(payload.oficina) || FrotaPar_s_(p.OFICINA), obs = FrotaPar_s_(payload.observacao).slice(0, 500);
  var ids = [];
  itens.forEach(function (it, i) {
    var reg = SGO_DATA.normalizarObjetoParaSheet(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO, SGO_DATA.gerarRegistroBase({
      VEICULO_ID: FrotaPar_s_(v.ID), TIPO: it.tipos[0], DATA: data, KM: km, DESCRICAO: (it.rotulo + ' (parada agendada' + (itens.length > 1 ? ', ' + (i + 1) + ' de ' + itens.length + (i ? ', custo no primeiro item' : '') : '') + ')' + (obs ? '. ' + obs : '')).slice(0, 500),
      CUSTO: i === 0 ? custo : 0, OFICINA: oficina, PROXIMA_KM: '', PROXIMA_DATA: '', NOTA_LINK: link, PARADA_ID: FrotaPar_s_(p.ID), SITUACAO_CONFERENCIA: 'PENDENTE', REGISTRADO_POR_NOME: FrotaPar_s_(sessao.nome || sessao.usuario) }));
    SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO, reg);
    ids.push(reg.ID);
  });
  // Manutenção programada encerrada: o veículo volta a ficar livre.
  var r = FrotaPar_s_(p.RESERVA_ID) ? SGO_DATA.getById(FROTA_RES_ABA, p.RESERVA_ID) : null;
  if (r && FrotaPar_s_(r.SITUACAO).toUpperCase() === 'RESERVADA') {
    SGO_DATA.update(FROTA_RES_ABA, r.ID, { SITUACAO: 'CONCLUIDA', CONCLUIDA_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso(), HISTORICO_JSON: FrotaRes_hist_(r, sessao, 'CONCLUIDA', 'Parada concluída na Frota: veículo liberado.') });
  }
  if (FrotaPar_s_(p.ATIVIDADE_ID) && typeof Atividades_apiMudarSituacao === 'function') {
    try { Atividades_apiMudarSituacao(sessionId, { id: p.ATIVIDADE_ID, situacao: 'Concluída', observacao: 'Parada concluída na Frota em ' + data + '.' }); } catch (e) {}
  }
  SGO_DATA.update(FROTAPAR_ABA, p.ID, { SITUACAO: 'CONCLUIDA', CONCLUIDA_EM: SGO_UTILS.nowIso(), CONCLUIDA_POR: FrotaPar_s_(sessao.nome || sessao.usuario), DATA_REALIZADA: data, KM_REALIZADA: km,
    CUSTO: custo, NOTA_LINK: link, MANUTENCOES_JSON: JSON.stringify(ids), OBSERVACAO: obs });
  Frota_auditar_(sessao, { acao: 'PARADA_CONCLUIDA', veiculoId: FrotaPar_s_(v.ID), placa: FrotaPar_s_(v.PLACA),
    detalhe: 'Parada concluída em ' + data + ', KM ' + Frota_kmTexto_(km) + ', custo R$ ' + Rastreador_num_(custo, 2) + ': ' + itens.map(function (i) { return i.rotulo; }).join('; ') + '.' });
  var plano = FrotaPlano_doVeiculo_(SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, v.ID));
  var prox = itens.map(function (it) { var x = plano.filter(function (q) { return q.codigo === it.codigo; })[0]; return x ? it.rotulo + ': próxima ' + [x.proximaKm !== null ? 'em ' + Frota_kmTexto_(x.proximaKm) + ' km' : '', x.proximaData].filter(Boolean).join(' ou ') : ''; }).filter(Boolean);
  return { ok: true, manutencoes: ids, mensagem: 'Parada concluída: ' + itens.length + (itens.length === 1 ? ' manutenção registrada' : ' manutenções registradas') + ' (vão para a conferência de gastos) e o veículo ' + v.PLACA + ' voltou a ficar livre. ' + prox.join('; ') + '.' };
}

function Frota_apiParadaCancelar(sessionId, payload) {
  var sessao = FrotaPar_exigirGestao_(sessionId);
  payload = payload || {};
  var p = SGO_DATA.getById(FROTAPAR_ABA, FrotaPar_s_(payload.id));
  if (!p || FrotaPar_s_(p.SITUACAO).toUpperCase() !== 'AGENDADA') throw new Error('Esta parada já foi concluída ou cancelada. Atualize a tela.');
  var m = Frota_exigirJustificativa_(payload.motivo, ['cancelar a parada agendada do veículo ' + FrotaPar_s_(p.PLACA)], 'oficina remarcou para a semana que vem');
  var r = FrotaPar_s_(p.RESERVA_ID) ? SGO_DATA.getById(FROTA_RES_ABA, p.RESERVA_ID) : null;
  if (r && FrotaPar_s_(r.SITUACAO).toUpperCase() === 'RESERVADA') { try { FrotaRes_cancelar_(FrotaRes_sessao_(sessionId), { id: r.ID, motivo: m }); } catch (eR) { console.error('Frota, cancelar parada: ' + ((eR && eR.message) || eR)); } }
  if (FrotaPar_s_(p.ATIVIDADE_ID) && typeof Atividades_apiMudarSituacao === 'function') { try { Atividades_apiMudarSituacao(sessionId, { id: p.ATIVIDADE_ID, situacao: 'Cancelada', motivo: 'Parada cancelada na Frota: ' + m }); } catch (e) {} }
  SGO_DATA.update(FROTAPAR_ABA, p.ID, { SITUACAO: 'CANCELADA', CANCELADA_EM: SGO_UTILS.nowIso(), CANCELADA_POR: FrotaPar_s_(sessao.nome || sessao.usuario), CANCELADA_MOTIVO: m });
  Frota_auditar_(sessao, { acao: 'PARADA_CANCELADA', veiculoId: FrotaPar_s_(p.VEICULO_ID), placa: FrotaPar_s_(p.PLACA), justificativa: m, detalhe: 'Parada agendada cancelada.' });
  return { ok: true, mensagem: 'Parada cancelada: o veículo ' + FrotaPar_s_(p.PLACA) + ' ficou livre no período e a atividade foi cancelada. O motivo ficou na trilha.' };
}

function Frota_apiParadasListar(sessionId, payload) {
  FrotaPar_exigirGestao_(sessionId);
  payload = payload || {};
  var vid = FrotaPar_s_(payload.veiculoId);
  var todas = FrotaPar_todas_().filter(function (p) { return !vid || FrotaPar_s_(p.VEICULO_ID) === vid; }).map(FrotaPar_paraTela_);
  var ord = function (a, b) { return FrotaPar_iso_(b.dataInicio).localeCompare(FrotaPar_iso_(a.dataInicio)); };
  return { ok: true, agendadas: todas.filter(function (p) { return p.situacao === 'AGENDADA'; }).sort(function (a, b) { return -ord(a, b); }),
    historico: todas.filter(function (p) { return p.situacao !== 'AGENDADA'; }).sort(ord).slice(0, 30),
    usuarios: Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) { return FrotaPar_s_(u.STATUS || 'ATIVO').toUpperCase() !== 'INATIVO' && FrotaPar_s_(u.PERFIL).toUpperCase() !== 'CLIENTE'; })
      .map(function (u) { return { id: FrotaPar_s_(u.ID), nome: FrotaPar_s_(u.NOME) }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome); }),
    itensPlano: FROTAPLANO_ITENS.map(function (i) { return { codigo: i.codigo, rotulo: i.rotulo }; }) };
}
