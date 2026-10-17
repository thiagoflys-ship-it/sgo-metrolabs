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
      id: v.ID, placa: v.PLACA, modelo: v.MODELO || '', marca: v.MARCA || '', ano: v.ANO || '', status: v.STATUS, kmAtual: Number(v.KM_ATUAL || 0),
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

    var kmSaidaNum = Number(m.KM_SAIDA || 0);
    if (alvo.kmInicioPeriodo === null || kmSaidaNum < alvo.kmInicioPeriodo) alvo.kmInicioPeriodo = kmSaidaNum;

    var finalizado = SGO_UTILS.safeUpper(m.STATUS) === 'FINALIZADO' && m.KM_CHEGADA !== '' && m.KM_CHEGADA !== undefined && m.KM_CHEGADA !== null;
    var kmChegadaNum = finalizado ? Number(m.KM_CHEGADA) : null;
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
    alvo.manutencoesCusto += Number(m.CUSTO || 0);
    var tipoInfo = FROTA_CFG.TIPOS_MANUTENCAO.filter(function(t) { return t.codigo === m.TIPO; })[0];
    alvo.manutencoesLista.push({
      servico: tipoInfo ? tipoInfo.label : m.TIPO, data: m.DATA, km: m.KM, oficina: m.OFICINA || '',
      valor: Number(m.CUSTO || 0), proxima: m.PROXIMA_DATA || (m.PROXIMA_KM ? ('KM ' + m.PROXIMA_KM) : '')
    });
  });

  var despesasPorTipo = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_DESPESA).forEach(function(d) {
    var data = Frota_parseDataHora_(d.DATA, '00:00');
    if (!data || data.getTime() < inicio.getTime() || data.getTime() > fim.getTime()) return;
    var alvo = porVeiculo[SGO_UTILS.safe(d.VEICULO_ID)];
    if (!alvo) return;
    var valor = Number(d.VALOR || 0);
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
    alvo.multasValor += Number(mu.VALOR || 0);
    if (mu.CONDUTOR_ID) alvo.multasIdentificadas++;
    var condutorMulta = (condutores[SGO_UTILS.safe(mu.CONDUTOR_ID)] || {}).NOME || 'Não identificado';
    alvo.multasLista.push({
      data: mu.DATA_INFRACAO, tipo: 'Multa (' + (mu.ORGAO_AUTUADOR || 'órgão não informado') + ')',
      condutor: condutorMulta, valor: Number(mu.VALOR || 0), status: mu.STATUS || 'ABERTA', observacao: mu.DESCRICAO || ''
    });
  });

  var abastecimentosPorVeiculoKm = {};
  Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO).forEach(function(a) {
    var data = Frota_parseDataHora_(a.DATA, '00:00');
    if (!data || data.getTime() < inicio.getTime() || data.getTime() > fim.getTime()) return;
    var vid = SGO_UTILS.safe(a.VEICULO_ID);
    var alvo = porVeiculo[vid];
    if (!alvo) return;
    var litros = Number(a.LITROS || 0);
    var valor = Number(a.VALOR || 0);
    var km = Number(a.KM || 0);
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
    periodo: { inicio: dataInicioStr, fim: dataFimStr, dias: Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1 },
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
 * Pendências e providências (bloco 10 do relatório) — gerado automático
 * a partir dos MESMOS alertas que já alimentam a dashboard/menu, nunca
 * cadastro manual (decisão do usuário, 2026-08-25). "Responsável" fica
 * genérico ("Gestor de Frota") pra manutenção/documento — não tem como o
 * sistema saber quem é a pessoa física responsável por trocar um óleo;
 * pra CNH, o responsável É o próprio condutor.
 *
 * Recebe a lista JÁ FILTRADA pelo chamador (não filtra por veículo aqui
 * dentro) — pro relatório geral, passa dados.alertasAtuais inteiro; pro
 * relatório por veículo, passa a lista já restrita àquele veículo + CNH
 * do condutor responsável dele (ver Frota_apiGerarRelatorio).
 */
function FrotaRel_montarPendencias_(alertasJaFiltrados) {
  return alertasJaFiltrados
    .map(function(a) {
      var critico = a.status === 'VENCIDO';
      var pendencia = a.categoria === 'CNH' ? ('Renovar CNH — ' + a.veiculoPlaca)
        : a.categoria === 'DOCUMENTO' ? ('Renovar documento — ' + a.tipoLabel + ' (' + a.veiculoPlaca + ')')
        : a.categoria === 'QUALIDADE' ? (a.tipoLabel + (a.veiculoPlaca ? ' (' + a.veiculoPlaca + ')' : '') + (a.vencimento ? ' — infração de ' + a.vencimento : ''))
        : ('Manutenção — ' + a.tipoLabel + ' (' + a.veiculoPlaca + ')');
      return {
        pendencia: pendencia,
        responsavel: a.categoria === 'CNH' ? a.veiculoPlaca : 'Gestor de Frota',
        prazo: a.vencimento || (critico ? 'Vencido' : 'A confirmar'),
        situacao: critico ? 'Vencida' : 'Programada'
      };
    });
}

// ------------------------------------------------------------
// GRÁFICO DE BARRAS HORIZONTAL (SVG estático) — Apps Script converte
// HTML->PDF sem executar JS/canvas, então todo gráfico embutido no PDF
// tem que ser SVG puro (mesma técnica de NR13Doc_montarGraficoTH_).
// ------------------------------------------------------------
function FrotaRel_montarGraficoBarras_(itens, opts) {
  opts = opts || {};
  if (!itens.length) return '<p style="color:#6b7280;font-size:11.5px;">Sem dados no período.</p>';

  var W = 640;
  var alturaBarra = 20, gapBarra = 9;
  var margemEsq = 130, margemDir = 60, margemTopo = 10, margemBase = 10;
  var H = margemTopo + margemBase + itens.length * (alturaBarra + gapBarra);
  var chartW = W - margemEsq - margemDir;
  var maxValor = Math.max.apply(null, itens.map(function(i) { return i.valor; }).concat([0.0001]));
  var cor = opts.cor || '#1f6f45';

  var svg = [];
  svg.push('<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:640px;height:auto;">');
  svg.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>');

  itens.forEach(function(item, i) {
    var y = margemTopo + i * (alturaBarra + gapBarra);
    var largura = maxValor > 0 ? (Math.max(item.valor, 0) / maxValor) * chartW : 0;
    svg.push('<text x="' + (margemEsq - 8) + '" y="' + (y + alturaBarra / 2 + 4) + '" font-size="11" fill="#374151" text-anchor="end" font-family="Arial,sans-serif">' + FrotaRel_escaparHtml_(item.rotulo) + '</text>');
    svg.push('<rect x="' + margemEsq + '" y="' + y + '" width="' + Math.max(largura, 1).toFixed(1) + '" height="' + alturaBarra + '" fill="' + cor + '" rx="3"/>');
    svg.push('<text x="' + (margemEsq + largura + 6).toFixed(1) + '" y="' + (y + alturaBarra / 2 + 4) + '" font-size="11" fill="#1f2937" font-family="Arial,sans-serif">' + FrotaRel_escaparHtml_(item.rotuloValor) + '</text>');
  });

  svg.push('</svg>');
  return svg.join('');
}

function FrotaRel_paragrafosHtml_(texto) {
  var partes = String(texto || '').split(/\n{2,}/).map(function(p) { return p.trim(); }).filter(Boolean);
  if (!partes.length) return '<p>Interpretação por IA indisponível para este relatório.</p>';
  return partes.map(function(p) { return '<p>' + FrotaRel_escaparHtml_(p) + '</p>'; }).join('\n');
}

// ------------------------------------------------------------
// CSS COMUM — igual pro relatório geral da frota e pro relatório por
// veículo, evita duas cópias divergindo com o tempo.
// ------------------------------------------------------------
function FrotaRel_cssComum_() {
  return [
    '@page { size: A4; margin: 16mm 15mm; }',
    '* { box-sizing: border-box; }',
    'body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 12.5px; line-height: 1.5; margin: 0; background: #f3f4f6; }',
    '.folha { max-width: 900px; margin: 24px auto; background: #ffffff; padding: 26px 32px 40px; box-shadow: 0 2px 10px rgba(0,0,0,.12); }',
    '.topo { display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #1f6f45; padding-bottom: 12px; margin-bottom: 16px; }',
    '.logo-topo { height: 44px; }',
    '.numero-doc { border:1px solid #1f6f45; color:#1f6f45; font-weight:700; padding:5px 12px; border-radius:4px; font-size:12px; }',
    'h1.titulo-cert { text-align:center; font-size:18px; color:#1f6f45; margin: 6px 0 2px; }',
    'p.subtitulo-cert { text-align:center; font-size:11.5px; color:#6b7280; margin: 0 0 16px; }',
    '.faixa-secao { background:#1f6f45; color:#fff; font-weight:700; font-size:12.5px; padding:7px 12px; margin: 18px 0 10px; }',
    '.kpis { display:flex; gap: 10px; flex-wrap: wrap; margin: 10px 0 16px; }',
    '.kpi-box { flex:1; min-width: 120px; border:1px solid #cfe8d8; border-radius:4px; padding:10px 12px; background:#f7fdf9; text-align:center; page-break-inside: avoid; }',
    '.kpi-box .valor { font-size: 19px; font-weight:800; color:#1f6f45; }',
    '.kpi-box .rotulo-mini { font-size: 10px; color:#6b7280; text-transform: uppercase; }',
    '.grafico-wrap { margin: 10px 0 18px; page-break-inside: avoid; }',
    '.grafico-titulo { font-size: 12px; font-weight:700; color:#14532d; margin-bottom: 6px; }',
    'table.dados { width:100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }',
    'table.dados th { background:#eafbf0; color:#14532d; font-weight:700; padding: 6px 7px; border: 1px solid #cfe8d8; text-align:left; }',
    'table.dados td { border: 1px solid #cfe8d8; padding: 5px 7px; }',
    '.ranking-box { display:flex; gap: 14px; flex-wrap: wrap; margin: 10px 0 16px; }',
    '.ranking-col { flex:1; min-width: 220px; }',
    '.ranking-col h3 { font-size: 11.5px; color:#14532d; margin: 0 0 6px; }',
    '.ranking-col ol { margin: 0; padding-left: 18px; font-size: 11px; }',
    '.ranking-col li { margin-bottom: 3px; }',
    '.alerta-item { padding: 6px 10px; border-radius: 4px; font-size: 11px; margin-bottom: 6px; }',
    '.alerta-item.critico { background:#fdecec; color:#b91c1c; border:1px solid #f5b5b5; }',
    '.alerta-item.aviso { background:#fff8e6; color:#8a5a00; border:1px solid #f0d999; }',
    '.secao-prosa { margin: 10px 0 16px; }',
    '.secao-prosa p { text-align: justify; margin: 6px 0; }',
    '.identificacao-box { display:flex; flex-wrap:wrap; gap: 10px; margin: 10px 0 16px; }',
    '.identificacao-item { flex:1; min-width: 150px; border:1px solid #cfe8d8; border-radius:4px; padding:8px 12px; background:#f7fdf9; }',
    '.identificacao-item .rotulo-mini { font-size: 10px; color:#6b7280; text-transform: uppercase; }',
    '.identificacao-item .valor-mini { font-size: 13px; font-weight:700; color:#14532d; }',
    '.rodape-empresa { margin-top: 30px; padding-top: 8px; border-top: 1px solid #cfe8d8; font-size: 10px; color:#6b7280; text-align:center; }',
    '.barra-imprimir { max-width: 900px; margin: 0 auto 12px; text-align: right; }',
    '.barra-imprimir button { background:#1f6f45; color:#fff; border:none; padding:10px 18px; border-radius:4px; font-weight:700; cursor:pointer; font-size:13px; }',
    '@media print { body { background:#ffffff; } .folha { box-shadow:none; margin:0; padding:0; max-width:none; } .no-print { display:none !important; } }',
    SGO_DocA4_css_(),
    'table.dados.larga td.num { white-space: normal; }'
  ].join('\n');
}

// ------------------------------------------------------------
// MONTAGEM DO DOCUMENTO HTML A4
// ------------------------------------------------------------
function FrotaRel_montarDocumentoHtml_(dados, interpretacaoIA) {
  var empresa = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE) ||
    { nome: 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: '', site: '', telefone: '', endereco: '' };
  var logo = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.LOGO_BASE64) || null;

  var veiculosPorRetiradas = dados.veiculos.slice().sort(function(a, b) { return b.retiradas - a.retiradas; }).slice(0, 15);
  var graficoRetiradas = FrotaRel_montarGraficoBarras_(
    veiculosPorRetiradas.map(function(v) { return { rotulo: v.placa, valor: v.retiradas, rotuloValor: String(v.retiradas) }; }),
    { cor: '#1f6f45' }
  );

  var veiculosPorKm = dados.veiculos.slice().sort(function(a, b) { return b.kmRodado - a.kmRodado; }).slice(0, 15);
  var graficoKm = FrotaRel_montarGraficoBarras_(
    veiculosPorKm.map(function(v) { return { rotulo: v.placa, valor: v.kmRodado, rotuloValor: FrotaRel_num_(v.kmRodado, 0) + ' km' }; }),
    { cor: '#2563a8' }
  );

  var veiculosPorParada = dados.veiculos.slice().filter(function(v) { return v.paradasDias > 0; }).sort(function(a, b) { return b.paradasDias - a.paradasDias; }).slice(0, 15);
  var graficoParadas = FrotaRel_montarGraficoBarras_(
    veiculosPorParada.map(function(v) { return { rotulo: v.placa, valor: v.paradasDias, rotuloValor: FrotaRel_num_(v.paradasDias, 1) + ' dias' }; }),
    { cor: '#c98a12' }
  );

  var html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<title>Relatório de Frota — ' + FrotaRel_escaparHtml_(dados.periodo.inicio) + ' a ' + FrotaRel_escaparHtml_(dados.periodo.fim) + '</title>');
  html.push('<style>');
  html.push(FrotaRel_cssComum_());
  html.push('</style></head><body>');

  html.push('<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>');
  html.push('<div class="folha">');

  html.push('<div class="topo">');
  if (logo && logo.data) {
    html.push('<img class="logo-topo" src="data:' + logo.mimeType + ';base64,' + logo.data + '" alt="Metrolab\'s">');
  } else {
    html.push('<div></div>');
  }
  html.push('<div class="numero-doc">' + FrotaRel_escaparHtml_(dados.periodo.inicio) + ' a ' + FrotaRel_escaparHtml_(dados.periodo.fim) + '</div>');
  html.push('</div>');

  html.push('<h1 class="titulo-cert">Relatório de Frota</h1>');
  html.push('<p class="subtitulo-cert">Histórico de uso, custos, alertas e interpretação executiva — ' + dados.periodo.dias + ' dias analisados</p>');

  html.push('<div class="faixa-secao">RESUMO DO PERÍODO</div>');
  html.push('<div class="kpis">');
  html.push('<div class="kpi-box"><div class="valor">' + dados.totalVeiculosFrota + '</div><div class="rotulo-mini">Veículos ativos</div></div>');
  html.push('<div class="kpi-box"><div class="valor">' + dados.totais.retiradas + '</div><div class="rotulo-mini">Retiradas</div></div>');
  html.push('<div class="kpi-box"><div class="valor">' + FrotaRel_num_(dados.totais.km, 0) + '</div><div class="rotulo-mini">KM rodados</div></div>');
  html.push('<div class="kpi-box"><div class="valor">' + FrotaRel_num_(dados.totais.consumoMedioKmL, 1) + '</div><div class="rotulo-mini">Consumo médio (km/L)</div></div>');
  html.push('<div class="kpi-box"><div class="valor">' + FrotaRel_moeda_(dados.totais.custoTotal) + '</div><div class="rotulo-mini">Custo total</div></div>');
  html.push('<div class="kpi-box"><div class="valor">' + FrotaRel_moeda_(dados.totais.custoPorKm) + '</div><div class="rotulo-mini">Custo por KM</div></div>');
  html.push('<div class="kpi-box"><div class="valor">' + dados.totais.multasQtd + '</div><div class="rotulo-mini">Multas (' + FrotaRel_moeda_(dados.totais.multasValor) + ')</div></div>');
  html.push('<div class="kpi-box"><div class="valor">' + FrotaRel_num_(dados.totais.paradasDias, 0) + '</div><div class="rotulo-mini">Dias parados</div></div>');
  html.push('</div>');

  html.push('<div class="faixa-secao">VEÍCULOS MAIS USADOS / DISPUTADOS x MAIS OCIOSOS</div>');
  html.push('<div class="ranking-box">');
  html.push('<div class="ranking-col"><h3>Top uso (por nº de retiradas)</h3><ol>');
  dados.rankingMaisUsados.slice(0, 5).forEach(function(v) {
    html.push('<li>' + FrotaRel_escaparHtml_(v.placa) + ' — ' + v.retiradas + ' retiradas, ' + FrotaRel_num_(v.kmRodado, 0) + ' km, ' + FrotaRel_num_(v.taxaUtilizacao, 1) + '% de utilização</li>');
  });
  if (!dados.rankingMaisUsados.length) html.push('<li>Sem retiradas no período.</li>');
  html.push('</ol></div>');
  html.push('<div class="ranking-col"><h3>Veículos ociosos (0 retiradas no período)</h3><ol>');
  dados.rankingOciosos.forEach(function(v) { html.push('<li>' + FrotaRel_escaparHtml_(v.placa) + (v.modelo ? (' — ' + FrotaRel_escaparHtml_(v.modelo)) : '') + '</li>'); });
  if (!dados.rankingOciosos.length) html.push('<li>Nenhum — todos os veículos tiveram uso no período.</li>');
  html.push('</ol></div>');
  html.push('</div>');

  html.push('<div class="grafico-wrap"><div class="grafico-titulo">Retiradas por veículo</div>' + graficoRetiradas + '</div>');
  html.push('<div class="grafico-wrap"><div class="grafico-titulo">KM rodado por veículo</div>' + graficoKm + '</div>');
  if (veiculosPorParada.length) {
    html.push('<div class="grafico-wrap"><div class="grafico-titulo">Dias parados por veículo</div>' + graficoParadas + '</div>');
  }

  html.push('<div class="faixa-secao">DETALHAMENTO POR VEÍCULO</div>');
  html.push('<table class="dados larga"><thead><tr><th>Veículo</th><th class="num">Retiradas</th><th class="num">KM</th><th class="num">Utilização</th><th class="num">Consumo</th><th class="num">Manutenção</th><th class="num">Despesas</th><th class="num">Combustível</th><th class="num">Custo/KM</th><th class="num">Paradas</th><th class="num">Multas</th></tr></thead><tbody>');
  dados.veiculos.sort(function(a, b) { return b.retiradas - a.retiradas; }).forEach(function(v) {
    html.push('<tr>' +
      '<td>' + FrotaRel_escaparHtml_(v.placa) + (v.modelo ? (' — ' + FrotaRel_escaparHtml_(v.modelo)) : '') + '</td>' +
      '<td class="num">' + v.retiradas + '</td>' +
      '<td class="num">' + FrotaRel_num_(v.kmRodado, 0) + '</td>' +
      '<td class="num">' + FrotaRel_num_(v.taxaUtilizacao, 1) + '%</td>' +
      '<td class="num">' + (v.consumoMedioKmL > 0 ? (FrotaRel_num_(v.consumoMedioKmL, 1) + ' km/L') : '—') + '</td>' +
      '<td class="num">' + v.manutencoesQtd + ' (' + FrotaRel_moeda_(v.manutencoesCusto) + ')</td>' +
      '<td class="num">' + FrotaRel_moeda_(v.despesasValor) + '</td>' +
      '<td class="num">' + FrotaRel_moeda_(v.abastecimentosValor) + '</td>' +
      '<td class="num">' + (v.custoPorKm > 0 ? FrotaRel_moeda_(v.custoPorKm) : '—') + '</td>' +
      '<td class="num">' + v.paradasQtd + ' (' + FrotaRel_num_(v.paradasDias, 1) + ' dias)</td>' +
      '<td class="num">' + v.multasQtd + ' (' + FrotaRel_moeda_(v.multasValor) + ')</td>' +
      '</tr>');
  });
  html.push('</tbody></table>');

  if (dados.condutorMaisAtuante) {
    html.push('<div class="faixa-secao">CONDUTOR MAIS ATUANTE NO PERÍODO</div>');
    html.push('<p style="margin:6px 0 16px;">' + FrotaRel_escaparHtml_(dados.condutorMaisAtuante.nome) + ' — ' + dados.condutorMaisAtuante.retiradas + ' retiradas registradas.</p>');
  }

  var tiposDespesa = Object.keys(dados.despesasPorTipo);
  if (tiposDespesa.length) {
    html.push('<div class="faixa-secao">DESPESAS POR TIPO</div>');
    html.push('<table class="dados"><thead><tr><th>Tipo</th><th class="num">Total</th></tr></thead><tbody>');
    tiposDespesa.sort(function(a, b) { return dados.despesasPorTipo[b] - dados.despesasPorTipo[a]; }).forEach(function(t) {
      html.push('<tr><td>' + FrotaRel_escaparHtml_(t) + '</td><td class="num">' + FrotaRel_moeda_(dados.despesasPorTipo[t]) + '</td></tr>');
    });
    html.push('</tbody></table>');
  }

  html.push('<div class="faixa-secao">SITUAÇÃO ATUAL — ALERTAS DE MANUTENÇÃO E DOCUMENTOS</div>');
  if (dados.alertasAtuais.length) {
    dados.alertasAtuais.forEach(function(a) {
      var critico = a.status === 'VENCIDO';
      html.push('<div class="alerta-item ' + (critico ? 'critico' : 'aviso') + '">' + (critico ? '🚨 ' : '⚠️ ') +
        FrotaRel_escaparHtml_(a.veiculoPlaca) + ' — ' + FrotaRel_escaparHtml_(a.tipoLabel) + (critico ? ' VENCIDO(A)' : ' vencendo em breve') + '</div>');
    });
  } else {
    html.push('<div class="alerta-item" style="background:#eafbf0;color:#14532d;border:1px solid #cfe8d8;">Nenhuma manutenção ou documento vencido/vencendo no momento.</div>');
  }

  html.push('<div class="faixa-secao">INTERPRETAÇÃO EXECUTIVA (IA)</div>');
  html.push('<div class="secao-prosa">' + FrotaRel_paragrafosHtml_(interpretacaoIA) + '</div>');

  var pendencias = FrotaRel_montarPendencias_(dados.alertasAtuais);
  html.push('<div class="faixa-secao">PENDÊNCIAS E PROVIDÊNCIAS</div>');
  if (pendencias.length) {
    html.push('<table class="dados"><thead><tr><th>Pendência</th><th>Responsável</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>');
    pendencias.forEach(function(p) {
      html.push('<tr><td>' + FrotaRel_escaparHtml_(p.pendencia) + '</td><td>' + FrotaRel_escaparHtml_(p.responsavel) + '</td><td>' + FrotaRel_escaparHtml_(p.prazo) + '</td><td>' + FrotaRel_escaparHtml_(p.situacao) + '</td></tr>');
    });
    html.push('</tbody></table>');
  } else {
    html.push('<div class="alerta-item" style="background:#eafbf0;color:#14532d;border:1px solid #cfe8d8;">Nenhuma pendência em aberto no momento.</div>');
  }

  html.push('<div class="rodape-empresa">' + FrotaRel_escaparHtml_(empresa.nome || '') + (empresa.cnpj ? (' — CNPJ ' + FrotaRel_escaparHtml_(empresa.cnpj)) : '') +
    '<br>Relatório gerado automaticamente pelo Portal SGO+ em ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm') + '</div>');

  html.push('</div></body></html>');
  return html.join('');
}

