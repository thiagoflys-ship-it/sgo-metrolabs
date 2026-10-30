/****************************************************
 * FROTA — CHECKLIST DE FUNCIONAMENTO NA RETIRADA E PENDÊNCIAS PARA A GESTÃO (30/10/2026, leva 2)
 *
 * Pedido do dono (30/10/2026): checklist rápido na retirada (pneus, luzes, nível de óleo e água, documentos, avarias) e
 * item "não ok" vira pendência para a gestão.
 *  - Na retirada entra o grupo "Funcionamento" (só na retirada; a devolução continua com a vistoria de sempre). Pneus,
 *    luzes, documento e avarias já estão nos grupos da vistoria. "Tudo OK" continua sendo um toque.
 *  - Todo item marcado com problema na retirada vira (ou soma em) uma pendência aberta do veículo para a gestão,
 *    na central de pendências. A mesma pendência aparece para quem for retirar o veículo depois, até a gestão resolver.
 *  - A gestão resolve em Frota > Manutenção e paradas > "Problemas informados na retirada", com o que foi feito
 *    (mínimo de 15 caracteres). Nada é apagado.
 ****************************************************/

var FROTACHK_ABA = 'REG_FROTA_CHECKLIST_PENDENCIA';
var FROTACHK_COLUNAS = ['ID', 'VEICULO_ID', 'PLACA', 'GRUPO', 'ITEM', 'OBSERVACAO', 'MOVIMENTACAO_ID', 'CONDUTOR_ID', 'CONDUTOR_NOME', 'SITUACAO', 'OCORRENCIAS',
  'PRIMEIRO_EM', 'ULTIMO_EM', 'RESOLVIDO_EM', 'RESOLVIDO_POR', 'RESOLUCAO', 'CRIADO_EM'];
var FROTACHK_GRUPO_RETIRADA = { grupo: 'Funcionamento', itens: ['Painel sem luz de advertência acesa', 'Nível do óleo do motor', 'Nível da água do radiador', 'Pneus sem murcho ou dano', 'Freio sem ruído ou vibração'] };
var FROTACHK_CRITICOS = ['Painel sem luz de advertência acesa', 'Nível do óleo do motor', 'Freio sem ruído ou vibração'];

function FrotaChk_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function FrotaChk_garantirAbas_() { CertCal_garantirTabela_(FROTACHK_ABA, FROTACHK_COLUNAS); }
function FrotaChk_todas_() { return Frota_lerSeExistir_(FROTACHK_ABA); }
function FrotaChk_abertas_() { return FrotaChk_todas_().filter(function (p) { return FrotaChk_s_(p.SITUACAO).toUpperCase() === 'ABERTA'; }); }

/** Pendências abertas do veículo, para a tela de retirada: [{ item, observacao, desde, ocorrencias }]. */
function FrotaChk_abertasVeiculo_(veiculoId) {
  return FrotaChk_abertas_().filter(function (p) { return FrotaChk_s_(p.VEICULO_ID) === FrotaChk_s_(veiculoId); }).map(function (p) {
    return { item: FrotaChk_s_(p.ITEM), grupo: FrotaChk_s_(p.GRUPO), observacao: FrotaChk_s_(p.OBSERVACAO), desde: FrotaChk_s_(p.PRIMEIRO_EM) ? FrotaR_textoMs_(new Date(p.PRIMEIRO_EM).getTime()).slice(0, 10) : '', ocorrencias: Number(p.OCORRENCIAS) || 1 };
  });
}

/**
 * Depois da retirada gravada (Frota_apiIniciarViagem): cada item com problema abre a pendência do veículo ou soma na que
 * já está aberta (o texto novo entra junto do anterior, nunca no lugar). Nunca derruba a retirada. Devolve { novas, somadas, texto }.
 */
