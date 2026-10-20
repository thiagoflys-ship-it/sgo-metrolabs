/****************************************************
 * CAIXA DE DECISÕES — ESCADA DE COBRANÇA E AUTOMAÇÕES (20/10/2026)
 *
 * Escada (tudo configurável em Caixa de decisões > Regras e responsáveis,
 * só Administrador e Diretoria):
 *  1. Na hora: o item entra na caixa e no Início da gestão (central de pendências)
 *     e conta no balão do menu.
 *  2. Todo dia útil, a partir das 08:00: UM e-mail por pessoa da gestão com o
 *     resumo do que espera por ela (só se houver algo), com o caminho de cada item.
 *  3. Parado há 2 dias úteis: entra no resumo diário do WhatsApp do gestor. No
 *     máximo UMA mensagem por pessoa por dia, somando atividades e gestão (quem
 *     recebe o resumo da gestão não recebe outro de atividades no mesmo dia; o da
 *     gestão leva a contagem das atividades), só em dia útil e no horário de
 *     trabalho, só para o vínculo liberado (padrão CLT) — regra sutil do dono.
 *  4. Parado há 5 dias úteis: escala para a Diretoria (caixa + e-mail diário da
 *     Diretoria) com o nome de quem está segurando.
 *  5. Semanal (primeiro dia útil da semana, 08:00): o e-mail da Diretoria leva o
 *     relatório A4 semanal da gestão.
 *  6. Mensal (primeiro dia útil do mês): relatórios do mês anterior gerados sozinhos
 *     (Desempenho da gestão, Frota, Programa de conduta, Atividades) e enviados no
 *     e-mail da Diretoria; a avaliação do gestor do mês fica congelada.
 *  Nunca à noite, fim de semana ou feriado (SGO_Expediente.js); sempre agrupado;
 *  o mesmo item não é cobrado duas vezes no mesmo dia (cada envio fica em GES_ENVIOS).
 *
 * Automações (o sistema faz e só avisa):
 *  - CNH vencendo: e-mail direto ao condutor com 30, 15 e 7 dias (um de cada);
 *    só com 7 dias ou menos a CNH vira item da caixa do gestor.
 *  - Manutenção preventiva prevista (data ou KM): vira atividade em Minhas
 *    atividades para o gestor da área da Frota (entra na agenda e no Gantt),
 *    uma por veículo e tipo a cada 60 dias.
 *  - Atividade aberta com responsável inativo ou sem responsável: volta para quem
 *    lançou (ou para o gestor da área), com histórico e aviso.
 *  - Relatórios mensais (item 6) e a lista do copiloto da Frota para a caixa.
 * Nada aqui apaga dado; cada ação automática fica registrada.
 ****************************************************/

var GES_FUNCAO_ROTINA = 'Gestao_rotinaDecisoes';
var GES_HORA_LIMITE_RELATORIOS = '10:30';   // no dia do semanal/mensal, o e-mail da Diretoria espera os relatórios até esta hora
var GES_CNH_LIMIARES = [30, 15, 7];
var GES_MODELO_WHATS = 'sgo_gestao_resumo_dia';
var GES_MAX_ITENS_EMAIL = 25;

/** Gatilho a cada 15 minutos (rotina leve quando não há nada a fazer). Idempotente. */
function Gestao_garantirRotina_() {
  var tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === GES_FUNCAO_ROTINA; });
  if (tem) return 'já instalada';
  ScriptApp.newTrigger(GES_FUNCAO_ROTINA).timeBased().everyMinutes(15).create();
  return 'instalada';
}

/** Confere o gatilho uma vez por dia, quando alguém da gestão abre o sistema. */
function Ges_garantirRotinaTalvez_() {
  try {
    var props = PropertiesService.getScriptProperties(), hoje = Ges_hoje_();
    if (props.getProperty('GES_ROTINA_CHECADA_EM') === hoje) return;
    Gestao_garantirRotina_();
    props.setProperty('GES_ROTINA_CHECADA_EM', hoje);
  } catch (e) { console.error('Gestão, gatilho: ' + ((e && e.message) || e)); }
}

/**
 * Gatilho (nome sem "_" para o gatilho achar). Recusado quando chamado pelo navegador.
 * Cada etapa em separado: uma falha não impede as outras. Devolve o que fez (para o log do agendador).
 */
function Gestao_rotinaDecisoes() {
  if (!SGO_execucaoInterna_()) return null;
  return Ges_rodada_(new Date());
}

function Ges_rodada_(quando) {
  quando = quando || new Date();
  var r = {}, cfg = Ges_cfg_();
  var passo = function (nome, fn) { try { r[nome] = fn(); } catch (e) { r[nome] = { erro: String((e && e.message) || e).slice(0, 300) }; console.error('Gestão (' + nome + '): ' + r[nome].erro); } };
  passo('sincronizar', function () { return Ges_sincronizar_(); });
  passo('copiloto', function () { return Ges_atualizarCopiloto_(false); });
  if (cfg.automacoes.atividadeSemResponsavel) passo('semResponsavel', function () { return Ges_autoAtividadeSemResponsavel_(); });
  if (cfg.automacoes.manutencaoAgenda) passo('manutencao', function () { return Ges_autoManutencaoAgenda_(); });
  var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(quando) : { dentro: true, hora: '09:00', dia: Ges_hoje_() };
  if (!ex.dentro) { r.fora = ex.motivo; return r; }
  if (cfg.automacoes.cnhCondutor) passo('cnh', function () { return Ges_autoCnhCondutor_(ex); });
  if (cfg.escada.mensal && cfg.automacoes.relatoriosMensais) passo('mensal', function () { return Ges_relatoriosMensais_(ex); });
  if (cfg.escada.semanal) passo('semanal', function () { return Ges_relatorioSemanalDoDia_(ex); });
  if (cfg.escada.emailDiario) passo('emails', function () { return Ges_emailsDiarios_(ex); });
  if (cfg.escada.whatsapp) passo('whatsapp', function () { return Gestao_whatsDiario_(quando); });
  return r;
}

