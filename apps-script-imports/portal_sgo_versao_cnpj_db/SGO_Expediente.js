/****************************************************
 * EXPEDIENTE DA EMPRESA (2026-10-19)
 *
 * Dia útil e horário de trabalho usados pelos avisos automáticos que
 * precisam respeitar o descanso da equipe (hoje: o resumo diário de
 * Minhas atividades pelo WhatsApp e os e-mails de atividades, que ficam
 * guardados fora do horário e saem na abertura do próximo expediente).
 *
 * Configuração na propriedade SGO_EXPEDIENTE (JSON), editada pela tela
 * Atividades da equipe > Avisos e horários (Admin e Diretoria):
 *   { ini: "08:00", fim: "17:30", dias: [1,2,3,4,5], feriados: "dd/mm, dd/mm/aaaa" }
 * Sem configuração vale o padrão abaixo. Sem domingo e sábado.
 *
 * Feriados que nunca recebem aviso automático: nacionais fixos, Sexta-feira
 * Santa, Carnaval (segunda e terça) e Corpus Christi (pontos facultativos
 * entram de propósito: na dúvida, não manda). Feriados estaduais, municipais
 * e recesso entram em "feriados".
 *
 * Horas sempre no fuso America/Sao_Paulo, qualquer que seja o fuso do servidor.
 ****************************************************/

var SGO_EXPEDIENTE_PADRAO = { ini: '08:00', fim: '17:30', dias: [1, 2, 3, 4, 5], feriados: '' };
var SGO_EXPEDIENTE_FUSO = 'America/Sao_Paulo';
var SGO_FERIADOS_FIXOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];

function SGO_expedienteHoraValida_(s) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ''));
}

/** "dd/mm" ou "dd/mm/aaaa" (como a pessoa escreve) -> "mm-dd" ou "aaaa-mm-dd". Inválido volta "". */
function SGO_expedienteNormFeriado_(s) {
  var t = String(s || '').trim();
  var m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/.exec(t);
  if (m) {
    var d = Number(m[1]), mes = Number(m[2]);
    if (d < 1 || d > 31 || mes < 1 || mes > 12) return '';
    var md = (mes < 10 ? '0' : '') + mes + '-' + (d < 10 ? '0' : '') + d;
    return m[3] ? m[3] + '-' + md : md;
  }
  if (/^(\d{4}-)?\d{2}-\d{2}$/.test(t)) return t;
  return '';
}

/** Configuração em vigor (padrão + o que estiver gravado). Nunca lança. */
function SGO_expediente_() {
  var e = null;
  try { e = JSON.parse(PropertiesService.getScriptProperties().getProperty('SGO_EXPEDIENTE') || 'null'); } catch (x) { e = null; }
  var c = {
    ini: e && SGO_expedienteHoraValida_(e.ini) ? e.ini : SGO_EXPEDIENTE_PADRAO.ini,
    fim: e && SGO_expedienteHoraValida_(e.fim) ? e.fim : SGO_EXPEDIENTE_PADRAO.fim,
    dias: e && Array.isArray(e.dias) && e.dias.length ? e.dias.map(Number).filter(function (n) { return n >= 0 && n <= 6; }) : SGO_EXPEDIENTE_PADRAO.dias.slice(),
    feriados: e && typeof e.feriados === 'string' ? e.feriados : ''
  };
  if (c.ini >= c.fim) { c.ini = SGO_EXPEDIENTE_PADRAO.ini; c.fim = SGO_EXPEDIENTE_PADRAO.fim; }
  c.extras = String(c.feriados || '').split(/[\s,;]+/).map(SGO_expedienteNormFeriado_).filter(Boolean);
  return c;
}

/** Grava a configuração (valida antes). Lança erro com a mensagem para a tela. */
function SGO_expedienteGravar_(novo) {
  var n = novo || {};
  if (!SGO_expedienteHoraValida_(n.ini) || !SGO_expedienteHoraValida_(n.fim) || String(n.ini) >= String(n.fim)) {
    throw new Error('Não foi possível salvar o horário: use HH:MM nos dois campos, com o início antes do fim (por exemplo 08:00 e 17:30).');
  }
  var dias = (Array.isArray(n.dias) ? n.dias : []).map(Number).filter(function (d, i, a) { return d >= 0 && d <= 6 && a.indexOf(d) === i; }).sort();
  if (!dias.length) throw new Error('Não foi possível salvar o horário: marque pelo menos um dia de trabalho.');
  var brutos = String(n.feriados || '').split(/[\s,;]+/).filter(Boolean);
  var ruins = brutos.filter(function (s) { return !SGO_expedienteNormFeriado_(s); });
  if (ruins.length) throw new Error('Não foi possível salvar os feriados: ' + ruins.join(', ') + ' não está no formato dd/mm ou dd/mm/aaaa. Corrija e salve de novo.');
  var c = { ini: String(n.ini), fim: String(n.fim), dias: dias, feriados: brutos.join(', ') };
  PropertiesService.getScriptProperties().setProperty('SGO_EXPEDIENTE', JSON.stringify(c));
  return SGO_expediente_();
}

