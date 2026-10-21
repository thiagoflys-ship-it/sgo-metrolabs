/****************************************************
 * FROTA — RELATÓRIO A4 (Fase 4, 2026-08-25)
 *
 * Botão da tela desktop gera um PDF A4 consolidado sobre um período
 * escolhido: histórico de uso, gráficos de retirada/km/paradas por
 * veículo, ranking de veículos mais usados/disputados e mais ociosos,
 * custos (manutenção/despesa/multa), situação atual de alertas
 * (documentos/manutenções vencidos) e uma interpretação executiva por
 * IA — grounded SOMENTE nos números já calculados aqui, nunca em dado
 * bruto solto (mesmo princípio de "nunca inventar" dos outros módulos).
 *
 * Mesmo esqueleto visual/CSS dos outros documentos do Portal
 * (SGO_NR13_Documento.js) — timbre, @page A4, botão de impressão — só
 * troca o conteúdo pelas seções de frota.
 ****************************************************/

function FrotaRel_escaparHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function FrotaRel_num_(v, casas) {
  var n = Number(v);
  if (!isFinite(n)) n = 0;
  return SGO_DocA4_num_(n, casas === undefined ? 2 : casas);
}

function FrotaRel_moeda_(v) {
  return 'R$ ' + FrotaRel_num_(v, 2);
}

function FrotaRel_obterPastaRelatorios_() {
  var props = PropertiesService.getScriptProperties();
  var idSalvo = props.getProperty('FROTA_RELATORIO_FOLDER_ID');
  if (idSalvo) {
    try { return DriveApp.getFolderById(idSalvo); } catch (e) { /* pasta salva não existe mais — recria abaixo */ }
  }
  var folder = DriveApp.getRootFolder().createFolder('Frota - Relatorios Gerados');
  props.setProperty('FROTA_RELATORIO_FOLDER_ID', folder.getId());
  return folder;
}

