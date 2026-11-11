/****************************************************
 * PROGRAMA DE CONDUTA — RELATÓRIO DO FECHAMENTO MENSAL (A4)
 *
 * 20/10/2026 (refeito a pedido do dono): relatório executivo de RH em A4
 * retrato, no padrão de 18/10 (docs/DOCUMENTOS_PADRAO_A4_20261018.md):
 *  - número fixo por competência (CND-aaaamm) e revisão que sobe a cada
 *    geração; cabeçalho e rodapé corridos com "Página X de Y";
 *  - resumo no topo com o mesmo velocímetro do farol da tela (desenho e
 *    cores de JS_Core.html, em SVG estático), situação do bônus, pontos de
 *    demérito com a margem e os indicadores do mês, cada um uma vez só;
 *  - interpretação curta que não repete os números do resumo;
 *  - composição do demérito: de 1 a 3 grupos, só a tabela; 4 ou mais, barras
 *    finas proporcionais (e a tabela de códigos só quando ela acrescenta);
 *  - evolução só com 3 ou mais meses fechados; reconhecimentos e missões
 *    agregados (sem nome); responsabilidade e assinaturas.
 *
 * Cópias antigas: a gravada no fechamento fica guardada (TIPO
 * MENSAL_ORIGINAL). "Ver relatório" de uma cópia em modelo anterior gera a
 * revisão atual a partir do fechamento congelado, sem recalcular número
 * nenhum, e avisa na tela com o caminho para a cópia original.
 *
 * O CONTEXTO mandado para a IA NUNCA inclui o array porColaborador (que
 * tem nome e ID) — estrutural, não só uma instrução de prompt.
 ****************************************************/

/** Versão do modelo do documento mensal; cópia gravada com outra versão é atualizada ao abrir. */
var CONDUTAREL_MODELO = 4;

function CondutaRel_escaparHtml_(v) { return RelA4_esc_(v); }

function CondutaRel_competenciaAnterior_(competencia) {
  var partes = competencia.split('-');
  var d = new Date(Number(partes[0]), Number(partes[1]) - 1 - 1, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

/** Limites do programa e os limites em pontos para n pessoas (só leitura, mesma conta do farol da tela). */
function CondutaRel_limitesD_(n) {
  var p = Conduta_obterParametros_();
  var k = Number(p.K_SENSIBILIDADE) || 5.0, verde = Number(p.ICO_VERDE_MIN) || 85.0, amarelo = Number(p.ICO_AMARELO_MIN) || 70.0;
  var nn = Number(n) || 1;
  return { verde: verde, amarelo: amarelo, verdeD: Math.round(((100 - verde) / k) * nn), amareloD: Math.round(((100 - amarelo) / k) * nn) };
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
    porCodigo[o.TIPO_CODIGO] = porCodigo[o.TIPO_CODIGO] || { codigo: o.TIPO_CODIGO, descricao: tipo ? tipo.DESCRICAO : '', grupo: grupo, somaPeso: 0, qtdOcorrencias: 0 };
    porCodigo[o.TIPO_CODIGO].somaPeso += peso; porCodigo[o.TIPO_CODIGO].qtdOcorrencias += 1;
  });
  function ordem(a, b) { return b.somaPeso - a.somaPeso || b.qtdOcorrencias - a.qtdOcorrencias || String(a.codigo || a.grupo).localeCompare(String(b.codigo || b.grupo)); }
  var codigos = Object.keys(porCodigo).map(function (k) { return porCodigo[k]; }).sort(ordem);
  var composicaoPorGrupo = Object.keys(porGrupo).map(function (k) { return porGrupo[k]; }).sort(ordem);
  composicaoPorGrupo.forEach(function (g) { g.codigos = codigos.filter(function (c) { return c.grupo === g.grupo; }); });

  // meses fechados até esta competência (valores congelados), para a evolução
  var mesesFechados = todosFechamentos
    .filter(function (f) { return Conduta_soComp_(f.COMPETENCIA) <= competencia && String(f.ICO) !== '' && isFinite(Number(f.ICO)); })
    .map(function (f) { return { competencia: Conduta_soComp_(f.COMPETENCIA), ico: Number(f.ICO), farol: f.FAROL }; })
    .sort(function (a, b) { return a.competencia.localeCompare(b.competencia); }).slice(-6);

  // reconhecimentos do mês agregados por motivo (sem nome)
  var tiposPos = {};
  SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO_TIPO).forEach(function (t) { tiposPos[SGO_UTILS.safeUpper(t.CODIGO)] = t; });
  var porMotivo = {};
  SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO).forEach(function (e) {
    if (Conduta_soComp_(e.COMPETENCIA || e.DATA_FATO) !== competencia) return;
    var t = tiposPos[SGO_UTILS.safeUpper(e.TIPO_CODIGO)] || {}, k = t.DESCRICAO || e.TIPO_CODIGO || 'Reconhecimento';
    porMotivo[k] = porMotivo[k] || { descricao: k, area: t.AREA || '', quantidade: 0 };
    porMotivo[k].quantidade++;
  });

  var missoesMes = Conduta_ativos_(CONDUTA_SHEETS.MISSAO).filter(function (m) { return Conduta_soComp_(m.COMPETENCIA) === competencia && (SGO_UTILS.safeUpper(m.QUALIFICA) === 'TRUE' || m.QUALIFICA === true); });
  var valorTotalMissoes = porColaborador.reduce(function (soma, c) { return soma + (sombra ? (Number(c.valorSimuladoIncentivo) || 0) : (Number(c.valorIncentivo) || 0)); }, 0);

  var parametros = Conduta_obterParametros_();
  var lim = CondutaRel_limitesD_(Number(fechamento.N) || 1);

  return {
    competencia: competencia, farol: fechamento.FAROL, ico: Number(fechamento.ICO), D: Number(fechamento.D) || 0, n: Number(fechamento.N) || 0,
    temGG: SGO_UTILS.safeUpper(fechamento.TEM_GG) === 'TRUE' || fechamento.TEM_GG === true, sombra: sombra,
    fechadoEm: Conduta_soData_(fechamento.FECHADO_EM), automatico: fechamento.FECHADO_POR === 'SISTEMA', observacao: fechamento.OBSERVACAO || '',
    limites: { verde: lim.verde, amarelo: lim.amarelo }, limiteVerdeD: lim.verdeD, limiteAmareloD: lim.amareloD,
    icoMesAnterior: fechamentoAnterior ? Number(fechamentoAnterior.ICO) : null,
    competenciaAnterior: CondutaRel_competenciaAnterior_(competencia),
    qtdColaboradoresComBonus: porColaborador.filter(function (c) { return c.recebeBonus; }).length,
    qtdColaboradoresTotal: porColaborador.length,
    valorBonus: Number(parametros.VALOR_BONUS_COLETIVO) || 300,
    composicaoPorGrupo: composicaoPorGrupo, codigos: codigos, top5Codigos: codigos.slice(0, 5),
    somaComposicao: codigos.reduce(function (s, c) { return s + c.somaPeso; }, 0),
    mesesFechados: mesesFechados,
    reconhecimentos: Object.keys(porMotivo).map(function (k) { return porMotivo[k]; }).sort(function (a, b) { return b.quantidade - a.quantidade || a.descricao.localeCompare(b.descricao); }),
    missoes: {
      qtdQualificadas: missoesMes.filter(Conduta_missaoAprovada_).length,
      qtdRecusadas: missoesMes.filter(function (m) { return Conduta_situacaoAprovacao_(m) === 'RECUSADA'; }).length,
      qtdLegadas: missoesMes.filter(function (m) { return Conduta_situacaoAprovacao_(m) === 'LEGADA'; }).length,
      valorTotal: valorTotalMissoes
    },
    contestacoes: {
      qtdContestadas: ocorrenciasCompetencia.filter(function (o) { return !!o.CONTESTADA_EM; }).length,
      qtdAnuladas: ocorrenciasCompetencia.filter(function (o) { return SGO_UTILS.safeUpper(o.STATUS) === 'ANULADA'; }).length,
      qtdMantidas: ocorrenciasCompetencia.filter(function (o) { return !!o.CONTESTADA_EM && SGO_UTILS.safeUpper(o.STATUS) === 'FIRME'; }).length,
      // 19/10/2026: decisões da Diretoria sobre ocorrência em que é envolvida (sem nome: relatório coletivo)
      qtdDecisoesDiretoria: ocorrenciasCompetencia.filter(function (o) { return !!SGO_UTILS.safe(o.DECISAO_DIRETORIA); }).length
    }
  };
}