// ------------------------------------------------------------
// REGISTRO DOS ENVIOS (um por tipo, pessoa e dia)
// ------------------------------------------------------------
function Ges_envios_() { Ges_garantirAbas_(); return Ges_ler_(GES_ABA_ENVIOS); }

function Ges_jaEnviado_(envios, tipo, uid, dia, ref) {
  return envios.some(function (e) {
    return Ges_up_(e.TIPO) === tipo && Ges_s_(e.USUARIO_ID) === Ges_s_(uid) && (!dia || Ges_s_(e.DIA).slice(0, 10) === dia) && (ref === undefined || Ges_s_(e.REFERENCIA) === ref) &&
      Ges_up_(e.SITUACAO) !== 'ERRO';
  });
}

function Ges_registrarEnvio_(o) {
  try {
    SGO_DATA.insert(GES_ABA_ENVIOS, { TIPO: o.tipo, USUARIO_ID: Ges_s_(o.uid), USUARIO_NOME: Ges_s_(o.nome), DIA: o.dia || Ges_hoje_(), REFERENCIA: Ges_s_(o.ref).slice(0, 200),
      QTD: Number(o.qtd) || 0, ITENS: Ges_s_(o.itens).slice(0, 1500), SITUACAO: o.situacao || 'OK', MOTIVO: Ges_s_(o.motivo).slice(0, 480), LINK: Ges_s_(o.link).slice(0, 500) });
  } catch (e) { console.error('GES_ENVIOS: ' + ((e && e.message) || e)); }
}

/** Primeiro dia útil da semana (segunda, ou o dia útil seguinte se for feriado) e do mês. */
function Ges_primeiroDiaUtil_(diaInicial, limiteDias, cfgExp) {
  var d = diaInicial;
  for (var i = 0; i < (limiteDias || 7); i++) { if (Ges_diaUtil_(d, cfgExp)) return d; d = Ges_somarDias_(d, 1); }
  return '';
}
function Ges_segundaDaSemana_(dia) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia), w = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  return Ges_somarDias_(dia, -((w + 6) % 7));
}
function Ges_ehDiaDoSemanal_(dia, cfgExp) { return Ges_primeiroDiaUtil_(Ges_segundaDaSemana_(dia), 5, cfgExp) === dia; }
function Ges_ehDiaDoMensal_(dia, cfgExp) { return Ges_primeiroDiaUtil_(dia.slice(0, 8) + '01', 10, cfgExp) === dia; }
function Ges_competenciaAnterior_(dia) { var a = +dia.slice(0, 4), m = +dia.slice(5, 7) - 1; if (m < 1) { m = 12; a--; } return a + '-' + Ges_2_(m); }

// ------------------------------------------------------------
// LINKS
// ------------------------------------------------------------
var GES_TELA_LINK = { atividade: 'atividades_equipe', frota_reservas: 'frota', conduta_ciencia: 'conduta', qualidade_ciencia: 'qualidade', certificado: 'certificado_calibracao', documento: 'documentos' };
function Ges_linkDoItem_(i) {
  var t = i.tela || {};
  if (t.tipo === 'link' && t.url) return t.url;
  if (t.tipo === 'modulo' && t.mod) return Ges_linkTela_(t.mod);
  if (t.tipo === 'atalho' && t.alvo) return Ges_linkTela_(t.alvo);
  if (GES_TELA_LINK[t.tipo]) return Ges_linkTela_(GES_TELA_LINK[t.tipo]);
  return Ges_linkTela_('gestao_decisoes');
}

function Ges_linhaItem_(i) {
  var partes = [i.moduloNome, i.prazo ? 'prazo de decisão ' + i.prazo + (i.prazoVencido ? ' (vencido)' : '') : '', i.diasParado ? 'parado há ' + Ges_plural_(i.diasParado, 'dia útil', 'dias úteis') : 'novo'];
  var link = Ges_linkDoItem_(i);
  return '- ' + i.titulo + ' (' + partes.filter(Boolean).join('; ') + ').\n  O que fazer: ' + Ges_s_(i.oQueFazer) + (link ? '\n  Abrir: ' + link : '');
}

