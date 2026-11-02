/****************************************************
 * SGO+ LICITAÇÕES — AGENDA DE PRAZOS (etapa 3, 02/11/2026)
 *
 * Documentos de origem: docs/LICITACOES_03_REGRAS_NEGOCIO_20261101.md (A3 prazos, A3.2 contagem, A3.3 fuso, A6 mapa de
 * eventos, A7 o que a automação não interpreta), LICITACOES_01 (modelo LIC_EVENTOS) e LICITACOES_04 (protótipo agenda.html).
 *
 * O sistema cria os prazos a partir da fonte (PNCP / Compras.gov.br), cada um com a fonte e a NATUREZA:
 *   - CONFIRMADO: veio da fonte (dataAberturaProposta, dataEncerramentoProposta) ou foi conferido por uma pessoa no edital;
 *   - CALCULADO: regra legal sobre a data da fonte (impugnação e esclarecimento pelo art. 164 da Lei 14.133/2021 ou pelo
 *     art. 87, § 1º, da Lei 13.303/2016; razões de recurso pelo art. 165 a partir da data da ata informada). Sempre marcado
 *     como cálculo, com a regra escrita e o aviso de que feriado estadual ou municipal do órgão não chega por API;
 *   - PREVISTO (pendente de confirmação): depende do edital ou de ato do pregoeiro (sessão fora do Compras.gov.br,
 *     esclarecimento de estatal, regime jurídico desconhecido, data da fonte incoerente). Não gera alerta até uma pessoa
 *     confirmar a data ("Confirmar data", com o fuso e onde conferiu).
 *
 * Dias úteis (art. 183): exclui o dia do começo e inclui o do vencimento. Prazo contado PARA TRÁS (impugnação,
 * esclarecimento) usa o calendário conservador: fins de semana, feriados nacionais fixos, Carnaval, Sexta-feira Santa e
 * Corpus Christi (SGO_Expediente.js) e os feriados cadastrados da empresa; o limite interno dos alertas fica 1 dia útil
 * antes, às 17:00. Prazo contado PARA FRENTE (recurso) usa só os feriados nacionais fixos (nunca passa do limite real).
 *
 * Retificação na fonte que muda uma data: a linha do prazo NÃO é alterada; nasce a versão nova (SUBSTITUI_ID) e a anterior
 * fica RETIFICADO, com o motivo (de → para). Os alertas pendentes do prazo antigo são cancelados com o motivo e o alerta de
 * mudança é criado (SGO_Licitacoes_Alertas.js). Suspensão na fonte: prazos SUSPENSO; revogação ou anulação: CANCELADO;
 * alerta crítico e cancelamento dos alertas pendentes com o motivo. Reabertura (a situação volta): prazos de novo ATIVO.
 * Nada é apagado; tudo vai para o LIC_HISTORICO.
 ****************************************************/

var LIC_EVENTO_TIPOS = {
  ABERTURA_PROPOSTAS: { nome: 'Início do recebimento das propostas', nivel: 'NORMAL', ordem: 1 },
  PRAZO_ESCLARECIMENTO: { nome: 'Limite para pedir esclarecimento', nivel: 'IMPORTANTE', ordem: 2 },
  PRAZO_IMPUGNACAO: { nome: 'Limite para impugnar o edital', nivel: 'IMPORTANTE', ordem: 3 },
  LIMITE_PROPOSTA: { nome: 'Fim do envio das propostas', nivel: 'CRITICO', ordem: 4 },
  SESSAO_PUBLICA: { nome: 'Abertura da sessão pública', nivel: 'CRITICO', ordem: 5 },
  PRAZO_RECURSO: { nome: 'Razões de recurso', nivel: 'IMPORTANTE', ordem: 6 }
};
var LIC_NATUREZAS = { CONFIRMADO: 'Confirmado', CALCULADO: 'Calculado (regra legal)', PREVISTO: 'Pendente de confirmação' };
var LIC_EVENTO_SITUACOES = { ATIVO: 'Valendo', RETIFICADO: 'Substituído por versão nova', SUSPENSO: 'Suspenso na fonte', CANCELADO: 'Cancelado' };
/** Versão das regras de cálculo: mudou = a agenda de todas as oportunidades é recalculada na próxima rodada. */
var LIC_AGENDA_REGRAS = '2026-11-02.1';
var LIC_FUSOS = { 'America/Sao_Paulo': { nome: 'Brasília', off: '-03:00' }, 'America/Manaus': { nome: 'Manaus', off: '-04:00' }, 'America/Cuiaba': { nome: 'Cuiabá', off: '-04:00' },
  'America/Campo_Grande': { nome: 'Campo Grande', off: '-04:00' }, 'America/Porto_Velho': { nome: 'Porto Velho', off: '-04:00' }, 'America/Boa_Vista': { nome: 'Boa Vista', off: '-04:00' },
  'America/Rio_Branco': { nome: 'Rio Branco', off: '-05:00' }, 'America/Noronha': { nome: 'Fernando de Noronha', off: '-02:00' } };
var LIC_FERIADOS_NOMES = { '01-01': 'Confraternização Universal', '04-21': 'Tiradentes', '05-01': 'Dia do Trabalho', '09-07': 'Independência', '10-12': 'Nossa Senhora Aparecida',
  '11-02': 'Finados', '11-15': 'Proclamação da República', '11-20': 'Dia da Consciência Negra', '12-25': 'Natal' };
var LIC_FERIADOS_FIXOS_PADRAO = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
var LIC_DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
var LIC_DIAS_SEMANA_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

// ------------------------------------------------------------ datas (fuso de Brasília; sem horário de verão desde 2019)
/** Texto da fonte sem fuso ("2026-11-13T08:00:00") → instante ISO presumindo Brasília. Texto com fuso é respeitado. */
function Lic_instanteDe_(texto, off) {
  var t = Lic_s_(texto);
  if (!t) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) t += 'T00:00:00';
  var ms = Date.parse(/(Z|[+-]\d{2}:?\d{2})$/.test(t) ? t : t + (off || '-03:00'));
  return isFinite(ms) ? new Date(ms).toISOString() : '';
}
function Lic_isoLocal_(dia, hora, off) { var ms = Date.parse(dia + 'T' + (hora || '00:00') + ':00' + (off || '-03:00')); return isFinite(ms) ? new Date(ms).toISOString() : ''; }
function Lic_diaSp_(iso) { var ms = Date.parse(Lic_s_(iso)); return isFinite(ms) ? Utilities.formatDate(new Date(ms), 'America/Sao_Paulo', 'yyyy-MM-dd') : ''; }
function Lic_horaSp_(iso) { var ms = Date.parse(Lic_s_(iso)); return isFinite(ms) ? Utilities.formatDate(new Date(ms), 'America/Sao_Paulo', 'HH:mm') : ''; }
function Lic_semanaDe_(dia) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() : -1; }
function Lic_somarDia_(dia, n) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia), t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + n * 864e5);
  return t.getUTCFullYear() + '-' + ('0' + (t.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + t.getUTCDate()).slice(-2);
}
/** "sex 13/11/2026" */
function Lic_brDia_(dia) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(Lic_s_(dia)); return m ? LIC_DIAS_SEMANA[Lic_semanaDe_(dia)] + ' ' + m[3] + '/' + m[2] + '/' + m[1] : ''; }
/** "sex 13/11/2026 08:00" em Brasília */
function Lic_brDiaHora_(iso) { var d = Lic_diaSp_(iso); return d ? Lic_brDia_(d) + ' ' + Lic_horaSp_(iso) : ''; }