// ------------------------------------------------------------
// FAROL: cores, textos e o velocímetro (o mesmo da tela)
// ------------------------------------------------------------
/** Cores do farol da tela (UI_Estilos.html: --fg-*), usadas no velocímetro e nos gráficos de índice. */
var CONDUTAREL_COR = { VERDE: '#2E8B3E', AMARELO: '#E3A21A', VERMELHO: '#C8402F' };
/** Cor do número (texto) por faixa, igual à tela (--bc-action, --bc-warn, --bc-danger). */
var CONDUTAREL_COR_TEXTO = { VERDE: '#1F6B2A', AMARELO: '#7A5200', VERMELHO: '#A3261B' };

function CondutaRel_corFarol_(farol) { return CONDUTAREL_COR[farol] || '#9aa5b1'; }
function CondutaRel_farolTexto_(farol) { return { VERDE: 'Verde', AMARELO: 'Amarelo', VERMELHO: 'Vermelho' }[farol] || String(farol || '—'); }
function CondutaRel_tipoFarol_(farol) { return farol === 'VERDE' ? 'ok' : farol === 'AMARELO' ? 'aviso' : farol === 'VERMELHO' ? 'critico' : ''; }
function CondutaRel_classeFarol_(farol) { return farol === 'VERDE' ? 'verde' : farol === 'AMARELO' ? 'amarelo' : 'vermelho'; }

/** Índice com uma casa em pt-BR ("98,9"). */
function CondutaRel_indice_(v) { return RelA4_num_(Number(v), 1); }
function CondutaRel_rotuloLimite_(n) { return RelA4_num_(n, n % 1 ? 1 : 0); }

function CondutaRel_anguloDoValor_(v) { return 180 - (v / 100) * 180; }
function CondutaRel_pontoGauge_(cx, cy, r, a) { var rad = a * Math.PI / 180; return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }; }
function CondutaRel_arcoGaugePath_(cx, cy, r, a1, a2) {
  var p1 = CondutaRel_pontoGauge_(cx, cy, r, a1), p2 = CondutaRel_pontoGauge_(cx, cy, r, a2);
  return 'M ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + (Math.abs(a1 - a2) > 180 ? 1 : 0) + ' 1 ' + p2.x.toFixed(2) + ' ' + p2.y.toFixed(2);
}

/**
 * Velocímetro do farol, com a geometria e as cores do farol da tela
 * (Conduta_montarGaugeSvg_ em JS_Core.html): faixas proporcionais aos
 * limites do programa, a faixa do mês acesa e as outras esmaecidas,
 * marcações a cada 5, limites do lado de fora do arco, 0 e 100 sob as
 * pontas, ponteiro do pivô até a faixa, número com uma casa e "Índice de
 * conduta". Estático (o PDF não roda script e não anima).
 */