// ------------------------------------------------------------
// E-MAIL DIÁRIO (gestor) E E-MAIL DA DIRETORIA
// ------------------------------------------------------------
/** Texto do e-mail de uma pessoa: { titulo, texto, qtd, ids } ou null (nada a dizer). */
function Ges_textoEmailGestor_(u, minhas, acompanhamento, cfg, extraDiretoria) {
  var decisao = minhas.filter(function (i) { return !i.acompanhamento; });
  var temExtra = extraDiretoria && extraDiretoria.texto;
  if (!decisao.length && !temExtra) return null;
  var e = cfg.escada, link = Ges_linkTela_('gestao_decisoes');
  var paradas = decisao.filter(function (i) { return i.diasParado >= e.whatsDiasUteis && i.etapa !== 'PAUSADO'; });
  var vencidas = decisao.filter(function (i) { return i.prazoVencido && paradas.indexOf(i) < 0; });
  var novas = decisao.filter(function (i) { return i.etapa === 'NA_HORA'; });
  var resto = decisao.filter(function (i) { return paradas.indexOf(i) < 0 && vencidas.indexOf(i) < 0 && novas.indexOf(i) < 0; });
  var listados = 0, linhas = [];
  var bloco = function (titulo, lista) {
    if (!lista.length) return;
    linhas.push(titulo);
    lista.forEach(function (i) { if (listados < GES_MAX_ITENS_EMAIL) { linhas.push(Ges_linhaItem_(i)); listados++; } });
    linhas.push('');
  };
  var texto = 'Bom dia, ' + (typeof Notificar_primeiroNome_ === 'function' ? Notificar_primeiroNome_(u.nome) : u.nome) + '.\n\n';
  if (decisao.length) {
    texto += 'Há ' + Ges_plural_(decisao.length, 'decisão que depende', 'decisões que dependem') + ' de você no SGO+. Cada item diz o que fazer e onde. Item parado há ' + e.whatsDiasUteis + ' dias úteis entra no resumo do WhatsApp e, com ' + e.diretoriaDiasUteis + ' dias úteis, vai para a Diretoria com o seu nome.\n\n';
    bloco('PARADAS HÁ ' + e.whatsDiasUteis + ' DIAS ÚTEIS OU MAIS', paradas);
    bloco('PRAZO DE DECISÃO VENCIDO', vencidas);
    bloco('NOVAS', novas);
    bloco('DEMAIS ITENS', resto);
    if (decisao.length > listados) linhas.push('E mais ' + (decisao.length - listados) + ' na Caixa de decisões.');
    texto += linhas.join('\n').replace(/\n+$/, '') + '\n\n';
  }
  if (acompanhamento) texto += 'Para acompanhar (vencimentos de clientes, não sobem a escada): ' + acompanhamento + ' item(ns) na aba Acompanhamento da caixa.\n\n';
  if (temExtra) texto += extraDiretoria.texto + '\n\n';
  texto += 'Na Caixa de decisões você vê tudo e registra a providência (o que foi feito e até quando acompanhar): ' + link + '\nResolvido na tela de origem, o item sai da caixa sozinho.';
  var titulo = decisao.length ? 'Decisões aguardando você (' + decisao.length + ')' : 'Resumo da gestão para a Diretoria';
  if (extraDiretoria && extraDiretoria.titulo) titulo = extraDiretoria.titulo + (decisao.length ? ' e ' + Ges_plural_(decisao.length, 'decisão sua', 'decisões suas') : '');
  return { titulo: titulo, texto: texto, qtd: decisao.length, ids: decisao.map(function (i) { return i.id; }) };
}

/** Parte da Diretoria: escalados com quem está segurando, áreas sem gestor e relatórios do dia. */
function Ges_textoDiretoria_(cx, ex, relatorios) {
  var cfg = cx.cfg, us = cx.us, linhas = [];
  var escalados = cx.itens.filter(function (i) { return i.escalado && !i.acompanhamento && i.etapa !== 'PAUSADO'; });
  if (escalados.length) {
    linhas.push('ESCALADAS PARA A DIRETORIA (paradas há ' + cfg.escada.diretoriaDiasUteis + ' dias úteis ou mais)');
    escalados.slice(0, GES_MAX_ITENS_EMAIL).forEach(function (i) {
      linhas.push('- ' + i.titulo + '. Com ' + (i.reserva ? 'a Diretoria (área sem gestor)' : (i.responsaveisNomes.join(', ') || 'ninguém')) + ', parado há ' + Ges_plural_(i.diasParado, 'dia útil', 'dias úteis') + ', na caixa desde ' + i.entrouEm.slice(0, 10) + '.' + (i.providencia ? ' Última providência: ' + i.providencia : ''));
    });
    if (escalados.length > GES_MAX_ITENS_EMAIL) linhas.push('E mais ' + (escalados.length - GES_MAX_ITENS_EMAIL) + ' na aba Escaladas da caixa.');
    linhas.push('');
  }
  var semGestor = {};
  cx.itens.forEach(function (i) { if (i.reserva && !i.acompanhamento && i.area && i.modulo !== 'conduta') semGestor[i.areaNome] = (semGestor[i.areaNome] || 0) + 1; });
  var areas = Object.keys(semGestor);
  if (areas.length) {
    linhas.push('ÁREAS SEM GESTOR RESPONSÁVEL (os itens delas vêm para a Diretoria)');
    linhas.push(areas.map(function (a) { return a + ': ' + semGestor[a]; }).join('; ') + '. Configure em Caixa de decisões > Regras e responsáveis.');
    linhas.push('');
  }
  (relatorios || []).forEach(function (r, k) {
    if (!k) linhas.push('RELATÓRIOS');
    linhas.push('- ' + r.nome + (r.link ? ': ' + r.link : ' (veja em Desempenho da gestão > Relatórios)') + (r.aviso ? ' — ' + r.aviso : ''));
  });
  if (!linhas.length) return null;
  return { titulo: escalados.length ? 'Diretoria: ' + Ges_plural_(escalados.length, 'decisão escalada', 'decisões escaladas') : 'Resumo da gestão para a Diretoria', texto: linhas.join('\n').replace(/\n+$/, ''), escalados: escalados.length };
}

/**
 * Um e-mail por pessoa da gestão por dia útil, a partir da hora configurada, só se houver algo.
 * A Diretoria recebe um só e-mail com as decisões dela, os escalados e os relatórios do dia.
 */