// ------------------------------------------------------------
// AGREGAÇÃO — varre movimentação/manutenção/despesa/parada/multa do
// período e monta o resumo por veículo. Datas comparadas como timestamp
// real (Frota_parseDataHora_, já usado no cruzamento de multas), nunca
// como comparação de string dd/mm/aaaa.
// ------------------------------------------------------------
function FrotaRel_agregarDados_(dataInicioStr, dataFimStr) {
  var inicio = Frota_parseDataHora_(dataInicioStr, '00:00');
  var fim = Frota_parseDataHora_(dataFimStr, '23:59');
  if (!inicio || !fim) throw new Error('Datas inválidas — use o formato dd/mm/aaaa.');
  if (fim.getTime() < inicio.getTime()) throw new Error('A data final não pode ser anterior à data inicial.');

  var veiculos = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).filter(function(v) { return SGO_UTILS.safeUpper(v.STATUS) !== 'INATIVO'; });
  var condutores = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });

  var porVeiculo = {};
  veiculos.forEach(function(v) {
    porVeiculo[SGO_UTILS.safe(v.ID)] = {
      id: v.ID, placa: v.PLACA, rotulo: Frota_rotuloVeiculo_(v), apelido: SGO_UTILS.safe(v.APELIDO), base: SGO_UTILS.safe(v.BASE), cor: SGO_UTILS.safe(v.COR), modelo: v.MODELO || '', marca: v.MARCA || '', ano: v.ANO || '', status: v.STATUS, kmAtual: Frota_num_(v.KM_ATUAL, 0),
      retiradas: 0, kmRodado: 0, kmInicioPeriodo: null, kmFimPeriodo: null, horasEmUso: 0, taxaUtilizacao: 0,
      manutencoesQtd: 0, manutencoesCusto: 0, manutencoesLista: [],
      despesasValor: 0, despesasLista: [],
      paradasQtd: 0, paradasDias: 0, paradasLista: [],
      multasQtd: 0, multasValor: 0, multasIdentificadas: 0, multasLista: [],
      abastecimentosLitros: 0, abastecimentosValor: 0, abastecimentosLista: [], consumoMedioKmL: 0,
      custoPorKm: 0,
      movimentacoesLista: [],
      condutorResponsavel: ''
    };
  });

  var horasNoPeriodo = Math.max((fim.getTime() - inicio.getTime()) / 3600000, 1);
  var contadorCondutor = {};
  var contadorCondutorPorVeiculo = {};

  SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function(m) {
    var saida = Frota_parseDataHora_(m.DATA_SAIDA, m.HORA_SAIDA);
    if (!saida || saida.getTime() < inicio.getTime() || saida.getTime() > fim.getTime()) return;
    var vid = SGO_UTILS.safe(m.VEICULO_ID);
    var alvo = porVeiculo[vid];
    if (!alvo) return;
    alvo.retiradas++;

    var condutorId = SGO_UTILS.safe(m.CONDUTOR_ID);
    var condutorNome = (condutores[condutorId] || {}).NOME || '';
    if (condutorId) {
      contadorCondutor[condutorId] = (contadorCondutor[condutorId] || 0) + 1;
      contadorCondutorPorVeiculo[vid] = contadorCondutorPorVeiculo[vid] || {};
      contadorCondutorPorVeiculo[vid][condutorId] = (contadorCondutorPorVeiculo[vid][condutorId] || 0) + 1;
    }

    var kmSaidaNum = Frota_num_(m.KM_SAIDA, 0);
    if (alvo.kmInicioPeriodo === null || kmSaidaNum < alvo.kmInicioPeriodo) alvo.kmInicioPeriodo = kmSaidaNum;

    var finalizado = SGO_UTILS.safeUpper(m.STATUS) === 'FINALIZADO' && m.KM_CHEGADA !== '' && m.KM_CHEGADA !== undefined && m.KM_CHEGADA !== null;
    var kmChegadaNum = finalizado ? Frota_num_(m.KM_CHEGADA, 0) : null;
    if (finalizado && (alvo.kmFimPeriodo === null || kmChegadaNum > alvo.kmFimPeriodo)) alvo.kmFimPeriodo = kmChegadaNum;

    if (finalizado) {
      var km = kmChegadaNum - kmSaidaNum;
      if (isFinite(km) && km > 0) alvo.kmRodado += km;

      var chegada = Frota_parseDataHora_(m.DATA_CHEGADA, m.HORA_CHEGADA);
      if (chegada) {
        // 16/10/2026: só conta as horas dentro do período (devolução depois do fim não infla a taxa de uso)
        var horas = (Math.min(chegada.getTime(), fim.getTime()) - saida.getTime()) / 3600000;
        if (isFinite(horas) && horas > 0) alvo.horasEmUso += horas;
      }
    }

    alvo.movimentacoesLista.push({
      data: m.DATA_SAIDA, condutor: condutorNome, finalidade: m.FINALIDADE || '',
      kmSaida: kmSaidaNum, kmChegada: finalizado ? kmChegadaNum : null,
      total: finalizado ? Math.max(kmChegadaNum - kmSaidaNum, 0) : null,
      observacoes: m.OBSERVACOES || '', emAndamento: !finalizado
    });
  });

  SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO).forEach(function(m) {
    var data = Frota_parseDataHora_(m.DATA, '00:00');
    if (!data || data.getTime() < inicio.getTime() || data.getTime() > fim.getTime()) return;
    var alvo = porVeiculo[SGO_UTILS.safe(m.VEICULO_ID)];
    if (!alvo) return;
    alvo.manutencoesQtd++;
    alvo.manutencoesCusto += Frota_num_(m.CUSTO, 0);
    var tipoInfo = FROTA_CFG.TIPOS_MANUTENCAO.filter(function(t) { return t.codigo === m.TIPO; })[0];
    alvo.manutencoesLista.push({
      servico: tipoInfo ? tipoInfo.label : m.TIPO, data: m.DATA, km: m.KM, oficina: m.OFICINA || '',
      valor: Frota_num_(m.CUSTO, 0), proxima: m.PROXIMA_DATA || (m.PROXIMA_KM ? ('KM ' + m.PROXIMA_KM) : '')
    });
  });

  var despesasPorTipo = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_DESPESA).forEach(function(d) {
    var data = Frota_parseDataHora_(d.DATA, '00:00');
    if (!data || data.getTime() < inicio.getTime() || data.getTime() > fim.getTime()) return;
    var alvo = porVeiculo[SGO_UTILS.safe(d.VEICULO_ID)];
    if (!alvo) return;
    var valor = Frota_num_(d.VALOR, 0);
    alvo.despesasValor += valor;
    var tipo = d.TIPO || 'Outro';
    despesasPorTipo[tipo] = (despesasPorTipo[tipo] || 0) + valor;
    alvo.despesasLista.push({ data: d.DATA, tipo: tipo, valor: valor, descricao: d.DESCRICAO || '' });
  });

  SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_PARADA).forEach(function(p) {
    var pInicio = Frota_parseDataHora_(p.DATA_INICIO, '00:00');
    if (!pInicio) return;
    var pFim = p.DATA_FIM ? Frota_parseDataHora_(p.DATA_FIM, '23:59') : fim;
    if (!pFim) pFim = fim;
    if (pInicio.getTime() > fim.getTime() || pFim.getTime() < inicio.getTime()) return;
    var alvo = porVeiculo[SGO_UTILS.safe(p.VEICULO_ID)];
    if (!alvo) return;
    alvo.paradasQtd++;
    var inicioEfetivo = Math.max(pInicio.getTime(), inicio.getTime());
    var fimEfetivo = Math.min(pFim.getTime(), fim.getTime());
    var dias = Math.max((fimEfetivo - inicioEfetivo) / 86400000, 0);
    alvo.paradasDias += dias;
    alvo.paradasLista.push({ dataInicio: p.DATA_INICIO, dataFim: p.DATA_FIM || '', motivo: p.MOTIVO || '', descricao: p.DESCRICAO || '', dias: dias });
  });

  Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_MULTA).forEach(function(mu) {
    var data = Frota_parseDataHora_(mu.DATA_INFRACAO, mu.HORA_INFRACAO || '00:00');
    if (!data || data.getTime() < inicio.getTime() || data.getTime() > fim.getTime()) return;
    var alvo = porVeiculo[SGO_UTILS.safe(mu.VEICULO_ID)];
    if (!alvo) return;
    alvo.multasQtd++;
    alvo.multasValor += Frota_num_(mu.VALOR, 0);
    if (mu.CONDUTOR_ID) alvo.multasIdentificadas++;
    var condutorMulta = (condutores[SGO_UTILS.safe(mu.CONDUTOR_ID)] || {}).NOME || 'Não identificado';
    alvo.multasLista.push({
      data: mu.DATA_INFRACAO, tipo: 'Multa (' + (mu.ORGAO_AUTUADOR || 'órgão não informado') + ')',
      condutor: condutorMulta, valor: Frota_num_(mu.VALOR, 0), status: mu.STATUS || 'ABERTA', observacao: mu.DESCRICAO || ''
    });
  });

  var abastecimentosPorVeiculoKm = {};
  Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO).forEach(function(a) {
    var data = Frota_parseDataHora_(a.DATA, '00:00');
    if (!data || data.getTime() < inicio.getTime() || data.getTime() > fim.getTime()) return;
    var vid = SGO_UTILS.safe(a.VEICULO_ID);
    var alvo = porVeiculo[vid];
    if (!alvo) return;
    var litros = Frota_num_(a.LITROS, 0);
    var valor = Frota_num_(a.VALOR, 0);
    var km = Frota_num_(a.KM, 0);
    alvo.abastecimentosLitros += litros;
    alvo.abastecimentosValor += valor;
    var condutorAbast = (condutores[SGO_UTILS.safe(a.CONDUTOR_ID)] || {}).NOME || '';
    alvo.abastecimentosLista.push({
      data: a.DATA, km: km, tipoCombustivel: a.TIPO_COMBUSTIVEL || '', litros: litros, valor: valor,
      posto: a.POSTO || '', comprovante: a.COMPROVANTE_LINK || '', condutor: condutorAbast,
      precoLitro: litros > 0 ? (valor / litros) : 0
    });
    abastecimentosPorVeiculoKm[vid] = abastecimentosPorVeiculoKm[vid] || [];
    abastecimentosPorVeiculoKm[vid].push({ km: km, litros: litros });
  });

  // Consumo médio (km/L): soma dos trechos rodados ENTRE abastecimentos
  // consecutivos (ordenados por KM) dividida pelos litros que "fecharam"
  // cada trecho — precisa de pelo menos 2 abastecimentos no período pra
  // ter um KM de referência anterior; com só 1, não dá pra calcular
  // consumo sem inventar um ponto de partida.
  var kmConsumoFrota = 0, litrosConsumoFrota = 0;
  Object.keys(abastecimentosPorVeiculoKm).forEach(function(vid) {
    var listaAb = abastecimentosPorVeiculoKm[vid].slice().sort(function(a, b) { return a.km - b.km; });
    var kmTotal = 0, litrosParaConsumo = 0;
    for (var i = 1; i < listaAb.length; i++) {
      var deltaKm = listaAb[i].km - listaAb[i - 1].km;
      if (deltaKm > 0 && listaAb[i].litros > 0) {
        kmTotal += deltaKm;
        litrosParaConsumo += listaAb[i].litros;
      }
    }
    kmConsumoFrota += kmTotal; litrosConsumoFrota += litrosParaConsumo;
    if (litrosParaConsumo > 0 && porVeiculo[vid]) {
      porVeiculo[vid].consumoMedioKmL = kmTotal / litrosParaConsumo;
    }
  });

  var lista = Object.keys(porVeiculo).map(function(id) {
    var v = porVeiculo[id];
    v.taxaUtilizacao = Math.min((v.horasEmUso / horasNoPeriodo) * 100, 100);
    var custoTotalVeiculo = v.despesasValor + v.manutencoesCusto + v.abastecimentosValor;
    v.custoTotal = custoTotalVeiculo;
    v.custoPorKm = v.kmRodado > 0 ? (custoTotalVeiculo / v.kmRodado) : 0;

    var condutoresDoVeiculo = contadorCondutorPorVeiculo[id] || {};
    var condutorTopId = Object.keys(condutoresDoVeiculo).sort(function(a, b) { return condutoresDoVeiculo[b] - condutoresDoVeiculo[a]; })[0];
    v.condutorResponsavel = condutorTopId ? ((condutores[condutorTopId] || {}).NOME || '') : '';
    return v;
  });

  var condutorMaisAtuanteId = Object.keys(contadorCondutor).sort(function(a, b) { return contadorCondutor[b] - contadorCondutor[a]; })[0];
  var condutorMaisAtuante = condutorMaisAtuanteId ? {
    nome: (condutores[condutorMaisAtuanteId] || {}).NOME || '—',
    retiradas: contadorCondutor[condutorMaisAtuanteId]
  } : null;

  var totais = lista.reduce(function(acc, v) {
    acc.retiradas += v.retiradas;
    acc.km += v.kmRodado;
    acc.despesas += v.despesasValor;
    acc.manutencao += v.manutencoesCusto;
    acc.multasValor += v.multasValor;
    acc.multasQtd += v.multasQtd;
    acc.paradasQtd += v.paradasQtd;
    acc.paradasDias += v.paradasDias;
    acc.abastecimentosLitros += v.abastecimentosLitros;
    acc.abastecimentosValor += v.abastecimentosValor;
    return acc;
  }, { retiradas: 0, km: 0, despesas: 0, manutencao: 0, multasValor: 0, multasQtd: 0, paradasQtd: 0, paradasDias: 0, abastecimentosLitros: 0, abastecimentosValor: 0 });
  totais.custoTotal = totais.despesas + totais.manutencao + totais.abastecimentosValor;
  totais.custoPorKm = totais.km > 0 ? (totais.custoTotal / totais.km) : 0;
  // 16/10/2026: mesma regra do consumo por veículo (trechos entre abastecimentos).
  // Antes dividia o km das retiradas por TODOS os litros — misturava duas fontes
  // e dava um número diferente da soma dos veículos.
  totais.consumoMedioKmL = litrosConsumoFrota > 0 ? (kmConsumoFrota / litrosConsumoFrota) : 0;

  return {
    periodo: { inicio: dataInicioStr, fim: dataFimStr, dias: Math.floor((fim.getTime() - inicio.getTime()) / 86400000) + 1 },
    totalVeiculosFrota: lista.length,
    veiculos: lista,
    totais: totais,
    despesasPorTipo: despesasPorTipo,
    condutorMaisAtuante: condutorMaisAtuante,
    alertasAtuais: Frota_calcularAlertasManutencao_(),
    rankingMaisUsados: lista.slice().sort(function(a, b) { return b.retiradas - a.retiradas; }).slice(0, 8),
    rankingMaisKm: lista.slice().sort(function(a, b) { return b.kmRodado - a.kmRodado; }).slice(0, 8),
    rankingOciosos: lista.slice().filter(function(v) { return v.retiradas === 0; })
  };
}

