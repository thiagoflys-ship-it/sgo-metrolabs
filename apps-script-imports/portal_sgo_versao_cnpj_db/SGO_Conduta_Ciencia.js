/****************************************************
 * PROGRAMA DE CONDUTA — AVISOS COM CIÊNCIA, ROTINA DIÁRIA E
 * FECHAMENTO AUTOMÁTICO (2026-10-15)
 *
 * Pedido do usuário (15/10/2026), depois de setembro ficar sem fechamento:
 *  - toda a equipe recebe um aviso (balão) de cada ocorrência homologada e
 *    de cada fechamento mensal; o sistema registra quem viu, quantas vezes,
 *    quem fechou o aviso sem confirmar e quando confirmou a leitura — fim do
 *    "não apareceu nada pra mim";
 *  - o fechamento do mês passa a ser automático: se ninguém fechar até o
 *    prazo (PRAZO_FECHAMENTO_DIAS_UTEIS após o fim do mês), a rotina fecha;
 *  - rotina diária (06h): saneamento, prazos vencidos e fechamento.
 *
 * Privacidade (regra do programa, ver relatório coletivo): o aviso para a
 * equipe mostra o que aconteceu, os pontos e o impacto no benefício
 * coletivo, SEM o nome da pessoa. Só a própria pessoa vê o aviso com o
 * nome dela e o prazo de contestação.
 ****************************************************/

var CONDUTA_CIENCIA_SHEET = 'qual_ciencia';
var CONDUTA_AVISOS_JANELA_DIAS = 60;
var CONDUTA_SANEAMENTO_20261015 = 'CONDUTA_SANEAMENTO_20261015';
var CONDUTA_STATUS_HOMOLOGADAS = ['HOMOLOGADA', 'CONTESTADA', 'EM_RECURSO', 'FIRME'];
var CONDUTA_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------

/** Conta do sistema (login "admin" / nome "Administrador"): não é uma pessoa, não recebe ocorrência. */
function Conduta_ehContaGenerica_(u) {
  if (!u) return false;
  var login = String(u.USUARIO || '').trim().toLowerCase();
  var nome = String(u.NOME || '').trim().toLowerCase();
  return login === 'admin' || nome === 'administrador';
}

function Conduta_nomeCompetencia_(comp) {
  var c = Conduta_soComp_(comp);
  if (!/^\d{4}-\d{2}$/.test(c)) return String(comp || '');
  return CONDUTA_MESES[Number(c.substring(5, 7)) - 1] + '/' + c.substring(0, 4);
}

function Conduta_dataBr_(iso) {
  var d = Conduta_soData_(iso);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.substring(8, 10) + '/' + d.substring(5, 7) + '/' + d.substring(0, 4) : String(iso || '');
}

function Conduta_numBr_(v, casas) {
  var n = Number(v);
  if (!isFinite(n)) return '—';
  return n.toFixed(casas === undefined ? 1 : casas).replace('.', ',');
}

function Conduta_proximaCompetencia_(comp) {
  var a = Number(comp.substring(0, 4)), m = Number(comp.substring(5, 7)) + 1;
  if (m > 12) { m = 1; a++; }
  return a + '-' + String(m).padStart(2, '0');
}

function Conduta_ultimoDiaCompetencia_(comp) {
  var d = new Date(Number(comp.substring(0, 4)), Number(comp.substring(5, 7)), 0);
  return Conduta_formatarDataISO_(d);
}

/** Primeira competência do programa (mês em que os parâmetros foram criados). */
function Conduta_inicioPrograma_() {
  var menor = '';
  SGO_DATA.getAll(CONDUTA_SHEETS.PARAMETRO).forEach(function (p) {
    var c = Conduta_soComp_(p.CRIADO_EM);
    if (/^\d{4}-\d{2}$/.test(c) && (!menor || c < menor)) menor = c;
  });
  return menor || Conduta_competenciaDe_(Conduta_hojeISO_());
}

/** Data limite para o gestor fechar a competência; depois disso o fechamento é automático. */
function Conduta_limiteFechamento_(comp) {
  var prazo = Number(Conduta_obterParametros_().PRAZO_FECHAMENTO_DIAS_UTEIS) || 7;
  return Conduta_somarDiasUteis_(Conduta_ultimoDiaCompetencia_(comp), prazo);
}