/** Motivo de o dia não ter expediente no órgão ('' = dia útil). contagem 'TRAS' (conservadora) ou 'FRENTE' (só os fixos). */
function Lic_motivoNaoUtil_(dia, contagem) {
  var w = Lic_semanaDe_(dia);
  if (w === 0) return 'domingo';
  if (w === 6) return 'sábado';
  var fixos = typeof SGO_FERIADOS_FIXOS !== 'undefined' ? SGO_FERIADOS_FIXOS : LIC_FERIADOS_FIXOS_PADRAO, md = dia.slice(5);
  if (fixos.indexOf(md) >= 0) return 'feriado nacional' + (LIC_FERIADOS_NOMES[md] ? ' (' + LIC_FERIADOS_NOMES[md] + ')' : '');
  if (contagem !== 'TRAS') return '';
  try { if (typeof SGO_expedienteMoveis_ === 'function' && SGO_expedienteMoveis_(Number(dia.slice(0, 4))).indexOf(dia) >= 0) return 'feriado ou ponto facultativo nacional (Carnaval, Sexta-feira Santa ou Corpus Christi)'; } catch (e) {}
  try { var ex = typeof SGO_expediente_ === 'function' ? (SGO_expediente_().extras || []) : []; if (ex.indexOf(md) >= 0 || ex.indexOf(dia) >= 0) return 'feriado cadastrado no SGO+'; } catch (e) {}
  return '';
}
/** O n-ésimo dia útil ANTES de dia (dia não conta). Devolve { dia, pulados: ["02/11 (feriado nacional (Finados))"] }. */
function Lic_diasUteisAntes_(dia, n) {
  var d = dia, k = 0, pulados = [];
  for (var i = 0; i < 60 && k < n; i++) {
    d = Lic_somarDia_(d, -1);
    var mot = Lic_motivoNaoUtil_(d, 'TRAS');
    if (mot) { if (!/^(sábado|domingo)$/.test(mot)) pulados.push(d.slice(8, 10) + '/' + d.slice(5, 7) + ' (' + mot + ')'); continue; }
    k++;
  }
  return { dia: d, pulados: pulados };
}
/** O n-ésimo dia útil DEPOIS de dia (dia não conta), só com os feriados nacionais fixos. */
function Lic_diasUteisDepois_(dia, n) {
  var d = dia, k = 0, pulados = [];
  for (var i = 0; i < 60 && k < n; i++) {
    d = Lic_somarDia_(d, 1);
    var mot = Lic_motivoNaoUtil_(d, 'FRENTE');
    if (mot) { if (!/^(sábado|domingo)$/.test(mot)) pulados.push(d.slice(8, 10) + '/' + d.slice(5, 7) + ' (' + mot + ')'); continue; }
    k++;
  }
  return { dia: d, pulados: pulados };
}
/** Situação da fonte que muda a agenda: SUSPENSAO, REVOGACAO, ANULACAO ou '' (divulgada / em andamento). */
function Lic_estadoFonte_(sit) {
  var s = Lic_s_(sit).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/revogad/.test(s)) return 'REVOGACAO';
  if (/anulad/.test(s)) return 'ANULACAO';
  if (/suspens/.test(s)) return 'SUSPENSAO';
  return '';
}
var LIC_ESTADO_FONTE_NOMES = { SUSPENSAO: 'suspensa', REVOGACAO: 'revogada', ANULACAO: 'anulada' };

// ------------------------------------------------------------ cálculo dos prazos de uma oportunidade
/** Base da agenda: mudou = recalcular (datas, lei, modalidade, onde é a sessão, situação na fonte e no SGO+, regras). */
function Lic_agendaBase_(l) {
  return Lic_hash_([LIC_AGENDA_REGRAS, l.ABERTURA_PROPOSTAS, l.ENCERRAMENTO_PROPOSTAS, l.ENCERRAMENTO_ISO, l.LEI, l.MODALIDADE, l.PORTAL_SESSAO, l.SITUACAO_FONTE, l.SITUACAO, l.UF,
    typeof SGO_expediente_ === 'function' ? (SGO_expediente_().extras || []).join(',') : ''].map(Lic_s_).join('|'));
}

