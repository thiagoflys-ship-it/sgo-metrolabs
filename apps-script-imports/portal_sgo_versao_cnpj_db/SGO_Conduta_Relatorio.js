/****************************************************
 * PROGRAMA DE CONDUTA — RELATÓRIO DO FECHAMENTO MENSAL (A4)
 *
 * 17/10/2026: montado na moldura comum (SGO_Documentos_RelatorioA4.js):
 * logo, cabeçalho e rodapé com paginação, texto justificado, gráficos em
 * SVG (antes dependiam de biblioteca externa e sumiam no PDF), HTML + PDF
 * gravados na pasta do programa. A narrativa e a recomendação vêm da IA
 * (raciocínio ligado); sem chave ou com falha, saem com o texto padrão
 * montado dos mesmos números.
 *
 * O CONTEXTO mandado para a IA NUNCA inclui o array porColaborador (que
 * tem nome e ID) — estrutural, não só uma instrução de prompt.
 ****************************************************/

function CondutaRel_escaparHtml_(v) { return RelA4_esc_(v); }

function CondutaRel_competenciaAnterior_(competencia) {
  var partes = competencia.split('-');
  var d = new Date(Number(partes[0]), Number(partes[1]) - 1 - 1, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

/** Contexto agregado (sem nome de pessoa) de um fechamento JÁ congelado. */
function Conduta_montarContextoRelatorio_(competencia) {
  var todosFechamentos = SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO);
  var fechamento = todosFechamentos.find(function (f) { return Conduta_soComp_(f.COMPETENCIA) === competencia; });
  if (!fechamento) throw new Error('O mês de ' + Conduta_nomeCompetencia_(competencia) + ' ainda não foi fechado. Feche a competência em Programa de conduta > Fechamentos e gere o relatório depois.');

  var porColaborador = JSON.parse(fechamento.RESULTADO_JSON || '[]');
  var sombra = SGO_UTILS.safeUpper(fechamento.SOMBRA) === 'TRUE' || fechamento.SOMBRA === true;
  var fechamentoAnterior = todosFechamentos.find(function (f) { return Conduta_soComp_(f.COMPETENCIA) === CondutaRel_competenciaAnterior_(competencia); });

  var ocorrenciasCompetencia = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).filter(function (o) { return Conduta_soComp_(o.COMPETENCIA) === competencia; });
  var ocorrenciasFirmes = ocorrenciasCompetencia.filter(function (o) { return SGO_UTILS.safeUpper(o.STATUS) === 'FIRME'; });
  var catalogo = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA_TIPO);
  function tipoDe_(codigo) { return catalogo.find(function (t) { return SGO_UTILS.safeUpper(t.CODIGO) === SGO_UTILS.safeUpper(codigo); }); }

  var porGrupo = {}, porCodigo = {};
  ocorrenciasFirmes.forEach(function (o) {
    var tipo = tipoDe_(o.TIPO_CODIGO), grupo = tipo ? tipo.GRUPO : 'Outro', peso = Number(o.PESO_APLICADO) || 0;
    porGrupo[grupo] = porGrupo[grupo] || { grupo: grupo, somaPeso: 0, qtdOcorrencias: 0 };
    porGrupo[grupo].somaPeso += peso; porGrupo[grupo].qtdOcorrencias += 1;
    porCodigo[o.TIPO_CODIGO] = porCodigo[o.TIPO_CODIGO] || { codigo: o.TIPO_CODIGO, descricao: tipo ? tipo.DESCRICAO : '', somaPeso: 0, qtdOcorrencias: 0 };
    porCodigo[o.TIPO_CODIGO].somaPeso += peso; porCodigo[o.TIPO_CODIGO].qtdOcorrencias += 1;
  });
  var composicaoPorGrupo = Object.keys(porGrupo).map(function (k) { return porGrupo[k]; }).sort(function (a, b) { return b.somaPeso - a.somaPeso; });
  var top5Codigos = Object.keys(porCodigo).map(function (k) { return porCodigo[k]; }).sort(function (a, b) { return b.somaPeso - a.somaPeso; }).slice(0, 5);

  var partesComp = competencia.split('-');
  var dataRef = new Date(Number(partesComp[0]), Number(partesComp[1]) - 1, 1);
  var comparativo6Meses = [];
  for (var i = 5; i >= 0; i--) {
    var d = new Date(dataRef.getFullYear(), dataRef.getMonth() - i, 1);
    var comp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    var f = todosFechamentos.find(function (x) { return Conduta_soComp_(x.COMPETENCIA) === comp; });
    comparativo6Meses.push({ competencia: comp, ico: f ? Number(f.ICO) : null, farol: f ? f.FAROL : null });
  }

  var missoesMes = Conduta_ativos_(CONDUTA_SHEETS.MISSAO).filter(function (m) { return Conduta_soComp_(m.COMPETENCIA) === competencia && (SGO_UTILS.safeUpper(m.QUALIFICA) === 'TRUE' || m.QUALIFICA === true); });
  var valorTotalMissoes = porColaborador.reduce(function (soma, c) { return soma + (sombra ? (Number(c.valorSimuladoIncentivo) || 0) : (Number(c.valorIncentivo) || 0)); }, 0);

  var parametros = Conduta_obterParametros_();
  var k = Number(parametros.K_SENSIBILIDADE) || 5.0, verde = Number(parametros.ICO_VERDE_MIN) || 85.0;
  var n = Number(fechamento.N) || 1;

  return {
    competencia: competencia, farol: fechamento.FAROL, ico: Number(fechamento.ICO), D: Number(fechamento.D) || 0, n: Number(fechamento.N) || 0,
    temGG: SGO_UTILS.safeUpper(fechamento.TEM_GG) === 'TRUE' || fechamento.TEM_GG === true, sombra: sombra,
    fechadoEm: Conduta_soData_(fechamento.FECHADO_EM), automatico: fechamento.FECHADO_POR === 'SISTEMA', observacao: fechamento.OBSERVACAO || '',
    limiteVerdeD: Math.round(((100 - verde) / k) * n),
    icoMesAnterior: fechamentoAnterior ? Number(fechamentoAnterior.ICO) : null,
    qtdColaboradoresComBonus: porColaborador.filter(function (c) { return c.recebeBonus; }).length,
    qtdColaboradoresTotal: porColaborador.length,
    valorBonus: Number(parametros.VALOR_BONUS_COLETIVO) || 300,
    composicaoPorGrupo: composicaoPorGrupo, top5Codigos: top5Codigos, comparativo6Meses: comparativo6Meses,
    missoes: {
      qtdQualificadas: missoesMes.filter(Conduta_missaoAprovada_).length,
      qtdRecusadas: missoesMes.filter(function (m) { return Conduta_situacaoAprovacao_(m) === 'RECUSADA'; }).length,
      qtdLegadas: missoesMes.filter(function (m) { return Conduta_situacaoAprovacao_(m) === 'LEGADA'; }).length,
      valorTotal: valorTotalMissoes
    },
    contestacoes: {
      qtdContestadas: ocorrenciasCompetencia.filter(function (o) { return !!o.CONTESTADA_EM; }).length,
      qtdAnuladas: ocorrenciasCompetencia.filter(function (o) { return SGO_UTILS.safeUpper(o.STATUS) === 'ANULADA'; }).length,
      qtdMantidas: ocorrenciasCompetencia.filter(function (o) { return !!o.CONTESTADA_EM && SGO_UTILS.safeUpper(o.STATUS) === 'FIRME'; }).length
    }
  };
}