function Conduta_fechamentoDe_(comp) {
  return SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO).find(function (f) {
    return Conduta_soComp_(f.COMPETENCIA) === comp && (f.CONGELADO === true || SGO_UTILS.safeUpper(f.CONGELADO) === 'TRUE');
  }) || null;
}

// ------------------------------------------------------------
// FAROL: o que ainda está em apuração e o mês anterior
// ------------------------------------------------------------
function Conduta_emApuracao_(competencia, apurado) {
  var p = Conduta_obterParametros_();
  var registradas = 0, emDefesa = 0, pontosEmDefesa = 0;
  SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).forEach(function (o) {
    if (Conduta_soComp_(o.COMPETENCIA || o.DATA_FATO) !== competencia) return;
    var st = SGO_UTILS.safeUpper(o.STATUS);
    if (st === 'REGISTRADA') registradas++;
    else if (st === 'HOMOLOGADA' || st === 'CONTESTADA' || st === 'EM_RECURSO') { emDefesa++; pontosEmDefesa += Number(o.PESO_APLICADO) || 0; }
  });
  var dPrevisto = Number(apurado.D || 0) + pontosEmDefesa;
  var icoPrevisto = CondutaCalculo.calcularICO(dPrevisto, apurado.n || 1, Number(p.K_SENSIBILIDADE) || 5.0);
  return {
    registradas: registradas, emDefesa: emDefesa, pontosEmDefesa: pontosEmDefesa,
    dPrevisto: dPrevisto, icoPrevisto: icoPrevisto,
    farolPrevisto: CondutaCalculo.determinarFarol(icoPrevisto, apurado.temGG, Number(p.ICO_VERDE_MIN) || 85.0, Number(p.ICO_AMARELO_MIN) || 70.0)
  };
}

function Conduta_resumoMesAnterior_(competencia) {
  var ant = CondutaRel_competenciaAnterior_(competencia);
  if (ant < Conduta_inicioPrograma_()) return null;
  var f = Conduta_fechamentoDe_(ant);
  if (f) {
    return {
      competencia: ant, nome: Conduta_nomeCompetencia_(ant), fechado: true, automatico: f.FECHADO_POR === 'SISTEMA',
      D: Number(f.D) || 0, ico: Number(f.ICO), farol: f.FAROL, temGG: f.TEM_GG === true || SGO_UTILS.safeUpper(f.TEM_GG) === 'TRUE',
      fechadoEm: Conduta_soData_(f.FECHADO_EM), observacao: f.OBSERVACAO || ''
    };
  }
  var ap = Conduta_apurarCompetencia_(ant);
  return {
    competencia: ant, nome: Conduta_nomeCompetencia_(ant), fechado: false,
    D: ap.D, ico: ap.ico, farol: ap.farol, temGG: ap.temGG,
    pendencias: Conduta_pendenciasCompetencia_(ant).length, limiteFechamento: Conduta_limiteFechamento_(ant),
    prazoVencido: Conduta_hojeISO_() > Conduta_limiteFechamento_(ant)
  };
}

// ------------------------------------------------------------
// AVISOS (balão) — derivados dos dados; a ciência fica em qual_ciencia
// ------------------------------------------------------------