/** Os prazos que a fonte e a lei dão para esta oportunidade agora (sem gravar). */
function Lic_eventosDesejados_(l) {
  var out = [], origem = Lic_s_(l.PORTAL_ORIGEM) === 'COMPRAS_GOV' ? 'Compras.gov.br dados abertos' : 'PNCP (API de consulta)';
  var nc = Lic_s_(l.NUMERO_CONTROLE_PNCP), vf = Number(l.VERSAO_FONTE) || 1, ref = function (campo) { return origem + ' · ' + campo + ' · ' + nc + ' · versão ' + vf + ' da fonte'; };
  var fusoNome = 'Brasília' + (Lic_s_(l.FUSO_PRESUMIDO) === 'SIM' ? ', presumido (a fonte não informa o fuso)' : '');
  var dispensa = /dispensa/i.test(Lic_s_(l.MODALIDADE)), inex = /inexigib/i.test(Lic_s_(l.MODALIDADE));
  var abIso = Lic_instanteDe_(l.ABERTURA_PROPOSTAS), encIso = Lic_s_(l.ENCERRAMENTO_ISO) || Lic_instanteDe_(l.ENCERRAMENTO_PROPOSTAS);
  var incoerente = abIso && encIso && Date.parse(encIso) - Date.parse(abIso) < 3600000;
  var base = { fuso: 'America/Sao_Paulo', fusoPresumido: Lic_s_(l.FUSO_PRESUMIDO) === 'SIM' };
  if (abIso) out.push(Object.assign({}, base, { tipo: 'ABERTURA_PROPOSTAS', natureza: incoerente ? 'PREVISTO' : 'CONFIRMADO', quandoIso: abIso, quandoTexto: Lic_s_(l.ABERTURA_PROPOSTAS), baseIso: abIso,
    fonte: 'FONTE', fonteRef: ref('dataAberturaProposta'), regra: '', obs: incoerente ? 'Data da fonte incoerente: abertura ' + Lic_brDiaHora_(abIso) + ' e encerramento ' + Lic_brDiaHora_(encIso) + '. Nenhum alerta até alguém confirmar no edital.' : 'Horário ' + fusoNome + '.' }));
  if (!encIso) return out;
  var naCgov = Lic_up_(l.PORTAL_SESSAO) === 'PUB-002';
  out.push(Object.assign({}, base, { tipo: 'LIMITE_PROPOSTA', nome: naCgov && !dispensa ? 'Fim do envio das propostas e abertura da sessão' : dispensa ? 'Fim do envio das propostas (dispensa)' : '',
    natureza: incoerente ? 'PREVISTO' : 'CONFIRMADO', quandoIso: encIso, quandoTexto: Lic_s_(l.ENCERRAMENTO_PROPOSTAS), baseIso: encIso, fonte: 'FONTE', fonteRef: ref('dataEncerramentoProposta'),
    regra: naCgov && !dispensa ? 'No Compras.gov.br a proposta vai até a abertura da sessão (IN SEGES/ME 73/2022, art. 18).' : '',
    obs: incoerente ? 'Data da fonte incoerente: abertura ' + Lic_brDiaHora_(abIso) + ' e encerramento ' + Lic_brDiaHora_(encIso) + '. Nenhum alerta até alguém confirmar no edital.' : 'Horário ' + fusoNome + '.' + (Lic_s_(l.FUSO_ALERTA) && /outro fuso/.test(Lic_s_(l.FUSO_ALERTA)) ? ' ' + Lic_s_(l.FUSO_ALERTA) : '') }));
  if (!naCgov && !dispensa && !inex) out.push(Object.assign({}, base, { tipo: 'SESSAO_PUBLICA', natureza: 'PREVISTO', quandoIso: encIso, quandoTexto: Lic_s_(l.ENCERRAMENTO_PROPOSTAS), baseIso: encIso, fonte: 'FONTE',
    fonteRef: ref('dataEncerramentoProposta (data indicativa)'), regra: '', obs: 'A fonte não informa a hora da sessão. Em geral ela abre no fim das propostas; confirme no edital' + (Lic_s_(l.PORTAL_SESSAO_NOME) ? ' (publicado por ' + Lic_s_(l.PORTAL_SESSAO_NOME) + ')' : '') + '. Sem confirmação, não há alerta da sessão (o fim das propostas já tem os seus).' }));
  if (dispensa || inex) return out;
  var diaAb = Lic_diaSp_(encIso), lei = Lic_s_(l.LEI);
  var calc = function (tipo, n, regraLei) {
    var r = Lic_diasUteisAntes_(diaAb, n), interno = Lic_diasUteisAntes_(r.dia, 1);
    return Object.assign({}, base, { tipo: tipo, natureza: 'CALCULADO', quandoIso: Lic_isoLocal_(r.dia, '23:59'), quandoTexto: r.dia, diaTodo: true, baseIso: encIso,
      limiteInternoIso: Lic_isoLocal_(interno.dia, '17:00'), fonte: 'CALCULO', fonteRef: 'Cálculo do SGO+ sobre a data de abertura da fonte (' + Lic_brDiaHora_(encIso) + ')',
      regra: regraLei + ' Contagem do art. 183: ' + n + ' dias úteis antes de ' + Lic_brDia_(diaAb) + (r.pulados.length ? '; não contam ' + r.pulados.join(', ') : '') + '. Calendário nacional conhecido: feriado estadual ou municipal do órgão não chega por API; confirme no edital.',
      obs: 'Limite interno dos alertas: ' + Lic_brDia_(interno.dia) + ' 17:00 (1 dia útil de folga). O edital costuma fixar o canal e a hora.' });
  };
  if (incoerente) {
    // data da fonte incoerente: nada é calculado sobre ela (doc 03, A7); a pessoa confirma o limite das propostas e informa os demais
    ['PRAZO_IMPUGNACAO', 'PRAZO_ESCLARECIMENTO'].forEach(function (t) {
      out.push(Object.assign({}, base, { tipo: t, natureza: 'PREVISTO', quandoIso: '', baseIso: encIso, fonte: 'FONTE', fonteRef: ref('dataAberturaProposta e dataEncerramentoProposta'),
        regra: 'Data da fonte incoerente: nenhum prazo legal é calculado sobre ela.', obs: 'Confirme as datas no edital ("Confirmar data").' }));
    });
  } else if (lei === '14133') {
    out.push(calc('PRAZO_IMPUGNACAO', 3, 'Lei 14.133/2021, art. 164: impugnar até 3 dias úteis antes da data de abertura do certame.'));
    out.push(calc('PRAZO_ESCLARECIMENTO', 3, 'Lei 14.133/2021, art. 164: pedir esclarecimento até 3 dias úteis antes da data de abertura do certame.'));
  } else if (lei === '13303') {
    out.push(calc('PRAZO_IMPUGNACAO', 5, 'Lei 13.303/2016, art. 87, § 1º: impugnar até 5 dias úteis antes da data do certame (estatal).'));
    out.push(Object.assign({}, base, { tipo: 'PRAZO_ESCLARECIMENTO', natureza: 'PREVISTO', quandoIso: '', baseIso: encIso, fonte: 'REGULAMENTO', fonteRef: 'Regulamento interno da estatal (Lei 13.303/2016, art. 40)',
      regra: 'Estatal: o prazo de esclarecimento é do regulamento interno de licitações e contratos.', obs: 'Informe a data pelo edital ("Confirmar data").' }));
  } else {
    ['PRAZO_IMPUGNACAO', 'PRAZO_ESCLARECIMENTO'].forEach(function (t) {
      out.push(Object.assign({}, base, { tipo: t, natureza: 'PREVISTO', quandoIso: '', baseIso: encIso, fonte: 'REGIME', fonteRef: 'Amparo legal da fonte: ' + (Lic_s_(l.AMPARO_LEGAL) || 'não informado'),
        regra: 'Regime jurídico pendente de confirmação: sem amparo da Lei 14.133/2021 ou da Lei 13.303/2016, nenhum prazo legal é calculado.', obs: 'Informe a data pelo edital ("Confirmar data").' }));
    });
  }
  return out;
}

