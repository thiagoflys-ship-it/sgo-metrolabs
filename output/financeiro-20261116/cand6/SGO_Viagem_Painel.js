/****************************************************
 * DEPÓSITO DE VIAGEM — KANBAN, GANTT E RELATÓRIOS A4 DO PERÍODO (11/11/2026, pedido do dono)
 *
 * "Quero que tenha Kanban, que tenha gráfico Gantt, que gere relatório HTML em A4, que seja um módulo muito bem organizado."
 *
 *  - Via_painel_: as solicitações que a pessoa pode ver, prontas para o Kanban (uma coluna por situação real do módulo) e para o
 *    Gantt (a viagem de saída a chegada, por pessoa ou por centro de custo, com as sobreposições da mesma pessoa marcadas).
 *    ESCOPO: com a caixa VIAGEM_VER_TODAS (gerência, Financeiro, Diretoria), todas; sem ela, só as que a pessoa pediu ou em que
 *    viaja. O desenho na tela é o comum dos painéis do SGO+ (JS_PainelAtendimento.html: PnA_kanbanHtml_ e PnA_ganttHtml_, com a
 *    régua e o empilhamento de SGO_Gantt_Layout.js).
 *  - Via_relatorio_: relatórios A4 em HTML (moldura SGO_Documentos_RelatorioA4.js sobre SGO_DocA4.js), com o mesmo escopo:
 *    PERIODO (viagens do período por centro de custo e por pessoa: pedido, aprovado e carregado no Caju), KANBAN (resumo por
 *    etapa) e GANTT (linha do tempo das viagens, com as sobreposições). A tela abre o A4 e oferece baixar o arquivo .html.
 *  - Cores das situações (VIA_CORES): as mesmas nos selos, no Kanban, no Gantt e nos relatórios A4.
 * Nada aqui grava dado: só leitura. Nenhuma função devolve Date cru (datas em texto e em milissegundos).
 * E2 (11/11/2026): as etapas da prestação de contas (pendente, devolvida, em conferência, acerto e ciência, encerrada) entram no
 * Kanban, no Gantt e nos relatórios; o relatório do período traz gasto, aceito, glosado, devolvido e reembolsado por centro e por
 * pessoa, e a lista das prestações abertas com o prazo. A conciliação com o extrato do Caju é de outro módulo.
 ****************************************************/

var VIA_CORES = { RASCUNHO: '#6b7480', DEVOLVIDA: '#b45309', AGUARDANDO_APROVACAO: '#a87406', AGUARDANDO_DIRETORIA: '#7b4fb0', APROVADA: '#1f5fa8',
  CARGA_FEITA: '#1d6b3f', NEGADA: '#a61b1b', CANCELADA: '#52606d', PRESTACAO_PENDENTE: '#be185d', PRESTACAO_DEVOLVIDA: '#9d174d', PRESTACAO_ENVIADA: '#0e7490',
  ACERTO_PENDENTE: '#4d7c0f', AGUARDANDO_CIENCIA: '#4338ca', ENCERRADA: '#1f2933' };
/** Colunas do Kanban: as situações reais do módulo, na ordem do fluxo. Negada e cancelada juntas no fim. */
var VIA_KANBAN = [
  { cod: 'RASCUNHO', nome: 'Rascunho', sub: 'ainda não enviada', situacoes: ['RASCUNHO'] },
  { cod: 'DEVOLVIDA', nome: 'Devolvida para ajuste', sub: 'quem pediu ajusta e envia de novo', situacoes: ['DEVOLVIDA'] },
  { cod: 'AGUARDANDO_APROVACAO', nome: 'Aguardando a gerência', sub: 'aprovador da política', situacoes: ['AGUARDANDO_APROVACAO'] },
  { cod: 'AGUARDANDO_DIRETORIA', nome: 'Aguardando a Diretoria', sub: 'exceções da política', situacoes: ['AGUARDANDO_DIRETORIA'] },
  { cod: 'APROVADA', nome: 'Aprovada, aguardando a carga', sub: 'Financeiro carrega no Caju', situacoes: ['APROVADA'] },
  { cod: 'CARGA_FEITA', nome: 'Carga feita', sub: 'viagem liberada ou em andamento', situacoes: ['CARGA_FEITA'] },
  { cod: 'PRESTACAO_PENDENTE', nome: 'Prestação de contas pendente', sub: 'quem levou o dinheiro presta contas', situacoes: ['PRESTACAO_PENDENTE', 'PRESTACAO_DEVOLVIDA'] },
  { cod: 'PRESTACAO_ENVIADA', nome: 'Prestação em conferência', sub: 'Financeiro confere item a item', situacoes: ['PRESTACAO_ENVIADA'] },
  { cod: 'ACERTO', nome: 'Acerto e ciência', sub: 'devolução, reembolso e ciência do fechamento', situacoes: ['ACERTO_PENDENTE', 'AGUARDANDO_CIENCIA'] },
  { cod: 'ENCERRADA', nome: 'Encerrada', sub: 'contas fechadas', situacoes: ['ENCERRADA'] },
  { cod: 'NEGADA_CANCELADA', nome: 'Negada ou cancelada', sub: 'sem viagem', situacoes: ['NEGADA', 'CANCELADA'], fechada: true }
];
var VIA_REL_TIPOS = { PERIODO: 'Viagens do período por centro de custo', KANBAN: 'Kanban das solicitações (resumo por etapa)', GANTT: 'Gantt das viagens (linha do tempo)' };
var VIA_PROXIMO = {
  RASCUNHO: 'Quem pediu completa o que falta e envia para aprovação.',
  DEVOLVIDA: 'Quem pediu lê a fundamentação, ajusta e envia de novo.',
  AGUARDANDO_APROVACAO: 'O aprovador da política confere o relatório A4 e decide.',
  AGUARDANDO_DIRETORIA: 'A Diretoria confere o relatório A4 e decide.',
  APROVADA: 'O Financeiro faz a carga no portal do Caju e registra aqui, com o comprovante.',
  CARGA_FEITA: 'Viagem liberada: gastar no cartão Caju e guardar todos os comprovantes.',
  PRESTACAO_PENDENTE: 'Quem levou o dinheiro lança cada gasto com o comprovante e envia a prestação ao Financeiro, dentro do prazo.',
  PRESTACAO_DEVOLVIDA: 'Quem levou o dinheiro ajusta o que o Financeiro pediu e envia a prestação de novo.',
  PRESTACAO_ENVIADA: 'O Financeiro confere item a item (aceita ou glosa) e conclui a conferência.',
  ACERTO_PENDENTE: 'O Financeiro registra a devolução do saldo (Caju) ou o reembolso, com o comprovante.',
  AGUARDANDO_CIENCIA: 'O aprovador (padrão: Matheus) lê o A4 de fechamento e dá ciência.',
  ENCERRADA: 'Contas fechadas: nada mais a fazer.',
  NEGADA: 'Encerrada: nada mais a fazer.',
  CANCELADA: 'Encerrada: nada mais a fazer.'
};

