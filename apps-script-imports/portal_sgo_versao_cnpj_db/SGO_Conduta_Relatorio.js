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
    '<text x="' + cx + '" y="' + (cy + 45) + '" text-anchor="middle" font-size="9.5" fill="#6b7280" font-family="Arial,sans-serif">índice de conduta</text></svg>';
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

function Conduta_montarRelatorioHtml_(ctx, ia) {
  var c = [];
  if (ctx.sombra) c.push('<div class="caixa aviso">Período de teste: o índice é calculado e publicado, mas o bônus ainda não é pago. Os valores abaixo são simulados.</div>');
  c.push(RelA4_secao_('Resultado do mês',
    '<div style="display:grid;grid-template-columns:180px 1fr;gap:14px;align-items:center">' + CondutaRel_montarGaugeSvg_(ctx.ico, ctx.farol) +
    RelA4_kpis_([[CondutaRel_farolTexto_(ctx.farol), 'Farol do mês'], [Conduta_numBr_(ctx.ico), 'Índice de conduta'], [RelA4_num_(ctx.D, 0) + ' de ' + RelA4_num_(ctx.limiteVerdeD, 0), 'Pontos de demérito e limite do verde'],
      [RelA4_num_(ctx.n, 0), 'Pessoas no cálculo'], [ctx.qtdColaboradoresComBonus + ' de ' + ctx.qtdColaboradoresTotal, 'Com bônus coletivo'], [RelA4_moeda_(ctx.valorBonus), 'Valor do bônus por pessoa'],
      [RelA4_num_(ctx.missoes.qtdQualificadas, 0), 'Missões aprovadas com incentivo'], [ctx.icoMesAnterior === null ? '—' : Conduta_numBr_(ctx.icoMesAnterior), 'Índice do mês anterior']]) + '</div>' +
    '<p class="nota">Fechado em ' + RelA4_esc_(RelA4_dataBr_(ctx.fechadoEm)) + (ctx.automatico ? ' (fechamento automático)' : '') + '.' + (ctx.observacao ? ' ' + RelA4_esc_(ctx.observacao) : '') + '</p>'));
  c.push(RelA4_secao_('Interpretação do mês', RelA4_paragrafos_(ia.narrativa)));
  c.push(RelA4_secao_('Pontos de demérito por grupo', ctx.composicaoPorGrupo.length
    ? RelA4_barras_(ctx.composicaoPorGrupo.map(function (g) { return { rotulo: g.grupo, valor: g.somaPeso, rotuloValor: RelA4_plural_(g.somaPeso, 'ponto', 'pontos') }; }), { cor: '#dc2626' }) +
      RelA4_tabela_([{ t: 'Grupo' }, { t: 'Ocorrências', num: true }, { t: 'Pontos', num: true }], ctx.composicaoPorGrupo.map(function (g) { return [g.grupo, RelA4_num_(g.qtdOcorrencias, 0), RelA4_num_(g.somaPeso, 0)]; }))
    : '<div class="caixa ok">Nenhuma ocorrência firme no mês: nenhum ponto de demérito.</div>'));
  c.push(RelA4_secao_('Códigos que mais pesaram', RelA4_tabela_([{ t: 'Código' }, { t: 'Descrição' }, { t: 'Ocorrências', num: true }, { t: 'Pontos', num: true }],
    ctx.top5Codigos.map(function (k) { return [k.codigo, k.descricao, RelA4_num_(k.qtdOcorrencias, 0), RelA4_num_(k.somaPeso, 0)]; }), { vazio: 'Nenhuma ocorrência firme no mês.' })));
  c.push(RelA4_secao_('Evolução nos últimos seis meses', RelA4_colunas_(ctx.comparativo6Meses.map(function (m) {
    return { rotulo: RelA4_competencia_(m.competencia).replace(' de ', '/').slice(0, 3) + '/' + m.competencia.slice(2, 4), valor: m.ico, cor: CondutaRel_corFarol_(m.farol), rotuloValor: m.ico === null ? '' : Conduta_numBr_(m.ico) };
  }), { min: 0, max: 100, linhas: [{ valor: 85, rotulo: 'verde a partir de 85', cor: '#059669' }, { valor: 70, rotulo: 'vermelho abaixo de 70', cor: '#dc2626' }] }) +
    RelA4_tabela_([{ t: 'Competência' }, { t: 'Índice de conduta', num: true }, { t: 'Farol' }], ctx.comparativo6Meses.map(function (m) {
      return [RelA4_competencia_(m.competencia), m.ico === null ? 'sem fechamento' : Conduta_numBr_(m.ico), m.farol ? RelA4_marca_(CondutaRel_farolTexto_(m.farol), m.farol === 'VERDE' ? 'ok' : m.farol === 'AMARELO' ? 'aviso' : 'critico') : '—'];
    }))));
  c.push(RelA4_secao_('Incentivo de missão', '<p>' + RelA4_plural_(ctx.missoes.qtdQualificadas, 'missão aprovada', 'missões aprovadas') + ' com distância mínima no mês, total ' + (ctx.sombra ? 'simulado' : 'devido') + ' de ' + RelA4_esc_(RelA4_moeda_(ctx.missoes.valorTotal)) + '.' +
    (ctx.missoes.qtdRecusadas ? ' ' + RelA4_plural_(ctx.missoes.qtdRecusadas, 'missão foi recusada', 'missões foram recusadas') + ' pela gestão e ' + (ctx.missoes.qtdRecusadas === 1 ? 'não entra' : 'não entram') + ' no valor.' : '') +
    (ctx.missoes.qtdLegadas ? ' ' + RelA4_plural_(ctx.missoes.qtdLegadas, 'missão lançada', 'missões lançadas') + ' antes da regra de aprovação ' + (ctx.missoes.qtdLegadas === 1 ? 'conta' : 'contam') + ' como aprovação legada.' : '') +
    ' O incentivo de missão independe do farol do mês. O detalhamento por executante está no relatório de missões.</p>'));
  c.push(RelA4_secao_('Contestações', '<p>' + RelA4_plural_(ctx.contestacoes.qtdContestadas, 'contestação', 'contestações') + ' no mês: ' + RelA4_plural_(ctx.contestacoes.qtdAnuladas, 'anulada', 'anuladas') + ' e ' + RelA4_plural_(ctx.contestacoes.qtdMantidas, 'mantida', 'mantidas') + '.</p>'));
  c.push(RelA4_secao_('Recomendação', RelA4_paragrafos_(ia.recomendacao)));
  c.push('<p class="nota">Os números deste relatório vêm do fechamento congelado do mês e não são recalculados. O relatório coletivo não identifica pessoas; o resultado individual fica no extrato de cada colaborador.</p>');
  return RelA4_documento_({ titulo: 'Programa de conduta — fechamento mensal', subtitulo: 'Pontuação, farol do mês, missões e contestações', identificacao: RelA4_competencia_(ctx.competencia), corpo: c.join('\n'), cor: '#0b4ea2' });
}

