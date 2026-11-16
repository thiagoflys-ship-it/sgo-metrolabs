/****************************************************
 * PAINEL DO DESEMPENHO DA GESTÃO, CAIXA AGRUPADA E SANEAMENTO DO ACÚMULO (11/11/2026)
 *
 * Pedido do dono: "desempenho da gestão, isso está horrível" e "Caixa de decisões, fazer o mesmo". A tela mostrava, por
 * gestor, um parágrafo corrido com centenas de títulos ("O.S. nº ... aberta no Auvo há 333 dias; O.S. nº ... sem vínculo de
 * técnico com o SGO+; ..."), e a Caixa uma lista única de até 400 cartões. A maior parte era acúmulo de origem externa
 * (O.S. abertas no Auvo há meses e O.S. sem técnico vinculado), que não é decisão parada do gestor.
 *
 * REGRAS (claras e publicadas na tela "Regra da nota"):
 *  1. PENDÊNCIA DE SANEAMENTO: O.S. do Auvo que já chegou à Caixa com mais de N dias em aberto no Auvo (padrão 30, a Diretoria
 *     ajusta em Regra da nota). É acúmulo de antes (atendimento feito e não finalizado no Auvo, ou abandonado): fica num bloco
 *     próprio, não pesa na nota do gestor e é tratado em lote na tela de saneamento. A O.S. que entrou nova e envelheceu na
 *     Caixa continua sendo decisão (pesa), porque aí o atraso é da gestão.
 *  2. PENDÊNCIA DE CADASTRO: O.S. do Auvo sem técnico (ou cliente) vinculado ao SGO+. A causa é uma só por técnico do Auvo
 *     sem cadastro: aparece agrupada por técnico, não pesa na nota e se resolve vinculando o cadastro em Integração Auvo.
 *  3. REPETIDOS: itens com o mesmo assunto (por exemplo "Avaria na devolução do veículo X" e a "Sugestão de ocorrência" do
 *     mesmo fato) aparecem juntos, com a marca de repetido.
 *  4. O DESEMPENHO MEDE TEMPO DE RESPOSTA E TAXA DE RESOLUÇÃO: recebidos, resolvidos, taxa de resolução (resolvidos sobre a
 *     carteira do mês), decididos no prazo, prazos vencidos, tempo médio e escalados (também em % dos recebidos). A nota
 *     oficial continua a da regra configurada pela Diretoria (SGO_Gestao_Avaliacao.js), já sem os itens das regras 1 e 2.
 *  5. Programa de conduta e Qualidade (sigilo): só contagem agregada, sem títulos nem nomes.
 *
 * SANEAMENTO (sem apagar nada): a gestão marca em lote, com motivo, as O.S. antigas como "encerrada fora do SGO+" (ou dispensa
 * o vínculo de um técnico do Auvo que não terá cadastro). Cada marca vira uma linha em GES_SANEAMENTO (quem, quando, motivo,
 * de quando era a O.S.); a linha da Caixa (GES_DECISOES) fica SANEADA (não conta como decisão nem como resolvida) e o item
 * sai da Caixa, da escada e do relatório diário. "Desfazer" (com motivo) devolve o item à Caixa. Nada é alterado no Auvo:
 * a O.S. continua como está lá; conferir e finalizar no Auvo continua pelo link de cada O.S.
 *
 * Quem decide cada item e a escada de cobrança não mudam (SGO_Gestao_Decisoes.js e SGO_Gestao_Escada.js). Quem pode sanear:
 * o responsável pelo item na Caixa, a Diretoria e o Administrador. Nenhuma função devolve Date cru.
 ****************************************************/

var GESP_ABA_SAN = 'GES_SANEAMENTO';
var GESP_COLUNAS_SAN = ['ID', 'ITEM_ID', 'TIPO', 'OS', 'TITULO', 'ORIGEM_DIA', 'DIAS_ORIGEM', 'ACAO', 'MOTIVO', 'POR_ID', 'POR_NOME', 'EM',
  'REGISTRO_DECISAO_ID', 'DESFEITO_EM', 'DESFEITO_POR_NOME', 'DESFEITO_MOTIVO', 'CRIADO_EM'];
var GESP_ACOES = {
  ENCERRADA_FORA: { tipo: 'auvo_os_aberta', nome: 'Encerrada fora do SGO+' },
  VINCULO_DISPENSADO: { tipo: 'auvo_sem_vinculo', nome: 'Vínculo dispensado' }
};
var GESP_SAN_MAX_LOTE = 500;
var GESP_SAN_DIAS_PADRAO = 30;
var GESP_SIGILO = ['conduta', 'qualidade'];
var GESP_ITENS_GRUPO = 60;   // títulos devolvidos por grupo (o resto vira "e mais N")

// ------------------------------------------------------------
// CLASSIFICAÇÃO
// ------------------------------------------------------------
/** Dias de corte do saneamento (Regra da nota, Diretoria). */
function GesP_diasCorte_(cfg) {
  var n = Number(((cfg || Ges_cfg_()).saneamento || {}).auvoDias);
  return n >= 7 && n <= 365 ? Math.round(n) : GESP_SAN_DIAS_PADRAO;
}

