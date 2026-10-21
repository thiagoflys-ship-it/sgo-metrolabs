/****************************************************
 * FROTA — ANÁLISE DO RELATÓRIO PELA IA
 *
 * 17/10/2026: a chamada ao Gemini passou para a moldura comum dos
 * relatórios gerenciais (RelA4_gemini_, SGO_Documentos_RelatorioA4.js),
 * com o raciocínio do modelo ligado. Sem chave ou com falha, o relatório
 * sai com o texto padrão montado dos mesmos números (RelA4_analise_).
 *
 * REGRA DE OURO: a IA só interpreta os números JÁ CALCULADOS pelo
 * servidor (FrotaRel_agregarDados_) — nunca inventa veículo, condutor,
 * valor ou fato que não esteja no contexto enviado.
 ****************************************************/
var FrotaIA_TOKENS = 2048;

/** Mantido para compatibilidade: chamada genérica de texto (lança erro). */
function FrotaIA_chamarGemini_(prompt, maxTokens) {
  return RelA4_gemini_(prompt, { tokens: maxTokens || FrotaIA_TOKENS });
}

function FrotaIA_linhaVeiculo_(v) {
  return '- ' + (v.rotulo || v.placa) + ' (' + (v.modelo || 'modelo não informado') + '): ' + RelA4_plural_(v.retiradas, 'retirada', 'retiradas') + ', ' +
    RelA4_num_(v.kmRodado, 0) + ' km rodados, utilização de ' + RelA4_num_(v.taxaUtilizacao, 1) + '% do tempo, consumo ' +
    (v.consumoMedioKmL > 0 ? RelA4_num_(v.consumoMedioKmL, 1) + ' km/L' : 'sem dado suficiente') + ', combustível ' + RelA4_moeda_(v.abastecimentosValor) +
    ', ' + RelA4_plural_(v.manutencoesQtd, 'manutenção', 'manutenções') + ' (' + RelA4_moeda_(v.manutencoesCusto) + '), outras despesas ' + RelA4_moeda_(v.despesasValor) +
    ', custo total ' + RelA4_moeda_(v.custoTotal) + ', custo por km ' + (v.kmRodado > 0 ? RelA4_moeda_(v.custoPorKm) : 'sem quilometragem') + ', ' +
    RelA4_plural_(v.paradasQtd, 'parada', 'paradas') + ' (' + RelA4_num_(v.paradasDias, 1) + ' dias), ' + RelA4_plural_(v.multasQtd, 'multa', 'multas') +
    ' (' + RelA4_moeda_(v.multasValor) + ', ' + RelA4_num_(v.multasIdentificadas, 0) + ' com condutor identificado).';
}

function FrotaIA_linhasAlertas_(alertas) {
  return alertas.length
    ? alertas.map(function(a) { return '- ' + a.veiculoPlaca + ': ' + a.tipoLabel + ' — ' + (a.status === 'VENCIDO' ? 'vencido' : 'vence em breve') + (a.vencimento ? ' (' + a.vencimento + ')' : ''); }).join('\n')
    : 'nenhum aviso ativo na data de emissão';
}

