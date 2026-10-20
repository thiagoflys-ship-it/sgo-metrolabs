/****************************************************
 * AVALIAÇÃO DO GESTOR E RELATÓRIOS A4 DA GESTÃO (20/10/2026)
 *
 * Pedido do dono: "uma forma de avaliar o gestor para poder cobrar as falhas
 * deles". Indicadores por gestor e por mês, calculados dos registros da Caixa de
 * decisões (GES_DECISOES) e dos módulos, com regra transparente:
 *
 *  Indicador                     Como é contado                                         Nota do componente (0 a 100)
 *  Decidido no prazo (%)         decisões (primeira providência ou resolução) até o     o próprio percentual
 *                                prazo / decisões do mês + prazos vencidos sem decisão
 *  Tempo médio de decisão        dias úteis da entrada na caixa até a decisão           100 até 1 dia útil; -25 por dia útil a mais
 *  Itens vencidos                prazo de decisão que venceu no mês sem decisão          100 - 20 por item
 *  Escalonamentos à Diretoria    itens dele que ficaram parados até a Diretoria          100 - 25 por escalonamento
 *  Dias sem acessar o sistema    dias úteis do mês sem nenhum acesso (desde a ligação)   100 - 15 por dia
 *  Decisões revertidas           ocorrências que ele homologou e foram anuladas          100 - 25 por reversão
 *  Atividades da equipe          % das atividades da área com prazo no mês sem atraso   o próprio percentual
 *  Planos de ação                % dos planos dele com prazo no mês cumpridos no prazo   o próprio percentual
 *
 *  Nota = média ponderada dos componentes com dado no mês (pesos configuráveis
 *  pela Diretoria; padrão 30, 15, 15, 15, 10, 5, 5, 5). Componente sem dado no
 *  mês não entra e os pesos dos outros são redistribuídos. Farol: verde a partir
 *  de 85, amarelo a partir de 70, vermelho abaixo (configurável).
 *  Itens de acompanhamento (vencimentos de clientes) não entram.
 *
 * Quem vê: o próprio gestor (só a dele) e a Diretoria (perfil Diretoria e o dono
 * do sistema). Ninguém mais. O mês fechado fica congelado em GES_AVALIACOES no
 * primeiro dia útil do mês seguinte (a nota não muda depois).
 *
 * Falha grave recorrente (farol vermelho dois meses seguidos, ou 3 escalonamentos
 * ou mais no mês) vira SUGESTÃO no Programa de conduta, só para a Diretoria
 * decidir. Nunca vira ocorrência sozinha.
 *
 * Relatórios A4 (padrão SGO_Documentos_RelatorioA4.js, HTML + PDF na pasta
 * "Gestão - Relatórios"): Desempenho da gestão (mensal), Relatório semanal da
 * gestão e Atividades da equipe (mensal). Texto montado dos números (sem IA: a
 * avaliação de pessoas não sai do sistema).
 ****************************************************/

var GES_COMPONENTES = [
  { chave: 'prazo', nome: 'Decidido no prazo' }, { chave: 'tempo', nome: 'Tempo médio de decisão' }, { chave: 'vencidos', nome: 'Itens vencidos' },
  { chave: 'escalonamentos', nome: 'Escalonamentos à Diretoria' }, { chave: 'acesso', nome: 'Dias sem acessar' }, { chave: 'revertidas', nome: 'Decisões revertidas' },
  { chave: 'equipe', nome: 'Atividades da equipe sem atraso' }, { chave: 'planos', nome: 'Planos de ação no prazo' }
];
var GES_FAROL_TEXTO = { VERDE: 'Verde', AMARELO: 'Amarelo', VERMELHO: 'Vermelho', SEM_DADOS: 'Sem dados no mês' };

function Ges_compValida_(c) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(Ges_s_(c)); }
function Ges_compAtual_() { return Ges_hoje_().slice(0, 7); }
function Ges_fimComp_(comp) { var a = +comp.slice(0, 4), m = +comp.slice(5, 7); return comp + '-' + Ges_2_(new Date(Date.UTC(a, m, 0)).getUTCDate()); }
function Ges_nomeComp_(comp) { return typeof RelA4_competencia_ === 'function' ? RelA4_competencia_(comp) : comp; }
function Ges_pct_(a, b) { return b ? Math.round(a / b * 1000) / 10 : null; }
function Ges_numBr_(v, c) { if (v === null || v === undefined || !isFinite(Number(v))) return '—'; return typeof SGO_DocA4_num_ === 'function' ? SGO_DocA4_num_(Number(v), c === undefined ? (Math.round(v) === Number(v) ? 0 : 1) : c) : String(v); }

// ------------------------------------------------------------
// DADOS DO MÊS (lidos uma vez)
// ------------------------------------------------------------
function Ges_dadosAvaliacao_() {
  var d = { decisoes: Ges_ler_(GES_ABA_DECISOES).filter(function (r) { return Ges_up_(r.ACOMPANHAMENTO) !== 'SIM'; }), acessos: Ges_ler_(GES_ABA_ACESSOS),
    ocorrencias: typeof CONDUTA_SHEETS !== 'undefined' ? Ges_ler_(CONDUTA_SHEETS.OCORRENCIA) : [],
    atividades: typeof Atividades_todas_ === 'function' ? (function () { try { return Atividades_todas_(); } catch (e) { return []; } })() : [],
    planos: typeof CNDQ_SHEETS !== 'undefined' ? Ges_ler_(CNDQ_SHEETS.PLANO) : [], casos: typeof FROTA_ABA_CASO !== 'undefined' ? Ges_ler_(FROTA_ABA_CASO) : [],
    logins: Ges_loginsPorDia_() };
  return d;
}

/** Dias com LOGIN_OK por login (SYS_LOGS, últimas 40 mil linhas): { login: { 'aaaa-mm-dd': true } }. Falha = vazio. */
function Ges_loginsPorDia_() {
  var mapa = {};
  try {
    var sh = SGO_DATA.getSheet ? SGO_DATA.getSheet(SGO_CFG.SHEETS.SYS_LOGS) : null;
    var n = sh ? sh.getLastRow() : 0;
    if (n > 1) {
      var ini = Math.max(2, n - 40000 + 1);
      sh.getRange(ini, 2, n - ini + 1, 3).getValues().forEach(function (r) {
        if (String(r[2] || '') !== 'LOGIN_OK') return;
        var u = String(r[1] || '').trim().toLowerCase(), dia = Ges_dia_(r[0]);
        if (u && dia) (mapa[u] = mapa[u] || {})[dia] = true;
      });
    }
  } catch (e) {}
  return mapa;
}

function Ges_respDe_(r) { return Ges_s_(r.RESPONSAVEIS_IDS).split(',').map(Ges_s_).filter(Boolean); }
function Ges_dataDecisao_(r) {
  var a = Ges_iso_(r.PRIMEIRA_ACAO_EM), b = Ges_up_(r.SITUACAO) === 'RESOLVIDA' ? Ges_iso_(r.RESOLVIDO_EM) : '';
  if (a && b) return a < b ? a : b;
  return a || b;
}