/** Dias em aberto no Auvo lidos do título ("aberta no Auvo há 1.234 dias"); null se não houver. */
function GesP_diasDoTitulo_(titulo) {
  var m = /aberta no Auvo h[áa]\s+([\d.]+)\s+dia/i.exec(Ges_s_(titulo));
  return m ? Number(m[1].replace(/\./g, '')) : null;
}

/** Diferença em dias corridos entre dois dias 'aaaa-mm-dd' (b - a). */
function GesP_dias_(a, b) {
  var x = Date.parse(Ges_s_(a).slice(0, 10) + 'T12:00:00Z'), y = Date.parse(Ges_s_(b).slice(0, 10) + 'T12:00:00Z');
  return isFinite(x) && isFinite(y) ? Math.round((y - x) / 864e5) : null;
}

/**
 * Dia em que a O.S. foi aberta no Auvo (aaaa-mm-dd), pelo título e pelo dia em que o título foi escrito. '' se não der.
 * r: linha de GES_DECISOES (TITULO, ATUALIZADO_EM/ENTROU_EM) ou item da Caixa ({ titulo, origemDia }).
 */
function GesP_origemDia_(titulo, diaDoTitulo) {
  var n = GesP_diasDoTitulo_(titulo), d = Ges_s_(diaDoTitulo).slice(0, 10);
  if (n === null || !d) return '';
  return Ges_somarDias_(d, -n);
}

/**
 * Classe do item: 'DECISAO' (pesa), 'SANEAMENTO' (O.S. do Auvo que já entrou na Caixa com mais de N dias) ou 'CADASTRO'
 * (O.S. sem vínculo). tipo em qualquer caixa; origemDia e entrouDia 'aaaa-mm-dd'.
 */
function GesP_classe_(tipo, origemDia, entrouDia, corte) {
  var t = Ges_s_(tipo).toLowerCase();
  if (t === 'auvo_sem_vinculo') return 'CADASTRO';
  if (t === 'auvo_os_aberta' && origemDia && entrouDia) {
    var idade = GesP_dias_(origemDia, entrouDia);
    if (idade !== null && idade > corte) return 'SANEAMENTO';
  }
  return 'DECISAO';
}

/** Classe de uma linha de GES_DECISOES. */
function GesP_classeLinha_(r, corte) {
  return GesP_classe_(r.TIPO, GesP_origemDia_(r.TITULO, Ges_dia_(r.ATUALIZADO_EM) || Ges_dia_(r.ENTROU_EM)), Ges_dia_(r.ENTROU_EM), corte);
}

/** A linha de GES_DECISOES fica fora da avaliação do gestor? (saneada, saneamento ou cadastro) */
function GesP_foraDaAvaliacao_(r, corte) {
  if (Ges_up_(r.SITUACAO) === 'SANEADA') return true;
  return GesP_classeLinha_(r, corte) !== 'DECISAO';
}

/** Chave para juntar repetidos: o assunto sem o prefixo "Sugestão de ocorrência:" e sem diferença de caixa e espaços. */
function GesP_chaveDup_(titulo) {
  return Ges_s_(titulo).replace(/^sugest[ãa]o de ocorr[êe]ncia:\s*/i, '').replace(/\s+/g, ' ').toLowerCase();
}

/** Nome do tipo no plural (central de pendências), ou o código. */
function GesP_nomeTipo_(tipo) {
  var t = Ges_s_(tipo).toLowerCase(), d = typeof PEND_TIPOS !== 'undefined' ? PEND_TIPOS[t] : null;
  if (!d) return Ges_s_(tipo) || 'Outros';
  var v = Ges_s_(d.varios || d.um || t);
  return v.charAt(0).toUpperCase() + v.slice(1);
}
function GesP_sigilo_(modulo) { return GESP_SIGILO.indexOf(Ges_s_(modulo).toLowerCase()) >= 0; }

// ------------------------------------------------------------
// SANEAMENTO: registros
// ------------------------------------------------------------
function GesP_garantirAba_() {
  CertCal_garantirTabela_(GESP_ABA_SAN, GESP_COLUNAS_SAN);
  GESP_COLUNAS_SAN.forEach(function (c) { CertCal_garantirColuna_(GESP_ABA_SAN, c); });
  ['ORIGEM_DIA', 'EM', 'DESFEITO_EM'].forEach(function (c) { CertCal_forcarColunaTexto_(GESP_ABA_SAN, c); });
}

/** Saneamentos em vigor (não desfeitos): ITEM_ID -> registro. */
function GesP_saneados_() {
  var m = {};
  Ges_ler_(GESP_ABA_SAN).forEach(function (r) { if (!Ges_s_(r.DESFEITO_EM) && Ges_s_(r.ITEM_ID)) m[Ges_s_(r.ITEM_ID)] = r; });
  return m;
}

