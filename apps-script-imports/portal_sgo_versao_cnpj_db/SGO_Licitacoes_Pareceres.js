/****************************************************
 * SGO+ LICITAÇÕES — PARECERES POR ÁREA E ALÇADAS DE DECISÃO (03/11/2026)
 *
 * Pedido da missão (docs/LICITACOES_00_MISSAO_DIRETORIA_20261101.md): "Análise: Licitações (modalidade, prazos, exigências,
 * habilitação, riscos) → Técnico (capacidade) → Financeiro (custos, preço mínimo, margem) → IA consolida e aponta divergências →
 * Comercial analisa → Diretoria aprova ou rejeita por alçada. Registrar decisão e responsáveis." O dono ainda NÃO definiu alçadas nem
 * responsáveis por área: o PADRÃO mantém o comportamento de antes (a Diretoria decide sozinha, um diretor basta, nenhum parecer
 * obrigatório) e tudo fica configurável em Portais e configurações › Alçadas e pareceres (versão e motivo).
 * Manual: docs/MANUAL_MODULO_LICITACOES.md, seção "Pareceres por área e alçadas de decisão".
 *
 * PEDIDO DE PARECER (LIC_PARECER_PEDIDOS, uma linha por pedido; nada é apagado): a Diretoria escolhe a área (Licitações, Técnica,
 *   Financeira ou Comercial) e a pessoa. Quem é de cada área vem da lista configurada nas alçadas; sem lista, do cadastro de usuários
 *   (CAD_USUARIOS.AREA: Técnica = TECNICA, METROLOGIA e QUALIDADE; Financeira = FINANCEIRO; Comercial = COMERCIAL; Licitações = a
 *   Diretoria e o Administrador, Lic_responsaveis_). Um pedido aberto por área e oportunidade (sem duplicar). O pedido lança a
 *   atividade em Minhas atividades para a pessoa (Atividades_apiCriar, com a sessão de quem pediu), RESERVADA sob a trava e com a
 *   marca do pedido no texto: se a execução cair depois de criar, "Lançar a atividade de novo" acha a atividade pela marca e não
 *   repete. Prazo padrão: 1 dia útil antes do fim das propostas, às 18:00, nunca no passado. O pedido também vai pela fila de
 *   alertas de Licitações (tipo PARECER_PEDIDO: interno, e-mail e WhatsApp só pelo modelo aprovado sgo_licitacao_prazo, e só no
 *   expediente de 08:00 às 18:00 em dia útil; sem escalonamento para a Diretoria).
 * PARECER (LIC_PARECERES, uma linha por versão; a linha nunca muda depois de gravada, o hash prova): favorável, com ressalva ou
 *   contrário, com o motivo (pelo menos 20 letras) e a fotografia do que a pessoa viu (versão da análise, da simulação e da leitura).
 *   Parecer novo da mesma área é a versão seguinte e substitui o anterior, com o motivo da mudança. Quem pediu recebe o alerta
 *   PARECER_RECEBIDO e a atividade da pessoa é concluída.
 * PERMISSÃO: a pessoa da área vê SÓ a oportunidade do pedido dela e SÓ enquanto o pedido está aberto e a decisão não foi tomada
 *   (Radar ou Em análise); a tela não mostra custo, piso nem margem a quem não é da gestão de Licitações (Diretoria e Administrador).
 * CONSOLIDAÇÃO (aba Pareceres da ficha): o quadro dos pareceres que valem e as DIVERGÊNCIAS calculadas pelo código (sem IA nesta
 *   etapa): parecer contrário de qualquer área; pareceres opostos; Técnico favorável × capacidade técnica baixa na análise (ou
 *   contrário × alta); Financeiro contrário × simulação acima do piso (ou favorável × item abaixo do piso ou sem simulação); Licitações
 *   favorável × trava a confirmar ou exigência de habilitação pendente; Comercial favorável × nota baixa; parecer dado sobre versão
 *   antiga da análise ou da simulação.
 * ALÇADAS (LIC_CONFIG, chave ALCADAS, com versão e motivo): por faixa de valor (estimado, da simulação ou o maior dos dois), quantas
 *   aprovações distintas da Diretoria são necessárias para participar e quais pareceres são obrigatórios antes. "Aprovar a
 *   participação" (aba Pareceres, também pelo Kanban) exige a simulação de preço salva (o preço mínimo é o piso dela), confere os
 *   pareceres obrigatórios e grava a aprovação (LIC_APROVACOES, uma linha por pessoa, hash). Faltando aprovação, a aprovação fica
 *   registrada e a passagem para Decisão é recusada com o que falta; completa a alçada, a oportunidade vai para Decisão (participar),
 *   com os nomes de quem aprovou e os pareceres no histórico. Abrir a disputa direto de Radar ou Em análise confere a mesma alçada
 *   (quem abre conta como uma aprovação). Descartar (rejeitar) continua com um diretor.
 * Ações: Licitacoes_api(sessionId, 'pareceres', { op, ... }). "meus", "tela" e "registrar" são da pessoa do pedido; o resto, só da
 * Diretoria e do Administrador (o servidor confere em toda chamada). Nenhuma função devolve Date cru.
 ****************************************************/

var LICPAR_REGRAS = 'LIC-PARECER-2026-11-03.1';
var LICPAR_ABAS = { PEDIDOS: 'LIC_PARECER_PEDIDOS', PARECERES: 'LIC_PARECERES', APROVACOES: 'LIC_APROVACOES' };
var LICPAR_COLUNAS = {
  // UMA LINHA POR PEDIDO; a situação muda (ABERTO → RESPONDIDO ou CANCELADO), o que foi pedido não muda (o hash prova)
  LIC_PARECER_PEDIDOS: ['ID', 'OPORTUNIDADE_ID', 'CODIGO', 'AREA', 'USUARIO_ID', 'USUARIO_NOME', 'PERGUNTA', 'PRAZO_DIA', 'PRAZO_ISO', 'PRAZO_REGRA', 'SITUACAO',
    'ATIVIDADE_ID', 'ATIVIDADE_SITUACAO', 'ATIVIDADE_ERRO', 'ATIVIDADE_RESERVA_ATE', 'PEDIDO_POR_ID', 'PEDIDO_POR_NOME', 'PEDIDO_EM', 'RESPONDIDO_EM', 'PARECER_ID',
    'CANCELADO_EM', 'CANCELADO_POR_NOME', 'CANCELADO_MOTIVO', 'HASH', 'ATUALIZADO_EM'],
  // UMA LINHA POR VERSÃO DO PARECER DE UMA ÁREA; nunca muda depois de gravada
  LIC_PARECERES: ['ID', 'OPORTUNIDADE_ID', 'CODIGO', 'AREA', 'VERSAO', 'POSICAO', 'MOTIVO', 'MOTIVO_NOVA_VERSAO', 'PEDIDO_ID', 'SUBSTITUI_ID', 'USUARIO_ID', 'USUARIO_NOME',
    'USUARIO_PERFIL', 'BASE_JSON', 'REGRAS', 'EM', 'HASH'],
  // UMA LINHA POR APROVAÇÃO DE UMA PESSOA DA DIRETORIA; nunca muda depois de gravada
  LIC_APROVACOES: ['ID', 'OPORTUNIDADE_ID', 'CODIGO', 'TIPO', 'USUARIO_ID', 'USUARIO_NOME', 'MOTIVO', 'VALOR_BASE', 'VALOR_ORIGEM', 'FAIXA', 'APROVACOES_NECESSARIAS',
    'ALCADA_VERSAO', 'PARECERES_JSON', 'DIVERGENCIAS_JSON', 'EM', 'HASH',
    // revisão de e361160: a versão da simulação aprovada, as alçadas em vigor naquela aprovação (congeladas para a oportunidade) e a origem
    // (APROVACAO na aba Pareceres ou no Kanban; DISPUTA ou CONTRATO quando quem abre a disputa ou registra o contrato conta como aprovação)
    'SIMULACAO_VERSAO', 'ALCADA_JSON', 'ORIGEM']
};
var LICPAR_COLUNAS_TEXTO = {
  LIC_PARECER_PEDIDOS: ['PRAZO_DIA', 'PRAZO_ISO', 'ATIVIDADE_RESERVA_ATE', 'PEDIDO_EM', 'RESPONDIDO_EM', 'CANCELADO_EM', 'HASH', 'ATUALIZADO_EM'],
  LIC_PARECERES: ['EM', 'HASH'],
  LIC_APROVACOES: ['EM', 'HASH']
};
/** As quatro áreas, na ordem do pedido da missão. cadastro: códigos de CAD_USUARIOS.AREA (vazio = Diretoria e Administrador). */
var LICPAR_AREAS = [
  { codigo: 'LICITACOES', nome: 'Licitações', rotulo: 'de Licitações', foco: 'modalidade, prazos, exigências, habilitação e riscos', cadastro: [] },
  { codigo: 'TECNICA', nome: 'Técnica', rotulo: 'Técnico', foco: 'capacidade de executar o objeto (equipe, padrões, acreditação, logística)', cadastro: ['TECNICA', 'METROLOGIA', 'QUALIDADE'] },
  { codigo: 'FINANCEIRA', nome: 'Financeira', rotulo: 'Financeiro', foco: 'custos, preço mínimo e margem', cadastro: ['FINANCEIRO'] },
  { codigo: 'COMERCIAL', nome: 'Comercial', rotulo: 'Comercial', foco: 'cliente, concorrência e estratégia de preço', cadastro: ['COMERCIAL'] }
];
var LICPAR_POSICOES = { FAVORAVEL: 'Favorável', RESSALVA: 'Com ressalva', CONTRARIO: 'Contrário' };
var LICPAR_SITUACOES_PEDIDO = { ABERTO: 'Aberto', RESPONDIDO: 'Respondido', CANCELADO: 'Cancelado' };
var LICPAR_BASES = { ESTIMADO: 'Valor estimado do edital', SIMULACAO: 'Total da proposta na simulação salva', MAIOR: 'O maior dos dois' };
/** Padrão = o comportamento de antes: um diretor basta, em qualquer valor, sem parecer obrigatório. */
var LICPAR_CFG_PADRAO = { base: 'ESTIMADO', faixas: [{ ate: null, aprovacoes: 1, pareceres: [] }], areas: {} };
var LICPAR_SITUACOES_DECISAO = ['RADAR', 'ANALISE'];   // antes da decisão: pedir parecer, registrar parecer e aprovar
var LICPAR_MOTIVO_MIN = 20;
var LICPAR_RESERVA_MIN = 5;
var LICPAR_HORA_PRAZO = '18:00';
var LICPAR_MAX_FAIXAS = 6;
var LICPAR_FONTE = 'Pareceres e alçadas';
/** Revisão de bf3860b: áreas cujo parecer obrigatório só vale sobre a simulação atual (as que olham o preço). */
var LICPAR_AREAS_DO_PRECO = ['FINANCEIRA', 'LICITACOES'];
/** Atividade de Minhas atividades ainda aberta (não concluída nem cancelada), como LicC_atividadeAberta_. Sem o módulo: null. */
function LicPar_atividadeAberta_(id) {
  if (typeof Atividades_abas_ !== 'function' || !Lic_s_(id)) return null;
  try { var a = SGO_DATA.getById(Atividades_abas_().ATIVIDADES, Lic_s_(id)); return !!a && Lic_s_(a.SITUACAO) !== 'Concluída' && Lic_s_(a.SITUACAO) !== 'Cancelada'; } catch (e) { return null; }
}
/**
 * Revisão de bf3860b: ids das oportunidades com pedido de parecer aberto (a sincronização com o coletor não descarta pela regra a que
 * tem parecer pedido: a Diretoria decide). Nunca lança.
 */
function LicPar_opsComPedidoAberto_() { var m = {}; try { Lic_ler_(LICPAR_ABAS.PEDIDOS).forEach(function (p) { if (LicPar_aberto_(p)) m[Lic_s_(p.OPORTUNIDADE_ID)] = true; }); } catch (e) {} return m; }

// ------------------------------------------------------------ abas e utilitários
function LicPar_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('LICPAR_ABAS_OK_V2')) return; } catch (e) {}
  Object.keys(LICPAR_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, LICPAR_COLUNAS[aba]);
    LICPAR_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (LICPAR_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (cache) cache.put('LICPAR_ABAS_OK_V2', '1', 21600); } catch (e) {}
}
function LicPar_area_(cod) { var c = Lic_up_(cod); return LICPAR_AREAS.filter(function (a) { return a.codigo === c; })[0] || null; }
function LicPar_letras_(t) { return Lic_s_(t).replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '').length; }
function LicPar_txt_(v, max) { return Lic_texto_(Lic_s_(v).replace(/\r\n/g, '\n').replace(/^(?:[=+@\s]|-(?!\d))+/, ''), max || 1000); }
function LicPar_moeda_(v) {
  var n = Math.round((Number(v) || 0) * 100) / 100, neg = n < 0, s = Math.abs(n).toFixed(2), p = s.split('.'), i = p[0], out = '';
  while (i.length > 3) { out = '.' + i.slice(-3) + out; i = i.slice(0, -3); }
  return (neg ? '-' : '') + 'R$ ' + i + out + ',' + p[1];
}
function LicPar_num_(n) { return String(Math.round(Number(n) * 10) / 10).replace('.', ','); }
function LicPar_ordinal_(n) { return n + 'ª'; }
function LicPar_juntar_(l) { return l.length <= 1 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]; }
function LicPar_hoje_() { return Lic_diaSp_(Lic_agora_()); }
function LicPar_semAcento_(v) { var t = Lic_s_(v); try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {} return t.toUpperCase(); }
/** Reais digitados ("100.000,00", "100.000", "1500,5") ou número; null se não for valor. */
function LicPar_reais_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var t = Lic_s_(v).replace(/[R$\s]/g, '');
  if (!t) return null;
  if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  var n = Number(t); return isFinite(n) ? n : null;
}
function LicPar_hashPedido_(p) { return Lic_hash_([Lic_s_(p.OPORTUNIDADE_ID), Lic_s_(p.AREA), Lic_s_(p.USUARIO_ID), Lic_s_(p.PERGUNTA), Lic_s_(p.PRAZO_DIA), Lic_s_(p.PEDIDO_POR_ID), Lic_s_(p.PEDIDO_EM)].join('|')); }
function LicPar_hashParecer_(p) { return Lic_hash_([Lic_s_(p.OPORTUNIDADE_ID), Lic_s_(p.AREA), Number(p.VERSAO) || 0, Lic_s_(p.POSICAO), Lic_s_(p.MOTIVO), Lic_s_(p.MOTIVO_NOVA_VERSAO), Lic_s_(p.PEDIDO_ID), Lic_s_(p.SUBSTITUI_ID), Lic_s_(p.USUARIO_ID), Lic_s_(p.BASE_JSON), Lic_s_(p.EM)].join('|')); }
function LicPar_hashAprovacao_(a) { return Lic_hash_([Lic_s_(a.OPORTUNIDADE_ID), Lic_s_(a.TIPO), Lic_s_(a.USUARIO_ID), Lic_s_(a.MOTIVO), Lic_s_(a.VALOR_BASE), Lic_s_(a.FAIXA), Lic_s_(a.APROVACOES_NECESSARIAS), Lic_s_(a.EM),
  Lic_s_(a.SIMULACAO_VERSAO), Lic_s_(a.ALCADA_VERSAO), Lic_s_(a.ALCADA_JSON), Lic_s_(a.ORIGEM)].join('|')); }
