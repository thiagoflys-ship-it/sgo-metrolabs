/****************************************************
 * DIRETORIA INFORMADA: RESUMO DIÁRIO E RELATÓRIO DIÁRIO DA EMPRESA (11/11/2026, decisão do dono)
 *
 * Decisão do dono: "os donos não devem ser cobrados como funcionários; devem ser informados e decidir só o que é da Diretoria".
 * Ampliação (palavras do dono): "quero que gere um relatório com índice, Kanban, com gráfico e com tudo feito em HTML em A4, que
 * esse resumo mostre tudo, a empresa inteira, todos os módulos, todos os setores, para sabermos o que está acontecendo e podermos
 * cobrar".
 *
 * 1. RESUMO DIÁRIO DA DIRETORIA (evento GS07 da matriz de avisos; SGO_resumoDiretoriaRodada_, chamado pela rodada da gestão,
 *    SGO_Gestao_Escada.js Ges_rodada_, já dentro do expediente): uma vez por dia útil, a partir da hora das regras da Caixa
 *    (padrão 08:30), para cada pessoa da Diretoria (perfil Diretoria e o dono, Ges_diretoria_):
 *     - e-mail com os números do dia, a lista do que está parado por área (item, com quem está, há quantos dias, prazo, link),
 *       as atividades da equipe escaladas pela SEDNA, o que está com a Diretoria e as atividades da própria pessoa (lembrete),
 *       e o link do relatório diário da empresa;
 *     - WhatsApp curto (quantidade por área e o link), pelo modelo de utilidade da gestão (sgo_gestao_item quando aprovado e na
 *       categoria Utilidade; senão o sgo_gestao_acao, como a fila da gestão: AvG_modeloWhats_). O sgo_gestao_resumo_dia não serve:
 *       o texto dele pede decisão ("Para decidir"), a Meta o reclassificou como Marketing e ele não está na lista de modelos
 *       liberados para os celulares da gestão no piloto (WAP_MODELOS_GESTAO);
 *     - alerta na tela do SGO+ (Atividades_avisar_, tipo DIRETORIA).
 *    Texto informativo: não pede ação nem justificativa da Diretoria. Registro em GES_ENVIOS (TIPO RESUMO_DIRETORIA, um por pessoa
 *    por dia; erro de e-mail e WhatsApp juntos tenta de novo na rodada seguinte). Com ele ligado, o GS03 (escalada item a item), o
 *    GS01 e o GS02 para a Diretoria e as cobranças da SEDNA à Diretoria deixam de sair (SGO_Avisos_Gestao.js e SGO_Sedna.js); a
 *    escada da Caixa continua marcando o item como escalado. O que só a Diretoria decide (GS04, GS05, GS06) e os atos
 *    irreversíveis (GI01 a GI07) continuam na hora. Liga, desliga e hora: Caixa de decisões > Regras e responsáveis.
 *
 * 2. RELATÓRIO DIÁRIO DA EMPRESA (HTML A4, moldura SGO_Documentos_RelatorioA4.js / SGO_DocA4.js): capa, índice clicável, visão
 *    geral com indicadores e gráficos em SVG (sem biblioteca), Kanban da empresa (aguardando decisão, em andamento, atrasado,
 *    escalado, resolvido hoje), uma seção por setor (o que está parado, com quem, há quantos dias, prazo, o que fazer), ranking
 *    de atrasos por pessoa e por setor, o que está com a Diretoria e o Programa de conduta só em números (sigilo; o módulo não
 *    foi alterado). Fontes que já existem, sem recalcular regra: central de pendências (Pend_calcular_ no contexto da Diretoria),
 *    Caixa de decisões (Ges_caixa_, GES_DECISOES), atividades (Atividades_todas_, Atividades_vencida_, prazos da SEDNA),
 *    Comercial (Com_indicadores_), Depósito de viagem (Via_painelBase_), atos irreversíveis do dia (NTF_GESTAO).
 *    Tela: Gestão > Relatório diário da empresa (abrir('gestao_relatorio_dia'), JS_Gestao.html), para gerar, baixar e imprimir
 *    a qualquer momento. Acesso: caixa GESTAO_RELATORIO_DIA (Administração > Acessos), registrada aqui no padrão do lote 12
 *    (SGO_PODERES_MODULOS, SGO_Poderes.js): padrão só a Diretoria e o dono; o responsável pelo sistema libera para outra pessoa.
 *
 * Nada aqui grava em módulo de negócio nem muda regra de quem decide. Nenhuma função devolve Date cru. Sem emoji.
 ****************************************************/

var RELDIA_PODER = 'GESTAO_RELATORIO_DIA';
var RELDIA_TELA = 'gestao_relatorio_dia';
var RELDIA_ENVIO = 'RESUMO_DIRETORIA';
var RELDIA_MAX_KANBAN = 12;      // cartões por coluna do Kanban (o resto vira "e mais N")
var RELDIA_MAX_SETOR = 40;       // linhas por setor no relatório
var RELDIA_MAX_EMAIL = 150;      // linhas do que está parado no e-mail
var RELDIA_WA_MAX = 540;         // texto da lista no WhatsApp
var RELDIA_SIGILO = ['conduta', 'qualidade'];
/** 16/11/2026: itens do Financeiro (sigiloso) no relatório: só a contagem. Pelo prefixo do id e pelo módulo. */
var RELDIA_FIN_IDS = /^(CMP:CONFERIR:|CJU:|VIA:CARGA:|VIA:CONF:|VIA:ACERTO:|OMIE)/;
var RELDIA_FIN_MODULOS = ['financeiro', 'omie', 'caju', 'conciliacao_caju', 'compras_financeiro'];   // Programa de conduta e Qualidade: só números, sem nomes nem detalhes
var RELDIA_COLUNAS = [
  { k: 'AGUARDANDO', nome: 'Aguardando decisão', cor: '#1f5fa8' }, { k: 'ANDAMENTO', nome: 'Em andamento', cor: '#0f8b8d' },
  { k: 'ATRASADO', nome: 'Atrasado', cor: '#b45309' }, { k: 'ESCALADO', nome: 'Escalado', cor: '#a61b1b' }, { k: 'RESOLVIDO', nome: 'Resolvido hoje', cor: '#1d6b3f' }
];
/** Setores do relatório: pelo módulo do item; sem módulo conhecido, pela área. */
var RELDIA_SETORES = [
  { k: 'comercial', nome: 'Comercial', modulos: ['comercial', 'email'], areas: ['COMERCIAL'] },
  { k: 'tecnica', nome: 'Técnica e Assistência técnica', modulos: ['assistencia', 'auvo', 'nr13'], areas: ['TECNICA'] },
  { k: 'metrologia', nome: 'Metrologia e Calibração', modulos: ['padroes', 'certificados'], areas: ['METROLOGIA'] },
  { k: 'qualidade', nome: 'Qualidade (relatórios técnicos)', modulos: [], areas: ['QUALIDADE'] },
  { k: 'frota', nome: 'Frota e Administrativo', modulos: ['frota', 'avisos', 'automacao', 'cadastros'], areas: ['ADMINISTRATIVO'] },
  { k: 'compras', nome: 'Compras e Logística', modulos: ['compras'], areas: ['LOGISTICA'] },
  { k: 'financeiro', nome: 'Financeiro', modulos: ['financeiro'], areas: ['FINANCEIRO'] },
  { k: 'rh', nome: 'RH e ponto', modulos: ['ponto'], areas: ['RH'] },
  { k: 'representacao', nome: 'Representação', modulos: ['representacao'], areas: [] },
  { k: 'viagem', nome: 'Depósito de viagem', modulos: ['viagem'], areas: [] },
  { k: 'licitacoes', nome: 'Licitações', modulos: ['licitacoes'], areas: [] },
  { k: 'documentos', nome: 'Documentos e vencimentos de clientes', modulos: ['documentos'], areas: [] },
  { k: 'diretoria', nome: 'Diretoria', modulos: [], areas: ['DIRETORIA'] },
  { k: 'outros', nome: 'Outros (sem setor definido)', modulos: [], areas: [] }
];

// ------------------------------------------------------------
// CAIXA DE ACESSO (padrão do lote 12: registrada pelo próprio módulo)
// ------------------------------------------------------------
var SGO_PODERES_MODULOS = (typeof SGO_PODERES_MODULOS !== 'undefined' && SGO_PODERES_MODULOS) || [];
if (!SGO_PODERES_MODULOS.some(function (m) { return m && m.item && m.item[0] === RELDIA_PODER; })) {
  SGO_PODERES_MODULOS.push({
    item: [RELDIA_PODER, 'Caixa de decisões', 'Ver o relatório diário da empresa', 'Abre, baixa e imprime o relatório diário da empresa (todos os setores, com quem está cada pendência e há quantos dias, ranking de atrasos por pessoa). Padrão: a Diretoria e o dono.', 'ver', 12],
    padrao: function (eu, c) { return !!c.diretoria; },
    ligado: true
  });
}