// ------------------------------------------------------------
// CAIXA: classificação e opções de filtro (usado por Ges_montarCaixa_)
// ------------------------------------------------------------
/** Acrescenta classe, dias de origem, chave de repetido e "da Diretoria" aos itens da Caixa (no lugar). */
function GesP_marcarItens_(itens, us, cfg) {
  var corte = GesP_diasCorte_(cfg), hoje = Ges_hoje_();
  itens.forEach(function (i) {
    var origem = Ges_s_(i.tipo).toLowerCase() === 'auvo_os_aberta' ? GesP_origemDia_(i.titulo, hoje) : '';
    i.origemDia = origem; i.origemBr = Ges_brDia_(origem);
    i.diasOrigem = origem ? GesP_dias_(origem, hoje) : null;
    i.classe = GesP_classe_(i.tipo, origem, i.entrouDia || hoje, corte);
    i.chaveDup = GesP_chaveDup_(i.titulo);
    i.tipoNome = GesP_nomeTipo_(i.tipo);
    i.daDiretoria = !!i.reserva || !!i.soDiretoria || (i.responsaveis || []).some(function (id) { return us[id] && us[id].diretoria; });
  });
  var vistos = {};
  itens.forEach(function (i) { if (i.classe === 'DECISAO') vistos[i.chaveDup] = (vistos[i.chaveDup] || 0) + 1; });
  itens.forEach(function (i) { i.repetidos = i.classe === 'DECISAO' && vistos[i.chaveDup] > 1 ? vistos[i.chaveDup] : 0; });
  return corte;
}

// ------------------------------------------------------------
// PAINEL DO DESEMPENHO
// ------------------------------------------------------------
/**
 * Painel do Desempenho da gestão. payload: { competencia, area, gestorId, tipo }.
 * Mesma visibilidade da avaliação: a Diretoria vê todos; o gestor só os números dele.
 */
function Gestao_apiPainelDesempenho(sessionId, payload) {
  return Ges_resposta_('abrir o Desempenho da gestão', function () {
    var s = exigirSessao(sessionId);
    Ges_registrarAcesso_(s);
    return GesP_painel_(s, payload || {});
  });
}

