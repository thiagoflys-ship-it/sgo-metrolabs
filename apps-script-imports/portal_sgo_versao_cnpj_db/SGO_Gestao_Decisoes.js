/****************************************************
 * CAIXA DE DECISÕES DA GESTÃO (20/10/2026)
 *
 * Problema do dono: gestor que fica dias sem entrar no sistema não sabe o que
 * espera por ele, e a Diretoria acaba cobrando os próprios líderes. A caixa
 * junta, numa lista só, tudo o que DEPENDE de um gestor (ou da Diretoria),
 * venha do módulo que vier, diz quem é o responsável, o prazo da decisão, há
 * quanto tempo está parado e leva direto à tela de resolver.
 *
 * FONTE: a central de pendências (SGO_Alertas_Central.js), visão interna da
 * equipe. Nada é calculado duas vezes: a caixa só escolhe, entre as pendências
 * que a central já conhece, as que são decisão da gestão (GES_TIPOS), e
 * acrescenta à central as decisões que ela ainda não tinha (Gestao_fontePendencias_:
 * homologar e julgar ocorrências, aprovar missões, sugestões de ocorrência uma a
 * uma, justificativas de atraso a avaliar, casos e planos de ação atrasados,
 * sugestões do copiloto da Frota). Essas também aparecem no Início da gestão.
 *
 * QUEM RECEBE CADA ITEM (Ges_rotear_):
 *  1. A área do item: a área da pessoa envolvida (CAD_USUARIOS.AREA, SGO_Areas.js)
 *     ou, quando o item não é de uma pessoa (padrão, veículo, documento), a área
 *     padrão do módulo (configurável; padrões e certificados = Metrologia,
 *     Frota = Administrativo, Auvo e NR-13 = Técnica/Campo...).
 *  2. Os gestores responsáveis por essa área (configuráveis em Regras e
 *     responsáveis, só Administrador e Diretoria).
 *  3. Ninguém decide sobre si mesmo: a pessoa envolvida (e, no Programa de
 *     conduta, o fiscal que registrou) sai da lista.
 *  4. Programa de conduta que envolve alguém da gestão vai direto para a
 *     Diretoria (regra do dono: a Diretoria decide o que envolve gestão).
 *  5. Área sem gestor configurado (ou só com a própria pessoa envolvida):
 *     RESERVA da Diretoria (perfil Diretoria e o dono do sistema). Sem ninguém
 *     com esse perfil, os administradores.
 *  Casos e planos de ação têm dono (quem conduz o caso ou criou o plano): vão
 *  para ele, se estiver ativo.
 *
 * IDADE E PRAZO: cada item ganha uma linha em GES_DECISOES quando entra na caixa
 * (ENTROU_EM) e sai quando a pendência some da central (RESOLVIDO_EM). O prazo de
 * decisão é o da própria regra quando existe (prazo de homologação, de julgamento,
 * de registro da sugestão, vencimento do documento) ou a entrada mais N dias úteis
 * do tipo. "Registrar providência" (com data de acompanhamento de até 10 dias)
 * conta como decisão tomada e pausa a escada até a data informada. Dias úteis
 * seguem o expediente da empresa (SGO_Expediente.js: fins de semana e feriados
 * não contam). Itens que já existiam quando a caixa foi ligada começam a contar
 * do dia em que a caixa os viu pela primeira vez.
 *
 * Itens de ACOMPANHAMENTO (vencimentos de documentos, calibrações e laudos de
 * clientes): aparecem na caixa e no e-mail como contagem, mas não sobem a escada
 * nem entram na avaliação do gestor (dependem do cliente; são oportunidade
 * comercial, não decisão interna).
 *
 * Abas próprias (criadas sob demanda; nada é apagado):
 *   GES_DECISOES  um item por entrada na caixa (histórico da decisão)
 *   GES_ENVIOS    cada e-mail, WhatsApp, relatório e automação da escada (um por dia)
 *   GES_ACESSOS   um registro por pessoa da gestão por dia em que abriu o sistema
 *   GES_AVALIACOES avaliação mensal do gestor, congelada no fechamento do mês
 * Configuração: propriedade GESTAO_DECISOES_CFG (JSON).
 * Escada de cobrança e automações: SGO_Gestao_Escada.js. Avaliação do gestor e
 * relatórios A4: SGO_Gestao_Avaliacao.js. Tela: JS_Gestao.html.
 * Nenhuma função devolve Date cru.
 ****************************************************/

var GES_FUSO = 'America/Sao_Paulo';
var GES_ABA_DECISOES = 'GES_DECISOES';
var GES_COLUNAS_DECISOES = ['ID', 'ITEM_ID', 'TIPO', 'MODULO', 'TITULO', 'DETALHE', 'AREA', 'RESPONSAVEIS_IDS', 'RESPONSAVEIS_NOMES', 'RESERVA_DIRETORIA',
  'ENVOLVIDO_ID', 'ENVOLVIDO_NOME', 'ENTROU_EM', 'PRAZO_DECISAO', 'PRIMEIRA_ACAO_EM', 'PRIMEIRA_ACAO_POR_ID', 'PROVIDENCIAS', 'PROVIDENCIA_EM', 'PROVIDENCIA_TEXTO',
  'PROVIDENCIA_POR_ID', 'PROVIDENCIA_POR_NOME', 'ACOMPANHAR_ATE', 'ESCALADO_EM', 'ESCALADO_PARA', 'RESOLVIDO_EM', 'SITUACAO', 'ACOMPANHAMENTO', 'TELA_JSON', 'ATUALIZADO_EM', 'CRIADO_EM'];
var GES_ABA_ENVIOS = 'GES_ENVIOS';
var GES_COLUNAS_ENVIOS = ['ID', 'TIPO', 'USUARIO_ID', 'USUARIO_NOME', 'DIA', 'REFERENCIA', 'QTD', 'ITENS', 'SITUACAO', 'MOTIVO', 'LINK', 'CRIADO_EM'];
var GES_ABA_ACESSOS = 'GES_ACESSOS';
var GES_COLUNAS_ACESSOS = ['ID', 'USUARIO_ID', 'USUARIO_NOME', 'DIA', 'PRIMEIRO_EM', 'CRIADO_EM'];
var GES_ABA_AVALIACOES = 'GES_AVALIACOES';
var GES_COLUNAS_AVALIACOES = ['ID', 'COMPETENCIA', 'GESTOR_ID', 'GESTOR_NOME', 'NOTA', 'FAROL', 'INDICADORES_JSON', 'GERADO_EM', 'CRIADO_EM'];
var GES_CFG_PROP = 'GESTAO_DECISOES_CFG';
var GES_PAUSA_MAX_DIAS = 10;
var GES_SITUACOES = { ABERTA: 'Aberta', RESOLVIDA: 'Resolvida', PERDIDA: 'Venceu sem decisão' };

/** Área padrão de cada módulo quando o item não é de uma pessoa (configurável em Regras e responsáveis). */
var GES_AREA_MODULO_PADRAO = {
  padroes: 'METROLOGIA', certificados: 'METROLOGIA', documentos: 'COMERCIAL', nr13: 'TECNICA', frota: 'ADMINISTRATIVO',
  conduta: 'RH', qualidade: 'QUALIDADE', auvo: 'TECNICA', atividades: 'ADMINISTRATIVO', avisos: 'ADMINISTRATIVO', email: 'COMERCIAL', comercial: 'COMERCIAL', ponto: 'RH'
};
var GES_MODULOS_CONFIG = [['padroes', 'Padrões de referência'], ['certificados', 'Certificados de calibração'], ['documentos', 'Documentos de clientes'], ['nr13', 'NR-13'],
  ['frota', 'Frota'], ['conduta', 'Programa de conduta'], ['qualidade', 'Qualidade'], ['auvo', 'Integração Auvo'], ['atividades', 'Atividades'], ['avisos', 'Avisos'], ['email', 'E-mail de clientes'], ['comercial', 'Comercial'], ['ponto', 'Assistente do ponto']];

/**
 * Pendências da central que são decisão da gestão.
 *  prazo: dias úteis para decidir, contados da entrada (quando o item não traz prazo próprio);
 *  janela: só entra na caixa quando faltam até N dias para o vencimento (o resto fica no Início);
 *  acompanhamento: aparece, mas não sobe a escada nem entra na avaliação;
 *  resolveNaCaixa: some da caixa com "Ciente" (não há outra tela que mude a origem).
 */
var GES_TIPOS = {
  padrao_vencido: { prazo: 1 }, padrao_vencendo: { prazo: 5, janela: 15 }, padrao_sem_validade: { prazo: 2 },
  documento_vencido: { prazo: 5, acompanhamento: true }, requalificacao_vencida: { prazo: 5, acompanhamento: true }, calibracao_vencida: { prazo: 5, acompanhamento: true }, nr13_vencida: { prazo: 5, acompanhamento: true },
  cnh_vencida: { prazo: 1 }, cnh_vencendo: { prazo: 2, janela: 7 },
  veiculo_doc_vencido: { prazo: 1 }, veiculo_doc_vencendo: { prazo: 5, janela: 15 },
  manutencao_vencida: { prazo: 2 }, manutencao_vencendo: { prazo: 5, janela: 15 },
  multa_conferir: { prazo: 3 }, multa_vencida: { prazo: 1 }, multa_vencendo: { prazo: 3 },
  frota_viagem_aberta: { prazo: 1 }, frota_km_conferir: { prazo: 2 }, frota_rastreador_uso: { prazo: 1 }, frota_rastreador_liberar: { prazo: 1 },
  frota_rastreador_bloqueio: { prazo: 1 }, frota_rastreador_conexao: { prazo: 2 }, frota_comprovante: { prazo: 2 }, frota_avaria: { prazo: 3 },
  frota_abast_pendente: { prazo: 1 }, frota_abast_justificativa: { prazo: 2 }, frota_abast_conferir: { prazo: 5 }, frota_plano_incompleto: { prazo: 5 },
  frota_reserva_atraso: { prazo: 1 }, frota_reserva_problema: { prazo: 1 },
  frota_bloqueio_decidir: { prazo: 1 }, frota_bloqueio_esquecida: { prazo: 1 }, frota_bloqueio_fila: { prazo: 1 }, frota_bloqueio_passagem: { prazo: 1 }, frota_bloqueio_odometro: { prazo: 3 },
  atividade_atrasada: { prazo: 2 }, aviso_leitura_atrasada: { prazo: 3 },
  conduta_sugestao: { prazo: 2 }, conduta_fechamento: { prazo: 3 }, conduta_homologar: { prazo: 3 }, conduta_julgar: { prazo: 5 }, conduta_missao: { prazo: 3 },
  atividade_justificativa: { prazo: 2, resolveNaCaixa: true }, frota_caso: { prazo: 5 }, plano_atrasado: { prazo: 2 }, frota_copiloto: { prazo: 5 },
  qualidade_os: { prazo: 3 }, qualidade_mov: { prazo: 3 },
  auvo_os_aberta: { prazo: 3 }, auvo_sem_vinculo: { prazo: 3 }, auvo_importacao: { prazo: 1 },
  // 21/10/2026: e-mail de cliente sem resposta além do prazo da gestão (SGO_Email.js); vai ao gestor da área da pessoa
  email_cliente_parado: { prazo: 1 },
  // 21/10/2026: Comercial nativo (SGO_Comercial_Painel.js). A decisão é tomada na tela do Comercial; a caixa mostra, cobra e leva até lá.
  comercial_sem_proxima: { prazo: 1 }, comercial_desconto: { prazo: 1 }, comercial_reabertura: { prazo: 2 }, comercial_pedido_parado: { prazo: 1 },
  comercial_preco: { prazo: 1 }, // 29/10/2026: preço do catálogo reduzido pelo vendedor acima da alçada
  // 21/10/2026: Assistente do ponto (SGO_Ponto_Api.js). Pedido de ajuste pendente há 2 dias úteis: vai à gestão da área RH (sem gestor, a Diretoria).
  ponto_ajuste_parado: { prazo: 1 }
};

