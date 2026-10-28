/****************************************************
 * PROGRAMA DE CONDUTA — EXTRATO DO COLABORADOR (17/10/2026)
 *
 * Documento A4 individual de uma competência: resultado do bônus
 * coletivo, incentivo de missão (com a aprovação da gestão), ocorrências,
 * reconhecimentos, ausências e placar. Mês fechado usa o resultado
 * congelado; mês aberto mostra a apuração parcial, avisando.
 *
 * Acesso: cada pessoa gera o próprio extrato; a gestão (Gestor, Diretoria,
 * Administrador) gera o de qualquer colaborador. A cópia (HTML + PDF) fica
 * na pasta do programa, subpasta do colaborador, sem link público.
 *
 * O comentário do mês vem da IA (raciocínio ligado) sem nome nenhum no
 * contexto; sem chave ou com falha, sai o texto padrão.
 ****************************************************/

var CONDUTA_EXTRATO_SITUACAO = {
  REGISTRADA: 'Registrada (aguarda homologação)', HOMOLOGADA: 'Homologada (em prazo de defesa)', CONTESTADA: 'Contestada (aguarda julgamento)',
  EM_RECURSO: 'Em recurso', FIRME: 'Firme', ANULADA: 'Anulada', REJEITADA: 'Rejeitada', DESCARTADA: 'Descartada'
};