/**
 * Pendências e providências — geradas dos MESMOS avisos que alimentam o
 * painel (nunca cadastro manual; decisão do dono, 25/08/2026). Recebe a
 * lista já filtrada pelo chamador (geral = todos; por veículo = o veículo
 * e a CNH do condutor responsável).
 */
function FrotaRel_montarPendencias_(alertasJaFiltrados) {
  return alertasJaFiltrados.map(function(a) {
    var critico = a.status === 'VENCIDO';
    var pendencia = a.categoria === 'CNH' ? ('Renovar a CNH de ' + a.veiculoPlaca)
      : a.categoria === 'DOCUMENTO' ? ('Renovar ' + a.tipoLabel + ' do veículo ' + FrotaId_rotuloPorPlaca_(a.veiculoPlaca))
      : a.categoria === 'QUALIDADE' ? (a.tipoLabel + (a.veiculoPlaca ? ' (' + a.veiculoPlaca + ')' : '') + (a.vencimento ? ', infração de ' + a.vencimento : ''))
      : ('Manutenção: ' + a.tipoLabel + ' do veículo ' + FrotaId_rotuloPorPlaca_(a.veiculoPlaca));
    return {
      pendencia: pendencia,
      responsavel: a.categoria === 'CNH' ? a.veiculoPlaca : 'Gestão da frota',
      prazo: a.vencimento || (critico ? 'Vencido' : 'A confirmar'),
      situacao: critico ? 'Vencida' : 'Programada',
      critico: critico
    };
  });
}

/** Mantido para quem ainda chama (relatórios antigos/Qualidade): barras em SVG. */
function FrotaRel_montarGraficoBarras_(itens, opts) {
  return RelA4_barras_(itens, opts);
}

function FrotaRel_paragrafosHtml_(texto) { return RelA4_paragrafos_(texto); }

function FrotaRel_situacaoVeiculoLabel_(status) {
  var s = String(status || '').toUpperCase();
  if (s === 'EM_USO') return 'Em uso';
  if (s === 'INATIVO') return 'Inativo';
  return 'Disponível';
}