function Ges_emailsDiarios_(ex) {
  var cfg = Ges_cfg_();
  if (ex.hora < cfg.escada.horaEmail) return { fora: 'antes de ' + cfg.escada.horaEmail };
  var cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  var envios = Ges_envios_(), dia = ex.dia;
  var cx = Ges_caixa_(), us = cx.us;
  // no dia do semanal ou do mensal, a Diretoria espera os relatórios (até a hora limite)
  var relatorios = Ges_relatoriosDoDia_(envios, dia, cfgExp);
  var esperarRelatorios = relatorios.pendente && ex.hora < GES_HORA_LIMITE_RELATORIOS;
  var enviados = 0, pessoas = 0;
  Object.keys(us).forEach(function (uid) {
    var u = us[uid];
    if (!u.ativo || !u.gestao) return;
    var tipo = u.diretoria ? 'EMAIL_DIRETORIA' : 'EMAIL_GESTOR';
    if (Ges_jaEnviado_(envios, tipo, uid, dia)) return;
    if (u.diretoria && esperarRelatorios) return;
    var minhas = Ges_meusItens_(cx.itens, uid, us).filter(function (i) { return i.responsaveis.indexOf(uid) >= 0; });
    var acomp = cx.itens.filter(function (i) { return i.acompanhamento && i.responsaveis.indexOf(uid) >= 0; }).length;
    var extra = u.diretoria ? Ges_textoDiretoria_(cx, ex, relatorios.lista) : null;
    var msg = Ges_textoEmailGestor_(u, minhas, acomp, cfg, extra);
    if (!msg) return;
    pessoas++;
    var r = { ok: 0, erro: 0, pulado: 0 };
    try {
      r = SGO_notificar_({ usuarios: [uid], canais: ['email'], origem: 'GESTAO_RESUMO', refId: 'GESTAO-' + tipo + '-' + dia + '-' + uid, titulo: msg.titulo, texto: msg.texto, link: Ges_linkTela_('gestao_decisoes') });
    } catch (e) { r = { ok: 0, erro: 1, pulado: 0, motivo: String((e && e.message) || e) }; }
    Ges_registrarEnvio_({ tipo: tipo, uid: uid, nome: u.nome, dia: dia, qtd: msg.qtd, itens: msg.ids.join(','), situacao: r.ok ? 'OK' : r.pulado ? 'PULADO' : 'ERRO', motivo: r.ok ? 'entregue ao serviço de e-mail' : r.motivo });
    if (r.ok) enviados++;
  });
  return { pessoas: pessoas, enviados: enviados, aguardandoRelatorios: esperarRelatorios };
}

// ------------------------------------------------------------
// WHATSAPP: resumo do dia do gestor (sutil)
// ------------------------------------------------------------
function Ges_modeloWhatsAprovado_() {
  var forcado = '';
  try { forcado = Ges_up_(PropertiesService.getScriptProperties().getProperty('GES_RESUMO_MODELO_APROVADO')); } catch (e) {}
  if (forcado === 'SIM') return true;
  if (forcado === 'NAO') return false;
  var cache = CacheService.getScriptCache(), g = cache.get('GES_MODELO_RESUMO_OK');
  if (g) return g === 'SIM';
  var ok = false;
  try {
    if (typeof Chaves_metaListarModelos_ === 'function' && typeof Notificar_credenciaisMeta_ === 'function') {
      var cred = Notificar_credenciaisMeta_();
      if (cred.token && cred.wabaId) {
        var l = Chaves_metaListarModelos_(cred);
        ok = !!(l.ok && (l.lista || []).some(function (m) { return String(m.name || '') === GES_MODELO_WHATS && String(m.language || '') === NTF_META_IDIOMA && Ges_up_(m.status) === 'APPROVED'; }));
      }
    }
  } catch (e) { ok = false; }
  cache.put('GES_MODELO_RESUMO_OK', ok ? 'SIM' : 'NAO', 21600);
  return ok;
}

/** "1 atrasada, 2 vencem hoje" das atividades da própria pessoa (o resumo da gestão substitui o de atividades no dia). */
function Ges_textoAtividadesDe_(uid) {
  if (typeof Atividades_todas_ !== 'function') return 'veja em Minhas atividades';
  var agora = Atividades_agora_(), hoje = agora.slice(0, 10), atr = 0, hj = 0;
  Atividades_todas_().forEach(function (a) {
    if (a.RESPONSAVEL_ID !== uid || !Atividades_aberta_(a) || !a.PREVISAO_ATUAL) return;
    if (a.PREVISAO_ATUAL < agora) atr++; else if (a.PREVISAO_ATUAL.slice(0, 10) === hoje) hj++;
  });
  if (!atr && !hj) return 'nenhuma atrasada ou para hoje';
  return [atr ? Ges_plural_(atr, 'atrasada', 'atrasadas') : '', hj ? (hj === 1 ? '1 vence hoje' : hj + ' vencem hoje') : ''].filter(Boolean).join(', ');
}

/**
 * Um resumo por gestor por dia útil, só se ele tem decisão parada há N dias úteis (padrão 2) ou mais.
 * Chamado pela rotina da gestão e no começo do resumo de atividades (SGO_Atividades_Avisos.js), para sair antes dele.
 * O notificador confere de novo vínculo, horário e o limite de uma mensagem por dia (categoria GESTAO).
 */