/** A sessão pode abrir o relatório? Pela caixa quando o catálogo de acessos está carregado; sem ele, a Diretoria e o dono. */
function RelDia_podeSessao_(s) {
  try {
    if (typeof SGO_pode_ === 'function' && typeof SGO_poderesCatalogo_ === 'function' && SGO_poderesCatalogo_().mapa[RELDIA_PODER]) return !!SGO_pode_(s, RELDIA_PODER);
  } catch (e) { /* sem o catálogo: regra da Diretoria abaixo */ }
  return typeof Ges_ehDiretoriaSessao_ === 'function' && !!Ges_ehDiretoriaSessao_(s);
}

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function RelDia_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function RelDia_esc_(v) { return typeof RelA4_esc_ === 'function' ? RelA4_esc_(v) : String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function RelDia_pl_(n, um, varios) { return String(n) + ' ' + (Number(n) === 1 ? um : varios); }
function RelDia_corta_(t, n) { t = RelDia_s_(t).replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 3).replace(/\s+$/, '') + '...' : t; }
function RelDia_setor_(k) { return RELDIA_SETORES.filter(function (s) { return s.k === k; })[0] || RELDIA_SETORES[RELDIA_SETORES.length - 1]; }
/** Setor de um item: pelo módulo; sem módulo conhecido, pela área (código). */
function RelDia_setorDe_(modulo, area) {
  modulo = RelDia_s_(modulo).toLowerCase(); area = RelDia_s_(area).toUpperCase();
  for (var i = 0; i < RELDIA_SETORES.length; i++) if (modulo && RELDIA_SETORES[i].modulos.indexOf(modulo) >= 0) return RELDIA_SETORES[i].k;
  for (var j = 0; j < RELDIA_SETORES.length; j++) if (area && RELDIA_SETORES[j].areas.indexOf(area) >= 0) return RELDIA_SETORES[j].k;
  return 'outros';
}
function RelDia_diasEntre_(diaA, diaB) {
  var a = Date.parse(RelDia_s_(diaA).slice(0, 10) + 'T12:00:00Z'), b = Date.parse(RelDia_s_(diaB).slice(0, 10) + 'T12:00:00Z');
  return isFinite(a) && isFinite(b) ? Math.round((b - a) / 864e5) : null;
}
function RelDia_somarDias_(dia, n) { var t = new Date(Date.parse(dia + 'T12:00:00Z') + n * 864e5); return t.toISOString().slice(0, 10); }
function RelDia_brDia_(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(RelDia_s_(iso)); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }

// ------------------------------------------------------------
// DADOS (fontes que já existem)
// ------------------------------------------------------------
/** Prioridade e nível da SEDNA de uma atividade vencida (0 a 3), pelos prazos gravados em Regras e responsáveis. */
function RelDia_nivelSedna_(a, agora) {
  try {
    if (typeof Sedna_cfg_ !== 'function' || typeof Sedna_minutos_ !== 'function') return 0;
    var cfg = Sedna_cfg_(), pri = typeof Sedna_prioridade_ === 'function' ? Sedna_prioridade_(a) : 'Normal', lim = cfg.escalonamento.horas[pri] || [];
    var atraso = Sedna_minutos_(agora) - Sedna_minutos_(a.PREVISAO_ATUAL), n = 0;
    lim.forEach(function (h, i) { if (atraso >= h * 60) n = i + 1; });
    return n;
  } catch (e) { return 0; }
}

/**
 * Tudo o que o relatório e o resumo usam, lido uma vez. quando: Date (opcional).
 * Devolve { dia, hojeBr, geradoEm, itens: [item], conduta: {abertos, atrasados}, irreversiveis: [..], evolucao: [{dia, abertos}],
 *           comercial, viagem, avisos: [fontes que falharam] } com item = { id, fonte, setor, modulo, moduloNome, area, titulo, com,
 *           comIds, envolvido, dias, diasTxt, prazo, oQueFazer, coluna, link, diretoria }.
 */
