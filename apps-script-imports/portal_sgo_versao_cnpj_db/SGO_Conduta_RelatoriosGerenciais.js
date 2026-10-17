/****************************************************
 * PROGRAMA DE CONDUTA — RELATÓRIO SEMANAL (equipe) E PRESTAÇÃO DE
 * CONTAS DAS MISSÕES (gestão e Financeiro)
 *
 * 17/10/2026: os dois passaram para a moldura A4 comum
 * (SGO_Documentos_RelatorioA4.js) e são gravados em HTML + PDF na pasta
 * do programa. O semanal ganhou a análise pela IA (raciocínio ligado);
 * sem chave ou com falha sai o texto padrão de sempre. Os textos usados
 * ficam no contexto gravado, então reabrir o relatório mostra o mesmo
 * texto da geração. Missões mostram a aprovação da gestão.
 ****************************************************/
function CondutaRG_data_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone() || 'America/Sao_Paulo', 'yyyy-MM-dd'); }
function CondutaRG_br_(s) { var p = Conduta_soData_(s).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(s || ''); }
function CondutaRG_dinheiro_(v) { return RelA4_moeda_(v); }

function CondutaRG_periodoSemanal_(fim) {
  var value = fim ? Conduta_soData_(fim) : Conduta_hojeISO_();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Informe a data final da semana.');
  var f = Conduta_parseDataISO_(value);
  if (!f || isNaN(f.getTime()) || CondutaRG_data_(f) !== value) throw new Error('A data final da semana é inválida. Escolha a data no calendário.');
  if (value > Conduta_hojeISO_()) throw new Error('A semana não pode terminar no futuro. Escolha hoje ou uma data anterior.');
  var i = new Date(f); i.setDate(f.getDate() - 6);
  return { inicio: CondutaRG_data_(i), fim: value };
}

function CondutaRG_catalogos_() {
  var ct = {}, ep = {};
  SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA_TIPO).forEach(function (x) { ct[x.CODIGO] = x; });
  SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO_TIPO).forEach(function (x) { ep[x.CODIGO] = x; });
  return { oc: ct, pos: ep };
}