/**
 * Indicadores de um gestor no mês (comp 'aaaa-mm'). Mês em curso conta até hoje.
 * Devolve { indicadores, componentes, nota, farol, detalhes }.
 */
function Ges_indicadoresGestor_(uid, comp, dados, us, cfg) {
  var ini = comp + '-01', fimMes = Ges_fimComp_(comp), hoje = Ges_hoje_(), fim = fimMes < hoje ? fimMes : hoje;
  var cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  var u = us[uid] || { login: '', nome: uid, area: '' };
  var meus = dados.decisoes.filter(function (r) { return Ges_respDe_(r).indexOf(uid) >= 0; });
  var noMes = function (iso) { var d = Ges_s_(iso).slice(0, 10); return d && d >= ini && d <= fim; };
  // decisões do mês
  var decididos = meus.filter(function (r) { return Ges_up_(r.SITUACAO) !== 'PERDIDA' && noMes(Ges_dataDecisao_(r)); });
  var tempos = decididos.map(function (r) { return Ges_diasUteisEntre_(Ges_dia_(r.ENTROU_EM), Ges_dataDecisao_(r).slice(0, 10), cfgExp); });
  var noPrazo = decididos.filter(function (r) { var p = Ges_dia_(r.PRAZO_DECISAO); return !p || Ges_dataDecisao_(r).slice(0, 10) <= p; });
  // prazo que venceu no mês sem decisão até ele (inclui o que foi decidido depois e o que se perdeu)
  var vencidos = meus.filter(function (r) {
    var p = Ges_dia_(r.PRAZO_DECISAO);
    if (!p || p < ini || p >= fim) return false;
    var dd = Ges_dataDecisao_(r).slice(0, 10);
    return !dd || dd > p;
  });
  var foraPrazoSemDecidir = vencidos.filter(function (r) { var dd = Ges_dataDecisao_(r).slice(0, 10); return !dd || !noMes(dd); });
  var basePrazo = decididos.length + foraPrazoSemDecidir.length;
  var escal = meus.filter(function (r) { return noMes(r.ESCALADO_EM) && Ges_up_(r.RESERVA_DIRETORIA) !== 'SIM'; });
  var recebidos = meus.filter(function (r) { return noMes(r.ENTROU_EM); });
  // acesso: dias úteis do mês (desde a ligação da caixa) sem nenhum acesso
  // o dia de hoje ainda não acabou: conta só até ontem
  var fimAcesso = fim < hoje ? fim : Ges_somarDias_(hoje, -1);
  var impl = Ges_dia_(cfg.implantadoEm) || ini, desde = impl > ini ? impl : ini, diasUteis = [], d = Ges_somarDias_(desde, -1);
  for (var i = 0; i < 40; i++) { d = Ges_somarDias_(d, 1); if (d > fimAcesso) break; if (Ges_diaUtil_(d, cfgExp)) diasUteis.push(d); }
  var acessou = {};
  dados.acessos.forEach(function (a) { if (Ges_s_(a.USUARIO_ID) === uid) acessou[Ges_s_(a.DIA).slice(0, 10)] = true; });
  var lg = dados.logins[Ges_s_(u.login).toLowerCase()] || {};
  Object.keys(lg).forEach(function (k) { acessou[k] = true; });
  var semAcesso = diasUteis.filter(function (x) { return !acessou[x]; });
  // revertidas: ocorrências que ele homologou e foram anuladas no mês
  var homologou = dados.ocorrencias.filter(function (o) { return Ges_s_(o.HOMOLOGADA_POR) === uid; });
  var revertidas = homologou.filter(function (o) { return Ges_up_(o.STATUS) === 'ANULADA' && noMes(Ges_dia_(o.ANULADA_EM)); });
  var homologouMes = homologou.filter(function (o) { return noMes(Ges_dia_(o.HOMOLOGADA_EM)) || noMes(Ges_dia_(o.ANULADA_EM)); });
  // atividades da equipe (áreas dele, sem as dele próprio) com prazo no mês
  var areas = Ges_areasDoGestor_(uid, cfg), agora = typeof Atividades_agora_ === 'function' ? Atividades_agora_() : Ges_agora_();
  var limite = fim < hoje ? fim + 'T23:59' : agora;
  var equipe = dados.atividades.filter(function (a) {
    var r = us[a.RESPONSAVEL_ID];
    if (!r || a.RESPONSAVEL_ID === uid || areas.indexOf(r.area) < 0 || a.SITUACAO === 'Cancelada' || !a.PRAZO) return false;
    var p = a.PRAZO.slice(0, 10);
    return p >= ini && p <= fim && a.PRAZO <= limite;
  });
  var equipeAtrasadas = equipe.filter(function (a) { return a.SITUACAO === 'Concluída' ? (a.CONCLUIDA_EM && a.CONCLUIDA_EM > a.PRAZO) : true; });
  // planos de ação dele (criou ou é o responsável) com prazo no mês
  var planos = [];
  dados.planos.forEach(function (p) {
    if (Ges_s_(p.CRIADO_POR_ID) !== uid && Ges_s_(p.QUEM_ID) !== uid) return;
    if (Ges_up_(p.FASE) === 'CANCELADO') return;
    var q = Ges_dia_(p.QUANDO);
    if (!q || q < ini || q > fim || q >= hoje) return;
    var feito = Ges_dia_(p.CONCLUIDO_EM) || (['VERIFICAR', 'AGIR', 'CONCLUIDO'].indexOf(Ges_up_(p.FASE)) >= 0 ? Ges_dia_(p.ATUALIZADO_EM) : '');
    planos.push({ codigo: Ges_s_(p.CODIGO), quando: q, cumprido: !!feito && feito <= q });
  });
  dados.casos.forEach(function (c) {
    if (Ges_s_(c.RESPONSAVEL_ID) !== uid && Ges_s_(c.CRIADO_POR_ID) !== uid) return;
    if (Ges_up_(c.ETAPA) === 'CANCELADA') return;
    var q = Ges_dia_(c.QUANDO);
    if (!q || q < ini || q > fim || q >= hoje) return;
    var feito = Ges_dia_(c.CONCLUIDO_EM);
    planos.push({ codigo: Ges_s_(c.CODIGO), quando: q, cumprido: !!feito && feito <= q });
  });
  var planosOk = planos.filter(function (p) { return p.cumprido; }).length;
  var tempoMedio = tempos.length ? Math.round(tempos.reduce(function (s, x) { return s + x; }, 0) / tempos.length * 10) / 10 : null;
  var ind = {
    recebidos: recebidos.length, decididos: decididos.length, noPrazo: noPrazo.length, basePrazo: basePrazo, pctPrazo: Ges_pct_(noPrazo.length, basePrazo),
    tempoMedio: tempoMedio, vencidos: vencidos.length, escalonamentos: escal.length, diasUteis: diasUteis.length, diasSemAcesso: semAcesso.length,
    homologou: homologouMes.length, revertidas: revertidas.length, equipe: equipe.length, equipeAtrasadas: equipeAtrasadas.length, pctEquipe: equipe.length ? Ges_pct_(equipe.length - equipeAtrasadas.length, equipe.length) : null,
    planos: planos.length, planosOk: planosOk, pctPlanos: Ges_pct_(planosOk, planos.length), abertosAgora: meus.filter(function (r) { return Ges_up_(r.SITUACAO) === 'ABERTA'; }).length
  };
  var lim = function (v) { return Math.max(0, Math.min(100, Math.round(v * 10) / 10)); };
  var temItens = recebidos.length + vencidos.length + decididos.length > 0;
  var comp_ = {
    prazo: basePrazo ? ind.pctPrazo : null,
    tempo: tempoMedio === null ? null : lim(100 - Math.max(0, tempoMedio - 1) * 25),
    vencidos: temItens ? lim(100 - 20 * vencidos.length) : null,
    escalonamentos: temItens ? lim(100 - 25 * escal.length) : null,
    acesso: diasUteis.length ? lim(100 - 15 * semAcesso.length) : null,
    revertidas: homologouMes.length || revertidas.length ? lim(100 - 25 * revertidas.length) : null,
    equipe: ind.pctEquipe, planos: ind.pctPlanos
  };
  var soma = 0, pesos = 0;
  GES_COMPONENTES.forEach(function (c) { var v = comp_[c.chave], p = Number(cfg.pesos[c.chave]) || 0; if (v !== null && v !== undefined && p > 0) { soma += v * p; pesos += p; } });
  var nota = pesos ? Math.round(soma / pesos * 10) / 10 : null;
  var farol = nota === null ? 'SEM_DADOS' : nota >= cfg.farol.verde ? 'VERDE' : nota >= cfg.farol.amarelo ? 'AMARELO' : 'VERMELHO';
  return {
    id: uid, nome: u.nome, areas: areas.map(function (a) { return (typeof Areas_mapaNomes_ === 'function' ? Areas_mapaNomes_()[a] : '') || a; }),
    indicadores: ind, componentes: comp_, nota: nota, farol: farol, farolTexto: GES_FAROL_TEXTO[farol],
    detalhes: {
      escalados: escal.map(function (r) { return { titulo: Ges_s_(r.TITULO), entrou: Ges_br_(r.ENTROU_EM), escalado: Ges_br_(r.ESCALADO_EM), situacao: GES_SITUACOES[Ges_up_(r.SITUACAO)] || Ges_s_(r.SITUACAO) }; }),
      vencidos: vencidos.slice(0, 30).map(function (r) { return { titulo: Ges_s_(r.TITULO), prazo: Ges_brDia_(r.PRAZO_DECISAO), decidido: Ges_br_(Ges_dataDecisao_(r)) || (Ges_up_(r.SITUACAO) === 'PERDIDA' ? 'venceu sem decisão' : 'sem decisão') }; }),
      semAcesso: semAcesso.map(Ges_brDia_), revertidas: revertidas.map(function (o) { return Ges_s_(o.TIPO_CODIGO) + ' (fato em ' + Ges_brDia_(o.DATA_FATO) + ')'; }),
      planosAtrasados: planos.filter(function (p) { return !p.cumprido; }).map(function (p) { return p.codigo + ' (prazo ' + Ges_brDia_(p.quando) + ')'; })
    }
  };
}