/** 'aaaa-mm-ddTHH:mm' (horário de Brasília) -> milissegundos; null se não der para ler. */
function Via_ms_(iso) {
  var s = Via_iso_(iso);
  if (!s) return null;
  var n = Date.parse((s.length === 10 ? s + 'T00:00' : s) + ':00-03:00');
  return isFinite(n) ? n : null;
}
function Via_colunaKanban_(situacao) {
  for (var i = 0; i < VIA_KANBAN.length; i++) if (VIA_KANBAN[i].situacoes.indexOf(situacao) >= 0) return VIA_KANBAN[i].cod;
  return 'RASCUNHO';
}

/** Solicitações que a pessoa pode ver no painel, já resumidas. { itens, escopo: 'todas'|'minhas' } */
function Via_painelBase_(eu, pod) {
  pod = pod || Via_poderes_(eu);
  var todas = !!pod.VIAGEM_VER_TODAS, us = Via_usuarios_(), centros = {};
  Via_centros_(false).forEach(function (c) { centros[c.codigo] = c; });
  var itens = Via_ler_(VIA_ABAS.SOLICITACOES).filter(function (r) {
    return todas || Via_s_(r.SOLICITANTE_ID) === eu.id || Via_equipeIds_(r).indexOf(eu.id) >= 0;
  }).map(function (r) {
    var s = Via_sitEfetiva_(r), saida = Via_iso_(r.SAIDA_EM), chegada = Via_iso_(r.CHEGADA_EM), cod = Via_s_(r.CENTRO_CUSTO_CODIGO);
    var pz = typeof Via_prazoInfo_ === 'function' ? Via_prazoInfo_(r) : null, conferida = typeof Via_conferida_ === 'function' && Via_conferida_(r);
    var valida = Via_up_(r.APROVACAO_VALIDA) === 'SIM' || VIA_POS_CARGA.indexOf(Via_up_(r.SITUACAO)) >= 0, aprovado = valida ? Number(r.APROVADO_TOTAL) || 0 : 0, carregado = Number(r.CARREGADO_TOTAL) || 0;
    var noites = saida && chegada ? Via_diasEntre_(saida.slice(0, 10), chegada.slice(0, 10)) : null;
    return {
      id: Via_s_(r.ID), tipo: 'viagem', numero: Via_s_(r.NUMERO), situacao: s, situacaoNome: VIA_SITUACOES[s] || s, coluna: Via_colunaKanban_(s), cor: VIA_CORES[s] || VIA_CORES.RASCUNHO,
      proximo: VIA_PROXIMO[s] || '', destino: [Via_s_(r.DESTINO_CIDADE), Via_up_(r.DESTINO_UF)].filter(Boolean).join('/'), objetivo: Via_texto_(r.OBJETIVO, 140),
      saidaIso: saida, chegadaIso: chegada, saidaDia: saida.slice(0, 10), chegadaDia: chegada.slice(0, 10), saida: Via_br_(saida), chegada: Via_br_(chegada),
      saidaMs: Via_ms_(saida), chegadaMs: Via_ms_(chegada), dias: noites !== null && noites >= 0 ? noites + 1 : null,
      centro: cod, centroNome: centros[cod] ? centros[cod].nome : '', solicitanteId: Via_s_(r.SOLICITANTE_ID), solicitante: Via_s_(r.SOLICITANTE_NOME),
      responsavelId: Via_s_(r.RESPONSAVEL_ID), responsavel: Via_s_(r.RESPONSAVEL_NOME),
      equipe: Via_json_(r.EQUIPE_JSON, []).map(function (p) { return { id: Via_s_(p.id), nome: us[Via_s_(p.id)] ? us[Via_s_(p.id)].nome : Via_s_(p.id) }; }),
      total: Number(r.TOTAL) || 0, totalTxt: Via_moeda_(r.TOTAL), aprovado: aprovado, aprovadoTxt: aprovado ? Via_moeda_(aprovado) : '', carregado: carregado,
      carregadoTxt: carregado ? Via_moeda_(carregado) : '', faltaCarregar: Math.max(0, Via_r2_(aprovado - carregado)), urgente: Via_up_(r.URGENTE) === 'SIM', conflitos: [],
      // E2: prestação de contas (gasto lançado; aceito só depois da conferência)
      gasto: Number(r.GASTO_TOTAL) || 0, aceito: conferida ? Number(r.ACEITO_TOTAL) || 0 : 0, conferida: conferida, glosado: Number(r.GLOSADO_TOTAL) || 0, devolvido: Number(r.DEVOLVIDO_TOTAL) || 0,
      reembolsado: Number(r.REEMBOLSADO_TOTAL) || 0, aDevolver: Number(r.A_DEVOLVER) || 0, aReembolsar: Number(r.A_REEMBOLSAR) || 0, prazo: pz ? pz.prazoTxt : '', prazoIso: pz ? pz.prazo : '',
      vencida: !!(pz && pz.vencida), diasAtraso: pz ? pz.diasAtraso : 0
    };
  });
  // a mesma pessoa em duas viagens ativas que se sobrepõem (só entre as que a pessoa pode ver)
  var ativos = itens.filter(function (x) { return VIA_ATIVAS.indexOf(x.situacao) >= 0 && x.saidaIso && x.chegadaIso; });
  ativos.forEach(function (a) {
    ativos.forEach(function (b) {
      if (a === b || !(a.saidaIso < b.chegadaIso && b.saidaIso < a.chegadaIso)) return;
      var comuns = a.equipe.filter(function (p) { return b.equipe.some(function (q) { return q.id === p.id; }); }).map(function (p) { return p.nome; });
      if (comuns.length) a.conflitos.push({ numero: b.numero, pessoas: comuns });
    });
  });
  itens.sort(function (a, b) { return (a.saidaIso || '9999').localeCompare(b.saidaIso || '9999') || a.numero.localeCompare(b.numero); });
  return { itens: itens, escopo: todas ? 'todas' : 'minhas' };
}
/**
 * Filtros comuns da tela e dos relatórios. f: { de, ate (aaaa-mm-dd; a viagem entra se tocar o período), centro (código),
 * pessoa (id: quem pediu ou quem viaja) }. Com período, solicitação sem datas fica de fora.
 */