function CondutaRel_corFarol_(farol) {
  if (farol === 'VERDE') return '#059669';
  if (farol === 'AMARELO') return '#b45309';
  if (farol === 'VERMELHO') return '#dc2626';
  return '#9ca3af';
}
function CondutaRel_farolTexto_(farol) { return { VERDE: 'Verde', AMARELO: 'Amarelo', VERMELHO: 'Vermelho' }[farol] || String(farol || '—'); }

// Velocímetro (mesma geometria do painel), em SVG estático para o A4.
var CONDUTAREL_AMARELO_MIN = 70, CONDUTAREL_VERDE_MIN = 85;
function CondutaRel_anguloDoValor_(v) { return 180 - (v / 100) * 180; }
function CondutaRel_pontoGauge_(cx, cy, r, a) { var rad = a * Math.PI / 180; return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }; }
function CondutaRel_arcoGaugePath_(cx, cy, r, a1, a2) {
  var p1 = CondutaRel_pontoGauge_(cx, cy, r, a1), p2 = CondutaRel_pontoGauge_(cx, cy, r, a2);
  return 'M ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + (Math.abs(a1 - a2) > 180 ? 1 : 0) + ' 1 ' + p2.x.toFixed(2) + ' ' + p2.y.toFixed(2);
}
function CondutaRel_montarGaugeSvg_(ico, farol) {
  var cx = 100, cy = 92, r = 76, sw = 14, gap = 2.2;
  function zona(v0, v1, cor) {
    var a0 = CondutaRel_anguloDoValor_(v0) - (v0 === 0 ? 0 : gap / 2), a1 = CondutaRel_anguloDoValor_(v1) + (v1 === 100 ? 0 : gap / 2);
    return '<path d="' + CondutaRel_arcoGaugePath_(cx, cy, r, a0, a1) + '" fill="none" stroke="' + cor + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
  }
  var v = Math.max(0, Math.min(100, Number(ico) || 0)), a = CondutaRel_anguloDoValor_(v);
  var ponta = CondutaRel_pontoGauge_(cx, cy, r - sw / 2 - 10, a), be = CondutaRel_pontoGauge_(cx, cy, 7, a + 90), bd = CondutaRel_pontoGauge_(cx, cy, 7, a - 90);
  return '<svg viewBox="0 0 200 150" width="160" style="display:block;margin:0 auto" role="img">' +
    zona(0, CONDUTAREL_AMARELO_MIN, '#dc2626') + zona(CONDUTAREL_AMARELO_MIN, CONDUTAREL_VERDE_MIN, '#b45309') + zona(CONDUTAREL_VERDE_MIN, 100, '#059669') +
    '<polygon points="' + ponta.x.toFixed(2) + ',' + ponta.y.toFixed(2) + ' ' + be.x.toFixed(2) + ',' + be.y.toFixed(2) + ' ' + bd.x.toFixed(2) + ',' + bd.y.toFixed(2) + '" fill="#1f2937"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="8.5" fill="#1f2937"/><circle cx="' + cx + '" cy="' + cy + '" r="4" fill="' + CondutaRel_corFarol_(farol) + '"/>' +
    '<text x="' + cx + '" y="' + (cy + 30) + '" text-anchor="middle" font-size="24" font-weight="800" fill="#1f2937" font-family="Arial,sans-serif">' + RelA4_esc_(Conduta_numBr_(v)) + '</text>' +
    '<text x="' + cx + '" y="' + (cy + 45) + '" text-anchor="middle" font-size="11" fill="#3e4c59" font-family="Arial,sans-serif">' + RelA4_esc_('farol ' + CondutaRel_farolTexto_(farol).toLowerCase()) + '</text></svg>';
}