function Gestao_whatsDiario_(quando) {
  var cfg = Ges_cfg_();
  if (!cfg.escada.whatsapp) return { fora: 'WhatsApp da escada desligado' };
  var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(quando || new Date()) : { dentro: true, hora: '09:00', dia: Ges_hoje_() };
  if (!ex.dentro) return { fora: ex.motivo };
  var hora = (typeof Atividades_avisosCfg_ === 'function' ? Atividades_avisosCfg_().horaResumo : '09:00') || '09:00';
  if (ex.hora < hora) return { fora: 'antes da hora do resumo (' + hora + ')' };
  var envios = Ges_envios_(), dia = ex.dia, cx = null, enviados = 0, avaliados = 0;
  var us = Ges_usuarios_();
  Object.keys(us).forEach(function (uid) {
    var u = us[uid];
    if (!u.ativo || !u.gestao || Ges_jaEnviado_(envios, 'WHATS_GESTOR', uid, dia)) return;
    if (!cx) cx = Ges_caixa_();
    var minhas = cx.itens.filter(function (i) { return !i.acompanhamento && i.responsaveis.indexOf(uid) >= 0; });
    var paradas = minhas.filter(function (i) { return i.diasParado >= cfg.escada.whatsDiasUteis && i.etapa !== 'PAUSADO'; });
    if (!paradas.length) return;
    avaliados++;
    var atv = Ges_textoAtividadesDe_(uid);
    var modelo = Ges_modeloWhatsAprovado_() ? { nome: GES_MODELO_WHATS, parametros: ['@NOME', String(minhas.length), String(paradas.length), atv, '@LINK'] } : null;
    var texto = 'Decisões aguardando você: ' + minhas.length + '. Paradas há ' + cfg.escada.whatsDiasUteis + ' dias úteis ou mais: ' + paradas.length + '. Suas atividades: ' + atv + '. Veja na Caixa de decisões do SGO+.';
    var r = { ok: 0, erro: 0, pulado: 0 };
    try {
      r = SGO_notificar_({ usuarios: [uid], canais: ['whatsapp'], categoria: 'GESTAO', origem: 'GESTAO_RESUMO', refId: 'GESTAO-WHATS-' + dia + '-' + uid,
        titulo: 'Decisões aguardando você', texto: texto, modelo: modelo || undefined, link: Ges_linkTela_('gestao_decisoes') });
    } catch (e) { r = { ok: 0, erro: 1, pulado: 0, motivo: String((e && e.message) || e) }; }
    Ges_registrarEnvio_({ tipo: 'WHATS_GESTOR', uid: uid, nome: u.nome, dia: dia, qtd: paradas.length, itens: paradas.map(function (i) { return i.id; }).join(','),
      situacao: r.ok ? 'OK' : r.pulado ? 'PULADO' : 'ERRO', motivo: r.ok ? 'aceito pelo provedor' + (modelo ? '' : ' (modelo sgo_aviso_geral até a Meta aprovar ' + GES_MODELO_WHATS + ')') : r.motivo });
    if (r.ok) enviados++;
  });
  return { avaliados: avaliados, enviados: enviados };
}

// ------------------------------------------------------------
// RELATÓRIOS DO DIA (semanal e mensal)
// ------------------------------------------------------------
var GES_RELATORIOS_MENSAIS = [
  ['GESTAO', 'Desempenho da gestão'], ['FROTA', 'Frota'], ['CONDUTA', 'Programa de conduta (equipe)'], ['ATIVIDADES', 'Atividades da equipe']
];

/** Relatórios que o e-mail da Diretoria de hoje leva: { lista: [{nome, link, aviso}], pendente }. */
function Ges_relatoriosDoDia_(envios, dia, cfgExp) {
  var cfg = Ges_cfg_(), lista = [], pendente = false;
  if (cfg.escada.semanal && Ges_ehDiaDoSemanal_(dia, cfgExp)) {
    var s = envios.filter(function (e) { return Ges_up_(e.TIPO) === 'SEMANAL' && Ges_s_(e.DIA).slice(0, 10) === dia; })[0];
    if (s) lista.push({ nome: 'Relatório semanal da gestão', link: Ges_s_(s.LINK), aviso: Ges_up_(s.SITUACAO) === 'OK' ? '' : Ges_s_(s.MOTIVO) });
    else pendente = true;
  }
  if (cfg.escada.mensal && cfg.automacoes.relatoriosMensais && Ges_ehDiaDoMensal_(dia, cfgExp)) {
    var comp = Ges_competenciaAnterior_(dia);
    GES_RELATORIOS_MENSAIS.forEach(function (rel) {
      var e = envios.filter(function (x) { return Ges_up_(x.TIPO) === 'MENSAL' && Ges_s_(x.REFERENCIA) === comp + '|' + rel[0]; })[0];
      if (e) lista.push({ nome: rel[1] + ' — ' + (typeof RelA4_competencia_ === 'function' ? RelA4_competencia_(comp) : comp), link: Ges_s_(e.LINK), aviso: Ges_up_(e.SITUACAO) === 'OK' ? '' : Ges_s_(e.MOTIVO) });
      else pendente = true;
    });
  }
  return { lista: lista, pendente: pendente };
}

function Ges_relatorioSemanalDoDia_(ex) {
  var cfg = Ges_cfg_(), cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  if (ex.hora < cfg.escada.horaSemanal || !Ges_ehDiaDoSemanal_(ex.dia, cfgExp)) return { fora: 'não é a hora do semanal' };
  var envios = Ges_envios_();
  if (envios.some(function (e) { return Ges_up_(e.TIPO) === 'SEMANAL' && Ges_s_(e.DIA).slice(0, 10) === ex.dia; })) return { feito: true };
  var g = { salvo: false, aviso: 'relatório semanal indisponível' };
  try { g = Ges_relatorioSemanal_({ nome: 'Rotina automática' }); } catch (e) { g = { salvo: false, aviso: String((e && e.message) || e) }; }
  Ges_registrarEnvio_({ tipo: 'SEMANAL', uid: '', nome: 'Diretoria', dia: ex.dia, ref: 'semana de ' + Ges_brDia_(ex.dia), situacao: g.salvo ? 'OK' : 'ERRO', motivo: g.aviso || '', link: g.link || '' });
  return { gerado: !!g.salvo };
}