function LicPar_pedidosDe_(oid) { return Lic_ler_(LICPAR_ABAS.PEDIDOS).filter(function (p) { return Lic_s_(p.OPORTUNIDADE_ID) === Lic_s_(oid); }); }
function LicPar_pareceresDe_(oid) { return Lic_ler_(LICPAR_ABAS.PARECERES).filter(function (p) { return Lic_s_(p.OPORTUNIDADE_ID) === Lic_s_(oid); }); }
function LicPar_aprovacoesDe_(oid) { return Lic_ler_(LICPAR_ABAS.APROVACOES).filter(function (p) { return Lic_s_(p.OPORTUNIDADE_ID) === Lic_s_(oid); }); }
function LicPar_aberto_(p) { return !!p && Lic_up_(p.SITUACAO) === 'ABERTO'; }
function LicPar_fora_(perfil) { var p = Lic_up_(perfil); return p === 'CLIENTE' || p === 'REPRESENTADA'; }

/** Pessoas ativas do cadastro (sem cliente, representada e conta do sistema). */
function LicPar_ativos_() {
  return Lic_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
    var st = Lic_up_(u.STATUS), p = Lic_up_(u.PERFIL);
    return (!st || st === 'ATIVO') && p !== 'CLIENTE' && p !== 'REPRESENTADA' && p !== 'SISTEMA' && Lic_s_(u.ID);
  }).map(function (u) { return { id: Lic_s_(u.ID), nome: Lic_s_(u.NOME) || Lic_s_(u.USUARIO), perfil: Lic_up_(u.PERFIL), area: LicPar_semAcento_(u.AREA) }; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
}
/** Quem pode receber o pedido de parecer de uma área: a lista configurada; sem lista, o cadastro (área da pessoa). */
function LicPar_candidatos_(cod, cfg, ativos) {
  var ar = LicPar_area_(cod); if (!ar) return [];
  ativos = ativos || LicPar_ativos_();
  var lista = ((cfg.areas || {})[ar.codigo] || {}).pessoas;
  if (Array.isArray(lista) && lista.length) return ativos.filter(function (u) { return lista.indexOf(u.id) >= 0; });
  if (!ar.cadastro.length) { var dir = Lic_responsaveis_().map(function (u) { return u.id; }); return ativos.filter(function (u) { return dir.indexOf(u.id) >= 0; }); }
  return ativos.filter(function (u) { return ar.cadastro.indexOf(u.area) >= 0; });
}

// ------------------------------------------------------------ alçadas (configuração, versão e motivo)
function LicPar_cfgLinha_() { return Lic_ler_(LIC_ABAS.CONFIG).filter(function (c) { return Lic_s_(c.CHAVE) === 'ALCADAS'; })[0] || null; }
/** Base e faixas de um registro das alçadas (o gravado, ou o anterior guardado nele), no formato de LICPAR_CFG_PADRAO. */
function LicPar_regrasDe_(v, c) {
  if (v && LICPAR_BASES[Lic_up_(v.base)]) c.base = Lic_up_(v.base);
  if (v && Array.isArray(v.faixas) && v.faixas.length) c.faixas = v.faixas.map(function (f) { return { ate: f.ate === null || f.ate === undefined || f.ate === '' ? null : Number(f.ate), aprovacoes: Math.max(1, Number(f.aprovacoes) || 1), pareceres: (Array.isArray(f.pareceres) ? f.pareceres : []).map(Lic_up_).filter(LicPar_area_) }; });
  return c;
}
/**
 * Alçadas: a ÚLTIMA versão gravada (para editar). Revisão de bf3860b (decisão do coordenador): a versão nova vale a partir do dia
 * seguinte, 00:00 de Brasília (valeAPartirDe); até lá, para as oportunidades sem aprovação, vale a anterior (guardada no registro).
 */
function LicPar_cfgUltima_() {
  var l = LicPar_cfgLinha_(), v = l ? Lic_json_(l.VALOR_JSON, {}) : {}, c = LicPar_regrasDe_(v, JSON.parse(JSON.stringify(LICPAR_CFG_PADRAO)));
  if (v.areas && typeof v.areas === 'object') Object.keys(v.areas).forEach(function (k) { if (LicPar_area_(k)) c.areas[Lic_up_(k)] = { pessoas: (Array.isArray(v.areas[k].pessoas) ? v.areas[k].pessoas : []).map(Lic_s_).filter(Boolean) }; });
  c.versao = l ? Number(l.VERSAO) || 1 : 0; c.motivo = l ? Lic_s_(l.MOTIVO) : ''; c.atualizadoPor = l ? Lic_s_(l.ATUALIZADO_POR_NOME) : ''; c.atualizadoEm = l ? Lic_s_(l.ATUALIZADO_EM) : '';
  c.valeAPartirDe = Lic_s_(v.valeAPartirDe); c.padrao = !l; c.anterior = v.anterior && typeof v.anterior === 'object' ? v.anterior : null;
  return c;
}
/** As alçadas EM VIGOR agora (as áreas de quem dá parecer valem na hora; base e faixas, pela data de vigência). c.pendente = a versão que ainda vai valer. */
function LicPar_cfg_() {
  var u = LicPar_cfgUltima_(), agoraMs = Date.now();
  if (!u.valeAPartirDe || !(Date.parse(u.valeAPartirDe) > agoraMs)) { u.pendente = null; return u; }
  var c = LicPar_regrasDe_(u.anterior, JSON.parse(JSON.stringify(LICPAR_CFG_PADRAO)));
  c.areas = u.areas; c.versao = u.anterior ? Number(u.anterior.versao) || 0 : 0; c.padrao = !c.versao; c.valeAPartirDe = u.anterior ? Lic_s_(u.anterior.valeAPartirDe) : '';
  c.motivo = u.anterior ? Lic_s_(u.anterior.motivo) : ''; c.atualizadoPor = u.anterior ? Lic_s_(u.anterior.por) : ''; c.atualizadoEm = u.anterior ? Lic_s_(u.anterior.em) : '';
  c.pendente = { versao: u.versao, valeAPartirDe: u.valeAPartirDe, valeTxt: Lic_brDiaHora_(u.valeAPartirDe), base: u.base, faixas: u.faixas, motivo: u.motivo, atualizadoPor: u.atualizadoPor, atualizadoEm: u.atualizadoEm };
  c.pendente.faixasTxt = u.faixas.map(function (f, i) { return LicPar_faixaTxt_(u, i); });
  return c;
}
/** 00:00 de Brasília do dia seguinte. */
function LicPar_amanha_() { return Lic_isoLocal_(Lic_somarDia_(Lic_diaSp_(Lic_agora_()), 1), '00:00', '-03:00'); }
/** Texto da faixa: "até R$ 100.000,00", "de R$ 100.000,01 a R$ 500.000,00", "acima de R$ 500.000,00" ou "qualquer valor". */
function LicPar_faixaTxt_(cfg, i) {
  var f = cfg.faixas[i], ant = i > 0 ? cfg.faixas[i - 1] : null;
  if (f.ate === null) return ant ? 'acima de ' + LicPar_moeda_(ant.ate) : 'qualquer valor';
  return ant ? 'de ' + LicPar_moeda_(ant.ate + 0.01) + ' a ' + LicPar_moeda_(f.ate) : 'até ' + LicPar_moeda_(f.ate);
}
/** Valor que escolhe a faixa: { valor (null = sem valor), origem }. Sem valor nenhum (estimado sigiloso e sem simulação): faixa mais alta. */
function LicPar_valorBase_(l, cfg, sim) {
  var est = Number(l && l.VALOR_ESTIMADO) > 0 ? Number(l.VALOR_ESTIMADO) : null, s = sim && Number(sim.TOTAL_PROPOSTA) > 0 ? Number(sim.TOTAL_PROPOSTA) : null;
  var txtSim = sim ? 'total da proposta na simulação versão ' + Lic_s_(sim.VERSAO) : '';
  if (cfg.base === 'SIMULACAO') { if (s !== null) return { valor: s, origem: txtSim }; if (est !== null) return { valor: est, origem: 'valor estimado do edital (ainda sem simulação salva)' }; }
  else if (cfg.base === 'MAIOR') {
    if (s !== null && (est === null || s > est)) return { valor: s, origem: txtSim + (est !== null ? ' (maior que o estimado)' : ' (estimado não informado)') };
    if (est !== null) return { valor: est, origem: 'valor estimado do edital' + (s !== null ? ' (maior que a simulação)' : '') };
  } else { if (est !== null) return { valor: est, origem: 'valor estimado do edital' }; if (s !== null) return { valor: s, origem: txtSim + ' (o valor estimado não foi informado ou é sigiloso)' }; }
  return { valor: null, origem: 'sem valor (estimado sigiloso e sem simulação salva): vale a faixa mais alta' };
}
function LicPar_faixaDe_(cfg, valor) {
  if (valor === null) return cfg.faixas.length - 1;
  for (var i = 0; i < cfg.faixas.length; i++) if (cfg.faixas[i].ate === null || valor <= cfg.faixas[i].ate + 1e-9) return i;
  return cfg.faixas.length - 1;
}
function LicPar_cfgTela_(eu) {
  var cfg = LicPar_cfg_(), ativos = LicPar_ativos_(), ult = LicPar_cfgUltima_();
  // revisão de bf3860b: "em vigor" (com a data de vigência) e a versão que "vale a partir de"; o formulário parte da última gravada
  return { cfg: cfg, faixasTxt: cfg.faixas.map(function (f, i) { return LicPar_faixaTxt_(cfg, i); }), bases: LICPAR_BASES, diretoria: Lic_responsaveis_().length,
    emVigor: { versao: cfg.versao, padrao: cfg.padrao, valeAPartirDe: cfg.valeAPartirDe, valeTxt: cfg.valeAPartirDe ? Lic_brDiaHora_(cfg.valeAPartirDe) : '' }, pendente: cfg.pendente || null,
    editar: { base: ult.base, faixas: ult.faixas },
    areas: LICPAR_AREAS.map(function (a) { return { codigo: a.codigo, nome: a.nome, foco: a.foco, doCadastro: a.cadastro, lista: ((cfg.areas || {})[a.codigo] || {}).pessoas || [], candidatos: LicPar_candidatos_(a.codigo, cfg, ativos).map(function (u) { return { id: u.id, nome: u.nome }; }) }; }),
    pessoas: ativos.map(function (u) { return { id: u.id, nome: u.nome, area: u.area, perfil: u.perfil }; }), regras: LICPAR_REGRAS, podeMudar: LicPar_podeMudarCfg_(eu) };
}
/**
 * Grava as alçadas (versão nova com motivo; o que não veio fica como estava). d = { faixas: [{ ate, aprovacoes, pareceres }], base,
 * areas: { TECNICA: { pessoas: [ids] } }, motivo }. A última faixa não tem teto; os tetos crescem; aprovações de 1 até o número de
 * pessoas ativas da Diretoria (no máximo 3).
 */
/** Revisão de e361160 (decisão do coordenador): só o Administrador (e o responsável pelo sistema) muda as alçadas. */
function LicPar_podeMudarCfg_(eu) { return !!eu && (Lic_up_(eu.perfil) === 'ADMIN' || Lic_ehDono_(eu.login)); }
function LicPar_cfgSalvar_(eu, d) {
  Lic_exigir_(eu, 'mudar as alçadas');
  if (!LicPar_podeMudarCfg_(eu)) throw new Error('Não foi possível mudar as alçadas: só o Administrador muda as alçadas de decisão (quem aprova não define a própria regra). Peça ao Administrador. Nada foi alterado');
  var motivo = Lic_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Escreva o motivo da mudança das alçadas (pelo menos 10 letras): ele fica no histórico com o seu nome e a data. Nada foi alterado');
  var antes = LicPar_cfgUltima_(), vigor = LicPar_cfg_(), novo = { base: antes.base, faixas: antes.faixas, areas: antes.areas };
  var dir = Lic_responsaveis_().length, maxAp = Math.max(1, Math.min(3, dir));
  if (d.base !== undefined) { if (!LICPAR_BASES[Lic_up_(d.base)]) throw new Error('Escolha na lista o valor que decide a faixa (estimado, simulação ou o maior). Nada foi alterado'); novo.base = Lic_up_(d.base); }
  if (d.faixas !== undefined) {
    if (!Array.isArray(d.faixas) || !d.faixas.length || d.faixas.length > LICPAR_MAX_FAIXAS) throw new Error('Informe de 1 a ' + LICPAR_MAX_FAIXAS + ' faixas de valor. Nada foi alterado');
    var ultimo = 0;
    novo.faixas = d.faixas.map(function (f, i) {
      var fim = i === d.faixas.length - 1, ate = null;
      if (!fim) {
        ate = LicPar_reais_(f.ate);
        if (ate === null || !(ate > 0)) throw new Error('Escreva o teto da faixa ' + (i + 1) + ' em reais, maior que zero (por exemplo 100.000,00). A última faixa não tem teto. Nada foi alterado');
        if (ate <= ultimo) throw new Error('Os tetos das faixas têm de crescer: a faixa ' + (i + 1) + ' (' + LicPar_moeda_(ate) + ') não passa da anterior (' + LicPar_moeda_(ultimo) + '). Nada foi alterado');
        ultimo = ate = Math.round(ate * 100) / 100;
      }
      var ap = Number(f.aprovacoes);
      if (!(ap >= 1 && ap <= 3 && Math.round(ap) === ap)) throw new Error('Escolha de 1 a 3 aprovações da Diretoria na faixa ' + (i + 1) + '. Nada foi alterado');
      if (ap > maxAp) throw new Error('A faixa ' + (i + 1) + ' pede ' + ap + ' aprovações, mas só há ' + dir + ' pessoa(s) ativa(s) da Diretoria e do Administrador: ninguém conseguiria participar. Escolha até ' + maxAp + '. Nada foi alterado');
      var par = (Array.isArray(f.pareceres) ? f.pareceres : []).map(Lic_up_);
      var erradas = par.filter(function (x) { return !LicPar_area_(x); });
      if (erradas.length) throw new Error('Área desconhecida nos pareceres obrigatórios: ' + erradas.join(', ') + '. Escolha Licitações, Técnica, Financeira ou Comercial. Nada foi alterado');
      par = LICPAR_AREAS.map(function (a) { return a.codigo; }).filter(function (c) { return par.indexOf(c) >= 0; });
      return { ate: ate, aprovacoes: ap, pareceres: par };
    });
  }
  if (d.areas !== undefined) {
    var ativos = LicPar_ativos_(), ids = ativos.map(function (u) { return u.id; }), areas = {};
    Object.keys(d.areas || {}).forEach(function (k) {
      if (!LicPar_area_(k)) throw new Error('Área desconhecida: ' + k + '. Nada foi alterado');
      var p = ((d.areas[k] || {}).pessoas || []).map(Lic_s_).filter(Boolean);
      var fora = p.filter(function (x) { return ids.indexOf(x) < 0; });
      if (fora.length) throw new Error('Na área ' + LicPar_area_(k).nome + ' há pessoa que não está ativa no cadastro. Atualize a tela e escolha de novo. Nada foi alterado');
      if (p.length) areas[Lic_up_(k)] = { pessoas: p };
    });
    novo.areas = areas;
  }
  var semVer = function (c) { return JSON.stringify({ base: c.base, faixas: c.faixas, areas: c.areas }); };
  if (semVer(novo) === semVer(antes) && antes.versao) return { cfg: LicPar_cfgTela_(eu), semMudanca: true, texto: 'Nada mudou: as alçadas enviadas são iguais às atuais. Nenhuma versão nova foi criada.' };
  return Lic_comTrava_(function () {
    var l = LicPar_cfgLinha_(), agora = Lic_agora_(), versao = (antes.versao || 0) + 1, vale = LicPar_amanha_();
    // a versão em vigor agora fica guardada como "anterior": vale até a nova começar (00:00 de Brasília do dia seguinte)
    var valor = { base: novo.base, faixas: novo.faixas, areas: novo.areas, valeAPartirDe: vale,
      anterior: vigor.versao ? { versao: vigor.versao, base: vigor.base, faixas: vigor.faixas, valeAPartirDe: vigor.valeAPartirDe || '', motivo: vigor.motivo, por: vigor.atualizadoPor, em: vigor.atualizadoEm } : null };
    var reg = { CHAVE: 'ALCADAS', VALOR_JSON: JSON.stringify(valor), VERSAO: versao, MOTIVO: motivo, ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora };
    if (l) SGO_DATA.update(LIC_ABAS.CONFIG, l.ID, reg); else SGO_DATA.insert(LIC_ABAS.CONFIG, Object.assign({ CRIADO_EM: agora }, reg));
    var desc = function (c) { return c.faixas.map(function (f, i) { return LicPar_faixaTxt_(c, i) + ': ' + f.aprovacoes + ' aprovação(ões)' + (f.pareceres.length ? ', pareceres ' + f.pareceres.map(function (x) { return LicPar_area_(x).rotulo; }).join(', ') : ', sem parecer obrigatório'); }).join('; ') + ' · valor: ' + (LICPAR_BASES[c.base] || c.base).toLowerCase(); };
    Lic_historico_('CONFIG', 'ALCADAS', '', 'ALCADAS', eu, { de: antes.versao ? 'versão ' + antes.versao + ': ' + desc(antes) : 'padrão (um diretor basta, sem parecer obrigatório)', para: 'versão ' + versao + ': ' + desc(novo), texto: 'Vale a partir de ' + Lic_brDiaHora_(vale) + ' (horário de Brasília). Motivo: ' + motivo, versao: versao, fonte: 'Tela Portais e configurações › Alçadas e pareceres' });
    return { cfg: LicPar_cfgTela_(eu), versao: versao, valeAPartirDe: vale, texto: 'Alçadas salvas como versão ' + versao + '. Valem a partir de ' + Lic_brDiaHora_(vale) + ' (horário de Brasília) para as oportunidades sem aprovação em andamento; até lá vale a ' + (vigor.versao ? 'versão ' + vigor.versao : 'regra padrão') + '. As que já têm aprovação seguem a versão da primeira aprovação. Quem dá o parecer de cada área muda na hora.' };
  });
}

// ------------------------------------------------------------ contexto da oportunidade (análise, simulação, leitura, habilitação)
function LicPar_simulacao_(oid) {
  var aba = typeof LICP_ABAS !== 'undefined' ? LICP_ABAS.SIMULACOES : 'LIC_SIMULACOES';
  return Lic_ler_(aba).filter(function (s) { return Lic_s_(s.OPORTUNIDADE_ID) === Lic_s_(oid); }).sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); })[0] || null;
}
function LicPar_analise_(l) {
  var an = Lic_s_(l.ANALISE_ID) ? SGO_DATA.getById(LIC_ABAS.ANALISES, Lic_s_(l.ANALISE_ID)) : null;
  if (!an || Lic_up_(an.SITUACAO) !== 'CONCLUIDA') an = Lic_ler_(LIC_ABAS.ANALISES).filter(function (x) { return Lic_s_(x.OPORTUNIDADE_ID) === Lic_s_(l.ID) && Lic_up_(x.SITUACAO) === 'CONCLUIDA'; })
    .sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); })[0] || null;
  return an;
}
/** Capacidade técnica da análise que vale: { pontos, peso, razao, versao } ou null. */
function LicPar_capacidade_(an) {
  var c = (Lic_json_(an && an.CRITERIOS_JSON, {}) || {}).capacidade;
  if (!c || !isFinite(Number(c.pontos)) || !(Number(c.peso) > 0)) return null;
  return { pontos: Number(c.pontos), peso: Number(c.peso), razao: Number(c.pontos) / Number(c.peso), versao: Number(an.VERSAO) || 0 };
}
function LicPar_simResumo_(sim) {
  if (!sim) return null;
  var abaixo = Number(sim.ITENS_ABAIXO_PISO_PROPOSTA) || 0, prop = Number(sim.TOTAL_PROPOSTA) || 0, piso = Number(sim.TOTAL_PISO) || 0;
  return { versao: Number(sim.VERSAO) || 0, totalProposta: prop, totalEdital: Number(sim.TOTAL_EDITAL) || 0, totalPiso: piso, totalCusto: Number(sim.TOTAL_CUSTO) || 0,
    margemPct: sim.MARGEM_PROPOSTA_PCT === '' || sim.MARGEM_PROPOSTA_PCT === undefined ? null : Number(sim.MARGEM_PROPOSTA_PCT), abaixoPiso: abaixo, pendencias: Number(sim.PENDENCIAS) || 0,
    acimaDoPiso: abaixo === 0 && prop > 0 && prop + 0.005 >= piso, em: Lic_s_(sim.CRIADO_EM), por: Lic_s_(sim.POR_NOME) };
}
/** Habilitação cruzada com o edital (só contagens e itens), quando o módulo está no ambiente. Nunca lança. */
function LicPar_habilitacao_(l) {
  try {
    if (typeof LicH_contexto_ !== 'function' || typeof LicH_cruzar_ !== 'function') return null;
    var cr = LicH_cruzar_(l, LicH_contexto_({ opIds: [l.ID] }));
    return { contagens: cr.contagens, sessao: cr.sessao, itens: (cr.itens || []).slice(0, 30).map(function (x) { return { texto: Lic_texto_(x.texto, 400), situacao: x.efetivo, situacaoNome: x.efetivoNome, cor: x.efetivoCor, pendencia: !!x.pendencia }; }) };
  } catch (e) { return { erro: 'Não foi possível cruzar a habilitação agora (' + Lic_s_(e && e.message) + ').' }; }
}
/** Checklist da última leitura do edital consolidada (tema, trecho e onde está). Nunca lança. */
function LicPar_leitura_(l) {
  try {
    if (typeof LicLeit_checklistDe_ !== 'function' || typeof LIC_LEIT_ABAS === 'undefined') return null;
    var le = Lic_ler_(LIC_LEIT_ABAS.LEITURAS).filter(function (x) { return Lic_s_(x.OPORTUNIDADE_ID) === Lic_s_(l.ID) && Lic_up_(x.SITUACAO) === 'CONCLUIDA'; })
      .sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); })[0];
    if (!le) return { versao: 0, itens: [] };
    var ck = LicLeit_checklistDe_(le);
    return { versao: Number(le.VERSAO) || 0, em: Lic_s_(le.CONSOLIDACAO_EM) || Lic_s_(le.CRIADO_EM), ilegivel: !!ck.ilegivel, total: ck.itens.length,
      itens: ck.itens.slice(0, 40).map(function (it) { var f = (it.fontes || [])[0] || {}; return { tema: Lic_s_(it.temaNome) || Lic_s_(it.tema), trecho: Lic_texto_(it.trecho, 600), tipo: Lic_s_(it.tipo), fonte: Lic_s_(f.arquivo && (f.arquivo.titulo || f.arquivo.nome)) + (f.rotulo ? ', ' + Lic_s_(f.rotulo) : '') }; }) };
  } catch (e) { return { erro: 'Não foi possível ler o checklist do edital agora (' + Lic_s_(e && e.message) + ').' }; }
}
function LicPar_contexto_(l) {
  var an = LicPar_analise_(l), sim = LicPar_simulacao_(l.ID);
  return { analise: an, capacidade: LicPar_capacidade_(an), sim: sim, simResumo: LicPar_simResumo_(sim), habilitacao: LicPar_habilitacao_(l), pareceres: LicPar_pareceresDe_(l.ID), aprovacoes: LicPar_aprovacoesDe_(l.ID) };
}
/** O parecer que vale de cada área (a versão mais alta e íntegra) e as versões: { area: { atual, versoes[] } }. */
function LicPar_porArea_(linhas) {
  var m = {};
  (linhas || []).forEach(function (p) { var k = Lic_up_(p.AREA); (m[k] = m[k] || { versoes: [] }).versoes.push(p); });
  Object.keys(m).forEach(function (k) {
    m[k].versoes.sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); });
    m[k].atual = m[k].versoes.filter(function (p) { return LicPar_hashParecer_(p) === Lic_s_(p.HASH); })[0] || null;
    m[k].alterada = m[k].versoes.some(function (p) { return LicPar_hashParecer_(p) !== Lic_s_(p.HASH); });
  });
  return m;
}
function LicPar_parecerTela_(p) {
  var b = Lic_json_(p.BASE_JSON, {}) || {};
  return { id: Lic_s_(p.ID), area: Lic_up_(p.AREA), areaNome: (LicPar_area_(p.AREA) || {}).nome || Lic_s_(p.AREA), versao: Number(p.VERSAO) || 1, posicao: Lic_up_(p.POSICAO), posicaoNome: LICPAR_POSICOES[Lic_up_(p.POSICAO)] || Lic_s_(p.POSICAO),
    motivo: Lic_s_(p.MOTIVO), motivoNovaVersao: Lic_s_(p.MOTIVO_NOVA_VERSAO), por: Lic_s_(p.USUARIO_NOME), em: Lic_s_(p.EM), emBr: Lic_brDiaHora_(p.EM), base: b, hash: Lic_s_(p.HASH), integra: LicPar_hashParecer_(p) === Lic_s_(p.HASH) };
}