/**
 * Avisos e providências numa tabela só (18/10/2026: antes eram duas tabelas
 * com os mesmos itens — "avisos de vencimento" e "pendências").
 */
function FrotaRel_tabelaProvidencias_(alertas, legenda) {
  if (!alertas.length) return RelA4_caixa_('Nenhuma manutenção, documento ou CNH vencida ou próxima do vencimento na data de emissão.', 'ok');
  var ordem = alertas.slice().sort(function(a, b) { return (a.status === 'VENCIDO' ? 0 : 1) - (b.status === 'VENCIDO' ? 0 : 1); });
  var pend = FrotaRel_montarPendencias_(ordem);
  return RelA4_tabela_([{ t: 'Providência' }, { t: 'Responsável' }, { t: 'Vencimento' }, { t: 'Situação' }], pend.map(function(p) {
    return [p.pendencia, p.responsavel, p.prazo, RelA4_marca_(p.critico ? 'Vencido' : 'Vence em breve', p.critico ? 'critico' : 'aviso')];
  }), { legenda: legenda || 'Avisos de vencimento e providências na data de emissão' });
}
/** Mantidas para quem ainda chama. */
function FrotaRel_tabelaPendencias_(pendencias) {
  if (!pendencias.length) return RelA4_caixa_('Nenhuma pendência em aberto na data de emissão.', 'ok');
  return RelA4_tabela_([{ t: 'Pendência' }, { t: 'Responsável' }, { t: 'Prazo' }, { t: 'Situação' }], pendencias.map(function(p) {
    return [p.pendencia, p.responsavel, p.prazo, RelA4_marca_(p.situacao, p.critico ? 'critico' : 'aviso')];
  }));
}
function FrotaRel_tabelaAvisos_(alertas) { return FrotaRel_tabelaProvidencias_(alertas); }

var FROTAREL_NOTA_METODO = 'Quilometragem rodada é a diferença entre o km de devolução e o de retirada das retiradas concluídas no período. ' +
  'Consumo médio usa os trechos entre abastecimentos consecutivos do mesmo veículo (ordenados pelo km), por isso exige pelo menos dois abastecimentos no período. ' +
  'Custo total soma combustível, manutenção e outras despesas; multas aparecem à parte. Utilização é o tempo em uso dividido pelo tempo do período. ' +
  'Avisos e providências refletem a situação na data de emissão, não a do período.';

var FROTAREL_SERIES_CUSTO = [{ rotulo: 'Combustível', cor: RELA4_CORES.azul }, { rotulo: 'Manutenção', cor: RELA4_CORES.laranja }, { rotulo: 'Outras despesas', cor: RELA4_CORES.petroleo }];

// ------------------------------------------------------------
// TEXTO PADRÃO (sem IA) — montado só com os números do relatório
// ------------------------------------------------------------
function FrotaRel_textoPadraoGeral_(dados) {
  var t = dados.totais, p = [];
  var usados = dados.veiculos.filter(function(v) { return v.retiradas > 0; }).sort(function(a, b) { return b.retiradas - a.retiradas; });
  p.push('No período de ' + dados.periodo.inicio + ' a ' + dados.periodo.fim + ' (' + RelA4_plural_(dados.periodo.dias, 'dia', 'dias') + '), a frota contou com ' +
    RelA4_plural_(dados.totalVeiculosFrota, 'veículo ativo', 'veículos ativos') + ', que somaram ' + RelA4_plural_(t.retiradas, 'retirada', 'retiradas') +
    ' e ' + RelA4_num_(t.km, 0) + ' km rodados.' +
    (usados.length ? ' O veículo mais utilizado foi ' + (usados[0].rotulo || usados[0].placa) + ', com ' + RelA4_plural_(usados[0].retiradas, 'retirada', 'retiradas') + ' e ' + RelA4_num_(usados[0].kmRodado, 0) + ' km.' : ' Não houve retirada registrada no período.') +
    (dados.rankingOciosos.length ? ' ' + RelA4_plural_(dados.rankingOciosos.length, 'veículo ficou', 'veículos ficaram') + ' sem uso: ' + dados.rankingOciosos.map(function(v) { return (v.rotulo || v.placa); }).join(', ') + '.' : ''));
  p.push('O custo total do período foi de ' + RelA4_moeda_(t.custoTotal) + ', sendo ' + RelA4_moeda_(t.abastecimentosValor) + ' em combustível, ' + RelA4_moeda_(t.manutencao) +
    ' em manutenção e ' + RelA4_moeda_(t.despesas) + ' em outras despesas' + (t.km > 0 ? ', o que corresponde a ' + RelA4_moeda_(t.custoPorKm) + ' por quilômetro rodado' : '') + '.' +
    (t.consumoMedioKmL > 0 ? ' O consumo médio da frota foi de ' + RelA4_num_(t.consumoMedioKmL, 1) + ' km/L.' : ' Não houve abastecimentos suficientes para calcular o consumo médio.') +
    (t.multasQtd ? ' Foram registradas ' + RelA4_plural_(t.multasQtd, 'multa', 'multas') + ', no total de ' + RelA4_moeda_(t.multasValor) + '.' : ' Não houve multa registrada no período.') +
    (t.paradasQtd ? ' Houve ' + RelA4_plural_(t.paradasQtd, 'parada', 'paradas') + ', somando ' + RelA4_num_(t.paradasDias, 1) + ' dias de veículo parado.' : ''));
  var venc = dados.alertasAtuais.filter(function(a) { return a.status === 'VENCIDO'; }).length;
  var prox = dados.alertasAtuais.length - venc;
  p.push(dados.alertasAtuais.length
    ? 'Na data de emissão há ' + RelA4_plural_(venc, 'item vencido', 'itens vencidos') + ' e ' + RelA4_plural_(prox, 'item próximo do vencimento', 'itens próximos do vencimento') + ' entre manutenções, documentos e CNH, listados em Avisos e providências. Recomenda-se tratar primeiro os itens vencidos, que impedem o uso regular do veículo.'
    : 'Na data de emissão não há manutenção, documento ou CNH vencida ou próxima do vencimento.');
  return p.join('\n\n');
}