function CondutaRel_montarGaugeSvg_(ico, farol, limites) {
  var cx = 120, cy = 110, r = 86, sw = 14, gap = 1.2;
  var lim = limites || {}, am = Number(lim.amarelo), ve = Number(lim.verde);
  if (!(am > 0 && am < 100)) am = 70;
  if (!(ve > am && ve <= 100)) ve = 85;
  var v = Math.max(0, Math.min(100, Number(ico) || 0));
  var atual = farol === 'VERDE' || farol === 'AMARELO' || farol === 'VERMELHO' ? farol : (v < am ? 'VERMELHO' : v < ve ? 'AMARELO' : 'VERDE');
  function zona(v0, v1, faixa) {
    var a0 = CondutaRel_anguloDoValor_(v0) - (v0 === 0 ? 0 : gap / 2), a1 = CondutaRel_anguloDoValor_(v1) + (v1 === 100 ? 0 : gap / 2);
    return '<path d="' + CondutaRel_arcoGaugePath_(cx, cy, r, a0, a1) + '" fill="none" stroke="' + CONDUTAREL_COR[faixa] + '" stroke-width="' + sw + '"' + (faixa === atual ? '' : ' stroke-opacity="0.3"') + '/>';
  }
  var marcas = '';
  for (var m = 0; m <= 100; m += 5) {
    var maior = m % 10 === 0, a = CondutaRel_anguloDoValor_(m);
    var p1 = CondutaRel_pontoGauge_(cx, cy, r - sw / 2 - 3, a), p2 = CondutaRel_pontoGauge_(cx, cy, r - sw / 2 - (maior ? 10 : 6), a);
    marcas += '<line x1="' + p1.x.toFixed(2) + '" y1="' + p1.y.toFixed(2) + '" x2="' + p2.x.toFixed(2) + '" y2="' + p2.y.toFixed(2) + '" stroke="' + (maior ? '#7C796F' : '#B8B5AC') + '" stroke-width="' + (maior ? 1.3 : 1) + '"/>';
  }
  var fonte = ' font-family="Arial,Helvetica,sans-serif"';
  var limitesSvg = [am, ve].map(function (n) {
    var ang = CondutaRel_anguloDoValor_(n);
    var q1 = CondutaRel_pontoGauge_(cx, cy, r + sw / 2 + 1, ang), q2 = CondutaRel_pontoGauge_(cx, cy, r + sw / 2 + 5, ang), t = CondutaRel_pontoGauge_(cx, cy, r + sw / 2 + 13, ang);
    return '<line x1="' + q1.x.toFixed(2) + '" y1="' + q1.y.toFixed(2) + '" x2="' + q2.x.toFixed(2) + '" y2="' + q2.y.toFixed(2) + '" stroke="#7C796F" stroke-width="1.3"/>' +
      '<text x="' + t.x.toFixed(1) + '" y="' + (t.y + 3.5).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#5F645F"' + fonte + '>' + CondutaRel_rotuloLimite_(n) + '</text>';
  }).join('');
  var pontas = '<text x="' + (cx - r) + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#5F645F"' + fonte + '>0</text>' +
    '<text x="' + (cx + r) + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#5F645F"' + fonte + '>100</text>';
  var ponta = r - sw / 2 - 3, cauda = 12, meia = 3.6;
  var agulha = (cx - ponta) + ',' + cy + ' ' + cx + ',' + (cy - meia) + ' ' + (cx + cauda) + ',' + (cy - 1.6) + ' ' + (cx + cauda) + ',' + (cy + 1.6) + ' ' + cx + ',' + (cy + meia);
  return '<svg viewBox="0 0 240 176" xmlns="http://www.w3.org/2000/svg" width="240" height="176" role="img" aria-label="' +
    RelA4_esc_('Índice de conduta ' + CondutaRel_indice_(v) + ', farol ' + CondutaRel_farolTexto_(atual).toLowerCase()) + '">' +
    '<path d="' + CondutaRel_arcoGaugePath_(cx, cy, r, 180, 0) + '" fill="none" stroke="#EEEEEA" stroke-width="' + (sw + 2) + '"/>' +
    zona(0, am, 'VERMELHO') + zona(am, ve, 'AMARELO') + zona(ve, 100, 'VERDE') + marcas + limitesSvg + pontas +
    '<g transform="rotate(' + (v * 1.8).toFixed(2) + ' ' + cx + ' ' + cy + ')"><polygon points="' + agulha + '" fill="#1C1F1D"/></g>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="6.5" fill="#1C1F1D"/><circle cx="' + cx + '" cy="' + cy + '" r="2.4" fill="#FFFFFF"/>' +
    '<text x="' + cx + '" y="' + (cy + 44) + '" text-anchor="middle" font-size="32" font-weight="800" fill="' + CONDUTAREL_COR_TEXTO[atual] + '"' + fonte + '>' + CondutaRel_indice_(v) + '</text>' +
    '<text x="' + cx + '" y="' + (cy + 62) + '" text-anchor="middle" font-size="11.5" font-weight="600" fill="#5F645F"' + fonte + '>Índice de conduta</text></svg>';
}

/**
 * Margem em pontos de demérito, como no farol da tela: no verde, até o
 * amarelo; no amarelo, até o vermelho (com a distância do verde); no
 * vermelho, a distância passada. A barra mostra os pontos do mês sobre o limite.
 */
function CondutaRel_margemHtml_(r) {
  var D = Number(r.D) || 0, verdeD = Number(r.limiteVerdeD), amareloD = Number(r.limiteAmareloD), cor = CondutaRel_corFarol_(r.farol);
  var pts = function (n) { return RelA4_plural_(n, 'ponto', 'pontos'); };
  var esq = pts(D) + ' de demérito', dir, limite, escala;
  if (r.farol === 'VERDE' && verdeD > 0) { limite = verdeD; dir = 'Margem até o amarelo: ' + pts(Math.max(0, verdeD - D)); escala = 'limite do verde: ' + pts(verdeD); }
  else if (r.farol === 'AMARELO' && amareloD > 0) { limite = amareloD; dir = 'Margem até o vermelho: ' + pts(Math.max(0, amareloD - D)); escala = 'limite do amarelo: ' + pts(amareloD); esq += ', ' + pts(Math.max(0, D - verdeD)) + ' além do limite do verde'; }
  else if (amareloD > 0) { limite = D; dir = pts(Math.max(0, D - amareloD)) + ' além do limite do amarelo (' + pts(amareloD) + ')'; escala = ''; }
  else return '';
  var pct = limite > 0 ? Math.max(0, Math.min(100, D / limite * 100)) : 100;
  return '<div class="margem"><div class="rot"><span>' + RelA4_esc_(esq) + '</span><b>' + RelA4_esc_(dir) + '</b></div>' +
    '<div class="barra"><i style="width:' + pct.toFixed(1) + '%;background:' + cor + '"></i></div>' +
    (escala ? '<div class="escala"><span>0</span><span>' + RelA4_esc_(escala) + '</span></div>' : '') + '</div>';
}

/**
 * Bloco de resumo com o velocímetro (fechamento, semanal e prévia).
 * r: { ico, farol, D, limites, limiteVerdeD, limiteAmareloD, situacao, sub, kpis: [[valor, rótulo, tipo]] }
 */