/** Avaliação de todos os gestores no mês: congelada (mês fechado) ou calculada agora (mês em curso ou sem congelamento). */
function Ges_avaliarMes_(comp, opcoes) {
  opcoes = opcoes || {};
  var cfg = Ges_cfg_(), us = Ges_usuarios_();
  var cong = opcoes.calcular ? [] : Ges_ler_(GES_ABA_AVALIACOES).filter(function (r) { return Ges_s_(r.COMPETENCIA).slice(0, 7) === comp; });
  if (cong.length) {
    return { competencia: comp, nomeCompetencia: Ges_nomeComp_(comp), congelada: true, geradoEm: Ges_br_(Ges_iso_(cong[0].GERADO_EM)),
      gestores: cong.map(function (r) { var g = Ges_json_(r.INDICADORES_JSON, {}) || {}; g.id = Ges_s_(r.GESTOR_ID); g.nome = Ges_s_(r.GESTOR_NOME) || g.nome; return g; }), regras: Ges_regras_(cfg) };
  }
  var dados = Ges_dadosAvaliacao_();
  var lista = Ges_gestoresAvaliados_(us, cfg).map(function (uid) { return Ges_indicadoresGestor_(uid, comp, dados, us, cfg); });
  return { competencia: comp, nomeCompetencia: Ges_nomeComp_(comp), congelada: false, parcial: comp >= Ges_compAtual_(), geradoEm: Ges_br_(Ges_agora_()), gestores: lista, regras: Ges_regras_(cfg) };
}

function Ges_regras_(cfg) {
  return { pesos: cfg.pesos, farol: cfg.farol, sugestaoConduta: cfg.sugestaoConduta !== false, componentes: GES_COMPONENTES, implantadoEm: Ges_br_(cfg.implantadoEm),
    textos: {
      prazo: 'Decisões (primeira providência ou resolução) até o prazo, sobre as decisões do mês mais os prazos que venceram no mês sem decisão.',
      tempo: 'Dias úteis da entrada na caixa até a decisão. Até 1 dia útil vale 100; cada dia útil a mais tira 25.',
      vencidos: 'Prazos de decisão que venceram no mês sem decisão até a data. Cada um tira 20.',
      escalonamentos: 'Itens que ficaram parados até chegar à Diretoria. Cada um tira 25.',
      acesso: 'Dias úteis do mês sem abrir o sistema (contados desde a ligação da caixa). Cada um tira 15.',
      revertidas: 'Ocorrências homologadas por ele e anuladas em contestação ou recurso. Cada uma tira 25.',
      equipe: 'Atividades das pessoas da área dele com prazo no mês, concluídas sem atraso.',
      planos: 'Planos de ação (Programa de conduta e casos da Frota) que ele criou ou conduz, com prazo no mês, cumpridos até o prazo.'
    } };
}

/** Congela o mês fechado (uma linha por gestor). Não refaz se já existe. */
function Ges_congelarAvaliacoes_(comp) {
  Ges_garantirAbas_();
  if (Ges_ler_(GES_ABA_AVALIACOES).some(function (r) { return Ges_s_(r.COMPETENCIA).slice(0, 7) === comp; })) return { jaCongelada: true };
  var a = Ges_avaliarMes_(comp, { calcular: true });
  var agora = Ges_agora_();
  if (a.gestores.length) SGO_DATA.insertMany(GES_ABA_AVALIACOES, a.gestores.map(function (g) {
    return { COMPETENCIA: comp, GESTOR_ID: g.id, GESTOR_NOME: g.nome, NOTA: g.nota === null ? '' : g.nota, FAROL: g.farol, INDICADORES_JSON: JSON.stringify(g).slice(0, 45000), GERADO_EM: agora };
  }));
  try { SGO_DATA.log('GESTAO_AVALIACAO_CONGELADA', 'sistema', comp + ': ' + a.gestores.length + ' gestor(es)', 'GESTAO'); } catch (e) {}
  return { congelados: a.gestores.length };
}

/**
 * Falha grave recorrente vira SUGESTÃO no Programa de conduta, só para a Diretoria decidir (nunca ocorrência sozinha):
 * farol vermelho no mês e no mês anterior, ou 3 escalonamentos ou mais no mês.
 */
