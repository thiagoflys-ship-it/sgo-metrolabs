/****************************************************
 * PROGRAMA DE CONDUTA — RELATÓRIO DA EQUIPE (todos os colaboradores)
 *
 * 20/10/2026, pedido do dono: um A4 (paisagem, a tabela é larga) com uma
 * linha por pessoa no período escolhido (uma competência ou um intervalo
 * de competências): área, ocorrências, pontos, reconhecimentos, missões,
 * ciência dos avisos e situação do bônus; totais por área e gráfico só
 * quando houver 4 ou mais áreas.
 *
 * Ninguém fica de fora por falta de área: aparece "Área não informada" e
 * uma nota diz onde corrigir o cadastro.
 *
 * Só leitura. Acesso: gestão, Diretoria e RH (consulta) — o documento tem
 * resultado individual e não é publicado para a equipe. Mês fechado usa o
 * resultado congelado; mês aberto, a apuração parcial (com aviso).
 ****************************************************/

var CONDUTA_AREA_NAO_INFORMADA = 'Área não informada';

/**
 * Nome da área da pessoa no cadastro; vazio quando não há. Usa o cadastro de áreas
 * (SGO_areaDoUsuario_, código em CAD_USUARIOS.AREA) quando existe; senão, o texto
 * das colunas de área ou setor. nomes: mapa código -> nome (opcional, para não reler).
 */
function Conduta_areaDe_(u, nomes) {
  if (!u) return '';
  if (typeof SGO_areaDoUsuario_ === 'function') {
    try {
      if (!nomes && typeof Cndq_nomesAreas_ === 'function') nomes = Cndq_nomesAreas_();
      var ar = SGO_areaDoUsuario_(u, nomes || {});
      if (ar && ar.codigo) return String(ar.nome || ar.codigo);
    } catch (e) { /* cai no texto do cadastro */ }
  }
  var campos = ['AREA_NOME', 'AREA', 'SETOR', 'DEPARTAMENTO'];
  for (var i = 0; i < campos.length; i++) { var v = SGO_UTILS.safe(u[campos[i]]); if (v) return v; }
  return '';
}

/** Lista de competências 'AAAA-MM' de inicio a fim (no máximo 12). */
function CondutaEq_competencias_(inicio, fim) {
  var out = [], a = Number(inicio.slice(0, 4)), m = Number(inicio.slice(5, 7));
  while (out.length < 13) {
    var c = a + '-' + String(m).padStart(2, '0');
    out.push(c);
    if (c === fim) break;
    m++; if (m > 12) { m = 1; a++; }
  }
  if (out[out.length - 1] !== fim) throw new Error('O período do relatório da equipe vai até 12 meses. Escolha um intervalo menor.');
  return out;
}