function CondutaRel_resumoFarolHtml_(r) {
  return '<div class="resumo-farol"><div class="gauge">' + CondutaRel_montarGaugeSvg_(r.ico, r.farol, r.limites) + '</div><div>' +
    '<p class="situacao ' + (r.classe || CondutaRel_classeFarol_(r.farol)) + '">' + RelA4_esc_(r.situacao) + '</p>' +
    (r.sub ? '<p class="sub">' + RelA4_esc_(r.sub) + '</p>' : '') + CondutaRel_margemHtml_(r) +
    (r.kpis && r.kpis.length ? RelA4_kpis_(r.kpis) : '') + '</div></div>';
}

/** Situação do bônus de um mês FECHADO, em uma linha. */
function CondutaRel_situacaoFechado_(ctx) {
  var farol = 'Farol ' + CondutaRel_farolTexto_(ctx.farol).toLowerCase();
  if (ctx.temGG) return { texto: farol + ' · bônus coletivo cancelado por infração gravíssima', classe: 'vermelho' };
  if (ctx.farol === 'VERDE') return { texto: farol + ' · bônus coletivo ' + (ctx.sombra ? 'preservado (período de teste)' : 'preservado'), classe: 'verde' };
  return { texto: farol + ' · bônus coletivo não pago neste mês', classe: CondutaRel_classeFarol_(ctx.farol) };
}

// ------------------------------------------------------------
// TEXTOS
// ------------------------------------------------------------
/** Referência ao quadro da composição, para o texto citar pelo número ("ver Tabela 1"). */
function CondutaRel_refComposicao_(ctx) {
  var g = ctx.composicaoPorGrupo.length;
  return !g ? '' : g <= 3 ? 'Tabela 1' : 'Figura 1';
}

/**
 * Texto padrão do fechamento (sem IA): curto e sem repetir os números do
 * resumo (índice, farol, pontos, margem, bônus, missões) — só o que eles
 * não dizem: onde o demérito se concentrou e a comparação com o mês anterior.
 */
function CondutaRel_textosPadrao_(ctx) {
  var p = [], grupos = ctx.composicaoPorGrupo, ref = CondutaRel_refComposicao_(ctx);
  if (!grupos.length) p.push('Não houve ocorrência firme no mês, de modo que nenhum grupo pesou no índice.');
  else if (grupos.length === 1) p.push('Todo o demérito do mês veio do grupo ' + grupos[0].grupo + ' (ver ' + ref + ').');
  else {
    var topo = grupos.slice(0, 2).map(function (g) { return g.grupo; }), parte = grupos.slice(0, 2).reduce(function (s, g) { return s + g.somaPeso; }, 0);
    var pct = ctx.D > 0 ? Math.round(parte / ctx.D * 100) : 0;
    p.push('O demérito se distribuiu por ' + RelA4_plural_(grupos.length, 'grupo', 'grupos') + ', com maior peso em ' + topo.join(' e ') + (pct ? ', que somam ' + pct + '% dos pontos' : '') + ' (ver ' + ref + ').');
  }
  if (ctx.icoMesAnterior !== null && isFinite(ctx.icoMesAnterior)) {
    var dif = Math.round((ctx.ico - ctx.icoMesAnterior) * 10) / 10, mesAnt = RelA4_competencia_(ctx.competenciaAnterior || CondutaRel_competenciaAnterior_(ctx.competencia));
    p.push(dif === 0 ? 'O índice repetiu o de ' + mesAnt + '.' : 'Em relação a ' + mesAnt + ', o índice ' + (dif > 0 ? 'subiu ' : 'caiu ') + RelA4_num_(Math.abs(dif), 1) + (Math.abs(dif) === 1 ? ' ponto' : ' pontos') + '.');
  }
  var recomendacao = grupos.length
    ? 'Para o próximo mês, recomenda-se reforçar com a equipe os cuidados ligados a ' + grupos[0].grupo.toLowerCase() + ' e acompanhar o farol semanalmente, para agir antes do fechamento.'
    : 'Para o próximo mês, recomenda-se manter as práticas atuais, registrar os reconhecimentos com evidências e acompanhar o farol semanalmente.';
  return { narrativa: p.join(' '), recomendacao: recomendacao };
}

/** Legenda das cores do farol, para os gráficos de índice. */
function CondutaRel_legendaFarol_(lim) {
  var v = CondutaRel_rotuloLimite_(lim.verde), a = CondutaRel_rotuloLimite_(lim.amarelo);
  return [{ cor: CONDUTAREL_COR.VERDE, rotulo: 'Verde (' + v + ' ou mais)' }, { cor: CONDUTAREL_COR.AMARELO, rotulo: 'Amarelo (' + a + ' a menos de ' + v + ')' }, { cor: CONDUTAREL_COR.VERMELHO, rotulo: 'Vermelho (abaixo de ' + a + ')' }];
}