/** Um relatório por rodada (a geração de PDF é demorada); o e-mail da Diretoria sai quando todos ficaram prontos. */
function Ges_relatoriosMensais_(ex) {
  var cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  if (!Ges_ehDiaDoMensal_(ex.dia, cfgExp)) return { fora: 'não é o primeiro dia útil do mês' };
  var comp = Ges_competenciaAnterior_(ex.dia), envios = Ges_envios_();
  var falta = GES_RELATORIOS_MENSAIS.filter(function (rel) { return !envios.some(function (e) { return Ges_up_(e.TIPO) === 'MENSAL' && Ges_s_(e.REFERENCIA) === comp + '|' + rel[0]; }); })[0];
  if (!falta) return { feito: true };
  var g;
  try {
    if (falta[0] === 'GESTAO') { Ges_congelarAvaliacoes_(comp); try { Ges_sugestoesConduta_(comp); } catch (eS) { console.error('Gestão, sugestão ao Programa de conduta: ' + ((eS && eS.message) || eS)); } g = Ges_relatorioDesempenho_(comp, { nome: 'Rotina automática' }); }
    else if (falta[0] === 'FROTA') g = Ges_relatorioFrotaMes_(comp);
    else if (falta[0] === 'CONDUTA') g = Ges_relatorioCondutaMes_(comp);
    else g = Ges_relatorioAtividades_(comp, { nome: 'Rotina automática' });
  } catch (e) { g = { salvo: false, aviso: String((e && e.message) || e).slice(0, 300) }; }
  Ges_registrarEnvio_({ tipo: 'MENSAL', uid: '', nome: 'Diretoria', dia: ex.dia, ref: comp + '|' + falta[0], situacao: g && g.salvo ? 'OK' : 'ERRO', motivo: (g && g.aviso) || '', link: (g && g.link) || '' });
  return { gerado: falta[0], salvo: !!(g && g.salvo) };
}