function CondutaRG_contextoSemanal_(periodo) {
  var cat = CondutaRG_catalogos_(), todasOcs = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA);
  var ocs = todasOcs.filter(function (x) { var d = Conduta_soData_(x.DATA_FATO); return d >= periodo.inicio && d <= periodo.fim && ['REJEITADA', 'DESCARTADA', 'ANULADA'].indexOf(SGO_UTILS.safeUpper(x.STATUS)) < 0; });
  var pos = SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO).filter(function (x) { var d = Conduta_soData_(x.DATA_FATO); return d >= periodo.inicio && d <= periodo.fim; });
  var codigos = {}, elogios = {};
  ocs.forEach(function (o) {
    var t = cat.oc[o.TIPO_CODIGO] || {}, k = o.TIPO_CODIGO;
    codigos[k] = codigos[k] || { codigo: k, descricao: t.DESCRICAO || '', grupo: t.GRUPO || '', quantidade: 0, pontos: 0 };
    codigos[k].quantidade++;
    if (SGO_UTILS.safeUpper(o.STATUS) === 'FIRME') codigos[k].pontos += Number(o.PESO_APLICADO) || 0;
  });
  pos.forEach(function (e) {
    var t = cat.pos[e.TIPO_CODIGO] || {}, k = e.TIPO_CODIGO;
    elogios[k] = elogios[k] || { codigo: k, descricao: t.DESCRICAO || '', quantidade: 0, relatos: [] };
    elogios[k].quantidade++;
    if (e.TEXTO_RECONHECIMENTO) elogios[k].relatos.push(e.TEXTO_RECONHECIMENTO);
  });
  var comp = periodo.fim.slice(0, 7), ap = Conduta_apurarCompetencia_(comp), param = Conduta_obterParametros_();
  var compIni = periodo.inicio.slice(0, 7), apAnt = compIni !== comp ? Conduta_apurarCompetencia_(compIni) : null;
  var firmadas = todasOcs.filter(function (o) { var f = Conduta_soData_(o.FIRME_EM); return SGO_UTILS.safeUpper(o.STATUS) === 'FIRME' && f >= periodo.inicio && f <= periodo.fim; });
  var k = Number(param.K_SENSIBILIDADE) || 5.0, verde = Number(param.ICO_VERDE_MIN) || 85.0;
  return {
    tipo: 'SEMANAL', inicio: periodo.inicio, fim: periodo.fim, competencia: comp, ico: ap.ico, farol: ap.farol, D: ap.D, n: ap.n, temGG: ap.temGG, sombra: ap.sombra,
    limiteVerdeD: Math.round(((100 - verde) / k) * (ap.n || 1)),
    valorBonus: Number(param.VALOR_BONUS_COLETIVO) || 300,
    ocorrenciasPendentes: ocs.filter(function (o) { return ['REGISTRADA', 'HOMOLOGADA', 'CONTESTADA', 'EM_RECURSO'].indexOf(SGO_UTILS.safeUpper(o.STATUS)) >= 0; }).length,
    ocorrencias: ocs.length, ocorrenciasFirmes: ocs.filter(function (o) { return SGO_UTILS.safeUpper(o.STATUS) === 'FIRME'; }).length,
    elogios: pos.length,
    codigos: Object.keys(codigos).map(function (x) { return codigos[x]; }).sort(function (a, b) { return b.pontos - a.pontos || b.quantidade - a.quantidade; }),
    reconhecimentos: Object.keys(elogios).map(function (x) { return elogios[x]; }),
    beneficioPreservado: ap.farol === 'VERDE' && !ap.temGG,
    missoesPendentes: Conduta_missoesPendentesCompetencia_(comp).length,
    anterior: apAnt ? { competencia: compIni, nome: Conduta_nomeCompetencia_(compIni), D: apAnt.D, ico: apAnt.ico, farol: apAnt.farol } : null,
    firmadas: { qtd: firmadas.length, pontos: firmadas.reduce(function (s, o) { return s + (Number(o.PESO_APLICADO) || 0); }, 0) }
  };
}

/** Texto padrão (sem IA). Também usado para relatórios antigos sem texto gravado. */
function CondutaRG_ia_(tipo, c) {
  if (tipo === 'MISSOES') {
    return {
      analise: (c.sombra ? 'Período de teste ativo: os valores são simulados e não autorizam pagamento. ' : '') + 'Em ' + CondutaRG_periodoLabel_(c.competencia).toLowerCase() + ' foram lançadas ' + RelA4_plural_(c.qtdMissoes, 'missão', 'missões') +
        ', com ' + RelA4_plural_(c.qtdLancamentos, 'participação', 'participações') + ', das quais ' + RelA4_plural_(c.qtdElegiveis, 'é elegível', 'são elegíveis') + ' ao incentivo. ' +
        (c.qtdPendentes ? RelA4_plural_(c.qtdPendentes, 'participação aguarda', 'participações aguardam') + ' a aprovação da gestão. ' : '') +
        'Total proposto: ' + RelA4_moeda_(c.total) + '. Estes valores são uma proposta para conferência e não comprovam aprovação nem pagamento.',
      acoes: '- Conferir datas, destinos, distâncias e executantes.\n- Verificar ocorrências firmes vinculadas a cada missão.\n- Submeter os valores à aprovação da Diretoria e registrar os pagamentos pelo Financeiro.',
      motivacao: 'Mantenha os registros completos para permitir a conferência.'
    };
  }
  var pend = c.ocorrenciasPendentes, naoFirmes = Math.max(0, c.ocorrencias - c.ocorrenciasFirmes);
  return {
    analise: 'No período de ' + CondutaRG_br_(c.inicio) + ' a ' + CondutaRG_br_(c.fim) + ' foram registradas ' + RelA4_plural_(c.ocorrencias, 'ocorrência', 'ocorrências') + ', sendo ' + RelA4_plural_(c.ocorrenciasFirmes, 'firme', 'firmes') + '. ' +
      (pend === undefined ? naoFirmes + ' não estavam firmes na geração. ' : (pend ? RelA4_plural_(pend, 'ocorrência ainda está', 'ocorrências ainda estão') + ' em registro ou em prazo de defesa. ' : '')) +
      'Somente ocorrências firmes entram nos pontos de demérito. O índice de conduta ' + Conduta_numBr_(c.ico) + ' e o farol ' + String(c.farol || '').toLowerCase() + ' correspondem à apuração parcial de ' + CondutaRG_periodoLabel_(c.competencia).toLowerCase() +
      ' na data da geração, e não apenas aos sete dias deste relatório. A ausência de pontos firmes não comprova ausência de desvios nem a resolução das pendências.',
    acoes: '- Acompanhar os prazos das ocorrências em aberto.\n- Reforçar os cuidados ligados aos motivos registrados na tabela.\n- Registrar melhorias e reconhecimentos com evidências.',
    motivacao: c.sombra ? 'Período de teste ativo: os valores apresentados são referências simuladas e não autorizam pagamento.' : 'O resultado é uma apuração parcial. A definição do benefício depende do fechamento do mês e das regras do programa.'
  };
}

