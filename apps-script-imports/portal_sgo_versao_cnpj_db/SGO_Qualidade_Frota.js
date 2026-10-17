/****************************************************
 * SGO_Qualidade_Frota.js
 * PAINEL DE QUALIDADE — coletor da área Frota
 *
 * Só leitura. Consumo km/L é relativo à MÉDIA DA PRÓPRIA FROTA (não um
 * limite absoluto inventado) — um veículo abaixo de 70% da média do resto
 * da frota é o que vira "outlier" aqui; não tem como saber consumo
 * "normal" de fábrica sem cadastro de modelo/ano confiável.
 ****************************************************/

var QUALIDADE_FROTA_LIMIAR_CONSUMO_BAIXO = 0.7; // 70% da média da frota

// `desde` (Date, opcional) — mesmo princípio do coletor Auvo: sem argumento
// o painel vê tudo; o relatório A4 passa a data de corte do período. Datas
// da Frota são texto "dd/mm/aaaa" (não Date), por isso usa
// Frota_parseDataHora_ (já existente, SGO_Frota_Main.js) pra comparar.
function QualidadeFrota_coletar_(desde) {
  try {
    if (typeof Frota_bootstrap_ !== 'function') return null;
    Frota_bootstrap_();

    var veiculos = {};
    SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function(v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });
    var condutores = {};
    SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });
    var contagemOcorrencias = (typeof Qualidade_contarOcorrenciasAbertasPorPessoa_ === 'function') ? Qualidade_contarOcorrenciasAbertasPorPessoa_() : {};

    var analisarJson_ = function(json) {
      try {
        var arr = JSON.parse(json || '[]');
        return { valido: Array.isArray(arr), itens: Array.isArray(arr) ? arr : [] };
      } catch (e) { return { valido: false, itens: [] }; }
    };
    var pendenciasMovimentacao_ = function(m) {
      var motivos = [];
      var finalizada = SGO_UTILS.safeUpper(m.STATUS) === 'FINALIZADO';
      var chkSaida = analisarJson_(m.CHECKLIST_SAIDA_JSON);
      var fotosSaida = analisarJson_(m.FOTOS_SAIDA_JSON);
      var chkChegada = analisarJson_(m.CHECKLIST_CHEGADA_JSON);
      var fotosChegada = analisarJson_(m.FOTOS_CHEGADA_JSON);
      if (!Frota_parseDataHora_(m.DATA_SAIDA, m.HORA_SAIDA)) motivos.push('data/hora de retirada ausente ou inválida');
      if (!SGO_UTILS.safe(m.KM_SAIDA) || !(Number(m.KM_SAIDA) >= 0)) motivos.push('KM de retirada ausente ou inválido');
      if (!SGO_UTILS.safe(m.FINALIDADE)) motivos.push('finalidade não preenchida');
      if (!chkSaida.valido) motivos.push('checklist da retirada com dados inválidos');
      else if (!chkSaida.itens.length) motivos.push('checklist da retirada não preenchido');
      chkSaida.itens.forEach(function(i) { if (i && i.ok === false && !SGO_UTILS.safe(i.observacao)) motivos.push('item reprovado na retirada sem observação: ' + (i.item || 'não identificado')); });
      if (!fotosSaida.valido) motivos.push('fotos da retirada com dados inválidos');
      else if (!fotosSaida.itens.length) motivos.push('foto da retirada não anexada');
      if (finalizada) {
        if (!Frota_parseDataHora_(m.DATA_CHEGADA, m.HORA_CHEGADA)) motivos.push('data/hora de devolução ausente ou inválida');
        if (!SGO_UTILS.safe(m.KM_CHEGADA) || !(Number(m.KM_CHEGADA) >= 0)) motivos.push('KM de devolução ausente ou inválido');
        else if (Number(m.KM_CHEGADA) < Number(m.KM_SAIDA)) motivos.push('KM da devolução menor que o KM da retirada');
        if (!chkChegada.valido) motivos.push('checklist da devolução com dados inválidos');
        else if (!chkChegada.itens.length) motivos.push('checklist da devolução não preenchido');
        chkChegada.itens.forEach(function(i) { if (i && i.ok === false && !SGO_UTILS.safe(i.observacao)) motivos.push('item reprovado na devolução sem observação: ' + (i.item || 'não identificado')); });
        if (!fotosChegada.valido) motivos.push('fotos da devolução com dados inválidos');
        else if (!fotosChegada.itens.length) motivos.push('foto da devolução não anexada');
      }
      return motivos;
    };
    var depoisDoCorte_ = function(dataBr) {
      if (!desde) return true;
      var d = Frota_parseDataHora_(dataBr, '');
      return d ? d >= desde : false;
    };

    // ---------------- Movimentação (retirada/devolução) ----------------
    var movimentacoes = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO);
    if (desde) movimentacoes = movimentacoes.filter(function(m) { return depoisDoCorte_(m.DATA_SAIDA); });
    var porVeiculoUso = {}, porCondutor = {};
    var incompletasAmostra = [];
    var totalIncompletas = 0;
    var viagensPenduradas = [];
    var agora = new Date();

    movimentacoes.forEach(function(m) {
      var veiculo = veiculos[SGO_UTILS.safe(m.VEICULO_ID)] || {};
      var condutor = condutores[SGO_UTILS.safe(m.CONDUTOR_ID)] || {};
      var placa = veiculo.PLACA || 'placa não identificada';
      var nomeCondutor = condutor.NOME || (m.CONDUTOR_ID ? 'Condutor não identificado' : 'Sem condutor vinculado');

      if (!porVeiculoUso[placa]) porVeiculoUso[placa] = { nome: placa, qtd: 0 };
      porVeiculoUso[placa].qtd++;

      var chaveCondutor = m.CONDUTOR_ID || 'sem_condutor';
      if (!porCondutor[chaveCondutor]) porCondutor[chaveCondutor] = { id: m.CONDUTOR_ID || '', nome: nomeCondutor, qtd: 0, pendencias: 0, pendenciasDetalhes: [] };
      porCondutor[chaveCondutor].qtd++;

      var motivosPendencia = pendenciasMovimentacao_(m);
      if (motivosPendencia.length) {
        totalIncompletas++;
        porCondutor[chaveCondutor].pendencias++;
        var detalhe = { movimentacaoId: m.ID || '', veiculoPlaca: placa, dataSaida: SGO_UTILS.safe(m.DATA_SAIDA), motivos: motivosPendencia };
        porCondutor[chaveCondutor].pendenciasDetalhes.push(detalhe);
        if (incompletasAmostra.length < 10) {
          incompletasAmostra.push({ veiculoPlaca: veiculo.PLACA || '', condutorNome: nomeCondutor, dataSaida: SGO_UTILS.safe(m.DATA_SAIDA), motivos: motivosPendencia });
        }
      }

      if (SGO_UTILS.safeUpper(m.STATUS) === 'EM_ANDAMENTO') {
        var saida = Frota_parseDataHora_(m.DATA_SAIDA, m.HORA_SAIDA);
        if (saida) {
          var diasAberta = Math.floor((agora.getTime() - saida.getTime()) / 86400000);
          if (diasAberta >= 2) viagensPenduradas.push({ veiculoPlaca: veiculo.PLACA || '', condutorNome: nomeCondutor, dataSaida: SGO_UTILS.safe(m.DATA_SAIDA), dias: diasAberta });
        }
      }
    });

    var rankingVeiculos = Object.keys(porVeiculoUso).map(function(k) { return porVeiculoUso[k]; })
      .sort(function(a, b) { return b.qtd - a.qtd; }).slice(0, 5);
    var condutoresArr = Object.keys(porCondutor).map(function(k) { return porCondutor[k]; });
    var rankingCondutores = condutoresArr.slice().sort(function(a, b) { return b.qtd - a.qtd; }).slice(0, 5);
    rankingCondutores.forEach(function(r) { r.ocorrenciasAbertas = contagemOcorrencias[r.id || r.nome] || 0; });
    // Destaques (pra reconhecer/parabenizar): condutores com 3+ retiradas e
    // ZERO pendência de checklist/foto, ordenado por quem usa mais assim.
    var rankingCondutoresDestaque = condutoresArr.filter(function(r) { return r.qtd >= 3 && r.pendencias === 0; })
      .sort(function(a, b) { return b.qtd - a.qtd; }).slice(0, 5);

    // ---------------- Multas ----------------
    var multasSemCondutor = 0, multasAbertas = 0, valorMultasAbertas = 0;
    var porCondutorMulta = {};
    Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_MULTA).forEach(function(m) {
      if (SGO_UTILS.safeUpper(m.STATUS) !== 'ABERTA') return;
      multasAbertas++;
      valorMultasAbertas += Number(m.VALOR) || 0;
      if (!SGO_UTILS.safe(m.CONDUTOR_ID)) { multasSemCondutor++; return; }
      var condutor = condutores[SGO_UTILS.safe(m.CONDUTOR_ID)] || {};
      var nome = condutor.NOME || 'Condutor não identificado';
      porCondutorMulta[m.CONDUTOR_ID] = porCondutorMulta[m.CONDUTOR_ID] || { nome: nome, qtd: 0 };
      porCondutorMulta[m.CONDUTOR_ID].qtd++;
    });
    var rankingMultasCondutor = Object.keys(porCondutorMulta).map(function(k) { return porCondutorMulta[k]; })
      .sort(function(a, b) { return b.qtd - a.qtd; }).slice(0, 5);

    // ---------------- Documentação ----------------
    // 16/10/2026 (auditoria P1): CNH vencida não entrava no painel — dizia "0 itens / OK".
    var documentosVencidos = 0, documentosVencendo = 0, amostraDocumentos = [];
    var cnhVencidas = 0, cnhVencendo = 0, amostraCnh = [];
    if (typeof Frota_calcularAlertasManutencao_ === 'function') {
      Frota_calcularAlertasManutencao_().forEach(function(a) {
        if (a.categoria === 'CNH') {
          if (a.status === 'VENCIDO') cnhVencidas++; else cnhVencendo++;
          if (amostraCnh.length < 8) amostraCnh.push({ condutorNome: a.veiculoPlaca, status: a.status, vencimento: a.vencimento });
          return;
        }
        if (a.categoria !== 'DOCUMENTO') return;
        if (a.status === 'VENCIDO') documentosVencidos++; else documentosVencendo++;
        if (amostraDocumentos.length < 8) amostraDocumentos.push({ veiculoPlaca: a.veiculoPlaca, tipoLabel: a.tipoLabel, status: a.status, vencimento: a.vencimento });
      });
    }

    // ---------------- Manutenção — custo por veículo ----------------
    var custoPorVeiculo = {};
    SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO).forEach(function(m) {
      if (desde && !depoisDoCorte_(m.DATA)) return;
      var veiculo = veiculos[SGO_UTILS.safe(m.VEICULO_ID)] || {};
      var placa = veiculo.PLACA || 'placa não identificada';
      custoPorVeiculo[placa] = (custoPorVeiculo[placa] || 0) + (Number(m.CUSTO) || 0);
    });
    var rankingCustoManutencao = Object.keys(custoPorVeiculo).map(function(k) { return { nome: k, valor: Math.round(custoPorVeiculo[k] * 100) / 100 }; })
      .filter(function(r) { return r.valor > 0; }).sort(function(a, b) { return b.valor - a.valor; }).slice(0, 5);

    // ---------------- Paradas não planejadas (acidente/pane) ----------------
    var paradasPorVeiculo = {};
    SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_PARADA).forEach(function(p) {
      if (desde && !depoisDoCorte_(p.DATA_INICIO)) return;
      var motivo = SGO_UTILS.safeUpper(p.MOTIVO);
      if (motivo.indexOf('ACIDENTE') === -1 && motivo.indexOf('PANE') === -1) return;
      var veiculo = veiculos[SGO_UTILS.safe(p.VEICULO_ID)] || {};
      var placa = veiculo.PLACA || 'placa não identificada';
      paradasPorVeiculo[placa] = (paradasPorVeiculo[placa] || 0) + 1;
    });
    var rankingParadasNaoPlanejadas = Object.keys(paradasPorVeiculo).map(function(k) { return { nome: k, qtd: paradasPorVeiculo[k] }; })
      .sort(function(a, b) { return b.qtd - a.qtd; }).slice(0, 5);

    // ---------------- Consumo (km/L) por veículo, relativo à média da frota ----------------
    var abastecimentosPorVeiculo = {};
    Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO).forEach(function(a) {
      if (desde && !depoisDoCorte_(a.DATA || a.DATA_ABASTECIMENTO)) return;
      var vid = SGO_UTILS.safe(a.VEICULO_ID);
      if (!vid) return;
      var km = Number(a.KM);
      if (!isFinite(km)) return;
      (abastecimentosPorVeiculo[vid] = abastecimentosPorVeiculo[vid] || []).push({ km: km, litros: Number(a.LITROS) || 0 });
    });
    var consumoPorVeiculo = {}; // placa -> km/L médio
    Object.keys(abastecimentosPorVeiculo).forEach(function(vid) {
      var lista = abastecimentosPorVeiculo[vid].sort(function(a, b) { return a.km - b.km; });
      var deltas = [];
      for (var i = 1; i < lista.length; i++) {
        var kmRodado = lista[i].km - lista[i - 1].km;
        if (kmRodado > 0 && lista[i].litros > 0) deltas.push(kmRodado / lista[i].litros);
      }
      if (!deltas.length) return;
      var veiculo = veiculos[vid] || {};
      var placa = veiculo.PLACA || 'placa não identificada';
      var media = deltas.reduce(function(a, b) { return a + b; }, 0) / deltas.length;
      consumoPorVeiculo[placa] = Math.round(media * 100) / 100;
    });
    var mediaFrotaConsumo = 0;
    var placasComConsumo = Object.keys(consumoPorVeiculo);
    if (placasComConsumo.length) {
      mediaFrotaConsumo = placasComConsumo.reduce(function(a, k) { return a + consumoPorVeiculo[k]; }, 0) / placasComConsumo.length;
    }
    var consumoAbaixoDaMedia = placasComConsumo
      .filter(function(k) { return mediaFrotaConsumo > 0 && consumoPorVeiculo[k] < mediaFrotaConsumo * QUALIDADE_FROTA_LIMIAR_CONSUMO_BAIXO; })
      .map(function(k) { return { nome: k, kmPorLitro: consumoPorVeiculo[k] }; })
      .sort(function(a, b) { return a.kmPorLitro - b.kmPorLitro; });

    return {
      totalMovimentacoes: movimentacoes.length,
      viagensPenduradas: viagensPenduradas.length,
      amostraPenduradas: viagensPenduradas.slice(0, 5),
      totalIncompletas: totalIncompletas,
      amostraIncompletas: incompletasAmostra,
      rankingVeiculos: rankingVeiculos,
      rankingCondutores: rankingCondutores,
      rankingCondutoresDestaque: rankingCondutoresDestaque,
      multasAbertas: multasAbertas, valorMultasAbertas: Math.round(valorMultasAbertas * 100) / 100, multasSemCondutor: multasSemCondutor,
      rankingMultasCondutor: rankingMultasCondutor,
      documentosVencidos: documentosVencidos, documentosVencendo: documentosVencendo, amostraDocumentos: amostraDocumentos,
      cnhVencidas: cnhVencidas, cnhVencendo: cnhVencendo, amostraCnh: amostraCnh,
      rankingCustoManutencao: rankingCustoManutencao,
      rankingParadasNaoPlanejadas: rankingParadasNaoPlanejadas,
      mediaFrotaConsumo: Math.round(mediaFrotaConsumo * 100) / 100,
      consumoAbaixoDaMedia: consumoAbaixoDaMedia
    };
  } catch (e) {
    return {totalMovimentacoes:0,indisponivel:true,erro:String(e&&e.message||e)};
  }
}