var GES_CFG_PADRAO = {
  gestoresPorArea: {},
  areaPorModulo: {},
  escada: { emailDiario: true, horaEmail: '08:00', whatsapp: true, whatsDiasUteis: 2, diretoriaDiasUteis: 5, semanal: true, horaSemanal: '08:00', mensal: true },
  pesos: { prazo: 30, tempo: 15, vencidos: 15, escalonamentos: 15, acesso: 10, revertidas: 5, equipe: 5, planos: 5 },
  farol: { verde: 85, amarelo: 70 },
  sugestaoConduta: true,
  automacoes: { cnhCondutor: true, manutencaoAgenda: true, atividadeSemResponsavel: true, relatoriosMensais: true }
};

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function Ges_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function Ges_up_(v) { return Ges_s_(v).toUpperCase(); }
function Ges_agora_() { return Utilities.formatDate(new Date(), GES_FUSO, "yyyy-MM-dd'T'HH:mm"); }
function Ges_hoje_() { return Utilities.formatDate(new Date(), GES_FUSO, 'yyyy-MM-dd'); }
function Ges_2_(n) { return (n < 10 ? '0' : '') + n; }
function Ges_br_(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(Ges_s_(iso)); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : ''; }
function Ges_brDia_(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(Ges_s_(iso)); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function Ges_json_(t, padrao) { try { var v = JSON.parse(Ges_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
function Ges_plural_(n, um, varios) { return String(n) + ' ' + (Number(n) === 1 ? um : varios); }

/** "aaaa-mm-dd" (ou com hora) de qualquer valor de data do banco; '' se não der para ler. */
function Ges_iso_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, GES_FUSO, "yyyy-MM-dd'T'HH:mm");
  var s = Ges_s_(v), m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  if (m) {
    // ISO com fuso (toISOString): converte para o horário de Brasília
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s) && m[4]) { var d = new Date(s); if (!isNaN(d.getTime())) return Utilities.formatDate(d, GES_FUSO, "yyyy-MM-dd'T'HH:mm"); }
    return m[1] + '-' + m[2] + '-' + m[3] + (m[4] ? 'T' + m[4] + ':' + m[5] : '');
  }
  m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
}
function Ges_dia_(v) { return Ges_iso_(v).slice(0, 10); }

/** Data de calendário "aaaa-mm-dd" + n dias corridos. */
function Ges_somarDias_(dia, n) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dia);
  if (!m) return '';
  var t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + n * 864e5);
  return t.getUTCFullYear() + '-' + Ges_2_(t.getUTCMonth() + 1) + '-' + Ges_2_(t.getUTCDate());
}

/** O dia (aaaa-mm-dd) é dia útil da empresa? (fim de semana e feriados não; ver SGO_Expediente.js) */
function Ges_diaUtil_(dia, cfgExp) {
  if (typeof SGO_expedienteMotivoDia_ === 'function') {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
    if (!m) return false;
    var semana = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
    return !SGO_expedienteMotivoDia_(dia, semana, cfgExp || SGO_expediente_());
  }
  var d = new Date(dia + 'T12:00:00Z').getUTCDay();
  return d !== 0 && d !== 6;
}

/** Dias úteis DEPOIS de diaA até diaB (diaA não conta; diaB conta). 0 se diaB <= diaA. */
function Ges_diasUteisEntre_(diaA, diaB, cfgExp) {
  diaA = Ges_s_(diaA).slice(0, 10); diaB = Ges_s_(diaB).slice(0, 10);
  if (!diaA || !diaB || diaB <= diaA) return 0;
  var c = cfgExp || (typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null), n = 0, d = diaA;
  for (var i = 0; i < 800; i++) {
    d = Ges_somarDias_(d, 1);
    if (d > diaB) break;
    if (Ges_diaUtil_(d, c)) n++;
  }
  return n;
}

/** Dia + n dias úteis. */
function Ges_somarDiasUteis_(dia, n, cfgExp) {
  var c = cfgExp || (typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null), d = Ges_s_(dia).slice(0, 10), falta = Math.max(0, Number(n) || 0);
  for (var i = 0; i < 800 && falta > 0; i++) { d = Ges_somarDias_(d, 1); if (Ges_diaUtil_(d, c)) falta--; }
  return d;
}

function Ges_comTrava_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return fn(); } finally {
    try { SpreadsheetApp.flush(); } catch (e) {}
    lock.releaseLock();
  }
}

function Ges_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('GES_ABAS_OK_V1')) return; } catch (e) {}
  [[GES_ABA_DECISOES, GES_COLUNAS_DECISOES], [GES_ABA_ENVIOS, GES_COLUNAS_ENVIOS], [GES_ABA_ACESSOS, GES_COLUNAS_ACESSOS], [GES_ABA_AVALIACOES, GES_COLUNAS_AVALIACOES]].forEach(function (a) {
    CertCal_garantirTabela_(a[0], a[1]);
    a[1].forEach(function (c) { CertCal_garantirColuna_(a[0], c); });
  });
  ['ENTROU_EM', 'PRAZO_DECISAO', 'PRIMEIRA_ACAO_EM', 'PROVIDENCIA_EM', 'ACOMPANHAR_ATE', 'ESCALADO_EM', 'RESOLVIDO_EM', 'ATUALIZADO_EM'].forEach(function (c) { CertCal_forcarColunaTexto_(GES_ABA_DECISOES, c); });
  CertCal_forcarColunaTexto_(GES_ABA_ENVIOS, 'DIA');
  CertCal_forcarColunaTexto_(GES_ABA_ACESSOS, 'DIA');
  CertCal_forcarColunaTexto_(GES_ABA_AVALIACOES, 'COMPETENCIA');
  try { if (cache) cache.put('GES_ABAS_OK_V1', '1', 21600); } catch (e) {}
}

function Ges_ler_(aba) {
  try { return SGO_DATA.getAll(aba) || []; } catch (e) { if (/Aba não encontrada/i.test(String((e && e.message) || e))) return []; throw e; }
}

// ------------------------------------------------------------
// CONFIGURAÇÃO
// ------------------------------------------------------------
function Ges_horaValida_(h) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(Ges_s_(h)); }

/** Configuração em vigor (padrão + o que está gravado). Nunca lança. */
function Ges_cfg_() {
  var g = null;
  try { g = JSON.parse(PropertiesService.getScriptProperties().getProperty(GES_CFG_PROP) || 'null'); } catch (e) { g = null; }
  var c = JSON.parse(JSON.stringify(GES_CFG_PADRAO));
  if (!g || typeof g !== 'object') return c;
  if (g.gestoresPorArea && typeof g.gestoresPorArea === 'object') {
    Object.keys(g.gestoresPorArea).forEach(function (a) {
      var l = g.gestoresPorArea[a];
      if (Array.isArray(l)) c.gestoresPorArea[Ges_up_(a)] = l.map(Ges_s_).filter(Boolean);
    });
  }
  if (g.areaPorModulo && typeof g.areaPorModulo === 'object') Object.keys(g.areaPorModulo).forEach(function (m) { if (Ges_s_(g.areaPorModulo[m])) c.areaPorModulo[m] = Ges_up_(g.areaPorModulo[m]); });
  var e = g.escada || {};
  ['emailDiario', 'whatsapp', 'semanal', 'mensal'].forEach(function (k) { if (e[k] === false) c.escada[k] = false; });
  if (Ges_horaValida_(e.horaEmail)) c.escada.horaEmail = e.horaEmail;
  if (Ges_horaValida_(e.horaSemanal)) c.escada.horaSemanal = e.horaSemanal;
  if (Number(e.whatsDiasUteis) >= 1 && Number(e.whatsDiasUteis) <= 20) c.escada.whatsDiasUteis = Math.round(Number(e.whatsDiasUteis));
  if (Number(e.diretoriaDiasUteis) >= 1 && Number(e.diretoriaDiasUteis) <= 30) c.escada.diretoriaDiasUteis = Math.round(Number(e.diretoriaDiasUteis));
  if (g.pesos && typeof g.pesos === 'object') Object.keys(c.pesos).forEach(function (k) { var v = Number(g.pesos[k]); if (isFinite(v) && v >= 0 && v <= 100) c.pesos[k] = v; });
  if (g.farol && Number(g.farol.verde) > Number(g.farol.amarelo) && Number(g.farol.amarelo) >= 0 && Number(g.farol.verde) <= 100) c.farol = { verde: Number(g.farol.verde), amarelo: Number(g.farol.amarelo) };
  if (g.sugestaoConduta === false) c.sugestaoConduta = false;
  if (g.automacoes && typeof g.automacoes === 'object') Object.keys(c.automacoes).forEach(function (k) { if (g.automacoes[k] === false) c.automacoes[k] = false; });
  if (Ges_s_(g.implantadoEm)) c.implantadoEm = Ges_s_(g.implantadoEm);
  return c;
}

function Ges_cfgGravar_(c) {
  PropertiesService.getScriptProperties().setProperty(GES_CFG_PROP, JSON.stringify(c));
}

