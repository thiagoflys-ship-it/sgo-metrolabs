/****************************************************
 * PROGRAMA DE CONDUTA — INCENTIVO DE MISSÃO CONFERIDO POR O.S. (13/11/2026)
 *
 * Pedido do dono (13/11/2026): "A regra do incentivo é por O.S. e não por
 * deslocamento, quantas vezes ele for lá. [...] temos que ter como
 * fiscalizar isso para saber informar se é elegível ou não."
 * Regra oficial: MAN-VIA-001 Rev. 03 (vigência 01/10/2026).
 *
 * O que este arquivo faz: para cada O.S. de campo da Assistência técnica
 * (ATEC_OS), por executante, diz "Incentivo: devido / não devido / pendente"
 * e o motivo de cada requisito do manual:
 *   1. distância cadastral do cliente ou unidade (qual_distancia_referencia,
 *      medida da sede) de 200 km ou mais (MISSAO_KM_MINIMO);
 *   2. execução concluída, relatório emitido no prazo e fotos mínimas;
 *   3. nenhuma ocorrência do executante dentro da missão;
 *   4. retorno Tipo A (erro da equipe) não gera novo incentivo; retorno por
 *      falha do equipamento ou escopo novo gera;
 *   5. interrompida pelo cliente = devido; pelo executante = não devido;
 *   6. duas O.S. na mesma saída = uma missão (critério abaixo);
 *   7. gravíssima firme do executante no mês zera os incentivos dele.
 * E compara com as missões LANÇADAS à mão (qual_missao), que continuam sendo
 * a base do fechamento do mês (nada aqui muda o fechamento): mostra a
 * divergência entre "missão lançada" e "O.S. elegível".
 *
 * Só mostra e permite CONFERIR: não gera pagamento, ocorrência nem aviso.
 * A única gravação é a classificação da gestão (aba qual_missao_os: retorno,
 * interrupção, mesma saída e ocorrência fora da missão), com quem e quando.
 *
 * Critério da "mesma saída" (os dados não têm o registro de retorno à sede):
 *  - O.S. do mesmo executante no mesmo dia = mesma saída (uma missão só;
 *    conta na primeira O.S. que cumpre os requisitos);
 *  - O.S. no dia seguinte ao de outra O.S. elegível = provável mesma saída:
 *    fica PENDENTE até a gestão dizer "mesma saída" ou "nova saída";
 *  - dois dias ou mais de intervalo = nova saída (a gestão pode juntar).
 *  O.S. local (distância cadastrada abaixo do mínimo) e O.S. cancelada sem
 *  deslocamento não entram no agrupamento.
 *  Uma O.S. com vários deslocamentos (pausada e retomada) é uma O.S. só:
 *  um incentivo, como o dono decidiu.
 ****************************************************/

var CONDUTA_MOS_ABA = 'qual_missao_os';
var CONDUTA_MOS_COLUNAS = ['ID', 'OS_ID', 'OS_NUMERO', 'RETORNO', 'INTERRUPCAO', 'SAIDA', 'OCORRENCIAS_FORA_JSON', 'OBS',
  'CONFERIDO_POR_ID', 'CONFERIDO_POR_NOME', 'CONFERIDO_EM', 'HISTORICO_JSON', 'CRIADO_EM'];
var CONDUTA_MOS_RETORNOS = { NAO: 'Não é retorno', TIPO_A: 'Retorno Tipo A (erro da equipe)', EQUIPAMENTO: 'Retorno por falha do equipamento', ESCOPO_NOVO: 'Retorno por escopo novo' };
var CONDUTA_MOS_INTERRUPCOES = { CLIENTE: 'Interrompida por causa do cliente', EXECUTANTE: 'Interrompida por falha do executante' };
var CONDUTA_MOS_SAIDAS = { MESMA: 'Mesma saída da O.S. anterior (não voltou à sede)', NOVA: 'Nova saída (voltou à sede antes desta O.S.)' };
var CONDUTA_MOS_ESTADOS = { DEVIDO: 'Devido', NAO_DEVIDO: 'Não devido', PENDENTE: 'Pendente' };
// Padrões quando o parâmetro não existe em qual_parametro (MAN-VIA-001 §5 e §7: o gestor libera em até 3 dias úteis; fotos antes e depois)
var CONDUTA_MOS_PRAZO_RELATORIO_PADRAO = 3;
var CONDUTA_MOS_FOTOS_MIN_PADRAO = 2;
var CONDUTA_MOS_OCOR_ENCERRADAS = ['ANULADA', 'DESCARTADA', 'REJEITADA'];