function FrotaChk_aposRetirada_(sessao, registro, veiculo, condutor, checklist) {
  var out = { novas: 0, somadas: 0, texto: '' };
  try {
    var prob = (checklist || []).filter(function (i) { return i && !i.ok; });
    if (!prob.length) return out;
    FrotaChk_garantirAbas_();
    var abertas = FrotaChk_abertas_().filter(function (p) { return FrotaChk_s_(p.VEICULO_ID) === FrotaChk_s_(veiculo.ID); });
    prob.forEach(function (i) {
      var ja = abertas.filter(function (p) { return FrotaChk_s_(p.ITEM) === FrotaChk_s_(i.item) && FrotaChk_s_(p.GRUPO) === FrotaChk_s_(i.grupo); })[0];
      var obs = FrotaChk_s_(i.observacao).slice(0, 300);
      if (ja) {
        var antiga = FrotaChk_s_(ja.OBSERVACAO);
        SGO_DATA.update(FROTACHK_ABA, ja.ID, { OCORRENCIAS: (Number(ja.OCORRENCIAS) || 1) + 1, ULTIMO_EM: SGO_UTILS.nowIso(), MOVIMENTACAO_ID: FrotaChk_s_(registro.ID),
          OBSERVACAO: antiga && obs && antiga.indexOf(obs) < 0 ? (antiga + ' | ' + Frota_agoraSP_().data + ': ' + obs).slice(-900) : (antiga || obs) });
        out.somadas++;
      } else {
        SGO_DATA.insert(FROTACHK_ABA, SGO_DATA.normalizarObjetoParaSheet(FROTACHK_ABA, SGO_DATA.gerarRegistroBase({
          VEICULO_ID: FrotaChk_s_(veiculo.ID), PLACA: FrotaChk_s_(veiculo.PLACA), GRUPO: FrotaChk_s_(i.grupo), ITEM: FrotaChk_s_(i.item), OBSERVACAO: obs, MOVIMENTACAO_ID: FrotaChk_s_(registro.ID),
          CONDUTOR_ID: FrotaChk_s_(condutor && condutor.ID), CONDUTOR_NOME: FrotaChk_s_(condutor && condutor.NOME), SITUACAO: 'ABERTA', OCORRENCIAS: 1, PRIMEIRO_EM: SGO_UTILS.nowIso(), ULTIMO_EM: SGO_UTILS.nowIso(),
          RESOLVIDO_EM: '', RESOLVIDO_POR: '', RESOLUCAO: '' })));
        out.novas++;
      }
    });
    Frota_auditar_(sessao, { acao: 'CHECKLIST_PROBLEMA_RETIRADA', veiculoId: FrotaChk_s_(veiculo.ID), placa: FrotaChk_s_(veiculo.PLACA), movimentacaoId: FrotaChk_s_(registro.ID),
      condutorId: FrotaChk_s_(condutor && condutor.ID), condutorNome: FrotaChk_s_(condutor && condutor.NOME),
      detalhe: 'Problemas informados na retirada: ' + prob.map(function (i) { return i.item + (i.observacao ? ' (' + i.observacao + ')' : ''); }).join('; ').slice(0, 800) + '. A gestão confere.' });
    var urgente = prob.filter(function (i) { return FROTACHK_CRITICOS.indexOf(FrotaChk_s_(i.item)) >= 0; });
    out.texto = 'Problema informado na retirada: ' + prob.map(function (i) { return i.item.toLowerCase(); }).join(', ') + '. A gestão foi avisada (central de pendências).' +
      (urgente.length ? ' Luz vermelha de óleo ou de temperatura acesa, ou freio com problema: não siga viagem; fale com a gestão.' : '');
  } catch (e) { console.error('Frota, checklist da retirada: ' + ((e && e.message) || e)); }
  return out;
}

function Frota_apiChecklistPendencias(sessionId, payload) {
  Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  Frota_bootstrap_(); FrotaChk_garantirAbas_();
  payload = payload || {};
  var lista = (payload.todas ? FrotaChk_todas_() : FrotaChk_abertas_()).map(function (p) {
    return { id: FrotaChk_s_(p.ID), veiculoId: FrotaChk_s_(p.VEICULO_ID), placa: FrotaChk_s_(p.PLACA), rotulo: typeof FrotaId_rotuloRapido_ === 'function' ? FrotaId_rotuloRapido_(FrotaChk_s_(p.PLACA)) : FrotaChk_s_(p.PLACA),
      grupo: FrotaChk_s_(p.GRUPO), item: FrotaChk_s_(p.ITEM), observacao: FrotaChk_s_(p.OBSERVACAO), condutor: FrotaChk_s_(p.CONDUTOR_NOME), situacao: FrotaChk_s_(p.SITUACAO).toUpperCase(),
      ocorrencias: Number(p.OCORRENCIAS) || 1, desde: FrotaChk_s_(p.PRIMEIRO_EM) ? FrotaR_textoMs_(new Date(p.PRIMEIRO_EM).getTime()) : '', ultimo: FrotaChk_s_(p.ULTIMO_EM) ? FrotaR_textoMs_(new Date(p.ULTIMO_EM).getTime()) : '',
      critico: FROTACHK_CRITICOS.indexOf(FrotaChk_s_(p.ITEM)) >= 0, resolucao: FrotaChk_s_(p.RESOLUCAO), resolvidoPor: FrotaChk_s_(p.RESOLVIDO_POR) };
  }).sort(function (a, b) { return (b.situacao === 'ABERTA') - (a.situacao === 'ABERTA') || (b.critico - a.critico) || a.placa.localeCompare(b.placa); });
  return { ok: true, itens: lista };
}