/** Domingo de Páscoa (Meeus/Jones/Butcher): { ano, mes (1-12), dia }. */
function SGO_expedientePascoa_(ano) {
  var a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  var mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { ano: ano, mes: mes, dia: dia };
}

/** "aaaa-mm-dd" somando dias a uma data de calendário (sem fuso: conta só o calendário). */
function SGO_expedienteSomarDias_(ano, mes, dia, n) {
  var t = new Date(Date.UTC(ano, mes - 1, dia) + n * 86400000);
  var p = function (x) { return (x < 10 ? '0' : '') + x; };
  return t.getUTCFullYear() + '-' + p(t.getUTCMonth() + 1) + '-' + p(t.getUTCDate());
}

/** Feriados móveis do ano: Carnaval (seg e ter), Sexta-feira Santa e Corpus Christi, como "aaaa-mm-dd". */
function SGO_expedienteMoveis_(ano) {
  var p = SGO_expedientePascoa_(ano);
  return [-48, -47, -2, 60].map(function (n) { return SGO_expedienteSomarDias_(p.ano, p.mes, p.dia, n); });
}

/** Partes da data no fuso da empresa: { dia: "aaaa-mm-dd", hora: "HH:mm", semana: 0..6 (0 = domingo) }. */
function SGO_expedientePartes_(data) {
  var d = data instanceof Date ? data : new Date(data || Date.now());
  var dia = Utilities.formatDate(d, SGO_EXPEDIENTE_FUSO, 'yyyy-MM-dd');
  var hora = Utilities.formatDate(d, SGO_EXPEDIENTE_FUSO, 'HH:mm');
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  var semana = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
  return { dia: dia, hora: hora, semana: semana };
}

/** Motivo de o dia não ter expediente ("" = é dia de trabalho). */
function SGO_expedienteMotivoDia_(dia, semana, cfg) {
  var c = cfg || SGO_expediente_();
  if (c.dias.indexOf(semana) < 0) return semana === 0 ? 'domingo' : semana === 6 ? 'sábado' : 'dia sem expediente';
  var md = dia.slice(5);
  if (SGO_FERIADOS_FIXOS.indexOf(md) >= 0) return 'feriado nacional';
  if (SGO_expedienteMoveis_(Number(dia.slice(0, 4))).indexOf(dia) >= 0) return 'feriado ou ponto facultativo nacional';
  if (c.extras.indexOf(md) >= 0 || c.extras.indexOf(dia) >= 0) return 'feriado cadastrado';
  return '';
}

/** O dia (no fuso da empresa) é de trabalho? */
function SGO_ehDiaUtil_(data, cfg) {
  var p = SGO_expedientePartes_(data);
  return !SGO_expedienteMotivoDia_(p.dia, p.semana, cfg);
}

/**
 * Está dentro do horário de trabalho? Devolve { dentro, motivo, dia, hora }.
 * motivo explica por que não (domingo, feriado, antes das 08:00, depois das 17:30).
 */
function SGO_dentroDoExpediente_(data, cfg) {
  var c = cfg || SGO_expediente_();
  var p = SGO_expedientePartes_(data);
  var m = SGO_expedienteMotivoDia_(p.dia, p.semana, c);
  if (m) return { dentro: false, motivo: m, dia: p.dia, hora: p.hora };
  if (p.hora < c.ini) return { dentro: false, motivo: 'antes do início do expediente (' + c.ini + ')', dia: p.dia, hora: p.hora };
  if (p.hora >= c.fim) return { dentro: false, motivo: 'depois do fim do expediente (' + c.fim + ')', dia: p.dia, hora: p.hora };
  return { dentro: true, motivo: '', dia: p.dia, hora: p.hora };
}