// ------------------------------------------------------------ consolidação: divergências calculadas pelo código (sem IA)
/** [{ codigo, area, grau: ALTA|MEDIA, texto }]. porArea = LicPar_porArea_; ctx = LicPar_contexto_. */
function LicPar_divergencias_(l, porArea, ctx) {
  var out = [], atual = function (k) { return porArea[k] && porArea[k].atual; }, pos = function (k) { return atual(k) ? Lic_up_(atual(k).POSICAO) : ''; };
  var add = function (codigo, area, grau, texto) { out.push({ codigo: codigo, area: area, areaNome: area ? (LicPar_area_(area) || {}).nome : '', grau: grau, texto: texto }); };
  var fav = [], con = [];
  LICPAR_AREAS.forEach(function (a) {
    var p = atual(a.codigo); if (!p) return;
    if (Lic_up_(p.POSICAO) === 'FAVORAVEL') fav.push(a.nome);
    if (Lic_up_(p.POSICAO) === 'CONTRARIO') { con.push(a.nome); add('CONTRARIO', a.codigo, 'ALTA', 'Parecer ' + a.rotulo + ' contrário (' + Lic_s_(p.USUARIO_NOME) + ', versão ' + Lic_s_(p.VERSAO) + '): ' + Lic_texto_(p.MOTIVO, 240)); }
  });
  if (fav.length && con.length) add('OPOSTOS', '', 'ALTA', 'Pareceres opostos: favorável (' + LicPar_juntar_(fav) + ') × contrário (' + LicPar_juntar_(con) + ').');
  var cap = ctx.capacidade;
  if (cap && pos('TECNICA') === 'FAVORAVEL' && cap.razao < 0.5) add('TECNICO_CAPACIDADE', 'TECNICA', 'ALTA', 'O parecer Técnico é favorável, mas a capacidade técnica da análise (versão ' + cap.versao + ') é ' + LicPar_num_(cap.pontos) + ' de ' + LicPar_num_(cap.peso) + ' (baixa): confira o que falta (equipe, padrões, acreditação).');
  if (cap && pos('TECNICA') === 'CONTRARIO' && cap.razao >= 0.75) add('TECNICO_CAPACIDADE', 'TECNICA', 'MEDIA', 'O parecer Técnico é contrário, mas a capacidade técnica da análise (versão ' + cap.versao + ') é ' + LicPar_num_(cap.pontos) + ' de ' + LicPar_num_(cap.peso) + ' (alta): confira o que a análise não viu.');
  var s = ctx.simResumo;
  if (pos('FINANCEIRA') === 'CONTRARIO' && s && s.acimaDoPiso) add('FINANCEIRO_PISO', 'FINANCEIRA', 'ALTA', 'O parecer Financeiro é contrário, mas a simulação versão ' + s.versao + ' está acima do piso (proposta ' + LicPar_moeda_(s.totalProposta) + ', piso ' + LicPar_moeda_(s.totalPiso) + ', nenhum item abaixo).');
  if (pos('FINANCEIRA') === 'FAVORAVEL' && !s) add('FINANCEIRO_SEM_SIMULACAO', 'FINANCEIRA', 'MEDIA', 'O parecer Financeiro é favorável, mas não há simulação de preço salva (aba Preço): sem ela não há piso conferido.');
  if (pos('FINANCEIRA') === 'FAVORAVEL' && s && !s.acimaDoPiso) add('FINANCEIRO_PISO', 'FINANCEIRA', 'ALTA', 'O parecer Financeiro é favorável, mas a simulação versão ' + s.versao + ' tem ' + (s.abaixoPiso ? s.abaixoPiso + ' item(ns) abaixo do piso' : 'o total abaixo do piso') + ' (proposta ' + LicPar_moeda_(s.totalProposta) + ', piso ' + LicPar_moeda_(s.totalPiso) + ').');
  if (pos('LICITACOES') === 'FAVORAVEL' && (Number(l.TRAVAS_A_CONFIRMAR) > 0 || Lic_s_(l.NOTA_TRAVA))) add('LICITACOES_TRAVA', 'LICITACOES', 'ALTA', 'O parecer de Licitações é favorável, mas a análise tem ' + (Number(l.TRAVAS_A_CONFIRMAR) > 0 ? Number(l.TRAVAS_A_CONFIRMAR) + ' trava(s) a confirmar' : 'trava confirmada (' + Lic_texto_(l.NOTA_TRAVA, 120) + ')') + ' (aba Análise).');
  var hab = ctx.habilitacao;
  if (pos('LICITACOES') === 'FAVORAVEL' && hab && hab.contagens && hab.contagens.pendencias > 0) add('LICITACOES_HABILITACAO', 'LICITACOES', 'MEDIA', 'O parecer de Licitações é favorável, mas há ' + hab.contagens.pendencias + ' exigência(s) de habilitação pendente(s) na aba Habilitação (falta, vence antes da sessão, a conferir ou não atende).');
  var cls = Lic_up_(l.NOTA_CLASSE), nota = Number(l.NOTA);
  if (pos('COMERCIAL') === 'FAVORAVEL' && l.NOTA !== '' && l.NOTA !== null && l.NOTA !== undefined && isFinite(nota) && (cls === 'BAIXA' || cls === 'DESCARTE' || cls === 'TRAVA_A_CONFIRMAR' || nota < 50))
    add('COMERCIAL_NOTA', 'COMERCIAL', 'MEDIA', 'O parecer Comercial é favorável, mas a nota da análise é ' + LicPar_num_(nota) + ' (' + ((typeof LIC_CLASSES !== 'undefined' && LIC_CLASSES[cls]) || cls || 'sem classe').toLowerCase() + ').');
  // parecer dado sobre versão antiga da análise ou da simulação
  LICPAR_AREAS.forEach(function (a) {
    var p = atual(a.codigo); if (!p) return;
    var b = Lic_json_(p.BASE_JSON, {}) || {}, mud = [];
    if (ctx.analise && Number(b.analiseVersao || 0) !== (Number(ctx.analise.VERSAO) || 0)) mud.push('a análise (era a versão ' + (b.analiseVersao || 'nenhuma') + ', hoje vale a ' + Lic_s_(ctx.analise.VERSAO) + ')');
    if (ctx.sim && Number(b.simulacaoVersao || 0) !== (Number(ctx.sim.VERSAO) || 0)) mud.push('a simulação (era a versão ' + (b.simulacaoVersao || 'nenhuma') + ', hoje vale a ' + Lic_s_(ctx.sim.VERSAO) + ')');
    if (mud.length) add('BASE_ANTIGA', a.codigo, 'MEDIA', 'O parecer ' + a.rotulo + ' foi dado antes de mudar ' + LicPar_juntar_(mud) + ': peça uma versão nova se a mudança importa.');
    if (porArea[a.codigo].alterada) add('ALTERADO', a.codigo, 'ALTA', 'Há versão do parecer ' + a.rotulo + ' alterada fora do SGO+ (o hash não confere): ela não vale. Avise o Administrador.');
  });
  return out;
}