function CondutaEq_contexto_(inicio, fim) {
  var meses = CondutaEq_competencias_(inicio, fim);
  var usuarios = {}, nomesAreas = typeof Cndq_nomesAreas_ === 'function' ? Cndq_nomesAreas_() : null;
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { usuarios[String(u.ID)] = u; });
  var pessoas = {};
  function pessoa(id) {
    id = String(id);
    if (!pessoas[id]) {
      var u = usuarios[id] || {};
      pessoas[id] = { id: id, nome: u.NOME || u.USUARIO || id, area: Conduta_areaDe_(u, nomesAreas), ativo: SGO_UTILS.safeUpper(u.STATUS) === 'ATIVO',
        firmes: 0, andamento: 0, pontos: 0, gg: 0, reconhecimentos: 0, missoes: 0, missoesElegiveis: 0, incentivo: 0,
        avisos: 0, cientes: 0, mesesBonus: 0, mesesNoCalculo: 0, valorBonus: 0, situacoes: [] };
    }
    return pessoas[id];
  }
  // equipe de hoje (mesmo critério da apuração) — ninguém some por falta de área
  Object.keys(usuarios).forEach(function (id) {
    var u = usuarios[id];
    if (SGO_UTILS.safeUpper(u.STATUS) === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE' && !Conduta_ehContaGenerica_(u)) pessoa(id);
  });

  var ciencias = Conduta_cienciasDe_(null);
  var ocorrencias = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA), positivos = SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO);
  var resumoMeses = [], sombraAlguma = false, abertos = [];

  meses.forEach(function (comp) {
    var fech = Conduta_fechamentoDe_(comp), linhas, sombra, farol, temGG;
    if (fech) {
      try { linhas = JSON.parse(fech.RESULTADO_JSON || '[]'); } catch (e) { linhas = []; }
      sombra = SGO_UTILS.safeUpper(fech.SOMBRA) === 'TRUE' || fech.SOMBRA === true; farol = fech.FAROL; temGG = SGO_UTILS.safeUpper(fech.TEM_GG) === 'TRUE' || fech.TEM_GG === true;
      resumoMeses.push({ competencia: comp, fechado: true, ico: Number(fech.ICO), farol: farol, D: Number(fech.D) || 0 });
    } else {
      var ap = Conduta_apurarCompetencia_(comp);
      linhas = ap.porColaborador || []; sombra = ap.sombra; farol = ap.farol; temGG = ap.temGG;
      resumoMeses.push({ competencia: comp, fechado: false, ico: ap.ico, farol: farol, D: ap.D });
      abertos.push(comp);
    }
    if (sombra) sombraAlguma = true;
    linhas.forEach(function (l) {
      var p = pessoa(l.colaboradorId);
      if (!Conduta_colaboradorAusenteNaCompetencia_(l.colaboradorId, comp)) p.mesesNoCalculo++;
      if (l.recebeBonus) { p.mesesBonus++; p.valorBonus += Number(sombra ? l.valorSimuladoBonus : l.valorBonus) || 0; }
      p.situacoes.push(l.recebeBonus ? (sombra ? 'SIMULADO' : 'RECEBE') : l.ggPropria ? 'GG' : (farol === 'VERDE' && !temGG ? 'FORA' : 'FAROL'));
    });
    // ocorrências (mês do fato) e avisos de ciência do mês
    var avisosMes = [];
    ocorrencias.forEach(function (o) {
      if (Conduta_soComp_(o.COMPETENCIA || o.DATA_FATO) !== comp) return;
      var st = SGO_UTILS.safeUpper(o.STATUS);
      if (CONDUTA_STATUS_HOMOLOGADAS.indexOf(st) >= 0) avisosMes.push({ tipo: 'OCORRENCIA', ref: String(o.ID) });
      if (!o.COLABORADOR_ID || (!pessoas[String(o.COLABORADOR_ID)] && Conduta_ehContaGenerica_(usuarios[String(o.COLABORADOR_ID)]))) return;
      var p = pessoa(o.COLABORADOR_ID);
      if (st === 'FIRME') { p.firmes++; p.pontos += Number(o.PESO_APLICADO) || 0; if (SGO_UTILS.safeUpper(o.NIVEL_APLICADO) === 'GG') p.gg++; }
      else if (['REGISTRADA', 'HOMOLOGADA', 'CONTESTADA', 'EM_RECURSO'].indexOf(st) >= 0) p.andamento++;
    });
    if (fech) avisosMes.push({ tipo: 'FECHAMENTO', ref: comp });
    Object.keys(pessoas).forEach(function (id) {
      var p = pessoas[id];
      if (!p.ativo) return;
      avisosMes.forEach(function (a) { p.avisos++; var c = ciencias[a.tipo + '|' + a.ref + '|' + id]; if (c && Conduta_soData_(c.CIENTE_EM)) p.cientes++; });
    });
    positivos.forEach(function (e) {
      if (Conduta_soComp_(e.COMPETENCIA || e.DATA_FATO) !== comp) return;
      var ds = []; try { ds = JSON.parse(e.DESTINATARIOS_JSON || '[]'); } catch (x) {}
      var alvos = (e.COLABORADOR_ID ? [String(e.COLABORADOR_ID)] : []).concat((ds || []).map(String));
      alvos.filter(function (id, i, a) { return id && a.indexOf(id) === i; }).forEach(function (id) { if (usuarios[id]) pessoa(id).reconhecimentos++; });
    });
    CondutaRG_contextoMissoes_(comp).linhas.forEach(function (l) {
      var p = pessoa(l.colaboradorId);
      p.missoes++; if (l.qualifica) { p.missoesElegiveis++; p.incentivo += Number(l.valor) || 0; }
    });
  });

  var lista = Object.keys(pessoas).map(function (k) { return pessoas[k]; });
  lista.sort(function (a, b) { return (!a.area - !b.area) || String(a.area).localeCompare(String(b.area)) || String(a.nome).localeCompare(String(b.nome)); });
  var areas = {};
  lista.forEach(function (p) {
    var k = p.area || CONDUTA_AREA_NAO_INFORMADA;
    var a = areas[k] = areas[k] || { area: k, semArea: !p.area, pessoas: 0, firmes: 0, pontos: 0, reconhecimentos: 0, missoesElegiveis: 0, incentivo: 0, avisos: 0, cientes: 0, comBonus: 0 };
    a.pessoas++; a.firmes += p.firmes; a.pontos += p.pontos; a.reconhecimentos += p.reconhecimentos; a.missoesElegiveis += p.missoesElegiveis; a.incentivo += p.incentivo;
    a.avisos += p.avisos; a.cientes += p.cientes; if (p.mesesBonus) a.comBonus++;
  });
  return { inicio: inicio, fim: fim, meses: meses, resumoMeses: resumoMeses, abertos: abertos, sombra: sombraAlguma, pessoas: lista,
    areas: Object.keys(areas).map(function (k) { return areas[k]; }).sort(function (a, b) { return (a.semArea - b.semArea) || b.pontos - a.pontos || a.area.localeCompare(b.area); }) };
}