function FrotaRel_textoPadraoVeiculo_(v, periodo, pendencias) {
  var p = [];
  p.push('No período de ' + periodo.inicio + ' a ' + periodo.fim + ', o veículo ' + (v.rotulo || v.placa) + (v.modelo ? ' (' + v.modelo + ')' : '') + ' teve ' +
    RelA4_plural_(v.retiradas, 'retirada', 'retiradas') + ' e rodou ' + RelA4_num_(v.kmRodado, 0) + ' km, com utilização de ' + RelA4_num_(v.taxaUtilizacao, 1) + '% do tempo do período.' +
    (v.condutorResponsavel ? ' O condutor mais frequente foi ' + v.condutorResponsavel + '.' : ''));
  p.push('Os gastos somaram ' + RelA4_moeda_(v.custoTotal) + ' (combustível ' + RelA4_moeda_(v.abastecimentosValor) + ', manutenção ' + RelA4_moeda_(v.manutencoesCusto) + ', outras despesas ' + RelA4_moeda_(v.despesasValor) + ')' +
    (v.kmRodado > 0 ? ', ou ' + RelA4_moeda_(v.custoPorKm) + ' por quilômetro' : '') + '.' +
    (v.consumoMedioKmL > 0 ? ' O consumo médio foi de ' + RelA4_num_(v.consumoMedioKmL, 1) + ' km/L.' : '') +
    (v.multasQtd ? ' Houve ' + RelA4_plural_(v.multasQtd, 'multa', 'multas') + ' (' + RelA4_moeda_(v.multasValor) + ').' : ' Não houve multa no período.') +
    (v.paradasQtd ? ' O veículo ficou parado ' + RelA4_num_(v.paradasDias, 1) + ' dias.' : ''));
  p.push(pendencias.length
    ? 'Situação geral: há ' + RelA4_plural_(pendencias.length, 'pendência', 'pendências') + ' em aberto na data de emissão, listadas em Avisos e providências. Recomenda-se resolvê-las antes da próxima utilização programada.'
    : 'Situação geral: regular, sem pendências de manutenção, documentação ou CNH na data de emissão.');
  return p.join('\n\n');
}

function FrotaRel_celVeiculo_(v) {
  return { html: '<strong style="white-space:nowrap">' + RelA4_esc_((v.rotulo || v.placa)) + '</strong>' + (v.modelo ? '<span class="sub">' + RelA4_esc_(v.modelo) + '</span>' : '') };
}

// ------------------------------------------------------------
// DOCUMENTO GERAL (retrato; o quadro de custos por veículo, largo, vai
// numa folha em paisagem no fim)
// ------------------------------------------------------------
function FrotaRel_montarDocumentoHtml_(dados, analise, emitidoPor) {
  var t = dados.totais, c = [];
  var venc = dados.alertasAtuais.filter(function(a) { return a.status === 'VENCIDO'; }).length;
  c.push(RelA4_secao_('Resumo do período', RelA4_kpis_([
    [RelA4_num_(dados.totalVeiculosFrota, 0), 'Veículos ativos'],
    [RelA4_num_(t.retiradas, 0), 'Retiradas'],
    [RelA4_num_(t.km, 0) + ' km', 'Quilometragem rodada'],
    [t.consumoMedioKmL > 0 ? RelA4_num_(t.consumoMedioKmL, 1) + ' km/L' : '—', 'Consumo médio'],
    [RelA4_moeda_(t.custoTotal), 'Custo total'],
    [t.km > 0 ? RelA4_moeda_(t.custoPorKm) : '—', 'Custo por km'],
    [RelA4_num_(t.multasQtd, 0) + ' · ' + RelA4_moeda_(t.multasValor), 'Multas', t.multasQtd ? 'aviso' : ''],
    [RelA4_num_(venc, 0), 'Itens vencidos na emissão', venc ? 'critico' : 'ok']
  ])));
  c.push(RelA4_secao_('Análise do período', RelA4_paragrafos_(analise)));

  var porRet = dados.veiculos.slice().sort(function(a, b) { return b.retiradas - a.retiradas; }).slice(0, 15);
  var porKm = dados.veiculos.slice().sort(function(a, b) { return b.kmRodado - a.kmRodado; }).slice(0, 15);
  var uso = RelA4_barras_(porRet.map(function(v) { return { rotulo: (v.rotulo || v.placa), valor: v.retiradas, rotuloValor: RelA4_plural_(v.retiradas, 'retirada', 'retiradas') }; }), { titulo: 'Retiradas por veículo no período', cor: RELA4_CORES.verde }) +
    RelA4_barras_(porKm.map(function(v) { return { rotulo: (v.rotulo || v.placa), valor: v.kmRodado, rotuloValor: RelA4_num_(v.kmRodado, 0) + ' km · ' + RelA4_num_(v.taxaUtilizacao, 1) + '%' }; }), { titulo: 'Quilometragem rodada e utilização do tempo por veículo', cor: RELA4_CORES.azul });
  var notas = [];
  notas.push(dados.rankingOciosos.length ? 'Sem uso no período: ' + dados.rankingOciosos.map(function(v) { return (v.rotulo || v.placa) + (v.modelo ? ' (' + v.modelo + ')' : ''); }).join(', ') + '.' : 'Todos os veículos ativos tiveram ao menos uma retirada no período.');
  if (dados.condutorMaisAtuante) notas.push('Condutor com mais retiradas: ' + dados.condutorMaisAtuante.nome + ' (' + RelA4_plural_(dados.condutorMaisAtuante.retiradas, 'retirada', 'retiradas') + ').');
  c.push(RelA4_secao_('Uso dos veículos', uso + '<p class="nota">' + RelA4_esc_(notas.join(' ')) + '</p>'));

  var porCusto = dados.veiculos.filter(function(v) { return v.custoTotal > 0; }).sort(function(a, b) { return b.custoTotal - a.custoTotal; }).slice(0, 15);
  var custos = RelA4_barrasEmpilhadas_(porCusto.map(function(v) {
    return { rotulo: (v.rotulo || v.placa), partes: [v.abastecimentosValor, v.manutencoesCusto, v.despesasValor], rotuloValor: RelA4_moeda_(v.custoTotal) };
  }), FROTAREL_SERIES_CUSTO, { titulo: 'Composição do custo por veículo no período', vazio: 'Sem gastos lançados no período.' });
  var tipos = Object.keys(dados.despesasPorTipo || {}).sort(function(a, b) { return dados.despesasPorTipo[b] - dados.despesasPorTipo[a]; });
  if (tipos.length) {
    custos += RelA4_subsecao_('Outras despesas por tipo', RelA4_tabela_([{ t: 'Tipo de despesa' }, { t: 'Total', num: true }],
      tipos.map(function(k) { return [k, RelA4_moeda_(dados.despesasPorTipo[k])]; }), { legenda: 'Outras despesas do período por tipo', total: ['Total', RelA4_moeda_(t.despesas)] }));
  }
  custos += '<p class="nota">O detalhamento por veículo (retiradas, quilometragem, consumo, custos e multas) está no quadro da última seção.</p>';
  c.push(RelA4_secao_('Custos', custos));

  var parados = dados.veiculos.filter(function(v) { return v.paradasDias > 0; }).sort(function(a, b) { return b.paradasDias - a.paradasDias; });
  if (parados.length) {
    var listaParadas = [];
    parados.forEach(function(v) { v.paradasLista.forEach(function(p) { listaParadas.push([(v.rotulo || v.placa), p.motivo || 'Motivo não informado', Frota_textoData_(p.dataInicio), p.dataFim ? Frota_textoData_(p.dataFim) : 'em aberto', RelA4_num_(p.dias, 1)]); }); });
    c.push(RelA4_secao_('Veículos parados', RelA4_tabela_([{ t: 'Veículo' }, { t: 'Motivo' }, { t: 'Início' }, { t: 'Fim' }, { t: 'Dias no período', num: true }], listaParadas, { legenda: 'Paradas que tocaram o período' })));
  }
  c.push(RelA4_secao_('Avisos e providências', FrotaRel_tabelaProvidencias_(dados.alertasAtuais)));
  c.push(RelA4_secao_('Notas de cálculo', '<p>' + RelA4_esc_(FROTAREL_NOTA_METODO) + '</p>'));

  var linhas = dados.veiculos.slice().sort(function(a, b) { return b.custoTotal - a.custoTotal; }).map(function(v) {
    return [FrotaRel_celVeiculo_(v), RelA4_num_(v.retiradas, 0), RelA4_num_(v.kmRodado, 0), RelA4_num_(v.taxaUtilizacao, 1) + '%',
      v.consumoMedioKmL > 0 ? RelA4_num_(v.consumoMedioKmL, 1) : '—', RelA4_moeda_(v.abastecimentosValor), RelA4_moeda_(v.manutencoesCusto), RelA4_moeda_(v.despesasValor),
      RelA4_moeda_(v.custoTotal), v.kmRodado > 0 ? RelA4_moeda_(v.custoPorKm) : '—', RelA4_num_(v.paradasDias, 1), v.multasQtd ? RelA4_num_(v.multasQtd, 0) + ' · ' + RelA4_moeda_(v.multasValor) : '—'];
  });
  c.push(RelA4_paisagem_(RelA4_secao_('Quadro por veículo', RelA4_tabela_(
    [{ t: 'Veículo' }, { t: 'Retiradas', num: true }, { t: 'Km', num: true }, { t: 'Utilização', num: true }, { t: 'km/L', num: true }, { t: 'Combustível', num: true },
      { t: 'Manutenção', num: true }, { t: 'Outras', num: true }, { t: 'Custo total', num: true }, { t: 'Custo/km', num: true }, { t: 'Dias parados', num: true }, { t: 'Multas', num: true }],
    linhas, { legenda: 'Uso e custos por veículo no período, do maior para o menor custo', vazio: 'Nenhum veículo ativo cadastrado.',
      total: ['Total da frota', RelA4_num_(t.retiradas, 0), RelA4_num_(t.km, 0), '', t.consumoMedioKmL > 0 ? RelA4_num_(t.consumoMedioKmL, 1) : '—',
        RelA4_moeda_(t.abastecimentosValor), RelA4_moeda_(t.manutencao), RelA4_moeda_(t.despesas), RelA4_moeda_(t.custoTotal), t.km > 0 ? RelA4_moeda_(t.custoPorKm) : '—', RelA4_num_(t.paradasDias, 1),
        t.multasQtd ? RelA4_num_(t.multasQtd, 0) + ' · ' + RelA4_moeda_(t.multasValor) : '—'] }))));

  return RelA4_documento_({
    titulo: 'Relatório de frota', subtitulo: 'Uso, custos, avisos e providências de toda a frota', tituloArquivo: 'Relatório de frota',
    identificacao: dados.periodo.inicio + ' a ' + dados.periodo.fim + ' (' + RelA4_plural_(dados.periodo.dias, 'dia', 'dias') + ')', sigla: 'FRT', corpo: c.join('\n'), emitidoPor: emitidoPor
  });
}