/** Texto padrão do fechamento (sem IA), só com os números do contexto. */
function CondutaRel_textosPadrao_(ctx) {
  var folga = ctx.limiteVerdeD - ctx.D;
  var narrativa = 'Em ' + RelA4_competencia_(ctx.competencia) + ' a equipe fechou o mês com índice de conduta ' + Conduta_numBr_(ctx.ico) + ' e farol ' + CondutaRel_farolTexto_(ctx.farol).toLowerCase() +
    ', com ' + RelA4_plural_(ctx.D, 'ponto', 'pontos') + ' de demérito para ' + RelA4_plural_(ctx.n, 'pessoa', 'pessoas') + ' no cálculo. ' +
    (ctx.temGG ? 'Houve infração gravíssima firme, o que cancela o bônus coletivo independentemente do índice. '
      : folga >= 0 ? 'A equipe ficou ' + RelA4_plural_(folga, 'ponto', 'pontos') + ' abaixo do limite do verde (' + ctx.limiteVerdeD + '). '
        : 'A equipe ultrapassou em ' + RelA4_plural_(-folga, 'ponto', 'pontos') + ' o limite do verde (' + ctx.limiteVerdeD + '). ') +
    (ctx.icoMesAnterior !== null ? 'No mês anterior o índice foi ' + Conduta_numBr_(ctx.icoMesAnterior) + '.' : '');
  if (ctx.composicaoPorGrupo.length) {
    narrativa += '\n\nOs pontos se concentraram em ' + ctx.composicaoPorGrupo.slice(0, 3).map(function (g) { return g.grupo + ' (' + RelA4_plural_(g.somaPeso, 'ponto', 'pontos') + ')'; }).join(', ') +
      (ctx.top5Codigos.length ? ', com destaque para o código ' + ctx.top5Codigos[0].codigo + ' (' + ctx.top5Codigos[0].descricao + ')' : '') + '.';
  } else {
    narrativa += '\n\nNão houve ocorrência firme no mês.';
  }
  var recomendacao = ctx.composicaoPorGrupo.length
    ? 'Para o próximo mês, recomenda-se reforçar com a equipe os cuidados ligados a ' + ctx.composicaoPorGrupo[0].grupo.toLowerCase() + ', que mais pesou no índice, e acompanhar semanalmente o farol para agir antes do fechamento.'
    : 'Para o próximo mês, recomenda-se manter as práticas atuais e registrar os reconhecimentos com evidências, acompanhando o farol semanalmente.';
  return { narrativa: narrativa, recomendacao: recomendacao };
}