function Via_filtrar_(itens, f) {
  f = f || {};
  var de = Via_dia_(f.de), ate = Via_dia_(f.ate), centro = Via_up_(f.centro), pessoa = Via_s_(f.pessoa);
  return itens.filter(function (x) {
    if (centro && x.centro !== centro) return false;
    if (pessoa && x.solicitanteId !== pessoa && !x.equipe.some(function (p) { return p.id === pessoa; })) return false;
    if (de || ate) {
      if (!x.saidaDia || !x.chegadaDia) return false;
      if (ate && x.saidaDia > ate) return false;
      if (de && x.chegadaDia < de) return false;
    }
    return true;
  });
}
/** Dados do Kanban e do Gantt da tela (o filtro é feito na tela, com a mesma regra de Via_filtrar_). */
function Via_painel_(eu) {
  var b = Via_painelBase_(eu), pessoas = {}, centros = {};
  b.itens.forEach(function (x) {
    if (x.solicitanteId) pessoas[x.solicitanteId] = x.solicitante;
    x.equipe.forEach(function (p) { pessoas[p.id] = p.nome; });
    if (x.centro) centros[x.centro] = x.centroNome;
  });
  return {
    itens: b.itens, escopo: b.escopo, colunas: VIA_KANBAN.map(function (c) { return { cod: c.cod, nome: c.nome, sub: c.sub, fechada: !!c.fechada }; }), cores: VIA_CORES, situacoes: VIA_SITUACOES,
    pessoas: Object.keys(pessoas).map(function (id) { return { id: id, nome: pessoas[id] }; }).sort(function (a, b2) { return a.nome.localeCompare(b2.nome, 'pt-BR'); }),
    centros: Object.keys(centros).sort().map(function (k) { return { codigo: k, nome: centros[k] }; }),
    agoraMs: Date.now(), hoje: Via_hoje_(), ganttJs: typeof SGOGantt_codigoNavegador_ === 'function' ? SGOGantt_codigoNavegador_() : ''
  };
}