function RelDia_dados_(quando) {
  var hoje = Ges_hoje_(), agora = Ges_agora_(), avisos = [];
  var us = Ges_usuarios_(), nomesAreas = typeof Areas_mapaNomes_ === 'function' ? Areas_mapaNomes_() : {};
  var cfg = Ges_cfg_(), itens = [], conduta = { abertos: 0, atrasados: 0 }, vistos = {};
  var dirDe = function (ids) { return (ids || []).some(function (id) { return us[id] && us[id].diretoria; }); };
  var nomeArea = function (cod) { cod = RelDia_s_(cod).toUpperCase(); return cod ? (nomesAreas[cod] || cod) : 'Sem área'; };
  var sigilo = function (modulo) { return RELDIA_SIGILO.indexOf(RelDia_s_(modulo).toLowerCase()) >= 0; };
  // 16/11/2026 (sigilo do Financeiro): conferência de compras, Caju, carga e conferência de viagem e o Painel financeiro entram só na contagem
  var financeiro = { abertos: 0, atrasados: 0 };
  var doFin = function (x) { return RELDIA_FIN_IDS.test(RelDia_s_(x && x.id)) || RELDIA_FIN_MODULOS.indexOf(RelDia_s_(x && x.modulo).toLowerCase()) >= 0; };
  // 1. Caixa de decisões
  var cx = null;
  try { cx = Ges_caixa_(); } catch (e) { avisos.push('Caixa de decisões'); }
  (cx ? cx.itens : []).forEach(function (i) {
    if (i.acompanhamento || i.tipo === 'atividade_atrasada') return;
    vistos[i.id] = true;
    var col = i.escalado ? 'ESCALADO' : (i.prazoVencido || i.etapa === 'WHATSAPP') ? 'ATRASADO' : 'AGUARDANDO';
    if (sigilo(i.modulo) || i.sigilo) { conduta.abertos++; if (col !== 'AGUARDANDO') conduta.atrasados++; return; }
    if (doFin(i)) { financeiro.abertos++; if (col !== 'AGUARDANDO') financeiro.atrasados++; return; }
    itens.push({ id: i.id, fonte: 'Caixa de decisões', setor: RelDia_setorDe_(i.modulo, i.area), modulo: i.modulo, moduloNome: i.moduloNome || i.modulo, area: i.areaNome || nomeArea(i.area),
      titulo: RelDia_s_(i.titulo), com: (i.responsaveisNomes || []).join(', ') || 'ninguém', comIds: i.responsaveis || [], envolvido: RelDia_s_(i.envolvido),
      dias: Number(i.diasParado) || 0, diasTxt: i.diasParado ? 'parado há ' + RelDia_pl_(i.diasParado, 'dia útil', 'dias úteis') : 'novo',
      prazo: i.prazo ? i.prazo + (i.prazoVencido ? ' (vencido)' : '') : '', oQueFazer: RelDia_s_(i.oQueFazer), coluna: col,
      link: typeof Ges_linkDoItem_ === 'function' ? Ges_linkDoItem_(i) : '', diretoria: dirDe(i.responsaveis), reserva: !!i.reserva });
  });
  // 2. Central de pendências, no contexto da Diretoria (todos os módulos e setores)
  var pend = [];
  try {
    if (typeof Pend_calcular_ === 'function') pend = Pend_calcular_({ userId: '', perfil: 'DIRETORIA', nome: 'Relatório diário', clienteId: '', cliente: false, gestao: true, diretoria: true, rotina: true, interno: false }).itens || [];
  } catch (e) { avisos.push('central de pendências'); }
  // 11/11/2026: O.S. saneada na Caixa (encerrada fora do SGO+ ou vínculo dispensado, com motivo; SGO_Gestao_Painel.js) não volta pela central
  var saneados = {};
  try { if (typeof GesP_saneados_ === 'function') saneados = GesP_saneados_(); } catch (e) { saneados = {}; }
  pend.forEach(function (p) {
    if (!p || vistos[p.id] || saneados[p.id] || p.gravidade === 'INFO' || p.modulo === 'atividades' || p.publico === 'CLIENTE') return;
    vistos[p.id] = true;
    var col = p.gravidade === 'CRITICO' ? 'ATRASADO' : 'AGUARDANDO';
    if (sigilo(p.modulo)) { conduta.abertos++; if (col === 'ATRASADO') conduta.atrasados++; return; }
    if (doFin(p)) { financeiro.abertos++; if (col === 'ATRASADO') financeiro.atrasados++; return; }
    var d = p.dias === null || p.dias === undefined ? null : Number(p.dias);
    var resp = p.responsavelId && us[p.responsavelId] ? [p.responsavelId] : [];
    itens.push({ id: p.id, fonte: 'Central de pendências', setor: RelDia_setorDe_(p.modulo, resp.length ? us[resp[0]].area : ''), modulo: p.modulo, moduloNome: p.moduloNome || p.modulo,
      area: resp.length ? us[resp[0]].areaNome : '', titulo: RelDia_s_(p.titulo), com: RelDia_s_(p.responsavel) || 'a gestão do setor', comIds: resp, envolvido: '',
      dias: d !== null && d < 0 ? -d : 0, diasTxt: d === null ? '' : d < 0 ? 'vencido há ' + RelDia_pl_(-d, 'dia', 'dias') : d === 0 ? 'vence hoje' : 'vence em ' + RelDia_pl_(d, 'dia', 'dias'),
      prazo: RelDia_s_(p.vencimento), oQueFazer: RelDia_s_(p.oQueFazer), coluna: col, link: typeof Ges_linkDoItem_ === 'function' ? Ges_linkDoItem_(p) : '', diretoria: dirDe(resp) });
  });
  // 3. Atividades (atrasadas, aguardando decisão de nova data, em andamento) e as concluídas hoje
  var atvs = [], agoraAtv = typeof Atividades_agora_ === 'function' ? Atividades_agora_() : agora;
  try { atvs = typeof Atividades_todas_ === 'function' ? Atividades_todas_() : []; } catch (e) { avisos.push('atividades'); }
  var linkAtv = typeof Ges_linkTela_ === 'function' ? Ges_linkTela_('atividades_equipe') : '';
  atvs.forEach(function (a) {
    if (typeof Atividades_daOS_ === 'function' && Atividades_daOS_(a)) return;
    var rest = typeof Atividades_restrita_ === 'function' ? Atividades_restrita_(a) : false;
    var resp = RelDia_s_(a.RESPONSAVEL_ID), u = us[resp];
    if (RelDia_s_(a.SITUACAO) === 'Concluída' && RelDia_s_(a.CONCLUIDA_EM).slice(0, 10) === hoje) {
      if (rest) return;
      itens.push({ id: 'ATV:' + a.ID, fonte: 'Atividades', setor: RelDia_setorDe_(a.MODULO, u ? u.area : ''), modulo: 'atividades', moduloNome: 'Atividades', area: u ? u.areaNome : '',
        titulo: RelDia_s_(a.TITULO), com: RelDia_s_(a.RESPONSAVEL_NOME), comIds: [resp], envolvido: '', dias: 0, diasTxt: 'concluída hoje', prazo: typeof Atividades_dataBr_ === 'function' ? Atividades_dataBr_(a.PREVISAO_ATUAL) : '',
        oQueFazer: '', coluna: 'RESOLVIDO', link: linkAtv, diretoria: !!(u && u.diretoria) });
      return;
    }
    if (typeof Atividades_aberta_ !== 'function' || !Atividades_aberta_(a) || !a.PREVISAO_ATUAL) return;
    var vencida = typeof Atividades_vencida_ === 'function' && Atividades_vencida_(a, agoraAtv);
    var pedido = typeof Atividades_pedidoPendente_ === 'function' && Atividades_pedidoPendente_(a);
    var col = vencida ? (RelDia_nivelSedna_(a, agoraAtv) >= 3 ? 'ESCALADO' : 'ATRASADO') : pedido ? 'AGUARDANDO' : RelDia_s_(a.SITUACAO) === 'Em andamento' ? 'ANDAMENTO' : '';
    if (!col) return;
    if (rest) { conduta.abertos++; if (vencida) conduta.atrasados++; return; }
    var dAtr = vencida ? Math.max(0, RelDia_diasEntre_(a.PREVISAO_ATUAL, hoje) || 0) : 0;
    itens.push({ id: 'ATV:' + a.ID, fonte: 'Atividades', setor: RelDia_setorDe_(a.MODULO, u ? u.area : ''), modulo: 'atividades', moduloNome: 'Atividades' + (a.MODULO_NOME ? ' (' + a.MODULO_NOME + ')' : ''),
      area: u ? u.areaNome : '', titulo: RelDia_s_(a.TITULO), com: RelDia_s_(a.RESPONSAVEL_NOME) || 'sem responsável', comIds: resp ? [resp] : [], envolvido: '', prioridade: RelDia_s_(a.PRIORIDADE) || 'Normal',
      dias: dAtr, diasTxt: vencida ? (u && u.diretoria ? 'lembrete: ' : '') + (dAtr ? 'atrasada há ' + RelDia_pl_(dAtr, 'dia', 'dias') : 'atrasada desde hoje') : pedido ? 'nova data pedida, aguardando ' + (RelDia_s_(a.PEDIDO_DECISOR_NOME) || 'a gestão') : 'em andamento',
      prazo: typeof Atividades_dataBr_ === 'function' ? Atividades_dataBr_(a.PREVISAO_ATUAL) : RelDia_s_(a.PREVISAO_ATUAL),
      oQueFazer: vencida ? (u && u.diretoria ? 'Lembrete (Diretoria): concluir ou remarcar, se quiser.' : 'Cobrar ' + (RelDia_s_(a.RESPONSAVEL_NOME) || 'o responsável') + ': concluir ou pedir nova data.') : pedido ? 'Decidir a nova data pedida.' : '',
      coluna: col, link: linkAtv, diretoria: !!(u && u.diretoria), atividade: true, vencida: vencida });
  });
  // 4. Decisões resolvidas hoje (Caixa)
  try {
    if (typeof GES_ABA_DECISOES !== 'undefined') Ges_ler_(GES_ABA_DECISOES).forEach(function (r) {
      if (Ges_up_(r.SITUACAO) !== 'RESOLVIDA' || Ges_dia_(r.RESOLVIDO_EM) !== hoje || Ges_up_(r.ACOMPANHAMENTO) === 'SIM' || /ATIVIDADE_ATRASADA/.test(Ges_up_(r.TIPO))) return;
      if (sigilo(r.MODULO)) return;
      itens.push({ id: 'RES:' + RelDia_s_(r.ITEM_ID), fonte: 'Caixa de decisões', setor: RelDia_setorDe_(r.MODULO, r.AREA), modulo: RelDia_s_(r.MODULO), moduloNome: (typeof PEND_MODULOS !== 'undefined' && PEND_MODULOS[r.MODULO]) || RelDia_s_(r.MODULO),
        area: nomeArea(r.AREA), titulo: RelDia_s_(r.TITULO), com: RelDia_s_(r.RESOLVIDO_POR_NOME || r.PROVIDENCIA_POR_NOME || r.RESPONSAVEIS_NOMES) || '—', comIds: [], envolvido: '', dias: 0, diasTxt: 'resolvido hoje',
        prazo: RelDia_brDia_(Ges_dia_(r.PRAZO_DECISAO)), oQueFazer: '', coluna: 'RESOLVIDO', link: '', diretoria: false });
    });
  } catch (e) { avisos.push('decisões resolvidas hoje'); }
  // 5. Atos irreversíveis do dia (fila dos avisos da gestão; o do Programa de conduta já sai sem detalhe)
  var irrev = [], visto = {};
  try {
    if (typeof AvG_ler_ === 'function') AvG_ler_().forEach(function (l) {
      if (RelDia_s_(l.TIPO).toUpperCase() !== 'IRREVERSIVEL' || RelDia_s_(l.QUANDO).slice(0, 10) !== hoje) return;
      var k = RelDia_s_(l.EVENTO) + '|' + RelDia_s_(l.REF_ID);
      if (visto[k]) return; visto[k] = true;
      irrev.push({ hora: RelDia_s_(l.QUANDO).slice(11, 16), evento: RelDia_s_(l.EVENTO), titulo: RelDia_s_(l.TITULO), texto: RelDia_corta_(RelDia_s_(l.TEXTO).split('\n').slice(0, 1).join(' '), 160) });
    });
  } catch (e) { avisos.push('atos irreversíveis do dia'); }
  irrev.sort(function (a, b) { return a.hora < b.hora ? -1 : 1; });
  // 6. Evolução dos últimos 30 dias (decisões abertas na Caixa ao fim de cada dia)
  var evolucao = [];
  try {
    if (typeof GES_ABA_DECISOES !== 'undefined') {
      var regs = Ges_ler_(GES_ABA_DECISOES).filter(function (r) { return Ges_up_(r.ACOMPANHAMENTO) !== 'SIM' && !sigilo(r.MODULO); });
      var primeiro = regs.reduce(function (m, r) { var d = Ges_dia_(r.ENTROU_EM); return d && (!m || d < m) ? d : m; }, '');
      if (primeiro) for (var k = 29; k >= 0; k--) {
        var d = RelDia_somarDias_(hoje, -k);
        if (d < primeiro) continue;
        evolucao.push({ dia: d, abertos: regs.filter(function (r) { var e = Ges_dia_(r.ENTROU_EM), res = Ges_dia_(r.RESOLVIDO_EM); return e && e <= d && (!res || res > d) && (Ges_up_(r.SITUACAO) === 'ABERTA' || res); }).length });
      }
    }
  } catch (e) { avisos.push('evolução de 30 dias'); }
  // 7. Comercial (indicadores do mês, com o que falta por vendedor) e Depósito de viagem
  var comercial = null;
  try {
    if (typeof Com_indicadores_ === 'function' && typeof Comercial_emUso_ === 'function' && Comercial_emUso_()) {
      var ind = Com_indicadores_(hoje.slice(0, 7));
      comercial = { abertas: ind.aberto.qtd, valorAberto: ind.aberto.valor, ganhas: ind.ganho.qtd, valorGanho: ind.ganho.valor, perdidas: ind.perdido.qtd, enviadas: ind.propostas.enviadas,
        vencidas: ind.propostas.vencidas, semPassagem: ind.pedidosSemPassagem, conversao: ind.conversaoTxt,
        vendedores: (ind.porVendedor || []).map(function (v) { return { nome: v.nome, abertas: v.abertas, semProxima: v.semProxima, paradas: v.paradas, ganhas: v.ganhas }; }) };
    }
  } catch (e) { avisos.push('Comercial'); }
  var viagem = null;
  try {
    if (typeof Via_painelBase_ === 'function') {
      var vb = Via_painelBase_({ id: '', login: '', perfil: 'DIRETORIA', nome: 'Relatório diário' }, { VIAGEM_VER_TODAS: true });
      var porSit = {};
      (vb.itens || []).forEach(function (x) { porSit[x.situacaoNome] = (porSit[x.situacaoNome] || 0) + 1; });
      viagem = { porSituacao: porSit, total: (vb.itens || []).length,
        vencidas: (vb.itens || []).filter(function (x) { return x.vencida; }).map(function (x) { return { numero: x.numero, solicitante: x.solicitante, destino: x.destino, dias: x.diasAtraso, prazo: x.prazo }; }) };
    }
  } catch (e) { avisos.push('Depósito de viagem'); }
  return { dia: hoje, hojeBr: RelDia_brDia_(hoje), geradoEm: Ges_br_(agora), itens: itens, conduta: conduta, financeiro: financeiro, irreversiveis: irrev, evolucao: evolucao,
    comercial: comercial, viagem: viagem, avisos: avisos, cfg: cfg, us: us };
}