// ------------------------------------------------------------
// RELATÓRIO POR VEÍCULO — os 10 blocos exatos pedidos pelo usuário
// (2026-08-25): Identificação, Utilização, Abastecimentos, Despesas,
// Manutenções, Documentos, Multas e ocorrências, Resumo gerencial,
// Conclusão do responsável (IA), Pendências e providências.
// ------------------------------------------------------------
function FrotaRel_situacaoVeiculoLabel_(status) {
  var s = String(status || '').toUpperCase();
  if (s === 'EM_USO') return 'Em uso';
  if (s === 'INATIVO') return 'Bloqueado';
  return 'Disponível';
}

function FrotaRel_montarDocumentoVeiculoHtml_(v, periodo, interpretacaoIA, alertasVeiculo, documentosAtuais, pendencias) {
  var empresa = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE) ||
    { nome: 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: '', site: '', telefone: '', endereco: '' };
  var logo = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.LOGO_BASE64) || null;

  var html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<title>Relatório de Frota — ' + FrotaRel_escaparHtml_(v.placa) + '</title>');
  html.push('<style>');
  html.push(FrotaRel_cssComum_());
  html.push('</style></head><body>');

  html.push('<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>');
  html.push('<div class="folha">');

  html.push('<div class="topo">');
  if (logo && logo.data) {
    html.push('<img class="logo-topo" src="data:' + logo.mimeType + ';base64,' + logo.data + '" alt="Metrolab\'s">');
  } else {
    html.push('<div></div>');
  }
  html.push('<div class="numero-doc">' + FrotaRel_escaparHtml_(periodo.inicio) + ' a ' + FrotaRel_escaparHtml_(periodo.fim) + '</div>');
  html.push('</div>');

  html.push('<h1 class="titulo-cert">Relatório Funcional de Frota</h1>');
  html.push('<p class="subtitulo-cert">Veículo ' + FrotaRel_escaparHtml_(v.placa) + ' — ' + periodo.dias + ' dias analisados</p>');

  // 1. Identificação
  html.push('<div class="faixa-secao">1. IDENTIFICAÇÃO</div>');
  html.push('<div class="identificacao-box">');
  [
    ['Placa', v.placa],
    ['Marca/Modelo', (v.marca || '—') + ' / ' + (v.modelo || '—')],
    ['Ano', v.ano || '—'],
    ['Condutor responsável', v.condutorResponsavel || 'Não identificado no período'],
    ['KM inicial do período', v.kmInicioPeriodo !== null ? FrotaRel_num_(v.kmInicioPeriodo, 0) : '—'],
    ['KM final do período', v.kmFimPeriodo !== null ? FrotaRel_num_(v.kmFimPeriodo, 0) : '—'],
    ['Situação atual', FrotaRel_situacaoVeiculoLabel_(v.status)]
  ].forEach(function(par) {
    html.push('<div class="identificacao-item"><div class="rotulo-mini">' + FrotaRel_escaparHtml_(par[0]) + '</div><div class="valor-mini">' + FrotaRel_escaparHtml_(String(par[1])) + '</div></div>');
  });
  html.push('</div>');

  // 2. Utilização no período
  html.push('<div class="faixa-secao">2. UTILIZAÇÃO NO PERÍODO</div>');
  if (v.movimentacoesLista.length) {
    html.push('<table class="dados"><thead><tr><th>Data</th><th>Condutor</th><th>Destino/Missão</th><th class="num">KM inicial</th><th class="num">KM final</th><th class="num">Total</th><th>Observações</th></tr></thead><tbody>');
    v.movimentacoesLista.forEach(function(m) {
      html.push('<tr><td>' + FrotaRel_escaparHtml_(m.data) + '</td><td>' + FrotaRel_escaparHtml_(m.condutor || '—') + '</td><td>' + FrotaRel_escaparHtml_(m.finalidade || '—') + '</td>' +
        '<td class="num">' + FrotaRel_num_(m.kmSaida, 0) + '</td><td class="num">' + (m.kmChegada !== null ? FrotaRel_num_(m.kmChegada, 0) : (m.emAndamento ? 'em andamento' : '—')) + '</td>' +
        '<td class="num">' + (m.total !== null ? FrotaRel_num_(m.total, 0) : '—') + '</td><td>' + FrotaRel_escaparHtml_(m.observacoes || '—') + '</td></tr>');
    });
    html.push('</tbody></table>');
  } else {
    html.push('<p style="color:#6b7280;font-size:11.5px;">Nenhuma retirada registrada no período.</p>');
  }

  // 3. Abastecimentos
  html.push('<div class="faixa-secao">3. ABASTECIMENTOS</div>');
  if (v.abastecimentosLista.length) {
    html.push('<table class="dados"><thead><tr><th>Data</th><th class="num">KM</th><th>Combustível</th><th class="num">Litros</th><th class="num">Valor</th><th>Posto</th><th>Comprovante</th></tr></thead><tbody>');
    v.abastecimentosLista.forEach(function(a) {
      html.push('<tr><td>' + FrotaRel_escaparHtml_(a.data) + '</td><td class="num">' + FrotaRel_num_(a.km, 0) + '</td><td>' + FrotaRel_escaparHtml_(a.tipoCombustivel) + '</td>' +
        '<td class="num">' + FrotaRel_num_(a.litros, 2) + ' L</td><td class="num">' + FrotaRel_moeda_(a.valor) + '</td><td>' + FrotaRel_escaparHtml_(a.posto || '—') + '</td>' +
        '<td>' + (a.comprovante ? '<a href="' + a.comprovante + '" target="_blank">ver</a>' : '—') + '</td></tr>');
    });
    html.push('</tbody></table>');
    html.push('<p style="font-size:11px;color:#374151;"><strong>Consumo médio no período:</strong> ' + (v.consumoMedioKmL > 0 ? (FrotaRel_num_(v.consumoMedioKmL, 1) + ' km/L') : 'sem dados suficientes (precisa de pelo menos 2 abastecimentos)') + '</p>');
  } else {
    html.push('<p style="color:#6b7280;font-size:11.5px;">Nenhum abastecimento registrado no período.</p>');
  }

  // 4. Despesas
  html.push('<div class="faixa-secao">4. DESPESAS</div>');
  if (v.despesasLista.length) {
    html.push('<table class="dados"><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th class="num">Valor</th></tr></thead><tbody>');
    v.despesasLista.forEach(function(d) {
      html.push('<tr><td>' + FrotaRel_escaparHtml_(d.data) + '</td><td>' + FrotaRel_escaparHtml_(d.tipo) + '</td><td>' + FrotaRel_escaparHtml_(d.descricao || '—') + '</td><td class="num">' + FrotaRel_moeda_(d.valor) + '</td></tr>');
    });
    html.push('</tbody></table>');
  } else {
    html.push('<p style="color:#6b7280;font-size:11.5px;">Nenhuma despesa avulsa registrada no período.</p>');
  }
  html.push('<p style="font-size:11px;color:#374151;"><strong>Total gasto no período:</strong> ' + FrotaRel_moeda_(v.custoTotal) + ' &nbsp;|&nbsp; <strong>Custo médio por quilômetro:</strong> ' + (v.custoPorKm > 0 ? FrotaRel_moeda_(v.custoPorKm) : '—') + '</p>');

  // 5. Manutenções
  html.push('<div class="faixa-secao">5. MANUTENÇÕES</div>');
  if (v.manutencoesLista.length) {
    html.push('<table class="dados"><thead><tr><th>Serviço</th><th>Data</th><th class="num">KM</th><th>Oficina</th><th class="num">Valor</th><th>Próxima</th><th>Situação</th></tr></thead><tbody>');
    v.manutencoesLista.forEach(function(m) {
      html.push('<tr><td>' + FrotaRel_escaparHtml_(m.servico) + '</td><td>' + FrotaRel_escaparHtml_(m.data) + '</td><td class="num">' + FrotaRel_escaparHtml_(String(m.km || '—')) + '</td>' +
        '<td>' + FrotaRel_escaparHtml_(m.oficina || '—') + '</td><td class="num">' + FrotaRel_moeda_(m.valor) + '</td><td>' + FrotaRel_escaparHtml_(m.proxima || '—') + '</td><td>Realizada</td></tr>');
    });
    html.push('</tbody></table>');
  } else {
    html.push('<p style="color:#6b7280;font-size:11.5px;">Nenhuma manutenção registrada no período.</p>');
  }

  // 6. Documentos
  html.push('<div class="faixa-secao">6. DOCUMENTOS</div>');
  if (documentosAtuais.length) {
    html.push('<table class="dados"><thead><tr><th>Documento</th><th>Validade</th><th>Situação</th></tr></thead><tbody>');
    documentosAtuais.forEach(function(d) {
      html.push('<tr><td>' + FrotaRel_escaparHtml_(d.tipo) + '</td><td>' + FrotaRel_escaparHtml_(d.validade || 'sem prazo') + '</td><td>' + FrotaRel_escaparHtml_(d.situacao) + '</td></tr>');
    });
  } else {
    html.push('<table class="dados"><tbody>');
  }
  html.push('<tr><td>Validade da CNH do condutor responsável</td><td>' + FrotaRel_escaparHtml_(v.cnhValidadeResponsavel || 'não informado') + '</td><td>' + FrotaRel_escaparHtml_(v.cnhSituacaoResponsavel || '—') + '</td></tr>');
  html.push('</tbody></table>');

  // 7. Multas e ocorrências (multas + paradas/acidentes/avarias/mecânica)
  html.push('<div class="faixa-secao">7. MULTAS E OCORRÊNCIAS</div>');
  var ocorrencias = v.multasLista.map(function(m) {
    return { data: m.data, tipo: m.tipo, condutor: m.condutor, valor: m.valor, situacao: m.status, observacao: m.observacao };
  }).concat(v.paradasLista.map(function(p) {
    return { data: p.dataInicio, tipo: 'Ocorrência: ' + (p.motivo || 'não informado'), condutor: '—', valor: 0, situacao: p.dataFim ? 'Encerrada' : 'Em aberto', observacao: p.descricao || '' };
  }));
  if (ocorrencias.length) {
    html.push('<table class="dados"><thead><tr><th>Data</th><th>Tipo</th><th>Condutor</th><th class="num">Valor</th><th>Situação</th><th>Observação</th></tr></thead><tbody>');
    ocorrencias.forEach(function(o) {
      html.push('<tr><td>' + FrotaRel_escaparHtml_(o.data) + '</td><td>' + FrotaRel_escaparHtml_(o.tipo) + '</td><td>' + FrotaRel_escaparHtml_(o.condutor) + '</td>' +
        '<td class="num">' + (o.valor > 0 ? FrotaRel_moeda_(o.valor) : '—') + '</td><td>' + FrotaRel_escaparHtml_(o.situacao) + '</td><td>' + FrotaRel_escaparHtml_(o.observacao || '—') + '</td></tr>');
    });
    html.push('</tbody></table>');
  } else {
    html.push('<p style="color:#6b7280;font-size:11.5px;">Nenhuma multa, acidente, avaria ou problema mecânico relevante registrado no período.</p>');
  }

  // 8. Resumo gerencial
  html.push('<div class="faixa-secao">8. RESUMO GERENCIAL</div>');
  var situacaoGeral = pendencias.length ? 'Pendente' : 'Regular';
  html.push('<table class="dados"><thead><tr><th>Indicador</th><th>Resultado</th></tr></thead><tbody>');
  [
    ['Quilometragem percorrida', FrotaRel_num_(v.kmRodado, 0) + ' km'],
    ['Combustível consumido', FrotaRel_num_(v.abastecimentosLitros, 2) + ' litros'],
    ['Consumo médio', v.consumoMedioKmL > 0 ? (FrotaRel_num_(v.consumoMedioKmL, 1) + ' km/L') : '—'],
    ['Total de abastecimento', FrotaRel_moeda_(v.abastecimentosValor)],
    ['Total de manutenção', FrotaRel_moeda_(v.manutencoesCusto)],
    ['Outras despesas', FrotaRel_moeda_(v.despesasValor)],
    ['Custo total', FrotaRel_moeda_(v.custoTotal)],
    ['Custo por quilômetro', v.custoPorKm > 0 ? (FrotaRel_moeda_(v.custoPorKm) + '/km') : '—'],
    ['Dias parados (manutenção/ocorrência)', FrotaRel_num_(v.paradasDias, 1) + ' dias'],
    ['Multas no período', String(v.multasQtd)],
    ['Situação geral', situacaoGeral]
  ].forEach(function(par) {
    html.push('<tr><td>' + FrotaRel_escaparHtml_(par[0]) + '</td><td>' + FrotaRel_escaparHtml_(par[1]) + '</td></tr>');
  });
  html.push('</tbody></table>');

  // 9. Conclusão do responsável (IA)
  html.push('<div class="faixa-secao">9. CONCLUSÃO DO RESPONSÁVEL</div>');
  html.push('<div class="secao-prosa">' + FrotaRel_paragrafosHtml_(interpretacaoIA) + '</div>');

  // 10. Pendências e providências
  html.push('<div class="faixa-secao">10. PENDÊNCIAS E PROVIDÊNCIAS</div>');
  if (pendencias.length) {
    html.push('<table class="dados"><thead><tr><th>Pendência</th><th>Responsável</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>');
    pendencias.forEach(function(p) {
      html.push('<tr><td>' + FrotaRel_escaparHtml_(p.pendencia) + '</td><td>' + FrotaRel_escaparHtml_(p.responsavel) + '</td><td>' + FrotaRel_escaparHtml_(p.prazo) + '</td><td>' + FrotaRel_escaparHtml_(p.situacao) + '</td></tr>');
    });
    html.push('</tbody></table>');
  } else {
    html.push('<div class="alerta-item" style="background:#eafbf0;color:#14532d;border:1px solid #cfe8d8;">Nenhuma pendência em aberto no momento.</div>');
  }

  html.push('<div class="rodape-empresa">' + FrotaRel_escaparHtml_(empresa.nome || '') + (empresa.cnpj ? (' — CNPJ ' + FrotaRel_escaparHtml_(empresa.cnpj)) : '') +
    '<br>Relatório gerado automaticamente pelo Portal SGO+ em ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm') + '</div>');

  html.push('</div></body></html>');
  return html.join('');
}