/** payload: { id, resolucao } — o que foi feito (mínimo de 15 caracteres). */
function Frota_apiChecklistResolver(sessionId, payload) {
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  Frota_bootstrap_(); FrotaChk_garantirAbas_();
  payload = payload || {};
  var p = SGO_DATA.getById(FROTACHK_ABA, FrotaChk_s_(payload.id));
  if (!p || FrotaChk_s_(p.SITUACAO).toUpperCase() !== 'ABERTA') throw new Error('Esta pendência já foi resolvida. Atualize a tela.');
  var r = Frota_exigirJustificativa_(payload.resolucao, ['resolver o problema informado na retirada (' + FrotaChk_s_(p.ITEM).toLowerCase() + ')'], 'completado o óleo na oficina; nível conferido');
  SGO_DATA.update(FROTACHK_ABA, p.ID, { SITUACAO: 'RESOLVIDA', RESOLVIDO_EM: SGO_UTILS.nowIso(), RESOLVIDO_POR: FrotaChk_s_(sessao.nome || sessao.usuario), RESOLUCAO: r });
  Frota_auditar_(sessao, { acao: 'CHECKLIST_RESOLVIDO', veiculoId: FrotaChk_s_(p.VEICULO_ID), placa: FrotaChk_s_(p.PLACA), justificativa: r, detalhe: 'Problema da retirada resolvido: ' + FrotaChk_s_(p.ITEM) + '.' });
  return { ok: true, mensagem: 'Pendência resolvida: ' + FrotaChk_s_(p.ITEM) + ' do veículo ' + FrotaChk_s_(p.PLACA) + '. O que foi feito ficou na trilha.' };
}

/** Central de pendências (chamado por Pend_fonteFrota_). */
function FrotaChk_pendencias_(add) {
  if (typeof Pend_item_ !== 'function' || typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.frota_checklist) return;
  FrotaChk_abertas_().forEach(function (p) {
    var placa = FrotaChk_s_(p.PLACA), rot = typeof FrotaId_rotuloRapido_ === 'function' ? FrotaId_rotuloRapido_(placa) : placa;
    var critico = FROTACHK_CRITICOS.indexOf(FrotaChk_s_(p.ITEM)) >= 0;
    add(Pend_item_('frota_checklist', {
      id: 'FROTA:CHK:' + FrotaChk_s_(p.ID), nome: rot, publico: 'GESTAO', responsavel: 'Gestão da frota', gravidade: critico ? 'CRITICO' : 'ATENCAO', dias: null,
      titulo: 'Problema informado na retirada: ' + FrotaChk_s_(p.ITEM).toLowerCase() + ' (' + rot + ')',
      detalhe: (FrotaChk_s_(p.OBSERVACAO) || 'sem descrição') + '. Informado por ' + (FrotaChk_s_(p.CONDUTOR_NOME) || 'condutor') + ((Number(p.OCORRENCIAS) || 1) > 1 ? ', ' + p.OCORRENCIAS + ' vezes' : '') + '.',
      oQueFazer: 'Confira o veículo e registre o que foi feito em Frota > Manutenção e paradas > Problemas informados na retirada > Resolver.',
      textoEstavel: 'Problema informado na retirada do veículo \'' + placa + '\': ' + FrotaChk_s_(p.ITEM) + '.'
    }));
  });
}