/** Números do dia a partir dos itens. */
function RelDia_numeros_(d) {
  var n = { abertos: 0, atrasados: 0, escalados: 0, diretoria: 0, resolvidos: 0, atividadesAtrasadas: 0, lembretesDiretoria: 0, irreversiveis: d.irreversiveis.length, porSetor: {} };
  d.itens.forEach(function (i) {
    if (i.coluna === 'RESOLVIDO') { n.resolvidos++; return; }
    // atividade da própria Diretoria: lembrete, não conta como pendência parada da empresa
    if (i.atividade && i.diretoria) { n.lembretesDiretoria++; return; }
    n.abertos++;
    if (i.coluna === 'ATRASADO') n.atrasados++;
    if (i.coluna === 'ESCALADO') n.escalados++;
    if (i.diretoria && !i.atividade) n.diretoria++;
    if (i.atividade && i.vencida && !i.diretoria) n.atividadesAtrasadas++;
    var s = n.porSetor[i.setor] = n.porSetor[i.setor] || { abertos: 0, parados: 0, aguardando: 0, andamento: 0 };
    s.abertos++;
    if (i.coluna === 'ATRASADO' || i.coluna === 'ESCALADO') s.parados++; else if (i.coluna === 'ANDAMENTO') s.andamento++; else s.aguardando++;
  });
  return n;
}

/** Ranking de atrasos: por pessoa (fora a Diretoria, que é informada) e por setor. */
function RelDia_ranking_(d) {
  var pessoas = {};
  d.itens.forEach(function (i) {
    if (i.coluna !== 'ATRASADO' && i.coluna !== 'ESCALADO') return;
    (i.comIds || []).forEach(function (id) {
      var u = d.us[id];
      if (!u || u.diretoria) return;
      var p = pessoas[id] = pessoas[id] || { nome: u.nome, area: u.areaNome, atividades: 0, decisoes: 0, escalados: 0, maior: 0 };
      if (i.atividade) p.atividades++; else p.decisoes++;
      if (i.coluna === 'ESCALADO') p.escalados++;
      if (i.dias > p.maior) p.maior = i.dias;
    });
  });
  return Object.keys(pessoas).map(function (k) { var p = pessoas[k]; p.total = p.atividades + p.decisoes; return p; })
    .sort(function (a, b) { return b.total - a.total || b.escalados - a.escalados || b.maior - a.maior || a.nome.localeCompare(b.nome, 'pt-BR'); });
}