function CondutaRel_pastaRelatorios_(sub) {
  return function () { return RelA4_subpasta_(SGO_DocSalvar_pastaPersistente_('CONDUTA_RELATORIOS_FOLDER_ID', 'Programa de conduta - Relatórios'), sub); };
}

/**
 * Gera (ou regenera) o relatório de uma competência fechada, grava em
 * qual_relatorio (o contexto exato vai junto, para auditoria) e salva
 * HTML + PDF na pasta. Devolve { html (com avisos de tela), aviso, link }.
 */
function Conduta_gerarRelatorioCompleto_(competencia) {
  var ctx = Conduta_montarContextoRelatorio_(competencia);
  var padrao = CondutaRel_textosPadrao_(ctx), ia, analise;
  try { ia = CondutaIA_gerarInterpretacao_(ctx); analise = { origem: 'IA', aviso: '' }; }
  catch (eIa) { ia = padrao; analise = { origem: 'PADRAO', aviso: RelA4_avisoFalhaIa_(eIa) }; }
  ctx.textos = { narrativa: ia.narrativa, recomendacao: ia.recomendacao, origem: analise.origem };
  var html = Conduta_montarRelatorioHtml_(ctx, ia);
  var existente = SGO_DATA.getAll(CONDUTA_SHEETS.RELATORIO).find(function (r) { return Conduta_soComp_(r.COMPETENCIA) === competencia && (!r.TIPO || r.TIPO === 'MENSAL'); });
  var dados = { TIPO: 'MENSAL', VISIBILIDADE: 'EQUIPE', COMPETENCIA: competencia, HTML: html, CONTEXTO_JSON: JSON.stringify(ctx), GERADO_EM: Conduta_hojeISO_() };
  if (existente) SGO_DATA.update(CONDUTA_SHEETS.RELATORIO, existente.ID, dados); else SGO_DATA.insert(CONDUTA_SHEETS.RELATORIO, dados);
  var gravacao = RelA4_salvar_(CondutaRel_pastaRelatorios_('Fechamentos mensais'), 'Programa de conduta - fechamento ' + competencia + ' emitido ' + Utilities.formatDate(new Date(), RELA4_TZ, 'yyyy-MM-dd HHmm'), html);
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