// ------------------------------------------------------------ alçada da oportunidade
/** Aprovações que valem: depois do último descarte (descartar e reabrir zera), íntegras, uma por pessoa. */
/** Revisão de e361160: só contam as aprovações sobre a simulação ATUAL (simVersao; 0 = sem simulação). */
function LicPar_aprovacoesValidas_(l, linhas, simVersao) {
  var corte = Lic_s_(l.DESCARTE_EM), vistos = {};
  return (linhas || []).filter(function (a) { return Lic_up_(a.TIPO) === 'PARTICIPAR' && (!corte || Lic_s_(a.EM) > corte) && LicPar_hashAprovacao_(a) === Lic_s_(a.HASH) && (Number(a.SIMULACAO_VERSAO) || 0) === (Number(simVersao) || 0); })
    .sort(function (a, b) { return Lic_s_(a.EM) < Lic_s_(b.EM) ? -1 : 1; })
    .filter(function (a) { var k = Lic_s_(a.USUARIO_ID); if (vistos[k]) return false; vistos[k] = true; return true; })
    .map(function (a) { return { id: Lic_s_(a.USUARIO_ID), nome: Lic_s_(a.USUARIO_NOME), em: Lic_s_(a.EM), emBr: Lic_brDiaHora_(a.EM), motivo: Lic_s_(a.MOTIVO), origem: Lic_up_(a.ORIGEM) || 'APROVACAO', alcadaVersao: Number(a.ALCADA_VERSAO) || 0, alcadaJson: Lic_s_(a.ALCADA_JSON) }; });
}
/** Alçadas gravadas numa aprovação (congeladas para a oportunidade), no formato de LicPar_cfg_. null = ilegível. */
function LicPar_cfgDaAprovacao_(ap) {
  var v = Lic_json_(ap && ap.alcadaJson, null);
  if (!v || !Array.isArray(v.faixas) || !v.faixas.length) return null;
  var c = { base: LICPAR_BASES[Lic_up_(v.base)] ? Lic_up_(v.base) : 'ESTIMADO', faixas: v.faixas.map(function (f) { return { ate: f.ate === null || f.ate === undefined || f.ate === '' ? null : Number(f.ate), aprovacoes: Math.max(1, Number(f.aprovacoes) || 1), pareceres: (Array.isArray(f.pareceres) ? f.pareceres : []).map(Lic_up_).filter(LicPar_area_) }; }), areas: {} };
  c.versao = ap.alcadaVersao; c.padrao = !ap.alcadaVersao; c.congelada = true;
  return c;
}
function LicPar_cfgJson_(cfg) { return JSON.stringify({ base: cfg.base, faixas: cfg.faixas }); }
/**
 * A alçada que vale agora: faixa, aprovações necessárias e as que já existem, pareceres obrigatórios e os que faltam, e as faltas em
 * texto ("falta o parecer Financeiro"; "falta a 2ª aprovação da Diretoria, valor acima de R$ X"). contarEu = a pessoa que está agindo
 * conta como uma aprovação (abrir a disputa direto, ou a aprovação que vai ser gravada agora).
 */
function LicPar_alcada_(l, ctx, contarEu) {
  var simV = ctx.sim ? Number(ctx.sim.VERSAO) || 0 : 0, aprov = LicPar_aprovacoesValidas_(l, ctx.aprovacoes, simV);
  // revisão de e361160: com aprovação em andamento vale a versão das alçadas em que a primeira aprovação foi dada
  var cfg = (aprov.length && LicPar_cfgDaAprovacao_(aprov[0])) || LicPar_cfg_();
  var vb = LicPar_valorBase_(l, cfg, ctx.sim), i = LicPar_faixaDe_(cfg, vb.valor), f = cfg.faixas[i], faixaTxt = LicPar_faixaTxt_(cfg, i);
  var porArea = LicPar_porArea_(ctx.pareceres);
  var conta = aprov.slice();
  if (contarEu && !conta.some(function (a) { return a.id === Lic_s_(contarEu.id); })) conta.push({ id: Lic_s_(contarEu.id), nome: Lic_s_(contarEu.nome), agora: true });
  // revisão de e361160: o parecer obrigatório só conta se foi dado sobre a simulação atual
  // revisão de bf3860b: a exigência vale só para Financeira e Licitações (o preço muda o parecer); Técnica e Comercial valem entre simulações
  var sobreAtual = function (c) { var p = porArea[c] && porArea[c].atual; if (!p) return false; if (LICPAR_AREAS_DO_PRECO.indexOf(c) < 0) return true; return (Number((Lic_json_(p.BASE_JSON, {}) || {}).simulacaoVersao) || 0) === simV; };
  var faltamPar = f.pareceres.filter(function (c) { return !sobreAtual(c); });
  var antigos = faltamPar.filter(function (c) { return porArea[c] && porArea[c].atual; });
  var valorTxt = vb.valor === null ? 'sem valor informado' : LicPar_moeda_(vb.valor) + ', ' + vb.origem;
  var faltas = [];
  if (faltamPar.length) faltas.push((faltamPar.length > 1 ? 'faltam os pareceres ' : 'falta o parecer ') + LicPar_juntar_(faltamPar.map(function (c) { return LicPar_area_(c).rotulo; })) + ' (obrigatório' + (faltamPar.length > 1 ? 's' : '') + ' na faixa ' + faixaTxt + ': ' + valorTxt +
    (antigos.length ? '; o parecer ' + LicPar_juntar_(antigos.map(function (c) { return LicPar_area_(c).rotulo; })) + ' que existe foi dado sobre outra versão da simulação; vale a versão ' + simV : '') + ')');
  var faltamAp = Math.max(0, f.aprovacoes - conta.length);
  if (faltamAp) {
    var ords = []; for (var k = conta.length + 1; k <= f.aprovacoes; k++) ords.push(LicPar_ordinal_(k));
    faltas.push((faltamAp > 1 ? 'faltam a ' + LicPar_juntar_(ords) + ' aprovações' : 'falta a ' + ords[0] + ' aprovação') + ' da Diretoria, ' + (f.ate === null && i === 0 ? 'em qualquer valor' : 'valor ' + faixaTxt) + ' (' + valorTxt + ')');
  }
  return { cfg: cfg, versao: cfg.versao, padrao: cfg.padrao, congelada: !!cfg.congelada, simVersao: simV, valor: vb.valor, valorOrigem: vb.origem, faixa: i, faixaTxt: faixaTxt, necessarias: f.aprovacoes, obrigatorios: f.pareceres, aprovacoes: aprov, contadas: conta.length,
    faltamPareceres: faltamPar, faltamAprovacoes: faltamAp, faltas: faltas, ok: !faltas.length, porArea: porArea };
}
/** Texto curto dos pareceres que valem (para o histórico da decisão). */
function LicPar_pareceresTxt_(porArea) {
  var x = LICPAR_AREAS.filter(function (a) { return porArea[a.codigo] && porArea[a.codigo].atual; }).map(function (a) { var p = porArea[a.codigo].atual; return a.nome + ' ' + (LICPAR_POSICOES[Lic_up_(p.POSICAO)] || p.POSICAO).toLowerCase() + ' (' + Lic_s_(p.USUARIO_NOME) + ', v' + Lic_s_(p.VERSAO) + ')'; });
  return x.length ? x.join('; ') : 'nenhum parecer';
}

/**
 * Chamada pela Central de disputas antes de abrir a disputa (SGO_Licitacoes_Disputa.js), já sob a trava: em Radar ou Em análise a
 * abertura É a decisão de participar, então confere a alçada contando quem abre como uma aprovação. Decisão ou Proposta: já passou
 * pela alçada. Com o padrão (um diretor, nenhum parecer), nunca recusa. Erro interno não bloqueia (fica no registro).
 */
function LicPar_conferirAbertura_(eu, l, o) {
  o = o || {};
  var acao = o.acao || 'abrir a disputa';
  if (LICPAR_SITUACOES_DECISAO.indexOf(Lic_s_(l.SITUACAO)) < 0) return null;
  var ctx = null, al = null;
  // revisão de e361160: erro no cálculo da alçada RECUSA (o controle não abre sem conferir)
  try { ctx = LicPar_contexto_(l); al = LicPar_alcada_(l, ctx, eu); }
  catch (e) { throw new Error('Não foi possível ' + acao + ': a alçada não pôde ser conferida agora (' + Lic_s_(e && e.message).replace(/[.\s]+$/, '') + '). Tente de novo em instantes; se continuar, avise o Administrador. Nada foi gravado'); }
  if (!al.ok) throw new Error('Não foi possível ' + acao + ': a participação ainda não passou pela alçada (' + al.faltas.join('; ') + '). Peça o parecer ou a aprovação na ficha, aba Pareceres. Nada foi gravado');
  return { al: al, ctx: ctx, origem: o.origem || 'DISPUTA' };
}
/**
 * Revisão de e361160: quem abre a disputa (ou registra o contrato) direto do Radar ou de Em análise grava a aprovação dele (sob a trava
 * de quem chama, logo antes de mudar a situação). tok = o que LicPar_conferirAbertura_ devolveu (null = já tinha passado pela alçada).
 */
function LicPar_gravarAbertura_(eu, l, tok, motivo) {
  if (!tok) return null;
  if (tok.al.aprovacoes.some(function (a) { return a.id === Lic_s_(eu.id); })) return null;
  return LicPar_gravarAprovacao_(eu, l, tok.al, tok.ctx, Lic_texto_(motivo, 1000), tok.origem, Lic_agora_());
}

// ------------------------------------------------------------ prazo do pedido
/** Prazo padrão: 1 dia útil antes do fim das propostas às 18:00; se já passou, hoje às 18:00 (dia útil e antes das 18:00) ou o próximo dia útil. */
function LicPar_prazoPadrao_(l, agoraMs) {
  agoraMs = agoraMs || Date.now();
  var hoje = Lic_diaSp_(new Date(agoraMs).toISOString()), fim = Lic_s_(l.ENCERRAMENTO_ISO), dia = '', regra = '';
  if (isFinite(Date.parse(fim))) { dia = Lic_diasUteisAntes_(Lic_diaSp_(fim), 1).dia; regra = '1 dia útil antes do fim das propostas (' + Lic_brDiaHora_(fim) + ')'; }
  else { dia = Lic_diasUteisDepois_(hoje, 2).dia; regra = 'fim das propostas não informado: 2 dias úteis a partir de hoje'; }
  var iso = Lic_isoLocal_(dia, LICPAR_HORA_PRAZO, '-03:00');
  if (!(Date.parse(iso) > agoraMs)) {
    var hojeIso = Lic_isoLocal_(hoje, LICPAR_HORA_PRAZO, '-03:00');
    dia = !Lic_motivoNaoUtil_(hoje, 'TRAS') && Date.parse(hojeIso) > agoraMs ? hoje : Lic_diasUteisDepois_(hoje, 1).dia;
    iso = Lic_isoLocal_(dia, LICPAR_HORA_PRAZO, '-03:00');
    regra += ' já passou: o prazo ficou para ' + Lic_brDia_(dia) + ' (nunca no passado)';
  }
  return { dia: dia, iso: iso, regra: regra, texto: Lic_brDia_(dia) + ' ' + LICPAR_HORA_PRAZO };
}
/** Prazo escolhido pela Diretoria ('aaaa-mm-dd'): nunca no passado (hoje só antes das 18:00). */
function LicPar_prazoEscolhido_(dia, agoraMs) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !isFinite(Date.parse(dia + 'T12:00:00Z'))) throw new Error('Escolha o prazo do parecer no calendário. Nada foi criado');
  var iso = Lic_isoLocal_(dia, LICPAR_HORA_PRAZO, '-03:00');
  if (!(Date.parse(iso) > agoraMs)) throw new Error('O prazo do parecer não pode ficar no passado (' + Lic_brDia_(dia) + ' às ' + LICPAR_HORA_PRAZO + ' já passou). Escolha outro dia. Nada foi criado');
  return { dia: dia, iso: iso, regra: 'escolhido pela Diretoria', texto: Lic_brDia_(dia) + ' ' + LICPAR_HORA_PRAZO };
}

// ------------------------------------------------------------ pedido de parecer e a atividade em Minhas atividades
function LicPar_marca_(pedidoId) { return '[Ref. Licitações: pedido de parecer ' + Lic_s_(pedidoId) + ']'; }
function LicPar_pedidoTela_(p, agoraMs) {
  var ar = LicPar_area_(p.AREA) || {}, aberto = LicPar_aberto_(p);
  return { id: Lic_s_(p.ID), opId: Lic_s_(p.OPORTUNIDADE_ID), codigo: Lic_s_(p.CODIGO), area: Lic_up_(p.AREA), areaNome: ar.nome || Lic_s_(p.AREA), rotulo: ar.rotulo || '', foco: ar.foco || '',
    pessoaId: Lic_s_(p.USUARIO_ID), pessoa: Lic_s_(p.USUARIO_NOME), pergunta: Lic_s_(p.PERGUNTA), prazoDia: Lic_s_(p.PRAZO_DIA), prazoIso: Lic_s_(p.PRAZO_ISO), prazoTxt: Lic_brDiaHora_(p.PRAZO_ISO), prazoRegra: Lic_s_(p.PRAZO_REGRA),
    atrasado: aberto && Date.parse(Lic_s_(p.PRAZO_ISO)) < (agoraMs || Date.now()), situacao: Lic_up_(p.SITUACAO), situacaoNome: LICPAR_SITUACOES_PEDIDO[Lic_up_(p.SITUACAO)] || Lic_s_(p.SITUACAO),
    atividadeId: Lic_s_(p.ATIVIDADE_ID), atividadeSituacao: Lic_s_(p.ATIVIDADE_SITUACAO), atividadeErro: Lic_s_(p.ATIVIDADE_ERRO), por: Lic_s_(p.PEDIDO_POR_NOME), em: Lic_s_(p.PEDIDO_EM), emBr: Lic_brDiaHora_(p.PEDIDO_EM),
    respondidoEm: Lic_s_(p.RESPONDIDO_EM), parecerId: Lic_s_(p.PARECER_ID), canceladoEm: Lic_s_(p.CANCELADO_EM), canceladoPor: Lic_s_(p.CANCELADO_POR_NOME), canceladoMotivo: Lic_s_(p.CANCELADO_MOTIVO),
    integra: LicPar_hashPedido_(p) === Lic_s_(p.HASH) };
}
/** Atividade com a marca do pedido em Minhas atividades (não cancelada), ou null. */
function LicPar_atividadePelaMarca_(pedidoId) {
  if (typeof Atividades_abas_ !== 'function') return null;
  var marca = LicPar_marca_(pedidoId);
  try { return (SGO_DATA.getAll(Atividades_abas_().ATIVIDADES) || []).filter(function (a) { return Lic_s_(a.DESCRICAO).indexOf(marca) >= 0 && Lic_s_(a.SITUACAO) !== 'Cancelada'; })[0] || null; } catch (e) { return null; }
}
/**
 * Lança (ou recupera pela marca) a atividade do pedido em Minhas atividades, com a sessão de quem pediu. Reserva sob a trava: dois
 * toques ao mesmo tempo não criam duas. Devolve { id, recuperada, erro }. Nunca lança.
 */