function GesP_painel_(s, p) {
  var base = Ges_avaliacaoParaSessao_(s, { competencia: p.competencia }); // valida o acesso e traz a nota oficial
  var comp = base.competencia, diretoria = !!base.diretoria, uid = Ges_s_(s.userId);
  var cfg = Ges_cfg_(), us = Ges_usuarios_(), corte = GesP_diasCorte_(cfg), hoje = Ges_hoje_();
  var ini = comp + '-01', fimMes = Ges_fimComp_(comp), fim = fimMes < hoje ? fimMes : hoje;
  var noMes = function (iso) { var d = Ges_s_(iso).slice(0, 10); return !!d && d >= ini && d <= fim; };
  var nomesAreas = typeof Areas_mapaNomes_ === 'function' ? Areas_mapaNomes_() : {};
  var nomeArea = function (c) { c = Ges_up_(c); return c ? (nomesAreas[c] || c) : 'Sem área'; };
  var filtroArea = Ges_up_(p.area), filtroTipo = Ges_up_(p.tipo), filtroGestor = Ges_s_(p.gestorId);
  if (!diretoria) filtroGestor = uid;

  var todas = Ges_ler_(GES_ABA_DECISOES).filter(function (r) { return Ges_up_(r.ACOMPANHAMENTO) !== 'SIM'; });
  if (!diretoria) todas = todas.filter(function (r) { return Ges_respDe_(r).indexOf(uid) >= 0; });
  todas.forEach(function (r) { r._classe = Ges_up_(r.SITUACAO) === 'SANEADA' ? 'SANEADA' : GesP_classeLinha_(r, corte); });
  // opções dos filtros (antes de filtrar)
  var areasOp = {}, tiposOp = {};
  todas.forEach(function (r) { if (Ges_s_(r.AREA)) areasOp[Ges_up_(r.AREA)] = true; if (Ges_s_(r.TIPO)) tiposOp[Ges_up_(r.TIPO)] = true; });
  var passa = function (r) {
    return (!filtroArea || Ges_up_(r.AREA) === filtroArea) && (!filtroTipo || Ges_up_(r.TIPO) === filtroTipo) && (!filtroGestor || Ges_respDe_(r).indexOf(filtroGestor) >= 0);
  };
  var linhas = todas.filter(passa);
  var decisao = linhas.filter(function (r) { return r._classe === 'DECISAO'; });

  // indicadores por gestor (com os mesmos filtros; a nota é a oficial do mês)
  var dados = Ges_dadosAvaliacao_();
  dados.decisoes = dados.decisoes.filter(function (r) { return (!filtroArea || Ges_up_(r.AREA) === filtroArea) && (!filtroTipo || Ges_up_(r.TIPO) === filtroTipo); });
  var notas = {};
  base.gestores.forEach(function (g) { notas[g.id] = g; });
  var gestores = (diretoria ? Ges_gestoresAvaliados_(us, cfg) : [uid]).filter(function (id) { return notas[id] && (!filtroGestor || id === filtroGestor); });
  var cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  var gestoresOut = gestores.map(function (id) {
    var ind = Ges_indicadoresGestor_(id, comp, dados, us, cfg).indicadores, g = notas[id] || {};
    var minhas = decisao.filter(function (r) { return Ges_respDe_(r).indexOf(id) >= 0; });
    var carteira = minhas.filter(function (r) {
      var e = Ges_dia_(r.ENTROU_EM), dd = Ges_dataDecisao_(r).slice(0, 10), res = Ges_dia_(r.RESOLVIDO_EM);
      return e && e <= fim && !(dd && dd < ini) && !(res && res < ini);
    }).length;
    var foraNota = linhas.filter(function (r) { return r._classe !== 'DECISAO' && Ges_up_(r.SITUACAO) !== 'SANEADA' && Ges_up_(r.SITUACAO) === 'ABERTA' && Ges_respDe_(r).indexOf(id) >= 0; }).length;
    var esc = decisao.filter(function (r) { return Ges_respDe_(r).indexOf(id) >= 0 && noMes(r.ESCALADO_EM) && Ges_up_(r.RESERVA_DIRETORIA) !== 'SIM'; });
    var venc = decisao.filter(function (r) {
      if (Ges_respDe_(r).indexOf(id) < 0) return false;
      var pz = Ges_dia_(r.PRAZO_DECISAO); if (!pz || pz < ini || pz >= fim) return false;
      var dd = Ges_dataDecisao_(r).slice(0, 10); return !dd || dd > pz;
    });
    return {
      id: id, nome: (us[id] || {}).nome || g.nome || id, areas: g.areas || [], nota: g.nota === undefined ? null : g.nota, farol: g.farol || 'SEM_DADOS', farolTexto: g.farolTexto || GES_FAROL_TEXTO.SEM_DADOS,
      componentes: g.componentes || {}, indicadoresNota: g.indicadores || null,
      recebidos: ind.recebidos, resolvidos: ind.decididos, carteira: carteira, taxaResolucao: Ges_pct_(ind.decididos, carteira),
      noPrazo: ind.noPrazo, basePrazo: ind.basePrazo, pctPrazo: ind.pctPrazo, vencidos: ind.vencidos, tempoMedio: ind.tempoMedio,
      escalados: ind.escalonamentos, pctEscalados: Ges_pct_(ind.escalonamentos, ind.recebidos), diasSemAcesso: ind.diasSemAcesso, diasUteis: ind.diasUteis,
      abertos: minhas.filter(function (r) { return Ges_up_(r.SITUACAO) === 'ABERTA'; }).length, foraDaNota: foraNota,
      grupos: { escalados: GesP_grupos_(esc, nomeArea), vencidos: GesP_grupos_(venc, nomeArea) }
    };
  });

  // por área (linhas de decisão)
  var porArea = {};
  decisao.forEach(function (r) {
    var a = Ges_up_(r.AREA) || '-', x = porArea[a] = porArea[a] || { area: a, nome: nomeArea(a), recebidos: 0, resolvidos: 0, abertos: 0, escalados: 0, vencidosAbertos: 0, foraDaNota: 0 };
    if (noMes(r.ENTROU_EM)) x.recebidos++;
    if (Ges_up_(r.SITUACAO) === 'RESOLVIDA' && noMes(r.RESOLVIDO_EM)) x.resolvidos++;
    if (Ges_up_(r.SITUACAO) === 'ABERTA') { x.abertos++; var pz = Ges_dia_(r.PRAZO_DECISAO); if (pz && pz < hoje && !Ges_s_(r.PRIMEIRA_ACAO_EM)) x.vencidosAbertos++; }
    if (noMes(r.ESCALADO_EM)) x.escalados++;
  });
  linhas.forEach(function (r) {
    if (r._classe === 'DECISAO' || Ges_up_(r.SITUACAO) !== 'ABERTA') return;
    var a = Ges_up_(r.AREA) || '-', x = porArea[a] = porArea[a] || { area: a, nome: nomeArea(a), recebidos: 0, resolvidos: 0, abertos: 0, escalados: 0, vencidosAbertos: 0, foraDaNota: 0 };
    x.foraDaNota++;
  });

  // o que está aberto agora, agrupado por tipo e área
  var abertas = linhas.filter(function (r) { return Ges_up_(r.SITUACAO) === 'ABERTA'; });
  var grupos = GesP_gruposAbertos_(abertas, nomeArea, us, hoje);
  var san = abertas.filter(function (r) { return r._classe === 'SANEAMENTO'; }), cad = abertas.filter(function (r) { return r._classe === 'CADASTRO'; });
  var epocas = {};
  san.forEach(function (r) { var o = GesP_origemDia_(r.TITULO, Ges_dia_(r.ATUALIZADO_EM) || Ges_dia_(r.ENTROU_EM)); var k = o ? o.slice(0, 7) : 'sem data'; epocas[k] = (epocas[k] || 0) + 1; });
  var tot = function (k) { return gestoresOut.reduce(function (s, g) { return s + (Number(g[k]) || 0); }, 0); };
  var totais = {
    recebidos: decisao.filter(function (r) { return noMes(r.ENTROU_EM); }).length,
    resolvidos: decisao.filter(function (r) { return Ges_up_(r.SITUACAO) === 'RESOLVIDA' && noMes(r.RESOLVIDO_EM); }).length,
    abertos: abertas.filter(function (r) { return r._classe === 'DECISAO'; }).length,
    vencidosAbertos: abertas.filter(function (r) { var pz = Ges_dia_(r.PRAZO_DECISAO); return r._classe === 'DECISAO' && pz && pz < hoje && !Ges_s_(r.PRIMEIRA_ACAO_EM); }).length,
    escalados: decisao.filter(function (r) { return noMes(r.ESCALADO_EM); }).length,
    noPrazo: tot('noPrazo'), basePrazo: tot('basePrazo'),
    saneamento: san.length, cadastro: cad.length, saneadas: linhas.filter(function (r) { return r._classe === 'SANEADA'; }).length
  };
  totais.pctPrazo = Ges_pct_(totais.noPrazo, totais.basePrazo);
  var tempos = gestoresOut.filter(function (g) { return g.tempoMedio !== null && g.resolvidos; });
  totais.tempoMedio = tempos.length ? Math.round(tempos.reduce(function (s, g) { return s + g.tempoMedio * g.resolvidos; }, 0) / tempos.reduce(function (s, g) { return s + g.resolvidos; }, 0) * 10) / 10 : null;

  return {
    competencia: comp, nomeCompetencia: base.nomeCompetencia, meses: base.meses, congelada: !!base.congelada, parcial: !!base.parcial, geradoEm: Ges_br_(Ges_agora_()),
    diretoria: diretoria, podeConfigurar: !!base.podeConfigurar, regras: Object.assign(base.regras || {}, { saneamentoDias: corte }),
    filtros: { area: filtroArea, tipo: filtroTipo, gestorId: diretoria ? Ges_s_(p.gestorId) : '' },
    opcoes: {
      areas: Object.keys(areasOp).sort().map(function (a) { return { valor: a, nome: nomeArea(a) }; }),
      tipos: Object.keys(tiposOp).sort().map(function (t) { return { valor: t, nome: GesP_nomeTipo_(t) }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }),
      gestores: diretoria ? base.gestoresLista : []
    },
    totais: totais, gestores: gestoresOut,
    areas: Object.keys(porArea).map(function (k) { return porArea[k]; }).sort(function (a, b) { return (b.abertos + b.foraDaNota) - (a.abertos + a.foraDaNota) || a.nome.localeCompare(b.nome, 'pt-BR'); }),
    grupos: grupos,
    saneamento: { corte: corte, os: san.length, cadastro: cad.length, epocas: Object.keys(epocas).sort().map(function (k) { return { mes: k, nome: k === 'sem data' ? k : Ges_nomeComp_(k), qtd: epocas[k] }; }) }
  };
}