function Ges_areaDoModulo_(modulo, cfg) {
  return Ges_up_((cfg.areaPorModulo || {})[modulo]) || GES_AREA_MODULO_PADRAO[modulo] || '';
}

// ------------------------------------------------------------
// PESSOAS
// ------------------------------------------------------------
function Ges_ehGestaoPerfil_(p) { p = Ges_up_(p); return p === 'ADMIN' || p === 'GESTOR' || p === 'DIRETORIA'; }
// 21/10/2026 (pedido do dono): RH e Financeiro abrem a Caixa de decisões e decidem o que é das áreas deles (responsáveis em
// Regras e responsáveis). Veem só os itens em que são responsáveis; quem recebe e-mail e WhatsApp da escada não muda.
function Ges_ehRotinaPerfil_(p) { return Ges_ehGestaoPerfil_(p) || (typeof SGO_ehGestaoRotina_ === 'function' && SGO_ehGestaoRotina_(p)); }

/** Mapa id -> pessoa da equipe (com área, perfil, e-mail, vínculo e se é Diretoria). */
function Ges_usuarios_() {
  var nomesAreas = typeof Areas_mapaNomes_ === 'function' ? Areas_mapaNomes_() : {};
  var mapa = {};
  Ges_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
    var perfil = Ges_up_(u.PERFIL);
    if (perfil === 'CLIENTE' || perfil === 'AUVO_SYNC') return;
    var login = Ges_s_(u.USUARIO), area = Ges_up_(u.AREA);
    var dono = false;
    try { dono = typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(login); } catch (e) { dono = false; }
    mapa[Ges_s_(u.ID)] = {
      id: Ges_s_(u.ID), nome: Ges_s_(u.NOME) || login, login: login, perfil: perfil, ativo: Ges_up_(u.STATUS || 'ATIVO') === 'ATIVO',
      area: area, areaNome: area ? (nomesAreas[area] || area) : 'Sem área definida', email: Ges_s_(u.EMAIL).toLowerCase(),
      gestao: Ges_ehGestaoPerfil_(perfil), rotina: Ges_ehRotinaPerfil_(perfil), diretoria: perfil === 'DIRETORIA' || dono, dono: dono,
      sistema: typeof Areas_contaDoSistema_ === 'function' ? Areas_contaDoSistema_(u) : (login.toLowerCase() === 'admin')
    };
  });
  return mapa;
}

/** Diretoria que recebe a reserva e os escalonamentos: perfil Diretoria e o dono; sem ninguém, os administradores. */
function Ges_diretoria_(us, excluir) {
  excluir = excluir || [];
  var ids = Object.keys(us).filter(function (id) { var u = us[id]; return u.ativo && u.diretoria && excluir.indexOf(id) < 0; });
  if (!ids.length) ids = Object.keys(us).filter(function (id) { var u = us[id]; return u.ativo && u.perfil === 'ADMIN' && !u.sistema && excluir.indexOf(id) < 0; });
  if (!ids.length) ids = Object.keys(us).filter(function (id) { var u = us[id]; return u.ativo && u.perfil === 'ADMIN' && excluir.indexOf(id) < 0; });
  return ids;
}

/** Quem a avaliação considera gestor: perfil Gestor e quem é responsável por alguma área (a Diretoria avalia, não é avaliada). */
function Ges_gestoresAvaliados_(us, cfg) {
  var ids = {};
  Object.keys(us).forEach(function (id) { var u = us[id]; if (u.ativo && u.perfil === 'GESTOR' && !u.sistema) ids[id] = true; });
  Object.keys(cfg.gestoresPorArea || {}).forEach(function (a) { (cfg.gestoresPorArea[a] || []).forEach(function (id) { var u = us[id]; if (u && u.ativo && !u.sistema && !u.diretoria) ids[id] = true; }); });
  return Object.keys(ids).sort(function (a, b) { return us[a].nome.localeCompare(us[b].nome, 'pt-BR'); });
}

/** Áreas pelas quais a pessoa responde (configuração). */
function Ges_areasDoGestor_(uid, cfg) {
  return Object.keys(cfg.gestoresPorArea || {}).filter(function (a) { return (cfg.gestoresPorArea[a] || []).indexOf(uid) >= 0; });
}

// ------------------------------------------------------------
// QUEM RECEBE
// ------------------------------------------------------------
/**
 * Destino de um item: { area, areaNome, ids, reserva, motivo }.
 * it: item da central (com it.extra opcional: area, decisor, naoPode, soDiretoria).
 */
function Ges_rotear_(it, cfg, us) {
  var ex = it.extra || {}, nomesAreas = typeof Areas_mapaNomes_ === 'function' ? Areas_mapaNomes_() : {};
  var envolvido = Ges_s_(it.responsavelId);
  var naoPode = (ex.naoPode || []).map(Ges_s_).filter(Boolean);
  if (envolvido && !ex.decisor && naoPode.indexOf(envolvido) < 0) naoPode.push(envolvido);
  var pessoa = envolvido && us[envolvido] ? us[envolvido] : null;
  var area = Ges_up_(ex.area) || (pessoa && pessoa.area) || Ges_areaDoModulo_(it.modulo, cfg);
  var r = { area: area, areaNome: area ? (nomesAreas[area] || area) : 'Sem área', ids: [], reserva: false, motivo: '' };
  // item técnico do administrador (ex.: importação do Auvo parada)
  if (it.publico === 'ADMIN') {
    r.ids = Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'ADMIN'; });
    r.motivo = 'Assunto técnico: vai para os administradores.';
    return r;
  }
  // dono do caso ou do plano
  var decisor = Ges_s_(ex.decisor);
  if (decisor && us[decisor] && us[decisor].ativo && us[decisor].gestao) { r.ids = [decisor]; r.motivo = ex.motivoDecisor || 'Responsável pelo caso ou plano.'; return r; }
  // Programa de conduta que envolve alguém da gestão: decisão da Diretoria
  if (ex.soDiretoria || (it.modulo === 'conduta' && pessoa && pessoa.gestao)) {
    r.ids = Ges_diretoria_(us, naoPode); r.reserva = true;
    r.motivo = 'Envolve alguém da gestão: a decisão é da Diretoria.';
    return r;
  }
  var lista = ((cfg.gestoresPorArea || {})[area] || []).filter(function (id) { return us[id] && us[id].ativo && naoPode.indexOf(id) < 0 && (!ex.sigilo || Ges_veSigilo_(us[id])); });
  // sigilo sem gestor de Qualidade configurado: o Gestor de Qualidade do cadastro (perfil Gestor, área QUALIDADE)
  if (!lista.length && ex.sigilo) lista = Object.keys(us).filter(function (id) { return Ges_veSigilo_(us[id]) && !us[id].diretoria && naoPode.indexOf(id) < 0; });
  if (lista.length) { r.ids = lista; r.motivo = 'Gestor responsável pela área ' + r.areaNome + '.'; return r; }
  r.ids = Ges_diretoria_(us, naoPode); r.reserva = true;
  r.motivo = area ? 'A área ' + r.areaNome + ' não tem gestor responsável configurado (ou o único é a pessoa envolvida): reserva da Diretoria.' : 'Item sem área: reserva da Diretoria.';
  return r;
}

// ------------------------------------------------------------
// FONTES NOVAS DA CENTRAL (decisões que a central ainda não conhecia)
// Registrada em PEND_FONTES (SGO_Alertas_Central.js), só para a gestão.
// ------------------------------------------------------------
/**
 * 28/10/2026 (sigilo do envolvido, decisão do dono): ocorrência e sugestão de ocorrência do Programa de conduta só
 * para a Diretoria e o Gestor de Qualidade (mesma regra de Conduta_veIdentidadeUsuario_). Os demais da gestão não
 * veem o item nem em "todas", e ele vai para o Gestor de Qualidade (ou a Diretoria), não para o gestor da área.
 */
function Ges_veSigilo_(u) {
  return !!(u && u.ativo && !u.sistema && (u.diretoria || ((u.perfil === 'GESTOR' || u.perfil === 'ADMIN') && Ges_up_(u.area) === 'QUALIDADE')));
}

function Ges_nomeDe_(us, id) { var u = us[Ges_s_(id)]; return u ? u.nome : (Ges_s_(id) || 'pessoa não identificada'); }