function CondutaRel_tipoFarol_(farol) { return farol === 'VERDE' ? 'ok' : farol === 'AMARELO' ? 'aviso' : farol === 'VERMELHO' ? 'critico' : ''; }

/** Legenda das cores do farol, usada nos gráficos de índice. */
var CONDUTAREL_LEGENDA_FAROL = [{ cor: '#059669', rotulo: 'Verde (85 ou mais)' }, { cor: '#b45309', rotulo: 'Amarelo (70 a 84,9)' }, { cor: '#dc2626', rotulo: 'Vermelho (abaixo de 70)' }];

function Conduta_montarRelatorioHtml_(ctx, ia) {
  var c = [];
  if (ctx.sombra) c.push(RelA4_caixa_('Período de teste: o índice é calculado e publicado, mas o bônus ainda não é pago. Os valores abaixo são simulados.', 'aviso'));
  var folga = ctx.limiteVerdeD - ctx.D;
  c.push(RelA4_secao_('Resultado do mês',
    '<div class="gauge-kpis">' + RelA4_figura_(CondutaRel_montarGaugeSvg_(ctx.ico, ctx.farol), 'Índice de conduta do mês') +
    RelA4_kpis_([[RelA4_num_(ctx.D, 0) + ' de ' + RelA4_num_(ctx.limiteVerdeD, 0), 'Pontos de demérito e limite do verde', folga >= 0 ? 'ok' : 'critico'],
      [RelA4_num_(ctx.n, 0), 'Pessoas no cálculo'], [ctx.qtdColaboradoresComBonus + ' de ' + ctx.qtdColaboradoresTotal, 'Com bônus coletivo', ctx.qtdColaboradoresComBonus ? 'ok' : 'aviso'],
      [RelA4_moeda_(ctx.valorBonus), 'Bônus coletivo por pessoa'], [RelA4_num_(ctx.missoes.qtdQualificadas, 0), 'Missões aprovadas com incentivo'],
      [ctx.icoMesAnterior === null ? '—' : Conduta_numBr_(ctx.icoMesAnterior), 'Índice do mês anterior']]) + '</div>' +
    (ctx.temGG ? RelA4_caixa_('Houve infração gravíssima firme no mês: o bônus coletivo fica cancelado, qualquer que seja o índice.', 'critico') : '')));
  c.push(RelA4_secao_('Interpretação do mês', RelA4_paragrafos_(ia.narrativa)));
  c.push(RelA4_secao_('Pontos de demérito por grupo', ctx.composicaoPorGrupo.length
    ? RelA4_barras_(ctx.composicaoPorGrupo.map(function (g) { return { rotulo: g.grupo, valor: g.somaPeso, rotuloValor: RelA4_plural_(g.somaPeso, 'ponto', 'pontos') + ' · ' + RelA4_plural_(g.qtdOcorrencias, 'ocorrência', 'ocorrências') }; }),
      { cor: RELA4_CORES.vermelho, titulo: 'Pontos de demérito por grupo de ocorrência (ocorrências firmes do mês)' }) +
      RelA4_tabela_([{ t: 'Código' }, { t: 'Descrição' }, { t: 'Ocorrências', num: true }, { t: 'Pontos', num: true }],
        ctx.top5Codigos.map(function (k) { return [k.codigo, k.descricao, RelA4_num_(k.qtdOcorrencias, 0), RelA4_num_(k.somaPeso, 0)]; }), { legenda: 'Códigos que mais pesaram no mês (até cinco)' })
    : RelA4_caixa_('Nenhuma ocorrência firme no mês: nenhum ponto de demérito.', 'ok')));
  c.push(RelA4_secao_('Evolução nos últimos seis meses', RelA4_colunas_(ctx.comparativo6Meses.map(function (m) {
    return { rotulo: RelA4_competencia_(m.competencia).slice(0, 3) + '/' + m.competencia.slice(2, 4), valor: m.ico, cor: CondutaRel_corFarol_(m.farol), rotuloValor: m.ico === null ? '' : Conduta_numBr_(m.ico) };
  }), { min: 0, max: 100, titulo: 'Índice de conduta por mês fechado, com a cor do farol', legenda: CONDUTAREL_LEGENDA_FAROL,
    linhas: [{ valor: 85, rotulo: 'limite do verde (85)', cor: '#059669' }, { valor: 70, rotulo: 'limite do vermelho (70)', cor: '#dc2626' }] })));
  c.push(RelA4_secao_('Missões e contestações',
    '<p>' + RelA4_plural_(ctx.missoes.qtdQualificadas, 'missão aprovada', 'missões aprovadas') + ' com distância mínima no mês, total ' + (ctx.sombra ? 'simulado' : 'devido') + ' de ' + RelA4_esc_(RelA4_moeda_(ctx.missoes.valorTotal)) + '.' +
    (ctx.missoes.qtdRecusadas ? ' ' + RelA4_plural_(ctx.missoes.qtdRecusadas, 'missão foi recusada', 'missões foram recusadas') + ' pela gestão e ' + (ctx.missoes.qtdRecusadas === 1 ? 'não entra' : 'não entram') + ' no valor.' : '') +
    (ctx.missoes.qtdLegadas ? ' ' + RelA4_plural_(ctx.missoes.qtdLegadas, 'missão lançada', 'missões lançadas') + ' antes da regra de aprovação ' + (ctx.missoes.qtdLegadas === 1 ? 'conta' : 'contam') + ' como aprovação legada.' : '') +
    ' O incentivo de missão independe do farol do mês; o detalhamento por executante está na prestação de contas de missões.</p>' +
    '<p>' + (ctx.contestacoes.qtdContestadas
      ? RelA4_plural_(ctx.contestacoes.qtdContestadas, 'ocorrência foi contestada', 'ocorrências foram contestadas') + ' no mês: ' + RelA4_plural_(ctx.contestacoes.qtdAnuladas, 'anulada', 'anuladas') + ' e ' + RelA4_plural_(ctx.contestacoes.qtdMantidas, 'mantida', 'mantidas') + '.'
      : 'Nenhuma ocorrência foi contestada no mês.') + '</p>'));
  c.push(RelA4_secao_('Recomendação', RelA4_paragrafos_(ia.recomendacao) +
    '<p class="nota">Os números deste relatório vêm do fechamento congelado do mês e não são recalculados. O relatório coletivo não identifica pessoas; o resultado individual fica no extrato de cada colaborador.</p>'));
  return RelA4_documento_({
    titulo: 'Programa de conduta — fechamento mensal', subtitulo: 'Pontuação, farol do mês, missões e contestações', tituloCurto: 'Conduta — fechamento de ' + RelA4_competencia_(ctx.competencia),
    tituloArquivo: 'Programa de conduta - fechamento mensal', sigla: 'CND', rotuloIdentificacao: 'Competência', identificacao: RelA4_competencia_(ctx.competencia),
    ficha: [['Fechado em', RelA4_dataBr_(ctx.fechadoEm) + (ctx.automatico ? ' (fechamento automático)' : '')]].concat(ctx.observacao ? [['Observação do fechamento', ctx.observacao]] : []),
    corpo: c.join('\n')
  });
}