function CondutaExt_contexto_(colaboradorId, competencia) {
  var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, colaboradorId);
  if (!u || SGO_UTILS.safeUpper(u.PERFIL) === 'CLIENTE') throw new Error('Colaborador não encontrado. Escolha a pessoa na lista e tente de novo.');
  var fech = Conduta_fechamentoDe_(competencia);
  var linha = null, fechado = !!fech, apur = null;
  if (fech) {
    try { linha = JSON.parse(fech.RESULTADO_JSON || '[]').filter(function (l) { return String(l.colaboradorId) === String(colaboradorId); })[0] || null; } catch (e) {}
  } else {
    apur = Conduta_apurarCompetencia_(competencia);
    linha = (apur.porColaborador || []).filter(function (l) { return String(l.colaboradorId) === String(colaboradorId); })[0] || null;
  }
  var sombra = fech ? (SGO_UTILS.safeUpper(fech.SOMBRA) === 'TRUE' || fech.SOMBRA === true) : apur.sombra;
  var catalogo = {};
  SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA_TIPO).forEach(function (t) { catalogo[SGO_UTILS.safeUpper(t.CODIGO)] = t; });
  var tiposPos = {};
  SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO_TIPO).forEach(function (t) { tiposPos[SGO_UTILS.safeUpper(t.CODIGO)] = t; });

  var ocorrencias = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).filter(function (o) {
    return String(o.COLABORADOR_ID) === String(colaboradorId) && Conduta_soComp_(o.COMPETENCIA || o.DATA_FATO) === competencia;
  }).map(function (o) {
    var t = catalogo[SGO_UTILS.safeUpper(o.TIPO_CODIGO)] || {}, st = SGO_UTILS.safeUpper(o.STATUS);
    return { data: Conduta_soData_(o.DATA_FATO), codigo: o.TIPO_CODIGO, descricao: t.DESCRICAO || '', status: st, situacao: CONDUTA_EXTRATO_SITUACAO[st] || st,
      pontos: st === 'FIRME' ? (Number(o.PESO_APLICADO) || 0) : 0, gravissima: st === 'FIRME' && SGO_UTILS.safeUpper(o.NIVEL_APLICADO) === 'GG',
      // 19/10/2026: decisão da Diretoria em ocorrência própria aparece no extrato
      decisaoDiretoria: SGO_UTILS.safe(o.DECISAO_DIRETORIA), fundamentacao: CondutaExt_fundamentacaoDiretoria_(o) };
  }).sort(function (a, b) { return a.data.localeCompare(b.data); });

  var reconhecimentos = SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO).filter(function (e) {
    var ds = []; try { ds = JSON.parse(e.DESTINATARIOS_JSON || '[]'); } catch (x) {}
    return Conduta_soComp_(e.COMPETENCIA || e.DATA_FATO) === competencia && (String(e.COLABORADOR_ID) === String(colaboradorId) || ds.map(String).indexOf(String(colaboradorId)) >= 0);
  }).map(function (e) {
    var t = tiposPos[SGO_UTILS.safeUpper(e.TIPO_CODIGO)] || {};
    return { data: Conduta_soData_(e.DATA_FATO), descricao: t.DESCRICAO || e.TIPO_CODIGO, grupo: e.GRUPO_NOME || '', texto: e.TEXTO_RECONHECIMENTO || '' };
  });

  var missoes = CondutaRG_contextoMissoes_(competencia).linhas.filter(function (l) { return String(l.colaboradorId) === String(colaboradorId); });
  var inicioMes = competencia + '-01', fimMes = competencia + '-31';
  var ausencias = Conduta_ativos_(CONDUTA_SHEETS.AUSENCIA).filter(function (a) {
    return String(a.COLABORADOR_ID) === String(colaboradorId) && Conduta_soData_(a.DATA_INICIO) <= fimMes && Conduta_soData_(a.DATA_FIM) >= inicioMes;
  }).map(function (a) { return { inicio: Conduta_soData_(a.DATA_INICIO), fim: Conduta_soData_(a.DATA_FIM), tipo: a.TIPO || '' }; });

  var resumo = fech ? { ico: Number(fech.ICO), farol: fech.FAROL, D: Number(fech.D) || 0, temGG: SGO_UTILS.safeUpper(fech.TEM_GG) === 'TRUE' || fech.TEM_GG === true }
    : { ico: apur.ico, farol: apur.farol, D: apur.D, temGG: apur.temGG };
  var valorBonus = linha ? (sombra ? Number(linha.valorSimuladoBonus) || 0 : Number(linha.valorBonus) || 0) : 0;
  var valorIncentivo = linha ? (sombra ? Number(linha.valorSimuladoIncentivo) || 0 : Number(linha.valorIncentivo) || 0) : 0;
  return {
    competencia: competencia, fechado: fechado, fechadoEm: fech ? Conduta_soData_(fech.FECHADO_EM) : '', sombra: sombra,
    colaborador: { id: u.ID, nome: u.NOME || u.USUARIO, perfil: u.PERFIL, setor: Conduta_areaDe_(u) },
    noCalculo: !!linha, ausenteNoMes: Conduta_colaboradorAusenteNaCompetencia_(colaboradorId, competencia),
    equipe: resumo, recebeBonus: !!(linha && linha.recebeBonus), ggPropria: !!(linha && linha.ggPropria),
    valorBonus: valorBonus, valorIncentivo: valorIncentivo, total: valorBonus + valorIncentivo,
    placar: linha ? Number(linha.placar) || 0 : Conduta_placarIndividual_(competencia, colaboradorId),
    ocorrencias: ocorrencias, reconhecimentos: reconhecimentos, missoes: missoes, ausencias: ausencias
  };
}

/**
 * Texto padrão (sem IA). 20/10/2026: não repete os valores do resumo (índice,
 * bônus, incentivo, total, contagens); explica o resultado e o que acompanhar.
 */
function CondutaExt_textoPadrao_(x) {
  var firmes = x.ocorrencias.filter(function (o) { return o.status === 'FIRME'; }).length;
  var emAndamento = x.ocorrencias.filter(function (o) { return ['REGISTRADA', 'HOMOLOGADA', 'CONTESTADA', 'EM_RECURSO'].indexOf(o.status) >= 0; }).length;
  var missPend = x.missoes.filter(function (m) { return m.aprovacao === 'PENDENTE'; }).length;
  var p = [];
  p.push((x.fechado ? 'O mês está fechado. ' : 'O mês ainda não foi fechado, e o resultado pode mudar até o fechamento. ') +
    (x.recebeBonus ? 'O bônus coletivo é devido porque a equipe ' + (x.fechado ? 'fechou' : 'está') + ' no farol verde, sem infração gravíssima' + (x.sombra ? '; no período de teste, o valor é só simulado' : '') + '.'
      : x.ggPropria ? 'Uma infração gravíssima firme registrada para você no mês zera o bônus coletivo e o incentivo de missão.'
        : !x.noCalculo ? 'Você não entrou no cálculo deste mês (ausência registrada ou cadastro inativo).'
          : 'O bônus coletivo não é devido porque o farol da equipe não está verde; o incentivo de missão não depende do farol.'));
  p.push((firmes ? 'As ocorrências firmes em seu nome, listadas na seção Ocorrências, entram no demérito de toda a equipe.' : 'Não há ocorrência firme em seu nome no mês.') +
    (emAndamento ? ' As que estão em andamento só contam se forem mantidas; acompanhe os prazos de defesa em Programa de conduta > Ocorrências.' : '') +
    (missPend ? ' Há missão sua aguardando a aprovação da gestão: o incentivo só entra depois da decisão.' : '') +
    (x.reconhecimentos.length ? ' Os reconhecimentos do mês ficam registrados no seu histórico.' : ''));
  return p.join('\n\n');
}