/** Todos os avisos vigentes (sem filtro de pessoa). */
function Conduta_avisosVigentes_() {
  var limite = Conduta_formatarDataISO_(new Date(Date.now() - CONDUTA_AVISOS_JANELA_DIAS * 864e5));
  var p = Conduta_obterParametros_();
  var tipos = {};
  SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA_TIPO).forEach(function (t) { tipos[SGO_UTILS.safeUpper(t.CODIGO)] = t; });
  var usuarios = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { usuarios[String(u.ID)] = u; });
  var avisos = [];

  SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).forEach(function (o) {
    var st = SGO_UTILS.safeUpper(o.STATUS);
    if (CONDUTA_STATUS_HOMOLOGADAS.indexOf(st) < 0) return;
    var homologada = Conduta_soData_(o.HOMOLOGADA_EM) || Conduta_soData_(o.DATA_FATO);
    if (homologada < limite) return;
    var t = tipos[SGO_UTILS.safeUpper(o.TIPO_CODIGO)] || {};
    var comp = Conduta_soComp_(o.COMPETENCIA || o.DATA_FATO);
    var situacao = st === 'FIRME' ? 'Firme: já conta no demérito da equipe.'
      : st === 'HOMOLOGADA' ? 'Em prazo de contestação até ' + Conduta_dataBr_(o.PRAZO_CONTESTACAO) + ' — passa a contar quando ficar firme.'
      : 'Em análise (contestação/recurso) — só conta se for mantida.';
    var colab = usuarios[String(o.COLABORADOR_ID)];
    avisos.push({
      tipo: 'OCORRENCIA', ref: String(o.ID), competencia: comp, data: homologada,
      titulo: 'Ocorrência homologada · ' + (t.DESCRICAO || o.TIPO_CODIGO),
      linhas: [
        'Código ' + o.TIPO_CODIGO + (t.GRUPO ? ' · ' + t.GRUPO : '') + ' · nível ' + (o.NIVEL_APLICADO || t.NIVEL || '—') + ' · ' + Conduta_numBr_(o.PESO_APLICADO, 0) + ' ponto(s) de demérito',
        'Data do fato: ' + Conduta_dataBr_(o.DATA_FATO) + ' · conta no mês de ' + Conduta_nomeCompetencia_(comp),
        situacao,
        'O demérito é coletivo: cada ponto reduz o ICO de toda a equipe e pode tirar o bônus de todos.'
      ],
      colaboradorId: String(o.COLABORADOR_ID || ''),
      contaSistema: Conduta_ehContaGenerica_(colab),
      prazoContestacao: Conduta_soData_(o.PRAZO_CONTESTACAO), status: st, legenda: o.FOTO_LEGENDA || ''
    });
  });

  SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO).forEach(function (f) {
    var em = Conduta_soData_(f.FECHADO_EM);
    if (!em || em < limite) return;
    var comp = Conduta_soComp_(f.COMPETENCIA);
    var temGG = f.TEM_GG === true || SGO_UTILS.safeUpper(f.TEM_GG) === 'TRUE';
    var preservado = f.FAROL === 'VERDE' && !temGG;
    avisos.push({
      tipo: 'FECHAMENTO', ref: comp, competencia: comp, data: em,
      titulo: 'Resultado de ' + Conduta_nomeCompetencia_(comp) + ': farol ' + f.FAROL + (preservado ? ' · bônus coletivo preservado' : ' · bônus coletivo perdido'),
      linhas: [
        'ICO ' + Conduta_numBr_(f.ICO) + ' · demérito ' + Conduta_numBr_(f.D, 0) + ' ponto(s) · ' + Conduta_numBr_(f.N, 0) + ' colaborador(es) na conta',
        temGG ? 'Houve infração gravíssima firme no mês, o que cancela o bônus coletivo.' : (preservado ? 'A equipe ficou na faixa verde (ICO ≥ ' + Conduta_numBr_(p.ICO_VERDE_MIN || 85) + ').' : 'A equipe ficou abaixo da faixa verde (ICO < ' + Conduta_numBr_(p.ICO_VERDE_MIN || 85) + ').'),
        (f.FECHADO_POR === 'SISTEMA' ? 'Fechamento automático em ' : 'Fechado em ') + Conduta_dataBr_(em) + '.' + (f.OBSERVACAO ? ' ' + f.OBSERVACAO : '')
      ]
    });
  });

  return avisos.sort(function (a, b) { return String(a.data).localeCompare(String(b.data)); });
}

function Conduta_cienciasDe_(usuarioId) {
  var mapa = {};
  SGO_DATA.getAll(CONDUTA_CIENCIA_SHEET).forEach(function (c) {
    if (usuarioId && String(c.USUARIO_ID) !== String(usuarioId)) return;
    mapa[c.AVISO_TIPO + '|' + c.REF_ID + '|' + c.USUARIO_ID] = c;
  });
  return mapa;
}