// ------------------------------------------------------------
// DOCUMENTO POR VEÍCULO — os blocos pedidos pelo dono (25/08/2026)
// ------------------------------------------------------------
function FrotaRel_montarDocumentoVeiculoHtml_(v, periodo, analise, alertasVeiculo, documentosAtuais, pendencias, emitidoPor) {
  var c = [];
  c.push(RelA4_secao_('Identificação do veículo', RelA4_identificacao_([
    ['Apelido', v.apelido || '—'], ['Placa', v.placa], ['Base', v.base || '—'], ['Cor', v.cor || '—'], ['Marca e modelo', (v.marca || '—') + ' / ' + (v.modelo || '—')], ['Ano', v.ano || '—'], ['Situação atual', FrotaRel_situacaoVeiculoLabel_(v.status)],
    ['Km no início do período', v.kmInicioPeriodo !== null ? RelA4_num_(v.kmInicioPeriodo, 0) : '—'],
    ['Km no fim do período', v.kmFimPeriodo !== null ? RelA4_num_(v.kmFimPeriodo, 0) : '—'],
    ['Condutor mais frequente', v.condutorResponsavel || 'Nenhuma retirada no período', { largo: true }]
  ])));
  c.push(RelA4_secao_('Resumo do período', RelA4_kpis_([
    [RelA4_num_(v.retiradas, 0), 'Retiradas'], [RelA4_num_(v.kmRodado, 0) + ' km', 'Quilometragem rodada'], [RelA4_num_(v.taxaUtilizacao, 1) + '%', 'Utilização do tempo'],
    [v.consumoMedioKmL > 0 ? RelA4_num_(v.consumoMedioKmL, 1) + ' km/L' : '—', 'Consumo médio'],
    [RelA4_moeda_(v.custoTotal), 'Custo total'], [v.custoPorKm > 0 ? RelA4_moeda_(v.custoPorKm) : '—', 'Custo por km'],
    [RelA4_num_(v.paradasDias, 1), 'Dias parados', v.paradasDias ? 'aviso' : ''], [pendencias.length ? RelA4_plural_(pendencias.length, 'pendência', 'pendências') : 'Regular', 'Situação geral', pendencias.length ? 'critico' : 'ok']
  ]) + RelA4_barras_([
    { rotulo: 'Combustível', valor: v.abastecimentosValor, rotuloValor: RelA4_moeda_(v.abastecimentosValor) + ' · ' + RelA4_num_(v.abastecimentosLitros, 1) + ' L', cor: RELA4_CORES.azul },
    { rotulo: 'Manutenção', valor: v.manutencoesCusto, rotuloValor: RelA4_moeda_(v.manutencoesCusto), cor: RELA4_CORES.laranja },
    { rotulo: 'Outras despesas', valor: v.despesasValor, rotuloValor: RelA4_moeda_(v.despesasValor), cor: RELA4_CORES.petroleo },
    { rotulo: 'Multas (à parte)', valor: v.multasValor, rotuloValor: RelA4_moeda_(v.multasValor), cor: RELA4_CORES.vermelho }
  ], { titulo: 'Gastos do veículo no período por categoria' })));
  c.push(RelA4_secao_('Análise do responsável', RelA4_paragrafos_(analise)));
  c.push(RelA4_secao_('Utilização no período', RelA4_tabela_(
    [{ t: 'Data' }, { t: 'Condutor' }, { t: 'Finalidade' }, { t: 'Km saída', num: true }, { t: 'Km chegada', num: true }, { t: 'Km rodado', num: true }, { t: 'Observações' }],
    v.movimentacoesLista.map(function(m) {
      return [Frota_textoData_(m.data), m.condutor || '—', m.finalidade || '—', RelA4_num_(m.kmSaida, 0), m.kmChegada !== null ? RelA4_num_(m.kmChegada, 0) : (m.emAndamento ? 'em andamento' : '—'),
        m.total !== null ? RelA4_num_(m.total, 0) : '—', m.observacoes || '—'];
    }), { vazio: 'Nenhuma retirada registrada no período.', legenda: 'Retiradas e devoluções do veículo' })));
  c.push(RelA4_secao_('Abastecimentos', RelA4_tabela_(
    [{ t: 'Data' }, { t: 'Km', num: true }, { t: 'Combustível' }, { t: 'Litros', num: true }, { t: 'Valor', num: true }, { t: 'R$/L', num: true }, { t: 'Posto' }, { t: 'Comprovante' }],
    v.abastecimentosLista.map(function(a) {
      return [Frota_textoData_(a.data), RelA4_num_(a.km, 0), a.tipoCombustivel || '—', RelA4_num_(a.litros, 2), RelA4_moeda_(a.valor), a.precoLitro > 0 ? RelA4_num_(a.precoLitro, 2) : '—', a.posto || '—',
        a.comprovante ? { html: '<a href="' + RelA4_esc_(a.comprovante) + '" target="_blank" rel="noopener">abrir</a>' } : '—'];
    }), { vazio: 'Nenhum abastecimento registrado no período.', legenda: 'Abastecimentos do período',
      total: v.abastecimentosLista.length ? ['Total', '', '', RelA4_num_(v.abastecimentosLitros, 2), RelA4_moeda_(v.abastecimentosValor), '', '', ''] : null }) +
    (v.consumoMedioKmL > 0 ? '' : '<p class="nota">Consumo médio sem dados suficientes: são necessários pelo menos dois abastecimentos no período.</p>')));
  c.push(RelA4_secao_('Outras despesas', RelA4_tabela_([{ t: 'Data' }, { t: 'Tipo' }, { t: 'Descrição' }, { t: 'Valor', num: true }],
    v.despesasLista.map(function(d) { return [Frota_textoData_(d.data), d.tipo, d.descricao || '—', RelA4_moeda_(d.valor)]; }),
    { vazio: 'Nenhuma despesa avulsa registrada no período.', legenda: 'Despesas avulsas do período', total: v.despesasLista.length > 1 ? ['Total', '', '', RelA4_moeda_(v.despesasValor)] : null })));
  c.push(RelA4_secao_('Manutenções', RelA4_tabela_([{ t: 'Serviço' }, { t: 'Data' }, { t: 'Km', num: true }, { t: 'Oficina' }, { t: 'Valor', num: true }, { t: 'Próxima' }],
    v.manutencoesLista.map(function(m) { return [m.servico, Frota_textoData_(m.data), m.km === '' || m.km == null ? '—' : RelA4_num_(Frota_num_(m.km, 0), 0), m.oficina || '—', RelA4_moeda_(m.valor), m.proxima ? Frota_textoData_(m.proxima) : '—']; }),
    { vazio: 'Nenhuma manutenção registrada no período.', legenda: 'Manutenções do período' })));
  var docs = documentosAtuais.map(function(d) { return [d.tipo, d.validade || 'sem prazo', d.situacao]; });
  docs.push(['CNH do condutor mais frequente', v.cnhValidadeResponsavel || 'não informada', v.cnhSituacaoResponsavel || '—']);
  c.push(RelA4_secao_('Documentos', RelA4_tabela_([{ t: 'Documento' }, { t: 'Validade' }, { t: 'Situação na emissão' }], docs, { legenda: 'Documentos do veículo e CNH do condutor' })));
  var ocorrencias = v.multasLista.map(function(m) {
    return [Frota_textoData_(m.data), m.tipo, m.condutor, m.valor > 0 ? RelA4_moeda_(m.valor) : '—', FrotaRel_rotuloMulta_(m.status), m.observacao || '—'];
  }).concat(v.paradasLista.map(function(p) {
    return [Frota_textoData_(p.dataInicio), 'Parada: ' + (p.motivo || 'motivo não informado'), '—', '—', p.dataFim ? 'Encerrada' : 'Em aberto', p.descricao || '—'];
  }));
  c.push(RelA4_secao_('Multas e ocorrências', RelA4_tabela_([{ t: 'Data' }, { t: 'Tipo' }, { t: 'Condutor' }, { t: 'Valor', num: true }, { t: 'Situação' }, { t: 'Observação' }], ocorrencias,
    { vazio: 'Nenhuma multa, parada ou ocorrência registrada no período.', legenda: 'Multas e paradas do período' })));
  c.push(RelA4_secao_('Avisos e providências', FrotaRel_tabelaProvidencias_(alertasVeiculo, 'Avisos de vencimento e providências do veículo e da CNH do condutor')));
  c.push(RelA4_secao_('Notas de cálculo e responsabilidade', '<p>' + RelA4_esc_(FROTAREL_NOTA_METODO) + '</p>' +
    '<div class="manter"><p>Os dados acima vêm dos registros de retirada, abastecimento, manutenção, despesa e multa lançados no SGO+ até a data de emissão.</p>' +
    RelA4_assinaturas_(['Gestão da frota', 'Diretoria']) + '</div>'));

  return RelA4_documento_({
    titulo: 'Relatório de frota por veículo', subtitulo: 'Veículo ' + (v.rotulo || v.placa) + (v.modelo ? ' — ' + v.modelo : ''), tituloCurto: 'Relatório de frota — ' + (v.rotulo || v.placa),
    tituloArquivo: 'Relatório de frota por veículo', identificacao: periodo.inicio + ' a ' + periodo.fim + ' (' + RelA4_plural_(periodo.dias, 'dia', 'dias') + ')',
    sigla: 'FRV', corpo: c.join('\n'), emitidoPor: emitidoPor
  });
}