function Ges_sugestoesConduta_(comp) {
  var cfg = Ges_cfg_();
  if (!cfg.sugestaoConduta || typeof CNDQ_SHEETS === 'undefined') return { fora: 'desligado ou Programa de conduta indisponível' };
  var atual = Ges_avaliarMes_(comp), anterior = Ges_avaliarMes_(Ges_competenciaAnterior_(comp + '-15'));
  var antes = {};
  anterior.gestores.forEach(function (g) { antes[g.id] = g; });
  var existentes = {};
  Ges_ler_(CNDQ_SHEETS.SUGESTAO).forEach(function (s) { existentes[Ges_s_(s.CHAVE)] = true; });
  var hoje = Ges_hoje_(), novas = 0;
  atual.gestores.forEach(function (g) {
    var motivos = [];
    if (g.farol === 'VERMELHO' && antes[g.id] && antes[g.id].farol === 'VERMELHO') motivos.push('farol vermelho em ' + Ges_nomeComp_(anterior.competencia) + ' e em ' + Ges_nomeComp_(comp) + ' (nota ' + Ges_numBr_(g.nota, 1) + ')');
    if (g.indicadores.escalonamentos >= 3) motivos.push(g.indicadores.escalonamentos + ' itens parados até a Diretoria em ' + Ges_nomeComp_(comp));
    if (!motivos.length) return;
    var chave = 'GESTAO|DESEMPENHO|' + g.id + '|' + comp;
    if (existentes[chave]) return;
    SGO_DATA.insert(CNDQ_SHEETS.SUGESTAO, { CHAVE: chave, ORIGEM_MODULO: 'GESTAO', ORIGEM_TIPO: 'DESEMPENHO_GESTAO', ORIGEM_ID: g.id + '|' + comp,
      ORIGEM_ROTULO: 'Desempenho da gestão de ' + Ges_nomeComp_(comp), ORIGEM_TELA: 'gestao_desempenho', ORIGEM_LINK: '',
      COLABORADOR_ID: g.id, COLABORADOR_NOME: g.nome, DATA_FATO: Ges_fimComp_(comp) < hoje ? Ges_fimComp_(comp) : hoje, TIPO_CODIGO: '',
      TITULO: 'Desempenho da gestão: ' + motivos.join('; ').slice(0, 170),
      DETALHE: 'Sugestão automática da avaliação do gestor (Desempenho da gestão). Decidido no prazo: ' + (g.indicadores.pctPrazo === null ? 'sem dado' : Ges_numBr_(g.indicadores.pctPrazo, 1) + '%') +
        '; itens vencidos: ' + g.indicadores.vencidos + '; dias úteis sem acessar: ' + g.indicadores.diasSemAcesso + '. Só a Diretoria decide: registre a ocorrência com o código que se aplica ou descarte com o motivo. Nada é automático.',
      INFORMATIVA: 'SIM', STATUS: 'PENDENTE', DETECTADA_EM: hoje });
    novas++;
  });
  if (novas) try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); SGO_DATA.log('GESTAO_SUGESTAO_CONDUTA', 'sistema', novas + ' sugestão(ões) da avaliação de ' + comp, 'GESTAO'); } catch (e) {}
  return { novas: novas };
}

// ------------------------------------------------------------
// VISIBILIDADE E API
// ------------------------------------------------------------
/**
 * O que a sessão pode ver: a Diretoria vê todos os gestores; o gestor só a própria avaliação; os demais nada.
 * p: { competencia, gestorId }. Lança erro com a mensagem para a tela.
 */
function Ges_avaliacaoParaSessao_(s, p) {
  p = p || {};
  var comp = Ges_compValida_(p.competencia) ? p.competencia : Ges_compAtual_();
  var diretoria = Ges_ehDiretoriaSessao_(s), uid = Ges_s_(s.userId);
  var cfg = Ges_cfg_(), us = Ges_usuarios_();
  var avaliados = Ges_gestoresAvaliados_(us, cfg);
  if (!diretoria && avaliados.indexOf(uid) < 0) {
    throw new Error('Não foi possível abrir o Desempenho da gestão: a avaliação é vista só pelo próprio gestor e pela Diretoria. Se você responde por uma área, peça ao Administrador ou à Diretoria para incluí-lo em Caixa de decisões > Regras e responsáveis');
  }
  var a = Ges_avaliarMes_(comp);
  var alvo = Ges_s_(p.gestorId);
  if (!diretoria) a.gestores = a.gestores.filter(function (g) { return g.id === uid; });
  else if (alvo) a.gestores = a.gestores.filter(function (g) { return g.id === alvo; });
  a.diretoria = diretoria;
  a.podeConfigurar = diretoria;
  a.meses = [];
  for (var i = 0, c = Ges_compAtual_(); i < 12; i++) { a.meses.push({ valor: c, nome: Ges_nomeComp_(c) }); c = Ges_competenciaAnterior_(c + '-15'); }
  a.gestoresLista = diretoria ? avaliados.map(function (id) { return { id: id, nome: us[id].nome }; }) : [];
  return a;
}

function Gestao_apiAvaliacao(sessionId, payload) {
  return Ges_resposta_('abrir o Desempenho da gestão', function () {
    var s = exigirSessao(sessionId);
    Ges_registrarAcesso_(s);
    return Ges_avaliacaoParaSessao_(s, payload || {});
  });
}

/** Pesos e faixas do farol: só a Diretoria (perfil Diretoria ou dono). payload.salvar: { pesos: {...}, farol: { verde, amarelo }, sugestaoConduta }. */
function Gestao_apiConfigAvaliacao(sessionId, payload) {
  return Ges_resposta_('salvar a regra da avaliação', function () {
    var s = exigirSessao(sessionId);
    if (!Ges_ehDiretoriaSessao_(s)) throw new Error('os pesos e as faixas da avaliação do gestor são definidos pela Diretoria');
    var p = payload || {};
    if (p.salvar) {
      var v = p.salvar, pesos = {}, total = 0;
      GES_COMPONENTES.forEach(function (c) {
        var n = Math.round(Number((v.pesos || {})[c.chave]));
        if (!(n >= 0 && n <= 100)) throw new Error('o peso de "' + c.nome + '" precisa ser um número de 0 a 100');
        pesos[c.chave] = n; total += n;
      });
      if (!total) throw new Error('pelo menos um peso precisa ser maior que zero');
      var verde = Number(v.farol && v.farol.verde), amarelo = Number(v.farol && v.farol.amarelo);
      if (!(verde > amarelo && amarelo >= 0 && verde <= 100)) throw new Error('o verde precisa começar acima do amarelo (por exemplo 85 e 70), os dois de 0 a 100');
      var atual = Ges_json_(PropertiesService.getScriptProperties().getProperty(GES_CFG_PROP), {}) || {};
      atual.pesos = pesos; atual.farol = { verde: verde, amarelo: amarelo }; atual.sugestaoConduta = v.sugestaoConduta !== false;
      Ges_cfgGravar_(atual);
      try { SGO_DATA.log('GESTAO_REGRA_AVALIACAO', s.usuario, JSON.stringify({ pesos: pesos, farol: atual.farol, sugestaoConduta: atual.sugestaoConduta }), 'GESTAO'); } catch (e) {}
    }
    var cfg = Ges_cfg_();
    return { pesos: cfg.pesos, farol: cfg.farol, sugestaoConduta: cfg.sugestaoConduta, componentes: GES_COMPONENTES, message: p.salvar ? 'Regra da avaliação salva. A nota do mês em curso já usa os pesos novos; meses fechados não mudam.' : '' };
  });
}