/** Semanal com IA: { analise, acoes, motivacao, origem, aviso }. */
function CondutaRG_textosSemanal_(c) {
  var padrao = CondutaRG_ia_('SEMANAL', c);
  try {
    var l = [];
    l.push('Semana: ' + CondutaRG_br_(c.inicio) + ' a ' + CondutaRG_br_(c.fim) + (c.sombra ? ' (período de teste: não paga)' : ''));
    l.push('Apuração parcial do mês ' + Conduta_nomeCompetencia_(c.competencia) + ': índice de conduta ' + Conduta_numBr_(c.ico) + ', farol ' + String(c.farol || '').toLowerCase() + ', ' + c.D + ' pontos de demérito, limite do verde ' + c.limiteVerdeD + ' pontos');
    l.push('Infração gravíssima firme no mês: ' + (c.temGG ? 'sim' : 'não'));
    l.push('Ocorrências da semana: ' + c.ocorrencias + ' (firmes ' + c.ocorrenciasFirmes + ', em registro ou defesa ' + c.ocorrenciasPendentes + ')');
    l.push('Ocorrências que ficaram firmes nesta semana: ' + c.firmadas.qtd + ' (' + c.firmadas.pontos + ' pontos)');
    l.push('Motivos: ' + ((c.codigos || []).map(function (x) { return x.descricao + ' (' + x.quantidade + ', ' + x.pontos + ' pontos firmes)'; }).join('; ') || 'nenhum'));
    l.push('Reconhecimentos: ' + c.elogios + (c.reconhecimentos.length ? ' — ' + c.reconhecimentos.map(function (x) { return x.descricao + ' (' + x.quantidade + ')'; }).join('; ') : ''));
    if (c.anterior) l.push('Mês anterior (' + c.anterior.nome + '): índice ' + Conduta_numBr_(c.anterior.ico) + ', farol ' + String(c.anterior.farol || '').toLowerCase());
    if (c.missoesPendentes) l.push('Missões aguardando aprovação da gestão no mês: ' + c.missoesPendentes);
    var r = CondutaIA_secoes_('escreva três seções do relatório semanal lido por toda a equipe. ANALISE (2 parágrafos): o que aconteceu na semana e o que isso significa para o farol do mês, ' +
      'deixando claro que o índice é a apuração parcial do mês. ACOES: de 3 a 4 itens de plano para a próxima semana, cada um numa linha começando com hífen. MOTIVACAO (1 ou 2 frases) à equipe, sóbria e sem exagero.',
      l, ['ANALISE', 'ACOES', 'MOTIVACAO']);
    return { analise: r.ANALISE, acoes: r.ACOES, motivacao: r.MOTIVACAO, origem: 'IA', aviso: '' };
  } catch (e) {
    return { analise: padrao.analise, acoes: padrao.acoes, motivacao: padrao.motivacao, origem: 'PADRAO', aviso: RelA4_avisoFalhaIa_(e) };
  }
}