function CondutaExt_comentario_(x) {
  var padrao = CondutaExt_textoPadrao_(x);
  try {
    var l = [];
    l.push('Competência: ' + RelA4_competencia_(x.competencia) + (x.fechado ? ' (fechada)' : ' (apuração parcial, ainda não fechada)') + (x.sombra ? ' — período de teste, valores simulados' : ''));
    l.push('Equipe: índice de conduta ' + Conduta_numBr_(x.equipe.ico) + ', farol ' + String(x.equipe.farol || '').toLowerCase() + ', ' + x.equipe.D + ' pontos de demérito');
    l.push('A pessoa entrou no cálculo: ' + (x.noCalculo ? 'sim' : 'não') + '; recebe bônus coletivo: ' + (x.recebeBonus ? 'sim, ' + RelA4_moeda_(x.valorBonus) : 'não') + '; infração gravíssima própria: ' + (x.ggPropria ? 'sim' : 'não'));
    l.push('Ocorrências da pessoa: ' + (x.ocorrencias.map(function (o) { return o.descricao + ' — ' + o.situacao.toLowerCase() + (o.pontos ? ', ' + o.pontos + ' pontos' : ''); }).join('; ') || 'nenhuma'));
    l.push('Reconhecimentos recebidos: ' + (x.reconhecimentos.map(function (r) { return r.descricao; }).join('; ') || 'nenhum'));
    l.push('Missões: ' + (x.missoes.map(function (m) { return m.destino + ' (' + RelA4_num_(m.km, 0) + ' km) — ' + m.motivo.toLowerCase() + ', ' + RelA4_moeda_(m.valor); }).join('; ') || 'nenhuma'));
    l.push('Incentivo de missão: ' + RelA4_moeda_(x.valorIncentivo) + '; total do mês: ' + RelA4_moeda_(x.total));
    var r = CondutaIA_secoes_('escreva o COMENTARIO do extrato individual de um colaborador, dirigido a ele em segunda pessoa ("você"), em 2 parágrafos curtos: o resultado do mês para ele ' +
      '(o que explica o bônus e o incentivo, sem repetir os valores, que o resumo do extrato já mostra) e, de forma construtiva, o que manter e o que cuidar no próximo mês. Não use o nome da pessoa.', l, ['COMENTARIO']);
    return { texto: r.COMENTARIO, origem: 'IA', aviso: '' };
  } catch (e) {
    return { texto: padrao, origem: 'PADRAO', aviso: RelA4_avisoFalhaIa_(e) };
  }
}