function FrotaRel_rotuloMulta_(s) {
  var m = { ABERTA: 'Aberta', PAGA: 'Paga', RECORRIDA: 'Recorrida', CANCELADA: 'Cancelada' };
  return m[String(s || '').toUpperCase()] || String(s || '—');
}

// ------------------------------------------------------------
// API — geração + gravação (HTML + PDF)
// ------------------------------------------------------------
/** Documentos ATUAIS do veículo (situação de hoje, não do período). */
function FrotaRel_documentosAtuaisVeiculo_(veiculoId) {
  var todos = Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO);
  var vigentes = Frota_documentosVigentes_(todos);
  var rotulos = { SEM_VALIDADE: 'Sem prazo', VENCIDO: 'Vencido', VENCENDO: 'Próximo do vencimento', OK: 'Regular', SUBSTITUIDO: 'Substituído por documento mais novo' };
  return todos
    .filter(function(d) { return SGO_UTILS.safe(d.VEICULO_ID) === veiculoId; })
    .map(function(d) {
      return { tipo: d.TIPO_DOCUMENTO, validade: Frota_textoData_(d.VALIDADE), situacao: rotulos[Frota_statusDocumento_(d, vigentes)] || 'Sem prazo' };
    });
}

/** Pasta: "Frota - Relatorios Gerados" / <placa> ou "Frota completa". */
function FrotaRel_pastaDestino_(subpasta) {
  return function() { return RelA4_subpasta_(FrotaRel_obterPastaRelatorios_(), subpasta); };
}