/**
 * Relatórios A4 sob demanda. payload: { tipo: 'desempenho'|'semanal'|'atividades', competencia, gestorId }.
 * Desempenho de todos e semanal: só a Diretoria. Desempenho individual: o próprio gestor ou a Diretoria. Atividades: a gestão.
 */
function Gestao_apiRelatorio(sessionId, payload) {
  return Ges_resposta_('gerar o relatório', function () {
    var s = exigirSessao(sessionId), p = payload || {}, tipo = Ges_s_(p.tipo);
    var comp = Ges_compValida_(p.competencia) ? p.competencia : Ges_compAtual_();
    var diretoria = Ges_ehDiretoriaSessao_(s), uid = Ges_s_(s.userId), g;
    if (tipo === 'desempenho') {
      var alvo = Ges_s_(p.gestorId);
      if (!diretoria) {
        if (!alvo || alvo !== uid) throw new Error('o relatório com todos os gestores é da Diretoria. Você pode gerar o seu: abra o seu desempenho e toque em "Gerar meu relatório A4"');
        if (Ges_gestoresAvaliados_(Ges_usuarios_(), Ges_cfg_()).indexOf(uid) < 0) throw new Error('a avaliação é vista só pelo próprio gestor e pela Diretoria');
      }
      g = Ges_relatorioDesempenho_(comp, s, alvo);
    } else if (tipo === 'semanal') {
      if (!diretoria) throw new Error('o relatório semanal da gestão é da Diretoria');
      g = Ges_relatorioSemanal_(s);
    } else if (tipo === 'atividades') {
      if (!Ges_ehGestaoPerfil_(s.perfil)) throw new Error('o relatório de atividades da equipe é da gestão');
      g = Ges_relatorioAtividades_(comp, s);
    } else throw new Error('tipo de relatório desconhecido');
    return { html: typeof RelA4_injetarAvisos_ === 'function' ? RelA4_injetarAvisos_(g.html, RelA4_avisosPadrao_(g, [])) : g.html, link: g.link || '', aviso: g.aviso || '' };
  });
}

/** Relatórios gerados pela rotina (semanais e mensais), para a Diretoria. */
function Gestao_apiRelatoriosGerados(sessionId) {
  return Ges_resposta_('listar os relatórios', function () {
    var s = exigirSessao(sessionId);
    if (!Ges_ehDiretoriaSessao_(s)) throw new Error('a lista dos relatórios automáticos é da Diretoria');
    var nomes = {}; GES_RELATORIOS_MENSAIS.forEach(function (r) { nomes[r[0]] = r[1]; });
    var itens = Ges_ler_(GES_ABA_ENVIOS).filter(function (e) { var t = Ges_up_(e.TIPO); return t === 'MENSAL' || t === 'SEMANAL'; }).map(function (e) {
      var t = Ges_up_(e.TIPO), ref = Ges_s_(e.REFERENCIA), partes = ref.split('|');
      return { tipo: t, nome: t === 'SEMANAL' ? 'Relatório semanal da gestão (' + ref + ')' : (nomes[partes[1]] || partes[1]) + ' — ' + Ges_nomeComp_(partes[0]),
        dia: Ges_brDia_(e.DIA), situacao: Ges_up_(e.SITUACAO) === 'OK' ? 'Gerado' : 'Falhou', motivo: Ges_s_(e.MOTIVO), link: Ges_s_(e.LINK) };
    }).reverse().slice(0, 80);
    return { itens: itens };
  });
}

// ------------------------------------------------------------
// RELATÓRIOS A4
// ------------------------------------------------------------
function Ges_pastaRelatorios_(sub) {
  return function () { return RelA4_subpasta_(SGO_DocSalvar_pastaPersistente_('GESTAO_RELATORIOS_FOLDER_ID', 'Gestão - Relatórios'), sub); };
}

function Ges_marcaFarol_(f) { return RelA4_marca_(GES_FAROL_TEXTO[f] || f, f === 'VERDE' ? 'ok' : f === 'AMARELO' ? 'aviso' : f === 'VERMELHO' ? 'critico' : 'neutra'); }