function Gestao_fontePendencias_(add, ctx) {
  if (!ctx || !ctx.gestao || ctx.cliente || typeof Pend_item_ !== 'function') return;
  var us = Ges_usuarios_(), hoje = Ges_hoje_(), areaFrota = Ges_areaDoModulo_('frota', Ges_cfg_());
  var veSigilo = !!ctx.interno || !ctx.userId || Ges_veSigilo_(us[Ges_s_(ctx.userId)]);
  var cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  var grav = function (prazo) { return prazo && prazo < hoje ? 'CRITICO' : 'ATENCAO'; };
  var resolvidosNaCaixa = {};
  Ges_ler_(GES_ABA_DECISOES).forEach(function (d) { if (Ges_up_(d.SITUACAO) === 'RESOLVIDA' && Ges_up_(d.TIPO) === 'ATIVIDADE_JUSTIFICATIVA') resolvidosNaCaixa[Ges_s_(d.ITEM_ID)] = true; });

  // Programa de conduta: homologar, julgar e aprovar missões
  if (typeof CONDUTA_SHEETS !== 'undefined') {
    if (veSigilo) Ges_ler_(CONDUTA_SHEETS.OCORRENCIA).forEach(function (o) {
      var st = Ges_up_(o.STATUS), colab = Ges_s_(o.COLABORADOR_ID), nome = Ges_nomeDe_(us, colab);
      if (st === 'REGISTRADA') {
        var pz = Ges_dia_(o.PRAZO_HOMOLOGACAO);
        add(Pend_item_('conduta_homologar', {
          id: 'CONDUTA:OC:' + Ges_s_(o.ID), nome: Ges_s_(o.TIPO_CODIGO) + ' · ' + nome, publico: 'GESTAO', responsavel: nome, responsavelId: colab,
          gravidade: grav(pz), dias: pz ? Pend_diasAte_(pz, hoje) : null, vencimento: Ges_brDia_(pz),
          titulo: 'Homologar a ocorrência ' + Ges_s_(o.TIPO_CODIGO) + ' de ' + nome + ' (fato em ' + Ges_brDia_(o.DATA_FATO) + ')',
          detalhe: 'Registrada por ' + Ges_nomeDe_(us, o.FISCAL_ID) + '. ' + (pz ? 'Prazo de homologação: ' + Ges_brDia_(pz) + '; sem decisão até lá, a ocorrência é descartada pelo sistema.' : ''),
          oQueFazer: 'Abra Programa de conduta > Ocorrências, leia o que aconteceu e homologue ou rejeite com a fundamentação. Quem registrou não homologa.',
          extra: { prazo: pz, naoPode: [Ges_s_(o.FISCAL_ID), colab], desde: Ges_iso_(o.CRIADO_EM), area: 'QUALIDADE', sigilo: true }
        }));
      } else if (st === 'CONTESTADA' || st === 'EM_RECURSO') {
        var pj = Ges_dia_(o.PRAZO_JULGAMENTO);
        add(Pend_item_('conduta_julgar', {
          id: 'CONDUTA:OC:' + Ges_s_(o.ID), nome: Ges_s_(o.TIPO_CODIGO) + ' · ' + nome, publico: 'GESTAO', responsavel: nome, responsavelId: colab,
          gravidade: grav(pj), dias: pj ? Pend_diasAte_(pj, hoje) : null, vencimento: Ges_brDia_(pj),
          titulo: (st === 'EM_RECURSO' ? 'Julgar o recurso' : 'Julgar a contestação') + ' de ' + nome + ' (ocorrência ' + Ges_s_(o.TIPO_CODIGO) + ')',
          detalhe: 'A defesa está na ocorrência. ' + (pj ? 'Prazo de julgamento: ' + Ges_brDia_(pj) + '.' : '') + ' Enquanto não for julgada, a ocorrência fica suspensa e o mês não fecha sozinho.',
          oQueFazer: 'Abra Programa de conduta > Ocorrências, leia a defesa e julgue (anular ou manter) com a fundamentação.',
          extra: { prazo: pj, naoPode: [Ges_s_(o.FISCAL_ID), colab], desde: Ges_iso_(o.CONTESTADA_EM || o.RECURSO_EM), area: 'QUALIDADE', sigilo: true }
        }));
      }
    });
    var missoes = typeof Conduta_ativos_ === 'function' ? Conduta_ativos_(CONDUTA_SHEETS.MISSAO) : Ges_ler_(CONDUTA_SHEETS.MISSAO);
    missoes.forEach(function (m) {
      if (Ges_up_(m.APROVACAO) !== 'PENDENTE') return;
      var e1 = Ges_s_(m.EXECUTANTE_1_ID), e2 = Ges_s_(m.EXECUTANTE_2_ID), nome = Ges_nomeDe_(us, e1) + (e2 ? ' e ' + Ges_nomeDe_(us, e2) : '');
      var desde = Ges_dia_(m.CRIADO_EM) || hoje, pz = Ges_somarDiasUteis_(desde, GES_TIPOS.conduta_missao.prazo, cfgExp);
      add(Pend_item_('conduta_missao', {
        id: 'CONDUTA:MISSAO:' + Ges_s_(m.ID), nome: Ges_s_(m.DESTINO) + ' · ' + nome, publico: 'GESTAO', responsavel: nome, responsavelId: e1,
        gravidade: grav(pz), dias: Pend_diasAte_(pz, hoje), vencimento: Ges_brDia_(pz),
        titulo: 'Aprovar a missão de ' + nome + ' para ' + (Ges_s_(m.DESTINO) || 'destino não informado') + ' em ' + Ges_brDia_(m.DATA),
        detalhe: 'Missão com incentivo lançada pelo próprio executante: só conta depois da aprovação da gestão.',
        oQueFazer: 'Abra Programa de conduta > Missões e aprove ou recuse com o motivo. Quem é executante não decide a própria missão.',
        extra: { prazo: pz, naoPode: [e1, e2], desde: Ges_iso_(m.CRIADO_EM) }
      }));
    });
  }
  // Sugestões de ocorrência, uma a uma (antes a central só contava). As da avaliação da gestão são só da Diretoria.
  if (typeof CNDQ_SHEETS !== 'undefined') {
    var prazoReg = 2;
    try { prazoReg = Number((Conduta_obterParametros_() || {}).PRAZO_REGISTRO_DIAS_UTEIS) || 2; } catch (e) {}
    if (veSigilo) Ges_ler_(CNDQ_SHEETS.SUGESTAO).forEach(function (s) {
      if (Ges_up_(s.STATUS) !== 'PENDENTE') return;
      var colab = Ges_s_(s.COLABORADOR_ID), nome = Ges_nomeDe_(us, colab) || Ges_s_(s.COLABORADOR_NOME);
      var detectada = Ges_dia_(s.DETECTADA_EM) || hoje, pz = Ges_somarDiasUteis_(detectada, prazoReg, cfgExp);
      var daGestao = Ges_up_(s.ORIGEM_MODULO) === 'GESTAO';
      add(Pend_item_('conduta_sugestao', {
        id: 'CONDUTA:SUG:' + Ges_s_(s.ID), nome: nome, publico: daGestao ? 'DIRETORIA' : 'GESTAO', responsavel: nome, responsavelId: colab,
        gravidade: s.INFORMATIVA === 'SIM' ? 'INFO' : grav(pz), dias: Pend_diasAte_(pz, hoje), vencimento: Ges_brDia_(pz),
        titulo: 'Sugestão de ocorrência: ' + (Ges_s_(s.TITULO) || 'sem título').slice(0, 120),
        detalhe: 'Envolve ' + nome + '. ' + (Ges_s_(s.DETALHE) || '').slice(0, 220) + (s.INFORMATIVA === 'SIM' ? '' : ' Prazo de registro: ' + Ges_brDia_(pz) + '.'),
        oQueFazer: 'Abra Programa de conduta > Sugestões, confira a origem e aceite (vira ocorrência) ou descarte com o motivo.' + (daGestao ? ' Sugestão sobre gestor: só a Diretoria decide.' : ''),
        extra: { prazo: pz, naoPode: [colab], soDiretoria: daGestao, desde: detectada, area: 'QUALIDADE', sigilo: true }
      }));
    });
  }
  // Justificativas de atraso dos últimos 30 dias a avaliar pela gestão (some com "Ciente" na caixa)
  if (typeof Atividades_abas_ === 'function') {
    var corte = Ges_somarDias_(hoje, -30);
    var porAtv = {};
    try { (typeof Atividades_todas_ === 'function' ? Atividades_todas_() : []).forEach(function (a) { porAtv[Ges_s_(a.ID)] = a; }); } catch (e) {}
    // 29/10/2026: só a justificativa mais recente de cada atividade, e nada de atividade concluída ou cancelada
    // (contava uma pendência por linha do histórico: 261 na caixa da Diretoria, para 121 atividades de verdade)
    var ultimaJust = {};
    Ges_ler_(Atividades_abas_().HISTORICO).forEach(function (h) {
      if (Ges_up_(h.TIPO) !== 'JUSTIFICATIVA') return;
      var k = Ges_s_(h.ATIVIDADE_ID), atual = ultimaJust[k];
      var chave = Ges_s_(Ges_iso_(h.DATA)) + '|' + Ges_s_(Ges_iso_(h.CRIADO_EM));
      if (!atual || chave >= atual.chave) ultimaJust[k] = { chave: chave, h: h };
    });
    Object.keys(ultimaJust).map(function (k) { return ultimaJust[k].h; }).forEach(function (h) {
      var sit = Ges_s_((porAtv[Ges_s_(h.ATIVIDADE_ID)] || {}).SITUACAO);
      if (sit === 'Concluída' || sit === 'Cancelada') return;
      var dia = Ges_dia_(h.DATA);
      if (!dia || dia < corte) return;
      var id = 'ATV:JUST:' + Ges_s_(h.ID);
      if (resolvidosNaCaixa[id]) return;
      var a = porAtv[Ges_s_(h.ATIVIDADE_ID)] || {}, quem = Ges_s_(h.USUARIO_ID), nome = Ges_s_(h.USUARIO_NOME) || Ges_nomeDe_(us, quem);
      if (!quem || (us[quem] && !us[quem].ativo)) return;
      var pz = Ges_somarDiasUteis_(dia, GES_TIPOS.atividade_justificativa.prazo, cfgExp);
      add(Pend_item_('atividade_justificativa', {
        id: id, nome: (Ges_s_(a.TITULO) || 'atividade').slice(0, 40) + ' · ' + nome, publico: 'GESTAO', responsavel: nome, responsavelId: quem,
        gravidade: 'ATENCAO', dias: Pend_diasAte_(pz, hoje), vencimento: Ges_brDia_(pz),
        titulo: 'Avaliar a justificativa de atraso de ' + nome + ': ' + (Ges_s_(a.TITULO) || 'atividade').slice(0, 90),
        detalhe: (Ges_s_(h.CATEGORIA) ? Ges_s_(h.CATEGORIA) + '. ' : '') + Ges_s_(h.TEXTO).slice(0, 220) + ' Nova previsão: ' + Ges_br_(Ges_iso_(h.PREVISAO_NOVA)) + (Number(a.QTD_JUSTIFICATIVAS) > 1 ? ' (' + a.QTD_JUSTIFICATIVAS + 'ª justificativa desta atividade).' : '.'),
        oQueFazer: 'Leia a justificativa. Se concorda, toque em "Ciente" aqui na caixa. Se não, fale com a pessoa ou replaneje a atividade em Atividades da equipe e depois registre a providência.',
        tela: { tipo: 'atividade', id: Ges_s_(h.ATIVIDADE_ID) },
        extra: { prazo: pz, naoPode: [quem], desde: dia }
      }));
    });
  }
  // Casos da Frota em análise e planos de ação com prazo vencido (dono do caso ou do plano)
  if (typeof FROTA_ABA_CASO !== 'undefined') {
    Ges_ler_(FROTA_ABA_CASO).forEach(function (c) {
      var etapa = Ges_up_(c.ETAPA);
      if (etapa !== 'ANALISE' && etapa !== 'EXECUCAO') return;
      var dono = Ges_s_(c.RESPONSAVEL_ID) || Ges_s_(c.CRIADO_POR_ID), quando = Ges_dia_(c.QUANDO);
      if (etapa === 'ANALISE') {
        var desde = Ges_dia_(c.CRIADO_EM) || hoje, pz = Ges_somarDiasUteis_(desde, GES_TIPOS.frota_caso.prazo, cfgExp);
        add(Pend_item_('frota_caso', {
          id: 'FROTA:CASO:' + Ges_s_(c.ID), nome: Ges_s_(c.CODIGO) + ' · ' + (typeof FrotaId_rotuloRapido_ === 'function' ? FrotaId_rotuloRapido_(Ges_s_(c.PLACA)) : Ges_s_(c.PLACA)), publico: 'GESTAO', responsavel: Ges_nomeDe_(us, dono), responsavelId: '',
          gravidade: grav(pz), dias: Pend_diasAte_(pz, hoje), vencimento: Ges_brDia_(pz),
          titulo: 'Caso ' + Ges_s_(c.CODIGO) + ' da Frota em análise: ' + Ges_s_(c.TITULO).slice(0, 90),
          detalhe: 'Veículo ' + ((typeof FrotaId_rotuloRapido_ === 'function' ? FrotaId_rotuloRapido_(Ges_s_(c.PLACA)) : Ges_s_(c.PLACA)) || 'não informado') + '. Falta decidir a causa e o que fazer (resolver direto ou plano de ação).',
          oQueFazer: 'Abra Frota > Gestão e melhoria > Kanban, preencha os 5 Porquês e decida: resolver direto ou criar o plano de ação.',
          extra: { prazo: pz, decisor: dono, area: areaFrota, desde: desde }
        }));
      } else if (quando && quando < hoje) {
        add(Pend_item_('plano_atrasado', {
          id: 'FROTA:PLANO:' + Ges_s_(c.ID), nome: Ges_s_(c.CODIGO) + ' · ' + (typeof FrotaId_rotuloRapido_ === 'function' ? FrotaId_rotuloRapido_(Ges_s_(c.PLACA)) : Ges_s_(c.PLACA)), publico: 'GESTAO', responsavel: Ges_nomeDe_(us, dono), responsavelId: '',
          gravidade: 'CRITICO', dias: Pend_diasAte_(quando, hoje), vencimento: Ges_brDia_(quando),
          titulo: 'Plano de ação do caso ' + Ges_s_(c.CODIGO) + ' (Frota) passou do prazo de ' + Ges_brDia_(quando),
          detalhe: 'O quê: ' + Ges_s_(c.O_QUE).slice(0, 160) + '. Quem: ' + (Ges_s_(c.QUEM_NOME) || 'não informado') + '.',
          oQueFazer: 'Cobre as ações em Minhas atividades ou replaneje o prazo no caso (Frota > Gestão e melhoria).',
          tela: { tipo: 'modulo', mod: 'frota' },
          extra: { prazo: quando, decisor: dono, area: areaFrota, desde: quando }
        }));
      }
    });
  }
  if (typeof CNDQ_SHEETS !== 'undefined') {
    Ges_ler_(CNDQ_SHEETS.PLANO).forEach(function (p) {
      var fase = Ges_up_(p.FASE) || 'EXECUTAR', quando = Ges_dia_(p.QUANDO);
      if ((fase !== 'EXECUTAR' && fase !== 'PLANEJAR') || !quando || quando >= hoje) return;
      var dono = Ges_s_(p.CRIADO_POR_ID);
      add(Pend_item_('plano_atrasado', {
        id: 'CONDUTA:PLANO:' + Ges_s_(p.ID), nome: Ges_s_(p.CODIGO), publico: 'GESTAO', responsavel: Ges_nomeDe_(us, dono), responsavelId: '',
        gravidade: 'CRITICO', dias: Pend_diasAte_(quando, hoje), vencimento: Ges_brDia_(quando),
        titulo: 'Plano de ação ' + Ges_s_(p.CODIGO) + ' passou do prazo de ' + Ges_brDia_(quando),
        detalhe: Ges_s_(p.TITULO).slice(0, 160) + '. Quem: ' + (Ges_s_(p.QUEM_NOME) || 'não informado') + '.',
        oQueFazer: 'Abra Programa de conduta > Qualidade e planos, cobre as ações ou avance o ciclo (verificar, novo ciclo ou cancelar com o motivo).',
        extra: { prazo: quando, decisor: dono, area: Ges_up_(p.AREA), desde: quando }
      }));
    });
  }
  // Sugestões do copiloto da Frota (alta gravidade, ainda sem decisão): lista guardada pela rotina a cada 3 horas
  var cop = Ges_json_(PropertiesService.getScriptProperties().getProperty('GES_COPILOTO_CACHE'), null);
  if (cop && Array.isArray(cop.itens)) {
    cop.itens.forEach(function (s) {
      var desde = Ges_s_(s.desde) || hoje, pz = Ges_somarDiasUteis_(desde, GES_TIPOS.frota_copiloto.prazo, cfgExp);
      add(Pend_item_('frota_copiloto', {
        id: 'FROTA:COPILOTO:' + Ges_s_(s.chave), nome: (typeof FrotaId_rotuloRapido_ === 'function' && s.placa ? FrotaId_rotuloRapido_(Ges_s_(s.placa)) : Ges_s_(s.placa)) || 'Frota', publico: 'GESTAO', responsavel: 'Gestão da frota', responsavelId: Ges_s_(s.condutorUsuarioId),
        gravidade: 'ATENCAO', dias: Pend_diasAte_(pz, hoje), vencimento: Ges_brDia_(pz),
        titulo: 'Copiloto da Frota: ' + Ges_s_(s.titulo).slice(0, 110), detalhe: Ges_s_(s.detalhe).slice(0, 240),
        oQueFazer: 'Abra Frota > Gestão e melhoria > Copiloto e aceite (vira caso, atividade ou pedido de comprovante) ou descarte com o motivo.',
        extra: { prazo: pz, area: areaFrota, desde: desde }
      }));
    });
  }
}