// ------------------------------------------------------------
// HTML A4
// ------------------------------------------------------------
function RelDia_secao_(id, titulo, conteudo) {
  return '<section class="secao" id="' + id + '"><h2 data-rela4-sec>' + RelDia_esc_(titulo) + '</h2>' + (conteudo || '') + '</section>';
}
function RelDia_p_(t) { return '<p class="rd-p">' + RelDia_esc_(t) + '</p>'; }
function RelDia_kpis_(l) {
  if (typeof RelA4_kpis_ === 'function') return RelA4_kpis_(l);
  return '<div class="kpis">' + l.map(function (k) { return '<div class="kpi ' + (k[2] || '') + '"><span class="v">' + RelDia_esc_(k[0]) + '</span><span class="r">' + RelDia_esc_(k[1]) + '</span></div>'; }).join('') + '</div>';
}
function RelDia_tabela_(colunas, linhas, opts) {
  if (typeof RelA4_tabela_ === 'function') return RelA4_tabela_(colunas, linhas, opts);
  opts = opts || {};
  if (!linhas.length) return '<p class="nota">' + RelDia_esc_(opts.vazio || 'Nada.') + '</p>';
  var cel = function (v) { return v && typeof v === 'object' && v.html !== undefined ? v.html : RelDia_esc_(v); };
  return '<table class="t"><thead><tr>' + colunas.map(function (c) { return '<th>' + RelDia_esc_(c.t) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    linhas.map(function (l) { return '<tr>' + l.map(function (v) { return '<td>' + cel(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
}
function RelDia_figura_(svg, titulo, legenda) {
  if (typeof RelA4_figura_ === 'function') return RelA4_figura_(svg, titulo, legenda);
  return '<figure class="grafico">' + svg + '<figcaption>' + RelDia_esc_(titulo) + '</figcaption></figure>';
}
function RelDia_txt_(x, y, t, extra) { return '<text x="' + Number(x).toFixed(1) + '" y="' + Number(y).toFixed(1) + '" font-family="Arial,Helvetica,sans-serif" ' + (extra || '') + '>' + RelDia_esc_(t) + '</text>'; }

/** Barras horizontais empilhadas (parado / aguardando / em andamento) por setor, em SVG puro. */
function RelDia_svgSetores_(n) {
  var linhas = RELDIA_SETORES.map(function (s) { var x = n.porSetor[s.k]; return x ? { nome: s.nome, p: x.parados, a: x.aguardando, e: x.andamento, t: x.abertos } : null; }).filter(Boolean);
  if (!linhas.length) return '<p class="nota">Nenhuma pendência aberta hoje.</p>';
  var cores = ['#a61b1b', '#1f5fa8', '#0f8b8d'], W = 660, esq = 190, dir = 40, hb = 14, gap = 6, H = 10 + linhas.length * (hb + gap);
  var max = Math.max.apply(null, linhas.map(function (l) { return l.t; }).concat([1])), larg = W - esq - dir;
  var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img" aria-label="Pendências abertas por setor">'];
  linhas.forEach(function (l, k) {
    var y = 5 + k * (hb + gap), x = esq;
    s.push(RelDia_txt_(esq - 6, y + hb / 2 + 3.5, RelDia_corta_(l.nome, 34), 'font-size="9.5" fill="#1f2933" text-anchor="end"'));
    [l.p, l.a, l.e].forEach(function (v, j) { var w = v / max * larg; if (w > 0) { s.push('<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + hb + '" fill="' + cores[j] + '"/>'); x += w; } });
    s.push(RelDia_txt_(x + 5, y + hb / 2 + 3.5, String(l.t), 'font-size="9.5" fill="#1f2933"'));
  });
  s.push('</svg>');
  return RelDia_figura_(s.join(''), 'Pendências abertas por setor (atrasado ou escalado, aguardando, em andamento)', [{ cor: cores[0], rotulo: 'Atrasado ou escalado' }, { cor: cores[1], rotulo: 'Aguardando' }, { cor: cores[2], rotulo: 'Em andamento' }]);
}

/** Linha da evolução das decisões abertas (últimos 30 dias), em SVG puro. */
function RelDia_svgEvolucao_(ev) {
  if (!ev || ev.length < 2) return '<p class="nota">A evolução dos últimos 30 dias aparece quando houver pelo menos dois dias de registro na Caixa de decisões.</p>';
  var W = 660, H = 190, esq = 36, dir = 12, topo = 14, base = 26, alt = H - topo - base, larg = W - esq - dir;
  var max = Math.max.apply(null, ev.map(function (e) { return e.abertos; }).concat([1]));
  var x = function (k) { return esq + (ev.length === 1 ? larg / 2 : k / (ev.length - 1) * larg); }, y = function (v) { return topo + alt - v / max * alt; };
  var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img" aria-label="Decisões abertas nos últimos 30 dias">'];
  [0, Math.round(max / 2), max].forEach(function (v) {
    s.push('<line x1="' + esq + '" y1="' + y(v).toFixed(1) + '" x2="' + (W - dir) + '" y2="' + y(v).toFixed(1) + '" stroke="#e7ebef" stroke-width="0.7"/>');
    s.push(RelDia_txt_(esq - 5, y(v) + 3, String(v), 'font-size="8.5" fill="#52606d" text-anchor="end"'));
  });
  s.push('<polyline fill="none" stroke="#1f5fa8" stroke-width="1.8" points="' + ev.map(function (e, k) { return x(k).toFixed(1) + ',' + y(e.abertos).toFixed(1); }).join(' ') + '"/>');
  ev.forEach(function (e, k) {
    s.push('<circle cx="' + x(k).toFixed(1) + '" cy="' + y(e.abertos).toFixed(1) + '" r="2" fill="#1f5fa8"/>');
    if (k % 5 === 0 || k === ev.length - 1) s.push(RelDia_txt_(x(k), H - base + 14, RelDia_brDia_(e.dia).slice(0, 5), 'font-size="8.5" fill="#1f2933" text-anchor="middle"'));
  });
  s.push('</svg>');
  return RelDia_figura_(s.join(''), 'Decisões abertas na Caixa ao fim de cada dia (últimos 30 dias)');
}

/** Barras horizontais simples (ranking). */
function RelDia_svgBarras_(l, titulo, cor) {
  if (!l.length) return '';
  if (typeof RelA4_barras_ === 'function') return RelA4_barras_(l.map(function (x) { return { rotulo: x.rotulo, valor: x.valor }; }), { titulo: titulo, cor: cor });
  return '';
}

function RelDia_kanban_(d) {
  var col = {};
  RELDIA_COLUNAS.forEach(function (c) { col[c.k] = []; });
  d.itens.forEach(function (i) { if (col[i.coluna]) col[i.coluna].push(i); });
  Object.keys(col).forEach(function (k) { col[k].sort(function (a, b) { return b.dias - a.dias || a.titulo.localeCompare(b.titulo, 'pt-BR'); }); });
  var cab = RELDIA_COLUNAS.map(function (c) { return '<th style="border-top:2.2pt solid ' + c.cor + '">' + RelDia_esc_(c.nome) + ' <span class="rd-n">(' + col[c.k].length + ')</span></th>'; }).join('');
  var corpo = RELDIA_COLUNAS.map(function (c) {
    var l = col[c.k];
    return '<td>' + (l.length ? l.slice(0, RELDIA_MAX_KANBAN).map(function (i) {
      return '<div class="rd-card" style="border-left-color:' + c.cor + '"><b>' + RelDia_esc_(RelDia_corta_(i.titulo, 90)) + '</b><span>' + RelDia_esc_(RelDia_setor_(i.setor).nome) + '</span><span>Com: ' +
        RelDia_esc_(RelDia_corta_(i.com, 50)) + '</span>' + (i.diasTxt ? '<span>' + RelDia_esc_(i.diasTxt) + '</span>' : '') + '</div>';
    }).join('') + (l.length > RELDIA_MAX_KANBAN ? '<div class="rd-mais">e mais ' + (l.length - RELDIA_MAX_KANBAN) + ' (veja as seções por setor)</div>' : '') : '<div class="rd-vazio">nenhum</div>') + '</td>';
  }).join('');
  return '<div class="rd-kanban-rolagem"><table class="rd-kanban"><thead><tr>' + cab + '</tr></thead><tbody><tr>' + corpo + '</tr></tbody></table></div>';
}

var RELDIA_CSS = '.reldia-css{display:none}.rd-p{text-align:justify;margin:0 0 2.4mm}.rd-indice ol{margin:0 0 0 5mm;padding:0}.rd-indice li{margin:.6mm 0}.rd-indice a{color:#0b3d6e;text-decoration:none}' +
  '.rd-indice a:hover{text-decoration:underline}.rd-indice ol ol{margin-left:5mm;font-size:9pt}' +
  '.rd-kanban-rolagem{max-width:100%}.rd-kanban{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:1.2mm 0;font-size:7.4pt}' +
  '.rd-kanban th{background:#f3f5f7;padding:1.4mm 1mm;text-align:left;font-size:7.6pt;vertical-align:top;word-wrap:break-word}.rd-kanban td{vertical-align:top;padding:0;word-wrap:break-word;overflow-wrap:anywhere}' +
  '.rd-card{border:.5pt solid #cfd6dd;border-left:2pt solid #1f5fa8;padding:1mm 1.2mm;margin:1mm 0;background:#fff;break-inside:avoid;page-break-inside:avoid}' +
  '.rd-card b{display:block;font-size:7.4pt;line-height:1.25}.rd-card span{display:block;color:#52606d;font-size:6.8pt;line-height:1.25}.rd-n{font-weight:400;color:#52606d}' +
  '.rd-mais,.rd-vazio{color:#7b8794;font-size:6.8pt;padding:1mm}.reldia table.t td,.reldia table.t th{word-wrap:break-word;overflow-wrap:anywhere}.reldia table.t{table-layout:fixed;width:100%}' +
  '.reldia svg{max-width:100%;height:auto}.reldia a{color:#0b3d6e}.reldia{max-width:100%;overflow-wrap:anywhere}';

/**
 * Relatório diário da empresa (HTML A4 completo). d = RelDia_dados_(). opcoes: { emitidoPor }.
 * Devolve { html, nome, numeros }.
 */
function RelDia_html_(d, opcoes) {
  opcoes = opcoes || {};
  var n = RelDia_numeros_(d), rank = RelDia_ranking_(d), c = [];
  var setoresCom = RELDIA_SETORES.filter(function (s) { return n.porSetor[s.k] || d.itens.some(function (i) { return i.setor === s.k; }) || (s.k === 'comercial' && d.comercial) || (s.k === 'viagem' && d.viagem && d.viagem.total); });
  var linkCaixa = typeof Ges_linkTela_ === 'function' ? Ges_linkTela_('gestao_decisoes') : '';
  // índice clicável
  c.push('<style>' + RELDIA_CSS + '</style><div class="reldia">');
  // o índice não leva número (a numeração das seções começa na Visão geral, igual à lista)
  c.push('<section class="secao" id="rd-indice"><h2>Índice</h2>' + '<nav class="rd-indice" aria-label="Índice do relatório"><ol>' +
    '<li><a href="#rd-visao">Visão geral do dia</a></li><li><a href="#rd-kanban">Kanban da empresa</a></li>' +
    '<li><a href="#rd-setores">Por setor</a><ol>' + setoresCom.map(function (s) { return '<li><a href="#rd-s-' + s.k + '">' + RelDia_esc_(s.nome) + '</a></li>'; }).join('') + '</ol></li>' +
    '<li><a href="#rd-ranking">Ranking de atrasos por pessoa e por setor</a></li><li><a href="#rd-diretoria">Com a Diretoria</a></li>' +
    '<li><a href="#rd-irreversiveis">Atos irreversíveis do dia</a></li><li><a href="#rd-conduta">Programa de conduta (só números)</a></li><li><a href="#rd-como">Como ler e de onde vêm os dados</a></li></ol></nav></section>');
  // visão geral
  c.push(RelDia_secao_('rd-visao', 'Visão geral do dia',
    RelDia_kpis_([[String(n.abertos), 'Pendências abertas', n.abertos ? '' : 'ok'], [String(n.atrasados), 'Atrasadas', n.atrasados ? 'aviso' : 'ok'], [String(n.escalados), 'Escaladas à Diretoria', n.escalados ? 'critico' : 'ok'],
      [String(n.diretoria), 'Decisões com a Diretoria', n.diretoria ? 'aviso' : 'ok'], [String(n.atividadesAtrasadas), 'Atividades da equipe atrasadas', n.atividadesAtrasadas ? 'aviso' : 'ok'],
      [String(n.irreversiveis), 'Atos irreversíveis hoje'], [String(n.resolvidos), 'Resolvidos hoje', 'ok'], [String(rank.length), 'Pessoas com atraso', rank.length ? 'aviso' : 'ok']]) +
    RelDia_p_('Retrato de ' + d.hojeBr + ', gerado em ' + d.geradoEm + '. Há ' + RelDia_pl_(n.abertos, 'pendência aberta', 'pendências abertas') + ' na empresa: ' + RelDia_pl_(n.atrasados, 'atrasada', 'atrasadas') + ' e ' +
      RelDia_pl_(n.escalados, 'escalada', 'escaladas') + ' à Diretoria. ' + RelDia_pl_(rank.length, 'pessoa tem', 'pessoas têm') + ' algo atrasado (ranking na seção própria). Hoje ' + RelDia_pl_(n.resolvidos, 'item foi resolvido', 'itens foram resolvidos') + '.') +
    RelDia_svgSetores_(n) + RelDia_svgEvolucao_(d.evolucao) +
    (d.avisos.length ? '<div class="caixa aviso"><p>Não foi possível ler agora: ' + RelDia_esc_(d.avisos.join(', ')) + '. Os itens dessas fontes podem estar faltando; gere o relatório de novo daqui a pouco.</p></div>' : '')));
  // Kanban
  c.push(RelDia_secao_('rd-kanban', 'Kanban da empresa', RelDia_p_('Cada cartão é um item aberto (ou resolvido hoje), com o setor, com quem está e há quantos dias. Em cada coluna, os mais antigos primeiro; até ' + RELDIA_MAX_KANBAN + ' cartões por coluna, o resto está nas seções por setor.') + RelDia_kanban_(d)));
  // setores
  var nomeCol = {}; RELDIA_COLUNAS.forEach(function (k) { nomeCol[k.k] = k.nome; });
  var setoresHtml = setoresCom.map(function (s) {
    var l = d.itens.filter(function (i) { return i.setor === s.k && i.coluna !== 'RESOLVIDO'; }).sort(function (a, b) {
      var o = { ESCALADO: 0, ATRASADO: 1, AGUARDANDO: 2, ANDAMENTO: 3 }; return (o[a.coluna] - o[b.coluna]) || b.dias - a.dias;
    });
    var res = d.itens.filter(function (i) { return i.setor === s.k && i.coluna === 'RESOLVIDO'; }).length;
    var x = { abertos: l.length, parados: l.filter(function (i) { return i.coluna === 'ATRASADO' || i.coluna === 'ESCALADO'; }).length };
    var h = '<h3 data-rela4-sub id="rd-s-' + s.k + '">' + RelDia_esc_(s.nome) + '</h3>' +
      RelDia_p_(s.nome + ': ' + RelDia_pl_(x.abertos, 'item aberto', 'itens abertos') + ', ' + RelDia_pl_(x.parados, 'atrasado ou escalado', 'atrasados ou escalados') + '; ' + RelDia_pl_(res, 'resolvido hoje', 'resolvidos hoje') + '.') +
      RelDia_tabela_([{ t: 'Item', w: '28%' }, { t: 'Com quem está', w: '15%' }, { t: 'Situação', w: '10%' }, { t: 'Há quanto tempo', w: '12%' }, { t: 'Prazo', w: '13%' }, { t: 'O que fazer', w: '22%' }],
        l.slice(0, RELDIA_MAX_SETOR).map(function (i) {
          return [{ html: (i.link ? '<a href="' + RelDia_esc_(i.link) + '">' + RelDia_esc_(RelDia_corta_(i.titulo, 140)) + '</a>' : RelDia_esc_(RelDia_corta_(i.titulo, 140))) + '<br><span class="nota">' + RelDia_esc_(i.moduloNome) + '</span>' },
            i.com, nomeCol[i.coluna] || i.coluna, i.diasTxt || '', { html: RelDia_esc_(i.prazo || '—') }, RelDia_corta_(i.oQueFazer, 160)];   // prazo como html: a tabela A4 não força uma linha só (cabe na coluna)
        }), { compacta: true, vazio: 'Nada aberto neste setor hoje.' }) +
      (l.length > RELDIA_MAX_SETOR ? '<p class="nota">E mais ' + (l.length - RELDIA_MAX_SETOR) + ' itens neste setor (veja na Caixa de decisões e na central de pendências).</p>' : '');
    if (s.k === 'comercial' && d.comercial) {
      var cm = d.comercial, moeda = function (v) { return typeof RelA4_moeda_ === 'function' ? RelA4_moeda_(v) : 'R$ ' + v; };
      h += RelDia_kpis_([[String(cm.abertas), 'Oportunidades abertas'], [moeda(cm.valorAberto), 'Valor em aberto'], [String(cm.enviadas), 'Propostas enviadas no mês'], [String(cm.vencidas), 'Propostas vencidas no mês', cm.vencidas ? 'aviso' : 'ok'],
        [String(cm.semPassagem), 'Aprovadas sem passagem aos setores', cm.semPassagem ? 'aviso' : 'ok'], [cm.conversao, 'Conversão do mês']]) +
        RelDia_tabela_([{ t: 'Vendedor' }, { t: 'Abertas', num: true }, { t: 'Sem próxima ação', num: true }, { t: 'Paradas', num: true }, { t: 'Ganhas no mês', num: true }],
          cm.vendedores.map(function (v) { return [v.nome, String(v.abertas), String(v.semProxima), String(v.paradas), String(v.ganhas)]; }), { compacta: true, legenda: 'Comercial: o que cobrar de cada vendedor (indicadores do mês)', vazio: 'Sem vendedores com oportunidades no mês.' });
    }
    if (s.k === 'viagem' && d.viagem && d.viagem.total) {
      h += RelDia_p_('Solicitações de depósito de viagem por situação: ' + Object.keys(d.viagem.porSituacao).map(function (k) { return k + ' ' + d.viagem.porSituacao[k]; }).join('; ') + '.') +
        RelDia_tabela_([{ t: 'Solicitação' }, { t: 'Quem pediu' }, { t: 'Destino' }, { t: 'Prazo da prestação' }, { t: 'Dias de atraso', num: true }],
          d.viagem.vencidas.map(function (v) { return [v.numero, v.solicitante, v.destino, v.prazo, String(v.dias || 0)]; }), { compacta: true, legenda: 'Prestações de contas de viagem vencidas', vazio: 'Nenhuma prestação de contas vencida.' });
    }
    return h;
  }).join('');
  c.push(RelDia_secao_('rd-setores', 'Por setor', RelDia_p_('Uma subseção por setor, com o que está parado, com quem está, há quanto tempo, o prazo e o que fazer. O título do item abre a tela no SGO+ (com login).') + setoresHtml));
  // ranking
  c.push(RelDia_secao_('rd-ranking', 'Ranking de atrasos por pessoa e por setor',
    RelDia_p_('Pessoas com atividade atrasada ou decisão parada (prazo vencido ou escalada), da maior quantidade para a menor. A Diretoria não entra: ela é informada, não cobrada.') +
    RelDia_svgBarras_(rank.slice(0, 15).map(function (p) { return { rotulo: p.nome, valor: p.total }; }), 'Itens atrasados por pessoa (até 15)', '#b45309') +
    RelDia_tabela_([{ t: 'Pessoa' }, { t: 'Área' }, { t: 'Atividades atrasadas', num: true }, { t: 'Decisões paradas', num: true }, { t: 'Escaladas', num: true }, { t: 'Maior atraso (dias)', num: true }],
      rank.map(function (p) { return [p.nome, p.area || '', String(p.atividades), String(p.decisoes), String(p.escalados), String(p.maior)]; }), { compacta: true, vazio: 'Ninguém com atraso hoje.', legenda: 'Ranking de atrasos por pessoa' }) +
    RelDia_svgBarras_(RELDIA_SETORES.filter(function (s) { return n.porSetor[s.k] && n.porSetor[s.k].parados; }).map(function (s) { return { rotulo: s.nome, valor: n.porSetor[s.k].parados }; }), 'Itens atrasados ou escalados por setor', '#a61b1b')));
  // com a Diretoria
  var dir = d.itens.filter(function (i) { return i.diretoria && i.coluna !== 'RESOLVIDO'; });
  c.push(RelDia_secao_('rd-diretoria', 'Com a Diretoria',
    RelDia_p_('Itens em que a Diretoria aparece como responsável (área sem gestor, área Diretoria ou atividade própria). É informação: o que só a Diretoria decide chega na hora por e-mail e WhatsApp; o resto pode ser decidido quando quiser.') +
    RelDia_tabela_([{ t: 'Item' }, { t: 'Setor' }, { t: 'Situação' }, { t: 'Há quanto tempo' }, { t: 'Prazo' }],
      dir.map(function (i) { return [{ html: i.link ? '<a href="' + RelDia_esc_(i.link) + '">' + RelDia_esc_(RelDia_corta_(i.titulo, 140)) + '</a>' : RelDia_esc_(RelDia_corta_(i.titulo, 140)) }, RelDia_setor_(i.setor).nome, nomeCol[i.coluna] || '', i.diasTxt || '', { html: RelDia_esc_(i.prazo || '—') }]; }),
      { compacta: true, vazio: 'Nada com a Diretoria hoje.' })));
  // irreversíveis
  c.push(RelDia_secao_('rd-irreversiveis', 'Atos irreversíveis do dia', RelDia_tabela_([{ t: 'Hora', w: '12%' }, { t: 'Ato', w: '38%' }, { t: 'Detalhe', w: '50%' }],
    d.irreversiveis.map(function (x) { return [x.hora, x.titulo, x.texto]; }), { compacta: true, vazio: 'Nenhum ato irreversível registrado hoje.' })));
  // 16/11/2026: Financeiro (sigiloso), só números
  if (d.financeiro && d.financeiro.abertos) c.push(RelDia_secao_('rd-financeiro', 'Financeiro (só números)', RelDia_kpis_([[String(d.financeiro.abertos), 'Itens abertos do Financeiro'], [String(d.financeiro.atrasados), 'Atrasados', d.financeiro.atrasados ? 'aviso' : 'ok']]) +
    RelDia_p_('O Financeiro é sigiloso: o relatório mostra só a contagem, sem compras, valores, nomes nem viagens. O detalhe fica no próprio Financeiro, para a lista de sigilo.')));
  // conduta
  c.push(RelDia_secao_('rd-conduta', 'Programa de conduta (só números)', RelDia_kpis_([[String(d.conduta.abertos), 'Itens abertos (Programa de conduta e Qualidade)'], [String(d.conduta.atrasados), 'Atrasados', d.conduta.atrasados ? 'aviso' : 'ok']]) +
    RelDia_p_('Por sigilo, o relatório mostra só a contagem agregada, sem nomes nem detalhes. O detalhe fica no Programa de conduta e na Caixa de decisões, para quem tem acesso.')));
  // como ler
  c.push(RelDia_secao_('rd-como', 'Como ler e de onde vêm os dados', RelDia_p_('Fontes: Caixa de decisões (itens, responsáveis por área, dias úteis parados, prazo de decisão e escalada), central de pendências no contexto da Diretoria (todos os módulos), Minhas atividades (atrasadas pela previsão; escalada quando a prioridade passou do prazo do nível da Diretoria na SEDNA), Comercial (indicadores do mês), Depósito de viagem (prestações vencidas) e a fila dos avisos da gestão (atos irreversíveis). Situações: aguardando decisão, em andamento, atrasado (prazo vencido ou parado no prazo do WhatsApp), escalado (com a Diretoria pela escada da Caixa ou pela SEDNA) e resolvido hoje. Nenhum dado é alterado ao gerar o relatório.') +
    (linkCaixa ? RelDia_p_('Caixa de decisões: ' + linkCaixa) : '')));
  c.push('</div>');
  var corpo = c.join('\n'), titulo = 'Relatório diário da empresa', nome = 'Relatorio diario da empresa ' + d.dia;
  var html;
  if (typeof RelA4_documento_ === 'function') {
    html = RelA4_documento_({ titulo: titulo, subtitulo: 'Todos os setores: o que está parado, com quem e há quanto tempo', tituloCurto: titulo, sigla: 'GES-DIA', identificacao: d.hojeBr, rotuloIdentificacao: 'Dia',
      emitidoPor: opcoes.emitidoPor || 'Rotina automática (resumo diário da Diretoria)', corpo: corpo, tituloArquivo: titulo, capa: true, sumario: false, ficha: [['Uso', 'Diretoria (sigilo dos nomes do Programa de conduta)']] });
  } else {
    html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + RelDia_esc_(titulo) + '</title>' +
      '<style>@page{size:A4;margin:18mm 15mm}body{font:10pt Arial,sans-serif;color:#1f2933;max-width:180mm;margin:0 auto;text-align:justify}h2{color:#0b3d6e}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm}</style></head><body><h1>' +
      RelDia_esc_(titulo) + ' — ' + RelDia_esc_(d.hojeBr) + '</h1>' + corpo + '</body></html>';
  }
  return { html: html, nome: nome, numeros: n, ranking: rank };
}

// ------------------------------------------------------------
// TELA (Gestão > Relatório diário da empresa)
// ------------------------------------------------------------
/** google.script.run: Gestao_apiRelatorioDiario(sessionId, {}) -> { html, nome, geradoEm, numeros }. Só quem tem a caixa. */
function Gestao_apiRelatorioDiario(sessionId, payload) {
  return Ges_resposta_('gerar o relatório diário da empresa', function () {
    var s = exigirSessao(sessionId);
    if (!RelDia_podeSessao_(s)) throw new Error('o relatório diário da empresa é da Diretoria (e de quem o responsável pelo sistema liberar na caixa «Ver o relatório diário da empresa», em Administração > Acessos). Peça a liberação, se precisar');
    var d = RelDia_dados_(new Date()), r = RelDia_html_(d, { emitidoPor: Ges_s_(s.nome) || Ges_s_(s.usuario) });
    try { SGO_DATA.log('GESTAO_RELATORIO_DIA', s.usuario, 'Relatório diário da empresa gerado (' + d.dia + ')', 'GESTAO'); } catch (e) {}
    return { html: r.html, nome: r.nome, geradoEm: d.geradoEm, numeros: r.numeros };
  });
}

// ------------------------------------------------------------
// RESUMO DIÁRIO DA DIRETORIA (GS07)
// ------------------------------------------------------------
/** Linha do item no e-mail. */
function RelDia_linhaEmail_(i) {
  return '- ' + RelDia_corta_(i.titulo, 160) + '. Com: ' + i.com + '.' + (i.diasTxt ? ' ' + i.diasTxt.charAt(0).toUpperCase() + i.diasTxt.slice(1) + '.' : '') + (i.prazo ? ' Prazo: ' + i.prazo + '.' : '') + (i.link ? '\n  Abrir: ' + i.link : '');
}

/** Mensagem de uma pessoa da Diretoria: { titulo, texto (e-mail), whats (lista curta), tela (texto curto), qtd, ids, vazio }. */
function RelDia_mensagem_(d, u, n) {
  var primeiro = typeof Notificar_primeiroNome_ === 'function' ? Notificar_primeiroNome_(u.nome) : u.nome;
  var link = typeof Ges_linkTela_ === 'function' ? Ges_linkTela_(RELDIA_TELA) : '', linkCaixa = typeof Ges_linkTela_ === 'function' ? Ges_linkTela_('gestao_decisoes') : '';
  var parados = d.itens.filter(function (i) { return (i.coluna === 'ATRASADO' || i.coluna === 'ESCALADO') && !i.atividade && !i.diretoria; });
  var atvEq = d.itens.filter(function (i) { return i.atividade && i.vencida && !i.diretoria; });
  var comDir = d.itens.filter(function (i) { return i.diretoria && !i.atividade && i.coluna !== 'RESOLVIDO'; });
  var minhas = d.itens.filter(function (i) { return i.atividade && i.vencida && (i.comIds || []).indexOf(u.id) >= 0; });
  var linhas = [], usadas = 0;
  var bloco = function (titulo, lista, porSetor) {
    if (!lista.length) return;
    linhas.push(titulo);
    if (porSetor) {
      RELDIA_SETORES.forEach(function (s) {
        var l = lista.filter(function (i) { return i.setor === s.k; }).sort(function (a, b) { return b.dias - a.dias; });
        if (!l.length) return;
        linhas.push(s.nome + ' (' + l.length + ')');
        l.forEach(function (i) { if (usadas < RELDIA_MAX_EMAIL) { linhas.push(RelDia_linhaEmail_(i)); usadas++; } });
      });
    } else lista.forEach(function (i) { if (usadas < RELDIA_MAX_EMAIL) { linhas.push(RelDia_linhaEmail_(i)); usadas++; } });
    linhas.push('');
  };
  bloco('O QUE ESTÁ PARADO NA EMPRESA, POR SETOR (prazo vencido ou escalado)', parados, true);
  bloco('ATIVIDADES DA EQUIPE ATRASADAS', atvEq, true);
  bloco('COM A DIRETORIA (para decidir quando quiser)', comDir, false);
  bloco('SUAS ATIVIDADES COM A PREVISÃO VENCIDA (lembrete, sem justificativa)', minhas, false);
  var total = parados.length + atvEq.length + comDir.length + minhas.length;
  if (total > usadas) linhas.push('E mais ' + (total - usadas) + ' no relatório diário da empresa.');
  var texto = 'Bom dia, ' + primeiro + '.\n\nResumo do dia da empresa no SGO+ (' + d.hojeBr + '), para conhecimento. Não há nada a justificar: é o retrato do que está parado e com quem, para a Diretoria acompanhar e cobrar quando quiser.\n\n' +
    'NÚMEROS DO DIA\n- Pendências abertas: ' + n.abertos + ' (atrasadas: ' + n.atrasados + '; escaladas à Diretoria: ' + n.escalados + ').\n- Decisões com a Diretoria: ' + n.diretoria + '.\n- Atividades da equipe atrasadas: ' + n.atividadesAtrasadas +
    '.\n- Atos irreversíveis registrados hoje: ' + n.irreversiveis + '.\n- Resolvidos hoje: ' + n.resolvidos + '.\n\n' + linhas.join('\n').replace(/\n+$/, '') + (linhas.length ? '\n\n' : '') +
    'Relatório diário da empresa (A4, com índice, Kanban, gráficos, uma seção por setor e o ranking de atrasos por pessoa): ' + (link || 'Gestão > Relatório diário da empresa, no SGO+') +
    (linkCaixa ? '\nCaixa de decisões: ' + linkCaixa : '') + '\n\nO que só a Diretoria decide (aprovações e atos irreversíveis) continua chegando na hora.';
  var porSetor = RELDIA_SETORES.map(function (s) { var x = n.porSetor[s.k]; return x && x.parados ? s.nome.split(' ')[0] + ' ' + x.parados : ''; }).filter(Boolean);
  var whats = RelDia_corta_((n.atrasados + n.escalados) + ' itens parados' + (porSetor.length ? ' (' + porSetor.join(', ') + ')' : '') + '; ' + n.atividadesAtrasadas + ' atividades da equipe atrasadas; ' + n.diretoria + ' com a Diretoria' +
    (minhas.length ? '; ' + minhas.length + ' atividade(s) sua(s) com a previsão vencida' : '') + '. Relatório completo no link.', RELDIA_WA_MAX);
  var tela = 'Hoje: ' + n.abertos + ' pendências abertas, ' + (n.atrasados + n.escalados) + ' paradas, ' + n.atividadesAtrasadas + ' atividades da equipe atrasadas, ' + n.diretoria + ' com a Diretoria' +
    (minhas.length ? ' e ' + minhas.length + ' atividade(s) sua(s) com a previsão vencida (lembrete)' : '') + '. Detalhe em Gestão > Relatório diário da empresa.';
  return { titulo: 'Resumo do dia da empresa (' + d.hojeBr.slice(0, 5) + '): ' + (n.atrasados + n.escalados) + ' itens parados', texto: texto, whats: whats, tela: tela, link: link,
    qtd: total, ids: parados.concat(atvEq).concat(comDir).map(function (i) { return i.id; }), vazio: !n.abertos && !minhas.length };
}

/** WhatsApp do resumo (modelo de utilidade da gestão). Nunca lança. { situacao, motivo }. */
function RelDia_whats_(u, m, refId) {
  try {
    var c = typeof Notificar_contatos_ === 'function' ? Notificar_contatos_([u.id])[u.id] : null;
    var prov = typeof Notificar_provedorWhatsapp_ === 'function' ? Notificar_provedorWhatsapp_() : { provedor: '' };
    var mw = typeof AvG_modeloWhats_ === 'function' ? AvG_modeloWhats_() : { nome: 'sgo_gestao_acao', situacao: '' };
    if (!c || !c.telefone) return { situacao: 'SEM_NUMERO', motivo: 'Sem celular no cadastro: o resumo foi por e-mail e está na tela.' };
    if (!prov.provedor) return { situacao: 'FALHOU', motivo: RelDia_corta_(prov.motivo || 'WhatsApp não configurado.', 200) };
    if (prov.provedor === 'meta' && mw.situacao !== 'APPROVED') return { situacao: 'AGUARDANDO_MODELO', motivo: 'WhatsApp aguardando modelo (' + mw.nome + ', situação ' + (mw.situacao || 'não cadastrado') + '): o resumo foi por e-mail.' };
    var util = typeof AVG_MODELO_UTIL !== 'undefined' && mw.nome === AVG_MODELO_UTIL;
    var params = util ? ['@NOME', 'resumo do dia da empresa, para conhecimento', m.whats, m.link || '@LINK'] : ['@NOME', 'o resumo do dia da empresa', m.whats, m.link || '@LINK'];
    var r = SGO_notificar_({ usuarios: [u.id], canais: ['whatsapp'], origem: 'AVISOS_GESTAO', evento: 'GS07', refId: refId, titulo: m.titulo, texto: m.tela, link: m.link || undefined,
      modeloSemReserva: true, modelo: { nome: mw.nome, parametros: params } }) || {};
    if (r.ok) return { situacao: 'ENVIADO', motivo: 'WhatsApp aceito pelo provedor (modelo ' + mw.nome + (typeof AvG_mascarar_ === 'function' ? ', celular ' + AvG_mascarar_(c.telefone) : '') + ').' };
    return { situacao: 'FALHOU', motivo: RelDia_corta_(String(r.motivo || 'O WhatsApp não saiu.').replace(/\d{8,}/g, '***'), 200) };
  } catch (e) { return { situacao: 'FALHOU', motivo: RelDia_corta_(String((e && e.message) || e).replace(/\d{8,}/g, '***'), 200) }; }
}

/**
 * Passo da rodada da gestão (Ges_rodada_), já no expediente. ex = SGO_dentroDoExpediente_. Uma vez por dia útil, a partir da hora
 * das regras da Caixa (padrão 08:30), para cada pessoa da Diretoria que ainda não recebeu hoje. Devolve o que fez.
 */
function SGO_resumoDiretoriaRodada_(ex, quando) {
  var cfg = Ges_cfg_(), dr = cfg.diretoriaResumo || { ligado: true, hora: '08:30' };
  if (dr.ligado === false) return { fora: 'resumo diário da Diretoria desligado em Regras e responsáveis' };
  ex = ex || (typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(quando || new Date()) : { dentro: true, hora: '09:00', dia: Ges_hoje_() });
  if (!ex.dentro) return { fora: ex.motivo || 'fora do expediente' };
  if (ex.hora < dr.hora) return { fora: 'antes da hora do resumo da Diretoria (' + dr.hora + ')' };
  var us = Ges_usuarios_(), dia = ex.dia, envios = Ges_envios_();
  var ids = Ges_diretoria_(us, []).filter(function (id) { return us[id] && us[id].ativo && !Ges_jaEnviado_(envios, RELDIA_ENVIO, id, dia); });
  if (!ids.length) return { feito: true };
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('RELDIA_EM_CURSO')) return { fora: 'outra rodada do resumo da Diretoria em andamento' }; cache.put('RELDIA_EM_CURSO', '1', 300); } catch (e) { cache = null; }
  var res = { pessoas: 0, enviados: 0, semNovidade: 0 };
  try {
    var d = RelDia_dados_(quando), n = RelDia_numeros_(d);
    ids.forEach(function (uid) {
      var u = us[uid], m = RelDia_mensagem_(d, u, n);
      res.pessoas++;
      if (m.vazio) { Ges_registrarEnvio_({ tipo: RELDIA_ENVIO, uid: uid, nome: u.nome, dia: dia, qtd: 0, situacao: 'SEM_NOVIDADE', motivo: 'nada aberto na empresa hoje' }); res.semNovidade++; return; }
      var refId = ('RESDIR-' + dia + '-' + uid).slice(0, 80), em = { situacao: 'FALHOU', motivo: '' };
      try {
        var r = SGO_notificar_({ usuarios: [uid], canais: ['email'], origem: 'AVISOS_GESTAO', evento: 'GS07', refId: refId, titulo: m.titulo, texto: m.texto, link: m.link || undefined, rotuloLink: 'Abrir o relatório diário da empresa' }) || {};
        em = r.ok ? { situacao: 'ENVIADO', motivo: 'E-mail entregue ao serviço de e-mail.' } : { situacao: 'FALHOU', motivo: RelDia_corta_(r.motivo || 'O e-mail não saiu.', 200) };
      } catch (eE) { em = { situacao: 'FALHOU', motivo: RelDia_corta_((eE && eE.message) || eE, 200) }; }
      var wa = RelDia_whats_(u, m, refId);
      var chegou = em.situacao === 'ENVIADO' || wa.situacao === 'ENVIADO';
      if (chegou && typeof Atividades_avisar_ === 'function') {
        try { if (typeof Atividades_garantirAbas_ === 'function') Atividades_garantirAbas_(); Atividades_avisar_(uid, '', 'DIRETORIA', m.titulo, m.tela, {}); } catch (eT) {}
      }
      Ges_registrarEnvio_({ tipo: RELDIA_ENVIO, uid: uid, nome: u.nome, dia: dia, qtd: m.qtd, itens: m.ids.slice(0, 60).join(','), situacao: chegou ? 'OK' : 'ERRO', link: m.link,
        motivo: 'E-mail: ' + (em.motivo || em.situacao) + ' WhatsApp: ' + wa.motivo });
      if (chegou) res.enviados++;
    });
    try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (eP) {}
  } finally { try { if (cache) cache.remove('RELDIA_EM_CURSO'); } catch (e) {} }
  return res;
}