// ------------------------------------------------------------
// API — geração + salvamento no Drive
// ------------------------------------------------------------
/** Documentos ATUAIS do veículo (não são recortados pelo período — representam a situação de agora), com situação calculada. */
function FrotaRel_documentosAtuaisVeiculo_(veiculoId) {
  // 16/10/2026: documento renovado aparece como "Substituído" (Frota_statusDocumento_).
  var todos = Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO);
  var vigentes = Frota_documentosVigentes_(todos);
  var rotulos = { SEM_VALIDADE: 'Sem prazo', VENCIDO: 'Vencido', VENCENDO: 'Próximo do vencimento', OK: 'Regular', SUBSTITUIDO: 'Substituído por documento mais novo' };
  return todos
    .filter(function(d) { return SGO_UTILS.safe(d.VEICULO_ID) === veiculoId; })
    .map(function(d) {
      return { tipo: d.TIPO_DOCUMENTO, validade: Frota_textoData_(d.VALIDADE), situacao: rotulos[Frota_statusDocumento_(d, vigentes)] || 'Sem prazo' };
    });
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
  var html, nomeArquivoBase;

  // Interpretação por IA nunca trava a geração do relatório se falhar
  // (mesmo princípio de resiliência do NR13/CertCal) — cai num aviso
  // simples, o resto do relatório (números/gráficos reais) sai igual.
  if (veiculoId) {
    // Relatório POR VEÍCULO — os 10 blocos exatos pedidos pelo usuário
    // (2026-08-25): Identificação, Utilização, Abastecimentos, Despesas,
    // Manutenções, Documentos, Multas e ocorrências, Resumo gerencial,
    // Conclusão do responsável, Pendências.
    var v = dados.veiculos.filter(function(x) { return x.id === veiculoId; })[0];
    if (!v) throw new Error('Veículo não encontrado (ou inativo) para o relatório.');

    var alertasVeiculo = dados.alertasAtuais.filter(function(a) {
      return a.veiculoId === veiculoId || (a.categoria === 'CNH' && a.veiculoPlaca === v.condutorResponsavel);
    });
    var pendencias = FrotaRel_montarPendencias_(alertasVeiculo);
    var documentosAtuais = FrotaRel_documentosAtuaisVeiculo_(veiculoId);

    if (v.condutorResponsavel) {
      var condutorResp = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).filter(function(c) { return c.NOME === v.condutorResponsavel; })[0];
      var alertaCnh = alertasVeiculo.filter(function(a) { return a.categoria === 'CNH'; })[0];
      v.cnhValidadeResponsavel = condutorResp ? (condutorResp.CNH_VALIDADE || '') : '';
      v.cnhSituacaoResponsavel = alertaCnh ? (alertaCnh.status === 'VENCIDO' ? 'Vencida' : 'Vencendo em breve') : (v.cnhValidadeResponsavel ? 'Regular' : 'Não informado');
    }

    var interpretacaoIAVeiculo;
    try {
      interpretacaoIAVeiculo = FrotaIA_interpretarVeiculo_(v, dados.periodo, alertasVeiculo);
    } catch (e) {
      interpretacaoIAVeiculo = 'Não foi possível gerar a interpretação por IA neste momento (' + e.message + '). Os dados acima são reais e não dependem da IA.';
    }

    html = FrotaRel_montarDocumentoVeiculoHtml_(v, dados.periodo, interpretacaoIAVeiculo, alertasVeiculo, documentosAtuais, pendencias);
    nomeArquivoBase = 'Relatorio Frota ' + v.placa + ' ' + dataInicio.replace(/\//g, '-') + ' a ' + dataFim.replace(/\//g, '-');
  } else {
    // Relatório GERAL — todos os veículos da frota.
    var interpretacaoIAGeral;
    try {
      interpretacaoIAGeral = FrotaIA_interpretarFrota_(dados);
    } catch (e2) {
      interpretacaoIAGeral = 'Não foi possível gerar a interpretação por IA neste momento (' + e2.message + '). Os dados e gráficos acima são reais e não dependem da IA.';
    }

    html = FrotaRel_montarDocumentoHtml_(dados, interpretacaoIAGeral);
    nomeArquivoBase = 'Relatorio Frota Geral ' + dataInicio.replace(/\//g, '-') + ' a ' + dataFim.replace(/\//g, '-');
  }

  // 16/10/2026: a cópia em PDF é secundária — se a conversão/gravação falhar,
  // o relatório (HTML) continua saindo para revisar e imprimir, com o aviso.
  var link = '', avisoPdf = '';
  try {
    var pasta = FrotaRel_obterPastaRelatorios_();
    var nomeArquivo = Frota_sanitizarNome_(nomeArquivoBase) + '.pdf';
    var pdfBlob = Utilities.newBlob(html, 'text/html', nomeArquivo.replace(/\.pdf$/i, '.html')).getAs(MimeType.PDF).setName(nomeArquivo);
    var arquivo = pasta.createFile(pdfBlob);
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    link = arquivo.getUrl();
  } catch (ePdf) {
    avisoPdf = 'O relatório abriu para revisão, mas a cópia em PDF não foi salva (' + (ePdf && ePdf.message ? ePdf.message : ePdf) + '). Use "Imprimir / salvar PDF" na página do relatório.';
    SGO_DATA.log('FROTA_RELATORIO_PDF_FALHA', sessao.usuario, avisoPdf, 'FROTA');
  }

  SGO_DATA.log('FROTA_RELATORIO_GERAR', sessao.usuario, 'Relatório de frota gerado — ' + dataInicio + ' a ' + dataFim + (veiculoId ? (' (veículo ' + veiculoId + ')') : ' (geral)'), 'FROTA');

  // Devolve o HTML também (não só o link do Drive) — mesmo padrão dos
  // outros módulos (NR13/CertCal/PlanCME/AutoRel/LavRel): o relatório
  // abre numa aba nova pro usuário revisar e imprimir/salvar como PDF na
  // hora, o PDF no Drive é só uma cópia permanente por trás, não o único
  // jeito de ver o documento.
  return { ok: true, html: html, link: link, aviso: avisoPdf };
}