// ------------------------------------------------------------
// RELATÓRIOS A4
// ------------------------------------------------------------
function ViaRel_soma_(l, k) { return Via_r2_(l.reduce(function (s, x) { return s + (Number(x[k]) || 0); }, 0)); }
function ViaRel_marca_(x) {
  if (typeof RelA4_marca_ !== 'function') return x.situacaoNome;
  return { html: '<span class="marca" style="color:' + x.cor + ';border-color:' + x.cor + ';background:#fff">' + RelA4_esc_(x.situacaoNome) + '</span>' };
}
function ViaRel_legendaCores_() {
  return VIA_KANBAN.map(function (k) { return { cor: VIA_CORES[k.situacoes[0]], rotulo: k.cod === 'NEGADA_CANCELADA' ? 'Negada ou cancelada' : k.situacoes.length > 1 ? k.nome : (VIA_SITUACOES[k.situacoes[0]] || k.nome) }; });
}
/** "21/10 07:00 a 22/10 18:00" (o ano está no período do relatório). */
function ViaRel_datas_(x) { return x.saida ? x.saida.slice(0, 5) + x.saida.slice(10) + ' a ' + x.chegada.slice(0, 5) + x.chegada.slice(10) : 'sem datas'; }
function ViaRel_lista_(l, legenda) {
  var m = ViaRel_marca_;
  return RelA4_tabela_([{ t: 'Nº e situação' }, { t: 'Destino e datas' }, { t: 'Centro e dinheiro com' }, { t: 'Pedido', num: true }, { t: 'Aprovado', num: true }, { t: 'Carregado', num: true }],
    l.map(function (x) { var mk = m(x); return [{ html: RelA4_esc_(x.numero) + '<br>' + (mk.html || RelA4_esc_(mk)) }, (x.destino || '—') + ' · ' + ViaRel_datas_(x), (x.centro || 'sem centro') + ' · ' + (x.responsavel || '—'), x.totalTxt, x.aprovadoTxt || '—', x.carregadoTxt || '—']; }),
    { legenda: legenda, vazio: 'Nenhuma solicitação com estes filtros.', compacta: true });
}
/** Gantt em SVG para o A4 (o PDF não executa script): régua de SGO_Gantt_Layout.js; uma linha por pessoa ou por centro. */
function ViaRel_ganttSvg_(l, per, agrupar) {
  var DIA = 86400000, de = Via_ms_(per.de), ate = Via_ms_(per.ate) + DIA - 1;
  var vis = l.filter(function (x) { return x.saidaMs !== null && x.chegadaMs !== null && x.situacao !== 'NEGADA' && x.situacao !== 'CANCELADA'; });
  if (!vis.length) return '<p class="nota">Nenhuma viagem com datas neste período.</p>';
  var linhas = {}, ordem = [];
  vis.forEach(function (x) {
    var chaves = agrupar === 'CENTRO' ? [[x.centro || 'Sem centro', x.centroNome]] : x.equipe.map(function (p) { return [p.nome, '']; });
    chaves.forEach(function (k) { if (!linhas[k[0]]) { linhas[k[0]] = { rot: k[0], sub: k[1], itens: [] }; ordem.push(k[0]); } linhas[k[0]].itens.push(x); });
  });
  ordem.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  var W = 680, rotW = 150, area = W - rotW - 8, cabH = 34, linhaH = 24;
  var G = typeof SGOGantt_fabrica_ === 'function' ? SGOGantt_fabrica_() : null;
  var dias = Math.max(1, Math.round((ate - de) / DIA));
  var esc = G ? G.escala({ de: de, ate: ate, largura: area, modo: dias > 45 ? 'mes' : 'semana', hoje: Date.now() }) : null;
  // o A4 tem largura fixa: o período inteiro cabe na folha (a régua de SGOGantt é reescalada para a área disponível)
  var larg = area, ini0 = esc ? esc.de : de, pxDia = esc ? area / esc.dias : area / dias;
  var xm = function (ms) { return rotW + Math.max(0, Math.min(larg, (ms - ini0) / DIA * pxDia)); };
  // sub-linhas: viagens que se sobrepõem na mesma linha vão uma embaixo da outra
  var blocos = ordem.map(function (k) {
    var fins = [], its = linhas[k].itens.slice().sort(function (a, b) { return a.saidaMs - b.saidaMs; }).map(function (x) {
      var f = 0; while (f < fins.length && fins[f] > x.saidaMs) f++;
      fins[f] = x.chegadaMs; return { x: x, f: f };
    });
    return { rot: linhas[k].rot, sub: linhas[k].sub, its: its, n: Math.max(1, fins.length) };
  });
  var H = cabH + blocos.reduce(function (s, b) { return s + b.n * linhaH; }, 0) + 6, s = [];
  s.push('<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img">');
  if (esc) {
    esc.fds.forEach(function (f) { var x = rotW + f.x * pxDia / esc.pxDia; if (x < rotW + larg) s.push('<rect x="' + x.toFixed(1) + '" y="' + cabH + '" width="' + (pxDia).toFixed(1) + '" height="' + (H - cabH) + '" fill="#f1efe9"/>'); });
    var ult = -99;
    esc.ticks.forEach(function (t) { var x = rotW + t.x * pxDia / esc.pxDia; if (x - ult < 34 || x > rotW + larg - 10) return; ult = x; s.push('<line x1="' + x.toFixed(1) + '" y1="' + (cabH - 4) + '" x2="' + x.toFixed(1) + '" y2="' + H + '" stroke="#d9d6cc" stroke-width="0.6"/>'); s.push(RelA4_txtSvg_(x + 2, cabH - 8, t.rot, 'font-size="8" fill="#52606d"')); });
    esc.meses.forEach(function (m) { var x = rotW + m.x * pxDia / esc.pxDia; if (x < rotW + larg - 30) s.push(RelA4_txtSvg_(x + 2, 11, m.rot, 'font-size="8.5" font-weight="700" fill="#1f2933"')); });
  }
  var y = cabH;
  blocos.forEach(function (b, i) {
    if (i > 0) s.push('<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="#cfccc1" stroke-width="0.6"/>');
    s.push(RelA4_txtSvg_(4, y + 13, String(b.rot).slice(0, 26), 'font-size="8.5" font-weight="700" fill="#1f2933"'));
    // texto da barra: dentro se couber; senão à direita, só até a próxima barra da mesma sub-linha; senão só o número; senão nada
    var med = function (t) { return String(t).length * 4.4 + 6; };
    b.its.forEach(function (it, k) {
      var x0 = xm(it.x.saidaMs), x1 = Math.max(x0 + 5, xm(it.x.chegadaMs)), by = y + it.f * linhaH + 4, bh = linhaH - 8;
      var prox = W; b.its.forEach(function (o, j) { if (j !== k && o.f === it.f) { var ox = xm(o.x.saidaMs); if (ox >= x1 && ox < prox) prox = ox; } });
      s.push('<rect x="' + x0.toFixed(1) + '" y="' + by + '" width="' + (x1 - x0).toFixed(1) + '" height="' + bh + '" rx="2" fill="' + it.x.cor + '"' + (it.x.conflitos.length ? ' stroke="#a61b1b" stroke-width="1.6"' : '') + '/>');
      var curto = it.x.numero.replace(/^VIA-\d{4}-/, ''), longo = curto + ' ' + it.x.destino, ty = by + bh / 2 + 2.8;
      if (x1 - x0 >= med(longo)) s.push(RelA4_txtSvg_(x0 + 3, ty, longo, 'font-size="7.5" font-weight="700" fill="#fff"'));
      else if (x1 + med(longo) + 2 <= prox) s.push(RelA4_txtSvg_(x1 + 3, ty, longo, 'font-size="7.5" fill="#1f2933"'));
      else if (x1 - x0 >= med(curto)) s.push(RelA4_txtSvg_(x0 + 3, ty, curto, 'font-size="7.5" font-weight="700" fill="#fff"'));
      else if (x1 + med(curto) + 2 <= prox) s.push(RelA4_txtSvg_(x1 + 3, ty, curto, 'font-size="7.5" fill="#1f2933"'));
    });
    y += b.n * linhaH;
  });
  var hoje = Date.now();
  if (hoje >= de && hoje <= ate) { var xh = xm(hoje); s.push('<line x1="' + xh.toFixed(1) + '" y1="' + (cabH - 4) + '" x2="' + xh.toFixed(1) + '" y2="' + H + '" stroke="#1e4f7a" stroke-width="1.4"/>'); s.push(RelA4_txtSvg_(xh + 2, cabH - 18, 'hoje', 'font-size="8" font-weight="700" fill="#1e4f7a"')); }
  s.push('</svg>');
  return RelA4_figura_(s.join(''), 'Viagens no tempo, ' + (agrupar === 'CENTRO' ? 'por centro de custo' : 'por pessoa') + ' (contorno vermelho: a mesma pessoa em duas viagens ao mesmo tempo)', ViaRel_legendaCores_());
}