// ------------------------------------------------------------
// BLOCOS DO DOCUMENTO MENSAL
// ------------------------------------------------------------
/** Composição do demérito: 0 grupos, caixa; 1 a 3, tabela por grupo e código; 4 ou mais, barras finas. */
function CondutaRel_composicaoHtml_(ctx) {
  var grupos = ctx.composicaoPorGrupo, h = '';
  if (!grupos.length) return RelA4_caixa_('Nenhuma ocorrência firme no mês: nenhum ponto de demérito.', 'ok');
  var pts = function (n) { return RelA4_plural_(n, 'ponto', 'pontos'); }, oc = function (n) { return RelA4_plural_(n, 'ocorrência', 'ocorrências'); };
  var total = ctx.somaComposicao || 0;
  if (grupos.length <= 3) {
    var comPct = ctx.codigos.length > 1 && total > 0;
    var linhas = [];
    grupos.forEach(function (g) {
      g.codigos.forEach(function (c, i) {
        linhas.push('<tr>' + (i === 0 ? '<td' + (g.codigos.length > 1 ? ' rowspan="' + g.codigos.length + '"' : '') + '><b>' + RelA4_esc_(g.grupo) + '</b>' +
          (g.codigos.length > 1 ? '<span class="sub">' + RelA4_esc_(pts(g.somaPeso) + ' · ' + oc(g.qtdOcorrencias)) + '</span>' : '') + '</td>' : '') +
          '<td class="nw">' + RelA4_esc_(c.codigo) + '</td><td>' + RelA4_esc_(c.descricao || '—') + '</td>' +
          '<td class="num">' + RelA4_num_(c.qtdOcorrencias, 0) + '</td><td class="num">' + RelA4_num_(c.somaPeso, 0) + '</td>' +
          (comPct ? '<td class="num">' + RelA4_num_(c.somaPeso / total * 100, 1) + '%</td>' : '') + '</tr>');
      });
    });
    h = '<div class="manter"><p class="leg-tabela"><b data-rela4-tab>Tabela</b> — Pontos de demérito por grupo e código (ocorrências firmes do mês)</p>' +
      '<table class="t"><thead><tr><th style="width:24%">Grupo</th><th class="nw">Código</th><th>Descrição</th><th class="num">Ocorrências</th><th class="num">Pontos</th>' + (comPct ? '<th class="num">Parte</th>' : '') + '</tr></thead><tbody>' +
      linhas.join('') + '</tbody></table></div>';
  } else {
    h = RelA4_barras_(grupos.map(function (g) {
      return { rotulo: g.grupo + (g.codigos.length === 1 ? ' · ' + g.codigos[0].codigo : ''), valor: g.somaPeso, rotuloValor: pts(g.somaPeso) + ' · ' + oc(g.qtdOcorrencias), cor: CONDUTAREL_COR.VERMELHO };
    }), { titulo: 'Pontos de demérito por grupo (ocorrências firmes do mês)', altura: 9, espaco: 7 });
    // a tabela só traz o que a figura não mostra: os códigos dos grupos com mais de um código
    // (o grupo de código único já tem o código no rótulo da barra)
    var multi = grupos.filter(function (g) { return g.codigos.length > 1; });
    if (multi.length) {
      var lin = [];
      multi.forEach(function (g) { g.codigos.forEach(function (c) { lin.push([g.grupo, c.codigo, c.descricao || '—', RelA4_num_(c.qtdOcorrencias, 0), RelA4_num_(c.somaPeso, 0)]); }); });
      h += RelA4_tabela_([{ t: 'Grupo' }, { t: 'Código', nw: true }, { t: 'Descrição' }, { t: 'Ocorrências', num: true }, { t: 'Pontos', num: true }], lin,
        { legenda: 'Códigos dos grupos com mais de um código', compacta: true });
    }
  }
  if (total !== ctx.D) h += '<p class="nota">A composição soma ' + RelA4_esc_(pts(total)) + ', diferente dos ' + RelA4_esc_(pts(ctx.D)) + ' congelados no fechamento: houve mudança em ocorrência do mês depois do fechamento. O resultado do mês continua sendo o congelado.</p>';
  return h;
}

/** Evolução dos meses fechados (3 ou mais), em colunas com a cor do farol. */
function CondutaRel_evolucaoHtml_(ctx) {
  var meses = ctx.mesesFechados || [];
  if (meses.length < 3) return '';
  var lim = ctx.limites || { verde: 85, amarelo: 70 };
  var menor = Math.min.apply(null, meses.map(function (m) { return m.ico; }).concat([lim.amarelo]));
  var min = Math.max(0, Math.min(60, Math.floor((menor - 5) / 10) * 10));
  var abrev = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return RelA4_secao_('Evolução nos meses fechados', RelA4_colunas_(meses.map(function (m) {
    return { rotulo: abrev[Number(m.competencia.slice(5, 7)) - 1] + '/' + m.competencia.slice(2, 4), valor: m.ico, cor: CondutaRel_corFarol_(m.farol), rotuloValor: CondutaRel_indice_(m.ico) };
  }), { min: min, max: 100, altura: 160, titulo: 'Índice de conduta de ' + RelA4_competencia_(meses[0].competencia) + ' a ' + RelA4_competencia_(meses[meses.length - 1].competencia) + ', com a cor do farol de cada mês',
    legenda: CondutaRel_legendaFarol_(lim),
    linhas: [{ valor: lim.verde, rotulo: 'limite do verde (' + CondutaRel_rotuloLimite_(lim.verde) + ')', cor: CONDUTAREL_COR.VERDE }, { valor: lim.amarelo, rotulo: 'limite do amarelo (' + CondutaRel_rotuloLimite_(lim.amarelo) + ')', cor: CONDUTAREL_COR.VERMELHO }] }));
}