// ------------------------------------------------------------
// utilidades puras
// ------------------------------------------------------------
function CondutaMOS_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function CondutaMOS_up_(v) { return CondutaMOS_s_(v).toUpperCase(); }
function CondutaMOS_dia_(v) {
  if (v && typeof v === 'object' && v.$d) v = v.$d;
  if (v instanceof Date) return Conduta_soData_(v);
  var m = CondutaMOS_s_(v).match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
}
function CondutaMOS_diasEntre_(a, b) {
  if (!a || !b) return null;
  var pa = a.split('-'), pb = b.split('-');
  return Math.round((Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 86400000);
}
function CondutaMOS_br_(dia) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(CondutaMOS_s_(dia)); return m ? m[3] + '/' + m[2] + '/' + m[1] : CondutaMOS_s_(dia); }
/** Texto para comparar cidades e destinos: sem acento, minúsculo, só letras e números ("FORMOSA/GO" = "Formosa GO"). */
function CondutaMOS_norm_(v) {
  return CondutaMOS_s_(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function CondutaMOS_num_(v) { var n = Number(String(v === null || v === undefined ? '' : v).replace(',', '.')); return CondutaMOS_s_(v) !== '' && isFinite(n) ? n : null; }
function CondutaMOS_json_(v, padrao) { try { var x = JSON.parse(CondutaMOS_s_(v) || 'null'); return x === null ? padrao : x; } catch (e) { return padrao; } }
function CondutaMOS_moeda_(v) { return 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function CondutaMOS_plural_(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

/** Cidade da sede a partir do parâmetro SEDE_ENDERECO ("..., Goiania/GO"). */
function CondutaMOS_sedeCidade_(endereco) {
  var m = /([^,]+)\/([A-Za-z]{2})\s*$/.exec(CondutaMOS_s_(endereco));
  return m ? CondutaMOS_norm_(m[1] + ' ' + m[2]) : 'goiania go';
}

/**
 * Distância cadastral da O.S. (MAN-VIA-001 §1 e §2: medida da sede, registrada uma vez no cadastro). Ordem: CNPJ da unidade ou do
 * cliente na tabela de distâncias; cidade/UF da unidade; o cliente (só quando a unidade não tem cidade); a cidade da sede (0 km).
 * { km, destino, fonte, referenciaId } ou { km: null, motivo }.
 */
function CondutaMOS_distancia_(os, ctx) {
  var un = ctx.unidades[CondutaMOS_s_(os.UNIDADE_ID)] || {}, cli = ctx.clientes[CondutaMOS_s_(os.CLIENTE_ID)] || {};
  var cnpjs = [un.CNPJ_UNIDADE, cli.CNPJ].map(function (c) { return CondutaMOS_s_(c).replace(/\D/g, ''); }).filter(function (c) { return c.length >= 11; });
  var cidade = CondutaMOS_s_(un.CIDADE) ? CondutaMOS_norm_(CondutaMOS_s_(un.CIDADE) + ' ' + CondutaMOS_s_(un.UF)) : '';
  var refs = ctx.refs, r = null, fonte = '';
  for (var i = 0; !r && i < refs.length; i++) if (refs[i].cnpj && cnpjs.indexOf(refs[i].cnpj) >= 0) { r = refs[i]; fonte = 'CNPJ do cadastro'; }
  for (var j = 0; !r && cidade && j < refs.length; j++) if (refs[j].norm === cidade) { r = refs[j]; fonte = 'cidade da unidade'; }
  for (var k = 0; !r && !cidade && k < refs.length; k++) if (refs[k].clienteId && refs[k].clienteId === CondutaMOS_s_(os.CLIENTE_ID)) { r = refs[k]; fonte = 'cliente'; }
  if (r) return { km: r.km, destino: r.destino, fonte: fonte, referenciaId: r.id };
  if (cidade && cidade === ctx.sedeCidade) return { km: 0, destino: CondutaMOS_s_(un.CIDADE) + '/' + CondutaMOS_s_(un.UF), fonte: 'mesma cidade da sede', referenciaId: '' };
  return { km: null, destino: cidade ? CondutaMOS_s_(un.CIDADE) + '/' + CondutaMOS_s_(un.UF) : '',
    motivo: cidade ? 'a distância de ' + CondutaMOS_s_(un.CIDADE) + '/' + CondutaMOS_s_(un.UF) + ' não está cadastrada' : 'a unidade não tem cidade e o cliente não tem distância cadastrada' };
}

/** Dia da execução da O.S.: saída, chegada, início, conclusão ou o agendamento (O.S. ainda não executada). */
function CondutaMOS_diaOS_(os) {
  return CondutaMOS_dia_(os.SAIU_EM) || CondutaMOS_dia_(os.CHEGOU_EM) || CondutaMOS_dia_(os.INICIO_EM) || CondutaMOS_dia_(os.CONCLUIU_EM) || CondutaMOS_dia_(os.AGENDADO_PARA);
}
function CondutaMOS_diaFimOS_(os) {
  return CondutaMOS_dia_(os.CONCLUIU_EM) || CondutaMOS_dia_(os.ENCERRADA_EM) || CondutaMOS_dia_(os.CANCELADA_EM) || CondutaMOS_diaOS_(os);
}
function CondutaMOS_houveDeslocamento_(os) { return !!(CondutaMOS_s_(os.SAIU_EM) || CondutaMOS_s_(os.CHEGOU_EM) || CondutaMOS_s_(os.INICIO_EM)); }

function CondutaMOS_crit_(chave, estado, texto, extra) { var c = { chave: chave, estado: estado, texto: texto }; if (extra) { c.ids = extra.ids; c.codigos = extra.codigos; } return c; }

/**
 * Requisitos de uma O.S. que não dependem do executante nem da saída: execução, relatório no prazo, fotos e retorno.
 * Devolve { criterios[], estado: 'OK'|'NAO'|'PENDENTE', interrompidaCliente }.
 */
function CondutaMOS_criteriosOS_(os, ctx, conf) {
  var c = [], sit = CondutaMOS_up_(os.SITUACAO), fimDia = CondutaMOS_dia_(os.CONCLUIU_EM) || CondutaMOS_dia_(os.ENCERRADA_EM);
  var tipo = ctx.tipos[CondutaMOS_up_(os.TIPO_CODIGO)] || {}, interrompidaCliente = false;
  if (sit === 'CANCELADA') {
    var it = CondutaMOS_up_(conf.INTERRUPCAO);
    if (!CondutaMOS_houveDeslocamento_(os)) c.push(CondutaMOS_crit_('EXECUCAO', 'NAO', 'O.S. cancelada antes da saída: não houve deslocamento' + (CondutaMOS_s_(os.CANCELADA_MOTIVO) ? ' (' + CondutaMOS_s_(os.CANCELADA_MOTIVO) + ')' : '') + '.'));
    else if (it === 'CLIENTE') { interrompidaCliente = true; c.push(CondutaMOS_crit_('EXECUCAO', 'OK', 'Interrompida por causa do cliente (classificada pela gestão): o deslocamento aconteceu, o incentivo é devido.')); }
    else if (it === 'EXECUTANTE') c.push(CondutaMOS_crit_('EXECUCAO', 'NAO', 'Interrompida por falha do executante (classificada pela gestão): incentivo não devido.'));
    else c.push(CondutaMOS_crit_('EXECUCAO', 'PENDENTE', 'O.S. cancelada depois da saída' + (CondutaMOS_s_(os.CANCELADA_MOTIVO) ? ' (' + CondutaMOS_s_(os.CANCELADA_MOTIVO) + ')' : '') + ': a gestão classifica se foi por causa do cliente (devido) ou do executante (não devido).'));
  } else if (sit === 'ENCERRADA' || sit === 'DOC_PENDENTE') {
    c.push(CondutaMOS_crit_('EXECUCAO', 'OK', 'Serviço concluído em ' + CondutaMOS_br_(fimDia || CondutaMOS_diaOS_(os)) + '.'));
  } else {
    c.push(CondutaMOS_crit_('EXECUCAO', 'PENDENTE', 'O.S. ainda não concluída (situação: ' + (CondutaMOS_s_(ctx.situacoes[sit]) || sit || 'sem situação') + ').'));
  }
  if (!interrompidaCliente && (sit === 'ENCERRADA' || sit === 'DOC_PENDENTE')) {
    var limite = fimDia ? Conduta_somarDiasUteis_(fimDia, ctx.prazoRelatorio) : '', relDia = CondutaMOS_dia_(os.RELATORIO_EM), venceu = !!limite && ctx.hoje > limite;
    if (relDia && (!limite || relDia <= limite)) c.push(CondutaMOS_crit_('RELATORIO', 'OK', 'Relatório emitido em ' + CondutaMOS_br_(relDia) + ' (prazo: ' + CondutaMOS_plural_(ctx.prazoRelatorio, 'dia útil', 'dias úteis') + ' depois da conclusão).'));
    else if (relDia) c.push(CondutaMOS_crit_('RELATORIO', 'NAO', 'Relatório emitido em ' + CondutaMOS_br_(relDia) + ', depois do prazo (' + CondutaMOS_br_(limite) + ').'));
    else if (venceu) c.push(CondutaMOS_crit_('RELATORIO', 'NAO', 'Relatório não emitido até o prazo (' + CondutaMOS_br_(limite) + ').'));
    else c.push(CondutaMOS_crit_('RELATORIO', 'PENDENTE', 'Relatório ainda não emitido; prazo até ' + CondutaMOS_br_(limite || ctx.hoje) + '.'));
    var min = Math.max(ctx.fotosMin, Number(tipo.FOTOS_MIN) || 0), qtd = Math.max(Number(os.QTD_FOTOS) || 0, ctx.fotosPorOS[CondutaMOS_s_(os.ID)] || 0);
    if (qtd >= min) c.push(CondutaMOS_crit_('FOTOS', 'OK', CondutaMOS_plural_(qtd, 'foto', 'fotos') + ' (mínimo ' + min + ').'));
    else c.push(CondutaMOS_crit_('FOTOS', venceu ? 'NAO' : 'PENDENTE', CondutaMOS_plural_(qtd, 'foto', 'fotos') + ', abaixo do mínimo de ' + min + (venceu ? ' (prazo vencido em ' + CondutaMOS_br_(limite) + ').' : '; regularize até ' + CondutaMOS_br_(limite || ctx.hoje) + '.')));
  }
  // retorno: chamado marcado como reincidente (mesmo equipamento em até 90 dias) ou segunda O.S. do mesmo chamado
  var ch = ctx.chamados[CondutaMOS_s_(os.CHAMADO_ID)] || {}, anteriores = (ctx.osPorChamado[CondutaMOS_s_(os.CHAMADO_ID)] || []).filter(function (o) {
    return o.ID !== os.ID && CondutaMOS_up_(o.SITUACAO) !== 'CANCELADA' && CondutaMOS_diaOS_(o) && CondutaMOS_diaOS_(o) < CondutaMOS_diaOS_(os);
  });
  var reinc = CondutaMOS_up_(ch.REINCIDENTE) === 'SIM', ret = CondutaMOS_up_(conf.RETORNO);
  if (reinc || anteriores.length || ret) {
    var deOnde = reinc ? 'chamado reincidente (mesmo equipamento do ' + (CondutaMOS_s_(ch.REINCIDENCIA_DE) || 'chamado anterior') + ')' : anteriores.length ? 'segunda O.S. do chamado ' + CondutaMOS_s_(os.CHAMADO_NUMERO) + ' (antes: ' + anteriores.map(function (o) { return o.NUMERO; }).join(', ') + ')' : 'classificada como retorno pela gestão';
    if (ret === 'TIPO_A') c.push(CondutaMOS_crit_('RETORNO', 'NAO', 'Retorno Tipo A (erro da equipe), ' + deOnde + ': não gera novo incentivo (MAN-VIA-001 §3; a ocorrência CAM-03 é registrada pela gestão na Conduta).'));
    else if (ret === 'EQUIPAMENTO' || ret === 'ESCOPO_NOVO') c.push(CondutaMOS_crit_('RETORNO', 'OK', CONDUTA_MOS_RETORNOS[ret] + ', ' + deOnde + ': é nova missão.'));
    else if (ret === 'NAO') c.push(CondutaMOS_crit_('RETORNO', 'OK', 'A gestão conferiu: não é retorno (' + deOnde + ').'));
    else c.push(CondutaMOS_crit_('RETORNO', 'PENDENTE', 'Possível retorno: ' + deOnde + '. A gestão classifica: Tipo A (erro da equipe, não devido), falha do equipamento ou escopo novo (devido) ou não é retorno.'));
  }
  var estado = c.some(function (x) { return x.estado === 'NAO'; }) ? 'NAO' : c.some(function (x) { return x.estado === 'PENDENTE'; }) ? 'PENDENTE' : 'OK';
  return { criterios: c, estado: estado, interrompidaCliente: interrompidaCliente };
}

/**
 * Apuração pura (sem ler planilha): d = { competencia, hoje, kmMinimo, valor, prazoRelatorio, fotosMin, sedeEndereco, os[], chamados[],
 * tipos[], refs[], unidades[], clientes[], fotos[], missoes[], ocorrencias[], conferencias[], usuarios[], situacoes{} }.
 * Devolve { competencia, valor, kmMinimo, linhas[], missoes[], porExecutante[], divergencias[], totais }.
 */
function CondutaMOS_apurar_(d) {
  var mapa = function (l, k) { var m = {}; (l || []).forEach(function (x) { m[CondutaMOS_s_(x[k || 'ID'])] = x; }); return m; };
  var ctx = {
    hoje: d.hoje, kmMinimo: Number(d.kmMinimo) || 200, prazoRelatorio: Number(d.prazoRelatorio) || CONDUTA_MOS_PRAZO_RELATORIO_PADRAO, fotosMin: d.fotosMin === undefined || d.fotosMin === null ? CONDUTA_MOS_FOTOS_MIN_PADRAO : Number(d.fotosMin),
    unidades: mapa(d.unidades), clientes: mapa(d.clientes), chamados: mapa(d.chamados), situacoes: d.situacoes || {}, sedeCidade: CondutaMOS_sedeCidade_(d.sedeEndereco),
    tipos: {}, osPorChamado: {}, fotosPorOS: {},
    refs: (d.refs || []).filter(function (r) { return CondutaMOS_s_(r.DESTINO) && CondutaMOS_num_(r.KM_TRECHO) !== null && !CondutaMOS_s_(r.EXCLUIDA_EM); }).map(function (r) {
      return { id: CondutaMOS_s_(r.ID), destino: CondutaMOS_s_(r.DESTINO), norm: CondutaMOS_norm_(r.DESTINO), km: CondutaMOS_num_(r.KM_TRECHO), clienteId: CondutaMOS_s_(r.CLIENTE_ID), cnpj: CondutaMOS_s_(r.CNPJ).replace(/\D/g, '') };
    })
  };
  (d.tipos || []).forEach(function (t) { ctx.tipos[CondutaMOS_up_(t.CODIGO)] = t; });
  (d.fotos || []).forEach(function (f) { if (CondutaMOS_up_(f.ATIVA) === 'NAO' || f.ATIVA === false) return; var k = CondutaMOS_s_(f.OS_ID); ctx.fotosPorOS[k] = (ctx.fotosPorOS[k] || 0) + 1; });
  var nomes = {}; (d.usuarios || []).forEach(function (u) { nomes[CondutaMOS_s_(u.ID)] = CondutaMOS_s_(u.NOME) || CondutaMOS_s_(u.USUARIO); });
  var conf = {}; (d.conferencias || []).forEach(function (c) { conf[CondutaMOS_s_(c.OS_ID)] = c; });
  // O.S. de campo: com visita (tipo sem "SEM_VISITA") e não excluídas
  var lista = (d.os || []).filter(function (o) {
    if (CondutaMOS_s_(o.EXCLUIDO_EM)) return false;
    var t = ctx.tipos[CondutaMOS_up_(o.TIPO_CODIGO)];
    return !(t && CondutaMOS_up_(t.SEM_VISITA) === 'SIM') && !!CondutaMOS_diaOS_(o);
  });
  lista.forEach(function (o) { var k = CondutaMOS_s_(o.CHAMADO_ID); if (k) (ctx.osPorChamado[k] = ctx.osPorChamado[k] || []).push(o); });

  // base de cada O.S.
  var base = {};
  lista.forEach(function (o) {
    var cf = conf[CondutaMOS_s_(o.ID)] || {};
    var dist = CondutaMOS_distancia_(o, ctx);
    var b = { os: o, id: CondutaMOS_s_(o.ID), numero: CondutaMOS_s_(o.NUMERO), dia: CondutaMOS_diaOS_(o), diaFim: CondutaMOS_diaFimOS_(o), dist: dist, conf: cf,
      cancelSemSaida: CondutaMOS_up_(o.SITUACAO) === 'CANCELADA' && !CondutaMOS_houveDeslocamento_(o),
      local: dist.km !== null && dist.km < ctx.kmMinimo, execs: [] };
    b.req = CondutaMOS_criteriosOS_(o, ctx, cf);
    if (CondutaMOS_s_(o.TECNICO_ID)) b.execs.push({ id: CondutaMOS_s_(o.TECNICO_ID), origem: 'O.S.' });
    base[b.id] = b;
  });

  // missões lançadas à mão: liga cada uma às O.S. do executante (data com até 1 dia de diferença e o mesmo cliente, destino ou cidade)
  var missoes = (d.missoes || []).filter(function (m) { return !CondutaMOS_s_(m.EXCLUIDA_EM); }).map(function (m) {
    var execs = [m.EXECUTANTE_1_ID, m.EXECUTANTE_2_ID].map(CondutaMOS_s_).filter(Boolean);
    var aprov = CondutaMOS_up_(m.APROVACAO) || 'LEGADA', qual = m.QUALIFICA === true || CondutaMOS_up_(m.QUALIFICA) === 'TRUE';
    return { id: CondutaMOS_s_(m.ID), dia: CondutaMOS_dia_(m.DATA), competencia: CondutaMOS_dia_(m.DATA).slice(0, 7) || Conduta_soComp_(m.COMPETENCIA), destino: CondutaMOS_s_(m.DESTINO), norm: CondutaMOS_norm_(m.DESTINO),
      km: CondutaMOS_num_(m.KM_TRECHO), clienteId: CondutaMOS_s_(m.CLIENTE_ID), execs: execs, qualifica: qual, aprovacao: aprov, conta: qual && (aprov === 'APROVADA' || aprov === 'LEGADA'), os: [] };
  });
  missoes.forEach(function (m) {
    Object.keys(base).forEach(function (k) {
      var b = base[k], dd = CondutaMOS_diasEntre_(m.dia, b.dia), dFim = CondutaMOS_diasEntre_(m.dia, b.diaFim);
      if (dd === null || (Math.abs(dd) > 1 && !(dd <= 0 && dFim >= 0))) return;
      var tec = CondutaMOS_s_(b.os.TECNICO_ID);
      if (tec && m.execs.indexOf(tec) < 0) return;
      var mesmoLugar = (m.clienteId && m.clienteId === CondutaMOS_s_(b.os.CLIENTE_ID)) || (b.dist.referenciaId && m.norm === CondutaMOS_norm_(b.dist.destino)) ||
        (b.dist.destino && m.norm === CondutaMOS_norm_(b.dist.destino));
      if (!mesmoLugar) return;
      m.os.push(b.id);
      // 2º executante da missão lançada entra na O.S. (a O.S. da Assistência guarda um técnico só)
      m.execs.forEach(function (e) { if (!b.execs.some(function (x) { return x.id === e; })) b.execs.push({ id: e, origem: 'missão lançada' }); });
    });
  });

  // ocorrências por executante (sem as encerradas sem efeito)
  var ocPorPessoa = {};
  (d.ocorrencias || []).forEach(function (o) {
    var st = CondutaMOS_up_(o.STATUS);
    if (!CondutaMOS_s_(o.COLABORADOR_ID) || CONDUTA_MOS_OCOR_ENCERRADAS.indexOf(st) >= 0) return;
    (ocPorPessoa[CondutaMOS_s_(o.COLABORADOR_ID)] = ocPorPessoa[CondutaMOS_s_(o.COLABORADOR_ID)] || []).push({ id: CondutaMOS_s_(o.ID), codigo: CondutaMOS_s_(o.TIPO_CODIGO), status: st, firme: st === 'FIRME',
      dia: CondutaMOS_dia_(o.DATA_FATO), competencia: Conduta_soComp_(o.COMPETENCIA || o.DATA_FATO), gg: CondutaMOS_up_(o.NIVEL_APLICADO) === 'GG', missaoId: CondutaMOS_s_(o.MISSAO_ID) });
  });

  // agrupa por executante as O.S. em "saídas" (missões)
  var porExec = {};
  Object.keys(base).forEach(function (k) { base[k].execs.forEach(function (e) { (porExec[e.id] = porExec[e.id] || []).push(base[k]); }); });
  var grupos = [];
  Object.keys(porExec).forEach(function (pid) {
    var l = porExec[pid].slice().sort(function (a, b) { return a.dia.localeCompare(b.dia) || a.numero.localeCompare(b.numero); });
    // 1º: um "dia" por data (O.S. do mesmo dia = mesma saída; "nova saída" da gestão separa); O.S. local ou cancelada sem saída fica sozinha
    var dias = [], dia = null;
    l.forEach(function (b) {
      if (b.local || b.cancelSemSaida) { grupos.push({ exec: pid, membros: [b], sozinha: true }); return; }
      var saida = CondutaMOS_up_(b.conf.SAIDA);
      if (!dia || dia.dia !== b.dia || saida === 'NOVA') { dia = { dia: b.dia, membros: [], saida: saida }; dias.push(dia); }
      else if (!dia.saida && saida) dia.saida = saida;
      dia.membros.push(b);
    });
    // 2º: dias seguidos com O.S. que qualificam pela distância = provável mesma saída (pendente até a gestão confirmar); "mesma saída" junta
    var qualifica = function (lista) { return lista.some(function (b) { return b.dist.km !== null && b.dist.km >= ctx.kmMinimo; }); };
    var atual = null;
    dias.forEach(function (x) {
      var gap = atual ? CondutaMOS_diasEntre_(atual.ultimoDia, x.dia) : null;
      var junta = atual && x.saida !== 'NOVA' && (x.saida === 'MESMA' || (gap !== null && gap <= 1 && qualifica(atual.membros) && qualifica(x.membros)));
      var fimX = x.membros.reduce(function (m, b) { var f = b.diaFim > b.dia ? b.diaFim : b.dia; return f > m ? f : m; }, x.dia);
      if (junta) {
        if (x.saida !== 'MESMA') atual.saidaPendente.push(x.membros.map(function (b) { return b.numero; }).join(', ') + ' (' + CondutaMOS_br_(x.dia) + ')');
        atual.membros = atual.membros.concat(x.membros); if (fimX > atual.ultimoDia) atual.ultimoDia = fimX;
      } else {
        atual = { exec: pid, membros: x.membros.slice(), saidaPendente: [], ultimoDia: fimX };
        grupos.push(atual);
      }
    });
  });

  // apura cada missão (saída) do executante
  var linhas = [], resMissoes = [], valor = Number(d.valor) || 300;
  grupos.forEach(function (g, gi) {
    var pid = g.exec, membros = g.membros, oc = ocPorPessoa[pid] || [];
    var ini = membros.map(function (b) { return b.dia; }).sort()[0], fim = membros.map(function (b) { return b.diaFim > b.dia ? b.diaFim : b.dia; }).sort().pop();
    var comp = ini.slice(0, 7), crit = [];
    // 1. distância cadastral (a maior da saída: duas cidades na mesma saída são uma missão)
    var kms = membros.filter(function (b) { return b.dist.km !== null; }), semKm = membros.filter(function (b) { return b.dist.km === null; });
    var maior = kms.sort(function (a, b) { return b.dist.km - a.dist.km; })[0];
    if (maior && maior.dist.km >= ctx.kmMinimo) crit.push(CondutaMOS_crit_('DISTANCIA', 'OK', maior.dist.destino + ': ' + maior.dist.km + ' km da sede (' + maior.dist.fonte + '), mínimo ' + ctx.kmMinimo + ' km.'));
    else if (semKm.length) crit.push(CondutaMOS_crit_('DISTANCIA', 'PENDENTE', 'Distância cadastral ausente: ' + semKm[0].dist.motivo + '. Cadastre a cidade com o CNPJ do cliente em Programa de conduta > Missões > "+ Cadastrar cidade/destino" (a Gestão da Qualidade confere a distância a partir da sede).'));
    else crit.push(CondutaMOS_crit_('DISTANCIA', 'NAO', (maior ? maior.dist.destino + ': ' + maior.dist.km + ' km da sede (' + maior.dist.fonte + ')' : 'sem destino') + ', abaixo do mínimo de ' + ctx.kmMinimo + ' km.'));
    // 2. mesma saída a confirmar
    if (g.saidaPendente && g.saidaPendente.length) crit.push(CondutaMOS_crit_('SAIDA', 'PENDENTE', 'O.S. ' + g.saidaPendente.join('; ') + ' no dia seguinte a outra O.S. desta saída: confirme se o executante voltou à sede (nova missão) ou continuou na viagem (mesma missão).'));
    // 3. ocorrências do executante dentro da missão (do início ao fim da saída) e gravíssima no mês
    var foraIds = []; membros.forEach(function (b) { foraIds = foraIds.concat(CondutaMOS_json_(b.conf.OCORRENCIAS_FORA_JSON, [])); });
    var missLanc = missoes.filter(function (m) { return m.execs.indexOf(pid) >= 0 && m.os.some(function (id) { return membros.some(function (b) { return b.id === id; }); }); });
    var naMissao = oc.filter(function (o) { return !o.gg && foraIds.indexOf(o.id) < 0 && ((o.dia && o.dia >= ini && o.dia <= fim) || (o.missaoId && missLanc.some(function (m) { return m.id === o.missaoId; }))); });
    var ocFirme = naMissao.filter(function (o) { return o.firme; }), ocAnd = naMissao.filter(function (o) { return !o.firme; });
    if (ocFirme.length) crit.push(CondutaMOS_crit_('OCORRENCIA', 'NAO', 'Ocorrência firme do executante na missão' + (ocFirme.some(function (o) { return o.codigo === 'CAM-03'; }) ? ' (CAM-03, retorno Tipo A)' : '') + ': retira o incentivo desta missão.', { ids: ocFirme.map(function (o) { return o.id; }), codigos: ocFirme.map(function (o) { return o.codigo; }) }));
    else if (ocAnd.length) crit.push(CondutaMOS_crit_('OCORRENCIA', 'PENDENTE', 'Ocorrência do executante no período da missão ainda em andamento: o incentivo espera a decisão (se ficar firme, não é devido).', { ids: ocAnd.map(function (o) { return o.id; }), codigos: ocAnd.map(function (o) { return o.codigo; }) }));
    else crit.push(CondutaMOS_crit_('OCORRENCIA', 'OK', 'Nenhuma ocorrência do executante na missão.'));
    var gg = oc.filter(function (o) { return o.gg && o.competencia === comp; });
    if (gg.some(function (o) { return o.firme; })) crit.push(CondutaMOS_crit_('GRAVISSIMA', 'NAO', 'Infração gravíssima firme do executante no mês: zera todos os incentivos de missão dele no mês (MAN-VIA-001 §4).', { ids: gg.map(function (o) { return o.id; }), codigos: gg.map(function (o) { return o.codigo; }) }));
    else if (gg.length) crit.push(CondutaMOS_crit_('GRAVISSIMA', 'PENDENTE', 'Infração gravíssima do executante no mês em andamento: se ficar firme, zera os incentivos dele no mês.', { ids: gg.map(function (o) { return o.id; }), codigos: gg.map(function (o) { return o.codigo; }) }));
    // 4. execução, relatório, fotos e retorno: a missão vale se ao menos uma O.S. da saída cumpre
    var okM = membros.filter(function (b) { return b.req.estado === 'OK'; }), pendM = membros.filter(function (b) { return b.req.estado === 'PENDENTE'; });
    // a missão conta na O.S. que cumpre os requisitos, de preferência a que qualifica pela distância
    var porDist = function (l) { return l.filter(function (b) { return b.dist.km !== null && b.dist.km >= ctx.kmMinimo; })[0] || l[0]; };
    var contada = (okM.length ? porDist(okM) : null) || (pendM.length ? porDist(pendM) : null) || porDist(membros);
    var estadoReq = okM.length ? 'OK' : pendM.length ? 'PENDENTE' : 'NAO';
    var todos = crit.concat(estadoReq === 'OK' ? [] : contada.req.criterios.filter(function (x) { return x.estado !== 'OK'; }));
    var estado = todos.some(function (x) { return x.estado === 'NAO'; }) ? 'NAO_DEVIDO' : todos.some(function (x) { return x.estado === 'PENDENTE'; }) ? 'PENDENTE' : 'DEVIDO';
    var motivos = todos.filter(function (x) { return x.estado !== 'OK'; }).filter(function (x) { return estado === 'PENDENTE' ? x.estado === 'PENDENTE' : x.estado === 'NAO'; }).map(function (x) { return x.texto; });
    var mid = 'M' + (gi + 1);
    var mis = { id: mid, executanteId: pid, executante: nomes[pid] || pid, competencia: comp, inicio: ini, fim: fim, os: membros.map(function (b) { return b.numero; }), osIds: membros.map(function (b) { return b.id; }),
      contadaEm: contada.numero, estado: estado, estadoTxt: CONDUTA_MOS_ESTADOS[estado], valor: estado === 'DEVIDO' ? valor : 0, motivos: motivos, criterios: crit,
      sozinha: !!g.sozinha, lancadas: missLanc.map(function (m) { return m.id; }), local: membros.every(function (b) { return b.local; }), semSaida: membros.every(function (b) { return b.cancelSemSaida; }) };
    resMissoes.push(mis);
    membros.forEach(function (b) {
      var ex = b.execs.filter(function (e) { return e.id === pid; })[0] || { origem: 'O.S.' };
      var lcrit = crit.concat(b.req.criterios), conta = b === contada;
      var est = conta ? estado : 'NAO_DEVIDO';
      var mot = conta ? motivos : ['Mesma saída da O.S. ' + contada.numero + ' (' + CondutaMOS_br_(ini) + (fim !== ini ? ' a ' + CondutaMOS_br_(fim) : '') + '): a missão conta uma vez só, na O.S. ' + contada.numero + '.'];
      linhas.push({ osId: b.id, os: b.numero, chamado: CondutaMOS_s_(b.os.CHAMADO_NUMERO), cliente: CondutaMOS_s_(b.os.UNIDADE_NOME) || CondutaMOS_s_(b.os.CLIENTE_NOME), tipo: CondutaMOS_s_(b.os.TIPO_NOME) || CondutaMOS_s_(b.os.TIPO_CODIGO),
        situacao: CondutaMOS_up_(b.os.SITUACAO), dia: b.dia, competencia: b.dia.slice(0, 7), executanteId: pid, executante: nomes[pid] || pid, origemExecutante: ex.origem,
        distancia: b.dist, missao: mid, contaNaMissao: conta, estado: est, estadoTxt: CONDUTA_MOS_ESTADOS[est], motivos: mot, criterios: lcrit, valor: conta && estado === 'DEVIDO' ? valor : 0,
        conferencia: b.conf && b.conf.ID ? { retorno: CondutaMOS_up_(b.conf.RETORNO), interrupcao: CondutaMOS_up_(b.conf.INTERRUPCAO), saida: CondutaMOS_up_(b.conf.SAIDA), obs: CondutaMOS_s_(b.conf.OBS),
          por: CondutaMOS_s_(b.conf.CONFERIDO_POR_NOME), em: CondutaMOS_s_(b.conf.CONFERIDO_EM), ocorrenciasFora: CondutaMOS_json_(b.conf.OCORRENCIAS_FORA_JSON, []) } : null,
        lancadas: missLanc.map(function (m) { return m.id; }) });
    });
  });

  // filtro da competência
  var comp = CondutaMOS_s_(d.competencia);
  var linhasC = linhas.filter(function (l) { return !comp || l.competencia === comp; }).sort(function (a, b) { return a.dia.localeCompare(b.dia) || a.os.localeCompare(b.os) || a.executante.localeCompare(b.executante); });
  var missoesC = resMissoes.filter(function (m) { return !comp || m.competencia === comp; });

  // divergências entre o lançado à mão (o que o fechamento paga hoje) e o que as O.S. dizem
  var divergencias = [], primeiraOS = lista.map(function (o) { return CondutaMOS_diaOS_(o); }).sort()[0] || '';
  var ggFirmeMes = function (pid) { return (ocPorPessoa[pid] || []).some(function (o) { return o.gg && o.firme && o.competencia === comp; }); };
  missoesC.forEach(function (m) {
    // só o que já qualifica pela distância: O.S. sem distância cadastrada fica na lista como pendente, sem virar divergência
    if (m.local || m.semSaida || m.estado === 'NAO_DEVIDO' || !m.criterios.some(function (c) { return c.chave === 'DISTANCIA' && c.estado === 'OK'; })) return;
    var lanc = missoes.filter(function (x) { return m.lancadas.indexOf(x.id) >= 0 && x.execs.indexOf(m.executanteId) >= 0; });
    if (!lanc.length) divergencias.push({ tipo: 'SEM_LANCAMENTO', executanteId: m.executanteId, executante: m.executante, missao: m.id, os: m.os.join(', '),
      texto: 'O.S. ' + m.os.join(', ') + ' (' + CondutaMOS_br_(m.inicio) + ') ' + (m.estado === 'DEVIDO' ? 'cumpre os requisitos' : 'pode ser elegível (pendente)') + ', mas não há missão lançada para ' + m.executante + ': o fechamento do mês, que soma as missões lançadas, não paga este incentivo.' });
  });
  missoes.filter(function (x) { return !comp || x.competencia === comp; }).forEach(function (x) {
    x.execs.forEach(function (pid) {
      var ms = resMissoes.filter(function (m) { return m.executanteId === pid && m.osIds.some(function (id) { return x.os.indexOf(id) >= 0; }); });
      var nome = nomes[pid] || pid, desc = x.destino + ' em ' + CondutaMOS_br_(x.dia);
      if (!ms.length) {
        if (!x.conta) return;
        // missão anterior à primeira O.S. da Assistência técnica do SGO+ (antes era no Auvo): só informa
        if (primeiraOS && x.dia < primeiraOS) divergencias.push({ tipo: 'SEM_OS_ANTERIOR', executanteId: pid, executante: nome, lancada: x.id, texto: 'Missão lançada (' + desc + ') anterior à primeira O.S. da Assistência técnica do SGO+ (' + CondutaMOS_br_(primeiraOS) + '): não há O.S. para conferir.' });
        else divergencias.push({ tipo: 'SEM_OS', executanteId: pid, executante: nome, lancada: x.id, texto: 'Missão lançada (' + desc + ') sem O.S. de campo correspondente para ' + nome + ' na Assistência técnica: confira a data, o destino e o executante.' });
        return;
      }
      var m = ms[0];
      if (x.conta && m.estado === 'NAO_DEVIDO') divergencias.push({ tipo: 'LANCADA_NAO_DEVIDA', executanteId: pid, executante: nome, lancada: x.id, missao: m.id, texto: 'Missão lançada e aprovada (' + desc + '), mas pelas O.S. ' + m.os.join(', ') + ' o incentivo não é devido: ' + m.motivos.join(' ') });
      if (x.conta && m.estado === 'PENDENTE') divergencias.push({ tipo: 'LANCADA_PENDENTE', executanteId: pid, executante: nome, lancada: x.id, missao: m.id, texto: 'Missão lançada e aprovada (' + desc + '); pelas O.S. ' + m.os.join(', ') + ' ainda falta conferir: ' + m.motivos.join(' ') });
      if (!x.qualifica && m.criterios.some(function (c) { return c.chave === 'DISTANCIA' && c.estado === 'OK'; })) divergencias.push({ tipo: 'DISTANCIA_DIVERGENTE', executanteId: pid, executante: nome, lancada: x.id, missao: m.id, texto: 'Missão lançada (' + desc + ', ' + x.km + ' km) como "não qualifica", mas a distância cadastral das O.S. ' + m.os.join(', ') + ' é de ' + m.criterios[0].texto });
      var dobro = missoes.filter(function (y) { return y.id !== x.id && y.conta && y.execs.indexOf(pid) >= 0 && y.os.some(function (id) { return m.osIds.indexOf(id) >= 0; }); });
      if (x.conta && dobro.length && dobro.every(function (y) { return y.id > x.id; })) divergencias.push({ tipo: 'LANCADA_EM_DOBRO', executanteId: pid, executante: nome, lancada: x.id, missao: m.id, texto: CondutaMOS_plural_(dobro.length + 1, 'missão lançada', 'missões lançadas') + ' para ' + nome + ' na mesma saída (O.S. ' + m.os.join(', ') + '): é um incentivo só (uma missão por O.S.; O.S. da mesma saída contam uma vez).' });
    });
  });

  // resumo por executante
  var res = {};
  var pessoa = function (pid) { return res[pid] = res[pid] || { executanteId: pid, executante: nomes[pid] || pid, devidas: 0, valorDevido: 0, pendentes: 0, naoDevidas: 0, lancadasQueContam: 0, valorLancado: 0, divergencias: 0, os: 0 }; };
  missoesC.forEach(function (m) { if (m.local || m.semSaida) return; var p = pessoa(m.executanteId); if (m.estado === 'DEVIDO') { p.devidas++; p.valorDevido += valor; } else if (m.estado === 'PENDENTE') p.pendentes++; else p.naoDevidas++; });
  linhasC.forEach(function (l) { pessoa(l.executanteId).os++; });
  missoes.filter(function (x) { return x.competencia === comp && x.conta; }).forEach(function (x) { x.execs.forEach(function (pid) { var p = pessoa(pid); if (ggFirmeMes(pid)) return; p.lancadasQueContam++; p.valorLancado += valor; }); });
  divergencias.forEach(function (x) { pessoa(x.executanteId).divergencias++; });
  var porExecutante = Object.keys(res).map(function (k) { var p = res[k]; p.diferenca = p.valorDevido - p.valorLancado; return p; }).sort(function (a, b) { return a.executante.localeCompare(b.executante, 'pt-BR'); });
  var totais = porExecutante.reduce(function (t, p) { t.devidas += p.devidas; t.valorDevido += p.valorDevido; t.pendentes += p.pendentes; t.naoDevidas += p.naoDevidas; t.lancadas += p.lancadasQueContam; t.valorLancado += p.valorLancado; return t; },
    { devidas: 0, valorDevido: 0, pendentes: 0, naoDevidas: 0, lancadas: 0, valorLancado: 0 });
  totais.divergencias = divergencias.length;
  return { competencia: comp, valor: valor, kmMinimo: ctx.kmMinimo, prazoRelatorio: ctx.prazoRelatorio, fotosMin: ctx.fotosMin, linhas: linhasC, missoes: missoesC, porExecutante: porExecutante, divergencias: divergencias, totais: totais };
}

// ------------------------------------------------------------
// leitura das planilhas e API
// ------------------------------------------------------------
function CondutaMOS_lerSeguro_(aba) { try { return SGO_DATA.getAll(aba) || []; } catch (e) { return []; } }

function CondutaMOS_garantirAba_() {
  CertCal_garantirTabela_(CONDUTA_MOS_ABA, CONDUTA_MOS_COLUNAS);
  CONDUTA_MOS_COLUNAS.forEach(function (c) { CertCal_garantirColuna_(CONDUTA_MOS_ABA, c); });
}

/** Lê tudo e apura a competência (AAAA-MM). Nunca grava. */
function CondutaMOS_dados_(competencia) {
  var par = Conduta_obterParametros_() || {};
  var abaOS = typeof AST_ABAS !== 'undefined' ? AST_ABAS : { OS: 'ATEC_OS', CHAMADOS: 'ATEC_CHAMADOS', TIPOS: 'ATEC_TIPOS', FOTOS: 'ATEC_FOTOS' };
  return CondutaMOS_apurar_({
    competencia: competencia, hoje: Conduta_hojeISO_(), kmMinimo: CondutaMOS_num_(par.MISSAO_KM_MINIMO) || 200, valor: CondutaMOS_num_(par.VALOR_INCENTIVO_MISSAO) || 300,
    prazoRelatorio: CondutaMOS_num_(par.MISSAO_PRAZO_RELATORIO_DIAS_UTEIS) || CONDUTA_MOS_PRAZO_RELATORIO_PADRAO,
    fotosMin: CondutaMOS_num_(par.MISSAO_FOTOS_MIN) === null ? CONDUTA_MOS_FOTOS_MIN_PADRAO : CondutaMOS_num_(par.MISSAO_FOTOS_MIN), sedeEndereco: par.SEDE_ENDERECO,
    os: CondutaMOS_lerSeguro_(abaOS.OS), chamados: CondutaMOS_lerSeguro_(abaOS.CHAMADOS), tipos: CondutaMOS_lerSeguro_(abaOS.TIPOS), fotos: CondutaMOS_lerSeguro_(abaOS.FOTOS),
    refs: CondutaMOS_lerSeguro_(CONDUTA_SHEETS.DISTANCIA_REFERENCIA), unidades: CondutaMOS_lerSeguro_(SGO_CFG.SHEETS.CAD_UNIDADES), clientes: CondutaMOS_lerSeguro_(SGO_CFG.SHEETS.CAD_CLIENTES),
    missoes: CondutaMOS_lerSeguro_(CONDUTA_SHEETS.MISSAO), ocorrencias: CondutaMOS_lerSeguro_(CONDUTA_SHEETS.OCORRENCIA), conferencias: CondutaMOS_lerSeguro_(CONDUTA_MOS_ABA),
    usuarios: CondutaMOS_lerSeguro_(SGO_CFG.SHEETS.CAD_USUARIOS), situacoes: typeof AST_OS_SITUACOES !== 'undefined' ? AST_OS_SITUACOES : {}
  });
}

/** Esconde o código da ocorrência de quem não pode saber quem é o envolvido (sigilo de 28/10/2026). */
function CondutaMOS_aplicarSigilo_(r, sessao, veIdentidade) {
  var meu = String(sessao.userId || '');
  var limpa = function (c, pid) {
    if (!c.ids && !c.codigos) return c;
    var x = { chave: c.chave, estado: c.estado, texto: c.texto };
    if (veIdentidade || pid === meu) { x.ids = c.ids; x.codigos = c.codigos; }
    else if (c.chave === 'OCORRENCIA' || c.chave === 'GRAVISSIMA') x.texto = c.estado === 'NAO' ? 'Há ocorrência do executante que retira o incentivo (detalhe sob sigilo: Diretoria e Gestor de Qualidade).' : 'Há ocorrência do executante em andamento que pode retirar o incentivo (detalhe sob sigilo: Diretoria e Gestor de Qualidade).';
    return x;
  };
  r.linhas.forEach(function (l) {
    l.criterios = l.criterios.map(function (c) { return limpa(c, l.executanteId); });
    l.motivos = l.motivos.map(function (t) { return !veIdentidade && l.executanteId !== meu && /ocorr|gravíssima/i.test(t) ? 'Ocorrência do executante (detalhe sob sigilo).' : t; });
  });
  r.missoes.forEach(function (m) {
    m.criterios = m.criterios.map(function (c) { return limpa(c, m.executanteId); });
    m.motivos = m.motivos.map(function (t) { return !veIdentidade && m.executanteId !== meu && /ocorr|gravíssima/i.test(t) ? 'Ocorrência do executante (detalhe sob sigilo).' : t; });
  });
  r.divergencias.forEach(function (x) { if (!veIdentidade && x.executanteId !== meu && /ocorr|gravíssima/i.test(x.texto)) x.texto = x.texto.replace(/não é devido:.*$/, 'não é devido: ocorrência do executante (detalhe sob sigilo).'); });
  return r;
}

/**
 * Conferência do incentivo por O.S. (Programa de conduta > Missões). payload: { competencia: 'AAAA-MM' }.
 * Gestão e RH veem todos; os demais, só as O.S. em que são executantes. Não grava nada.
 */
function Conduta_apiConferenciaMissoesOS(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var comp = Conduta_validarCompetencia_(payload.competencia || Conduta_soComp_(Conduta_hojeISO_()));
  var todos = Conduta_podeConsultarTodos_(sessionId), gestao = isAdminSession(sessionId), ve = Conduta_veIdentidade_(sessao);
  var r = CondutaMOS_dados_(comp), meu = String(sessao.userId || '');
  if (!todos) {
    r.linhas = r.linhas.filter(function (l) { return l.executanteId === meu; });
    r.missoes = r.missoes.filter(function (m) { return m.executanteId === meu; });
    r.porExecutante = r.porExecutante.filter(function (p) { return p.executanteId === meu; });
    r.divergencias = r.divergencias.filter(function (x) { return x.executanteId === meu; });
  }
  CondutaMOS_aplicarSigilo_(r, sessao, ve);
  r.podeConferir = gestao; r.podeConferirOcorrencia = gestao && ve; r.consultaTodos = todos; r.meuId = meu;
  r.opcoes = { retorno: CONDUTA_MOS_RETORNOS, interrupcao: CONDUTA_MOS_INTERRUPCOES, saida: CONDUTA_MOS_SAIDAS };
  r.regra = 'Uma missão por O.S. (não por deslocamento nem por dia), por executante: ' + CondutaMOS_moeda_(r.valor) + ' quando a distância cadastral do cliente é de ' + r.kmMinimo +
    ' km ou mais da sede, a O.S. foi concluída com relatório em até ' + CondutaMOS_plural_(r.prazoRelatorio, 'dia útil', 'dias úteis') + ' e ' + CondutaMOS_plural_(r.fotosMin, 'foto', 'fotos') + ' no mínimo, e não há ocorrência do executante na missão. ' +
    'O.S. da mesma saída contam uma vez. Esta conferência não paga nem lança nada: o fechamento do mês continua somando as missões lançadas e aprovadas.';
  return r;
}

/**
 * Classificação da gestão numa O.S. (só o que os dados não dizem). payload: { osId, retorno, interrupcao, saida, ocorrenciasFora: [ids], obs }.
 * Campo ausente fica como estava; '' limpa. Não gera ocorrência, aviso nem pagamento.
 */
function Conduta_apiConferirMissaoOS(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var osId = CondutaMOS_s_(payload.osId);
  var abaOS = typeof AST_ABAS !== 'undefined' ? AST_ABAS.OS : 'ATEC_OS';
  var os = CondutaMOS_lerSeguro_(abaOS).filter(function (o) { return CondutaMOS_s_(o.ID) === osId; })[0];
  if (!os) throw new Error('O.S. não encontrada. Atualize a conferência e tente de novo.');
  var dia = CondutaMOS_diaOS_(os);
  if (dia) Conduta_exigirCompetenciaAberta_(dia.slice(0, 7));
  var obs = CondutaMOS_s_(payload.obs).slice(0, 500);
  // executante não classifica a própria O.S. (mesma regra da missão); a Diretoria classifica com fundamentação
  var execs = [CondutaMOS_s_(os.TECNICO_ID)].concat(CondutaMOS_lerSeguro_(CONDUTA_SHEETS.MISSAO).filter(function (m) { return !CondutaMOS_s_(m.EXCLUIDA_EM); })
    .filter(function (m) { return [m.EXECUTANTE_1_ID, m.EXECUTANTE_2_ID].map(CondutaMOS_s_).indexOf(CondutaMOS_s_(os.TECNICO_ID)) >= 0 && Math.abs(CondutaMOS_diasEntre_(CondutaMOS_dia_(m.DATA), dia) || 9) <= 1; })
    .reduce(function (a, m) { return a.concat([CondutaMOS_s_(m.EXECUTANTE_1_ID), CondutaMOS_s_(m.EXECUTANTE_2_ID)]); }, [])).filter(Boolean);
  if (execs.indexOf(String(sessao.userId)) >= 0) {
    if (!Conduta_ehDiretoriaOuDono_(sessao)) throw new Error('Você é executante desta O.S. e não pode classificá-la. Peça a outra pessoa da gestão (Gestor ou Diretoria).');
    obs = Conduta_exigirFundamentacaoDiretoria_(obs, 'missão');
  }
  var val = function (v, opcoes, nome) {
    if (v === undefined) return undefined;
    var x = CondutaMOS_up_(v);
    if (x && !opcoes[x]) throw new Error('Escolha uma opção válida para ' + nome + '.');
    return x;
  };
  var campos = {}, mudou = [];
  var ret = val(payload.retorno, CONDUTA_MOS_RETORNOS, 'o retorno'), itr = val(payload.interrupcao, CONDUTA_MOS_INTERRUPCOES, 'a interrupção'), sai = val(payload.saida, CONDUTA_MOS_SAIDAS, 'a saída');
  if (ret !== undefined) { campos.RETORNO = ret; mudou.push('retorno: ' + (CONDUTA_MOS_RETORNOS[ret] || 'sem classificação')); }
  if (itr !== undefined) { campos.INTERRUPCAO = itr; mudou.push('interrupção: ' + (CONDUTA_MOS_INTERRUPCOES[itr] || 'sem classificação')); }
  if (sai !== undefined) { campos.SAIDA = sai; mudou.push('saída: ' + (CONDUTA_MOS_SAIDAS[sai] || 'automática')); }
  if (payload.ocorrenciasFora !== undefined) {
    if (!Conduta_veIdentidade_(sessao)) throw new Error('Por sigilo do colaborador, só a Diretoria e o Gestor de Qualidade dizem se uma ocorrência é ou não da missão.');
    var ids = (Array.isArray(payload.ocorrenciasFora) ? payload.ocorrenciasFora : []).map(CondutaMOS_s_).filter(Boolean).slice(0, 50);
    campos.OCORRENCIAS_FORA_JSON = JSON.stringify(ids); mudou.push(CondutaMOS_plural_(ids.length, 'ocorrência marcada', 'ocorrências marcadas') + ' como fora da missão');
  }
  if (!mudou.length && !obs) throw new Error('Nada para gravar: escolha uma classificação ou escreva a observação.');
  if (ret === 'TIPO_A' && obs.length < 10) throw new Error('Para classificar como retorno Tipo A, escreva o motivo (pelo menos 10 letras): ele fica no histórico da conferência.');
  if (itr === 'EXECUTANTE' && obs.length < 10) throw new Error('Para dizer que a interrupção foi por falha do executante, escreva o motivo (pelo menos 10 letras).');
  CondutaMOS_garantirAba_();
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var ex = CondutaMOS_lerSeguro_(CONDUTA_MOS_ABA).filter(function (c) { return CondutaMOS_s_(c.OS_ID) === osId; })[0];
    var hist = CondutaMOS_json_(ex && ex.HISTORICO_JSON, []);
    hist.push({ em: SGO_UTILS.nowIso(), porId: String(sessao.userId || ''), por: String(sessao.nome || sessao.usuario || ''), mudou: mudou, obs: obs });
    Object.assign(campos, { OS_ID: osId, OS_NUMERO: CondutaMOS_s_(os.NUMERO), OBS: obs || (ex ? CondutaMOS_s_(ex.OBS) : ''), CONFERIDO_POR_ID: String(sessao.userId || ''),
      CONFERIDO_POR_NOME: String(sessao.nome || sessao.usuario || ''), CONFERIDO_EM: SGO_UTILS.nowIso(), HISTORICO_JSON: JSON.stringify(hist.slice(-50)) });
    if (ex) SGO_DATA.update(CONDUTA_MOS_ABA, ex.ID, campos); else SGO_DATA.insert(CONDUTA_MOS_ABA, campos);
  } finally { lock.releaseLock(); }
  SGO_DATA.log('CONDUTA_MISSAO_OS_CONFERIR', sessao.usuario, 'Conferência do incentivo da ' + CondutaMOS_s_(os.NUMERO) + ': ' + (mudou.join('; ') || 'observação') + (obs ? ' (' + obs + ')' : ''), 'CONDUTA');
  return { success: true, message: 'Conferência da ' + CondutaMOS_s_(os.NUMERO) + ' gravada. Nada foi pago nem lançado: o resultado da conferência foi atualizado.' };
}

/** Resumo para o relatório A4 de missões (gestão e Financeiro). Nunca lança. */
function CondutaMOS_resumoParaRelatorio_(competencia) {
  try {
    var r = CondutaMOS_dados_(competencia);
    return { porExecutante: r.porExecutante, divergencias: r.divergencias.map(function (x) { return { executante: x.executante, tipo: x.tipo, texto: /ocorr|gravíssima/i.test(x.texto) ? x.texto.replace(/não é devido:.*$/, 'não é devido: ocorrência do executante (detalhe sob sigilo).') : x.texto }; }),
      totais: r.totais, valor: r.valor, kmMinimo: r.kmMinimo, pendentes: r.missoes.filter(function (m) { return m.estado === 'PENDENTE'; }).length };
  } catch (e) { return { erro: String((e && e.message) || e) }; }
}

// ------------------------------------------------------------
// TELA: quadro "Incentivo por O.S." na aba Missões (carregado junto com as abas de Qualidade por Conduta_obterTelaQualidade,
// sem mexer no SGO_Conduta_ConteudoModulo.js). O código abaixo roda só no navegador.
// ------------------------------------------------------------
var CONDUTA_MOS_CSS = [
  '.cndm-crit{list-style:none;margin:6px 0 0;padding:0;font-size:12px;line-height:1.45}',
  '.cndm-crit li{margin:2px 0;padding-left:20px;position:relative;text-align:justify}',
  '.cndm-crit li:before{position:absolute;left:0;top:0;font-weight:700}',
  '.cndm-crit li.OK:before{content:"\\2713";color:#0f6b43}.cndm-crit li.NAO:before{content:"\\2717";color:#b42318}.cndm-crit li.PENDENTE:before{content:"?";color:#8a5300}',
  '.cndm-chip-DEVIDO{background:#e3f5ec !important;color:#0f6b43 !important}.cndm-chip-NAO_DEVIDO{background:#fde8e8 !important;color:#9b1c1c !important}.cndm-chip-PENDENTE{background:#fff1d6 !important;color:#8a5300 !important}',
  '.cndm-tabela{width:100%;border-collapse:collapse;font-size:12px}.cndm-tabela th,.cndm-tabela td{border:1px solid var(--border);padding:6px 8px;text-align:right}.cndm-tabela th:first-child,.cndm-tabela td:first-child{text-align:left}',
  '.cndm-tabela thead th{background:var(--card-soft,#f7f8fa);font-size:11px}',
  '.cndm-texto{font-size:12.5px;line-height:1.5;text-align:justify}'
].join('\n');

/* eslint-disable no-undef */
function CondutaMOS_telaNavegador_() {
  if (window.CNDM && window.CNDM.ligado) return;
  var M = window.CNDM = { ligado: true, dados: null, filtro: { estado: '', exec: '' }, salvando: false };
  function esc(v) { return typeof escapeHtml_ === 'function' ? escapeHtml_(v === null || v === undefined ? '' : String(v)) : String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function br(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(d || ''); }
  function moeda(v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function mesAtual() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function mesBr(c) { return String(c || '').slice(5) + '/' + String(c || '').slice(0, 4); }
  function gestao() { return typeof tplConduta_podeGerir_ === 'function' && tplConduta_podeGerir_(); }
  var original = window.tplConduta_renderMissoes_;
  if (typeof original !== 'function') return;
  window.tplConduta_renderMissoes_ = function () {
    var r = original.apply(this, arguments);
    var body = document.getElementById('condutaTabBody');
    if (body && !document.getElementById('cndMosCartao')) {
      var c = document.createElement('div');
      c.className = 'conduta-card'; c.id = 'cndMosCartao'; c.style.marginTop = '14px';
      c.innerHTML = '<h3 style="margin-top:0">Incentivo por O.S. (conferência)</h3>' +
        '<p class="cndm-texto">O incentivo conta por O.S. de campo, não por deslocamento nem por dia: uma missão por O.S. e por executante. ' +
        'O sistema confere cada requisito do Manual do Incentivo de Missão (MAN-VIA-001) e mostra devido, não devido ou pendente, com o motivo. ' +
        (gestao() ? 'A gestão classifica o que os dados não dizem (retorno, interrupção e mesma saída). ' : '') +
        'Esta conferência não paga, não lança missão e não registra ocorrência: o fechamento do mês continua somando as missões lançadas e aprovadas acima.</p>' +
        '<div class="cndq-filtros"><label>Mês <input type="month" id="cndMosComp" value="' + esc(M.comp || mesAtual()) + '"></label>' +
        '<button type="button" class="conduta-btn" id="cndMosBtn">Conferir</button>' +
        '<label>Situação <select id="cndMosEst"><option value="">Todas</option><option value="DEVIDO">Devido</option><option value="PENDENTE">Pendente</option><option value="NAO_DEVIDO">Não devido</option></select></label>' +
        '<label>Executante <select id="cndMosExec"><option value="">Todos</option></select></label></div>' +
        '<div id="cndMosRes" class="conduta-vazio">Escolha o mês e toque em Conferir.</div>';
      body.appendChild(c);
      document.getElementById('cndMosBtn').onclick = carregar;
      document.getElementById('cndMosEst').onchange = function () { M.filtro.estado = this.value; desenhar(); };
      document.getElementById('cndMosExec').onchange = function () { M.filtro.exec = this.value; desenhar(); };
      if (M.dados) desenhar();
    }
    return r;
  };
  function carregar() {
    var comp = (document.getElementById('cndMosComp') || {}).value || mesAtual();
    M.comp = comp;
    var alvo = document.getElementById('cndMosRes'); if (alvo) alvo.innerHTML = 'Conferindo as O.S. de ' + esc(mesBr(comp)) + '...';
    tplConduta_chamarApi_('apiConferenciaMissoesOS', { competencia: comp }, function (r) { M.dados = r; desenhar(); });
  }
  M.carregar = carregar;
  function chip(estado, txt) { return '<span class="cndq-chip cndm-chip-' + esc(estado) + '">' + esc(txt) + '</span>'; }
  function desenhar() {
    var alvo = document.getElementById('cndMosRes'), r = M.dados; if (!alvo || !r) return;
    var selE = document.getElementById('cndMosExec');
    if (selE) {
      var atual = M.filtro.exec;
      selE.innerHTML = '<option value="">Todos</option>' + r.porExecutante.map(function (p) { return '<option value="' + esc(p.executanteId) + '"' + (p.executanteId === atual ? ' selected' : '') + '>' + esc(p.executante) + '</option>'; }).join('');
    }
    var h = '<div class="cndq-faixa cndm-texto">' + esc(r.regra) + '</div>';
    var t = r.totais || {};
    h += '<h4>Resumo por executante (' + esc(mesBr(r.competencia)) + ')</h4>';
    h += r.porExecutante.length ? '<div style="overflow-x:auto"><table class="cndm-tabela"><thead><tr><th>Executante</th><th>Missões devidas</th><th>Valor pelas O.S.</th><th>Pendentes</th><th>Não devidas</th><th>Lançadas que contam no fechamento</th><th>Valor do fechamento</th><th>Diferença</th><th>Divergências</th></tr></thead><tbody>' +
      r.porExecutante.map(function (p) {
        return '<tr><td>' + esc(p.executante) + '</td><td>' + p.devidas + '</td><td>' + esc(moeda(p.valorDevido)) + '</td><td>' + p.pendentes + '</td><td>' + p.naoDevidas + '</td><td>' + p.lancadasQueContam + '</td><td>' + esc(moeda(p.valorLancado)) + '</td><td>' + esc(moeda(p.diferenca)) + '</td><td>' + p.divergencias + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><th>Total</th><th>' + (t.devidas || 0) + '</th><th>' + esc(moeda(t.valorDevido)) + '</th><th>' + (t.pendentes || 0) + '</th><th>' + (t.naoDevidas || 0) + '</th><th>' + (t.lancadas || 0) + '</th><th>' + esc(moeda(t.valorLancado)) + '</th><th>' + esc(moeda((t.valorDevido || 0) - (t.valorLancado || 0))) + '</th><th>' + (t.divergencias || 0) + '</th></tr></tfoot></table></div>' : '<p class="conduta-vazio">Nenhuma O.S. de campo nem missão lançada neste mês.</p>';
    var dv = r.divergencias.filter(function (x) { return !M.filtro.exec || x.executanteId === M.filtro.exec; });
    if (dv.length) h += '<h4>Missão lançada x O.S. elegível (' + dv.length + ')</h4><div class="cndq-faixa alerta cndm-texto"><ul style="margin:0;padding-left:18px">' + dv.map(function (x) { return '<li>' + esc(x.texto) + '</li>'; }).join('') + '</ul></div>';
    var ls = r.linhas.filter(function (l) { return (!M.filtro.estado || l.estado === M.filtro.estado) && (!M.filtro.exec || l.executanteId === M.filtro.exec); });
    h += '<h4>O.S. de campo (' + ls.length + ')</h4>';
    h += ls.length ? '<div class="cndq-lista">' + ls.map(function (l, i) {
      var mis = r.missoes.filter(function (m) { return m.id === l.missao && m.executanteId === l.executanteId; })[0] || {};
      var conf = l.conferencia;
      return '<div class="cndq-cartao"><h4>' + esc(l.os) + ' · ' + esc(l.cliente) + '</h4>' +
        '<div class="cndq-meta">' + esc(br(l.dia)) + ' · ' + esc(l.tipo) + (l.chamado ? ' · ' + esc(l.chamado) : '') + '</div>' +
        '<div>' + chip(l.estado, 'Incentivo: ' + l.estadoTxt.toLowerCase()) + '<span class="cndq-chip cinza">' + esc(l.executante) + (l.origemExecutante !== 'O.S.' ? ' (' + esc(l.origemExecutante) + ')' : '') + '</span>' +
        (l.valor ? '<span class="cndq-chip ok">' + esc(moeda(l.valor)) + '</span>' : '') + '</div>' +
        (mis.os && mis.os.length > 1 ? '<div class="cndq-meta" style="margin-top:6px">Mesma saída: O.S. ' + esc(mis.os.join(', ')) + '; conta uma vez, na ' + esc(mis.contadaEm) + '.</div>' : '') +
        (l.motivos.length ? '<p class="cndm-texto" style="margin:6px 0 0"><b>Por quê: </b>' + esc(l.motivos.join(' ')) + '</p>' : '') +
        '<details style="margin-top:6px"><summary style="cursor:pointer;font-size:12px">Requisitos conferidos</summary><ul class="cndm-crit">' +
        l.criterios.map(function (c) { return '<li class="' + esc(c.estado) + '">' + esc(c.texto) + '</li>'; }).join('') + '</ul>' +
        (conf ? '<p class="cndq-meta" style="margin-top:6px">Classificado por ' + esc(conf.por) + ' em ' + esc(br(conf.em)) + (conf.obs ? ': ' + esc(conf.obs) : '') + '</p>' : '') + '</details>' +
        (r.podeConferir ? '<div class="cndq-acoes"><button type="button" class="conduta-btn cinza" data-cndm-conf="' + i + '">Classificar</button></div>' : '') + '</div>';
    }).join('') + '</div>' : '<p class="conduta-vazio">Nenhuma O.S. com esse filtro.</p>';
    alvo.className = ''; alvo.innerHTML = h;
    Array.prototype.forEach.call(alvo.querySelectorAll('[data-cndm-conf]'), function (b) { b.onclick = function () { abrirClassificar(ls[Number(b.getAttribute('data-cndm-conf'))]); }; });
  }
  function opcoes(mapa, sel, vazio) { return '<option value="">' + esc(vazio) + '</option>' + Object.keys(mapa).map(function (k) { return '<option value="' + esc(k) + '"' + (k === sel ? ' selected' : '') + '>' + esc(mapa[k]) + '</option>'; }).join(''); }
  function abrirClassificar(l) {
    var r = M.dados, c = l.conferencia || {}, oc = [];
    l.criterios.forEach(function (x) { if (x.chave === 'OCORRENCIA' && x.ids) x.ids.forEach(function (id, k) { oc.push({ id: id, codigo: (x.codigos || [])[k] || '' }); }); });
    (c.ocorrenciasFora || []).forEach(function (id) { if (!oc.some(function (o) { return o.id === id; })) oc.push({ id: id, codigo: '' }); });
    var corpo = '<p class="cndm-texto">' + esc(l.os) + ' · ' + esc(l.cliente) + ' · ' + esc(br(l.dia)) + '. Diga só o que os dados da O.S. não mostram. Nada é pago, lançado ou registrado como ocorrência.</p>' +
      '<div class="conduta-campo"><label>Retorno</label><select id="cndm_ret">' + opcoes(r.opcoes.retorno, c.retorno, 'Sem classificação') + '</select></div>' +
      '<div class="conduta-campo"><label>Interrupção (O.S. cancelada depois da saída)</label><select id="cndm_int">' + opcoes(r.opcoes.interrupcao, c.interrupcao, 'Sem classificação') + '</select></div>' +
      '<div class="conduta-campo"><label>Saída</label><select id="cndm_sai">' + opcoes(r.opcoes.saida, c.saida, 'Automática (mesmo dia = mesma saída)') + '</select></div>' +
      (r.podeConferirOcorrencia && oc.length ? '<div class="conduta-campo"><label>Ocorrências no período da missão: marque as que NÃO são desta missão</label>' + oc.map(function (o) { return '<label style="display:block;font-weight:400"><input type="checkbox" data-cndm-oc="' + esc(o.id) + '"' + ((c.ocorrenciasFora || []).indexOf(o.id) >= 0 ? ' checked' : '') + '> ' + esc(o.codigo || o.id) + '</label>'; }).join('') + '</div>' : '') +
      '<div class="conduta-campo"><label>Observação (obrigatória para Tipo A e para falha do executante)</label><textarea id="cndm_obs" rows="3" maxlength="500">' + esc(c.obs || '') + '</textarea></div>' +
      '<div class="conduta-modal-acoes"><button type="button" class="conduta-btn cinza" onclick="tplConduta_fecharModal_()">Cancelar</button><button type="button" class="conduta-btn" id="cndm_salvar">Gravar a classificação</button></div>';
    tplConduta_abrirModal_('Classificar a O.S. para o incentivo', corpo);
    document.getElementById('cndm_salvar').onclick = function () {
      if (M.salvando) return;
      var p = { osId: l.osId, retorno: document.getElementById('cndm_ret').value, interrupcao: document.getElementById('cndm_int').value, saida: document.getElementById('cndm_sai').value, obs: document.getElementById('cndm_obs').value };
      if (r.podeConferirOcorrencia && oc.length) p.ocorrenciasFora = Array.prototype.filter.call(document.querySelectorAll('[data-cndm-oc]'), function (x) { return x.checked; }).map(function (x) { return x.getAttribute('data-cndm-oc'); });
      M.salvando = true;
      tplConduta_chamarApi_('apiConferirMissaoOS', p, function (res) { M.salvando = false; tplConduta_fecharModal_(); if (res && res.message) alert(res.message); carregar(); },
        function (e) {
          M.salvando = false;
          var m = String((e && e.message) || e), box = document.getElementById('condutaModalBox');
          if (!box) { alert(m); return; }
          var av = box.querySelector('.conduta-erro') || document.createElement('div'); av.className = 'conduta-erro'; av.setAttribute('role', 'alert');
          av.textContent = 'Não foi possível gravar: ' + m.replace(/[.\s]+$/, '') + '. Corrija e tente de novo.';
          if (!av.parentNode) box.insertBefore(av, box.children[1] || null);
        });
    };
  }
}