/** Desempenho da gestão do mês (todos, ou um gestor). Devolve { salvo, link, html, aviso }. */
function Ges_relatorioDesempenho_(comp, quem, gestorId) {
  var a = Ges_avaliarMes_(comp);
  var gs = gestorId ? a.gestores.filter(function (g) { return g.id === gestorId; }) : a.gestores;
  var nomeMes = Ges_nomeComp_(comp), cfg = Ges_cfg_();
  var comNota = gs.filter(function (g) { return g.nota !== null; });
  var tot = function (k) { return gs.reduce(function (s, g) { return s + (Number(g.indicadores[k]) || 0); }, 0); };
  var media = comNota.length ? Math.round(comNota.reduce(function (s, g) { return s + g.nota; }, 0) / comNota.length * 10) / 10 : null;
  var base = tot('basePrazo'), pct = Ges_pct_(tot('noPrazo'), base);
  var vermelhos = comNota.filter(function (g) { return g.farol === 'VERMELHO'; }).map(function (g) { return g.nome; });
  var textoResumo = (gs.length === 1 ? 'Desempenho de ' + gs[0].nome + ' em ' + nomeMes + (a.parcial ? ' (mês em curso, até hoje)' : '') + '. ' : 'Em ' + nomeMes + (a.parcial ? ' (mês em curso, até hoje)' : '') + ' foram avaliados ' + Ges_plural_(gs.length, 'gestor', 'gestores') + '. ') +
    (base ? 'De ' + Ges_plural_(base, 'decisão com prazo', 'decisões com prazo') + ' no mês, ' + Ges_numBr_(pct, 1) + '% foram tomadas no prazo. ' : 'Não houve decisão com prazo no mês. ') +
    (tot('vencidos') ? Ges_plural_(tot('vencidos'), 'prazo de decisão venceu', 'prazos de decisão venceram') + ' sem decisão e ' : 'Nenhum prazo de decisão venceu sem decisão e ') +
    (tot('escalonamentos') ? Ges_plural_(tot('escalonamentos'), 'item chegou', 'itens chegaram') + ' à Diretoria por ficar parado.' : 'nenhum item precisou chegar à Diretoria.') +
    (gs.length > 1 && vermelhos.length ? ' Farol vermelho: ' + vermelhos.join(', ') + '.' : '') +
    (gs.length > 1 && comNota.length && !vermelhos.length ? ' Nenhum gestor ficou no vermelho.' : '');
  var c = [];
  c.push(RelA4_secao_('Resumo', RelA4_kpis_([
    [gs.length === 1 ? (gs[0].nota === null ? '—' : Ges_numBr_(gs[0].nota, 1)) : (media === null ? '—' : Ges_numBr_(media, 1)), gs.length === 1 ? 'Nota do mês (farol ' + (gs[0].farolTexto || '').toLowerCase() + ')' : 'Nota média dos gestores', (gs.length === 1 ? gs[0].nota : media) === null ? '' : ((gs.length === 1 ? gs[0].nota : media) >= cfg.farol.verde ? 'ok' : (gs.length === 1 ? gs[0].nota : media) >= cfg.farol.amarelo ? 'aviso' : 'critico')],
    [String(tot('decididos')), 'Decisões tomadas'], [pct === null ? '—' : Ges_numBr_(pct, 1) + '%', 'Decididas no prazo', pct !== null && pct < 80 ? 'aviso' : 'ok'],
    [String(tot('vencidos')), 'Prazos vencidos sem decisão', tot('vencidos') ? 'critico' : 'ok'], [String(tot('escalonamentos')), 'Escalonamentos à Diretoria', tot('escalonamentos') ? 'critico' : 'ok'],
    [String(tot('diasSemAcesso')), 'Dias úteis sem acessar (soma)', tot('diasSemAcesso') ? 'aviso' : 'ok'], [String(tot('revertidas')), 'Decisões revertidas', tot('revertidas') ? 'aviso' : 'ok'], [String(tot('abertosAgora')), 'Itens abertos agora']
  ]) + RelA4_paragrafos_(textoResumo)));
  c.push(RelA4_secao_('Nota e farol por gestor', RelA4_tabela_([{ t: 'Gestor' }, { t: 'Áreas' }, { t: 'Nota', num: true }, { t: 'Farol', cen: true }, { t: 'Decididas', num: true }, { t: 'No prazo', num: true },
    { t: 'Tempo médio (dias úteis)', num: true }, { t: 'Vencidos', num: true }, { t: 'Escalonados', num: true }, { t: 'Dias sem acesso', num: true }],
    gs.map(function (g) { var i = g.indicadores; return [g.nome, g.areas.join(', ') || 'sem área configurada', g.nota === null ? '—' : Ges_numBr_(g.nota, 1), Ges_marcaFarol_(g.farol), String(i.decididos), i.pctPrazo === null ? '—' : Ges_numBr_(i.pctPrazo, 1) + '%', Ges_numBr_(i.tempoMedio, 1), String(i.vencidos), String(i.escalonamentos), i.diasSemAcesso + ' de ' + i.diasUteis]; }),
    { legenda: 'Indicadores de decisão e acesso no mês', vazio: 'Nenhum gestor configurado: inclua os responsáveis em Caixa de decisões > Regras e responsáveis.', compacta: true }) +
    (comNota.length >= 2 ? RelA4_barras_(comNota.slice().sort(function (x, y) { return y.nota - x.nota; }).map(function (g) { return { rotulo: g.nome, valor: g.nota, rotuloValor: Ges_numBr_(g.nota, 1), cor: g.farol === 'VERDE' ? RELA4_CORES.verde : g.farol === 'AMARELO' ? RELA4_CORES.ambar : RELA4_CORES.vermelho }; }),
      { titulo: 'Nota do mês por gestor (verde a partir de ' + cfg.farol.verde + ', amarelo a partir de ' + cfg.farol.amarelo + ')' }) : '') +
    RelA4_tabela_([{ t: 'Gestor' }, { t: 'Homologou', num: true }, { t: 'Revertidas', num: true }, { t: 'Atividades da equipe no mês', num: true }, { t: 'Com atraso', num: true }, { t: 'Planos com prazo no mês', num: true }, { t: 'Cumpridos no prazo', num: true }],
      gs.map(function (g) { var i = g.indicadores; return [g.nome, String(i.homologou), String(i.revertidas), String(i.equipe), String(i.equipeAtrasadas), String(i.planos), String(i.planosOk)]; }),
      { legenda: 'Decisões revertidas, equipe e planos de ação', compacta: true, vazio: '' })));
  var esc = [], venc = [];
  gs.forEach(function (g) {
    (g.detalhes.escalados || []).forEach(function (e) { esc.push([g.nome, e.titulo, e.entrou, e.escalado, e.situacao]); });
    (g.detalhes.vencidos || []).forEach(function (e) { venc.push([g.nome, e.titulo, e.prazo, e.decidido]); });
  });
  c.push(RelA4_secao_('Itens que chegaram à Diretoria', RelA4_tabela_([{ t: 'Gestor' }, { t: 'Item' }, { t: 'Entrou', nw: true }, { t: 'Escalado', nw: true }, { t: 'Situação' }], esc, { vazio: 'Nenhum item chegou à Diretoria no mês.', compacta: true })));
  c.push(RelA4_secao_('Prazos de decisão vencidos', RelA4_tabela_([{ t: 'Gestor' }, { t: 'Item' }, { t: 'Prazo', nw: true }, { t: 'Decidido em' }], venc, { vazio: 'Nenhum prazo de decisão venceu sem decisão no mês.', compacta: true })));
  var semAc = gs.filter(function (g) { return (g.detalhes.semAcesso || []).length; });
  if (semAc.length) c.push(RelA4_secao_('Dias úteis sem acesso', RelA4_tabela_([{ t: 'Gestor' }, { t: 'Dias' }], semAc.map(function (g) { return [g.nome, g.detalhes.semAcesso.join(', ')]; }), { compacta: true })));
  var r = a.regras;
  c.push(RelA4_secao_('Regra da nota', '<p>A nota de 0 a 100 é a média ponderada dos componentes que tiveram dado no mês; componente sem dado não entra e os pesos dos outros são redistribuídos. Farol verde a partir de ' + cfg.farol.verde + ', amarelo a partir de ' + cfg.farol.amarelo + ', vermelho abaixo. Itens de acompanhamento (vencimentos de clientes) não entram. Dias sem acesso contam a partir de ' + RelA4_esc_(r.implantadoEm || 'da ligação da caixa') + '.' + (a.congelada ? ' Mês fechado: números congelados em ' + RelA4_esc_(a.geradoEm) + '.' : '') + '</p>' +
    RelA4_tabela_([{ t: 'Componente' }, { t: 'Peso', num: true }, { t: 'Como é contado' }], GES_COMPONENTES.map(function (k) { return [k.nome, String(cfg.pesos[k.chave]), r.textos[k.chave]]; }), { compacta: true })));
  c.push(RelA4_assinaturas_(['Diretoria']));
  var html = RelA4_documento_({ titulo: 'Desempenho da gestão', subtitulo: gs.length === 1 ? gs[0].nome : '', tituloCurto: 'Desempenho da gestão', sigla: 'GES-DES', rotuloIdentificacao: 'Competência', identificacao: nomeMes + (a.parcial ? ' (parcial)' : ''),
    emitidoPor: Ges_s_(quem && (quem.nome || quem.usuario)) || 'Rotina automática', corpo: c.join('\n'), tituloArquivo: 'Desempenho da gestao', ficha: [['Uso', 'Restrito: o próprio gestor e a Diretoria']] });
  var g = RelA4_salvar_(Ges_pastaRelatorios_('Desempenho da gestão'), comp + (gs.length === 1 ? ' ' + gs[0].nome : ''), html, { compartilhar: false });
  try { SGO_DATA.log('GESTAO_RELATORIO_DESEMPENHO', Ges_s_(quem && quem.usuario) || 'sistema', comp + (gestorId ? ' (individual)' : ''), 'GESTAO'); } catch (e) {}
  return { salvo: g.salvo, link: g.pdfUrl, pastaUrl: g.pastaUrl, html: g.html, aviso: g.aviso, pdfUrl: g.pdfUrl };
}