function Frota_apiGerarRelatorio(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};

  var dataInicio = String(payload.dataInicio || '').trim();
  var dataFim = String(payload.dataFim || '').trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataInicio) || !/^\d{2}\/\d{2}\/\d{4}$/.test(dataFim)) {
    throw new Error('Informe as datas de início e fim no formato dd/mm/aaaa.');
  }

  var dados = FrotaRel_agregarDados_(dataInicio, dataFim);
  var veiculoId = SGO_UTILS.safe(payload.veiculoId);
  var emitidoPor = SGO_UTILS.safe(sessao.nome || sessao.usuario);
  var html, identificador, analise, subpasta;
  var periodoArq = dataInicio.replace(/\//g, '-') + ' a ' + dataFim.replace(/\//g, '-');

  if (veiculoId) {
    var v = dados.veiculos.filter(function(x) { return x.id === veiculoId; })[0];
    if (!v) throw new Error('Veículo não encontrado ou inativo. Escolha outro veículo na lista ou reative o cadastro em Veículos e condutores.');
    var alertasVeiculo = dados.alertasAtuais.filter(function(a) {
      return a.veiculoId === veiculoId || (a.categoria === 'CNH' && a.veiculoPlaca === v.condutorResponsavel);
    });
    var pendencias = FrotaRel_montarPendencias_(alertasVeiculo);
    var documentosAtuais = FrotaRel_documentosAtuaisVeiculo_(veiculoId);
    if (v.condutorResponsavel) {
      var condutorResp = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).filter(function(c) { return c.NOME === v.condutorResponsavel; })[0];
      var alertaCnh = alertasVeiculo.filter(function(a) { return a.categoria === 'CNH'; })[0];
      v.cnhValidadeResponsavel = condutorResp ? Frota_textoData_(condutorResp.CNH_VALIDADE || '') : '';
      v.cnhSituacaoResponsavel = alertaCnh ? (alertaCnh.status === 'VENCIDO' ? 'Vencida' : 'Vence em breve') : (v.cnhValidadeResponsavel ? 'Regular' : 'Não informada');
    }
    analise = RelA4_analise_(FrotaIA_promptVeiculo_(v, dados.periodo, alertasVeiculo), FrotaRel_textoPadraoVeiculo_(v, dados.periodo, pendencias));
    html = FrotaRel_montarDocumentoVeiculoHtml_(v, dados.periodo, analise.texto, alertasVeiculo, documentosAtuais, pendencias, emitidoPor);
    identificador = v.placa + ' ' + periodoArq;
    subpasta = v.placa;
  } else {
    analise = RelA4_analise_(FrotaIA_promptFrota_(dados), FrotaRel_textoPadraoGeral_(dados));
    html = FrotaRel_montarDocumentoHtml_(dados, analise.texto, emitidoPor);
    identificador = 'Frota completa ' + periodoArq;
    subpasta = 'Frota completa';
  }

  var gravacao = RelA4_salvar_(FrotaRel_pastaDestino_(subpasta), identificador, html, { compartilhar: true });
  if (!gravacao.salvo) SGO_DATA.log('FROTA_RELATORIO_PDF_FALHA', sessao.usuario, gravacao.aviso, 'FROTA');
  SGO_DATA.log('FROTA_RELATORIO_GERAR', sessao.usuario, 'Relatório de frota ' + (veiculoId ? 'do veículo ' + veiculoId : 'geral') + ' — ' + dataInicio + ' a ' + dataFim + ' (análise: ' + (analise.origem === 'IA' ? 'IA' : 'texto padrão') + ')', 'FROTA');

  var avisos = [gravacao.aviso, analise.aviso].filter(Boolean).join(' ');
  return {
    ok: true, html: RelA4_injetarAvisos_(gravacao.html, RelA4_avisosPadrao_(gravacao, [analise])),
    link: gravacao.pdfUrl, htmlUrl: gravacao.htmlUrl, pastaUrl: gravacao.pastaUrl,
    analise: analise.origem, aviso: avisos
  };
}