/**
 * Relatório A4 (HTML). d: { tipo: PERIODO|KANBAN|GANTT, de, ate, centro, pessoa, agrupar: PESSOA|CENTRO }.
 * Mostra só o que a pessoa pode ver (VIAGEM_VER_TODAS: todas; senão as que pediu ou em que viaja).
 */
function Via_relatorio_(eu, d) {
  d = d || {};
  if (typeof RelA4_documento_ !== 'function') throw new Error('Não foi possível gerar o relatório: o módulo de documentos A4 não está disponível agora. Atualize a página (F5) e tente de novo.');
  var tipo = Via_up_(d.tipo);
  if (!VIA_REL_TIPOS[tipo]) throw new Error('Não foi possível gerar: escolha o tipo de relatório (viagens do período, Kanban ou Gantt).');
  var hoje = Via_hoje_(), de = Via_dia_(d.de), ate = Via_dia_(d.ate);
  if (!de || !ate) { if (tipo === 'KANBAN' && !de && !ate) { de = ''; ate = ''; } else { de = de || hoje.slice(0, 8) + '01'; ate = ate || Via_somarDias_(Via_somarDias_(hoje.slice(0, 8) + '28', 4).slice(0, 8) + '01', -1); } }
  if (de && ate && de > ate) throw new Error('Não foi possível gerar: a data inicial (' + Via_brDia_(de) + ') é depois da final (' + Via_brDia_(ate) + '). Troque as datas.');
  if (de && ate && Via_diasEntre_(de, ate) > 400) throw new Error('Não foi possível gerar: o período passa de 400 dias. Escolha um período menor (por exemplo, um ano).');
  var b = Via_painelBase_(eu), filtro = { de: de, ate: ate, centro: d.centro, pessoa: d.pessoa };
  var l = Via_filtrar_(b.itens, filtro), per = { de: de, ate: ate };
  var us = Via_usuarios_(), nomePessoa = Via_s_(d.pessoa) ? (us[Via_s_(d.pessoa)] ? us[Via_s_(d.pessoa)].nome : Via_s_(d.pessoa)) : '';
  var escopoTxt = b.escopo === 'todas' ? 'Todas as solicitações da empresa' : 'Somente as solicitações que você pediu ou em que viaja';
  var filtrosTxt = [Via_up_(d.centro) ? 'centro de custo ' + Via_up_(d.centro) : '', nomePessoa ? 'pessoa: ' + nomePessoa : ''].filter(Boolean).join('; ') || 'nenhum';
  var periodoTxt = de ? Via_brDia_(de) + ' a ' + Via_brDia_(ate) : 'todas as datas';
  var corpo = '', ativas = l.filter(function (x) { return ['NEGADA', 'CANCELADA'].indexOf(x.situacao) < 0; });
  var nota = 'Valores de pedido e aprovação vêm das solicitações; "carregado" é o registrado pelo Financeiro com o comprovante da carga no Caju; "gasto" é o lançado na prestação de contas com os comprovantes; "aceito" e "glosado" saem da conferência do Financeiro; "devolvido" e "reembolsado", dos acertos com comprovante. A conciliação com o extrato do Caju é feita em outro módulo, do Financeiro.';
  if (tipo === 'PERIODO') {
    var aprov = ViaRel_soma_(ativas, 'aprovado'), carr = ViaRel_soma_(ativas, 'carregado');
    corpo += RelA4_secao_('Resumo do período', RelA4_kpis_([[String(ativas.length), 'Viagens no período (sem negadas e canceladas)'], [Via_moeda_(ViaRel_soma_(ativas, 'total')), 'Total pedido (soma das linhas)'],
      [Via_moeda_(aprov), 'Total aprovado', 'ok'], [Via_moeda_(carr), 'Carregado no Caju', carr < aprov ? 'aviso' : 'ok'], [Via_moeda_(Via_r2_(aprov - carr)), 'Aprovado e ainda não carregado', aprov > carr ? 'aviso' : ''],
      [String(l.length - ativas.length), 'Negadas ou canceladas'], [Via_moeda_(ViaRel_soma_(ativas, 'gasto')), 'Gasto lançado na prestação'], [Via_moeda_(ViaRel_soma_(ativas, 'aceito')), 'Aceito pelo Financeiro', 'ok'],
      [Via_moeda_(ViaRel_soma_(ativas, 'glosado')), 'Glosado', ViaRel_soma_(ativas, 'glosado') > 0 ? 'aviso' : ''], [Via_moeda_(ViaRel_soma_(ativas, 'aDevolver')), 'Ainda a devolver', ViaRel_soma_(ativas, 'aDevolver') > 0 ? 'aviso' : ''],
      [String(ativas.filter(function (x) { return x.vencida; }).length), 'Prestações vencidas', ativas.some(function (x) { return x.vencida; }) ? 'aviso' : '']]) + RelA4_caixa_(nota));
    var porC = {};
    ativas.forEach(function (x) { var k = x.centro || 'Sem centro'; porC[k] = porC[k] || { nome: k, desc: x.centroNome, n: 0, pedido: 0, aprovado: 0, carregado: 0, gasto: 0, aceito: 0, glosado: 0, devolvido: 0, reembolsado: 0 }; var g = porC[k]; g.n++; ['pedido', 'aprovado', 'carregado', 'gasto', 'aceito', 'glosado', 'devolvido', 'reembolsado'].forEach(function (c) { g[c] = Via_r2_(g[c] + (c === 'pedido' ? x.total : x[c])); }); });
    var gc = Object.keys(porC).map(function (k) { return porC[k]; }).sort(function (a, b2) { return b2.aprovado - a.aprovado || a.nome.localeCompare(b2.nome); });
    corpo += RelA4_secao_('Por centro de custo: aprovado e carregado',
      (gc.length && typeof RelA4_barrasEmpilhadas_ === 'function' ? RelA4_barrasEmpilhadas_(gc.map(function (g) { return { rotulo: g.nome, partes: [g.carregado, Math.max(0, Via_r2_(g.aprovado - g.carregado))], rotuloValor: Via_moeda_(g.aprovado) }; }),
        [{ rotulo: 'Carregado no Caju', cor: VIA_CORES.CARGA_FEITA }, { rotulo: 'Aprovado, falta carregar', cor: VIA_CORES.APROVADA }], { titulo: 'Aprovado por centro de custo (verde: já carregado no Caju; azul: falta carregar)', vazio: 'Nada aprovado no período.' }) : '') +
      RelA4_tabela_([{ t: 'Centro de custo' }, { t: 'Viagens', num: true }, { t: 'Pedido', num: true }, { t: 'Aprovado', num: true }, { t: 'Carregado', num: true }, { t: 'Falta carregar', num: true }],
        gc.map(function (g) { return [g.nome + (g.desc ? ' · ' + g.desc : ''), String(g.n), Via_moeda_(g.pedido), Via_moeda_(g.aprovado), Via_moeda_(g.carregado), Via_moeda_(Math.max(0, Via_r2_(g.aprovado - g.carregado)))]; }),
        { legenda: 'Viagens do período por centro de custo', vazio: 'Nenhuma viagem no período.', total: gc.length ? ['Total', String(ativas.length), Via_moeda_(ViaRel_soma_(ativas, 'total')), Via_moeda_(aprov), Via_moeda_(carr), Via_moeda_(Via_r2_(aprov - carr))] : null }) +
      RelA4_tabela_([{ t: 'Centro de custo' }, { t: 'Carregado', num: true }, { t: 'Gasto lançado', num: true }, { t: 'Aceito', num: true }, { t: 'Glosado', num: true }, { t: 'Devolvido', num: true }, { t: 'Reembolsado', num: true }],
        gc.map(function (g) { return [g.nome, Via_moeda_(g.carregado), Via_moeda_(g.gasto), Via_moeda_(g.aceito), Via_moeda_(g.glosado), Via_moeda_(g.devolvido), Via_moeda_(g.reembolsado)]; }),
        { legenda: 'Prestação de contas por centro de custo (aceito: só das prestações já conferidas pelo Financeiro)', vazio: 'Nenhuma viagem no período.', compacta: true,
          total: gc.length ? ['Total', Via_moeda_(carr), Via_moeda_(ViaRel_soma_(ativas, 'gasto')), Via_moeda_(ViaRel_soma_(ativas, 'aceito')), Via_moeda_(ViaRel_soma_(ativas, 'glosado')), Via_moeda_(ViaRel_soma_(ativas, 'devolvido')), Via_moeda_(ViaRel_soma_(ativas, 'reembolsado'))] : null }));
    var porP = {};
    ativas.forEach(function (x) {
      x.equipe.forEach(function (p) { porP[p.id] = porP[p.id] || { nome: p.nome, n: 0, dias: 0, respN: 0, aprovado: 0, carregado: 0 }; porP[p.id].n++; porP[p.id].dias += x.dias || 0; });
      if (x.responsavelId && porP[x.responsavelId]) { var g = porP[x.responsavelId]; g.respN++; g.aprovado = Via_r2_(g.aprovado + x.aprovado); g.carregado = Via_r2_(g.carregado + x.carregado); g.gasto = Via_r2_((g.gasto || 0) + x.gasto); g.glosado = Via_r2_((g.glosado || 0) + x.glosado); g.aDevolver = Via_r2_((g.aDevolver || 0) + x.aDevolver); if (x.vencida) g.vencidas = (g.vencidas || 0) + 1; }
    });
    var gp = Object.keys(porP).map(function (k) { return porP[k]; }).sort(function (a, b2) { return b2.n - a.n || a.nome.localeCompare(b2.nome, 'pt-BR'); });
    corpo += RelA4_secao_('Por pessoa', RelA4_tabela_([{ t: 'Pessoa' }, { t: 'Viagens', num: true }, { t: 'Dias', num: true }, { t: 'Com o dinheiro', num: true }, { t: 'Carregado no cartão', num: true }, { t: 'Gasto lançado', num: true }, { t: 'Glosado', num: true }, { t: 'A devolver', num: true }, { t: 'Prestação vencida', num: true }],
      gp.map(function (g) { return [g.nome, String(g.n), String(g.dias), String(g.respN), Via_moeda_(g.carregado), Via_moeda_(g.gasto || 0), Via_moeda_(g.glosado || 0), Via_moeda_(g.aDevolver || 0), String(g.vencidas || 0)]; }), { legenda: 'Viagens e cargas por pessoa ("com o dinheiro": em quantas foi o responsável pelo dinheiro; o cartão Caju carregado é o dela)', vazio: 'Nenhuma viagem no período.' }));
    var abertas = ativas.filter(function (x) { return ['PRESTACAO_PENDENTE', 'PRESTACAO_DEVOLVIDA', 'PRESTACAO_ENVIADA', 'ACERTO_PENDENTE', 'AGUARDANDO_CIENCIA'].indexOf(x.situacao) >= 0; });
    corpo += RelA4_secao_('Prestações de contas em aberto', RelA4_tabela_([{ t: 'Nº e situação' }, { t: 'Dinheiro com' }, { t: 'Prazo' }, { t: 'Carregado', num: true }, { t: 'Gasto lançado', num: true }, { t: 'A devolver / reembolsar', num: true }],
      abertas.map(function (x) { var mk = ViaRel_marca_(x); return [{ html: RelA4_esc_(x.numero) + '<br>' + (mk.html || RelA4_esc_(mk)) }, x.responsavel || '—', x.prazo ? x.prazo + (x.vencida ? ' (vencida, ' + x.diasAtraso + (x.diasAtraso === 1 ? ' dia' : ' dias') + ')' : '') : '—', x.carregadoTxt || '—', Via_moeda_(x.gasto), x.aDevolver ? Via_moeda_(x.aDevolver) + ' a devolver' : x.aReembolsar ? Via_moeda_(x.aReembolsar) + ' a reembolsar' : '—']; }),
      { legenda: 'Viagens com carga cuja prestação de contas ainda não foi encerrada', vazio: 'Nenhuma prestação em aberto no período.', compacta: true }));
    corpo += RelA4_secao_('Lista das viagens', ViaRel_lista_(l, 'Solicitações do período, pela data de saída'));
  } else if (tipo === 'KANBAN') {
    corpo += RelA4_secao_('Resumo por etapa', RelA4_kpis_(VIA_KANBAN.map(function (k) { var n = l.filter(function (x) { return x.coluna === k.cod; }).length; return [String(n), k.nome, k.cod === 'DEVOLVIDA' || k.cod.indexOf('AGUARDANDO') === 0 ? (n ? 'aviso' : '') : '']; })) +
      RelA4_tabela_([{ t: 'Etapa' }, { t: 'O que acontece agora' }, { t: 'Solicitações', num: true }, { t: 'Valor pedido', num: true }],
        VIA_KANBAN.map(function (k) { var c = l.filter(function (x) { return x.coluna === k.cod; }); return [k.nome, VIA_PROXIMO[k.situacoes[0]], String(c.length), Via_moeda_(ViaRel_soma_(c, 'total'))]; }), { legenda: 'Solicitações em cada etapa do fluxo' }));
    var venc = l.filter(function (x) { return x.vencida; });
    if (venc.length) corpo += RelA4_secao_('Prestações vencidas (trava)', RelA4_tabela_([{ t: 'Nº' }, { t: 'Dinheiro com' }, { t: 'Prazo' }, { t: 'Atraso', num: true }],
      venc.map(function (x) { return [x.numero, x.responsavel || '—', x.prazo, x.diasAtraso + (x.diasAtraso === 1 ? ' dia' : ' dias')]; }), { legenda: 'Quem está nesta lista não pode ser responsável pelo dinheiro de outra viagem até prestar contas ou a Diretoria liberar', compacta: true }));
    VIA_KANBAN.forEach(function (k) {
      var c = l.filter(function (x) { return x.coluna === k.cod; });
      if (!c.length) return;
      corpo += RelA4_secao_(k.nome, RelA4_tabela_([{ t: 'Nº' }, { t: 'Destino e datas' }, { t: 'Pedido por / dinheiro com' }, { t: 'Centro' }, { t: 'Total', num: true }],
        c.map(function (x) { return [x.numero + (x.urgente ? ' (urgente)' : ''), (x.destino || '—') + ' · ' + ViaRel_datas_(x), x.solicitante + ' / ' + (x.responsavel || '—'), x.centro || '—', x.totalTxt]; }), { compacta: true }));
    });
  } else {
    var agr = Via_up_(d.agrupar) === 'CENTRO' ? 'CENTRO' : 'PESSOA';
    corpo += RelA4_secao_('Linha do tempo', RelA4_paragrafos_('Cada barra é uma viagem, da saída à chegada, na cor da situação. ' + (agr === 'CENTRO' ? 'Uma linha por centro de custo.' : 'Uma linha por pessoa que viaja: a mesma viagem aparece na linha de cada pessoa da equipe.') + ' Barras uma embaixo da outra na mesma linha são viagens que se sobrepõem no tempo. Negadas e canceladas não entram na linha do tempo.') + ViaRel_ganttSvg_(l, per, agr));
    var conf = l.filter(function (x) { return x.conflitos.length; });
    corpo += RelA4_secao_('Sobreposições da mesma pessoa', RelA4_tabela_([{ t: 'Viagem' }, { t: 'Saída e chegada' }, { t: 'Sobrepõe com' }],
      conf.map(function (x) { return [x.numero + ' · ' + x.destino, ViaRel_datas_(x), x.conflitos.map(function (c) { return c.numero + ' (' + c.pessoas.join(', ') + ')'; }).join('; ')]; }),
      { vazio: 'Nenhuma pessoa em duas viagens ao mesmo tempo neste período.' }));
    corpo += RelA4_secao_('Lista das viagens', ViaRel_lista_(l, 'Viagens do período, pela data de saída'));
  }
  var titulo = VIA_REL_TIPOS[tipo];
  var html = RelA4_documento_({ titulo: titulo, subtitulo: 'Depósito de viagem · ' + periodoTxt, tituloCurto: 'Depósito de viagem', sigla: 'VIA' + tipo.slice(0, 3), identificacao: periodoTxt,
    rotuloIdentificacao: 'Período', emitidoPor: eu.nome, corpo: corpo, sumario: false, ficha: [['O que entra', escopoTxt], ['Filtros', filtrosTxt]] });
  var nome = 'Deposito-de-viagem_' + ({ PERIODO: 'periodo', KANBAN: 'kanban', GANTT: 'gantt' })[tipo] + (de ? '_' + de + '_a_' + ate : '') + '.html';
  return { html: html, nomeArquivo: nome, quantidade: l.length, escopo: b.escopo, message: titulo + ' gerado (' + l.length + (l.length === 1 ? ' solicitação' : ' solicitações') + ', ' + periodoTxt + ').' };
}