function CondutaRel_pastaRelatorios_(sub) {
  return function () { return RelA4_subpasta_(SGO_DocSalvar_pastaPersistente_('CONDUTA_RELATORIOS_FOLDER_ID', 'Programa de conduta - Relatórios'), sub); };
}

/**
 * Gera (ou regenera) o relatório de uma competência fechada, salva HTML + PDF
 * na pasta e grava em qual_relatorio o documento final (o contexto exato vai
 * junto, para auditoria). Devolve { html (com avisos de tela), aviso, link }.
 */
function Conduta_gerarRelatorioCompleto_(competencia) {
  var ctx = Conduta_montarContextoRelatorio_(competencia);
  var padrao = CondutaRel_textosPadrao_(ctx), ia, analise;
  try { ia = CondutaIA_gerarInterpretacao_(ctx); analise = { origem: 'IA', aviso: '' }; }
  catch (eIa) { ia = padrao; analise = { origem: 'PADRAO', aviso: RelA4_avisoFalhaIa_(eIa) }; }
  ctx.textos = { narrativa: ia.narrativa, recomendacao: ia.recomendacao, origem: analise.origem };
  var gravacao = RelA4_salvar_(CondutaRel_pastaRelatorios_('Fechamentos mensais'), competencia, Conduta_montarRelatorioHtml_(ctx, ia));
  var html = gravacao.html;
  var existente = SGO_DATA.getAll(CONDUTA_SHEETS.RELATORIO).find(function (r) { return Conduta_soComp_(r.COMPETENCIA) === competencia && (!r.TIPO || r.TIPO === 'MENSAL'); });
  var dados = { TIPO: 'MENSAL', VISIBILIDADE: 'EQUIPE', COMPETENCIA: competencia, HTML: html, CONTEXTO_JSON: JSON.stringify(ctx), GERADO_EM: Conduta_hojeISO_() };
  if (existente) SGO_DATA.update(CONDUTA_SHEETS.RELATORIO, existente.ID, dados); else SGO_DATA.insert(CONDUTA_SHEETS.RELATORIO, dados);
  return { html: RelA4_injetarAvisos_(html, RelA4_avisosPadrao_(gravacao, [analise])), aviso: [gravacao.aviso, analise.aviso].filter(Boolean).join(' '), link: gravacao.pdfUrl, pastaUrl: gravacao.pastaUrl };
}