function Conduta_montarRelatorioHtml_(ctx, ia, doc) {
  doc = doc || {};
  var c = [], pts = function (n) { return RelA4_plural_(n, 'ponto', 'pontos'); };
  if (ctx.sombra) c.push(RelA4_caixa_('Período de teste: o índice é calculado e publicado, mas o bônus ainda não é pago. Os valores deste relatório são simulados.', 'aviso'));
  var sit = CondutaRel_situacaoFechado_(ctx);
  var pago = ctx.farol === 'VERDE' && !ctx.temGG;
  var sub = pago ? (ctx.sombra ? 'Valor simulado de ' : '') + RelA4_moeda_(ctx.valorBonus) + ' por pessoa' + (ctx.sombra ? ', sem pagamento.' : '.')
    : ctx.temGG ? 'O cancelamento independe do índice. Os incentivos de missão continuam devidos.' : 'Os incentivos de missão não dependem do farol e continuam devidos.';
  var temEvolucao = (ctx.mesesFechados || []).length >= 3;
  var kpis = [[ctx.qtdColaboradoresComBonus + ' de ' + ctx.qtdColaboradoresTotal, 'Colaboradores com bônus coletivo', ctx.qtdColaboradoresComBonus ? 'ok' : 'aviso'],
    [RelA4_num_(ctx.missoes.qtdQualificadas, 0), 'Missões aprovadas com incentivo'],
    [RelA4_moeda_(ctx.missoes.valorTotal), 'Incentivos de missão (' + (ctx.sombra ? 'simulado' : 'devido') + ')'],
    temEvolucao || ctx.icoMesAnterior === null ? [RelA4_num_(ctx.n, 0), 'Pessoas no cálculo do índice'] : [CondutaRel_indice_(ctx.icoMesAnterior), 'Índice de ' + RelA4_competencia_(ctx.competenciaAnterior)]];
  c.push(RelA4_secao_('Resumo do mês', CondutaRel_resumoFarolHtml_({ ico: ctx.ico, farol: ctx.farol, D: ctx.D, limites: ctx.limites, limiteVerdeD: ctx.limiteVerdeD, limiteAmareloD: ctx.limiteAmareloD,
    situacao: sit.texto, classe: sit.classe, sub: sub, kpis: kpis })));
  c.push(RelA4_secao_('Interpretação do mês', RelA4_paragrafos_(ia.narrativa + '\n\n' + ia.recomendacao)));
  c.push(RelA4_secao_('Composição do demérito', CondutaRel_composicaoHtml_(ctx)));
  var evol = CondutaRel_evolucaoHtml_(ctx);
  if (evol) c.push(evol);

  // reconhecimentos, missões e contestações (agregados, sem nome)
  var rec = ctx.reconhecimentos || [];
  var blocoRec = rec.length
    ? RelA4_tabela_([{ t: 'Motivo do reconhecimento' }, { t: 'Registros', num: true }], rec.map(function (r) { return [r.descricao, RelA4_num_(r.quantidade, 0)]; }), { legenda: 'Reconhecimentos registrados no mês, por motivo', compacta: true })
    : '<p>Nenhum reconhecimento foi registrado no mês.</p>';
  var m = ctx.missoes, txtMis = [];
  txtMis.push('O incentivo de missão é pago por executante de missão aprovada pela gestão e não depende do farol do mês.');
  if (m.qtdRecusadas) txtMis.push(RelA4_plural_(m.qtdRecusadas, 'missão foi recusada', 'missões foram recusadas') + ' pela gestão e ' + (m.qtdRecusadas === 1 ? 'não entra' : 'não entram') + ' no valor.');
  if (m.qtdLegadas) txtMis.push(RelA4_plural_(m.qtdLegadas, 'missão lançada', 'missões lançadas') + ' antes da regra de aprovação ' + (m.qtdLegadas === 1 ? 'conta' : 'contam') + ' como aprovação legada.');
  txtMis.push('O detalhamento por executante está na prestação de contas de missões.');
  var ct = ctx.contestacoes;
  var txtCont = ct.qtdContestadas
    ? RelA4_plural_(ct.qtdContestadas, 'ocorrência foi contestada', 'ocorrências foram contestadas') + ' no mês: ' + (ct.qtdAnuladas ? RelA4_plural_(ct.qtdAnuladas, 'anulada', 'anuladas') : 'nenhuma anulada') + ' e ' + (ct.qtdMantidas ? RelA4_plural_(ct.qtdMantidas, 'mantida', 'mantidas') : 'nenhuma mantida') + '.'
    : 'Nenhuma ocorrência foi contestada no mês.';
  if (ct.qtdDecisoesDiretoria) txtCont += ' ' + RelA4_plural_(ct.qtdDecisoesDiretoria, 'ocorrência teve', 'ocorrências tiveram') + ' decisão da Diretoria sobre ocorrência em que é envolvida, com fundamentação no histórico.';
  c.push(RelA4_secao_('Reconhecimentos, missões e contestações',
    RelA4_subsecao_('Reconhecimentos', blocoRec) + RelA4_subsecao_('Missões', '<p>' + RelA4_esc_(txtMis.join(' ')) + '</p>') + RelA4_subsecao_('Contestações', '<p>' + RelA4_esc_(txtCont) + '</p>')));

  c.push(RelA4_secao_('Responsabilidade', '<div class="manter"><p>Os números deste relatório vêm do fechamento congelado em ' + RelA4_esc_(RelA4_dataBr_(ctx.fechadoEm)) +
    (ctx.automatico ? ' (fechamento automático)' : '') + ' e não são recalculados. O relatório é coletivo e não identifica pessoas: o demérito é da equipe, e o resultado individual fica no extrato de cada colaborador.' +
    (doc.revisao ? ' Esta revisão foi gerada de novo a partir do mesmo fechamento; a cópia original do fechamento continua guardada no histórico do programa.' : '') + '</p>' +
    RelA4_assinaturas_(['Gestão do programa de conduta', 'Diretoria']) + '</div>'));

  var ficha = [['Fechado em', RelA4_dataBr_(ctx.fechadoEm) + (ctx.automatico ? ' (automático)' : '')]];
  if (ctx.observacao) ficha.push(['Observação do fechamento', ctx.observacao]);
  return RelA4_documento_({
    titulo: 'Programa de conduta — fechamento mensal', subtitulo: 'Resultado da equipe em ' + RelA4_competencia_(ctx.competencia), tituloCurto: 'Conduta — fechamento de ' + RelA4_competencia_(ctx.competencia),
    tituloArquivo: 'Programa de conduta - fechamento mensal', sigla: 'CND', numero: 'CND-' + ctx.competencia.replace('-', ''), revisao: doc.revisao || 0,
    rotuloIdentificacao: 'Competência', identificacao: RelA4_competencia_(ctx.competencia), ficha: ficha, corpo: c.join('\n')
  });
}

function CondutaRel_pastaRelatorios_(sub) {
  return function () { return RelA4_subpasta_(SGO_DocSalvar_pastaPersistente_('CONDUTA_RELATORIOS_FOLDER_ID', 'Programa de conduta - Relatórios'), sub); };
}

function CondutaRel_registroMensal_(competencia) {
  return SGO_DATA.getAll(CONDUTA_SHEETS.RELATORIO).find(function (r) { return Conduta_soComp_(r.COMPETENCIA) === competencia && (!r.TIPO || r.TIPO === 'MENSAL'); });
}
function CondutaRel_registroOriginal_(competencia) {
  return SGO_DATA.getAll(CONDUTA_SHEETS.RELATORIO).find(function (r) { return Conduta_soComp_(r.COMPETENCIA) === competencia && r.TIPO === 'MENSAL_ORIGINAL'; });
}
function CondutaRel_ctxGravado_(reg) { try { return JSON.parse((reg && reg.CONTEXTO_JSON) || '') || null; } catch (e) { return null; } }
function CondutaRel_modeloAtual_(reg) { var c = CondutaRel_ctxGravado_(reg); return !!(c && c.modeloVersao === CONDUTAREL_MODELO); }

/** Link de tela para a cópia original (a janela do relatório foi aberta pelo módulo). */
function CondutaRel_linkOriginal_(competencia, data) {
  return '<a href="#" onclick="try{window.opener.tplConduta_verRelatorioOriginal_(\'' + RelA4_esc_(competencia) + '\');}catch(e){alert(\'Abra a cópia original pela aba Fechamentos do Programa de conduta.\');}return false;">Abrir a cópia original de ' + RelA4_esc_(RelA4_dataBr_(data)) + '</a>';
}