/** Relatório semanal da gestão: situação da caixa agora e a semana que passou, por gestor. */
function Ges_relatorioSemanal_(quem) {
  Ges_sincronizarTalvez_(true);
  var cx = Ges_caixa_(), us = cx.us, cfg = cx.cfg, hoje = Ges_hoje_(), cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  var ini = Ges_somarDias_(Ges_segundaDaSemana_(hoje), -7), fim = Ges_somarDias_(ini, 6);
  var decis = cx.itens.filter(function (i) { return !i.acompanhamento; });
  var regs = Ges_ler_(GES_ABA_DECISOES).filter(function (r) { return Ges_up_(r.ACOMPANHAMENTO) !== 'SIM'; });
  var acessos = Ges_ler_(GES_ABA_ACESSOS);
  var diasSemana = []; for (var d = ini; d <= fim; d = Ges_somarDias_(d, 1)) if (Ges_diaUtil_(d, cfgExp)) diasSemana.push(d);
  var linhas = Ges_gestoresAvaliados_(us, cfg).concat(Ges_diretoria_(us, [])).filter(function (id, k, l) { return l.indexOf(id) === k; }).map(function (uid) {
    var meus = decis.filter(function (i) { return i.responsaveis.indexOf(uid) >= 0; });
    var decididas = regs.filter(function (r) { var dd = Ges_dataDecisao_(r).slice(0, 10); return Ges_respDe_(r).indexOf(uid) >= 0 && dd >= ini && dd <= fim; });
    var tempos = decididas.map(function (r) { return Ges_diasUteisEntre_(Ges_dia_(r.ENTROU_EM), Ges_dataDecisao_(r).slice(0, 10), cfgExp); });
    var acessou = {}; acessos.forEach(function (a) { if (Ges_s_(a.USUARIO_ID) === uid) acessou[Ges_s_(a.DIA).slice(0, 10)] = true; });
    return [us[uid].nome + (us[uid].diretoria ? ' (Diretoria)' : ''), String(meus.length), String(meus.filter(function (i) { return i.diasParado >= cfg.escada.whatsDiasUteis && i.etapa !== 'PAUSADO'; }).length),
      String(meus.filter(function (i) { return i.escalado; }).length), String(decididas.length), tempos.length ? Ges_numBr_(Math.round(tempos.reduce(function (s, x) { return s + x; }, 0) / tempos.length * 10) / 10, 1) : '—',
      String(diasSemana.filter(function (x) { return !acessou[x]; }).length)];
  });
  var esc = decis.filter(function (i) { return i.escalado && i.etapa !== 'PAUSADO'; });
  var antigos = decis.slice().sort(function (a, b) { return b.idadeDiasUteis - a.idadeDiasUteis; }).slice(0, 15);
  var c = [];
  c.push(RelA4_secao_('Situação da caixa agora', RelA4_kpis_([[String(decis.length), 'Decisões na caixa'], [String(decis.filter(function (i) { return i.diasParado >= cfg.escada.whatsDiasUteis && i.etapa !== 'PAUSADO'; }).length), 'Paradas há ' + cfg.escada.whatsDiasUteis + ' dias úteis ou mais', 'aviso'],
    [String(esc.length), 'Escaladas à Diretoria', esc.length ? 'critico' : 'ok'], [String(decis.filter(function (i) { return i.prazoVencido; }).length), 'Com prazo de decisão vencido', 'aviso'],
    [String(decis.filter(function (i) { return i.reserva; }).length), 'Na reserva da Diretoria'], [String(cx.itens.filter(function (i) { return i.acompanhamento; }).length), 'Para acompanhar (clientes)']])));
  c.push(RelA4_secao_('Por gestor', RelA4_tabela_([{ t: 'Pessoa' }, { t: 'Na caixa', num: true }, { t: 'Paradas', num: true }, { t: 'Escaladas', num: true }, { t: 'Decididas na semana', num: true }, { t: 'Tempo médio (dias úteis)', num: true }, { t: 'Dias úteis sem acesso', num: true }],
    linhas, { legenda: 'Semana de ' + Ges_brDia_(ini) + ' a ' + Ges_brDia_(fim) + ' (decisões e acessos) e a caixa de hoje', compacta: true })));
  c.push(RelA4_secao_('Escaladas à Diretoria', RelA4_tabela_([{ t: 'Item' }, { t: 'Módulo' }, { t: 'Com' }, { t: 'Parado (dias úteis)', num: true }, { t: 'Última providência' }],
    esc.map(function (i) { return [i.titulo, i.moduloNome, i.reserva ? 'Diretoria (área sem gestor)' : i.responsaveisNomes.join(', '), String(i.diasParado), i.providencia || '—']; }), { vazio: 'Nenhuma decisão escalada.', compacta: true })));
  c.push(RelA4_secao_('Decisões mais antigas', RelA4_tabela_([{ t: 'Item' }, { t: 'Com' }, { t: 'Na caixa desde', nw: true }, { t: 'Dias úteis', num: true }, { t: 'Prazo', nw: true }],
    antigos.map(function (i) { return [i.titulo, i.reserva ? 'Diretoria' : i.responsaveisNomes.join(', '), i.entrouEm.slice(0, 10), String(i.idadeDiasUteis), i.prazo + (i.prazoVencido ? ' (vencido)' : '')]; }), { vazio: 'A caixa está vazia.', compacta: true })));
  c.push(RelA4_secao_('Como ler', '<p class="nota">Parado: dias úteis desde a entrada na caixa ou desde a última providência registrada. Com ' + cfg.escada.whatsDiasUteis + ' dias úteis o item entra no resumo do WhatsApp do gestor; com ' + cfg.escada.diretoriaDiasUteis + ' chega à Diretoria. Providência registrada pausa a escada até a data de acompanhamento (no máximo ' + GES_PAUSA_MAX_DIAS + ' dias). Fins de semana e feriados não contam.</p>'));
  var html = RelA4_documento_({ titulo: 'Relatório semanal da gestão', tituloCurto: 'Semanal da gestão', sigla: 'GES-SEM', identificacao: Ges_brDia_(ini) + ' a ' + Ges_brDia_(fim),
    emitidoPor: Ges_s_(quem && (quem.nome || quem.usuario)) || 'Rotina automática', corpo: c.join('\n'), tituloArquivo: 'Semanal da gestao', ficha: [['Uso', 'Diretoria']] });
  var g = RelA4_salvar_(Ges_pastaRelatorios_('Semanal'), 'semana ' + ini, html, { compartilhar: false });
  return { salvo: g.salvo, link: g.pdfUrl, pdfUrl: g.pdfUrl, pastaUrl: g.pastaUrl, html: g.html, aviso: g.aviso };
}