/** Balão: avisos que a pessoa ainda não confirmou. Cada entrega fica registrada (quando e quantas vezes viu). */
function Conduta_apiObterAvisos(sessionId) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  var eu = String(sessao.userId);
  var ciencias = Conduta_cienciasDe_(eu);
  var agora = SGO_UTILS.nowIso();
  var pendentes = Conduta_avisosVigentes_().filter(function (a) {
    var c = ciencias[a.tipo + '|' + a.ref + '|' + eu];
    return !(c && Conduta_soData_(c.CIENTE_EM));
  }).map(function (a) {
    var minha = a.tipo === 'OCORRENCIA' && a.colaboradorId === eu;
    var linhas = a.linhas.slice();
    if (minha) {
      linhas.unshift('Esta ocorrência foi lançada em seu nome.' + (a.status === 'HOMOLOGADA' && a.prazoContestacao ? ' Se não concordar, conteste no módulo Conduta até ' + Conduta_dataBr_(a.prazoContestacao) + '.' : ''));
      if (a.legenda) linhas.push('Registro do fiscal: ' + a.legenda);
    } else if (a.tipo === 'OCORRENCIA' && a.contaSistema) {
      linhas.push('Lançada sem pessoa identificada (conta do sistema).');
    }
    return { tipo: a.tipo, ref: a.ref, titulo: a.titulo, linhas: linhas, minha: minha, competencia: a.competencia };
  });

  pendentes.forEach(function (a) {
    var c = ciencias[a.tipo + '|' + a.ref + '|' + eu];
    if (c) {
      SGO_DATA.update(CONDUTA_CIENCIA_SHEET, c.ID, { ULTIMA_EXIBICAO_EM: agora, QTD_EXIBICOES: (Number(c.QTD_EXIBICOES) || 0) + 1 });
    } else {
      SGO_DATA.insert(CONDUTA_CIENCIA_SHEET, {
        AVISO_TIPO: a.tipo, REF_ID: a.ref, COMPETENCIA: a.competencia, USUARIO_ID: eu,
        PRIMEIRA_EXIBICAO_EM: agora, ULTIMA_EXIBICAO_EM: agora, QTD_EXIBICOES: 1, QTD_FECHOU_SEM_CIENCIA: 0
      });
    }
  });
  return { ok: true, avisos: pendentes };
}

/** acao CIENTE (confirmou a leitura) ou FECHOU (fechou o balão sem confirmar) — as duas ficam registradas. */
function Conduta_apiRegistrarCiencia(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var acao = SGO_UTILS.safeUpper(payload.acao);
  if (acao !== 'CIENTE' && acao !== 'FECHOU') throw new Error('Ação inválida.');
  var eu = String(sessao.userId);
  var ciencias = Conduta_cienciasDe_(eu);
  var agora = SGO_UTILS.nowIso();
  var n = 0;
  (Array.isArray(payload.itens) ? payload.itens : []).forEach(function (it) {
    var tipo = SGO_UTILS.safeUpper(it && it.tipo), ref = String(it && it.ref || '');
    if (!ref || (tipo !== 'OCORRENCIA' && tipo !== 'FECHAMENTO')) return;
    var c = ciencias[tipo + '|' + ref + '|' + eu];
    var campos = acao === 'CIENTE' ? { CIENTE_EM: agora } : { FECHOU_SEM_CIENCIA_EM: agora, QTD_FECHOU_SEM_CIENCIA: (c ? Number(c.QTD_FECHOU_SEM_CIENCIA) || 0 : 0) + 1 };
    if (c) {
      if (acao === 'CIENTE' && Conduta_soData_(c.CIENTE_EM)) return;
      SGO_DATA.update(CONDUTA_CIENCIA_SHEET, c.ID, campos);
    } else {
      SGO_DATA.insert(CONDUTA_CIENCIA_SHEET, Object.assign({
        AVISO_TIPO: tipo, REF_ID: ref, COMPETENCIA: Conduta_soComp_(it.competencia), USUARIO_ID: eu,
        PRIMEIRA_EXIBICAO_EM: agora, ULTIMA_EXIBICAO_EM: agora, QTD_EXIBICOES: 1, QTD_FECHOU_SEM_CIENCIA: 0
      }, campos));
    }
    n++;
  });
  if (acao === 'CIENTE' && n) SGO_DATA.log('CONDUTA_CIENCIA', sessao.usuario, n + ' aviso(s) confirmados', 'CONDUTA');
  return { ok: true, registrados: n };
}