function CondutaEq_periodo_(x) {
  return x.meses.length === 1 ? RelA4_competencia_(x.inicio) : RelA4_competencia_(x.inicio) + ' a ' + RelA4_competencia_(x.fim);
}

/** Situação do bônus da pessoa no período, em poucas palavras. */
function CondutaEq_situacaoBonus_(p, x) {
  var n = p.situacoes.length;
  if (!n) return RelA4_marca_('Fora do cálculo', 'neutra');
  if (n === 1) {
    var s = p.situacoes[0], parcial = x.abertos.length ? ' (parcial)' : '';
    if (s === 'RECEBE') return RelA4_marca_('Recebe' + parcial, 'ok');
    if (s === 'SIMULADO') return RelA4_marca_('Simulado' + parcial, 'ok');
    if (s === 'GG') return RelA4_marca_('Não recebe: gravíssima própria', 'critico');
    if (s === 'FORA') return RelA4_marca_('Não recebe', 'aviso');
    return RelA4_marca_('Não recebe: farol', 'aviso');
  }
  return RelA4_marca_('Recebe em ' + p.mesesBonus + ' de ' + n + ' meses', p.mesesBonus === n ? 'ok' : p.mesesBonus ? 'aviso' : 'critico');
}

function CondutaEq_html_(x) {
  var c = [], tot = x.pessoas.reduce(function (s, p) {
    s.firmes += p.firmes; s.pontos += p.pontos; s.rec += p.reconhecimentos; s.mis += p.missoesElegiveis; s.inc += p.incentivo; s.av += p.avisos; s.ci += p.cientes; if (p.mesesBonus) s.bonus++; if (!p.area) s.semArea++;
    return s;
  }, { firmes: 0, pontos: 0, rec: 0, mis: 0, inc: 0, av: 0, ci: 0, bonus: 0, semArea: 0 });
  function pct(a, b) { return b ? RelA4_num_(a / b * 100, 0) + '%' : '—'; }
  if (x.abertos.length) c.push(RelA4_caixa_('Apuração parcial: ' + x.abertos.map(RelA4_competencia_).join(', ') + (x.abertos.length === 1 ? ' ainda não foi fechado' : ' ainda não foram fechados') + '. Os números podem mudar até o fechamento.', 'aviso'));
  if (x.sombra) c.push(RelA4_caixa_('Período de teste em parte do período: os valores de bônus são simulados e não autorizam pagamento.', 'aviso'));
  var mesesTxt = x.resumoMeses.map(function (m) { return RelA4_competencia_(m.competencia) + ': índice ' + CondutaRel_indice_(m.ico) + ', farol ' + CondutaRel_farolTexto_(m.farol).toLowerCase() + (m.fechado ? '' : ' (parcial)'); }).join('; ');
  c.push(RelA4_secao_('Resumo da equipe', RelA4_kpis_([
    [RelA4_num_(x.pessoas.length, 0), 'Colaboradores no relatório'], [RelA4_num_(tot.firmes, 0) + ' · ' + RelA4_num_(tot.pontos, 0), 'Ocorrências firmes · pontos de demérito', tot.firmes ? 'critico' : 'ok'],
    [RelA4_num_(tot.rec, 0), 'Reconhecimentos', tot.rec ? 'ok' : ''], [RelA4_moeda_(tot.inc), 'Incentivos de missão (' + RelA4_plural_(tot.mis, 'participação elegível', 'participações elegíveis') + ')'],
    [pct(tot.ci, tot.av), 'Avisos com ciência confirmada', tot.av && tot.ci < tot.av ? 'aviso' : 'ok'], [tot.bonus + ' de ' + x.pessoas.length, 'Com bônus coletivo no período', tot.bonus ? 'ok' : 'aviso']
  ]) + '<p class="nota">' + RelA4_esc_('Resultado coletivo do período — ' + mesesTxt + '.') + '</p>'));

  var areas = x.areas;
  // gráfico só quando agrega: 4 ou mais áreas com pontos (as sem pontos ficam só na tabela)
  var comPontos = areas.filter(function (a) { return a.pontos > 0; });
  var graf = comPontos.length >= 4 ? RelA4_barras_(comPontos.map(function (a) { return { rotulo: a.area, valor: a.pontos, rotuloValor: RelA4_plural_(a.pontos, 'ponto', 'pontos') + ' · ' + RelA4_plural_(a.firmes, 'ocorrência', 'ocorrências'), cor: a.semArea ? RELA4_CORES.cinza : CONDUTAREL_COR.VERMELHO }; }),
    { titulo: 'Pontos de demérito por área no período', altura: 9, espaco: 7 }) : '';
  c.push(RelA4_secao_('Totais por área', graf + RelA4_tabela_([{ t: 'Área' }, { t: 'Pessoas', num: true }, { t: 'Ocorrências firmes', num: true }, { t: 'Pontos', num: true }, { t: 'Reconhecimentos', num: true },
    { t: 'Missões elegíveis', num: true }, { t: 'Incentivos', num: true }, { t: 'Ciência dos avisos', num: true }, { t: 'Com bônus', num: true }],
    areas.map(function (a) { return [a.area, RelA4_num_(a.pessoas, 0), RelA4_num_(a.firmes, 0), RelA4_num_(a.pontos, 0), RelA4_num_(a.reconhecimentos, 0), RelA4_num_(a.missoesElegiveis, 0), RelA4_moeda_(a.incentivo), pct(a.cientes, a.avisos), a.comBonus + ' de ' + a.pessoas]; }),
    { legenda: 'Totais por área no período', compacta: true,
      total: areas.length > 1 ? ['Total', RelA4_num_(x.pessoas.length, 0), RelA4_num_(tot.firmes, 0), RelA4_num_(tot.pontos, 0), RelA4_num_(tot.rec, 0), RelA4_num_(tot.mis, 0), RelA4_moeda_(tot.inc), pct(tot.ci, tot.av), tot.bonus + ' de ' + x.pessoas.length] : null })));

  c.push(RelA4_secao_('Colaboradores', RelA4_tabela_([{ t: 'Colaborador' }, { t: 'Área' }, { t: 'Ocorrências firmes', num: true }, { t: 'Em andamento', num: true }, { t: 'Pontos', num: true },
    { t: 'Reconhecimentos', num: true }, { t: 'Missões elegíveis', num: true }, { t: 'Incentivo', num: true }, { t: 'Ciência dos avisos', num: true }, { t: 'Bônus coletivo' }],
    x.pessoas.map(function (p) {
      return [p.nome + (p.ativo ? '' : ' (inativo)'), p.area || { html: '<i>' + RelA4_esc_(CONDUTA_AREA_NAO_INFORMADA) + '</i>' }, RelA4_num_(p.firmes, 0) + (p.gg ? ' (' + p.gg + ' gravíssima)' : ''), RelA4_num_(p.andamento, 0), RelA4_num_(p.pontos, 0),
        RelA4_num_(p.reconhecimentos, 0), p.missoes ? p.missoesElegiveis + ' de ' + p.missoes : '0', RelA4_moeda_(p.incentivo), p.avisos ? p.cientes + ' de ' + p.avisos : '—', CondutaEq_situacaoBonus_(p, x)];
    }), { legenda: 'Resultado por colaborador no período', compacta: true, vazio: 'Nenhum colaborador no período.' }) +
    (tot.semArea ? '<p class="nota">' + RelA4_esc_(RelA4_plural_(tot.semArea, 'pessoa está', 'pessoas estão') + ' sem área no cadastro e ' + (tot.semArea === 1 ? 'aparece' : 'aparecem') + ' como "' + CONDUTA_AREA_NAO_INFORMADA + '". Para corrigir, a gestão informa a área no cadastro da pessoa, em Administração > Usuários, e gera o relatório de novo.') + '</p>' : '') +
    '<p class="nota">Ocorrências contam no mês da data do fato; pontos só das firmes. Ciência: avisos do período (ocorrências homologadas e resultado do mês) que a pessoa confirmou ter lido. Missões: participações elegíveis do total.</p>'));

  c.push('<p class="nota">Documento de consulta da gestão, da Diretoria e do RH, com resultado individual: não deve ser publicado para a equipe. Os meses fechados usam o resultado congelado do fechamento; os meses em aberto, a apuração do momento da emissão.</p>');
  return RelA4_documento_({ titulo: 'Programa de conduta — relatório da equipe', subtitulo: 'Todos os colaboradores em ' + CondutaEq_periodo_(x), tituloCurto: 'Conduta — equipe em ' + CondutaEq_periodo_(x),
    tituloArquivo: 'Programa de conduta - relatório da equipe', sigla: 'CNQ', paisagem: true, rotuloIdentificacao: x.meses.length === 1 ? 'Competência' : 'Período', identificacao: CondutaEq_periodo_(x), corpo: c.join('\n') });
}