/** Mantido para o fechamento (SGO_Conduta_Fechamento.js): devolve o HTML. */
function Conduta_gerarRelatorio_(competencia) { return Conduta_gerarRelatorioCompleto_(competencia).html; }

function Conduta_apiGerarRelatorio(sessionId, payload) {
  Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var competencia = String(payload.competencia || '').trim();
  if (!/^\d{4}-\d{2}$/.test(competencia)) throw new Error('Competência inválida (use AAAA-MM).');
  var r = Conduta_gerarRelatorioCompleto_(competencia);
  return { ok: true, html: r.html, aviso: r.aviso, link: r.link, pastaUrl: r.pastaUrl };
}

function Conduta_apiObterRelatorio(sessionId, payload) {
  Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var relatorio = SGO_DATA.getAll(CONDUTA_SHEETS.RELATORIO).find(function (r) { return Conduta_soComp_(r.COMPETENCIA) === Conduta_soComp_(payload.competencia) && (!r.TIPO || r.TIPO === 'MENSAL'); });
  if (!relatorio) return null;
  return { competencia: relatorio.COMPETENCIA, html: RelA4_injetarAvisos_(relatorio.HTML, []), geradoEm: relatorio.GERADO_EM };
}

function Conduta_apiListarRelatorios(sessionId) {
  Conduta_exigirEquipe_(sessionId);
  return SGO_DATA.getAll(CONDUTA_SHEETS.RELATORIO).filter(function (r) { return !r.TIPO || r.TIPO === 'MENSAL'; })
    .map(function (r) { return { competencia: r.COMPETENCIA, geradoEm: r.GERADO_EM }; })
    .sort(function (a, b) { return String(b.competencia).localeCompare(String(a.competencia)); });
}