// ------------------------------------------------------------
// ITENS DA CAIXA
// ------------------------------------------------------------
/** O item da central é decisão da gestão? (tipo listado e, para "a vencer", dentro da janela) */
function Ges_entra_(it) {
  var t = GES_TIPOS[it.tipo];
  if (!t) return false;
  if (t.janela && it.dias !== null && it.dias !== undefined && Number(it.dias) > t.janela) return false;
  return true;
}

/** Pendências da central (visão interna) que são decisão: { itens, naoVerificado }. */
function Ges_pendenciasDecisao_() {
  if (typeof Pend_calcular_ !== 'function') return { itens: [], naoVerificado: ['central de pendências'] };
  var calc = Pend_calcular_(Pend_contextoInterno_());
  return { itens: calc.itens.filter(Ges_entra_), naoVerificado: calc.naoVerificado || [] };
}

/** Linha aberta de cada item (ITEM_ID -> linha). */
function Ges_registrosAbertos_() {
  var m = {};
  Ges_ler_(GES_ABA_DECISOES).forEach(function (d) { if (Ges_up_(d.SITUACAO) === 'ABERTA') m[Ges_s_(d.ITEM_ID)] = d; });
  return m;
}

/** Base de contagem do "parado": a última providência, ou a data de acompanhamento já vencida, ou a entrada. */
function Ges_baseParado_(reg) {
  var base = Ges_dia_(reg.ENTROU_EM), prov = Ges_dia_(reg.PROVIDENCIA_EM), acomp = Ges_dia_(reg.ACOMPANHAR_ATE);
  if (prov && prov > base) base = prov;
  if (acomp && acomp > base) base = acomp;
  return base;
}

/**
 * Situação de um item na escada hoje: { diasParado, pausadoAte, etapa, etapaTexto, prazoVencido }.
 * etapa: NA_HORA (entrou), EMAIL (resumo diário), WHATSAPP (parado há N dias úteis), DIRETORIA (parado há M dias úteis), PAUSADO, ACOMPANHAMENTO.
 */
function Ges_etapa_(reg, cfg, hoje, cfgExp) {
  var acomp = Ges_dia_(reg.ACOMPANHAR_ATE);
  var prazo = Ges_dia_(reg.PRAZO_DECISAO);
  var r = { diasParado: Ges_diasUteisEntre_(Ges_baseParado_(reg), hoje, cfgExp), pausadoAte: acomp && acomp >= hoje ? acomp : '', prazoVencido: !!(prazo && prazo < hoje && !Ges_s_(reg.PRIMEIRA_ACAO_EM)) };
  if (Ges_up_(reg.ACOMPANHAMENTO) === 'SIM') { r.etapa = 'ACOMPANHAMENTO'; r.etapaTexto = 'Acompanhamento (não sobe a escada)'; return r; }
  if (r.pausadoAte) { r.etapa = 'PAUSADO'; r.etapaTexto = 'Providência registrada; acompanhar até ' + Ges_brDia_(acomp); return r; }
  var e = cfg.escada;
  if (r.diasParado >= e.diretoriaDiasUteis) { r.etapa = 'DIRETORIA'; r.etapaTexto = 'Parado há ' + Ges_plural_(r.diasParado, 'dia útil', 'dias úteis') + ': com a Diretoria'; }
  else if (r.diasParado >= e.whatsDiasUteis) { r.etapa = 'WHATSAPP'; r.etapaTexto = 'Parado há ' + Ges_plural_(r.diasParado, 'dia útil', 'dias úteis') + ': entra no resumo do WhatsApp'; }
  else if (r.diasParado >= 1) { r.etapa = 'EMAIL'; r.etapaTexto = 'Parado há 1 dia útil: no e-mail diário'; }
  else { r.etapa = 'NA_HORA'; r.etapaTexto = 'Novo'; }
  return r;
}

/**
 * Atualiza GES_DECISOES com o que está na central agora (sob trava): item novo ganha linha
 * (ENTROU_EM agora), item que sumiu fica RESOLVIDA (ou "venceu sem decisão" quando a ocorrência
 * foi descartada pelo prazo). Se alguma fonte da central falhou, nada é dado como resolvido.
 * Devolve { novos, resolvidos, abertos, naoVerificado }.
 */