function CondutaRG_farolMarca_(farol) {
  return RelA4_marca_(CondutaRel_farolTexto_(farol), farol === 'VERDE' ? 'ok' : farol === 'AMARELO' ? 'aviso' : 'critico');
}

function CondutaRG_htmlSemanal_(c, t) {
  var b = [];
  b.push(RelA4_kpis_([[Conduta_numBr_(c.ico), 'Índice de conduta (parcial do mês)'], [CondutaRel_farolTexto_(c.farol), 'Farol do mês na geração'], [RelA4_num_(c.D, 0), 'Pontos de demérito no mês'], [RelA4_num_(c.elogios, 0), 'Reconhecimentos na semana']]));
  if (c.anterior) b.push('<div class="caixa">Esta semana começa em ' + RelA4_esc_(c.anterior.nome) + ': o mês anterior está com ' + RelA4_plural_(c.anterior.D, 'ponto', 'pontos') + ' de demérito, índice ' + RelA4_esc_(Conduta_numBr_(c.anterior.ico)) + ' e farol ' + RelA4_esc_(CondutaRel_farolTexto_(c.anterior.farol).toLowerCase()) + '. Os números acima são de ' + RelA4_esc_(Conduta_nomeCompetencia_(c.competencia)) + '.</div>');
  if (c.firmadas && c.firmadas.qtd) b.push('<div class="caixa">' + RelA4_plural_(c.firmadas.qtd, 'ocorrência ficou firme', 'ocorrências ficaram firmes') + ' nesta semana (' + RelA4_plural_(c.firmadas.pontos, 'ponto', 'pontos') + ' de demérito). Elas contam no mês da data do fato.</div>');
  if (c.ocorrenciasPendentes) b.push('<div class="caixa aviso">' + RelA4_plural_(c.ocorrenciasPendentes, 'ocorrência desta semana ainda está', 'ocorrências desta semana ainda estão') + ' em registro ou em prazo de defesa. Elas só entram nos pontos quando ficarem firmes, e então contam no mês do fato.</div>');
  b.push(RelA4_secao_('Interpretação da semana', RelA4_paragrafos_(t.analise) + '<div class="caixa ok">' + RelA4_paragrafos_(t.motivacao) + '</div>'));
  b.push(RelA4_secao_('Situação do bônus coletivo', '<p>Farol ' + RelA4_esc_(CondutaRel_farolTexto_(c.farol).toLowerCase()) + ', índice ' + RelA4_esc_(Conduta_numBr_(c.ico)) + ' e ' + RelA4_plural_(c.D, 'ponto', 'pontos') + ' de demérito para um limite de ' + RelA4_plural_(c.limiteVerdeD, 'ponto', 'pontos') + ' no verde. ' +
    (c.sombra ? 'Período de teste: este relatório não autoriza pagamento.' : c.temGG ? 'Há infração gravíssima firme, condição que cancela o bônus coletivo do mês.' : (c.beneficioPreservado ? 'A apuração parcial atende à regra do bônus coletivo.' : 'A apuração parcial ainda não atende à faixa verde exigida.')) +
    ' O valor de referência do bônus coletivo é ' + RelA4_esc_(RelA4_moeda_(c.valorBonus)) + ' por pessoa.</p>'));
  b.push(RelA4_secao_('Ocorrências e pontos', RelA4_tabela_([{ t: 'Código' }, { t: 'Descrição' }, { t: 'Quantidade', num: true }, { t: 'Pontos firmes', num: true }],
    (c.codigos || []).map(function (x) { return [x.codigo, x.descricao, RelA4_num_(x.quantidade, 0), RelA4_num_(x.pontos, 0)]; }), { vazio: 'Nenhuma ocorrência no período.' }) +
    '<p class="nota">Privacidade: cobranças individuais e suas fotos ficam disponíveis só ao responsável, ao autor e à gestão. O relatório coletivo apresenta causas agregadas, sem expor pessoas.</p>'));
  b.push(RelA4_secao_('Reconhecimentos e melhorias observadas', RelA4_tabela_([{ t: 'Motivo' }, { t: 'Quantidade', num: true }, { t: 'Relatos' }],
    (c.reconhecimentos || []).map(function (x) { return [x.descricao || x.codigo, RelA4_num_(x.quantidade, 0), (x.relatos || []).join(' | ')]; }), { vazio: 'Nenhum reconhecimento registrado no período.' })));
  b.push(RelA4_secao_('Plano para a próxima semana', RelA4_paragrafos_(t.acoes)));
  return RelA4_documento_({ titulo: 'Programa de conduta — relatório semanal', subtitulo: 'Resultado parcial do mês, motivos, reconhecimentos e plano', identificacao: CondutaRG_br_(c.inicio) + ' a ' + CondutaRG_br_(c.fim), corpo: b.join('\n'), cor: '#0b4ea2' });
}