function LicPar_lancarAtividade_(eu, pedidoId) {
  var res = null;
  try {
    res = Lic_comTrava_(function () {
      var p = SGO_DATA.getById(LICPAR_ABAS.PEDIDOS, pedidoId), agora = Lic_agora_();
      if (!LicPar_aberto_(p)) return { pular: 'o pedido não está aberto' };
      if (Lic_s_(p.ATIVIDADE_ID)) return { id: Lic_s_(p.ATIVIDADE_ID), ja: true };
      if (Lic_s_(p.ATIVIDADE_RESERVA_ATE) > agora) return { pular: 'outra gravação está lançando esta atividade agora; espere ' + LICPAR_RESERVA_MIN + ' minutos e toque de novo' };
      var ach = LicPar_atividadePelaMarca_(p.ID);
      if (ach) { SGO_DATA.update(LICPAR_ABAS.PEDIDOS, p.ID, { ATIVIDADE_ID: Lic_s_(ach.ID), ATIVIDADE_SITUACAO: Lic_s_(ach.SITUACAO), ATIVIDADE_ERRO: '', ATIVIDADE_RESERVA_ATE: '', ATUALIZADO_EM: agora }); return { id: Lic_s_(ach.ID), recuperada: true }; }
      SGO_DATA.update(LICPAR_ABAS.PEDIDOS, p.ID, { ATIVIDADE_RESERVA_ATE: new Date(Date.now() + LICPAR_RESERVA_MIN * 60000).toISOString(), ATUALIZADO_EM: agora });
      return { criar: true, p: p };
    });
  } catch (e) { return { erro: Lic_s_(e && e.message) }; }
  if (!res.criar) return res.pular ? { erro: res.pular } : res;
  var p = res.p, ar = LicPar_area_(p.AREA), l = SGO_DATA.getById(LIC_ABAS.OPORTUNIDADES, Lic_s_(p.OPORTUNIDADE_ID)) || {}, r = null;
  if (typeof Atividades_apiCriar !== 'function') r = { ok: false, message: 'Minhas atividades não está disponível neste ambiente' };
  else if (!eu || !eu.sessao) r = { ok: false, message: 'a sessão não chegou a esta ação (atualize a página)' };
  else {
    try {
      r = Atividades_apiCriar(eu.sessao, { titulo: Lic_texto_('Parecer ' + ar.rotulo + ': ' + Lic_s_(p.CODIGO) + ' · ' + Lic_s_(l.ORGAO_NOME), 200),
        descricao: 'A Diretoria pede o parecer da área ' + ar.nome + ' sobre a licitação ' + Lic_s_(p.CODIGO) + ' (' + Lic_texto_(l.ORGAO_NOME, 150) + (l.UF ? '/' + Lic_s_(l.UF) : '') + ').\n' +
          'Objeto: ' + Lic_texto_(l.OBJETO, 400) + '\nFoco do parecer: ' + ar.foco + '.\n' + (Lic_s_(p.PERGUNTA) ? 'O que a Diretoria quer saber: ' + Lic_s_(p.PERGUNTA) + '\n' : '') +
          'Onde registrar: Licitações › Meus pareceres (ou pelo link do e-mail). Escolha favorável, com ressalva ou contrário e escreva o motivo (pelo menos ' + LICPAR_MOTIVO_MIN + ' letras). Ao registrar, esta atividade é concluída sozinha.\n' +
          'O pedido vale até a Diretoria decidir; depois disso a oportunidade sai da sua tela.\n' + LicPar_marca_(p.ID),
        prazo: Lic_s_(p.PRAZO_DIA) + 'T' + LICPAR_HORA_PRAZO, prioridade: 'Alta', responsavelId: Lic_s_(p.USUARIO_ID), modulo: 'licitacoes', moduloNome: 'Licitações › Pareceres',
        porQue: 'A Diretoria decide a participação na licitação ' + Lic_s_(p.CODIGO) + ' com o parecer da área ' + ar.nome + '.', onde: 'Licitações › Meus pareceres', como: 'Ler a oportunidade na tela do pedido e registrar o parecer com o motivo.', restrita: 'SIM' });
    } catch (e) { r = { ok: false, message: Lic_s_(e && e.message) }; }
  }
  var id = r && r.ok && r.item ? Lic_s_(r.item.ID || r.item.id) : '', erro = id ? '' : Lic_texto_(Lic_s_(r && r.message) || 'Minhas atividades não respondeu', 400);
  try {
    Lic_comTrava_(function () { SGO_DATA.update(LICPAR_ABAS.PEDIDOS, p.ID, { ATIVIDADE_ID: id, ATIVIDADE_SITUACAO: id ? 'A fazer' : '', ATIVIDADE_ERRO: erro, ATIVIDADE_RESERVA_ATE: '', ATUALIZADO_EM: Lic_agora_() }); });
  } catch (e) { return id ? { id: id, erroVinculo: 'a atividade foi lançada, mas o vínculo com o pedido não gravou agora (' + Lic_s_(e && e.message) + '): daqui a ' + LICPAR_RESERVA_MIN + ' minutos toque em "Lançar a atividade de novo" e o SGO+ reconhece a atividade pela marca' } : { erro: erro }; }
  return id ? { id: id } : { erro: erro };
}
/** Alerta do pedido pela fila de Licitações (sob a trava de quem chama). Sai só no expediente. */
function LicPar_alertaPedido_(p, l, agora) {
  var u = { id: Lic_s_(p.USUARIO_ID), nome: Lic_s_(p.USUARIO_NOME) }, grupo = 'PP|' + Lic_s_(p.ID);
  var ja = Lic_ler_(LIC_ABAS.ALERTAS).some(function (a) { return Lic_s_(a.GRUPO) === grupo; });
  if (ja) return 0;
  var ar = LicPar_area_(p.AREA), liberar = typeof Lic_altaLiberarEm_ === 'function' ? Lic_altaLiberarEm_(Date.parse(agora)) : agora;
  SGO_DATA.insert(LIC_ABAS.ALERTAS, { AVISO_ID: Lic_avisoId_(), CHAVE: grupo + '|' + u.id, GRUPO: grupo, OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), EVENTO_ID: '', EVENTO_TIPO: '',
    TIPO: 'PARECER_PEDIDO', PAPEL: 'AVISO', ANTECEDENCIA_MIN: 0, ANTECEDENCIA: ar.codigo, NIVEL: 'IMPORTANTE', USUARIO_ID: u.id, USUARIO_NOME: u.nome, CANAIS: '',
    TITULO: 'Parecer ' + ar.rotulo + ' pedido pela Diretoria', TEXTO: '', ALVO_ISO: Lic_s_(p.PRAZO_ISO), LIBERAR_EM: liberar, SITUACAO: 'PROGRAMADO', TENTATIVAS: 0, ATUALIZADO_EM: agora, CRIADO_EM: agora });
  return 1;
}
/** Alerta "parecer recebido" para quem pediu (sob a trava de quem chama). Sai só no expediente. */
function LicPar_alertaRecebido_(par, pedido, l, agora) {
  var uid = Lic_s_(pedido.PEDIDO_POR_ID); if (!uid || uid === Lic_s_(par.USUARIO_ID)) return 0;   // quem pediu a si mesmo não recebe aviso de si mesmo
  var ativo = LicPar_ativos_().filter(function (u) { return u.id === uid; })[0]; if (!ativo) return 0;
  var ar = LicPar_area_(par.AREA), grupo = 'PR|' + Lic_s_(par.ID), liberar = typeof Lic_altaLiberarEm_ === 'function' ? Lic_altaLiberarEm_(Date.parse(agora)) : agora;
  SGO_DATA.insert(LIC_ABAS.ALERTAS, { AVISO_ID: Lic_avisoId_(), CHAVE: grupo + '|' + uid, GRUPO: grupo, OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), EVENTO_ID: '', EVENTO_TIPO: '',
    TIPO: 'PARECER_RECEBIDO', PAPEL: 'AVISO', ANTECEDENCIA_MIN: 0, ANTECEDENCIA: ar.codigo, NIVEL: Lic_up_(par.POSICAO) === 'CONTRARIO' ? 'IMPORTANTE' : 'NORMAL', USUARIO_ID: uid, USUARIO_NOME: ativo.nome, CANAIS: '',
    TITULO: 'Parecer ' + ar.rotulo + ' recebido: ' + (LICPAR_POSICOES[Lic_up_(par.POSICAO)] || '').toLowerCase(), TEXTO: '', ALVO_ISO: '', LIBERAR_EM: liberar, SITUACAO: 'PROGRAMADO', TENTATIVAS: 0, ATUALIZADO_EM: agora, CRIADO_EM: agora });
  return 1;
}

/** Pedir parecer: d = { id, area, usuarioId, prazo ('aaaa-mm-dd', opcional), pergunta (opcional) }. Só a Diretoria e o Administrador. */
function LicPar_pedir_(eu, d) {
  Lic_exigir_(eu, 'pedir parecer');
  var ar = LicPar_area_(d.area);
  if (!ar) throw new Error('Escolha a área do parecer (Licitações, Técnica, Financeira ou Comercial). Nada foi criado');
  var cfg = LicPar_cfg_(), cand = LicPar_candidatos_(ar.codigo, cfg), pessoa = cand.filter(function (u) { return u.id === Lic_s_(d.usuarioId); })[0];
  var temLista = (((cfg.areas || {})[ar.codigo] || {}).pessoas || []).length > 0;
  if (!cand.length) throw new Error('Não há ninguém ativo na área ' + ar.nome + (temLista ? ' na lista das alçadas (Portais e configurações › Alçadas e pareceres)' : ' no cadastro de usuários (Administração › Usuários › Área) nem na lista das alçadas (Portais e configurações › Alçadas e pareceres)') + '. Cadastre a pessoa e peça de novo. Nada foi criado');
  if (!pessoa) throw new Error('Escolha na lista quem dá o parecer ' + ar.rotulo + ' (pessoas ativas da área ' + ar.nome + '). Nada foi criado');
  var pergunta = LicPar_txt_(d.pergunta, 1000), agoraMs = Date.now();
  var r = Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), agora = Lic_agora_();
    if (LICPAR_SITUACOES_DECISAO.indexOf(Lic_s_(l.SITUACAO)) < 0) throw new Error('Não foi possível pedir o parecer: a oportunidade está "' + (LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || l.SITUACAO) + '". Parecer se pede antes da decisão (no Radar ou Em análise). Nada foi criado');
    var aberto = LicPar_pedidosDe_(l.ID).filter(function (p) { return LicPar_aberto_(p) && Lic_up_(p.AREA) === ar.codigo; })[0];
    if (aberto) throw new Error('Já existe um pedido de parecer ' + ar.rotulo + ' aberto para ' + Lic_s_(aberto.USUARIO_NOME) + ' (prazo ' + Lic_brDiaHora_(aberto.PRAZO_ISO) + '). Para trocar a pessoa ou o prazo, cancele esse pedido (com o motivo) e peça de novo. Nada foi criado');
    var pz = Lic_s_(d.prazo) ? LicPar_prazoEscolhido_(Lic_s_(d.prazo), agoraMs) : LicPar_prazoPadrao_(l, agoraMs);
    var reg = { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), AREA: ar.codigo, USUARIO_ID: pessoa.id, USUARIO_NOME: pessoa.nome, PERGUNTA: pergunta, PRAZO_DIA: pz.dia, PRAZO_ISO: pz.iso, PRAZO_REGRA: pz.regra,
      SITUACAO: 'ABERTO', ATIVIDADE_ID: '', ATIVIDADE_SITUACAO: '', ATIVIDADE_ERRO: '', ATIVIDADE_RESERVA_ATE: '', PEDIDO_POR_ID: eu.id, PEDIDO_POR_NOME: eu.nome, PEDIDO_EM: agora, ATUALIZADO_EM: agora };
    reg.HASH = LicPar_hashPedido_(reg);
    var ins = SGO_DATA.insert(LICPAR_ABAS.PEDIDOS, reg); reg.ID = Lic_s_(ins && ins.ID);
    var ant = LicPar_porArea_(LicPar_pareceresDe_(l.ID))[ar.codigo];
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'PARECER_PEDIDO', eu, { para: 'parecer ' + ar.rotulo + ' · ' + pessoa.nome, texto: 'Parecer ' + ar.rotulo + ' pedido a ' + pessoa.nome + ', prazo ' + pz.texto + ' (' + pz.regra + ')' + (pergunta ? '. Pergunta: ' + pergunta : '') + (ant && ant.atual ? '. Já existe o parecer versão ' + Lic_s_(ant.atual.VERSAO) + ': o novo será a versão seguinte, com o motivo da mudança.' : '.'), versao: LICPAR_REGRAS, fonte: LICPAR_FONTE, hash: reg.HASH });
    LicPar_alertaPedido_(reg, l, agora);
    return { pedido: reg, prazo: pz };
  });
  var at = LicPar_lancarAtividade_(eu, r.pedido.ID);
  return { pedido: LicPar_pedidoTela_(SGO_DATA.getById(LICPAR_ABAS.PEDIDOS, r.pedido.ID) || r.pedido), atividade: at,
    texto: 'Parecer ' + ar.rotulo + ' pedido a ' + pessoa.nome + ', prazo ' + r.prazo.texto + '. ' + (at.id ? 'A atividade foi lançada em Minhas atividades' + (at.recuperada ? ' (recuperada pela marca)' : '') + '.' : 'A atividade NÃO foi lançada em Minhas atividades (' + Lic_s_(at.erro).replace(/[.\s]+$/, '') + '): toque em "Lançar a atividade de novo" no pedido.') +
      (at.erroVinculo ? ' Atenção: ' + at.erroVinculo + '.' : '') + ' O aviso sai pela fila de alertas no expediente (08:00 às 18:00, dia útil).' };
}
/** De novo, para o pedido aberto sem atividade (a primeira tentativa falhou): acha pela marca ou lança. */
function LicPar_atividadeDeNovo_(eu, d) {
  Lic_exigir_(eu, 'lançar a atividade');
  var p = SGO_DATA.getById(LICPAR_ABAS.PEDIDOS, Lic_s_(d.pedidoId));
  if (!p) throw new Error('Não foi possível: o pedido não foi encontrado. Atualize a aba Pareceres');
  if (!LicPar_aberto_(p)) throw new Error('O pedido está ' + (LICPAR_SITUACOES_PEDIDO[Lic_up_(p.SITUACAO)] || p.SITUACAO).toLowerCase() + ': não há atividade a lançar. Nada foi criado');
  if (Lic_s_(p.ATIVIDADE_ID)) return { atividade: { id: Lic_s_(p.ATIVIDADE_ID), ja: true }, texto: 'A atividade já está em Minhas atividades. Nada foi repetido.' };
  var at = LicPar_lancarAtividade_(eu, p.ID);
  return { atividade: at, texto: at.id ? (at.recuperada ? 'A atividade já existia em Minhas atividades (achada pela marca do pedido): foi ligada ao pedido, nada foi repetido.' : 'A atividade foi lançada em Minhas atividades.') : 'Não foi possível lançar a atividade: ' + Lic_s_(at.erro).replace(/[.\s]+$/, '') + '. Tente de novo.' };
}
/** Cancelar o pedido aberto (com o motivo): a atividade é cancelada e os avisos que não saíram também. */
function LicPar_cancelar_(eu, d) {
  Lic_exigir_(eu, 'cancelar o pedido de parecer');
  var motivo = Lic_texto_(d.motivo, 1000);
  if (motivo.length < 10) throw new Error('Escreva por que o pedido é cancelado (pelo menos 10 letras): fica no histórico e vai para a atividade da pessoa. Nada foi alterado');
  var p = Lic_comTrava_(function () {
    var x = SGO_DATA.getById(LICPAR_ABAS.PEDIDOS, Lic_s_(d.pedidoId)), agora = Lic_agora_();
    if (!x) throw new Error('Não foi possível cancelar: o pedido não foi encontrado. Atualize a aba Pareceres');
    if (!LicPar_aberto_(x)) throw new Error('O pedido já está ' + (LICPAR_SITUACOES_PEDIDO[Lic_up_(x.SITUACAO)] || x.SITUACAO).toLowerCase() + '. Nada foi alterado');
    SGO_DATA.update(LICPAR_ABAS.PEDIDOS, x.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: agora, CANCELADO_POR_NOME: eu.nome, CANCELADO_MOTIVO: motivo, ATUALIZADO_EM: agora });
    LicPar_fecharAlertas_(x.ID, 'Pedido de parecer cancelado por ' + eu.nome + ': ' + motivo, null, agora);
    var ar = LicPar_area_(x.AREA);
    Lic_historico_('OPORTUNIDADE', x.OPORTUNIDADE_ID, x.CODIGO, 'PARECER_PEDIDO_CANCELADO', eu, { de: 'pedido aberto para ' + Lic_s_(x.USUARIO_NOME), para: 'cancelado', texto: 'Pedido de parecer ' + ar.rotulo + ' cancelado. Motivo: ' + motivo, versao: LICPAR_REGRAS, fonte: LICPAR_FONTE, hash: Lic_s_(x.HASH) });
    return x;
  });
  var aviso = '', jaFechada = Lic_s_(p.ATIVIDADE_ID) && LicPar_atividadeAberta_(p.ATIVIDADE_ID) === false;
  if (Lic_s_(p.ATIVIDADE_ID) && !jaFechada && typeof Atividades_apiMudarSituacao === 'function' && eu.sessao) {
    try { var r = Atividades_apiMudarSituacao(eu.sessao, { id: Lic_s_(p.ATIVIDADE_ID), situacao: 'Cancelada', motivo: Lic_texto_('Pedido de parecer cancelado pela Diretoria: ' + motivo, 1500) }); if (!r || !r.ok) aviso = Lic_s_(r && r.message); else SGO_DATA.update(LICPAR_ABAS.PEDIDOS, p.ID, { ATIVIDADE_SITUACAO: 'Cancelada' }); } catch (e) { aviso = Lic_s_(e && e.message); }
  }
  return { texto: 'Pedido cancelado.' + (aviso ? ' A atividade em Minhas atividades não foi cancelada (' + aviso.replace(/[.\s]+$/, '') + '): cancele lá.' : jaFechada ? ' A atividade em Minhas atividades já estava concluída ou cancelada: não foi mexida.' : Lic_s_(p.ATIVIDADE_ID) ? ' A atividade em Minhas atividades foi cancelada.' : '') };
}
/** Avisos do pedido (sob a trava): os que não saíram são cancelados; os que saíram ganham a ciência de quem agiu (quem = null: só cancela). */
function LicPar_fecharAlertas_(pedidoId, motivo, quem, agora) {
  var grupo = 'PP|' + Lic_s_(pedidoId);
  Lic_ler_(LIC_ABAS.ALERTAS).forEach(function (a) {
    if (Lic_s_(a.GRUPO) !== grupo) return;
    var s = Lic_up_(a.SITUACAO);
    if (s === 'PROGRAMADO' || s === 'ENVIANDO') SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: agora, CANCELADO_MOTIVO: Lic_texto_(motivo, 500), ESCALONAR_EM: '', ATUALIZADO_EM: agora });
    else if (quem && !Lic_s_(a.CIENTE_EM) && LIC_SITUACOES_SEM_CIENCIA.indexOf(s) >= 0) SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'CIENTE', CIENTE_EM: agora, CIENTE_POR_ID: Lic_s_(quem.id), CIENTE_POR_NOME: Lic_s_(quem.nome), CIENTE_CANAL: 'SGO_TELA', ESCALONAR_EM: '', ATUALIZADO_EM: agora });
  });
}