function Ges_sincronizar_() {
  Ges_garantirAbas_();
  var cfg = Ges_cfg_(), us = Ges_usuarios_(), cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  var pend = Ges_pendenciasDecisao_();
  return Ges_comTrava_(function () {
    var agora = Ges_agora_(), hoje = agora.slice(0, 10);
    if (!cfg.implantadoEm) { cfg.implantadoEm = agora; try { var g = Ges_json_(PropertiesService.getScriptProperties().getProperty(GES_CFG_PROP), {}) || {}; g.implantadoEm = agora; Ges_cfgGravar_(g); } catch (e) {} }
    var abertos = Ges_registrosAbertos_(), vistos = {}, novos = [], resolvidos = 0;
    pend.itens.forEach(function (it) {
      vistos[it.id] = true;
      var rot = Ges_rotear_(it, cfg, us), t = GES_TIPOS[it.tipo] || {}, ex = it.extra || {};
      var reg = abertos[it.id];
      if (!reg) {
        var prazo = Ges_dia_(ex.prazo) || Ges_somarDiasUteis_(hoje, t.prazo || 2, cfgExp);
        novos.push({ ITEM_ID: it.id, TIPO: it.tipo.toUpperCase(), MODULO: it.modulo, TITULO: Ges_s_(it.titulo).slice(0, 300), DETALHE: Ges_s_(it.detalhe).slice(0, 600),
          AREA: rot.area, RESPONSAVEIS_IDS: rot.ids.join(','), RESPONSAVEIS_NOMES: rot.ids.map(function (id) { return us[id] ? us[id].nome : id; }).join(', '),
          RESERVA_DIRETORIA: rot.reserva ? 'SIM' : '', ENVOLVIDO_ID: Ges_s_(it.responsavelId), ENVOLVIDO_NOME: Ges_s_(it.responsavel),
          ENTROU_EM: agora, PRAZO_DECISAO: prazo, PROVIDENCIAS: 0, SITUACAO: 'ABERTA', ACOMPANHAMENTO: t.acompanhamento ? 'SIM' : '',
          TELA_JSON: JSON.stringify(it.tela || null), ATUALIZADO_EM: agora });
        return;
      }
      // responsáveis mudaram (configuração nova, pessoa inativada): atualiza a linha
      var ids = rot.ids.join(',');
      if (ids !== Ges_s_(reg.RESPONSAVEIS_IDS) || Ges_s_(it.titulo).slice(0, 300) !== Ges_s_(reg.TITULO)) {
        SGO_DATA.update(GES_ABA_DECISOES, reg.ID, { RESPONSAVEIS_IDS: ids, RESPONSAVEIS_NOMES: rot.ids.map(function (id) { return us[id] ? us[id].nome : id; }).join(', '),
          RESERVA_DIRETORIA: rot.reserva ? 'SIM' : '', AREA: rot.area, TITULO: Ges_s_(it.titulo).slice(0, 300), DETALHE: Ges_s_(it.detalhe).slice(0, 600), ATUALIZADO_EM: agora });
      }
      // escalonamento para a Diretoria (registrado uma vez por item)
      var et = Ges_etapa_(reg, cfg, hoje, cfgExp);
      if (et.etapa === 'DIRETORIA' && !Ges_s_(reg.ESCALADO_EM)) {
        SGO_DATA.update(GES_ABA_DECISOES, reg.ID, { ESCALADO_EM: agora, ESCALADO_PARA: Ges_diretoria_(us, []).join(','), ATUALIZADO_EM: agora });
      }
    });
    if (novos.length) SGO_DATA.insertMany(GES_ABA_DECISOES, novos);
    if (!pend.naoVerificado.length) {
      var ocorrencias = null;
      Object.keys(abertos).forEach(function (itemId) {
        if (vistos[itemId]) return;
        var reg = abertos[itemId], sit = 'RESOLVIDA';
        if (/^CONDUTA:OC:/.test(itemId) && typeof CONDUTA_SHEETS !== 'undefined') {
          if (!ocorrencias) { ocorrencias = {}; Ges_ler_(CONDUTA_SHEETS.OCORRENCIA).forEach(function (o) { ocorrencias[Ges_s_(o.ID)] = o; }); }
          var o = ocorrencias[itemId.split(':')[2]];
          if (o && Ges_up_(o.STATUS) === 'DESCARTADA' && /DESCARTE_PRAZO/.test(Ges_s_(o.HISTORICO_JSON))) sit = 'PERDIDA';
        }
        SGO_DATA.update(GES_ABA_DECISOES, reg.ID, { SITUACAO: sit, RESOLVIDO_EM: agora, ATUALIZADO_EM: agora });
        resolvidos++;
      });
    }
    return { novos: novos.length, resolvidos: resolvidos, abertos: pend.itens.length, naoVerificado: pend.naoVerificado };
  });
}

/** Sincroniza se a última vez foi há mais de 3 minutos (as telas chamam; a rotina força). */
function Ges_sincronizarTalvez_(forcar) {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (!forcar && cache.get('GES_SINC_RECENTE')) return null; } catch (e) {}
  var r = Ges_sincronizar_();
  try { if (cache) cache.put('GES_SINC_RECENTE', '1', 180); } catch (e) {}
  return r;
}

/** Itens abertos da caixa com tudo o que a tela precisa (sem Date cru). */
function Ges_caixa_() {
  var cfg = Ges_cfg_(), us = Ges_usuarios_(), cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  var pend = Ges_pendenciasDecisao_(), abertos = Ges_registrosAbertos_(), hoje = Ges_hoje_(), agora = Ges_agora_();
  var itens = pend.itens.map(function (it) {
    var rot = Ges_rotear_(it, cfg, us), t = GES_TIPOS[it.tipo] || {}, ex = it.extra || {};
    var reg = abertos[it.id] || { ENTROU_EM: agora, PRAZO_DECISAO: Ges_dia_(ex.prazo) || Ges_somarDiasUteis_(hoje, t.prazo || 2, cfgExp), ACOMPANHAMENTO: t.acompanhamento ? 'SIM' : '', PROVIDENCIAS: 0 };
    var et = Ges_etapa_(reg, cfg, hoje, cfgExp);
    var prazo = Ges_dia_(reg.PRAZO_DECISAO);
    return {
      id: it.id, registroId: Ges_s_(reg.ID), tipo: it.tipo, modulo: it.modulo, moduloNome: it.moduloNome, gravidade: it.gravidade, rotulo: it.rotulo,
      titulo: it.titulo, detalhe: it.detalhe, oQueFazer: it.oQueFazerOutro || it.oQueFazer, tela: it.telaOutro || it.tela || null,
      area: rot.area, areaNome: rot.areaNome, responsaveis: rot.ids, responsaveisNomes: rot.ids.map(function (id) { return us[id] ? us[id].nome : id; }), reserva: rot.reserva, motivoRota: rot.motivo,
      envolvido: Ges_s_(it.responsavel), envolvidoId: Ges_s_(it.responsavelId), entrouEm: Ges_br_(reg.ENTROU_EM), entrouDia: Ges_dia_(reg.ENTROU_EM),
      idadeDiasUteis: Ges_diasUteisEntre_(Ges_dia_(reg.ENTROU_EM), hoje, cfgExp), prazo: Ges_brDia_(prazo), prazoIso: prazo,
      prazoVencido: et.prazoVencido, diasParado: et.diasParado, etapa: et.etapa, etapaTexto: et.etapaTexto, pausadoAte: Ges_brDia_(et.pausadoAte),
      providencia: Ges_s_(reg.PROVIDENCIA_TEXTO), providenciaPor: Ges_s_(reg.PROVIDENCIA_POR_NOME), providenciaEm: Ges_br_(reg.PROVIDENCIA_EM), providencias: Number(reg.PROVIDENCIAS) || 0,
      escalado: !!Ges_s_(reg.ESCALADO_EM) || et.etapa === 'DIRETORIA', acompanhamento: et.etapa === 'ACOMPANHAMENTO', resolveNaCaixa: !!t.resolveNaCaixa,
      soDiretoria: it.publico === 'DIRETORIA', sigilo: !!ex.sigilo
    };
  });
  var ordemEt = { DIRETORIA: 0, WHATSAPP: 1, EMAIL: 2, NA_HORA: 3, PAUSADO: 4, ACOMPANHAMENTO: 5 };
  itens.sort(function (a, b) {
    return (ordemEt[a.etapa] - ordemEt[b.etapa]) || ((a.prazoVencido ? 0 : 1) - (b.prazoVencido ? 0 : 1)) || (b.diasParado - a.diasParado) ||
      ((PEND_GRAV_ORDEM[a.gravidade] || 0) - (PEND_GRAV_ORDEM[b.gravidade] || 0)) || String(a.prazoIso).localeCompare(String(b.prazoIso));
  });
  return { itens: itens, naoVerificado: pend.naoVerificado, cfg: cfg, us: us };
}

/** Itens que esperam por esta pessoa (ela é responsável, ou é da Diretoria e o item foi escalado). */
function Ges_meusItens_(itens, uid, us) {
  var eu = us[uid] || {};
  return itens.filter(function (i) { return i.responsaveis.indexOf(uid) >= 0 || (eu.diretoria && i.escalado && !i.acompanhamento); });
}

// ------------------------------------------------------------
// ACESSOS (para "dias sem acessar" da avaliação)
// ------------------------------------------------------------
function Ges_registrarAcesso_(sessao) {
  try {
    var uid = Ges_s_(sessao && sessao.userId);
    if (!uid) return;
    var dia = Ges_hoje_(), chave = 'GES_ACESSO_' + uid + '_' + dia, cache = CacheService.getScriptCache();
    if (cache.get(chave)) return;
    Ges_garantirAbas_();
    var ja = Ges_ler_(GES_ABA_ACESSOS).some(function (a) { return Ges_s_(a.USUARIO_ID) === uid && Ges_s_(a.DIA).slice(0, 10) === dia; });
    if (!ja) SGO_DATA.insert(GES_ABA_ACESSOS, { USUARIO_ID: uid, USUARIO_NOME: Ges_s_(sessao.nome || sessao.usuario), DIA: dia, PRIMEIRO_EM: Ges_agora_() });
    cache.put(chave, '1', 21600);
  } catch (e) { console.error('Gestão, registro de acesso: ' + ((e && e.message) || e)); }
}

// ------------------------------------------------------------
// API (google.script.run)
// ------------------------------------------------------------
function Ges_resposta_(acao, fn) {
  try { return JSON.parse(JSON.stringify(Object.assign({ ok: true }, fn() || {}))); }
  catch (e) {
    var m = String((e && e.message) || e).replace(/[.\s]+$/, '');
    return { ok: false, message: /^Não foi possível/.test(m) ? m + '.' : 'Não foi possível ' + acao + ': ' + m + '.' };
  }
}

function Ges_sessaoGestao_(sessionId, acao) {
  var s = exigirSessao(sessionId);
  if (!Ges_ehRotinaPerfil_(s.perfil)) {
    throw new Error('Não foi possível ' + acao + ': a Caixa de decisões é da gestão (Administrador, Diretoria, Gestor, RH e Financeiro). O que depende de você continua no Início e em Minhas atividades');
  }
  return s;
}

function Ges_podeConfigurar_(s) {
  var p = Ges_up_(s.perfil);
  if (p === 'ADMIN' || p === 'DIRETORIA') return true;
  try { return typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(s.usuario); } catch (e) { return false; }
}