function CondutaRG_contextoMissoes_(competencia) {
  var users = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { users[u.ID] = u.NOME; });
  var bloqueios = {}, ggPropria = {};
  SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).forEach(function (o) {
    if (o.MISSAO_ID && SGO_UTILS.safeUpper(o.STATUS) === 'FIRME') bloqueios[String(o.MISSAO_ID) + '|' + String(o.COLABORADOR_ID)] = true;
    if (SGO_UTILS.safeUpper(o.STATUS) === 'FIRME' && SGO_UTILS.safeUpper(o.NIVEL_APLICADO) === 'GG' && Conduta_soComp_(o.COMPETENCIA || o.DATA_FATO) === competencia) ggPropria[String(o.COLABORADOR_ID)] = true;
  });
  var parametros = Conduta_obterParametros_(), sombraAte = Conduta_soComp_(parametros.MODO_SOMBRA_ATE), sombra = !!sombraAte && competencia <= sombraAte;
  var valor = Number(parametros.VALOR_INCENTIVO_MISSAO) || 300;
  var mis = Conduta_ativos_(CONDUTA_SHEETS.MISSAO).filter(function (m) { return Conduta_soComp_(m.COMPETENCIA) === competencia; });
  var linhas = [], total = 0;
  mis.forEach(function (m) {
    var situacao = Conduta_situacaoAprovacao_(m);
    [m.EXECUTANTE_1_ID, m.EXECUTANTE_2_ID].filter(function (id, i, a) { return id && a.map(String).indexOf(String(id)) === i; }).forEach(function (id) {
      var distanciaOk = SGO_UTILS.safeUpper(m.QUALIFICA) === 'TRUE' || m.QUALIFICA === true;
      var bloqueado = !!bloqueios[String(m.ID) + '|' + String(id)], gg = !!ggPropria[String(id)], aprovada = Conduta_missaoAprovada_(m);
      var elegivel = distanciaOk && aprovada && !bloqueado && !gg, v = elegivel ? valor : 0;
      total += v;
      linhas.push({
        missaoId: m.ID, data: Conduta_soData_(m.DATA), destino: m.DESTINO, km: Number(m.KM_TRECHO) || 0, colaboradorId: id, nome: users[id] || id, qualifica: elegivel, valor: v,
        aprovacao: situacao, aprovacaoRotulo: Conduta_rotuloAprovacao_(situacao), aprovadoPor: m.APROVACAO_POR_NOME || '',
        motivo: elegivel ? (situacao === 'LEGADA' ? 'Elegível (aprovação legada)' : 'Elegível para repasse')
          : !distanciaOk ? 'Não atingiu a distância mínima'
            : situacao === 'PENDENTE' ? 'Aguardando aprovação da gestão'
              : situacao === 'RECUSADA' ? 'Recusada pela gestão' + (m.APROVACAO_MOTIVO ? ': ' + m.APROVACAO_MOTIVO : '')
                : gg ? 'Infração gravíssima própria no mês (zera o incentivo)' : 'Ocorrência firme vinculada à missão'
      });
    });
  });
  return {
    tipo: 'MISSOES', competencia: competencia, sombra: sombra, valorUnitario: valor, qtdMissoes: mis.length, qtdLancamentos: linhas.length,
    qtdElegiveis: linhas.filter(function (x) { return x.qualifica; }).length, qtdPendentes: linhas.filter(function (x) { return x.aprovacao === 'PENDENTE'; }).length,
    total: total, linhas: linhas
  };
}