/** Gestão: para cada aviso, quem confirmou, quem viu e fechou sem confirmar e quem nunca viu. */
function Conduta_apiPainelCiencia(sessionId) {
  Conduta_exigirGestor_(sessionId);
  var equipe = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
    return SGO_UTILS.safeUpper(u.STATUS) === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE' && !Conduta_ehContaGenerica_(u);
  }).sort(function (a, b) { return String(a.NOME).localeCompare(String(b.NOME)); });
  var ciencias = Conduta_cienciasDe_(null);
  return {
    ok: true,
    avisos: Conduta_avisosVigentes_().reverse().map(function (a) {
      var pessoas = equipe.map(function (u) {
        var c = ciencias[a.tipo + '|' + a.ref + '|' + u.ID];
        var situacao = !c ? 'NUNCA_VIU' : Conduta_soData_(c.CIENTE_EM) ? 'CIENTE' : 'VIU_SEM_CONFIRMAR';
        return {
          nome: u.NOME, situacao: situacao,
          cienteEm: c ? String(c.CIENTE_EM || '') : '', primeiraVez: c ? String(c.PRIMEIRA_EXIBICAO_EM || '') : '',
          ultimaVez: c ? String(c.ULTIMA_EXIBICAO_EM || '') : '', exibicoes: c ? Number(c.QTD_EXIBICOES) || 0 : 0,
          fechouSemConfirmar: c ? Number(c.QTD_FECHOU_SEM_CIENCIA) || 0 : 0
        };
      });
      return {
        tipo: a.tipo, ref: a.ref, titulo: a.titulo, competencia: Conduta_nomeCompetencia_(a.competencia), data: Conduta_dataBr_(a.data),
        cientes: pessoas.filter(function (x) { return x.situacao === 'CIENTE'; }).length, total: pessoas.length, pessoas: pessoas
      };
    })
  };
}

/** Chamado no fim de todo fechamento: o aviso em si nasce do registro em qual_fechamento. */
function Conduta_avisarFechamento_(competencia, resultado) {
  SGO_DATA.log('CONDUTA_FECHAMENTO_AVISO', 'sistema', competencia + ': farol ' + resultado.farol + ', ICO ' + resultado.ico, 'CONDUTA');
}

// ------------------------------------------------------------
// ROTINA DIÁRIA + FECHAMENTO AUTOMÁTICO
// ------------------------------------------------------------

/** Chamada no topo do dispatch: no máximo uma checagem por dia. Instala a rotina das 06h e, na 1ª vez, roda já. */
function Conduta_garantirRotina_() {
  var props = PropertiesService.getScriptProperties();
  var hoje = Conduta_hojeISO_();
  if (props.getProperty('CONDUTA_ROTINA_CHECADA_EM') === hoje) return;
  var gatilhos = ScriptApp.getProjectTriggers();
  var temDiaria = gatilhos.some(function (t) { return t.getHandlerFunction() === 'Conduta_rotinaDiaria_'; });
  gatilhos.forEach(function (t) {
    // a checagem antiga (só prazos) é substituída pela rotina completa
    if (t.getHandlerFunction() === 'Conduta_processarPrazosVencidos_') ScriptApp.deleteTrigger(t);
  });
  if (!temDiaria) ScriptApp.newTrigger('Conduta_rotinaDiaria_').timeBased().everyDays(1).atHour(6).inTimezone('America/Sao_Paulo').create();
  if (props.getProperty(CONDUTA_SANEAMENTO_20261015) !== '1' &&
      !gatilhos.some(function (t) { return t.getHandlerFunction() === 'Conduta_rotinaImediata_'; })) {
    ScriptApp.newTrigger('Conduta_rotinaImediata_').timeBased().after(60 * 1000).create();
  }
  props.setProperty('CONDUTA_ROTINA_CHECADA_EM', hoje);
}

/** Execução única logo após a publicação (saneamento + fechamento de setembro); apaga o próprio gatilho. */
function Conduta_rotinaImediata_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'Conduta_rotinaImediata_') ScriptApp.deleteTrigger(t);
  });
  return Conduta_rotinaDiaria_();
}

function Conduta_rotinaDiaria_() {
  Conduta_setup_();
  var r = { saneamento: Conduta_saneamento20261015_(), prazos: Conduta_processarPrazosVencidos_(), fechamentos: Conduta_fecharAutomatico_() };
  SGO_DATA.log('CONDUTA_ROTINA', 'sistema', JSON.stringify(r).slice(0, 900), 'CONDUTA');
  return r;
}

function Conduta_apiRodarRotinaAgora(sessionId) {
  Conduta_exigirGestor_(sessionId);
  return Conduta_rotinaDiaria_();
}

/** Para o farol: há algo que a rotina ainda precisa aplicar (saneamento ou mês vencido sem fechar)? */
function Conduta_rotinaPendente_(anterior) {
  if (PropertiesService.getScriptProperties().getProperty(CONDUTA_SANEAMENTO_20261015) !== '1') return true;
  return !!(anterior && !anterior.fechado && anterior.prazoVencido && !anterior.pendencias);
}