function Ges_ehDiretoriaSessao_(s) {
  if (Ges_up_(s.perfil) === 'DIRETORIA') return true;
  try { return typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(s.usuario); } catch (e) { return false; }
}

/** Item para a tela (sem a lista de ids de quem recebe). */
function Ges_itemTela_(i, uid) {
  var o = {};
  Object.keys(i).forEach(function (k) { if (k !== 'responsaveis') o[k] = i[k]; });
  o.meu = i.responsaveis.indexOf(uid) >= 0;
  return o;
}

/**
 * Caixa de decisões da pessoa logada. payload.filtro: 'minhas' (padrão) | 'todas' | 'escalados'.
 * Toda a gestão pode ver "todas" (só leitura do que é de outro); "minhas" é o que espera por ela.
 */
function Gestao_apiCaixa(sessionId, payload) {
  return Ges_resposta_('abrir a Caixa de decisões', function () {
    var s = Ges_sessaoGestao_(sessionId, 'abrir a Caixa de decisões');
    Ges_registrarAcesso_(s);
    Ges_sincronizarTalvez_(false);
    return Ges_montarCaixa_(s, payload || {});
  });
}

function Ges_montarCaixa_(s, p) {
  var cx = Ges_caixa_(), uid = Ges_s_(s.userId), us = cx.us, cfg = cx.cfg;
  // item só da Diretoria (sugestão sobre gestor, da avaliação): os demais da gestão não veem nem na lista geral
  if (!Ges_ehDiretoriaSessao_(s)) cx.itens = cx.itens.filter(function (i) { return !i.soDiretoria; });
  // 28/10/2026: ocorrência do Programa de conduta (com o nome do envolvido) só para a Diretoria e o Gestor de Qualidade
  if (!Ges_veSigilo_(us[uid])) cx.itens = cx.itens.filter(function (i) { return !i.sigilo || i.responsaveis.indexOf(uid) >= 0; });
  // RH e Financeiro (rotina): só os itens das áreas em que são responsáveis, também em "todas" e "escalados".
  if (!Ges_ehGestaoPerfil_(s.perfil)) cx.itens = cx.itens.filter(function (i) { return i.responsaveis.indexOf(uid) >= 0; });
  var minhas = Ges_meusItens_(cx.itens, uid, us);
  var filtro = ['minhas', 'todas', 'escalados', 'acompanhamento'].indexOf(p.filtro) >= 0 ? p.filtro : 'minhas';
  var lista = filtro === 'todas' ? cx.itens.filter(function (i) { return !i.acompanhamento; })
    : filtro === 'escalados' ? cx.itens.filter(function (i) { return i.escalado && !i.acompanhamento; })
      : filtro === 'acompanhamento' ? cx.itens.filter(function (i) { return i.acompanhamento && (i.responsaveis.indexOf(uid) >= 0 || us[uid] && us[uid].diretoria); })
        : minhas.filter(function (i) { return !i.acompanhamento; });
  var conta = function (l) {
    return { total: l.length, parados: l.filter(function (i) { return i.etapa === 'WHATSAPP' || i.etapa === 'DIRETORIA'; }).length,
      escalados: l.filter(function (i) { return i.escalado; }).length, prazoVencido: l.filter(function (i) { return i.prazoVencido; }).length,
      novos: l.filter(function (i) { return i.etapa === 'NA_HORA'; }).length };
  };
  var minhasDecisao = minhas.filter(function (i) { return !i.acompanhamento; });
  var porModulo = {};
  minhasDecisao.forEach(function (i) { var m = porModulo[i.modulo] = porModulo[i.modulo] || { nome: i.moduloNome, total: 0 }; m.total++; });
  return {
    filtro: filtro, itens: lista.slice(0, 400).map(function (i) { return Ges_itemTela_(i, uid); }), cortado: lista.length > 400,
    resumo: conta(minhasDecisao), resumoTodas: conta(cx.itens.filter(function (i) { return !i.acompanhamento; })),
    acompanhamento: cx.itens.filter(function (i) { return i.acompanhamento && (i.responsaveis.indexOf(uid) >= 0 || (us[uid] && us[uid].diretoria)); }).length,
    porModulo: porModulo, naoVerificado: cx.naoVerificado,
    regras: { whatsDiasUteis: cfg.escada.whatsDiasUteis, diretoriaDiasUteis: cfg.escada.diretoriaDiasUteis, horaEmail: cfg.escada.horaEmail, emailDiario: cfg.escada.emailDiario, whatsapp: cfg.escada.whatsapp, pausaMaxDias: GES_PAUSA_MAX_DIAS },
    eu: { id: uid, nome: Ges_s_(s.nome), diretoria: Ges_ehDiretoriaSessao_(s), podeConfigurar: Ges_podeConfigurar_(s), areas: Ges_areasDoGestor_(uid, cfg).map(function (a) { return (typeof Areas_mapaNomes_ === 'function' ? Areas_mapaNomes_()[a] : '') || a; }) },
    configurado: Object.keys(cfg.gestoresPorArea).some(function (a) { return (cfg.gestoresPorArea[a] || []).length; }),
    geradoEm: Ges_br_(Ges_agora_())
  };
}

/** Contagem para o balão do menu e do celular; registra o acesso do dia (avaliação). Nunca lança. */
function Gestao_apiResumo(sessionId) {
  try {
    var s = exigirSessao(sessionId);
    if (!Ges_ehRotinaPerfil_(s.perfil)) return { ok: true, gestao: false };
    Ges_registrarAcesso_(s);
    var chave = 'GES_RESUMO_' + Ges_s_(s.userId), cache = null;
    try { cache = CacheService.getScriptCache(); var g = cache.get(chave); if (g) return JSON.parse(g); } catch (e) {}
    var cx = Ges_caixa_(), minhas = Ges_meusItens_(cx.itens, Ges_s_(s.userId), cx.us).filter(function (i) { return !i.acompanhamento; });
    var r = { ok: true, gestao: true, total: minhas.length, parados: minhas.filter(function (i) { return i.etapa === 'WHATSAPP' || i.etapa === 'DIRETORIA'; }).length,
      escalados: minhas.filter(function (i) { return i.escalado; }).length };
    try { if (cache) cache.put(chave, JSON.stringify(r), 120); } catch (e) {}
    return r;
  } catch (e) { return { ok: false, message: 'Não foi possível contar as decisões: ' + String((e && e.message) || e) }; }
}

/**
 * Registrar providência (o que foi feito e até quando acompanhar) ou "Ciente" (justificativa de atraso).
 * payload: { itemId, texto (>= 10 letras), acompanharAte ('aaaa-mm-dd', até 10 dias corridos), ciente: true }
 * Conta como decisão tomada (primeira ação) e pausa a escada até a data de acompanhamento.
 */
function Gestao_apiProvidencia(sessionId, payload) {
  return Ges_resposta_('registrar a providência', function () {
    var s = Ges_sessaoGestao_(sessionId, 'registrar a providência');
    var p = payload || {}, itemId = Ges_s_(p.itemId), texto = Ges_s_(p.texto).replace(/\s+/g, ' ');
    if (!itemId) throw new Error('o item não foi informado. Feche a janela, atualize a caixa e tente de novo');
    if (texto.length < 10) throw new Error('escreva o que foi feito (pelo menos 10 letras), por exemplo "Liguei para o condutor; ele devolve hoje às 17h", e toque de novo em Registrar');
    Ges_sincronizar_();
    var cx = Ges_caixa_(), it = cx.itens.filter(function (i) { return i.id === itemId; })[0];
    if (!it) throw new Error('este item já saiu da caixa (foi resolvido ou mudou). Atualize a caixa para ver a lista de agora');
    var us = cx.us, uid = Ges_s_(s.userId);
    var podeAgir = it.responsaveis.indexOf(uid) >= 0 || (us[uid] && us[uid].diretoria) || Ges_up_(s.perfil) === 'ADMIN';
    if (!podeAgir) throw new Error('este item é de ' + (it.responsaveisNomes.join(', ') || 'outra pessoa da gestão') + '. Você acompanha, mas quem registra a providência é o responsável ou a Diretoria');
    if (it.envolvidoId && it.envolvidoId === uid && !(us[uid] && us[uid].diretoria)) throw new Error('o item é sobre você: quem decide é o seu gestor ou a Diretoria');
    var hoje = Ges_hoje_(), ate = '';
    if (p.ciente) {
      if (!it.resolveNaCaixa) throw new Error('"Ciente" só vale para justificativa de atraso. Para este item, registre a providência com a data de acompanhamento');
    } else {
      ate = Ges_dia_(p.acompanharAte);
      if (!ate) throw new Error('escolha até quando acompanhar (data de hoje até ' + Ges_brDia_(Ges_somarDias_(hoje, GES_PAUSA_MAX_DIAS)) + ') e toque de novo em Registrar');
      if (ate < hoje || ate > Ges_somarDias_(hoje, GES_PAUSA_MAX_DIAS)) throw new Error('a data de acompanhamento precisa ficar entre hoje e ' + Ges_brDia_(Ges_somarDias_(hoje, GES_PAUSA_MAX_DIAS)) + ' (no máximo ' + GES_PAUSA_MAX_DIAS + ' dias). Se precisar de mais, registre de novo quando chegar a data');
    }
    return Ges_comTrava_(function () {
      var reg = Ges_registrosAbertos_()[itemId];
      if (!reg) throw new Error('o item ainda não estava registrado na caixa. Atualize a caixa e tente de novo');
      var agora = Ges_agora_(), campos = {
        PROVIDENCIAS: (Number(reg.PROVIDENCIAS) || 0) + 1, PROVIDENCIA_EM: agora, PROVIDENCIA_TEXTO: (p.ciente ? 'Ciente da justificativa. ' : '') + texto.slice(0, 900),
        PROVIDENCIA_POR_ID: uid, PROVIDENCIA_POR_NOME: Ges_s_(s.nome || s.usuario), ACOMPANHAR_ATE: ate, ATUALIZADO_EM: agora
      };
      if (!Ges_s_(reg.PRIMEIRA_ACAO_EM)) { campos.PRIMEIRA_ACAO_EM = agora; campos.PRIMEIRA_ACAO_POR_ID = uid; }
      if (p.ciente) { campos.SITUACAO = 'RESOLVIDA'; campos.RESOLVIDO_EM = agora; }
      SGO_DATA.update(GES_ABA_DECISOES, reg.ID, campos);
      try { SGO_DATA.log(p.ciente ? 'GESTAO_CIENTE' : 'GESTAO_PROVIDENCIA', s.usuario, itemId + ': ' + texto.slice(0, 300) + (ate ? ' (acompanhar até ' + Ges_brDia_(ate) + ')' : ''), 'GESTAO'); } catch (e) {}
      try { CacheService.getScriptCache().remove('GES_RESUMO_' + uid); } catch (e) {}
      if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_();
      return { message: p.ciente ? 'Justificativa avaliada: o item saiu da caixa.' : 'Providência registrada. O item fica na caixa até ser resolvido na tela de origem; a cobrança volta a contar depois de ' + Ges_brDia_(ate) + '.' };
    });
  });
}