// ------------------------------------------------------------ gravação (versões; nada é apagado)
function Lic_eventosDe_(opId, todos) {
  return (todos || Lic_ler_(LIC_ABAS.EVENTOS)).filter(function (e) { return Lic_s_(e.OPORTUNIDADE_ID) === Lic_s_(opId); });
}
function Lic_eventoValendo_(e) { var s = Lic_up_(e.SITUACAO); return s === 'ATIVO' || s === 'SUSPENSO'; }
/** Linha nova de prazo a partir do cálculo d. */
function Lic_eventoLinha_(l, d, versao, anterior, motivo, agora) {
  var t = LIC_EVENTO_TIPOS[d.tipo] || { nome: d.tipo, nivel: 'NORMAL' };
  var reg = { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), CHAVE: Lic_s_(l.ID) + '|' + d.tipo, TIPO: d.tipo, NOME: d.nome || t.nome, NATUREZA: d.natureza, SITUACAO: 'ATIVO',
    QUANDO_ISO: d.quandoIso || '', QUANDO_TEXTO: Lic_s_(d.quandoTexto), DIA_TODO: d.diaTodo ? 'SIM' : 'NAO', FUSO: d.fuso || 'America/Sao_Paulo', FUSO_PRESUMIDO: d.fusoPresumido ? 'SIM' : 'NAO',
    LIMITE_INTERNO_ISO: d.limiteInternoIso || '', NIVEL: t.nivel, FONTE: d.fonte, FONTE_REF: Lic_texto_(d.fonteRef, 400), REGRA: Lic_texto_(d.regra, 900), OBS: Lic_texto_(d.obs, 600),
    BASE_ISO: d.baseIso || '', VERSAO: versao, SUBSTITUI_ID: anterior ? Lic_s_(anterior.ID) : '', SUBSTITUIDO_POR_ID: '', MOTIVO_MUDANCA: Lic_texto_(motivo, 600),
    VERSAO_FONTE: Number(l.VERSAO_FONTE) || 1, FONTE_HASH: Lic_s_(l.VERSAO_HASH), CONFIRMADO_POR_ID: d.confirmadoPorId || '', CONFIRMADO_POR_NOME: d.confirmadoPorNome || '',
    CONFIRMADO_EM: d.confirmadoEm || '', CONFIRMACAO_ONDE: Lic_texto_(d.confirmacaoOnde, 300), ATUALIZADO_EM: agora, CRIADO_EM: agora };
  reg.HASH = Lic_hash_([reg.CHAVE, reg.VERSAO, reg.NATUREZA, reg.QUANDO_ISO, reg.LIMITE_INTERNO_ISO, reg.FONTE, reg.FONTE_REF, reg.CONFIRMADO_POR_ID, reg.CRIADO_EM].join('|'));
  var ins = SGO_DATA.insert(LIC_ABAS.EVENTOS, reg);
  reg.ID = ins && ins.ID ? ins.ID : reg.ID;
  return reg;
}
function Lic_eventoQuandoTxt_(e) {
  if (!Lic_s_(e.QUANDO_ISO || e.quandoIso)) return 'data a informar';
  var iso = Lic_s_(e.QUANDO_ISO || e.quandoIso);
  return Lic_up_(e.DIA_TODO) === 'SIM' || e.diaTodo === true ? Lic_brDia_(Lic_diaSp_(iso)) + ' (dia todo)' : Lic_brDiaHora_(iso);
}
/** Mudou o que importa para os alertas (data, limite interno, natureza)? */
function Lic_eventoMudou_(at, d) {
  return Lic_s_(at.QUANDO_ISO) !== Lic_s_(d.quandoIso) || Lic_s_(at.LIMITE_INTERNO_ISO) !== Lic_s_(d.limiteInternoIso) || Lic_up_(at.NATUREZA) !== d.natureza || (Lic_up_(at.DIA_TODO) === 'SIM') !== !!d.diaTodo;
}

/**
 * Compara os prazos valendo com o cálculo e grava as diferenças. Devolve { criados, retificados, cancelados, suspensos,
 * mudancas: [{ tipo: RETIFICACAO|SUSPENSAO|REVOGACAO|ANULACAO|REABERTURA, texto, eventoId? }], fora: [ids de prazos que deixaram de valer],
 * novos: [ids] }. Quem chama segura a trava.
 */
