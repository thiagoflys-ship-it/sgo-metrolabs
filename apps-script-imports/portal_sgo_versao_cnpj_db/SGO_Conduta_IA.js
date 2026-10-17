/****************************************************
 * PROGRAMA DE CONDUTA — TEXTOS DOS RELATÓRIOS PELA IA
 *
 * Números já vêm CALCULADOS — a IA só interpreta. O contexto mandado
 * para ela NUNCA tem nome de colaborador: é estrutural (os objetos de
 * contexto não carregam esse campo), não só uma instrução de prompt.
 *
 * 17/10/2026: a chamada passou para RelA4_gemini_ (SGO_Documentos_
 * RelatorioA4.js), com o raciocínio do modelo ligado, e serve aos três
 * relatórios com texto: fechamento mensal (narrativa + recomendação),
 * relatório semanal (análise + plano + mensagem à equipe) e extrato do
 * colaborador (comentário do mês). Sem chave ou com falha, quem chama
 * usa o texto padrão montado dos mesmos números.
 ****************************************************/
var CONDUTAIA_TOKENS = 2048;

var CONDUTAIA_REGRAS_BASE =
  'Você escreve um trecho de relatório do Programa de Conduta, Pontuação e Bonificação da Metrolab\'s ' +
  '(programa interno com um bônus coletivo mensal, pago só se o farol do mês fechar verde, e um incentivo de missão por deslocamento longo, ' +
  'independente do farol; missão lançada pelo próprio colaborador só conta depois de aprovada pela gestão).\n' +
  'REGRAS ABSOLUTAS:\n' +
  '1. Todos os números do CONTEXTO já vêm calculados e corretos: nunca recalcule, arredonde, estime ou conteste o índice de conduta ou o farol. Cite-os como aparecem.\n' +
  '2. O contexto não traz nome de pessoa: fale em termos agregados ("a equipe", "parte da equipe") ou, no extrato, em segunda pessoa ("você").\n' +
  '3. Nunca infira intenção de ninguém e nunca sugira medida disciplinar (advertência, desconto, demissão): isso não é decisão sua.\n' +
  '4. Nunca invente dado fora do CONTEXTO.\n' +
  '5. Tom construtivo, nunca acusatório; prosa original e direta.\n' +
  '6. Use "índice de conduta" (nunca a sigla ICO) e "pontos de demérito".';

/**
 * Pede à IA um texto com seções marcadas e devolve { MARCADOR: texto }.
 * marcadores: ['NARRATIVA', 'RECOMENDACAO'] etc. Lança erro (inclusive sem chave).
 */
function CondutaIA_secoes_(tarefa, contextoLinhas, marcadores, opts) {
  var formato = 'Responda SOMENTE em texto puro, com cada marcador sozinho na própria linha, nesta ordem:\n' +
    marcadores.map(function (m) { return '###' + m + '###\n(texto desta seção)'; }).join('\n') + '\n###FIM###';
  var prompt = CONDUTAIA_REGRAS_BASE + '\n\nTAREFA: ' + tarefa + '\n\nCONTEXTO (única fonte de fatos, sem nome de pessoa):\n' + contextoLinhas.join('\n') + '\n\n' + formato + '\n\n' + RELA4_REGRAS_REDACAO;
  var bruto = RelA4_limparTextoIa_(RelA4_gemini_(prompt, { tokens: (opts && opts.tokens) || CONDUTAIA_TOKENS }));
  var todos = marcadores.map(function (m) { return '###' + m + '###'; }).concat(['###FIM###']);
  var out = {};
  marcadores.forEach(function (m) {
    var ini = bruto.indexOf('###' + m + '###');
    if (ini < 0) throw new Error('a IA não devolveu a seção ' + m.toLowerCase());
    ini += m.length + 6;
    var fim = bruto.length;
    todos.forEach(function (t) { var i = bruto.indexOf(t, ini); if (i >= 0 && i < fim) fim = i; });
    var texto = bruto.slice(ini, fim).trim();
    if (!texto) throw new Error('a IA devolveu a seção ' + m.toLowerCase() + ' vazia');
    out[m] = texto;
  });
  return out;
}

/** Linhas de contexto do fechamento mensal (Conduta_montarContextoRelatorio_). */
function CondutaIA_contextoMensal_(ctx) {
  var l = [];
  l.push('Competência: ' + RelA4_competencia_(ctx.competencia) + (ctx.sombra ? ' (período de teste: apura, mas não paga)' : ''));
  l.push('Farol do mês: ' + String(ctx.farol || '').toLowerCase() + '; índice de conduta ' + Conduta_numBr_(ctx.ico));
  l.push('Infração gravíssima firme no mês: ' + (ctx.temGG ? 'sim (cancela o bônus coletivo)' : 'não'));
  l.push('Pontos de demérito no mês: ' + ctx.D + '; pessoas no cálculo: ' + ctx.n);
  l.push('Limite de pontos para continuar no verde: ' + ctx.limiteVerdeD + ' (folga ou excesso: ' + (ctx.limiteVerdeD - ctx.D) + ')');
  l.push('Índice do mês anterior: ' + (ctx.icoMesAnterior === null ? 'sem dado' : Conduta_numBr_(ctx.icoMesAnterior)));
  l.push('Colaboradores com bônus coletivo: ' + ctx.qtdColaboradoresComBonus + ' de ' + ctx.qtdColaboradoresTotal);
  l.push('Pontos por grupo: ' + ((ctx.composicaoPorGrupo || []).map(function (g) { return g.grupo + ' ' + g.somaPeso + ' pontos em ' + g.qtdOcorrencias + ' ocorrência(s)'; }).join('; ') || 'nenhum ponto'));
  l.push('Códigos que mais pesaram: ' + ((ctx.top5Codigos || []).map(function (c) { return c.codigo + ' (' + c.descricao + ') ' + c.somaPeso + ' pontos'; }).join('; ') || 'nenhum'));
  l.push('Missões aprovadas com incentivo: ' + ctx.missoes.qtdQualificadas + ', valor ' + (ctx.sombra ? 'simulado' : 'devido') + ' ' + RelA4_moeda_(ctx.missoes.valorTotal) +
    '; missões recusadas pela gestão: ' + (ctx.missoes.qtdRecusadas || 0));
  l.push('Contestações: ' + ctx.contestacoes.qtdContestadas + ' (anuladas ' + ctx.contestacoes.qtdAnuladas + ', mantidas ' + ctx.contestacoes.qtdMantidas + ')');
  return l;
}

/** Fechamento mensal: { narrativa, recomendacao } (lança erro se a IA não estiver disponível). */
function CondutaIA_gerarInterpretacao_(ctx) {
  var r = CondutaIA_secoes_(
    'escreva duas seções do relatório mensal lido pela diretoria e por toda a equipe. NARRATIVA (2 parágrafos): a distância para o verde em pontos de demérito (folga ou excesso), ' +
    'os grupos e códigos que mais pesaram e a comparação com o mês anterior quando houver. RECOMENDACAO (1 parágrafo curto e prático) para a equipe e a gestão no próximo mês.',
    CondutaIA_contextoMensal_(ctx), ['NARRATIVA', 'RECOMENDACAO']);
  return { narrativa: r.NARRATIVA, recomendacao: r.RECOMENDACAO };
}