/**
 * Gera (ou regenera) o relatório de uma competência fechada, salva HTML + PDF
 * na pasta e grava em qual_relatorio o documento final (o contexto exato vai
 * junto, para auditoria). A primeira cópia (a do fechamento) é guardada como
 * MENSAL_ORIGINAL antes de ser substituída. Número fixo por competência,
 * revisão + 1 a cada geração.
 * opcoes: { atualizacao: true } quando quem pede é a abertura de uma cópia em modelo anterior.
 * Devolve { html (com avisos de tela), aviso, link, revisao }.
 */
function Conduta_gerarRelatorioCompleto_(competencia, opcoes) {
  opcoes = opcoes || {};
  var ctx = Conduta_montarContextoRelatorio_(competencia);
  var existente = CondutaRel_registroMensal_(competencia);
  var anterior = CondutaRel_ctxGravado_(existente);
  var revisao = !existente ? 0 : (anterior && anterior.modeloVersao && isFinite(Number(anterior.revisao)) ? Number(anterior.revisao) + 1 : 1);
  var padrao = CondutaRel_textosPadrao_(ctx), ia, analise;
  try { ia = CondutaIA_gerarInterpretacao_(ctx); analise = { origem: 'IA', aviso: '' }; }
  catch (eIa) { ia = padrao; analise = { origem: 'PADRAO', aviso: RelA4_avisoFalhaIa_(eIa) }; }
  ctx.textos = { narrativa: ia.narrativa, recomendacao: ia.recomendacao, origem: analise.origem };
  ctx.modeloVersao = CONDUTAREL_MODELO; ctx.revisao = revisao;
  var gravacao = RelA4_salvar_(CondutaRel_pastaRelatorios_('Fechamentos mensais'), competencia, Conduta_montarRelatorioHtml_(ctx, ia, { revisao: revisao }));
  var html = gravacao.html;
  var original = CondutaRel_registroOriginal_(competencia);
  if (existente && !original) {
    // a cópia do fechamento nunca se perde: fica guardada para o histórico
    original = SGO_DATA.insert(CONDUTA_SHEETS.RELATORIO, { TIPO: 'MENSAL_ORIGINAL', VISIBILIDADE: existente.VISIBILIDADE || 'EQUIPE', COMPETENCIA: competencia,
      HTML: existente.HTML, CONTEXTO_JSON: existente.CONTEXTO_JSON || '', GERADO_EM: Conduta_soData_(existente.GERADO_EM) || String(existente.GERADO_EM || '') });
  }
  var dados = { TIPO: 'MENSAL', VISIBILIDADE: 'EQUIPE', COMPETENCIA: competencia, HTML: html, CONTEXTO_JSON: JSON.stringify(ctx), GERADO_EM: Conduta_hojeISO_() };
  if (existente) SGO_DATA.update(CONDUTA_SHEETS.RELATORIO, existente.ID, dados); else SGO_DATA.insert(CONDUTA_SHEETS.RELATORIO, dados);
  var avisos = [];
  if (opcoes.atualizacao) {
    avisos.push({ tipo: 'ok', html: 'A cópia gravada deste mês estava no modelo anterior do relatório. Esta é a revisão ' + RelA4_esc_(SGO_DocA4_revisao_(revisao)) +
      ', gerada agora no modelo atual a partir do fechamento congelado em ' + RelA4_esc_(RelA4_dataBr_(ctx.fechadoEm)) + ': os números não mudaram.' +
      (original ? ' A cópia original continua guardada: ' + CondutaRel_linkOriginal_(competencia, original.GERADO_EM) + '.' : '') });
  } else if (original) {
    avisos.push({ tipo: 'ok', html: 'Revisão ' + RelA4_esc_(SGO_DocA4_revisao_(revisao)) + ' do relatório deste mês, com os números do fechamento congelado. ' + CondutaRel_linkOriginal_(competencia, original.GERADO_EM) + '.' });
  }
  avisos = avisos.concat(RelA4_avisosPadrao_(gravacao, [analise]));
  return { html: RelA4_injetarAvisos_(html, avisos), aviso: [gravacao.aviso, analise.aviso].filter(Boolean).join(' '), link: gravacao.pdfUrl, pastaUrl: gravacao.pastaUrl, revisao: revisao };
}

/** Mantido para o fechamento (SGO_Conduta_Fechamento.js): devolve o HTML. */
function Conduta_gerarRelatorio_(competencia) { return Conduta_gerarRelatorioCompleto_(competencia).html; }

function Conduta_apiGerarRelatorio(sessionId, payload) {
  Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var competencia = String(payload.competencia || '').trim();
  if (!/^\d{4}-\d{2}$/.test(competencia)) throw new Error('Competência inválida (use AAAA-MM).');
  var r = Conduta_gerarRelatorioCompleto_(competencia);
  return { ok: true, html: r.html, aviso: r.aviso, link: r.link, pastaUrl: r.pastaUrl, revisao: r.revisao };
}

/** Faixa de tela também em cópia antiga (sem o marcador da moldura atual). */
function CondutaRel_faixaTela_(html, avisos) {
  html = String(html || '');
  if (html.indexOf('<!--RELA4_AVISOS-->') >= 0) return RelA4_injetarAvisos_(html, avisos);
  var faixas = (avisos || []).map(function (a) {
    return '<div class="no-print" style="max-width:210mm;margin:10px auto;padding:9px 12px;border-radius:4px;font:12.5px/1.45 Arial,sans-serif;background:#fffbeb;border:1px solid #fcd34d;color:#78350f">' + a.html + '</div>';
  }).join('') + '<style>@media print{.no-print{display:none!important}}</style>';
  return /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, function (b) { return b + faixas; }) : faixas + html;
}

/**
 * "Ver relatório". Cópia no modelo atual: devolve a cópia gravada.
 * Cópia em modelo anterior: gera a revisão no modelo atual a partir do
 * fechamento congelado (os números não mudam), guarda a original e avisa.
 * payload.original = true: devolve a cópia original do fechamento.
 */