function Lic_eventosSincronizar_(l, existentes, agora) {
  agora = agora || Lic_agora_();
  var r = { criados: 0, retificados: 0, cancelados: 0, suspensos: 0, reativados: 0, mudancas: [], fora: [], novos: [] };
  var estado = Lic_estadoFonte_(l.SITUACAO_FONTE), antes = Lic_up_(l.AGENDA_ESTADO_FONTE), sistema = { id: '', nome: 'Agenda de licitações (sistema)' };
  var primeira = !(existentes || []).length, valendo = {}, versaoMax = {};
  (existentes || []).forEach(function (e) {
    var t = Lic_s_(e.TIPO);
    versaoMax[t] = Math.max(versaoMax[t] || 0, Number(e.VERSAO) || 0);
    if (Lic_eventoValendo_(e)) valendo[t] = e;
  });
  var hist = function (tipo, de, para, texto) { Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, tipo, sistema, { de: de, para: para, texto: texto, versao: l.VERSAO_FONTE, fonte: 'Agenda de licitações', hash: Lic_s_(l.VERSAO_HASH) }); };
  var desc = Lic_s_(l.SITUACAO) === 'DESCARTADA', desejados = desc ? [] : Lic_eventosDesejados_(l), vistos = {}, criadas = [];
  var retif = Lic_s_(l.RETIFICADA_EM) ? 'Retificação na fonte (versão ' + (Number(l.VERSAO_FONTE) || 1) + ')' : 'Recálculo da agenda';
  // 1) datas: o que a fonte e a lei dão agora contra o que está valendo (versão nova quando muda; nunca altera a linha)
  desejados.forEach(function (d) {
    vistos[d.tipo] = true;
    var at = valendo[d.tipo];
    if (!at) {
      var n = Lic_eventoLinha_(l, d, (versaoMax[d.tipo] || 0) + 1, null, versaoMax[d.tipo] ? 'Volta a valer: ' + retif.toLowerCase() + '.' : '', agora);
      r.criados++; r.novos.push(Lic_s_(n.ID)); criadas.push(n); valendo[d.tipo] = n;
      return;
    }
    // prazo conferido por pessoa: vale enquanto a data da fonte em que ela se baseou for a mesma
    var pessoa = Lic_up_(at.FONTE) === 'PESSOA' && Lic_s_(at.BASE_ISO) === Lic_s_(d.baseIso);
    if (pessoa || !Lic_eventoMudou_(at, d)) {
      var merge = { VERSAO_FONTE: Number(l.VERSAO_FONTE) || 1, FONTE_HASH: Lic_s_(l.VERSAO_HASH), ATUALIZADO_EM: agora };
      if (!pessoa) { merge.FONTE_REF = Lic_texto_(d.fonteRef, 400); merge.REGRA = Lic_texto_(d.regra, 900); merge.OBS = Lic_texto_(d.obs, 600); }
      SGO_DATA.update(LIC_ABAS.EVENTOS, at.ID, merge);
      return;
    }
    var mot = retif + ': ' + (at.NOME || d.tipo) + ' de ' + Lic_eventoQuandoTxt_(at) + ' (' + (LIC_NATUREZAS[Lic_up_(at.NATUREZA)] || at.NATUREZA).toLowerCase() + ') para ' + Lic_eventoQuandoTxt_(d) + ' (' + LIC_NATUREZAS[d.natureza].toLowerCase() + ')' +
      (Lic_up_(at.FONTE) === 'PESSOA' ? '. A data conferida por ' + Lic_s_(at.CONFIRMADO_POR_NOME) + ' se baseava na data antiga da fonte: confira de novo.' : '.');
    var nova = Lic_eventoLinha_(l, d, (versaoMax[d.tipo] || 0) + 1, at, mot, agora);
    SGO_DATA.update(LIC_ABAS.EVENTOS, at.ID, { SITUACAO: 'RETIFICADO', SUBSTITUIDO_POR_ID: nova.ID, MOTIVO_MUDANCA: mot, ATUALIZADO_EM: agora });
    versaoMax[d.tipo] = nova.VERSAO; valendo[d.tipo] = nova;
    r.retificados++; r.fora.push(Lic_s_(at.ID)); r.novos.push(Lic_s_(nova.ID));
    r.mudancas.push({ tipo: 'RETIFICACAO', texto: mot, eventoId: Lic_s_(nova.ID), eventoTipo: d.tipo });
    hist('AGENDA_RETIFICADA', Lic_eventoQuandoTxt_(at), Lic_eventoQuandoTxt_(d), mot);
  });
  if (!desc) Object.keys(valendo).forEach(function (t) {
    if (vistos[t] || t === 'PRAZO_RECURSO') return;
    var e = valendo[t], motC = 'A fonte deixou de informar esta data (' + retif.toLowerCase() + ').';
    SGO_DATA.update(LIC_ABAS.EVENTOS, e.ID, { SITUACAO: 'CANCELADO', MOTIVO_MUDANCA: motC, ATUALIZADO_EM: agora });
    delete valendo[t];
    r.cancelados++; r.fora.push(Lic_s_(e.ID));
    r.mudancas.push({ tipo: 'RETIFICACAO', texto: (e.NOME || t) + ': ' + motC });
    hist('AGENDA_PRAZO_CANCELADO', Lic_eventoQuandoTxt_(e), 'cancelado', motC);
  });
  if (criadas.length) hist(primeira ? 'AGENDA_MONTADA' : 'AGENDA_PRAZO_NOVO', '', criadas.length + (criadas.length === 1 ? ' prazo' : ' prazos'), (primeira ? 'Agenda montada pela fonte: ' : 'Prazos novos: ') +
    criadas.map(function (x) { return x.NOME + ' ' + Lic_eventoQuandoTxt_(x) + ' (' + LIC_NATUREZAS[x.NATUREZA].toLowerCase() + ')'; }).join('; ') + '.');
  // 2) situação na fonte: suspensa = prazos SUSPENSO; revogada ou anulada = CANCELADO; voltou = ATIVO de novo (alerta de mudança só quando muda)
  var nomeE = LIC_ESTADO_FONTE_NOMES[estado];
  if (estado) {
    var motE = 'A licitação foi ' + nomeE + ' na fonte (situação "' + Lic_s_(l.SITUACAO_FONTE) + '", detectado em ' + Lic_brDiaHora_(agora) + ').' + (estado === 'SUSPENSAO' ? ' A nova data entra quando reabrir.' : '');
    var novaSit = estado === 'SUSPENSAO' ? 'SUSPENSO' : 'CANCELADO';
    Object.keys(valendo).forEach(function (t) {
      var e = valendo[t];
      if (Lic_up_(e.SITUACAO) === novaSit) return;
      SGO_DATA.update(LIC_ABAS.EVENTOS, e.ID, { SITUACAO: novaSit, MOTIVO_MUDANCA: motE, ATUALIZADO_EM: agora });
      if (novaSit === 'SUSPENSO') r.suspensos++; else r.cancelados++;
      r.fora.push(Lic_s_(e.ID));
    });
    if (antes !== estado) {
      if (!primeira) r.mudancas.push({ tipo: estado, texto: motE });
      hist('AGENDA_' + (estado === 'SUSPENSAO' ? 'SUSPENSA' : estado), antes ? LIC_ESTADO_FONTE_NOMES[antes] || antes : 'em andamento', nomeE, motE + (primeira ? ' (já estava assim quando a agenda foi montada: sem alerta de mudança)' : ''));
    }
  } else {
    Object.keys(valendo).forEach(function (t) {
      var e = valendo[t];
      if (Lic_up_(e.SITUACAO) !== 'SUSPENSO') return;
      SGO_DATA.update(LIC_ABAS.EVENTOS, e.ID, { SITUACAO: 'ATIVO', MOTIVO_MUDANCA: 'Reaberta na fonte em ' + Lic_brDiaHora_(agora) + ' com a mesma data.', ATUALIZADO_EM: agora });
      r.reativados++; r.novos.push(Lic_s_(e.ID));
    });
    if (antes) {
      var motA = 'A licitação voltou a valer na fonte (situação "' + (Lic_s_(l.SITUACAO_FONTE) || 'sem situação') + '", detectado em ' + Lic_brDiaHora_(agora) + '). Prazos conferidos de novo pela fonte.';
      r.mudancas.push({ tipo: 'REABERTURA', texto: motA });
      hist('AGENDA_REABERTA', LIC_ESTADO_FONTE_NOMES[antes] || antes, 'em andamento', motA);
    }
  }
  var base = Lic_agendaBase_(l);
  SGO_DATA.update(LIC_ABAS.OPORTUNIDADES, l.ID, { EVENTOS_BASE_HASH: base, EVENTOS_EM: agora, AGENDA_ESTADO_FONTE: estado });
  l.EVENTOS_BASE_HASH = base; l.EVENTOS_EM = agora; l.AGENDA_ESTADO_FONTE = estado;
  r.primeira = primeira;
  return r;
}

/**
 * Atualiza a agenda das oportunidades cuja base mudou (ou das ids pedidas). o: { ids, limite (padrão 60), agora (Date) }.
 * Cada oportunidade sob a trava do módulo; depois avisa os alertas (cancela os do prazo antigo, cria os de mudança).
 */
function Lic_agendaAtualizar_(o) {
  o = o || {};
  var agora = o.agora ? Lic_isoDe_(o.agora) : Lic_agora_(), limite = Math.max(1, Number(o.limite) || 60), ids = o.ids ? o.ids.map(Lic_s_) : null, r = { atualizadas: 0, criados: 0, retificados: 0, cancelados: 0, suspensos: 0, mudancas: 0, restam: 0 };
  var fila = Lic_ativas_().filter(function (l) { return ids ? ids.indexOf(Lic_s_(l.ID)) >= 0 : Lic_s_(l.EVENTOS_BASE_HASH) !== Lic_agendaBase_(l); });
  r.restam = Math.max(0, fila.length - limite);
  fila.slice(0, limite).forEach(function (l0) {
    var x = Lic_comTrava_(function () {
      var l = SGO_DATA.getById(LIC_ABAS.OPORTUNIDADES, l0.ID);
      if (!l || Lic_s_(l.EXCLUIDO_EM)) return null;
      var s = Lic_eventosSincronizar_(l, Lic_eventosDe_(l.ID), agora);
      s.op = l;
      return s;
    });
    if (!x) return;
    r.atualizadas++; r.criados += x.criados; r.retificados += x.retificados; r.cancelados += x.cancelados; r.suspensos += x.suspensos; r.mudancas += x.mudancas.length;
    if (typeof Lic_alertasAposAgenda_ === 'function') { try { Lic_alertasAposAgenda_(x.op, x, o.agora); } catch (e) { console.error('Licitações, alertas depois da agenda: ' + ((e && e.message) || e)); } }
  });
  return r;
}
function Lic_isoDe_(q) { return (q instanceof Date ? q : new Date(q || Date.now())).toISOString(); }