// ------------------------------------------------------------ tela da pessoa do pedido (só a oportunidade dela, sem custo)
/** O pedido que a pessoa pode abrir agora, ou a recusa com o motivo (o quê, por quê, o que fazer). */
function LicPar_pedidoDaPessoa_(eu, pedidoId) {
  var p = SGO_DATA.getById(LICPAR_ABAS.PEDIDOS, Lic_s_(pedidoId));
  if (!p) throw new Error('Não foi possível abrir: o pedido de parecer não foi encontrado (o link pode ser de outro ambiente). Abra Licitações › Meus pareceres');
  if (Lic_s_(p.USUARIO_ID) !== Lic_s_(eu.id) && !eu.gestao) throw new Error('Não foi possível abrir: este pedido de parecer é de ' + Lic_s_(p.USUARIO_NOME) + '. Você só vê as oportunidades dos pedidos feitos a você, enquanto estão abertos');
  if (Lic_s_(p.USUARIO_ID) !== Lic_s_(eu.id)) return p;   // gestão acompanhando o pedido de outra pessoa
  if (!LicPar_aberto_(p)) throw new Error('Este pedido está ' + (LICPAR_SITUACOES_PEDIDO[Lic_up_(p.SITUACAO)] || p.SITUACAO).toLowerCase() + (Lic_up_(p.SITUACAO) === 'CANCELADO' ? ' (' + Lic_s_(p.CANCELADO_MOTIVO) + ')' : '') + ': a oportunidade saiu da sua tela. Se precisar mudar o parecer, peça à Diretoria um pedido novo');
  var l = SGO_DATA.getById(LIC_ABAS.OPORTUNIDADES, Lic_s_(p.OPORTUNIDADE_ID));
  if (!l || Lic_s_(l.EXCLUIDO_EM)) throw new Error('A oportunidade deste pedido não está mais na lista de Licitações. Fale com a Diretoria');
  if (LICPAR_SITUACOES_DECISAO.indexOf(Lic_s_(l.SITUACAO)) < 0) throw new Error('A Diretoria já decidiu esta licitação (agora "' + (LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || l.SITUACAO) + '"): o pedido de parecer não vale mais e a oportunidade saiu da sua tela. Nada foi alterado');
  return p;
}
/** Pedidos da pessoa: os abertos (com a oportunidade) e os últimos respondidos ou cancelados (sem a oportunidade). A gestão vê também os abertos de todos. */
function LicPar_meus_(eu) {
  if (LicPar_fora_(eu.perfil)) throw new Error('Não foi possível abrir: Licitações é da equipe da Metrolabs');
  var agoraMs = Date.now(), todos = Lic_ler_(LICPAR_ABAS.PEDIDOS), ops = {};
  Lic_ativas_().forEach(function (l) { ops[Lic_s_(l.ID)] = l; });
  var meus = todos.filter(function (p) { return Lic_s_(p.USUARIO_ID) === Lic_s_(eu.id); });
  var vale = function (p) { var l = ops[Lic_s_(p.OPORTUNIDADE_ID)]; return LicPar_aberto_(p) && l && LICPAR_SITUACOES_DECISAO.indexOf(Lic_s_(l.SITUACAO)) >= 0; };
  var cartao = function (p) { var l = ops[Lic_s_(p.OPORTUNIDADE_ID)] || {}, x = LicPar_pedidoTela_(p, agoraMs); x.orgao = Lic_s_(l.ORGAO_NOME); x.local = (Lic_s_(l.MUNICIPIO) ? Lic_s_(l.MUNICIPIO) + '/' : '') + Lic_s_(l.UF); x.objeto = Lic_texto_(l.OBJETO, 300); x.encerramentoIso = Lic_s_(l.ENCERRAMENTO_ISO); x.encerramentoTxt = Lic_brDiaHora_(l.ENCERRAMENTO_ISO); return x; };
  var abertos = meus.filter(vale).map(cartao).sort(function (a, b) { return a.prazoIso < b.prazoIso ? -1 : 1; });
  var fechados = meus.filter(function (p) { return !vale(p); }).sort(function (a, b) { return Lic_s_(b.ATUALIZADO_EM) < Lic_s_(a.ATUALIZADO_EM) ? -1 : 1; }).slice(0, 10)
    .map(function (p) { return { id: Lic_s_(p.ID), codigo: Lic_s_(p.CODIGO), areaNome: (LicPar_area_(p.AREA) || {}).nome || '', situacao: LicPar_aberto_(p) ? 'DECIDIDA' : Lic_up_(p.SITUACAO), situacaoNome: LicPar_aberto_(p) ? 'Decisão tomada pela Diretoria' : (LICPAR_SITUACOES_PEDIDO[Lic_up_(p.SITUACAO)] || ''), quando: Lic_brDiaHora_(Lic_s_(p.RESPONDIDO_EM) || Lic_s_(p.CANCELADO_EM) || Lic_s_(p.ATUALIZADO_EM)) }; });
  var r = { eu: { id: eu.id, nome: eu.nome, gestao: !!eu.gestao }, abertos: abertos, fechados: fechados, motivoMin: LICPAR_MOTIVO_MIN };
  if (eu.gestao) r.todosAbertos = todos.filter(vale).map(cartao).sort(function (a, b) { return a.prazoIso < b.prazoIso ? -1 : 1; });
  return r;
}
/** Tela do pedido: a oportunidade (resumo, nota, leitura do edital, preço sem custo, habilitação), o pedido e o parecer que vale da área. */
function LicPar_tela_(eu, d) {
  if (LicPar_fora_(eu.perfil)) throw new Error('Não foi possível abrir: Licitações é da equipe da Metrolabs');
  var p = LicPar_pedidoDaPessoa_(eu, d.pedidoId), l = Lic_acharOp_(p.OPORTUNIDADE_ID), ctx = LicPar_contexto_(l), gestao = !!eu.gestao;
  var an = ctx.analise, crit = Lic_json_(an && an.CRITERIOS_JSON, {}) || {};
  var nota = l.NOTA === '' || l.NOTA === null || l.NOTA === undefined || !isFinite(Number(l.NOTA)) ? null : Number(l.NOTA);
  // revisão de e361160: o preço por área. Técnica e Comercial não veem preço nenhum; Licitações vê o preço da proposta; Financeira (e a
  // gestão) vê custo, piso, margem e o preço da simulação
  var s = ctx.simResumo, preco = null, areaP = Lic_up_(p.AREA), nivelPreco = gestao || areaP === 'FINANCEIRA' ? 'COMPLETO' : areaP === 'LICITACOES' ? 'PROPOSTA' : 'NENHUM';
  if (s && nivelPreco !== 'NENHUM') {
    preco = { versao: s.versao, em: s.em, totalProposta: s.totalProposta, totalEdital: s.totalEdital, pendencias: s.pendencias };
    if (nivelPreco === 'COMPLETO') { preco.acimaDoPiso = s.acimaDoPiso; preco.abaixoPiso = s.abaixoPiso; preco.totalPiso = s.totalPiso; preco.totalCusto = s.totalCusto; preco.margemPct = s.margemPct; }
  }
  var porArea = LicPar_porArea_(ctx.pareceres), ar = LicPar_area_(p.AREA), atual = porArea[ar.codigo] && porArea[ar.codigo].atual;
  return {
    pedido: LicPar_pedidoTela_(p), meu: Lic_s_(p.USUARIO_ID) === Lic_s_(eu.id), podeRegistrar: Lic_s_(p.USUARIO_ID) === Lic_s_(eu.id) && LicPar_aberto_(p), gestao: gestao, motivoMin: LICPAR_MOTIVO_MIN,
    op: { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), orgao: Lic_s_(l.ORGAO_NOME), unidade: Lic_s_(l.UNIDADE_NOME), uf: Lic_s_(l.UF), municipio: Lic_s_(l.MUNICIPIO), objeto: Lic_texto_(l.OBJETO, 2000),
      modalidade: Lic_s_(l.MODALIDADE), lei: Lic_s_(l.LEI), numeroControle: Lic_s_(l.NUMERO_CONTROLE_PNCP), valor: Number(l.VALOR_ESTIMADO) > 0 ? Number(l.VALOR_ESTIMADO) : null,
      encerramentoIso: Lic_s_(l.ENCERRAMENTO_ISO), encerramentoTxt: Lic_brDiaHora_(l.ENCERRAMENTO_ISO), situacaoNome: LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || Lic_s_(l.SITUACAO) },
    nota: { nota: nota, classe: Lic_s_(l.NOTA_CLASSE), classeNome: (typeof LIC_CLASSES !== 'undefined' && LIC_CLASSES[Lic_s_(l.NOTA_CLASSE)]) || Lic_s_(l.NOTA_CLASSE), versao: an ? Number(an.VERSAO) || 0 : 0,
      resumo: an ? Lic_texto_(an.RESUMO, 2000) : '', travasAConfirmar: Number(l.TRAVAS_A_CONFIRMAR) || 0, trava: Lic_s_(l.NOTA_TRAVA),
      // a "margem" sai sem o texto do cálculo para quem não é da gestão (o texto cita a sobra e o piso)
      criterios: Object.keys(crit).map(function (k) { var c = crit[k] || {}; return { codigo: k, nome: (typeof LIC_ALTA_CRITERIOS_NOMES !== 'undefined' && LIC_ALTA_CRITERIOS_NOMES[k]) || k, pontos: Number(c.pontos), peso: Number(c.peso), como: k === 'margem' && nivelPreco !== 'COMPLETO' ? '' : Lic_texto_(c.como, 300) }; }) },
    leitura: LicPar_leitura_(l), preco: preco, nivelPreco: nivelPreco, temSimulacao: !!s, habilitacao: ctx.habilitacao,
    // 03/11/2026 (inteligência de mercado, SGO_Licitacoes_Mercado.js): quem costuma ganhar neste órgão e neste tipo de objeto e, conforme a
    // área (o mesmo nivelPreco), o preço praticado; Técnica e Comercial veem só nomes e contagens, sem valor nenhum
    mercado: typeof LicM_paraParecer_ === 'function' ? LicM_paraParecer_(l, nivelPreco) : null,
    atual: atual ? LicPar_parecerTela_(atual) : null, posicoes: LICPAR_POSICOES
  };
}
/**
 * Registrar o parecer: d = { pedidoId, posicao: FAVORAVEL|RESSALVA|CONTRARIO, motivo (pelo menos 20 letras), motivoNovaVersao (quando já
 * existe parecer da área) }. Só a pessoa do pedido, com o pedido aberto e antes da decisão. Uma linha nova (versão), nunca alterada.
 */