/** Frota do mês (relatório geral do módulo, sem sessão). */
function Ges_relatorioFrotaMes_(comp) {
  if (typeof FrotaRel_agregarDados_ !== 'function') return { salvo: false, aviso: 'módulo Frota indisponível' };
  var a = +comp.slice(0, 4), m = +comp.slice(5, 7), ult = new Date(Date.UTC(a, m, 0)).getUTCDate();
  var ini = '01/' + Ges_2_(m) + '/' + a, fim = Ges_2_(ult) + '/' + Ges_2_(m) + '/' + a;
  try { Frota_bootstrap_(); } catch (e) {}
  var dados = FrotaRel_agregarDados_(ini, fim);
  var analise = RelA4_analise_(FrotaIA_promptFrota_(dados), FrotaRel_textoPadraoGeral_(dados));
  var html = FrotaRel_montarDocumentoHtml_(dados, analise.texto, 'Rotina automática (relatórios do mês)');
  var g = RelA4_salvar_(FrotaRel_pastaDestino_('Frota completa'), 'Frota completa ' + ini.replace(/\//g, '-') + ' a ' + fim.replace(/\//g, '-'), html, { compartilhar: true });
  return { salvo: g.salvo, link: g.pdfUrl, aviso: [g.aviso, analise.aviso].filter(Boolean).join(' ') };
}

/** Programa de conduta: relatório de todos os colaboradores do mês (gestão, Diretoria e RH; não é público). */
function Ges_relatorioCondutaMes_(comp) {
  if (typeof CondutaEq_contexto_ !== 'function') return { salvo: false, aviso: 'Programa de conduta indisponível' };
  try { Conduta_setup_(); } catch (e) {}
  var g = RelA4_salvar_(CondutaRel_pastaRelatorios_('Relatórios da equipe'), comp, CondutaEq_html_(CondutaEq_contexto_(comp, comp)), { compartilhar: false });
  return { salvo: g.salvo, link: g.pdfUrl, aviso: g.aviso };
}

// ------------------------------------------------------------
// AUTOMAÇÕES
// ------------------------------------------------------------
/** CNH vencendo: e-mail direto ao condutor com 30, 15 e 7 dias (um aviso de cada); vencida não repete aqui (vai para a caixa). */
function Ges_autoCnhCondutor_(ex) {
  var aba = SGO_CFG.SHEETS.CAD_CONDUTORES;
  if (!aba) return { fora: 'sem cadastro de condutores' };
  var envios = Ges_envios_(), enviados = 0;
  Ges_ler_(aba).forEach(function (c) {
    if (Ges_up_(c.STATUS) === 'INATIVO') return;
    var uid = Ges_s_(c.USUARIO_ID), venc = Ges_dia_(c.CNH_VALIDADE);
    if (!uid || !venc) return;
    var dias = Pend_diasAte_(venc, ex.dia);
    if (dias === null || dias < 0 || dias > GES_CNH_LIMIARES[0]) return;
    // o menor limiar já alcançado; avisa uma vez por limiar e por validade
    var limiar = GES_CNH_LIMIARES.filter(function (l) { return dias <= l; }).pop();
    var ref = Ges_s_(c.ID) + '|' + venc + '|' + limiar;
    if (envios.some(function (e) { return Ges_up_(e.TIPO) === 'CNH_CONDUTOR' && Ges_s_(e.REFERENCIA) === ref; })) return;
    var nome = Ges_s_(c.NOME) || 'condutor';
    var texto = 'A sua CNH vence em ' + Ges_brDia_(venc) + (dias === 0 ? ' (hoje)' : ' (faltam ' + Ges_plural_(dias, 'dia', 'dias') + ')') + '.\n\n' +
      'Com a CNH vencida você não pode retirar veículo da frota, e a reserva só é aceita com a CNH válida até o fim dela.\n\n' +
      'O que fazer: renove a CNH e entregue a cópia nova à gestão da frota, que atualiza a validade em Frota > Veículos e condutores > Condutores.' +
      (limiar === 7 ? '\n\nA partir de agora a gestão da frota também acompanha a renovação.' : '');
    var r = { ok: 0, pulado: 0, erro: 0 };
    try { r = SGO_notificar_({ usuarios: [uid], canais: ['email'], origem: 'GESTAO_CNH', refId: 'CNH-' + ref, titulo: 'Sua CNH vence em ' + Ges_brDia_(venc), texto: texto }); }
    catch (e) { r = { ok: 0, erro: 1, pulado: 0, motivo: String((e && e.message) || e) }; }
    Ges_registrarEnvio_({ tipo: 'CNH_CONDUTOR', uid: uid, nome: nome, dia: ex.dia, ref: ref, qtd: dias, situacao: r.ok ? 'OK' : r.pulado ? 'PULADO' : 'ERRO', motivo: r.ok ? 'aviso de ' + limiar + ' dias enviado ao condutor' : r.motivo });
    if (r.ok) enviados++;
  });
  return { enviados: enviados };
}

/** Identidade da rotina nas APIs de Minhas atividades (o identificador vale só nesta execução). */
function Ges_comoSistema_(fn) {
  var anterior = typeof ATV_PONTE_CTX !== 'undefined' ? ATV_PONTE_CTX : null;
  var token = 'GESTAO-' + Utilities.getUuid();
  ATV_PONTE_CTX = { token: token, eu: { id: 'GESTAO_ROTINA', usuario: 'sistema', nome: 'Rotina da gestão', perfil: 'SISTEMA', gestor: true, sistema: 'SGO+' } };
  try { return fn(token); } finally { ATV_PONTE_CTX = anterior; }
}

/** Gestor que recebe a agenda da Frota: o primeiro responsável pela área da Frota; sem ninguém, a Diretoria. */
function Ges_gestorDaArea_(area, us, cfg) {
  var l = ((cfg.gestoresPorArea || {})[area] || []).filter(function (id) { return us[id] && us[id].ativo; });
  if (l.length) return l[0];
  return Ges_diretoria_(us, [])[0] || '';
}

/** Manutenção prevista (data ou KM) vira atividade do gestor da Frota: entra na agenda e no Gantt de Minhas atividades. */
function Ges_autoManutencaoAgenda_() {
  if (typeof Frota_calcularAlertasManutencao_ !== 'function' || typeof Atividades_apiCriar !== 'function' || !SGO_CFG.SHEETS.CAD_VEICULOS) return { fora: 'Frota ou Atividades indisponível' };
  var cfg = Ges_cfg_(), us = Ges_usuarios_(), hoje = Ges_hoje_(), envios = Ges_envios_(), criadas = 0;
  var area = Ges_areaDoModulo_('frota', cfg), resp = Ges_gestorDaArea_(area, us, cfg);
  if (!resp) return { fora: 'sem gestor da Frota nem Diretoria ativa' };
  var corte = Ges_somarDias_(hoje, -60);
  var cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  Frota_calcularAlertasManutencao_().forEach(function (a) {
    if (a.categoria !== 'MANUTENCAO') return;
    var ref = Ges_s_(a.veiculoId) + '|' + Ges_s_(a.tipo);
    if (envios.some(function (e) { return Ges_up_(e.TIPO) === 'AUTO_MANUTENCAO' && Ges_s_(e.REFERENCIA) === ref && Ges_s_(e.DIA).slice(0, 10) >= corte; })) return;
    var venc = Ges_dia_(a.vencimento), porKm = !venc;
    var prazo = venc && venc > hoje ? venc : Ges_somarDiasUteis_(hoje, 2, cfgExp);
    var placa = Ges_s_(a.veiculoPlaca) || 'veículo';
    var r = null;
    try {
      r = Ges_comoSistema_(function (t) {
        return Atividades_apiCriar(t, { titulo: 'Agendar ' + Ges_s_(a.tipoLabel).toLowerCase() + ' do veículo ' + placa, prazo: prazo + 'T17:00', prioridade: a.status === 'VENCIDO' ? 'Urgente' : 'Alta',
          responsavelId: resp, modulo: 'frota', moduloNome: 'Frota',
          descricao: 'Lançada sozinha pela rotina da gestão: a manutenção "' + Ges_s_(a.tipoLabel) + '" do veículo ' + placa + ' está ' + (a.status === 'VENCIDO' ? 'vencida' : 'próxima') +
            (porKm ? ' pela quilometragem' : ' (prevista para ' + Ges_brDia_(venc) + ')') + '.\nAgende a oficina, registre a parada programada em Frota > Manutenção e paradas (o veículo sai das reservas no período) e, depois do serviço, lance a manutenção: o aviso some sozinho.',
          porQue: 'Manutenção preventiva no prazo evita parada não planejada e custo maior.', onde: 'Frota > Manutenção e paradas', como: 'Agendar com a oficina e registrar a parada programada.' });
      });
    } catch (e) { r = { ok: false, message: String((e && e.message) || e) }; }
    Ges_registrarEnvio_({ tipo: 'AUTO_MANUTENCAO', uid: resp, nome: us[resp] ? us[resp].nome : '', dia: hoje, ref: ref, situacao: r && r.ok ? 'OK' : 'ERRO', motivo: r && r.ok ? 'atividade ' + Ges_s_(r.item && r.item.ID) + ' lançada' : (r && r.message) || 'falha', itens: r && r.item ? Ges_s_(r.item.ID) : '' });
    if (r && r.ok) criadas++;
  });
  return { criadas: criadas };
}

/** Atividade aberta com responsável inativo, apagado ou vazio volta para quem lançou (ou para o gestor da área), com histórico e aviso. */
function Ges_autoAtividadeSemResponsavel_() {
  if (typeof Atividades_todas_ !== 'function' || typeof Atividades_abas_ !== 'function') return { fora: 'Atividades indisponível' };
  var us = Ges_usuarios_(), cfg = Ges_cfg_(), devolvidas = 0;
  var abertas = Atividades_todas_().filter(function (a) { return Atividades_aberta_(a) && !(us[a.RESPONSAVEL_ID] && us[a.RESPONSAVEL_ID].ativo); });
  if (!abertas.length) return { devolvidas: 0 };
  var eu = { id: 'GESTAO_ROTINA', nome: 'Rotina da gestão' };
  ATV_FILA_NTF = [];
  Atividades_comTrava_(function () {
    abertas.forEach(function (a) {
      var antes = us[a.RESPONSAVEL_ID];
      var novo = us[a.CRIADO_POR_ID] && us[a.CRIADO_POR_ID].ativo ? a.CRIADO_POR_ID : '';
      if (!novo && antes) novo = Ges_gestorDaArea_(antes.area, us, cfg);
      if (!novo) novo = Ges_diretoria_(us, [])[0] || '';
      if (!novo || novo === a.RESPONSAVEL_ID) return;
      var motivo = !a.RESPONSAVEL_ID ? 'estava sem responsável' : (antes ? antes.nome + ' está inativo(a) no SGO+' : 'o responsável não existe mais no cadastro');
      SGO_DATA.update(Atividades_abas_().ATIVIDADES, a.ID, { RESPONSAVEL_ID: novo, RESPONSAVEL_NOME: us[novo].nome, ATUALIZADO_EM: Atividades_agora_() });
      Atividades_registrarHist_(eu, a.ID, 'RESPONSAVEL', { de: Ges_s_(a.RESPONSAVEL_NOME), para: us[novo].nome, texto: 'Devolvida pela rotina da gestão: ' + motivo + '. Novo responsável: ' + us[novo].nome + (novo === a.CRIADO_POR_ID ? ' (quem lançou)' : '') + '.' });
      Atividades_avisar_(novo, a.ID, 'NOVA', 'Atividade devolvida para você', 'A atividade "' + a.TITULO + '" ' + motivo + ' e voltou para você. Reatribua a alguém da equipe ou conclua.', { email: true });
      devolvidas++;
    });
  });
  try { if (typeof Atividades_enviarFila_ === 'function') Atividades_enviarFila_(); } catch (e) {}
  try { if (devolvidas) SGO_DATA.log('GESTAO_ATIVIDADE_DEVOLVIDA', 'sistema', devolvidas + ' atividade(s) sem responsável ativo devolvida(s) a quem lançou', 'ATIVIDADES'); } catch (e) {}
  return { devolvidas: devolvidas };
}

/** Lista das sugestões do copiloto da Frota (alta gravidade, sem decisão) para a caixa, no máximo a cada 3 horas. */
function Ges_atualizarCopiloto_(forcar) {
  if (typeof FrotaR_sugestoes_ !== 'function' || typeof FrotaR_copilotoDecisoes_ !== 'function') return { fora: 'copiloto indisponível' };
  var props = PropertiesService.getScriptProperties();
  var atual = Ges_json_(props.getProperty('GES_COPILOTO_CACHE'), null);
  if (!forcar && atual && atual.em && (Date.now() - new Date(atual.em).getTime()) < 3 * 3600000) return { recente: true };
  // Frota nunca usada (abas ainda não criadas): não há sugestão para ler
  if (!SGO_CFG.SHEETS.CAD_VEICULOS || !Ges_ler_(SGO_CFG.SHEETS.CAD_VEICULOS).length) return { fora: 'sem veículos cadastrados' };
  try { if (typeof Frota_bootstrap_ === 'function') Frota_bootstrap_(); } catch (eB) {}
  var dec = FrotaR_copilotoDecisoes_(), cnd = {}, antes = {};
  (atual && atual.itens || []).forEach(function (s) { antes[s.chave] = s.desde; });
  try { Ges_ler_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { cnd[Ges_s_(c.ID)] = Ges_s_(c.USUARIO_ID); }); } catch (e) {}
  var hoje = Ges_hoje_();
  var itens = (FrotaR_sugestoes_(30) || []).filter(function (s) { return s.gravidade === 'ALTA' && !dec[s.chave]; }).slice(0, 30).map(function (s) {
    return { chave: s.chave, titulo: Ges_s_(s.titulo).slice(0, 200), detalhe: Ges_s_(s.detalhe).slice(0, 300), placa: Ges_s_(s.placa), condutorUsuarioId: cnd[Ges_s_(s.condutorId)] || '', desde: antes[s.chave] || hoje };
  });
  var txt = JSON.stringify({ em: new Date().toISOString(), itens: itens });
  while (txt.length > 8500 && itens.length) { itens.pop(); txt = JSON.stringify({ em: new Date().toISOString(), itens: itens }); }
  props.setProperty('GES_COPILOTO_CACHE', txt);
  return { itens: itens.length };
}