// ------------------------------------------------------------ leitura para as telas
function Lic_eventoParaTela_(e, agoraMs, porId) {
  var iso = Lic_s_(e.QUANDO_ISO), ms = Date.parse(iso), alvo = Lic_s_(e.LIMITE_INTERNO_ISO) || iso, alvoMs = Date.parse(alvo), ant = porId && e.SUBSTITUI_ID ? porId[Lic_s_(e.SUBSTITUI_ID)] : null;
  return {
    id: Lic_s_(e.ID), opId: Lic_s_(e.OPORTUNIDADE_ID), codigo: Lic_s_(e.CODIGO), tipo: Lic_s_(e.TIPO), nome: Lic_s_(e.NOME), natureza: Lic_up_(e.NATUREZA), naturezaNome: LIC_NATUREZAS[Lic_up_(e.NATUREZA)] || e.NATUREZA,
    situacao: Lic_up_(e.SITUACAO), situacaoNome: LIC_EVENTO_SITUACOES[Lic_up_(e.SITUACAO)] || e.SITUACAO, quandoIso: iso, dia: Lic_diaSp_(iso), hora: Lic_up_(e.DIA_TODO) === 'SIM' ? '' : Lic_horaSp_(iso),
    diaTodo: Lic_up_(e.DIA_TODO) === 'SIM', quandoTxt: Lic_eventoQuandoTxt_(e), fuso: Lic_s_(e.FUSO), fusoNome: (LIC_FUSOS[Lic_s_(e.FUSO)] || { nome: Lic_s_(e.FUSO) }).nome, fusoPresumido: Lic_up_(e.FUSO_PRESUMIDO) === 'SIM',
    limiteInterno: Lic_s_(e.LIMITE_INTERNO_ISO) ? Lic_brDiaHora_(e.LIMITE_INTERNO_ISO) : '', nivel: Lic_up_(e.NIVEL), fonte: Lic_up_(e.FONTE), fonteRef: Lic_s_(e.FONTE_REF), regra: Lic_s_(e.REGRA), obs: Lic_s_(e.OBS),
    versao: Number(e.VERSAO) || 1, motivo: Lic_s_(e.MOTIVO_MUDANCA), anterior: ant ? Lic_eventoQuandoTxt_(ant) : '', confirmadoPor: Lic_s_(e.CONFIRMADO_POR_NOME), confirmadoEm: Lic_s_(e.CONFIRMADO_EM), onde: Lic_s_(e.CONFIRMACAO_ONDE),
    passou: isFinite(ms) && ms < agoraMs, alvoPassou: isFinite(alvoMs) && alvoMs < agoraMs, semData: !iso, hash: Lic_s_(e.HASH), criadoEm: Lic_s_(e.CRIADO_EM)
  };
}

/** Feriados (não úteis em dia de semana) entre dois dias, para a agenda mostrar: [{ dia, motivo }]. */
function Lic_feriadosEntre_(de, ate) {
  var out = [], d = de;
  for (var i = 0; i < 400 && d <= ate; i++) { var w = Lic_semanaDe_(d), m = w > 0 && w < 6 ? Lic_motivoNaoUtil_(d, 'TRAS') : ''; if (m) out.push({ dia: d, rotulo: Lic_brDia_(d), motivo: m }); d = Lic_somarDia_(d, 1); }
  return out;
}

/**
 * Tela Agenda: d = { periodo: 'hoje'|'7'|'30'|'todos', nivel, natureza ('PENDENTE' = só pendentes de confirmação), sessao (código
 * do portal ou 'OUTRO'), incluirTravadas, incluirDescartadas }. Lista por dia (Brasília), com os feriados, os pendentes sem
 * data, o próximo prazo e os alertas de cada prazo.
 */
function Lic_agenda_(eu, d) {
  d = d || {};
  var agora = new Date(), agoraMs = agora.getTime(), hoje = Lic_diaSp_(agora.toISOString());
  var periodo = ['hoje', '7', '30', 'todos'].indexOf(Lic_s_(d.periodo)) >= 0 ? Lic_s_(d.periodo) : '30';
  var ate = periodo === 'hoje' ? hoje : periodo === '7' ? Lic_somarDia_(hoje, 7) : periodo === '30' ? Lic_somarDia_(hoje, 30) : '9999-12-31';
  var ops = {}, portais = Lic_portaisPorCodigo_();
  Lic_ativas_().forEach(function (l) { ops[Lic_s_(l.ID)] = l; });
  var todos = Lic_ler_(LIC_ABAS.EVENTOS), porId = {};
  todos.forEach(function (e) { porId[Lic_s_(e.ID)] = e; });
  var alertas = typeof Lic_alertasPorEvento_ === 'function' ? Lic_alertasPorEvento_() : {};
  var lista = [], pendentes = [], cont = { total: 0, criticos: 0, pendentes: 0, suspensos: 0 };
  todos.forEach(function (e) {
    var l = ops[Lic_s_(e.OPORTUNIDADE_ID)], sit = Lic_up_(e.SITUACAO);
    if (!l || sit === 'RETIFICADO') return;
    if (Lic_s_(l.SITUACAO) === 'DESCARTADA' && !d.incluirDescartadas) return;
    if (Lic_s_(l.SITUACAO) === 'RADAR' && Lic_s_(l.TRIAGEM) === 'TRAVADA' && !d.incluirTravadas) return;
    var x = Lic_eventoParaTela_(e, agoraMs, porId);
    if (d.nivel && x.nivel !== Lic_up_(d.nivel)) return;
    if (Lic_s_(d.natureza) === 'PENDENTE' && x.natureza !== 'PREVISTO') return;
    var ps = Lic_up_(l.PORTAL_SESSAO);
    if (Lic_up_(d.sessao) === 'OUTRO' && ps) return;
    if (d.sessao && Lic_up_(d.sessao) !== 'OUTRO' && ps !== Lic_up_(d.sessao)) return;
    x.orgao = Lic_s_(l.ORGAO_NOME); x.local = (Lic_s_(l.MUNICIPIO) ? Lic_s_(l.MUNICIPIO) + '/' : '') + Lic_s_(l.UF); x.modalidade = Lic_s_(l.MODALIDADE); x.numeroControle = Lic_s_(l.NUMERO_CONTROLE_PNCP);
    x.situacaoOp = Lic_s_(l.SITUACAO); x.situacaoOpNome = LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || ''; x.travada = Lic_s_(l.TRIAGEM) === 'TRAVADA'; x.sessao = portais[ps] ? Lic_s_(portais[ps].NOME) : '';
    x.alertas = alertas[x.id] || null;
    if (x.semData) { if (sit !== 'CANCELADO') { pendentes.push(x); cont.pendentes++; } return; }
    if (x.dia < hoje || x.dia > ate) return;
    if (sit === 'CANCELADO' && x.passou) return;
    lista.push(x); cont.total++;
    if (x.nivel === 'CRITICO' && sit === 'ATIVO') cont.criticos++;
    if (x.natureza === 'PREVISTO' && sit === 'ATIVO') cont.pendentes++;
    if (sit !== 'ATIVO') cont.suspensos++;
  });
  lista.sort(function (a, b) { return a.quandoIso < b.quandoIso ? -1 : a.quandoIso > b.quandoIso ? 1 : (LIC_EVENTO_TIPOS[a.tipo] || {}).ordem - (LIC_EVENTO_TIPOS[b.tipo] || {}).ordem; });
  var dias = [], porDia = {}, fer = {};
  Lic_feriadosEntre_(hoje, periodo === 'todos' ? Lic_somarDia_(hoje, 90) : ate).forEach(function (f) { fer[f.dia] = f.motivo; });
  lista.forEach(function (x) { if (!porDia[x.dia]) { porDia[x.dia] = { dia: x.dia, rotulo: LIC_DIAS_SEMANA_LONGO[Lic_semanaDe_(x.dia)] + ' ' + x.dia.slice(8, 10) + '/' + x.dia.slice(5, 7), feriado: fer[x.dia] || '', hoje: x.dia === hoje, eventos: [] }; dias.push(porDia[x.dia]); } porDia[x.dia].eventos.push(x); });
  Object.keys(fer).forEach(function (f) { if (!porDia[f] && f <= ate) dias.push({ dia: f, rotulo: LIC_DIAS_SEMANA_LONGO[Lic_semanaDe_(f)] + ' ' + f.slice(8, 10) + '/' + f.slice(5, 7), feriado: fer[f], hoje: f === hoje, eventos: [] }); });
  dias.sort(function (a, b) { return a.dia < b.dia ? -1 : 1; });
  var proximo = lista.filter(function (x) { return x.situacao === 'ATIVO' && !x.passou && x.natureza !== 'PREVISTO'; })[0] || null;
  var sessoes = {}; Object.keys(ops).forEach(function (k) { var c = Lic_up_(ops[k].PORTAL_SESSAO); if (c && portais[c]) sessoes[c] = Lic_s_(portais[c].NOME); });
  return { periodo: periodo, hoje: hoje, hojeRotulo: LIC_DIAS_SEMANA_LONGO[Lic_semanaDe_(hoje)] + ' ' + hoje.slice(8, 10) + '/' + hoje.slice(5, 7), ate: ate, dias: dias, pendentes: pendentes.slice(0, 200),
    contagens: cont, proximo: proximo, sessoes: sessoes, semCiencia: typeof Lic_alertasSemCiencia_ === 'function' ? Lic_alertasSemCiencia_(eu).length : 0, regras: LIC_AGENDA_REGRAS };
}