/** Prompt da análise do relatório geral. */
function FrotaIA_promptFrota_(dados) {
  var t = dados.totais;
  return 'Você é o analista de frota da Metrolab\'s e escreve a seção "Análise do período" do relatório gerencial de frota, lido pela diretoria.\n' +
    'Com base SOMENTE nos dados abaixo, escreva de 3 a 5 parágrafos curtos cobrindo: (1) quais veículos foram mais usados e quais ficaram ociosos ou subutilizados; ' +
    '(2) o que chama atenção nos custos (combustível, manutenção, outras despesas, multas), inclusive consumo ou custo por km fora do padrão dos demais veículos; ' +
    '(3) a situação dos avisos de vencimento (manutenção, documentos, CNH) na data de emissão; (4) de 2 a 3 recomendações práticas e objetivas para a gestão da frota, em uma lista com hífen no último parágrafo.\n\n' +
    'PERÍODO: ' + dados.periodo.inicio + ' a ' + dados.periodo.fim + ' (' + RelA4_plural_(dados.periodo.dias, 'dia', 'dias') + ')\n' +
    'TOTAIS: ' + RelA4_plural_(dados.totalVeiculosFrota, 'veículo ativo', 'veículos ativos') + ', ' + RelA4_plural_(t.retiradas, 'retirada', 'retiradas') + ', ' + RelA4_num_(t.km, 0) +
    ' km, custo total ' + RelA4_moeda_(t.custoTotal) + ' (combustível ' + RelA4_moeda_(t.abastecimentosValor) + ', manutenção ' + RelA4_moeda_(t.manutencao) + ', outras ' + RelA4_moeda_(t.despesas) +
    '), custo por km ' + (t.km > 0 ? RelA4_moeda_(t.custoPorKm) : 'sem quilometragem') + ', consumo médio ' + (t.consumoMedioKmL > 0 ? RelA4_num_(t.consumoMedioKmL, 1) + ' km/L' : 'sem dado suficiente') +
    ', ' + RelA4_plural_(t.multasQtd, 'multa', 'multas') + ' (' + RelA4_moeda_(t.multasValor) + '), ' + RelA4_num_(t.paradasDias, 1) + ' dias parados.\n' +
    'POR VEÍCULO:\n' + dados.veiculos.map(FrotaIA_linhaVeiculo_).join('\n') + '\n' +
    'CONDUTOR COM MAIS RETIRADAS: ' + (dados.condutorMaisAtuante ? dados.condutorMaisAtuante.nome + ' (' + RelA4_plural_(dados.condutorMaisAtuante.retiradas, 'retirada', 'retiradas') + ')' : 'sem retiradas no período') + '\n' +
    'AVISOS NA DATA DE EMISSÃO:\n' + FrotaIA_linhasAlertas_(dados.alertasAtuais);
}

/** Prompt da análise do relatório por veículo. */
function FrotaIA_promptVeiculo_(v, periodo, alertasVeiculo) {
  return 'Você é o analista de frota da Metrolab\'s e escreve a seção "Análise do responsável" do relatório de UM veículo.\n' +
    'Com base SOMENTE nos dados abaixo, escreva 2 parágrafos curtos: o primeiro sobre uso, consumo e custos do veículo no período; o segundo sobre documentação, manutenção e pendências, ' +
    'terminando com uma frase direta dizendo se a situação geral está regular ou se há pendências relevantes e o que fazer primeiro.\n\n' +
    'PERÍODO: ' + periodo.inicio + ' a ' + periodo.fim + ' (' + RelA4_plural_(periodo.dias, 'dia', 'dias') + ')\n' +
    'VEÍCULO: ' + FrotaIA_linhaVeiculo_(v).slice(2) + '\n' +
    'CONDUTOR MAIS FREQUENTE: ' + (v.condutorResponsavel || 'nenhuma retirada no período') + '\n' +
    'AVISOS NA DATA DE EMISSÃO (veículo e CNH do condutor mais frequente):\n' + FrotaIA_linhasAlertas_(alertasVeiculo);
}

/** Mantidos para compatibilidade: lançam erro se a IA não estiver disponível. */
function FrotaIA_interpretarFrota_(dados) { return RelA4_limparTextoIa_(RelA4_gemini_(FrotaIA_promptFrota_(dados) + '\n\n' + RELA4_REGRAS_REDACAO)); }
function FrotaIA_interpretarVeiculo_(v, periodo, alertasVeiculo) { return RelA4_limparTextoIa_(RelA4_gemini_(FrotaIA_promptVeiculo_(v, periodo, alertasVeiculo) + '\n\n' + RELA4_REGRAS_REDACAO)); }