/** Linhas agrupadas por tipo (contagem e até 20 títulos; sigilo só conta). */
function GesP_grupos_(linhas, nomeArea) {
  var g = {};
  linhas.forEach(function (r) {
    var k = Ges_up_(r.TIPO), x = g[k] = g[k] || { tipo: k, nome: GesP_nomeTipo_(k), qtd: 0, sigilo: GesP_sigilo_(r.MODULO), itens: [] };
    x.qtd++;
    if (!x.sigilo && x.itens.length < 20) x.itens.push({ titulo: Ges_s_(r.TITULO), entrou: Ges_brDia_(r.ENTROU_EM), prazo: Ges_brDia_(r.PRAZO_DECISAO), area: nomeArea(r.AREA) });
  });
  return Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.qtd - a.qtd || a.nome.localeCompare(b.nome, 'pt-BR'); });
}

/** Abertas agora: grupos por tipo e área, com escalados, vencidos, mais antigo, repetidos e os itens (sigilo só conta). */
function GesP_gruposAbertos_(abertas, nomeArea, us, hoje) {
  var g = {}, dup = {};
  abertas.forEach(function (r) { if (r._classe === 'DECISAO') { var c = GesP_chaveDup_(r.TITULO); dup[c] = (dup[c] || 0) + 1; } });
  abertas.forEach(function (r) {
    var k = Ges_up_(r.TIPO) + '|' + (Ges_up_(r.AREA) || '-') + '|' + r._classe;
    var x = g[k] = g[k] || { chave: k, tipo: Ges_up_(r.TIPO), nome: GesP_nomeTipo_(r.TIPO), area: Ges_up_(r.AREA), areaNome: nomeArea(r.AREA), classe: r._classe, modulo: Ges_s_(r.MODULO),
      sigilo: GesP_sigilo_(r.MODULO), qtd: 0, escalados: 0, vencidos: 0, repetidos: 0, maisAntigo: '', origemMaisAntiga: '', itens: [] };
    x.qtd++;
    if (Ges_s_(r.ESCALADO_EM)) x.escalados++;
    var pz = Ges_dia_(r.PRAZO_DECISAO);
    if (pz && pz < hoje && !Ges_s_(r.PRIMEIRA_ACAO_EM)) x.vencidos++;
    var e = Ges_dia_(r.ENTROU_EM);
    if (e && (!x.maisAntigo || e < x.maisAntigo)) x.maisAntigo = e;
    var o = r._classe === 'SANEAMENTO' ? GesP_origemDia_(r.TITULO, Ges_dia_(r.ATUALIZADO_EM) || e) : '';
    if (o && (!x.origemMaisAntiga || o < x.origemMaisAntiga)) x.origemMaisAntiga = o;
    var rep = r._classe === 'DECISAO' && dup[GesP_chaveDup_(r.TITULO)] > 1;
    if (rep) x.repetidos++;
    if (!x.sigilo && x.itens.length < GESP_ITENS_GRUPO) x.itens.push({ id: Ges_s_(r.ITEM_ID), titulo: Ges_s_(r.TITULO), com: Ges_s_(r.RESPONSAVEIS_NOMES) || 'ninguém', entrou: Ges_brDia_(e),
      dias: e ? GesP_dias_(e, hoje) : null, prazo: Ges_brDia_(pz), vencido: !!(pz && pz < hoje && !Ges_s_(r.PRIMEIRA_ACAO_EM)), escalado: !!Ges_s_(r.ESCALADO_EM), repetido: rep,
      tela: Ges_json_(r.TELA_JSON, null) });
  });
  var ordem = { DECISAO: 0, SANEAMENTO: 1, CADASTRO: 2 };
  return Object.keys(g).map(function (k) { var x = g[k]; x.maisAntigoBr = Ges_brDia_(x.maisAntigo); x.origemMaisAntigaBr = Ges_brDia_(x.origemMaisAntiga); x.mais = Math.max(0, x.qtd - x.itens.length); return x; })
    .sort(function (a, b) { return ordem[a.classe] - ordem[b.classe] || b.escalados - a.escalados || b.qtd - a.qtd || a.nome.localeCompare(b.nome, 'pt-BR'); });
}