function CondutaExt_html_(x, comentario) {
  var c = [];
  if (!x.fechado) c.push(RelA4_caixa_('Apuração parcial: o mês de ' + RelA4_competencia_(x.competencia) + ' ainda não foi fechado. Os valores podem mudar até o fechamento.', 'aviso'));
  if (x.sombra) c.push(RelA4_caixa_('Período de teste: os valores são simulados e não autorizam pagamento.', 'aviso'));
  var perfil = ({ ADMIN: 'Administrador', DIRETORIA: 'Diretoria', GESTOR: 'Gestor', TECNICO: 'Técnico', METROLOGIA: 'Metrologia', COMERCIAL: 'Comercial', FINANCEIRO: 'Financeiro', RH: 'RH' })[String(x.colaborador.perfil || '').toUpperCase()] || x.colaborador.perfil;
  c.push(RelA4_secao_('Identificação', RelA4_identificacao_([
    ['Colaborador', x.colaborador.nome], ['Perfil', perfil], ['Área', x.colaborador.setor || 'Área não informada'],
    ['Situação do mês', x.fechado ? 'Fechado em ' + RelA4_dataBr_(x.fechadoEm) : 'Em apuração']
  ])));
  var firmes = x.ocorrencias.filter(function (o) { return o.status === 'FIRME'; }).length;
  var pontos = x.ocorrencias.reduce(function (s, o) { return s + o.pontos; }, 0);
  c.push(RelA4_secao_('Resumo do mês', RelA4_kpis_([
    [Conduta_numBr_(x.equipe.ico) + ' · ' + CondutaRel_farolTexto_(x.equipe.farol).toLowerCase(), 'Índice de conduta da equipe', CondutaRel_tipoFarol_(x.equipe.farol)],
    [x.recebeBonus ? RelA4_moeda_(x.valorBonus) : 'Não recebe', 'Bônus coletivo', x.recebeBonus ? 'ok' : 'aviso'],
    [RelA4_moeda_(x.valorIncentivo), 'Incentivo de missão'], [RelA4_moeda_(x.total), x.fechado ? 'Total do mês' : 'Total parcial'],
    [RelA4_num_(firmes, 0), 'Ocorrências firmes', firmes ? 'critico' : 'ok'], [RelA4_num_(pontos, 0), 'Pontos de demérito'],
    [RelA4_num_(x.reconhecimentos.length, 0), 'Reconhecimentos'], [RelA4_num_(x.placar, 0), 'Placar individual']
  ]) + (x.ausenteNoMes ? '<p class="nota">Há ausência registrada no mês: a pessoa não entra no número de pessoas do cálculo coletivo.</p>' : '')));
  c.push(RelA4_secao_('Comentário do mês', RelA4_paragrafos_(comentario)));
  c.push(RelA4_secao_('Ocorrências', RelA4_tabela_([{ t: 'Data' }, { t: 'Código' }, { t: 'Descrição' }, { t: 'Situação' }, { t: 'Pontos', num: true }],
    x.ocorrencias.map(function (o) { return [RelA4_dataBr_(o.data), o.codigo, o.descricao, CondutaExt_situacaoCelula_(o), RelA4_num_(o.pontos, 0)]; }),
    { vazio: 'Nenhuma ocorrência em seu nome neste mês.', legenda: 'Ocorrências do mês em seu nome' }) + CondutaExt_notaDiretoria_(x)));
  c.push(RelA4_secao_('Reconhecimentos', RelA4_tabela_([{ t: 'Data' }, { t: 'Motivo' }, { t: 'Relato' }],
    x.reconhecimentos.map(function (r) { return [RelA4_dataBr_(r.data), r.descricao + (r.grupo ? ' (' + r.grupo + ')' : ''), r.texto || '—']; }), { vazio: 'Nenhum reconhecimento registrado neste mês.', legenda: 'Reconhecimentos recebidos no mês' })));
  c.push(RelA4_secao_('Missões', RelA4_tabela_([{ t: 'Data' }, { t: 'Destino' }, { t: 'Distância', num: true }, { t: 'Aprovação' }, { t: 'Situação' }, { t: 'Valor', num: true }],
    x.missoes.map(function (m) { return [RelA4_dataBr_(m.data), m.destino, RelA4_num_(m.km, 0) + ' km', m.aprovacaoRotulo, String(m.motivo || '').replace(' (aprovação legada)', ''), RelA4_moeda_(m.valor)]; }),
    { vazio: 'Nenhuma missão neste mês.', legenda: 'Participações em missão no mês', total: x.missoes.length > 1 ? ['Total', '', '', '', '', RelA4_moeda_(x.missoes.reduce(function (s, m) { return s + m.valor; }, 0))] : null })));
  if (x.ausencias.length) c.push(RelA4_secao_('Ausências registradas', RelA4_tabela_([{ t: 'Início' }, { t: 'Fim' }, { t: 'Tipo' }], x.ausencias.map(function (a) { return [RelA4_dataBr_(a.inicio), RelA4_dataBr_(a.fim), a.tipo || '—']; }), { legenda: 'Ausências que tocam o mês' })));
  c.push('<p class="nota">Documento individual e reservado: fica disponível ao próprio colaborador e à gestão. Dúvidas sobre ocorrências seguem o caminho de contestação e recurso do programa.</p>');
  return RelA4_documento_({ titulo: 'Programa de conduta — extrato do colaborador', subtitulo: x.colaborador.nome, tituloCurto: 'Extrato — ' + x.colaborador.nome,
    tituloArquivo: 'Extrato do colaborador', sigla: 'CNE', rotuloIdentificacao: 'Competência', identificacao: RelA4_competencia_(x.competencia), corpo: c.join('\n') });
}