/**
 * Regras e responsáveis (Administrador e Diretoria). Sem payload.salvar só lê.
 * payload.salvar: { gestoresPorArea: { AREA: [ids] }, areaPorModulo: { modulo: AREA }, escada: {...}, automacoes: {...} }
 * Pesos e faixas da avaliação: Gestao_apiConfigAvaliacao (só Diretoria).
 */
function Gestao_apiConfig(sessionId, payload) {
  return Ges_resposta_('abrir as regras da Caixa de decisões', function () {
    var s = Ges_sessaoGestao_(sessionId, 'abrir as regras da Caixa de decisões');
    var p = payload || {};
    var areas = typeof Areas_todas_ === 'function' ? (function () { try { if (typeof Areas_garantir_ === 'function') Areas_garantir_(); } catch (e) {} return Areas_todas_().filter(function (a) { return a.ATIVO; }); })() : [];
    var us = Ges_usuarios_();
    if (p.salvar) {
      if (!Ges_podeConfigurar_(s)) throw new Error('as regras e os responsáveis são definidos pelo Administrador ou pela Diretoria. Peça a uma dessas pessoas');
      var v = p.salvar, atual = Ges_json_(PropertiesService.getScriptProperties().getProperty(GES_CFG_PROP), {}) || {};
      var codigos = areas.map(function (a) { return a.CODIGO; });
      var gpa = {};
      Object.keys(v.gestoresPorArea || {}).forEach(function (a) {
        var cod = Ges_up_(a);
        if (codigos.indexOf(cod) < 0) return;
        var ids = (v.gestoresPorArea[a] || []).map(Ges_s_).filter(function (id, i, l) { return us[id] && us[id].ativo && (us[id].gestao || us[id].rotina) && l.indexOf(id) === i; });
        if (ids.length) gpa[cod] = ids;
      });
      var apm = {};
      GES_MODULOS_CONFIG.forEach(function (m) { var a = Ges_up_((v.areaPorModulo || {})[m[0]]); if (a && codigos.indexOf(a) >= 0) apm[m[0]] = a; });
      var e = v.escada || {};
      ['horaEmail', 'horaSemanal'].forEach(function (k) { if (e[k] && !Ges_horaValida_(e[k])) throw new Error('a hora ' + e[k] + ' não está no formato HH:MM (por exemplo 08:00). Corrija e salve de novo'); });
      var w = Math.round(Number(e.whatsDiasUteis)), d = Math.round(Number(e.diretoriaDiasUteis));
      if (!(w >= 1 && w <= 20)) throw new Error('o WhatsApp entra depois de 1 a 20 dias úteis parado. Corrija o número e salve de novo');
      if (!(d > w && d <= 30)) throw new Error('a Diretoria precisa entrar depois do WhatsApp (dias úteis maior que ' + w + ', até 30). Corrija e salve de novo');
      var exp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : { ini: '08:00', fim: '17:30' };
      ['horaEmail', 'horaSemanal'].forEach(function (k) { if (e[k] && (e[k] < exp.ini || e[k] >= exp.fim)) throw new Error('a hora do envio (' + e[k] + ') precisa ficar dentro do horário de trabalho (' + exp.ini + ' a ' + exp.fim + ', em Atividades da equipe > Avisos e horários)'); });
      atual.gestoresPorArea = gpa;
      atual.areaPorModulo = apm;
      atual.escada = { emailDiario: e.emailDiario !== false, horaEmail: e.horaEmail || GES_CFG_PADRAO.escada.horaEmail, whatsapp: e.whatsapp !== false, whatsDiasUteis: w, diretoriaDiasUteis: d,
        semanal: e.semanal !== false, horaSemanal: e.horaSemanal || GES_CFG_PADRAO.escada.horaSemanal, mensal: e.mensal !== false };
      var au = v.automacoes || {};
      atual.automacoes = {}; Object.keys(GES_CFG_PADRAO.automacoes).forEach(function (k) { atual.automacoes[k] = au[k] !== false; });
      // 26/10/2026: escalonamento por prioridade e resumo do dia (SGO_Sedna.js); valida antes de gravar qualquer coisa
      var sedna = v.sedna && typeof Sedna_cfgSalvar_ === 'function' ? Sedna_cfgSalvar_(v.sedna) : null;
      Ges_cfgGravar_(atual);
      if (sedna) { try { SGO_DATA.log('GESTAO_REGRAS', s.usuario, 'Escalonamento e resumo do dia: ' + JSON.stringify(sedna).slice(0, 1000), 'GESTAO'); } catch (eS) {} }
      try { SGO_DATA.log('GESTAO_REGRAS', s.usuario, 'Caixa de decisões: ' + JSON.stringify({ gestoresPorArea: gpa, areaPorModulo: apm, escada: atual.escada, automacoes: atual.automacoes }).slice(0, 1500), 'GESTAO'); } catch (eL) {}
      try { CacheService.getScriptCache().remove('GES_SINC_RECENTE'); } catch (eC) {}
    }
    var cfg = Ges_cfg_();
    return {
      podeConfigurar: Ges_podeConfigurar_(s), cfg: { gestoresPorArea: cfg.gestoresPorArea, areaPorModulo: cfg.areaPorModulo, escada: cfg.escada, automacoes: cfg.automacoes },
      sedna: typeof Sedna_cfg_ === 'function' ? Sedna_cfg_() : null,
      areaPadrao: GES_AREA_MODULO_PADRAO, modulos: GES_MODULOS_CONFIG.map(function (m) { return { chave: m[0], nome: m[1] }; }),
      areas: areas.map(function (a) { return { codigo: a.CODIGO, nome: a.NOME }; }),
      // 21/10/2026: RH e Financeiro também podem ser responsáveis de uma área (rotina da empresa).
      gestao: Object.keys(us).filter(function (id) { return us[id].ativo && (us[id].gestao || us[id].rotina); }).map(function (id) { return { id: id, nome: us[id].nome, perfil: us[id].perfil, area: us[id].areaNome }; })
        .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }),
      diretoria: Ges_diretoria_(us, []).map(function (id) { return us[id].nome; }),
      expediente: typeof SGO_expediente_ === 'function' ? (function () { var x = SGO_expediente_(); return { ini: x.ini, fim: x.fim }; })() : { ini: '08:00', fim: '17:30' },
      message: p.salvar ? 'Regras salvas. A caixa passa a usar os responsáveis novos na próxima atualização.' : ''
    };
  });
}

// ------------------------------------------------------------
// PONTE COM O COMMAND (SGO_PonteCommand.js, ações gestao.*)
// ------------------------------------------------------------
/**
 * gestao.caixa  { sgoUsuarioId, payload: { filtro } } -> a caixa da pessoa (só gestão do SGO+)
 * gestao.resumo { sgoUsuarioId }                       -> contagem para o cartão da Central
 * gestao.avaliacao { sgoUsuarioId, payload: { competencia, gestorId } } -> só o próprio gestor e a Diretoria
 * Só leitura: providência e configuração continuam no SGO+.
 */
function Gestao_ponte_(acao, dados) {
  dados = dados || {};
  var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, Ges_s_(dados.sgoUsuarioId));
  if (!u || Ges_up_(u.STATUS || 'ATIVO') !== 'ATIVO' || Ges_up_(u.PERFIL) === 'CLIENTE') {
    return { ok: false, erro: 'A sua conta do COMMAND não está ligada a um usuário ativo da equipe no SGO+. Peça ao administrador para ligar a conta em Usuários e papéis (Migrar do SGO+).' };
  }
  var s = { userId: Ges_s_(u.ID), usuario: Ges_s_(u.USUARIO), nome: Ges_s_(u.NOME) || Ges_s_(u.USUARIO), perfil: Ges_up_(u.PERFIL) };
  try {
    if (acao === 'gestao.avaliacao') {
      if (typeof Ges_avaliacaoParaSessao_ !== 'function') return { ok: false, erro: 'Avaliação da gestão indisponível no SGO+.' };
      var a = Ges_avaliacaoParaSessao_(s, dados.payload || {});
      a.ok = true; return JSON.parse(JSON.stringify(a));
    }
    if (!Ges_ehRotinaPerfil_(s.perfil)) return { ok: false, erro: 'A Caixa de decisões é da gestão do SGO+ (Administrador, Diretoria, Gestor, RH e Financeiro). O seu perfil no SGO+ é ' + s.perfil + '.' };
    Ges_registrarAcesso_(s);
    if (acao === 'gestao.resumo') { var r = Gestao_apiResumoDe_(s); r.ok = true; return r; }
    if (acao === 'gestao.caixa') {
      Ges_sincronizarTalvez_(false);
      var c = Ges_montarCaixa_(s, dados.payload || {});
      c.ok = true; c.linkSgo = Ges_linkTela_('gestao_decisoes');
      return JSON.parse(JSON.stringify(c));
    }
    return { ok: false, erro: 'Ação da gestão desconhecida.' };
  } catch (e) { var m = String((e && e.message) || e); return { ok: false, erro: m, message: m }; }
}

function Gestao_apiResumoDe_(s) {
  var cx = Ges_caixa_(), minhas = Ges_meusItens_(cx.itens, Ges_s_(s.userId), cx.us).filter(function (i) { return !i.acompanhamento; });
  return { total: minhas.length, parados: minhas.filter(function (i) { return i.etapa === 'WHATSAPP' || i.etapa === 'DIRETORIA'; }).length, escalados: minhas.filter(function (i) { return i.escalado; }).length };
}

/** Endereço do SGO+ que abre direto uma tela depois do login (?tela=...). */
function Ges_linkTela_(tela) {
  var base = '';
  try { base = String(ScriptApp.getService().getUrl() || ''); } catch (e) { base = ''; }
  if (!base) return '';
  return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'tela=' + encodeURIComponent(tela);
}
