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
      pontos: st === 'FIRME' ? (Number(o.PESO_APLICADO) || 0) : 0, gravissima: st === 'FIRME' && SGO_UTILS.safeUpper(o.NIVEL_APLICADO) === 'GG' };
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
    colaborador: { id: u.ID, nome: u.NOME || u.USUARIO, perfil: u.PERFIL, setor: u.SETOR || u.DEPARTAMENTO || '' },
    noCalculo: !!linha, ausenteNoMes: Conduta_colaboradorAusenteNaCompetencia_(colaboradorId, competencia),
    equipe: resumo, recebeBonus: !!(linha && linha.recebeBonus), ggPropria: !!(linha && linha.ggPropria),
    valorBonus: valorBonus, valorIncentivo: valorIncentivo, total: valorBonus + valorIncentivo,
    placar: linha ? Number(linha.placar) || 0 : Conduta_placarIndividual_(competencia, colaboradorId),
    ocorrencias: ocorrencias, reconhecimentos: reconhecimentos, missoes: missoes, ausencias: ausencias
  };
}

function CondutaExt_textoPadrao_(x) {
  var firmes = x.ocorrencias.filter(function (o) { return o.status === 'FIRME'; });
  var pontos = firmes.reduce(function (s, o) { return s + o.pontos; }, 0);
  var emAndamento = x.ocorrencias.filter(function (o) { return ['REGISTRADA', 'HOMOLOGADA', 'CONTESTADA', 'EM_RECURSO'].indexOf(o.status) >= 0; }).length;
  var missOk = x.missoes.filter(function (m) { return m.qualifica; }).length, missPend = x.missoes.filter(function (m) { return m.aprovacao === 'PENDENTE'; }).length;
  var p = [];
  p.push('Em ' + RelA4_competencia_(x.competencia) + ' (' + (x.fechado ? 'mês fechado' : 'apuração parcial, o mês ainda não foi fechado') + '), a equipe está com índice de conduta ' + Conduta_numBr_(x.equipe.ico) + ' e farol ' + CondutaRel_farolTexto_(x.equipe.farol).toLowerCase() + '. ' +
    (x.recebeBonus ? 'Pela apuração, você ' + (x.fechado ? 'recebe' : 'receberia') + ' o bônus coletivo de ' + RelA4_moeda_(x.valorBonus) + (x.sombra ? ' (valor simulado, período de teste)' : '') + '.'
      : x.ggPropria ? 'Uma infração gravíssima firme registrada para você no mês zera o bônus coletivo e o incentivo de missão.'
        : !x.noCalculo ? 'Você não entrou no cálculo deste mês (ausência registrada ou cadastro inativo).'
          : 'O bônus coletivo não é devido neste mês porque o farol da equipe não está verde.'));
  p.push('No mês há ' + RelA4_plural_(firmes.length, 'ocorrência firme', 'ocorrências firmes') + ' em seu nome (' + RelA4_plural_(pontos, 'ponto', 'pontos') + ' de demérito)' + (emAndamento ? ' e ' + RelA4_plural_(emAndamento, 'ocorrência ainda em andamento', 'ocorrências ainda em andamento') : '') +
    ', ' + RelA4_plural_(x.reconhecimentos.length, 'reconhecimento', 'reconhecimentos') + ' e ' + RelA4_plural_(x.missoes.length, 'participação em missão', 'participações em missão') +
    (x.missoes.length ? ' (' + RelA4_plural_(missOk, 'elegível', 'elegíveis') + (missPend ? ', ' + RelA4_plural_(missPend, 'aguardando aprovação da gestão', 'aguardando aprovação da gestão') : '') + ')' : '') +
    '. Incentivo de missão ' + (x.fechado ? 'do mês' : 'apurado até agora') + ': ' + RelA4_moeda_(x.valorIncentivo) + '.');
  if (emAndamento) p.push('Ocorrências em andamento só contam quando ficarem firmes; acompanhe os prazos de defesa em Programa de conduta > Ocorrências.');
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
      '(bônus e incentivo, citando os valores) e, de forma construtiva, o que manter e o que cuidar no próximo mês. Não use o nome da pessoa.', l, ['COMENTARIO']);
    return { texto: r.COMENTARIO, origem: 'IA', aviso: '' };
  } catch (e) {
    return { texto: padrao, origem: 'PADRAO', aviso: RelA4_avisoFalhaIa_(e) };
  }
}