function CondutaRG_htmlMissoes_(c, t) {
  var b = [];
  b.push(RelA4_kpis_([[RelA4_num_(c.qtdMissoes, 0), 'Missões'], [RelA4_num_(c.qtdLancamentos, 0), 'Participações'], [RelA4_num_(c.qtdElegiveis, 0), 'Elegíveis'], [RelA4_moeda_(c.total), c.sombra ? 'Total simulado' : 'Total proposto']]));
  if (c.qtdPendentes) b.push('<div class="caixa aviso">' + RelA4_plural_(c.qtdPendentes, 'participação aguarda', 'participações aguardam') + ' a aprovação da gestão e ainda não entram no total. O mês só fecha depois da decisão (Programa de conduta > Missões).</div>');
  b.push(RelA4_secao_('Análise das missões', RelA4_paragrafos_(t.analise)));
  b.push(RelA4_secao_('Memória de cálculo para o Financeiro', '<p>Valor por missão elegível e por executante: ' + RelA4_esc_(RelA4_moeda_(c.valorUnitario)) + '. Quando há dois executantes, o valor não é dividido. Só entram missões aprovadas pela gestão (ou lançadas antes dessa regra, com aprovação legada).</p>' +
    RelA4_tabela_([{ t: 'Data' }, { t: 'Destino' }, { t: 'Distância', num: true }, { t: 'Executante' }, { t: 'Aprovação' }, { t: 'Situação' }, { t: 'Valor', num: true }],
      c.linhas.map(function (x) {
        return [CondutaRG_br_(x.data), x.destino, RelA4_num_(x.km, (x.km % 1) ? 1 : 0) + ' km', x.nome,
          RelA4_marca_(x.aprovacaoRotulo || 'Aprovação legada', x.aprovacao === 'APROVADA' || x.aprovacao === 'LEGADA' || !x.aprovacao ? 'ok' : x.aprovacao === 'PENDENTE' ? 'aviso' : x.aprovacao === 'RECUSADA' ? 'critico' : 'neutra'),
          x.motivo, RelA4_moeda_(x.valor)];
      }), { vazio: 'Nenhuma missão registrada nesta competência.', total: ['Total', '', '', '', '', '', RelA4_moeda_(c.total)] })));
  b.push(RelA4_secao_('Conferências antes do pagamento', RelA4_paragrafos_(t.acoes) +
    '<ol><li>Confirmar data, destino, cliente e executantes.</li><li>Confirmar distância e regra mínima vigente.</li><li>Verificar ocorrências firmes vinculadas à missão.</li><li>Conferir duplicidades e competência financeira.</li><li>Diretoria aprova; Financeiro registra data e comprovante do pagamento.</li></ol>'));
  b.push('<div class="assinaturas"><div class="linha">Aprovação da Diretoria / data</div><div class="linha">Conferência do Financeiro / data</div></div>');
  return RelA4_documento_({ titulo: 'Programa de conduta — incentivo de missões', subtitulo: 'Prestação de contas por missão e executante', identificacao: CondutaRG_periodoLabel_(c.competencia), corpo: b.join('\n'), cor: '#0b4ea2' });
}

// A chave do relatório SEMANAL é um INTERVALO ('2026-09-06_2026-09-12'), não
// uma competência. Normalizar com Conduta_soComp_ encurtaria para o mês e faria
// toda semana de setembro colidir com a anterior. Só normaliza quando os dois
// lados são competência de verdade ('YYYY-MM').
function CondutaRG_mesmaChave_(a, b) {
  var sa = String(a || ''), sb = String(b || '');
  if (sa === sb) return true;
  if (sa.indexOf('_') >= 0 || sb.indexOf('_') >= 0) return false;
  return Conduta_soComp_(sa) === Conduta_soComp_(sb);
}