/** Aba "Prazos" da ficha: todas as versões de cada prazo, os alertas de cada uma. */
function Lic_prazosFicha_(l) {
  var agoraMs = Date.now(), evs = Lic_eventosDe_(l.ID), porId = {};
  evs.forEach(function (e) { porId[Lic_s_(e.ID)] = e; });
  var alertas = typeof Lic_alertasDaOp_ === 'function' ? Lic_alertasDaOp_(l.ID) : [];
  var lista = evs.map(function (e) { var x = Lic_eventoParaTela_(e, agoraMs, porId); x.alertas = alertas.filter(function (a) { return a.eventoId === x.id; }); return x; })
    .sort(function (a, b) { return ((LIC_EVENTO_TIPOS[a.tipo] || {}).ordem || 9) - ((LIC_EVENTO_TIPOS[b.tipo] || {}).ordem || 9) || b.versao - a.versao; });
  return { eventos: lista, alertas: alertas.filter(function (a) { return !a.eventoId; }), lei: Lic_s_(l.LEI), estadoFonte: Lic_estadoFonte_(l.SITUACAO_FONTE), podeAta: Lic_s_(l.LEI) === '14133' || Lic_s_(l.LEI) === '13303', fusos: Object.keys(LIC_FUSOS).map(function (k) { return [k, LIC_FUSOS[k].nome]; }) };
}

// ------------------------------------------------------------ ações de pessoa (Diretoria)
/**
 * Confirmar data (com o fuso e onde conferiu). Mesmo instante e já confirmado: só registra a conferência. Outro instante ou
 * natureza: versão nova (a anterior fica RETIFICADO). d = { eventoId, data 'aaaa-mm-dd', hora 'HH:mm', diaTodo, fuso, onde }.
 */
function Lic_eventoConfirmar_(eu, d) {
  var onde = Lic_texto_(d.onde, 300), dia = Lic_s_(d.data), hora = d.diaTodo ? '23:59' : Lic_s_(d.hora), fuso = Lic_s_(d.fuso) || 'America/Sao_Paulo';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error('Escolha a data do prazo (dia, mês e ano). Nada foi alterado');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) throw new Error('Escreva a hora do prazo no formato HH:MM (ex.: 09:00) ou marque "dia todo". Nada foi alterado');
  if (!LIC_FUSOS[fuso]) throw new Error('Escolha o fuso na lista. Nada foi alterado');
  if (onde.length < 10) throw new Error('Escreva onde você conferiu a data (pelo menos 10 letras; ex.: edital, item 5.1, página 3): fica no histórico com o seu nome. Nada foi alterado');
  var r = Lic_comTrava_(function () {
    var e = SGO_DATA.getById(LIC_ABAS.EVENTOS, Lic_s_(d.eventoId));
    if (!e || !Lic_eventoValendo_(e)) throw new Error('Não foi possível confirmar: este prazo foi substituído por uma versão nova ou cancelado (a fonte mudou). Atualize a ficha e confira de novo');
    var l = Lic_acharOp_(e.OPORTUNIDADE_ID), agora = Lic_agora_(), iso = Lic_isoLocal_(dia, hora, LIC_FUSOS[fuso].off);
    if (!iso) throw new Error('Não foi possível entender a data e a hora. Nada foi alterado');
    var interno = Lic_s_(e.LIMITE_INTERNO_ISO);
    if (interno && iso !== Lic_s_(e.QUANDO_ISO)) interno = d.diaTodo ? Lic_isoLocal_(Lic_diasUteisAntes_(dia, 1).dia, '17:00') : '';
    var mesmo = iso === Lic_s_(e.QUANDO_ISO) && Lic_up_(e.NATUREZA) === 'CONFIRMADO' && fuso === Lic_s_(e.FUSO);
    if (mesmo) {
      SGO_DATA.update(LIC_ABAS.EVENTOS, e.ID, { CONFIRMADO_POR_ID: eu.id, CONFIRMADO_POR_NOME: eu.nome, CONFIRMADO_EM: agora, CONFIRMACAO_ONDE: onde, FUSO_PRESUMIDO: 'NAO', ATUALIZADO_EM: agora });
      Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'AGENDA_CONFERIDA', eu, { de: Lic_eventoQuandoTxt_(e), para: Lic_eventoQuandoTxt_(e), texto: (e.NOME || e.TIPO) + ': data conferida em "' + onde + '" (fuso ' + LIC_FUSOS[fuso].nome + ').', versao: e.VERSAO, fonte: 'Tela Agenda / ficha' });
      return { evento: e, novo: null, op: l };
    }
    var nd = { tipo: Lic_s_(e.TIPO), nome: Lic_s_(e.NOME), natureza: 'CONFIRMADO', quandoIso: iso, quandoTexto: dia + 'T' + hora + ' (' + LIC_FUSOS[fuso].nome + ')', diaTodo: !!d.diaTodo, fuso: fuso, fusoPresumido: false,
      limiteInternoIso: interno, fonte: 'PESSOA', fonteRef: 'Conferido por ' + eu.nome + ': ' + onde, regra: Lic_s_(e.REGRA), obs: 'Data conferida por pessoa no edital ou no portal.', baseIso: Lic_s_(e.BASE_ISO),
      confirmadoPorId: eu.id, confirmadoPorNome: eu.nome, confirmadoEm: agora, confirmacaoOnde: onde };
    var mot = 'Confirmado por ' + eu.nome + ' (' + onde + '): de ' + Lic_eventoQuandoTxt_(e) + ' (' + (LIC_NATUREZAS[Lic_up_(e.NATUREZA)] || '').toLowerCase() + ') para ' + Lic_eventoQuandoTxt_(nd) + ' (' + LIC_FUSOS[fuso].nome + ').';
    var nova = Lic_eventoLinha_(l, nd, (Number(e.VERSAO) || 1) + 1, e, mot, agora);
    SGO_DATA.update(LIC_ABAS.EVENTOS, e.ID, { SITUACAO: 'RETIFICADO', SUBSTITUIDO_POR_ID: nova.ID, MOTIVO_MUDANCA: mot, ATUALIZADO_EM: agora });
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'AGENDA_CONFIRMADA', eu, { de: Lic_eventoQuandoTxt_(e), para: Lic_eventoQuandoTxt_(nd), texto: mot, versao: nova.VERSAO, fonte: 'Tela Agenda / ficha', hash: nova.HASH });
    return { evento: e, novo: nova, op: l, mot: mot };
  });
  if (r.novo && typeof Lic_alertasAposAgenda_ === 'function') Lic_alertasAposAgenda_(r.op, { fora: [Lic_s_(r.evento.ID)], novos: [Lic_s_(r.novo.ID)], mudancas: [], motivoFora: 'Prazo conferido por ' + eu.nome + ' com outra data ou natureza: os alertas seguem a versão nova.' });
  return { eventoId: r.novo ? Lic_s_(r.novo.ID) : Lic_s_(r.evento.ID), versaoNova: !!r.novo, texto: r.novo ? 'Data confirmada: versão ' + r.novo.VERSAO + ' do prazo. Os alertas seguem a data nova.' : 'Conferência registrada no histórico (a data já era esta).' };
}