/** Fundamentação da última decisão marcada da Diretoria (histórico); sem histórico, a do julgamento. */
function CondutaExt_fundamentacaoDiretoria_(o) {
  if (!SGO_UTILS.safe(o.DECISAO_DIRETORIA)) return '';
  var h = [];
  try { h = JSON.parse(String(o.HISTORICO_JSON || '[]')); } catch (e) { h = []; }
  var marcados = (Array.isArray(h) ? h : []).filter(function (p) { return p && p.marca; });
  return marcados.length ? String(marcados[marcados.length - 1].texto || '') : SGO_UTILS.safe(o.TEXTO_JULGAMENTO);
}

function CondutaExt_situacaoCelula_(o) {
  var m = RelA4_marca_(o.situacao, o.status === 'FIRME' ? 'critico' : ['ANULADA', 'REJEITADA', 'DESCARTADA'].indexOf(o.status) >= 0 ? 'neutra' : 'aviso');
  return o.decisaoDiretoria ? { html: m.html + '<br>' + RelA4_marca_('Decisão da Diretoria', 'neutra').html } : m;
}

/** 19/10/2026: as ocorrências decididas pela Diretoria sendo ela a envolvida, com a fundamentação. */
function CondutaExt_notaDiretoria_(x) {
  var lista = x.ocorrencias.filter(function (o) { return o.decisaoDiretoria; });
  if (!lista.length) return '';
  return '<p class="nota">' + RelA4_esc_(lista.map(function (o) {
    return o.decisaoDiretoria + ' (' + RelA4_dataBr_(o.data) + ', ' + o.codigo + ')' + (o.fundamentacao ? '. Fundamentação: ' + o.fundamentacao : '');
  }).join(' | ')) + '</p>';
}

function Conduta_apiGerarExtratoColaborador(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var alvo = String(payload.colaboradorId || '').trim() || String(sessao.userId);
  // 28/10/2026 (sigilo do envolvido): o extrato mostra as ocorrências da pessoa; o de outra pessoa fica com a Diretoria e o Gestor de Qualidade.
  if (alvo !== String(sessao.userId) && !(isAdminSession(sessionId) && Conduta_veIdentidade_(sessao))) {
    throw new Error('Você pode gerar só o seu próprio extrato. Por sigilo do colaborador, o extrato de outra pessoa (que mostra as ocorrências dela) fica com a Diretoria e o Gestor de Qualidade.');
  }
  var competencia = Conduta_validarCompetencia_(payload.competencia);
  if (competencia > Conduta_competenciaDe_(Conduta_hojeISO_())) throw new Error('A competência escolhida ainda não começou. Escolha o mês atual ou um mês anterior.');
  var x = CondutaExt_contexto_(alvo, competencia);
  var com = CondutaExt_comentario_(x);
  var g = RelA4_salvar_(function () { return RelA4_subpasta_(CondutaRel_pastaRelatorios_('Extratos')(), x.colaborador.nome); },
    x.colaborador.nome + ' ' + competencia, CondutaExt_html_(x, com.texto), { compartilhar: false });
  SGO_DATA.log('CONDUTA_EXTRATO', sessao.usuario, 'Extrato de ' + x.colaborador.nome + ' (' + competencia + ') gerado', 'CONDUTA');
  return { ok: true, html: RelA4_injetarAvisos_(g.html, RelA4_avisosPadrao_(g, [com])), aviso: [g.aviso, com.aviso].filter(Boolean).join(' '), link: g.pdfUrl };
}