function CondutaRG_salvar_(tipo, chave, ctx, html) {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var todos = SGO_DATA.getAll(CONDUTA_SHEETS.RELATORIO);
    var ex = todos.filter(function (r) { return r.TIPO === tipo && CondutaRG_mesmaChave_(r.COMPETENCIA, chave); })
      .sort(function (a, b) { return String(b.CRIADO_EM || b.GERADO_EM).localeCompare(String(a.CRIADO_EM || a.GERADO_EM)); })[0];
    ctx.apresentacaoVersao = 3;
    var d = { TIPO: tipo, COMPETENCIA: chave, PERIODO_INICIO: ctx.inicio || '', PERIODO_FIM: ctx.fim || '', VISIBILIDADE: tipo === 'SEMANAL' ? 'EQUIPE' : 'GESTAO_FINANCEIRO', HTML: html,
      CONTEXTO_JSON: JSON.stringify(ctx), GERADO_EM: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss") };
    if (ex) SGO_DATA.update(CONDUTA_SHEETS.RELATORIO, ex.ID, d); else SGO_DATA.insert(CONDUTA_SHEETS.RELATORIO, d);
  } finally { lock.releaseLock(); }
}

/** Gera, grava (qual_relatorio + HTML/PDF na pasta) e devolve o HTML com os avisos de tela. */
function CondutaRG_gerarSemanal_(fim) {
  var per = CondutaRG_periodoSemanal_(fim), c = CondutaRG_contextoSemanal_(per), t = CondutaRG_textosSemanal_(c);
  c.textos = { analise: t.analise, acoes: t.acoes, motivacao: t.motivacao, origem: t.origem };
  var h = CondutaRG_htmlSemanal_(c, t);
  CondutaRG_salvar_('SEMANAL', per.inicio + '_' + per.fim, c, h);
  var g = RelA4_salvar_(CondutaRel_pastaRelatorios_('Relatórios semanais'), 'Programa de conduta - semana ' + per.inicio + ' a ' + per.fim + ' emitido ' + Utilities.formatDate(new Date(), RELA4_TZ, 'yyyy-MM-dd HHmm'), h);
  return { html: RelA4_injetarAvisos_(h, RelA4_avisosPadrao_(g, [t])), aviso: [g.aviso, t.aviso].filter(Boolean).join(' '), link: g.pdfUrl };
}

function Conduta_apiGerarRelatorioSemanal(sessionId, p) {
  Conduta_exigirGestor_(sessionId);
  var r = CondutaRG_gerarSemanal_((p || {}).fim);
  return { ok: true, html: r.html, aviso: r.aviso, link: r.link };
}

function Conduta_apiGerarRelatorioMissoes(sessionId, p) {
  Conduta_exigirGestor_(sessionId);
  var comp = String((p || {}).competencia || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(comp)) throw new Error('Competência inválida. Escolha o mês no campo Competência.');
  var c = CondutaRG_contextoMissoes_(comp), t = CondutaRG_ia_('MISSOES', c);
  c.textos = t;
  var h = CondutaRG_htmlMissoes_(c, t);
  CondutaRG_salvar_('MISSOES', comp, c, h);
  var g = RelA4_salvar_(CondutaRel_pastaRelatorios_('Missões'), 'Programa de conduta - missões ' + comp + ' emitido ' + Utilities.formatDate(new Date(), RELA4_TZ, 'yyyy-MM-dd HHmm'), h);
  return { ok: true, html: RelA4_injetarAvisos_(h, RelA4_avisosPadrao_(g, [])), aviso: g.aviso, link: g.pdfUrl };
}