function Conduta_apiObterRelatorio(sessionId, payload) {
  Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var competencia = Conduta_soComp_(payload.competencia);
  var relatorio = CondutaRel_registroMensal_(competencia);
  if (!relatorio) return null;
  if (payload.original) {
    var orig = CondutaRel_registroOriginal_(competencia) || relatorio;
    return { competencia: competencia, original: true, geradoEm: orig.GERADO_EM,
      html: CondutaRel_faixaTela_(orig.HTML, [{ html: 'Cópia original do relatório de ' + RelA4_esc_(RelA4_competencia_(competencia)) + ', gravada em ' + RelA4_esc_(RelA4_dataBr_(orig.GERADO_EM)) +
        ' no modelo da época. Guardada só para o histórico: os números são os do fechamento, e a versão atual abre pelo botão "Ver relatório".' }]) };
  }
  if (!CondutaRel_modeloAtual_(relatorio)) {
    var lock = LockService.getScriptLock();
    lock.waitLock(60000);
    try {
      relatorio = CondutaRel_registroMensal_(competencia);
      if (!CondutaRel_modeloAtual_(relatorio)) {
        var r = Conduta_gerarRelatorioCompleto_(competencia, { atualizacao: true });
        return { competencia: competencia, html: r.html, geradoEm: Conduta_hojeISO_(), atualizado: true, revisao: r.revisao };
      }
    } finally { lock.releaseLock(); }
  }
  var original = CondutaRel_registroOriginal_(competencia), ctxR = CondutaRel_ctxGravado_(relatorio) || {};
  var avisos = original ? [{ tipo: 'ok', html: 'Revisão ' + RelA4_esc_(SGO_DocA4_revisao_(ctxR.revisao || 0)) + ', gerada em ' + RelA4_esc_(RelA4_dataBr_(relatorio.GERADO_EM)) + ' com os números do fechamento congelado. ' + CondutaRel_linkOriginal_(competencia, original.GERADO_EM) + '.' }] : [];
  return { competencia: relatorio.COMPETENCIA, html: RelA4_injetarAvisos_(relatorio.HTML, avisos), geradoEm: relatorio.GERADO_EM };
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
  var lim = CondutaRel_limitesD_(r.n);
  var situacao = r.temGG ? 'Farol ' + CondutaRel_farolTexto_(r.farol).toLowerCase() + ' · bônus coletivo cancelado por infração gravíssima'
    : 'Farol ' + CondutaRel_farolTexto_(r.farol).toLowerCase() + ' · ' + (r.farol === 'VERDE' ? 'bônus coletivo preservado na prévia' : 'bônus coletivo não seria pago');
  var bloqueio = p.podeFechar ? 'A competência pode ser fechada: não há defesa nem missão pendente.' :
    p.fechamentoCongelado ? 'A competência já está fechada.' : 'O fechamento ainda está bloqueado: ' + [p.pendencias.length ? RelA4_plural_(p.pendencias.length, 'ocorrência com defesa ou decisão pendente', 'ocorrências com defesa ou decisão pendente') : '', (p.missoesPendentes || []).length ? RelA4_plural_(p.missoesPendentes.length, 'missão aguardando aprovação', 'missões aguardando aprovação') : '', p.competencia >= Conduta_competenciaDe_(Conduta_hojeISO_()) ? 'o mês ainda não terminou' : ''].filter(Boolean).join('; ') + '.';
  c.push(RelA4_secao_('Resultado provisório', CondutaRel_resumoFarolHtml_({ ico: r.ico, farol: r.farol, D: r.D, limites: { verde: lim.verde, amarelo: lim.amarelo }, limiteVerdeD: lim.verdeD, limiteAmareloD: lim.amareloD,
    situacao: situacao, classe: r.temGG ? 'vermelho' : CondutaRel_classeFarol_(r.farol), sub: bloqueio,
    kpis: [[RelA4_num_(r.n, 0), 'Pessoas no cálculo'], [RelA4_num_((p.pendencias || []).length, 0), 'Defesas ou decisões pendentes', (p.pendencias || []).length ? 'aviso' : 'ok'],
      [RelA4_num_((p.missoesPendentes || []).length, 0), 'Missões aguardando aprovação', (p.missoesPendentes || []).length ? 'aviso' : 'ok'], [r.sombra ? 'Sim' : 'Não', 'Período de teste']] })));
  if ((p.pendencias || []).length) c.push(RelA4_secao_('Ocorrências e defesas pendentes', RelA4_tabela_([{ t: 'Ocorrência' }, { t: 'Situação' }, { t: 'Data do fato' }, { t: 'Contestação até' }, { t: 'Recurso até' }, { t: 'Julgamento até' }],
    (p.pendencias || []).map(function (o) { var st = SGO_UTILS.safeUpper(o.status); return [String(o.id), (typeof CONDUTA_EXTRATO_SITUACAO !== 'undefined' && CONDUTA_EXTRATO_SITUACAO[st]) || o.status, RelA4_dataBr_(o.dataFato), RelA4_dataBr_(o.prazoContestacao) || '—', RelA4_dataBr_(o.prazoRecurso) || '—', RelA4_dataBr_(o.prazoJulgamento) || '—']; }),
    { legenda: 'Ocorrências que ainda impedem o fechamento' })));
  if ((p.missoesPendentes || []).length) c.push(RelA4_secao_('Missões aguardando aprovação', RelA4_tabela_([{ t: 'Destino' }, { t: 'Data' }], (p.missoesPendentes || []).map(function (m) { return [m.destino, RelA4_dataBr_(m.data)]; }),
    { legenda: 'Missões a aprovar ou recusar na aba Missões' })));
  var sombra = !!r.sombra, pessoas = (r.porColaborador || []).slice().sort(function (a, b) { return String(a.nome || '').localeCompare(String(b.nome || '')); });
  function v(x, campo) { return Number(x[sombra ? campo.replace('valor', 'valorSimulado') : campo]) || 0; }
  c.push(RelA4_secao_('Valores ' + (sombra ? 'simulados' : 'provisórios') + ' por colaborador', RelA4_tabela_([{ t: 'Colaborador' }, { t: 'Bônus coletivo', num: true }, { t: 'Incentivo de missão', num: true }, { t: 'Total', num: true }],
    pessoas.map(function (x) { return [x.nome || String(x.colaboradorId), RelA4_moeda_(v(x, 'valorBonus')), RelA4_moeda_(v(x, 'valorIncentivo')), RelA4_moeda_(v(x, 'valorBonus') + v(x, 'valorIncentivo'))]; }),
    { vazio: 'Nenhum colaborador no cálculo.', legenda: 'Valores ' + (sombra ? 'simulados (período de teste)' : 'provisórios') + ' por pessoa', compacta: pessoas.length > 12,
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