function Conduta_apiGerarRelatorioEquipe(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  // 28/10/2026 (sigilo do envolvido): mostra as ocorrências de cada pessoa; fica com a Diretoria e o Gestor de Qualidade.
  if (!(isAdminSession(sessionId) && Conduta_veIdentidade_(sessao))) throw new Error('O relatório da equipe mostra as ocorrências de cada pessoa e, por sigilo do colaborador, fica com a Diretoria e o Gestor de Qualidade. Para o seu resultado, use "Gerar extrato em A4"; os valores do mês estão no fechamento.');
  payload = payload || {};
  var inicio = Conduta_validarCompetencia_(payload.inicio || payload.competencia);
  var fim = Conduta_validarCompetencia_(payload.fim || inicio);
  if (fim < inicio) throw new Error('O mês final é anterior ao inicial. Escolha "De" antes de "Até".');
  if (fim > Conduta_competenciaDe_(Conduta_hojeISO_())) throw new Error('O período escolhido termina num mês que ainda não começou. Escolha até o mês atual.');
  var x = CondutaEq_contexto_(inicio, fim);
  var g = RelA4_salvar_(CondutaRel_pastaRelatorios_('Relatórios da equipe'), inicio === fim ? inicio : inicio + ' a ' + fim, CondutaEq_html_(x), { compartilhar: false });
  SGO_DATA.log('CONDUTA_RELATORIO_EQUIPE', sessao.usuario, 'Relatório da equipe ' + inicio + (fim !== inicio ? ' a ' + fim : '') + ' gerado', 'CONDUTA');
  return { ok: true, html: RelA4_injetarAvisos_(g.html, RelA4_avisosPadrao_(g, [])), aviso: g.aviso, link: g.pdfUrl };
}