function Conduta_apiListarRelatoriosGerenciais(sessionId) {
  Conduta_exigirEquipe_(sessionId); var adm = isAdminSession(sessionId);
  var rows = SGO_DATA.getAll(CONDUTA_SHEETS.RELATORIO).filter(function (r) { return r.TIPO === 'SEMANAL' || (adm && r.TIPO === 'MISSOES'); }).map(function (r) {
    return { id: r.ID, tipo: r.TIPO, periodo: String(r.COMPETENCIA || ''), periodoLabel: CondutaRG_periodoLabel_(r.COMPETENCIA), geradoEm: Conduta_soData_(r.GERADO_EM), geradoEmLabel: CondutaRG_br_(r.GERADO_EM), criadoEm: String(r.CRIADO_EM || ''), tipoLabel: r.TIPO === 'SEMANAL' ? 'Semanal' : 'Missões' };
  });
  rows.sort(function (a, b) { return String(b.periodo).localeCompare(String(a.periodo)) || b.criadoEm.localeCompare(a.criadoEm) || String(b.id).localeCompare(String(a.id)); });
  var totals = {}, seen = {};
  rows.forEach(function (r) { var k = r.tipo + '|' + r.periodo; totals[k] = (totals[k] || 0) + 1; });
  rows.forEach(function (r) { var k = r.tipo + '|' + r.periodo; seen[k] = (seen[k] || 0) + 1; r.edicao = totals[k] > 1 ? 'Edição ' + (totals[k] - seen[k] + 1) + ' de ' + totals[k] : ''; });
  return rows;
}

function Conduta_apiObterRelatorioGerencial(sessionId, p) {
  Conduta_exigirEquipe_(sessionId);
  var r = SGO_DATA.getById(CONDUTA_SHEETS.RELATORIO, (p || {}).id);
  if (!r || !(r.TIPO === 'SEMANAL' || (r.TIPO === 'MISSOES' && isAdminSession(sessionId)))) throw new Error('Relatório não encontrado ou de acesso restrito à gestão.');
  var c;
  try { c = JSON.parse(r.CONTEXTO_JSON || ''); } catch (e) { throw new Error('Este relatório não tem os dados da geração guardados. Gere uma nova edição.'); }
  if ((r.TIPO === 'SEMANAL' && (!c.inicio || !c.fim || !Array.isArray(c.codigos) || !Array.isArray(c.reconhecimentos))) || (r.TIPO === 'MISSOES' && !Array.isArray(c.linhas))) throw new Error('Os dados guardados deste relatório estão incompletos. Gere uma nova edição.');
  if (c.limiteVerdeD === undefined) c.limiteVerdeD = '—';
  // texto da geração (IA ou padrão) quando guardado; relatório antigo usa o texto padrão
  var t = c.textos && c.textos.analise ? c.textos : CondutaRG_ia_(r.TIPO, c);
  var h = r.TIPO === 'SEMANAL' ? CondutaRG_htmlSemanal_(c, t) : CondutaRG_htmlMissoes_(c, t);
  return { ok: true, html: RelA4_injetarAvisos_(h, [{ tipo: 'ok', html: 'Dados preservados da geração de ' + RelA4_esc_(CondutaRG_br_(r.GERADO_EM)) + '. Esta é a mesma apuração, não uma nova; não autoriza pagamento.' }]) };
}

function Conduta_gerarRelatorioSemanalAutomatico_() { Conduta_setup_(); CondutaRG_gerarSemanal_(); }
function Conduta_configurarRelatorioSemanalAutomatico_() {
  ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'Conduta_gerarRelatorioSemanalAutomatico_'; }).forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('Conduta_gerarRelatorioSemanalAutomatico_').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(18).create();
  return { ok: true, mensagem: 'Relatório semanal automático agendado para domingo às 18h.' };
}
function Conduta_apiAtivarRelatorioSemanalAutomatico(sessionId) { Conduta_exigirGestor_(sessionId); return Conduta_configurarRelatorioSemanalAutomatico_(); }

function CondutaRG_periodoLabel_(value) {
  var str = String(value || ''), m = /^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/.exec(str);
  if (m) return CondutaRG_br_(m[1]) + ' a ' + CondutaRG_br_(m[2]);
  var comp = Conduta_soComp_(value);
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(comp)) {
    var nomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return nomes[Number(comp.slice(5)) - 1] + ' de ' + comp.slice(0, 4);
  }
  return str;
}