/** Prazo de recurso a partir da data da ata (ato do pregoeiro): 3 dias úteis (Lei 14.133, art. 165) ou 5 (Lei 13.303, art. 59). */
function Lic_eventoAta_(eu, d) {
  var dia = Lic_s_(d.data), onde = Lic_texto_(d.onde, 300);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error('Escolha a data da ata (ou da intimação) no calendário. Nada foi alterado');
  if (onde.length < 10) throw new Error('Escreva onde está a ata (pelo menos 10 letras; ex.: ata da sessão no Compras.gov.br): fica no histórico. Nada foi alterado');
  var r = Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), lei = Lic_s_(l.LEI), agora = Lic_agora_();
    if (lei !== '14133' && lei !== '13303') throw new Error('Não foi possível calcular: o regime jurídico desta licitação está pendente (sem amparo da Lei 14.133 ou da 13.303 na fonte). Informe o prazo de recurso direto pelo edital, em "Confirmar data" de um prazo, ou fale com o jurídico. Nada foi alterado');
    var n = lei === '14133' ? 3 : 5, c = Lic_diasUteisDepois_(dia, n);
    var regra = (lei === '14133' ? 'Lei 14.133/2021, art. 165, I, e § 1º: razões de recurso em 3 dias úteis da lavratura da ata (ou da intimação).' : 'Lei 13.303/2016, art. 59, § 1º: recurso em fase única, 5 dias úteis após a habilitação.') +
      ' Contagem para frente: só os feriados nacionais fixos' + (c.pulados.length ? ' (não contam ' + c.pulados.join(', ') + ')' : '') + '; feriado do órgão desconhecido não estende o prazo.';
    var ant = Lic_eventosDe_(l.ID).filter(function (e) { return Lic_s_(e.TIPO) === 'PRAZO_RECURSO'; }), at = ant.filter(Lic_eventoValendo_)[0], vmax = ant.reduce(function (m, e) { return Math.max(m, Number(e.VERSAO) || 0); }, 0);
    var nd = { tipo: 'PRAZO_RECURSO', natureza: 'CALCULADO', quandoIso: Lic_isoLocal_(c.dia, '23:59'), quandoTexto: c.dia, diaTodo: true, fuso: 'America/Sao_Paulo', fusoPresumido: false,
      limiteInternoIso: Lic_isoLocal_(c.dia, '17:00'), fonte: 'CALCULO', fonteRef: 'Data da ata informada por ' + eu.nome + ' (' + Lic_brDia_(dia) + ', ' + onde + ') + cálculo do SGO+', regra: regra,
      obs: 'A intenção de recurso é na sessão (art. 165, § 1º, I). Limite interno dos alertas: ' + Lic_brDia_(c.dia) + ' 17:00.', baseIso: Lic_isoLocal_(dia, '00:00'), confirmadoPorId: eu.id, confirmadoPorNome: eu.nome, confirmadoEm: agora, confirmacaoOnde: onde };
    var mot = at ? 'Data da ata informada de novo por ' + eu.nome + ': de ' + Lic_eventoQuandoTxt_(at) + ' para ' + Lic_eventoQuandoTxt_(nd) + '.' : '';
    var nova = Lic_eventoLinha_(l, nd, vmax + 1, at || null, mot, agora);
    if (at) SGO_DATA.update(LIC_ABAS.EVENTOS, at.ID, { SITUACAO: 'RETIFICADO', SUBSTITUIDO_POR_ID: nova.ID, MOTIVO_MUDANCA: mot, ATUALIZADO_EM: agora });
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'AGENDA_RECURSO', eu, { de: at ? Lic_eventoQuandoTxt_(at) : '', para: Lic_eventoQuandoTxt_(nd), texto: 'Ata de ' + Lic_brDia_(dia) + ' (' + onde + '). ' + regra, versao: nova.VERSAO, fonte: 'Ficha › Prazos', hash: nova.HASH });
    return { op: l, nova: nova, at: at };
  });
  if (typeof Lic_alertasAposAgenda_ === 'function') Lic_alertasAposAgenda_(r.op, { fora: r.at ? [Lic_s_(r.at.ID)] : [], novos: [Lic_s_(r.nova.ID)], mudancas: [], motivoFora: 'Data da ata informada de novo: os alertas seguem o prazo novo.' });
  return { eventoId: Lic_s_(r.nova.ID), texto: 'Prazo de recurso calculado: até ' + Lic_eventoQuandoTxt_(r.nova) + ' (limite interno 17:00). Os alertas foram programados.' };
}