function LicPar_registrar_(eu, d) {
  if (LicPar_fora_(eu.perfil)) throw new Error('Não foi possível registrar: Licitações é da equipe da Metrolabs');
  var pos = Lic_up_(d.posicao), motivo = LicPar_txt_(d.motivo, 3000), motNova = LicPar_txt_(d.motivoNovaVersao, 1000);
  if (!LICPAR_POSICOES[pos]) throw new Error('Escolha o parecer: favorável, com ressalva ou contrário. Nada foi gravado');
  if (LicPar_letras_(motivo) < LICPAR_MOTIVO_MIN) throw new Error('Escreva o motivo do parecer com pelo menos ' + LICPAR_MOTIVO_MIN + ' letras (o que você conferiu e por que chegou a essa posição): ele fica no histórico com o seu nome e a data. Nada foi gravado');
  var r = Lic_comTrava_(function () {
    var p = LicPar_pedidoDaPessoa_(eu, d.pedidoId);
    if (Lic_s_(p.USUARIO_ID) !== Lic_s_(eu.id)) throw new Error('Não foi possível registrar: este pedido é de ' + Lic_s_(p.USUARIO_NOME) + '; só ele registra o parecer. Nada foi gravado');
    var l = Lic_acharOp_(p.OPORTUNIDADE_ID), ar = LicPar_area_(p.AREA), agora = Lic_agora_(), ctx = LicPar_contexto_(l), porArea = LicPar_porArea_(ctx.pareceres), ant = porArea[ar.codigo] && porArea[ar.codigo].atual;
    var ultimaVersao = porArea[ar.codigo] ? Math.max.apply(null, porArea[ar.codigo].versoes.map(function (x) { return Number(x.VERSAO) || 0; })) : 0;
    if (ant && LicPar_letras_(motNova) < 10) throw new Error('Já existe o parecer ' + ar.rotulo + ' versão ' + Lic_s_(ant.VERSAO) + ' (' + Lic_s_(ant.USUARIO_NOME) + ', ' + (LICPAR_POSICOES[Lic_up_(ant.POSICAO)] || '').toLowerCase() + '). O novo substitui esse: escreva o que mudou (pelo menos 10 letras). Nada foi gravado');
    var leit = LicPar_leitura_(l);
    var base = { nota: l.NOTA === '' || l.NOTA === undefined ? null : Number(l.NOTA), classe: Lic_s_(l.NOTA_CLASSE), analiseVersao: ctx.analise ? Number(ctx.analise.VERSAO) || 0 : 0, simulacaoVersao: ctx.sim ? Number(ctx.sim.VERSAO) || 0 : 0,
      leituraVersao: leit && leit.versao ? leit.versao : 0, fonteVersao: Number(l.VERSAO_FONTE) || 1, situacao: Lic_s_(l.SITUACAO), pedidoPrazo: Lic_s_(p.PRAZO_ISO), foraDoPrazo: Date.parse(Lic_s_(p.PRAZO_ISO)) < Date.now() };
    var reg = { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), AREA: ar.codigo, VERSAO: ultimaVersao + 1, POSICAO: pos, MOTIVO: motivo, MOTIVO_NOVA_VERSAO: ant ? motNova : '', PEDIDO_ID: Lic_s_(p.ID), SUBSTITUI_ID: ant ? Lic_s_(ant.ID) : '',
      USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, USUARIO_PERFIL: eu.perfil, BASE_JSON: JSON.stringify(base), REGRAS: LICPAR_REGRAS, EM: agora };
    reg.HASH = LicPar_hashParecer_(reg);
    var ins = SGO_DATA.insert(LICPAR_ABAS.PARECERES, reg); reg.ID = Lic_s_(ins && ins.ID);
    SGO_DATA.update(LICPAR_ABAS.PEDIDOS, p.ID, { SITUACAO: 'RESPONDIDO', RESPONDIDO_EM: agora, PARECER_ID: reg.ID, ATUALIZADO_EM: agora });
    LicPar_fecharAlertas_(p.ID, 'Parecer registrado por ' + eu.nome + ' antes do envio do aviso.', eu, agora);
    LicPar_alertaRecebido_(reg, p, l, agora);
    Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'PARECER_REGISTRADO', eu, { de: ant ? 'versão ' + Lic_s_(ant.VERSAO) + ': ' + (LICPAR_POSICOES[Lic_up_(ant.POSICAO)] || '').toLowerCase() : 'sem parecer', para: 'versão ' + reg.VERSAO + ': ' + LICPAR_POSICOES[pos].toLowerCase(),
      texto: 'Parecer ' + ar.rotulo + ' ' + LICPAR_POSICOES[pos].toLowerCase() + ': ' + motivo + (ant ? ' (substitui a versão ' + Lic_s_(ant.VERSAO) + '; o que mudou: ' + motNova + ')' : '') + (base.foraDoPrazo ? ' Registrado depois do prazo do pedido (' + Lic_brDiaHora_(p.PRAZO_ISO) + ').' : ''),
      versao: 'parecer v' + reg.VERSAO + ' · análise v' + base.analiseVersao + ' · simulação v' + base.simulacaoVersao, fonte: LICPAR_FONTE, hash: reg.HASH });
    return { reg: reg, pedido: p, ar: ar };
  });
  var aviso = '';
  if (Lic_s_(r.pedido.ATIVIDADE_ID) && typeof Atividades_apiMudarSituacao === 'function' && eu.sessao) {
    try { var x = Atividades_apiMudarSituacao(eu.sessao, { id: Lic_s_(r.pedido.ATIVIDADE_ID), situacao: 'Concluída', observacao: Lic_texto_('Parecer ' + r.ar.rotulo + ' registrado em Licitações (versão ' + r.reg.VERSAO + ', ' + LICPAR_POSICOES[pos].toLowerCase() + ').', 1000) }); if (!x || !x.ok) aviso = Lic_s_(x && x.message); else SGO_DATA.update(LICPAR_ABAS.PEDIDOS, r.pedido.ID, { ATIVIDADE_SITUACAO: 'Concluída' }); } catch (e) { aviso = Lic_s_(e && e.message); }
  }
  return { parecer: LicPar_parecerTela_(r.reg), texto: 'Parecer ' + r.ar.rotulo + ' registrado (versão ' + r.reg.VERSAO + ', ' + LICPAR_POSICOES[pos].toLowerCase() + '). A Diretoria recebe o aviso; o parecer não muda mais (uma mudança é uma versão nova, num pedido novo).' +
    (aviso ? ' A atividade em Minhas atividades não foi concluída sozinha (' + aviso.replace(/[.\s]+$/, '') + '): conclua lá.' : Lic_s_(r.pedido.ATIVIDADE_ID) ? ' A atividade em Minhas atividades foi concluída.' : '') };
}

// ------------------------------------------------------------ aba Pareceres da ficha (Diretoria) e a aprovação por alçada
/** Grava UMA aprovação (sob a trava de quem chama): valor, faixa, simulação aprovada, alçadas em vigor (congeladas), pareceres e divergências. */
function LicPar_gravarAprovacao_(eu, l, al, ctx, motivo, origem, agora) {
  var div = LicPar_divergencias_(l, al.porArea, ctx);
  var reg = { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), TIPO: 'PARTICIPAR', USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, MOTIVO: motivo, VALOR_BASE: al.valor === null ? '' : al.valor, VALOR_ORIGEM: al.valorOrigem,
    FAIXA: al.faixaTxt, APROVACOES_NECESSARIAS: al.necessarias, ALCADA_VERSAO: al.versao || 0, PARECERES_JSON: JSON.stringify(LICPAR_AREAS.filter(function (a) { return al.porArea[a.codigo] && al.porArea[a.codigo].atual; }).map(function (a) { var p = al.porArea[a.codigo].atual; return { area: a.codigo, versao: Number(p.VERSAO) || 1, posicao: Lic_up_(p.POSICAO), por: Lic_s_(p.USUARIO_NOME), hash: Lic_s_(p.HASH) }; })),
    DIVERGENCIAS_JSON: JSON.stringify(div.map(function (x) { return { codigo: x.codigo, area: x.area, texto: x.texto }; })), EM: agora,
    SIMULACAO_VERSAO: al.simVersao || 0, ALCADA_JSON: LicPar_cfgJson_(al.cfg), ORIGEM: origem || 'APROVACAO' };
  reg.HASH = LicPar_hashAprovacao_(reg);
  var ins = SGO_DATA.insert(LICPAR_ABAS.APROVACOES, reg); reg.ID = Lic_s_(ins && ins.ID);
  if (origem && origem !== 'APROVACAO') Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'APROVACAO_REGISTRADA', eu, { para: 'aprovação de ' + eu.nome, texto: 'Aprovação da participação por ' + eu.nome + ' ao ' + (origem === 'CONTRATO' ? 'registrar o contrato' : 'abrir a disputa') + ' direto de "' + (LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || l.SITUACAO) + '" (faixa ' + al.faixaTxt + ', simulação versão ' + (al.simVersao || 0) + ', alçadas ' + (al.versao ? 'versão ' + al.versao : 'padrão') + '). Motivo: ' + motivo, versao: LICPAR_REGRAS, fonte: origem === 'CONTRATO' ? 'Contratos' : 'Central de disputas', hash: reg.HASH });
  return reg;
}
/**
 * Revisão de e361160 (ALTA 1): a decisão tomada (participação aprovada, descarte, disputa aberta, contrato registrado) fecha os pedidos de
 * parecer abertos da oportunidade: o pedido fica CANCELADO com o motivo, os avisos que não saíram são cancelados e a atividade de cada um é
 * cancelada pela própria função de Minhas atividades (com a sessão de quem decidiu). Reabrir não traz o pedido de volta: a Diretoria pede
 * de novo. Fora da trava (chama Minhas atividades). Nunca lança: devolve { cancelados, erros }.
 */
function LicPar_fecharPedidosDaOp_(eu, oid, motivo) {
  var out = { cancelados: 0, erros: [] }, fechados = [];
  try {
    fechados = Lic_comTrava_(function () {
      var agora = Lic_agora_(), lista = [];
      LicPar_pedidosDe_(oid).filter(LicPar_aberto_).forEach(function (p) {
        SGO_DATA.update(LICPAR_ABAS.PEDIDOS, p.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: agora, CANCELADO_POR_NOME: Lic_s_(eu && eu.nome) || 'Sistema', CANCELADO_MOTIVO: Lic_texto_(motivo, 1000), ATUALIZADO_EM: agora });
        LicPar_fecharAlertas_(p.ID, 'Pedido de parecer encerrado: ' + motivo, null, agora);
        Lic_historico_('OPORTUNIDADE', p.OPORTUNIDADE_ID, p.CODIGO, 'PARECER_PEDIDO_CANCELADO', eu, { de: 'pedido aberto para ' + Lic_s_(p.USUARIO_NOME), para: 'cancelado', texto: 'Pedido de parecer ' + (LicPar_area_(p.AREA) || {}).rotulo + ' encerrado pela decisão: ' + motivo + '. Se a oportunidade for reaberta, a Diretoria pede de novo.', versao: LICPAR_REGRAS, fonte: LICPAR_FONTE, hash: Lic_s_(p.HASH) });
        lista.push(p);
      });
      return lista;
    });
  } catch (e) { out.erros.push(Lic_s_(e && e.message)); return out; }
  out.cancelados = fechados.length;
  fechados.forEach(function (p) {
    if (!Lic_s_(p.ATIVIDADE_ID)) return;
    // revisão de bf3860b: atividade já concluída ou cancelada não é mexida
    if (LicPar_atividadeAberta_(p.ATIVIDADE_ID) === false) return;
    if (typeof Atividades_apiMudarSituacao !== 'function' || !eu || !eu.sessao) { out.erros.push(Lic_s_(p.USUARIO_NOME) + ': Minhas atividades não está disponível agora'); return; }
    try {
      var r = Atividades_apiMudarSituacao(eu.sessao, { id: Lic_s_(p.ATIVIDADE_ID), situacao: 'Cancelada', motivo: Lic_texto_('Pedido de parecer encerrado pela decisão da Diretoria: ' + motivo, 1500) });
      if (r && r.ok) SGO_DATA.update(LICPAR_ABAS.PEDIDOS, p.ID, { ATIVIDADE_SITUACAO: 'Cancelada' }); else out.erros.push(Lic_s_(p.USUARIO_NOME) + ': ' + Lic_s_(r && r.message));
    } catch (e) { out.erros.push(Lic_s_(p.USUARIO_NOME) + ': ' + Lic_s_(e && e.message)); }
  });
  return out;
}
/** Texto da resposta sobre os pedidos fechados pela decisão ('' = nenhum). */
function LicPar_fechadosTxt_(x) {
  if (!x || (!x.cancelados && !x.erros.length)) return '';
  return (x.cancelados ? ' ' + x.cancelados + ' pedido(s) de parecer aberto(s) foram cancelados, com as atividades.' : '') + (x.erros.length ? ' Não foi possível cancelar em Minhas atividades (cancele lá): ' + x.erros.join('; ') + '.' : '');
}
function LicPar_ficha_(eu, d) {
  Lic_exigir_(eu, 'abrir os pareceres');
  var l = Lic_acharOp_(d.id), ctx = LicPar_contexto_(l), al = LicPar_alcada_(l, ctx, eu), porArea = al.porArea, cfg = al.cfg, ativos = LicPar_ativos_(), agoraMs = Date.now();
  var pedidos = LicPar_pedidosDe_(l.ID).sort(function (a, b) { return Lic_s_(b.PEDIDO_EM) < Lic_s_(a.PEDIDO_EM) ? -1 : 1; });
  var antes = LICPAR_SITUACOES_DECISAO.indexOf(Lic_s_(l.SITUACAO)) >= 0, pz = LicPar_prazoPadrao_(l, agoraMs);
  var euJa = al.aprovacoes.some(function (a) { return a.id === eu.id; });
  return {
    op: { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), situacao: Lic_s_(l.SITUACAO), situacaoNome: LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || Lic_s_(l.SITUACAO), antesDaDecisao: antes },
    areas: LICPAR_AREAS.map(function (a) {
      var pa = porArea[a.codigo], ab = pedidos.filter(function (p) { return LicPar_aberto_(p) && Lic_up_(p.AREA) === a.codigo; })[0];
      return { codigo: a.codigo, nome: a.nome, rotulo: a.rotulo, foco: a.foco, obrigatorio: al.obrigatorios.indexOf(a.codigo) >= 0, candidatos: LicPar_candidatos_(a.codigo, cfg, ativos).map(function (u) { return { id: u.id, nome: u.nome }; }),
        pedidoAberto: ab ? LicPar_pedidoTela_(ab, agoraMs) : null, parecer: pa && pa.atual ? LicPar_parecerTela_(pa.atual) : null, versoes: pa ? pa.versoes.map(LicPar_parecerTela_) : [] };
    }),
    pedidos: pedidos.map(function (p) { return LicPar_pedidoTela_(p, agoraMs); }),
    consolidacao: { divergencias: LicPar_divergencias_(l, porArea, ctx), pareceres: LicPar_pareceresTxt_(porArea), sim: ctx.simResumo ? { versao: ctx.simResumo.versao, acimaDoPiso: ctx.simResumo.acimaDoPiso, abaixoPiso: ctx.simResumo.abaixoPiso } : null,
      capacidade: ctx.capacidade, nota: l.NOTA === '' || l.NOTA === undefined ? null : Number(l.NOTA), fonte: 'Divergências calculadas pelo sistema (regras ' + LICPAR_REGRAS + '), sem IA: pareceres que valem × análise, simulação de preço e habilitação.' },
    alcada: { versao: al.versao, padrao: al.padrao, congelada: al.congelada, simVersao: al.simVersao, valor: al.valor, valorOrigem: al.valorOrigem, faixaTxt: al.faixaTxt, necessarias: al.necessarias, obrigatorios: al.obrigatorios.map(function (c) { return LicPar_area_(c).nome; }),
      aprovacoes: al.aprovacoes, faltas: al.faltas, ok: al.ok, base: LICPAR_BASES[cfg.base] },
    temSimulacao: !!ctx.sim, prazoPadrao: pz, podeAprovar: antes && !euJa, euJaAprovou: euJa, motivoMin: LICPAR_MOTIVO_MIN, regras: LICPAR_REGRAS
  };
}
/**
 * Aprovar a participação (aba Pareceres ou Kanban): d = { id, motivo (10 letras ou mais), fonte }. Exige a simulação salva e os pareceres
 * obrigatórios da faixa. Grava a aprovação da pessoa (uma por pessoa); completa a alçada, a oportunidade vai para Decisão (participar).
 * Faltando aprovação: a aprovação fica registrada e a passagem é recusada com o que falta (transicao: false).
 */