// ------------------------------------------------------------
// SANEAMENTO: API
// ------------------------------------------------------------
/** Pode sanear o item? Responsável, Diretoria ou Administrador. */
function GesP_podeSanear_(it, s, us) {
  var uid = Ges_s_(s.userId);
  return (it.responsaveis || []).indexOf(uid) >= 0 || !!(us[uid] && us[uid].diretoria) || Ges_up_(s.perfil) === 'ADMIN' || Ges_ehDiretoriaSessao_(s);
}

/** Lista do saneamento: O.S. antigas do Auvo e O.S. sem vínculo (da Caixa de agora), por época e por técnico, e o histórico. */
function Gestao_apiSaneamento(sessionId, payload) {
  return Ges_resposta_('abrir o saneamento da Caixa', function () {
    var s = Ges_sessaoGestao_(sessionId, 'abrir o saneamento da Caixa');
    Ges_sincronizarTalvez_(false);
    return GesP_saneamento_(s);
  });
}

function GesP_saneamento_(s) {
  var cx = Ges_caixa_(), us = cx.us, cfg = cx.cfg, uid = Ges_s_(s.userId);
  var corte = GesP_marcarItens_(cx.itens, us, cfg);
  // link da O.S. no Auvo (a caixa leva à tela Integração Auvo; aqui o gestor confere a O.S. direto no Auvo)
  var urls = {};
  try { if (SGO_CFG.SHEETS.AUVO_PENDENCIAS) Ges_ler_(SGO_CFG.SHEETS.AUVO_PENDENCIAS).forEach(function (p) { var u = Ges_s_(p.TASK_URL); if (/^https?:\/\//i.test(u)) urls['AUVO:OS:' + Ges_s_(p.AUVO_TASK_ID)] = u; }); } catch (e) { urls = {}; }
  var veTudo = Ges_ehDiretoriaSessao_(s) || Ges_up_(s.perfil) === 'ADMIN' || Ges_ehGestaoPerfil_(s.perfil);
  var itens = cx.itens.filter(function (i) { return (i.classe === 'SANEAMENTO' || i.classe === 'CADASTRO') && (veTudo || i.responsaveis.indexOf(uid) >= 0); });
  var mapa = function (i) {
    var t = i.tela || {}, tecAuvo = (/técnico "([^"]+)"/.exec(Ges_s_(i.detalhe)) || [])[1] || '';
    return { id: i.id, os: (/O\.S\. nº\s*(\d+)/.exec(Ges_s_(i.titulo)) || [])[1] || '', titulo: i.titulo, tecnico: i.classe === 'CADASTRO' ? (tecAuvo || 'técnico do Auvo sem nome') : (i.envolvido || 'técnico não identificado'),
      origemDia: i.origemDia || '', origemBr: i.origemBr || '', diasOrigem: i.diasOrigem, entrouEm: Ges_brDia_(i.entrouDia), com: (i.responsaveisNomes || []).join(', ') || 'ninguém',
      escalado: !!i.escalado, url: urls[i.id] || (t.tipo === 'link' && /^https?:\/\//i.test(Ges_s_(t.url)) ? Ges_s_(t.url) : ''), pode: GesP_podeSanear_(i, s, us), detalhe: Ges_s_(i.detalhe).slice(0, 220) };
  };
  var os = itens.filter(function (i) { return i.classe === 'SANEAMENTO'; }).map(mapa).sort(function (a, b) { return String(a.origemDia).localeCompare(String(b.origemDia)); });
  var sv = itens.filter(function (i) { return i.classe === 'CADASTRO'; }).map(mapa);
  var conta = function (l, k) { var m = {}; l.forEach(function (x) { m[x[k]] = (m[x[k]] || 0) + 1; }); return Object.keys(m).map(function (n) { return { nome: n, qtd: m[n] }; }).sort(function (a, b) { return b.qtd - a.qtd || a.nome.localeCompare(b.nome, 'pt-BR'); }); };
  var epocas = {};
  os.forEach(function (x) { var k = x.origemDia ? x.origemDia.slice(0, 7) : 'sem data'; epocas[k] = (epocas[k] || 0) + 1; });
  var hist = Ges_ler_(GESP_ABA_SAN).slice(-150).reverse().map(function (r) {
    return { id: Ges_s_(r.ID), os: Ges_s_(r.OS), titulo: Ges_s_(r.TITULO), acao: (GESP_ACOES[Ges_up_(r.ACAO)] || {}).nome || Ges_s_(r.ACAO), motivo: Ges_s_(r.MOTIVO), por: Ges_s_(r.POR_NOME), em: Ges_br_(r.EM),
      origem: Ges_brDia_(r.ORIGEM_DIA), desfeito: Ges_s_(r.DESFEITO_EM) ? 'Desfeito por ' + Ges_s_(r.DESFEITO_POR_NOME) + ' em ' + Ges_br_(r.DESFEITO_EM) + ': ' + Ges_s_(r.DESFEITO_MOTIVO) : '',
      podeDesfazer: !Ges_s_(r.DESFEITO_EM) && (Ges_s_(r.POR_ID) === uid || Ges_ehDiretoriaSessao_(s) || Ges_up_(s.perfil) === 'ADMIN') };
  });
  return {
    corte: corte, geradoEm: Ges_br_(Ges_agora_()), naoVerificado: cx.naoVerificado,
    os: { total: os.length, itens: os, porTecnico: conta(os, 'tecnico'), epocas: Object.keys(epocas).sort().map(function (k) { return { mes: k, nome: k === 'sem data' ? k : Ges_nomeComp_(k), qtd: epocas[k] }; }),
      maisAntiga: os.length ? os[0].origemBr : '', maisNova: os.length ? os[os.length - 1].origemBr : '' },
    semVinculo: { total: sv.length, itens: sv, porTecnico: conta(sv, 'tecnico') },
    historico: hist, saneadasEmVigor: Ges_ler_(GESP_ABA_SAN).filter(function (r) { return !Ges_s_(r.DESFEITO_EM); }).length
  };
}

/**
 * Sanear em lote. payload: { acao: 'ENCERRADA_FORA' | 'VINCULO_DISPENSADO', itemIds: [...], motivo (15 letras ou mais) }.
 * Cada item precisa estar na Caixa agora, ser do tipo da ação e da pessoa (responsável, Diretoria ou Administrador).
 */
function Gestao_apiSanear(sessionId, payload) {
  return Ges_resposta_('registrar o saneamento', function () {
    var s = Ges_sessaoGestao_(sessionId, 'registrar o saneamento');
    var p = payload || {}, acao = Ges_up_(p.acao), def = GESP_ACOES[acao];
    var motivo = Ges_s_(p.motivo).replace(/\s+/g, ' ');
    var ids = (Array.isArray(p.itemIds) ? p.itemIds : []).map(Ges_s_).filter(function (x, i, l) { return x && l.indexOf(x) === i; });
    if (!def) throw new Error('escolha o que fazer: "marcar como encerrada fora do SGO+" (O.S. antiga) ou "dispensar o vínculo" (O.S. sem técnico)');
    if (!ids.length) throw new Error('marque pelo menos uma O.S. na lista e toque de novo');
    if (ids.length > GESP_SAN_MAX_LOTE) throw new Error('marque no máximo ' + GESP_SAN_MAX_LOTE + ' O.S. por vez (marcadas: ' + ids.length + '). Filtre por época ou por técnico e faça em partes');
    if (motivo.length < 15) throw new Error('escreva o motivo (pelo menos 15 letras), por exemplo "Atendimentos de 2025 já faturados; O.S. ficaram sem finalizar no Auvo", e toque de novo');
    GesP_garantirAba_();
    Ges_sincronizar_();
    var cx = Ges_caixa_(), us = cx.us, corte = GesP_marcarItens_(cx.itens, us, cx.cfg), porId = {};
    cx.itens.forEach(function (i) { porId[i.id] = i; });
    var recusados = [], ok = [];
    ids.forEach(function (id) {
      var it = porId[id];
      if (!it) { recusados.push({ id: id, motivo: 'já saiu da Caixa (resolvida, saneada ou mudou)' }); return; }
      if (Ges_s_(it.tipo).toLowerCase() !== def.tipo) { recusados.push({ id: id, motivo: 'não é ' + (def.tipo === 'auvo_os_aberta' ? 'O.S. aberta no Auvo' : 'O.S. sem vínculo') }); return; }
      if (acao === 'ENCERRADA_FORA' && it.classe !== 'SANEAMENTO') { recusados.push({ id: id, motivo: 'entrou na Caixa com menos de ' + corte + ' dias no Auvo: é decisão do gestor, resolva no Auvo' }); return; }
      if (!GesP_podeSanear_(it, s, us)) { recusados.push({ id: id, motivo: 'é de ' + ((it.responsaveisNomes || []).join(', ') || 'outra pessoa da gestão') }); return; }
      ok.push(it);
    });
    if (!ok.length) throw new Error('nenhuma O.S. pôde ser marcada: ' + recusados.slice(0, 3).map(function (r) { return r.id.replace(/^AUVO:\w+:/, 'O.S. ') + ' ' + r.motivo; }).join('; '));
    var eu = { id: Ges_s_(s.userId), nome: Ges_s_(s.nome || s.usuario) };
    return Ges_comTrava_(function () {
      var agora = Ges_agora_(), abertos = Ges_registrosAbertos_(), novos = [];
      ok.forEach(function (it) {
        var reg = abertos[it.id];
        novos.push({ ITEM_ID: it.id, TIPO: Ges_up_(it.tipo), OS: (/O\.S\. nº\s*(\d+)/.exec(Ges_s_(it.titulo)) || [])[1] || '', TITULO: Ges_s_(it.titulo).slice(0, 300), ORIGEM_DIA: it.origemDia || '',
          DIAS_ORIGEM: it.diasOrigem === null || it.diasOrigem === undefined ? '' : it.diasOrigem, ACAO: acao, MOTIVO: motivo.slice(0, 600), POR_ID: eu.id, POR_NOME: eu.nome, EM: agora,
          REGISTRO_DECISAO_ID: reg ? Ges_s_(reg.ID) : '' });
        if (reg) SGO_DATA.update(GES_ABA_DECISOES, reg.ID, { SITUACAO: 'SANEADA', ATUALIZADO_EM: agora });
      });
      SGO_DATA.insertMany(GESP_ABA_SAN, novos);
      try { SGO_DATA.log('GESTAO_SANEAMENTO', s.usuario, acao + ': ' + novos.length + ' O.S. Motivo: ' + motivo.slice(0, 200), 'GESTAO'); } catch (e) {}
      GesP_limparCaches_(us);
      return { saneados: novos.length, recusados: recusados,
        message: novos.length + (novos.length === 1 ? ' O.S. marcada' : ' O.S. marcadas') + ' como "' + def.nome.toLowerCase() + '". ' + (novos.length === 1 ? 'Saiu' : 'Saíram') + ' da Caixa e da avaliação; nada foi apagado e nada mudou no Auvo.' +
          (recusados.length ? ' ' + recusados.length + ' não ' + (recusados.length === 1 ? 'pôde' : 'puderam') + ' ser marcada(s): ' + recusados.slice(0, 3).map(function (r) { return r.id.replace(/^AUVO:\w+:/, 'O.S. ') + ' (' + r.motivo + ')'; }).join('; ') + '.' : '') };
    });
  });
}

/** Desfaz um saneamento (o item volta à Caixa). payload: { registroId, motivo (10 letras ou mais) }. */
function Gestao_apiDesfazerSaneamento(sessionId, payload) {
  return Ges_resposta_('desfazer o saneamento', function () {
    var s = Ges_sessaoGestao_(sessionId, 'desfazer o saneamento');
    var p = payload || {}, rid = Ges_s_(p.registroId), motivo = Ges_s_(p.motivo).replace(/\s+/g, ' ');
    if (motivo.length < 10) throw new Error('escreva por que a O.S. volta para a Caixa (pelo menos 10 letras) e toque de novo');
    var r = Ges_ler_(GESP_ABA_SAN).filter(function (x) { return Ges_s_(x.ID) === rid; })[0];
    if (!r) throw new Error('o registro não foi encontrado. Atualize a tela e tente de novo');
    if (Ges_s_(r.DESFEITO_EM)) throw new Error('este saneamento já foi desfeito');
    var uid = Ges_s_(s.userId);
    if (Ges_s_(r.POR_ID) !== uid && !Ges_ehDiretoriaSessao_(s) && Ges_up_(s.perfil) !== 'ADMIN') throw new Error('só quem marcou, a Diretoria ou o Administrador desfaz');
    return Ges_comTrava_(function () {
      var agora = Ges_agora_();
      SGO_DATA.update(GESP_ABA_SAN, r.ID, { DESFEITO_EM: agora, DESFEITO_POR_NOME: Ges_s_(s.nome || s.usuario), DESFEITO_MOTIVO: motivo.slice(0, 600) });
      var abertoJa = Ges_registrosAbertos_()[Ges_s_(r.ITEM_ID)];
      if (!abertoJa && Ges_s_(r.REGISTRO_DECISAO_ID)) SGO_DATA.update(GES_ABA_DECISOES, r.REGISTRO_DECISAO_ID, { SITUACAO: 'ABERTA', ATUALIZADO_EM: agora });
      try { SGO_DATA.log('GESTAO_SANEAMENTO_DESFEITO', s.usuario, Ges_s_(r.ITEM_ID) + ': ' + motivo.slice(0, 200), 'GESTAO'); } catch (e) {}
      GesP_limparCaches_(Ges_usuarios_());
      return { message: 'Saneamento desfeito: a O.S. ' + Ges_s_(r.OS) + ' volta para a Caixa na próxima atualização (se ainda estiver aberta no Auvo).' };
    });
  });
}

function GesP_limparCaches_(us) {
  try {
    var c = CacheService.getScriptCache();
    c.remove('GES_SINC_RECENTE');
    Object.keys(us || {}).forEach(function (id) { c.remove('GES_RESUMO_' + id); });
  } catch (e) {}
  try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (e) {}
}