/** Atividades da equipe no mês: por pessoa (prazo no mês, no prazo, com atraso, abertas atrasadas, justificativas) e motivos do atraso. */
function Ges_relatorioAtividades_(comp, quem) {
  var ini = comp + '-01', fim = Ges_fimComp_(comp), us = Ges_usuarios_(), nomeMes = Ges_nomeComp_(comp);
  var agora = typeof Atividades_agora_ === 'function' ? Atividades_agora_() : Ges_agora_();
  var todas = typeof Atividades_todas_ === 'function' ? Atividades_todas_() : [];
  var hist = typeof Atividades_abas_ === 'function' ? Ges_ler_(Atividades_abas_().HISTORICO) : [];
  var porPessoa = {}, motivos = {}, lancadas = 0;
  var pessoa = function (id) { var u = us[id]; return porPessoa[id] = porPessoa[id] || { nome: u ? u.nome : 'pessoa não identificada', area: u ? u.areaNome : '', comPrazo: 0, noPrazo: 0, comAtraso: 0, abertasAtrasadas: 0, justificativas: 0 }; };
  todas.forEach(function (a) {
    if (Ges_s_(a.CRIADO_EM).slice(0, 7) === comp || Ges_dia_(a.CRIADO_EM).slice(0, 7) === comp) lancadas++;
    if (a.SITUACAO === 'Cancelada' || !a.PRAZO || !a.RESPONSAVEL_ID) return;
    var p = a.PRAZO.slice(0, 10);
    if (p < ini || p > fim) return;
    var x = pessoa(a.RESPONSAVEL_ID);
    x.comPrazo++;
    if (a.SITUACAO === 'Concluída') { if (a.CONCLUIDA_EM && a.CONCLUIDA_EM > a.PRAZO) x.comAtraso++; else x.noPrazo++; }
    else if (a.PREVISAO_ATUAL && a.PREVISAO_ATUAL < agora) x.abertasAtrasadas++;
  });
  hist.forEach(function (h) {
    if (Ges_up_(h.TIPO) !== 'JUSTIFICATIVA' || Ges_dia_(h.DATA).slice(0, 7) !== comp) return;
    pessoa(Ges_s_(h.USUARIO_ID)).justificativas++;
    var m = Ges_s_(h.CATEGORIA) || 'Motivo não informado';
    motivos[m] = (motivos[m] || 0) + 1;
  });
  var linhas = Object.keys(porPessoa).map(function (k) { return porPessoa[k]; }).sort(function (a, b) { return (b.comAtraso + b.abertasAtrasadas) - (a.comAtraso + a.abertasAtrasadas) || a.nome.localeCompare(b.nome, 'pt-BR'); });
  var t = { comPrazo: 0, noPrazo: 0, comAtraso: 0, abertasAtrasadas: 0, justificativas: 0 };
  linhas.forEach(function (l) { Object.keys(t).forEach(function (k) { t[k] += l[k]; }); });
  var pct = Ges_pct_(t.noPrazo, t.comPrazo);
  var listaMotivos = Object.keys(motivos).map(function (m) { return { rotulo: m, valor: motivos[m] }; }).sort(function (a, b) { return b.valor - a.valor; });
  var texto = 'Em ' + nomeMes + ', ' + Ges_plural_(t.comPrazo, 'atividade tinha', 'atividades tinham') + ' prazo no mês: ' + Ges_plural_(t.noPrazo, 'foi concluída', 'foram concluídas') + ' no prazo' + (pct === null ? '' : ' (' + Ges_numBr_(pct, 1) + '%)') + ', ' +
    Ges_plural_(t.comAtraso, 'com atraso', 'com atraso') + ' e ' + Ges_plural_(t.abertasAtrasadas, 'continua aberta', 'continuam abertas') + ' depois da previsão. Foram registradas ' + Ges_plural_(t.justificativas, 'justificativa', 'justificativas') + ' de atraso' +
    (listaMotivos.length ? '; o motivo mais citado foi "' + listaMotivos[0].rotulo + '" (' + listaMotivos[0].valor + ').' : '.');
  var c = [];
  c.push(RelA4_secao_('Resumo', RelA4_kpis_([[String(lancadas), 'Lançadas no mês'], [String(t.comPrazo), 'Com prazo no mês'], [pct === null ? '—' : Ges_numBr_(pct, 1) + '%', 'Concluídas no prazo', pct !== null && pct < 80 ? 'aviso' : 'ok'],
    [String(t.comAtraso), 'Concluídas com atraso', t.comAtraso ? 'aviso' : 'ok'], [String(t.abertasAtrasadas), 'Abertas depois da previsão', t.abertasAtrasadas ? 'critico' : 'ok'], [String(t.justificativas), 'Justificativas de atraso']]) + RelA4_paragrafos_(texto)));
  c.push(RelA4_secao_('Por pessoa', RelA4_tabela_([{ t: 'Pessoa' }, { t: 'Área' }, { t: 'Com prazo no mês', num: true }, { t: 'No prazo', num: true }, { t: 'Com atraso', num: true }, { t: 'Abertas atrasadas', num: true }, { t: 'Justificativas', num: true }],
    linhas.map(function (l) { return [l.nome, l.area || '—', String(l.comPrazo), String(l.noPrazo), String(l.comAtraso), l.abertasAtrasadas ? RelA4_marca_(String(l.abertasAtrasadas), 'critico') : '0', String(l.justificativas)]; }),
    { legenda: 'Atividades com prazo no mês, por responsável', vazio: 'Nenhuma atividade com prazo no mês.', compacta: true })));
  c.push(RelA4_secao_('Motivos do atraso', listaMotivos.length >= 2 ? RelA4_barras_(listaMotivos, { titulo: 'Justificativas de atraso do mês por motivo' }) :
    RelA4_tabela_([{ t: 'Motivo' }, { t: 'Justificativas', num: true }], listaMotivos.map(function (m) { return [m.rotulo, String(m.valor)]; }), { vazio: 'Nenhuma justificativa de atraso no mês.', compacta: true })));
  c.push(RelA4_secao_('Método', '<p class="nota">Conta a atividade pelo prazo original (mês do prazo). No prazo: concluída até o prazo. Com atraso: concluída depois do prazo. Abertas atrasadas: ainda abertas com a previsão vencida na emissão. Canceladas não entram. Justificativas: registradas no mês, com o motivo escolhido pela pessoa.</p>'));
  var html = RelA4_documento_({ titulo: 'Atividades da equipe', tituloCurto: 'Atividades da equipe', sigla: 'GES-ATV', rotuloIdentificacao: 'Competência', identificacao: nomeMes,
    emitidoPor: Ges_s_(quem && (quem.nome || quem.usuario)) || 'Rotina automática', corpo: c.join('\n'), tituloArquivo: 'Atividades da equipe' });
  var g = RelA4_salvar_(Ges_pastaRelatorios_('Atividades'), comp, html, { compartilhar: false });
  return { salvo: g.salvo, link: g.pdfUrl, pdfUrl: g.pdfUrl, pastaUrl: g.pastaUrl, html: g.html, aviso: g.aviso };
}