function LicPar_aprovar_(eu, d) {
  Lic_exigir_(eu, 'aprovar a participação');
  var motivo = Lic_texto_(d.motivo, 1000);
  if (motivo.length < 10) throw new Error('Escreva o motivo da aprovação (pelo menos 10 letras): ele fica no histórico com o seu nome e a data. Nada foi alterado');
  var r = Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), agora = Lic_agora_();
    if (Lic_s_(l.SITUACAO) === 'DECISAO') throw new Error('A participação já foi aprovada (a oportunidade está em Decisão). Nada foi alterado');
    if (LICPAR_SITUACOES_DECISAO.indexOf(Lic_s_(l.SITUACAO)) < 0) throw new Error('Não foi possível aprovar a participação: a oportunidade está "' + (LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || l.SITUACAO) + '". ' + (Lic_s_(l.SITUACAO) === 'DESCARTADA' ? 'Reabra antes (com o motivo). ' : '') + 'Nada foi alterado');
    var ctx = LicPar_contexto_(l);
    if (!ctx.sim) throw new Error('Não foi possível aprovar a participação: falta a simulação de preço salva (aba Preço). O preço mínimo da proposta é o piso dessa simulação, aprovado pela Diretoria ao salvar. Nada foi alterado');
    var al = LicPar_alcada_(l, ctx, null);
    if (al.faltamPareceres.length) throw new Error('Não foi possível aprovar a participação: ' + al.faltas[0] + '. Peça o parecer na aba Pareceres. Nada foi alterado');
    var ja = al.aprovacoes.filter(function (a) { return a.id === eu.id; })[0];
    if (ja && al.aprovacoes.length < al.necessarias) throw new Error('Você já aprovou em ' + ja.emBr + ': ' + al.faltas.join('; ') + ', de outra pessoa da Diretoria. Nada foi alterado');
    var div = LicPar_divergencias_(l, al.porArea, ctx);
    if (!ja) LicPar_gravarAprovacao_(eu, l, al, ctx, motivo, 'APROVACAO', agora);
    var nomes = al.aprovacoes.map(function (a) { return a.nome; }).concat(ja ? [] : [eu.nome]), conta = nomes.length;
    var txtBase = 'faixa ' + al.faixaTxt + ' (' + (al.valor === null ? 'sem valor' : LicPar_moeda_(al.valor) + ', ' + al.valorOrigem) + ', alçadas ' + (al.versao ? 'versão ' + al.versao : 'padrão') + '); pareceres: ' + LicPar_pareceresTxt_(al.porArea) + (div.length ? '; ' + div.length + ' divergência(s) apontada(s) pelo sistema' : '; nenhuma divergência apontada');
    if (conta < al.necessarias) {
      var al2 = LicPar_alcada_(l, LicPar_contexto_(l), null);
      Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'APROVACAO_REGISTRADA', eu, { de: (conta - 1) + ' de ' + al.necessarias, para: conta + ' de ' + al.necessarias, texto: 'Aprovação da participação por ' + eu.nome + ' (' + conta + ' de ' + al.necessarias + '). Motivo: ' + motivo + '. ' + txtBase + '. A passagem para Decisão espera: ' + al2.faltas.join('; ') + '.', versao: LICPAR_REGRAS, fonte: d.fonte === 'Kanban' ? 'Kanban' : LICPAR_FONTE });
      return { transicao: false, conta: conta, necessarias: al.necessarias, faltas: al2.faltas, l: l };
    }
    var texto = 'Participação aprovada pela Diretoria: ' + LicPar_juntar_(nomes) + ' (' + conta + ' de ' + al.necessarias + ' aprovação(ões) da alçada). Motivo: ' + motivo + '. ' + txtBase + '.';
    var mud = Lic_mudarSituacaoSemTrava_(eu, { id: l.ID, textoHistorico: texto, fonte: d.fonte === 'Kanban' ? 'Kanban' : LICPAR_FONTE }, LICPAR_SITUACOES_DECISAO, 'DECISAO', 'PARTICIPACAO_APROVADA', {}, 'aprovar a participação');
    return { transicao: true, conta: conta, necessarias: al.necessarias, nomes: nomes, hash: mud.hash, l: l, divergencias: div.length };
  });
  if (r.transicao) {
    Lic_aposSituacao_(d.id, r);
    // revisão de e361160: a decisão foi tomada: os pedidos ainda abertos são cancelados, com as atividades
    var fx = LicPar_fecharPedidosDaOp_(eu, d.id, 'participação aprovada pela alçada');
    return { aprovado: true, transicao: true, situacao: 'DECISAO', pedidosCancelados: fx.cancelados, texto: 'Participação aprovada (' + r.conta + ' de ' + r.necessarias + '): a licitação foi para Decisão (participar). Próximo passo: monte e emita a proposta (aba Proposta) e abra a disputa (aba Disputa).' + (r.divergencias ? ' Atenção: ' + r.divergencias + ' divergência(s) entre os pareceres e os dados ficaram no histórico.' : '') + LicPar_fechadosTxt_(fx) };
  }
  return { aprovado: true, transicao: false, faltas: r.faltas, texto: 'Sua aprovação ficou registrada (' + r.conta + ' de ' + r.necessarias + '). A passagem para Decisão (participar) foi recusada: ' + r.faltas.join('; ') + '.' };
}
/** Quantos pedidos abertos e válidos a pessoa tem (menu "Meus pareceres" para quem não é da Diretoria). Nunca lança. */
function LicPar_abertosDe_(uid) {
  try {
    var ops = {}; Lic_ativas_().forEach(function (l) { ops[Lic_s_(l.ID)] = l; });
    return Lic_ler_(LICPAR_ABAS.PEDIDOS).filter(function (p) { var l = ops[Lic_s_(p.OPORTUNIDADE_ID)]; return LicPar_aberto_(p) && Lic_s_(p.USUARIO_ID) === Lic_s_(uid) && l && LICPAR_SITUACOES_DECISAO.indexOf(Lic_s_(l.SITUACAO)) >= 0; }).length;
  } catch (e) { return 0; }
}

// ------------------------------------------------------------ alertas (chamados por SGO_Licitacoes_Alertas.js)
function LicPar_ehTipo_(a) { var t = Lic_s_(a && a.TIPO); return t === 'PARECER_PEDIDO' || t === 'PARECER_RECEBIDO'; }
function LicPar_refDe_(a) { var g = Lic_s_(a.GRUPO), i = g.indexOf('|'); return i >= 0 ? g.slice(i + 1) : ''; }
/** '' = o aviso ainda vale; senão o motivo (pessoa inativa, pedido respondido ou cancelado, decisão tomada, oportunidade fora da lista). */
function LicPar_alertaSemValer_(a, ops) {
  var uid = Lic_s_(a.USUARIO_ID);
  if (!LicPar_ativos_().some(function (u) { return u.id === uid; })) return 'A pessoa não está mais ativa no SGO+.';
  var l = ops[Lic_s_(a.OPORTUNIDADE_ID)];
  if (!l) return 'A oportunidade saiu da lista de Licitações.';
  if (Lic_s_(a.TIPO) === 'PARECER_RECEBIDO') return SGO_DATA.getById(LICPAR_ABAS.PARECERES, LicPar_refDe_(a)) ? '' : 'O parecer não foi encontrado.';
  var p = SGO_DATA.getById(LICPAR_ABAS.PEDIDOS, LicPar_refDe_(a));
  if (!p) return 'O pedido de parecer não foi encontrado.';
  if (!LicPar_aberto_(p)) return 'O pedido de parecer foi ' + (Lic_up_(p.SITUACAO) === 'RESPONDIDO' ? 'respondido' : 'cancelado') + ' antes do aviso.';
  if (LICPAR_SITUACOES_DECISAO.indexOf(Lic_s_(l.SITUACAO)) < 0) return 'A Diretoria já decidiu a licitação (agora "' + (LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || l.SITUACAO) + '"): o pedido de parecer não vale mais.';
  return '';
}
/** Conteúdo do aviso: { titulo, texto (e-mail), params (as 9 variáveis do modelo sgo_licitacao_prazo) }. Nunca leva custo. */
function LicPar_alertaConteudo_(a, l, quando) {
  var agoraMs = (quando instanceof Date ? quando : new Date()).getTime(), cb = Lic_alertaCabecalho_(a, l), ar = LicPar_area_(a.ANTECEDENCIA) || { nome: '', rotulo: '', foco: '' }, link = Lic_linkAviso_(a.AVISO_ID);
  var lembrete = Lic_s_(a.PAPEL) === 'REENVIO' ? 'Lembrete · ' : '';
  if (Lic_s_(a.TIPO) === 'PARECER_RECEBIDO') {
    var par = SGO_DATA.getById(LICPAR_ABAS.PARECERES, LicPar_refDe_(a)) || {}, pos = (LICPAR_POSICOES[Lic_up_(par.POSICAO)] || '').toLowerCase();
    var tituloR = lembrete + 'Licitação ' + Lic_s_(a.CODIGO) + ': parecer ' + ar.rotulo + ' recebido (' + pos + ') · ' + Lic_texto_(cb.orgao, 60);
    var textoR = ['METROLABS · PARECER RECEBIDO (Licitações)', '', 'Órgão: ' + cb.orgao + (cb.local ? ' (' + cb.local + ')' : ''), 'Processo: ' + cb.processo, 'Objeto: ' + cb.objeto,
      'Parecer ' + ar.rotulo + ' (versão ' + Lic_s_(par.VERSAO) + '): ' + pos, 'De: ' + Lic_s_(par.USUARIO_NOME) + ', em ' + Lic_brDiaHora_(par.EM), 'Motivo: ' + Lic_texto_(par.MOTIVO, 1500), '',
      'Ação necessária: abrir a ficha, aba Pareceres, conferir as divergências apontadas pelo sistema e decidir pela alçada (aprovar a participação ou descartar).', '',
      'Ficha da oportunidade (aba Pareceres): ' + (link || 'SGO+ › Licitações › Oportunidades › ' + Lic_s_(a.CODIGO)), '', 'Confirmar ciência (registra que você viu este aviso; não decide a participação): ' + Lic_linkCiencia_(a.AVISO_ID, 'e')].join('\n');
    return { titulo: tituloR, texto: textoR, params: [LIC_NIVEIS[Lic_up_(a.NIVEL)] || 'normal', cb.orgao + (cb.local ? ' (' + cb.local + ')' : ''), cb.processo, cb.objeto || '-', 'Parecer ' + ar.rotulo + ' recebido: ' + pos,
      'registrado em ' + Lic_brDiaHora_(par.EM), '-', 'abrir a ficha (aba Pareceres), conferir as divergências e decidir pela alçada', link || '@LINK'] };
  }
  var p = SGO_DATA.getById(LICPAR_ABAS.PEDIDOS, LicPar_refDe_(a)) || {}, alvoMs = Date.parse(Lic_s_(p.PRAZO_ISO) || Lic_s_(a.ALVO_ISO)), prazoTxt = Lic_brDiaHora_(Lic_s_(p.PRAZO_ISO) || a.ALVO_ISO) + ' (horário de Brasília)';
  var titulo = lembrete + 'Licitação ' + Lic_s_(a.CODIGO) + ': parecer ' + ar.rotulo + ' pedido pela Diretoria (prazo ' + Lic_brDiaHora_(p.PRAZO_ISO || a.ALVO_ISO) + ') · ' + Lic_texto_(cb.orgao, 60);
  var texto = ['METROLABS · PEDIDO DE PARECER (Licitações)', '', 'Órgão: ' + cb.orgao + (cb.local ? ' (' + cb.local + ')' : ''), 'Processo: ' + cb.processo, 'Objeto: ' + cb.objeto,
    'Área: ' + ar.nome + ' · foco: ' + ar.foco, Lic_s_(p.PERGUNTA) ? 'O que a Diretoria quer saber: ' + Lic_s_(p.PERGUNTA) : '', 'Prazo do parecer: ' + prazoTxt + '; faltam ' + Lic_tempoRestante_(alvoMs - agoraMs), 'Pedido por: ' + Lic_s_(p.PEDIDO_POR_NOME), '',
    'Ação necessária: abrir Licitações › Meus pareceres (pelo link abaixo, com login), ler a oportunidade e registrar o parecer (favorável, com ressalva ou contrário, com o motivo). A atividade também está em Minhas atividades.', '',
    'Abrir o pedido no SGO+: ' + (link || 'SGO+ › Licitações › Meus pareceres'), '', 'Confirmar ciência (registra que você viu este aviso; não registra o parecer): ' + Lic_linkCiencia_(a.AVISO_ID, 'e'), '',
    'Aviso enviado só no expediente (08:00 às 18:00, dia útil). O pedido vale até a Diretoria decidir.'].filter(function (x, i, arr) { return x !== '' || arr[i - 1] !== ''; }).join('\n');
  return { titulo: titulo, texto: texto, params: [LIC_NIVEIS[Lic_up_(a.NIVEL)] || 'importante', cb.orgao + (cb.local ? ' (' + cb.local + ')' : ''), cb.processo, cb.objeto || '-', 'Parecer ' + ar.rotulo + ' pedido pela Diretoria',
    prazoTxt, Lic_tempoRestante_(alvoMs - agoraMs), 'registrar o parecer em Licitações › Meus pareceres (favorável, com ressalva ou contrário, com o motivo)', link || '@LINK'] };
}
/**
 * Link ?aviso= de um aviso de parecer (depois do login): a pessoa do pedido abre "Meus pareceres" no pedido; quem pediu (gestão) abre a ficha
 * na aba Pareceres. null = não é aviso de parecer (o chamador segue com a regra dele).
 */
function LicPar_avisoAbrir_(s, avisoId) {
  var a = Lic_ler_(LIC_ABAS.ALERTAS).filter(function (x) { return Lic_s_(x.AVISO_ID) === Lic_s_(avisoId); })[0];
  if (!a || !LicPar_ehTipo_(a)) return null;
  var eu = { id: Lic_s_(s.userId), login: Lic_s_(s.usuario), perfil: Lic_up_(s.perfil) }, gestao = Lic_nivelDe_(eu).gestao, dele = Lic_s_(a.USUARIO_ID) === eu.id;
  if (!dele && !gestao) return { ok: false, tela: null, outraPessoa: true, message: 'Este aviso de parecer é de outra pessoa. Os pedidos feitos a você ficam em Licitações › Meus pareceres.' };
  if (dele && !Lic_s_(a.ABERTO_EM)) { try { SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { ABERTO_EM: Lic_agora_() }); } catch (e) {} }
  if (Lic_s_(a.TIPO) === 'PARECER_PEDIDO' && dele) return { ok: true, tela: { tipo: 'licitacao', mod: 'licitacoes_pareceres', pedido: LicPar_refDe_(a), alerta: Lic_s_(a.ID) }, message: '' };
  return { ok: true, tela: { tipo: 'licitacao', id: Lic_s_(a.OPORTUNIDADE_ID), aba: 'pareceres', alerta: Lic_s_(a.ID) }, message: '' };
}

// ------------------------------------------------------------ entrada (Licitacoes_api, ação "pareceres")
var LICPAR_OPS = {
  meus: function (eu) { return LicPar_meus_(eu); },
  tela: function (eu, d) { return LicPar_tela_(eu, d); },
  registrar: function (eu, d) { return LicPar_registrar_(eu, d); },
  ficha: function (eu, d) { return LicPar_ficha_(eu, d); },
  pedir: function (eu, d) { return LicPar_pedir_(eu, d); },
  atividadeDeNovo: function (eu, d) { return LicPar_atividadeDeNovo_(eu, d); },
  cancelar: function (eu, d) { return LicPar_cancelar_(eu, d); },
  aprovar: function (eu, d) { return LicPar_aprovar_(eu, d); },
  cfg: function (eu) { Lic_exigir_(eu, 'abrir as alçadas'); return LicPar_cfgTela_(eu); },
  cfgSalvar: function (eu, d) { return LicPar_cfgSalvar_(eu, d); }
};
/** Só "meus", "tela" e "registrar" passam sem a gestão (cada um confere o pedido da pessoa); o resto exige Diretoria ou Administrador. */
function LicPar_acao_(eu, d) {
  var op = Lic_s_(d && d.op), fn = Object.prototype.hasOwnProperty.call(LICPAR_OPS, op) ? LICPAR_OPS[op] : null;
  if (!fn) throw new Error('Não foi possível: operação de pareceres desconhecida (' + op + '). Atualize a página (F5) e tente de novo');
  if (['meus', 'tela', 'registrar'].indexOf(op) < 0) Lic_exigir_(eu, 'usar os pareceres e as alçadas');
  if (eu.gestao) LicPar_garantirAbas_();
  return fn(eu, d || {});
}