/**
 * Prévia do fechamento em A4 (18/10/2026; antes era uma página simples montada
 * na tela, sem moldura, numeração nem cópia). Conferência restrita à gestão:
 * mesma apuração da tela "Prévia", com os valores por pessoa.
 */
function Conduta_htmlPrevia_(p) {
  var r = p.resultado || {}, c = [];
  c.push(RelA4_caixa_('Prévia provisória, sem congelamento: a apuração foi feita agora com o cadastro atual de colaboradores ativos. Não autoriza pagamento e pode mudar com as decisões pendentes.', 'aviso'));
  if (p.fechamentoCongelado) c.push(RelA4_caixa_('Esta competência já foi congelada em ' + RelA4_dataBr_(p.fechamentoData) + '. Os números abaixo são uma consulta atual e não substituem o resultado do fechamento; consulte o relatório do fechamento mensal.', 'critico'));
  var limite = Math.round(((100 - (Number(Conduta_obterParametros_().ICO_VERDE_MIN) || 85)) / (Number(Conduta_obterParametros_().K_SENSIBILIDADE) || 5)) * (Number(r.n) || 1));
  c.push(RelA4_secao_('Resultado provisório', RelA4_kpis_([
    [Conduta_numBr_(r.ico), 'Índice de conduta', CondutaRel_tipoFarol_(r.farol)], [CondutaRel_farolTexto_(r.farol), 'Farol', CondutaRel_tipoFarol_(r.farol)],
    [RelA4_num_(r.D, 0) + ' de ' + RelA4_num_(limite, 0), 'Pontos de demérito e limite do verde'], [RelA4_num_(r.n, 0), 'Pessoas no cálculo']
  ]) + '<p>' + RelA4_esc_(p.podeFechar ? 'A competência pode ser fechada: não há defesa nem missão pendente.' :
    p.fechamentoCongelado ? 'A competência já está fechada.' : 'O fechamento ainda está bloqueado: ' + [p.pendencias.length ? RelA4_plural_(p.pendencias.length, 'ocorrência com defesa ou decisão pendente', 'ocorrências com defesa ou decisão pendente') : '', (p.missoesPendentes || []).length ? RelA4_plural_(p.missoesPendentes.length, 'missão aguardando aprovação', 'missões aguardando aprovação') : '', p.competencia >= Conduta_competenciaDe_(Conduta_hojeISO_()) ? 'o mês ainda não terminou' : ''].filter(Boolean).join('; ') + '.') + '</p>'));
  c.push(RelA4_secao_('Ocorrências e defesas pendentes', RelA4_tabela_([{ t: 'Ocorrência' }, { t: 'Situação' }, { t: 'Data do fato' }, { t: 'Contestação até' }, { t: 'Recurso até' }, { t: 'Julgamento até' }],
    (p.pendencias || []).map(function (o) { var st = SGO_UTILS.safeUpper(o.status); return [String(o.id), (typeof CONDUTA_EXTRATO_SITUACAO !== 'undefined' && CONDUTA_EXTRATO_SITUACAO[st]) || o.status, RelA4_dataBr_(o.dataFato), RelA4_dataBr_(o.prazoContestacao) || '—', RelA4_dataBr_(o.prazoRecurso) || '—', RelA4_dataBr_(o.prazoJulgamento) || '—']; }),
    { vazio: 'Nenhuma defesa pendente identificada. O fechamento confere de novo antes de congelar.', legenda: 'Ocorrências que ainda impedem o fechamento' })));
  c.push(RelA4_secao_('Missões aguardando aprovação', RelA4_tabela_([{ t: 'Destino' }, { t: 'Data' }], (p.missoesPendentes || []).map(function (m) { return [m.destino, RelA4_dataBr_(m.data)]; }),
    { vazio: 'Nenhuma missão aguardando decisão.', legenda: 'Missões a aprovar ou recusar na aba Missões' })));
  var sombra = !!r.sombra, pessoas = (r.porColaborador || []).slice().sort(function (a, b) { return String(a.nome || '').localeCompare(String(b.nome || '')); });
  function v(c, campo) { return Number(c[sombra ? campo.replace('valor', 'valorSimulado') : campo]) || 0; }
  c.push(RelA4_secao_('Valores ' + (sombra ? 'simulados' : 'provisórios') + ' por colaborador', RelA4_tabela_([{ t: 'Colaborador' }, { t: 'Bônus coletivo', num: true }, { t: 'Incentivo de missão', num: true }, { t: 'Total', num: true }],
    pessoas.map(function (x) { return [x.nome || String(x.colaboradorId), RelA4_moeda_(v(x, 'valorBonus')), RelA4_moeda_(v(x, 'valorIncentivo')), RelA4_moeda_(v(x, 'valorBonus') + v(x, 'valorIncentivo'))]; }),
    { vazio: 'Nenhum colaborador no cálculo.', legenda: 'Valores ' + (sombra ? 'simulados (período de teste)' : 'provisórios') + ' por pessoa',
      total: pessoas.length ? ['Total', RelA4_moeda_(pessoas.reduce(function (s, x) { return s + v(x, 'valorBonus'); }, 0)), RelA4_moeda_(pessoas.reduce(function (s, x) { return s + v(x, 'valorIncentivo'); }, 0)), RelA4_moeda_(pessoas.reduce(function (s, x) { return s + v(x, 'valorBonus') + v(x, 'valorIncentivo'); }, 0))] : null }) +
    '<p class="nota">Documento de conferência restrito à gestão. Os valores só valem depois do fechamento da competência.</p>'));
  return RelA4_documento_({ titulo: 'Programa de conduta — prévia do fechamento', subtitulo: 'Conferência da gestão antes de congelar a competência', tituloCurto: 'Conduta — prévia de ' + RelA4_competencia_(p.competencia),
    tituloArquivo: 'Programa de conduta - prévia do fechamento', sigla: 'CNP', rotuloIdentificacao: 'Competência', identificacao: RelA4_competencia_(p.competencia), corpo: c.join('\n') });
}

function Conduta_apiDocumentoPrevia(sessionId, payload) {
  var p = Conduta_apiPreviaFechamento(sessionId, payload);
  var g = RelA4_salvar_(CondutaRel_pastaRelatorios_('Prévias'), p.competencia, Conduta_htmlPrevia_(p), { compartilhar: false });
  return { ok: true, html: RelA4_injetarAvisos_(g.html, RelA4_avisosPadrao_(g, [])), link: g.pdfUrl, aviso: g.aviso };
}