/** Fecha sozinho todo mês encerrado que passou do prazo e não tem pendência; os que têm pendência ficam no farol. */
function Conduta_fecharAutomatico_() {
  var hoje = Conduta_hojeISO_(), atual = Conduta_competenciaDe_(hoje);
  var fechados = [], aguardando = [];
  for (var comp = Conduta_inicioPrograma_(), voltas = 0; comp < atual && voltas < 36; comp = Conduta_proximaCompetencia_(comp), voltas++) {
    if (Conduta_fechamentoDe_(comp)) continue;
    var limite = Conduta_limiteFechamento_(comp);
    if (hoje <= limite) { aguardando.push(comp + ' (prazo do gestor até ' + limite + ')'); continue; }
    var pend = Conduta_pendenciasCompetencia_(comp);
    if (pend.length) { aguardando.push(comp + ' (' + pend.length + ' pendência(s) de defesa)'); continue; }
    var obs = comp === '2026-09'
      ? 'Fechamento automático em ' + Conduta_dataBr_(hoje) + '. Registro retroativo: o bônus coletivo de setembro/2026 já tinha sido pago antes do fechamento oficial; as 2 ocorrências do mês (24/09) entram aqui.'
      : 'Fechamento automático: ninguém fechou até o prazo (' + Conduta_dataBr_(limite) + ').';
    try {
      Conduta_fecharCompetencia_(comp, 'SISTEMA', 'Fechamento automático', obs);
      fechados.push(comp);
    } catch (e) {
      aguardando.push(comp + ' (falha: ' + String(e && e.message || e) + ')');
    }
  }
  return { fechados: fechados, aguardando: aguardando };
}

/**
 * Saneamento único de 15/10/2026 (pedido do usuário):
 *  1. sai do modo sombra — o programa passa a valer de vez (setembro já foi pago);
 *  2. a ocorrência RH-02 de 14/10/2026 lançada errado (ainda REGISTRADA) é rejeitada
 *     (fica no histórico como REJEITADA, com o motivo — não conta em nada).
 */
function Conduta_saneamento20261015_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(CONDUTA_SANEAMENTO_20261015) === '1') return 'já aplicado';
  var feito = [];
  var sombra = SGO_DATA.getAll(CONDUTA_SHEETS.PARAMETRO).find(function (p) { return String(p.CHAVE).trim() === 'MODO_SOMBRA_ATE'; });
  if (sombra && String(sombra.VALOR || '') !== '') {
    SGO_DATA.update(CONDUTA_SHEETS.PARAMETRO, sombra.ID, { VALOR: '' });
    feito.push('modo sombra desligado');
  }
  // ainda REGISTRADA → REJEITADA; se alguém já homologou → ANULADA (não conta em nada, fica no histórico)
  var errada = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).find(function (o) {
    return SGO_UTILS.safeUpper(o.TIPO_CODIGO) === 'RH-02' && Conduta_soData_(o.DATA_FATO) === '2026-10-14' &&
      ['REGISTRADA', 'HOMOLOGADA', 'CONTESTADA', 'EM_RECURSO', 'FIRME'].indexOf(SGO_UTILS.safeUpper(o.STATUS)) >= 0;
  });
  if (errada) {
    var registrada = SGO_UTILS.safeUpper(errada.STATUS) === 'REGISTRADA';
    var camposErrada = { STATUS: registrada ? 'REJEITADA' : 'ANULADA', JULGADA_EM: Conduta_hojeISO_(), JULGADA_POR: 'SISTEMA',
      TEXTO_JULGAMENTO: (registrada ? 'Rejeitada' : 'Anulada') + ' a pedido da direção em 15/10/2026: lançamento incorreto.' };
    if (!registrada) camposErrada.ANULADA_EM = Conduta_hojeISO_();
    SGO_DATA.update(CONDUTA_SHEETS.OCORRENCIA, errada.ID, camposErrada);
    feito.push('ocorrência RH-02 de 14/10 ' + (registrada ? 'rejeitada' : 'anulada'));
  }
  props.setProperty(CONDUTA_SANEAMENTO_20261015, '1');
  SGO_DATA.log('CONDUTA_SANEAMENTO_20261015', 'sistema', feito.join('; ') || 'nada a fazer', 'CONDUTA');
  return feito;
}