function CondutaExt_html_(x, comentario) {
  var c = [];
  if (!x.fechado) c.push('<div class="caixa aviso">Apuração parcial: o mês de ' + RelA4_esc_(RelA4_competencia_(x.competencia)) + ' ainda não foi fechado. Os valores podem mudar até o fechamento.</div>');
  if (x.sombra) c.push('<div class="caixa aviso">Período de teste: os valores são simulados e não autorizam pagamento.</div>');
  c.push(RelA4_secao_('Identificação', RelA4_identificacao_([
    ['Colaborador', x.colaborador.nome], ['Perfil', ({ ADMIN: 'Administrador', DIRETORIA: 'Diretoria', GESTOR: 'Gestor', TECNICO: 'Técnico', METROLOGIA: 'Metrologia', COMERCIAL: 'Comercial', FINANCEIRO: 'Financeiro' })[String(x.colaborador.perfil || '').toUpperCase()] || x.colaborador.perfil], ['Setor', x.colaborador.setor || '—'], ['Competência', RelA4_competencia_(x.competencia)],
    ['Situação do mês', x.fechado ? 'Fechado em ' + RelA4_dataBr_(x.fechadoEm) : 'Em apuração'],
    ['Resultado da equipe', 'Índice de conduta ' + Conduta_numBr_(x.equipe.ico) + ', farol ' + CondutaRel_farolTexto_(x.equipe.farol).toLowerCase()]
  ])));
  c.push(RelA4_secao_('Resumo do mês', RelA4_kpis_([
    [x.recebeBonus ? 'Sim' : 'Não', 'Bônus coletivo'], [RelA4_moeda_(x.valorBonus), 'Valor do bônus'], [RelA4_moeda_(x.valorIncentivo), 'Incentivo de missão'], [RelA4_moeda_(x.total), x.fechado ? 'Total do mês' : 'Total parcial'],
    [RelA4_num_(x.ocorrencias.filter(function (o) { return o.status === 'FIRME'; }).length, 0), 'Ocorrências firmes'], [RelA4_num_(x.ocorrencias.reduce(function (s, o) { return s + o.pontos; }, 0), 0), 'Pontos de demérito'],
    [RelA4_num_(x.reconhecimentos.length, 0), 'Reconhecimentos'], [RelA4_num_(x.placar, 0), 'Placar individual']
  ]) + (x.ausenteNoMes ? '<p class="nota">Há ausência registrada no mês: a pessoa não entra no número de pessoas do cálculo coletivo.</p>' : '')));
  c.push(RelA4_secao_('Comentário do mês', RelA4_paragrafos_(comentario)));
  c.push(RelA4_secao_('Ocorrências', RelA4_tabela_([{ t: 'Data' }, { t: 'Código' }, { t: 'Descrição' }, { t: 'Situação' }, { t: 'Pontos', num: true }],
    x.ocorrencias.map(function (o) { return [RelA4_dataBr_(o.data), o.codigo, o.descricao, RelA4_marca_(o.situacao, o.status === 'FIRME' ? 'critico' : ['ANULADA', 'REJEITADA', 'DESCARTADA'].indexOf(o.status) >= 0 ? 'neutra' : 'aviso'), RelA4_num_(o.pontos, 0)]; }),
    { vazio: 'Nenhuma ocorrência em seu nome neste mês.' })));
  c.push(RelA4_secao_('Reconhecimentos', RelA4_tabela_([{ t: 'Data' }, { t: 'Motivo' }, { t: 'Relato' }],
    x.reconhecimentos.map(function (r) { return [RelA4_dataBr_(r.data), r.descricao + (r.grupo ? ' (' + r.grupo + ')' : ''), r.texto || '—']; }), { vazio: 'Nenhum reconhecimento registrado neste mês.' })));
  c.push(RelA4_secao_('Missões', RelA4_tabela_([{ t: 'Data' }, { t: 'Destino' }, { t: 'Distância', num: true }, { t: 'Aprovação' }, { t: 'Situação' }, { t: 'Valor', num: true }],
    x.missoes.map(function (m) { return [RelA4_dataBr_(m.data), m.destino, RelA4_num_(m.km, 0) + ' km', m.aprovacaoRotulo, m.motivo, RelA4_moeda_(m.valor)]; }),
    { vazio: 'Nenhuma missão neste mês.', total: x.missoes.length ? ['Total', '', '', '', '', RelA4_moeda_(x.missoes.reduce(function (s, m) { return s + m.valor; }, 0))] : null })));
  if (x.ausencias.length) c.push(RelA4_secao_('Ausências registradas', RelA4_tabela_([{ t: 'Início' }, { t: 'Fim' }, { t: 'Tipo' }], x.ausencias.map(function (a) { return [RelA4_dataBr_(a.inicio), RelA4_dataBr_(a.fim), a.tipo || '—']; }))));
  c.push('<p class="nota">Documento individual e reservado: fica disponível ao próprio colaborador e à gestão. Dúvidas sobre ocorrências seguem o caminho de contestação e recurso do programa.</p>');
  return RelA4_documento_({ titulo: 'Programa de conduta — extrato do colaborador', subtitulo: x.colaborador.nome, identificacao: RelA4_competencia_(x.competencia), corpo: c.join('\n'), cor: '#0b4ea2' });
}

function Conduta_apiGerarExtratoColaborador(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var alvo = String(payload.colaboradorId || '').trim() || String(sessao.userId);
  if (alvo !== String(sessao.userId) && !isAdminSession(sessionId)) {
    throw new Error('Você pode gerar só o seu próprio extrato. O extrato de outra pessoa fica com a gestão.');
  }
  var competencia = Conduta_validarCompetencia_(payload.competencia);
  if (competencia > Conduta_competenciaDe_(Conduta_hojeISO_())) throw new Error('A competência escolhida ainda não começou. Escolha o mês atual ou um mês anterior.');
  var x = CondutaExt_contexto_(alvo, competencia);
  var com = CondutaExt_comentario_(x);
  var html = CondutaExt_html_(x, com.texto);
  var g = RelA4_salvar_(function () { return RelA4_subpasta_(CondutaRel_pastaRelatorios_('Extratos')(), x.colaborador.nome); },
    'Extrato ' + x.colaborador.nome + ' ' + competencia + ' emitido ' + Utilities.formatDate(new Date(), RELA4_TZ, 'yyyy-MM-dd HHmm'), html, { compartilhar: false });
  SGO_DATA.log('CONDUTA_EXTRATO', sessao.usuario, 'Extrato de ' + x.colaborador.nome + ' (' + competencia + ') gerado', 'CONDUTA');
  return { ok: true, html: RelA4_injetarAvisos_(html, RelA4_avisosPadrao_(g, [com])), aviso: [g.aviso, com.aviso].filter(Boolean).join(' '), link: g.pdfUrl };
}
