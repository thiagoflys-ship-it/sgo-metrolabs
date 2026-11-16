/**
 * 16/11/2026 (pedido do dono): o Financeiro (Painel financeiro, Omie) é SIGILOSO. Só a Diretoria e a Wanessa (Financeiro).
 *
 * Trava fixa, acima das caixas de Administração > Acessos: a conta precisa estar na LISTA DE SIGILO para qualquer caixa
 * FIN_OMIE_* valer. Exceção gravada em Acessos, modelo ou "copiar de outra pessoa" não liberam quem está fora da lista.
 * A lista fica na propriedade OMIE_SIGILO_CONTAS (IDs das contas, JSON) e só o responsável pelo sistema (SGO_DONOS) a altera,
 * no próprio Painel financeiro > Sigilo e acessos. Vazia ou ilegível = a lista padrão abaixo (nunca abre para todos).
 * Toda consulta ao Financeiro fica registrada (quem, o quê, quando; nenhum valor) em FIN_OMIE_ACESSOS, e toda recusa também.
 */
var OMIE_SIGILO_PADRAO = [
  '3a63382c-e790-4e5a-b60c-28a83a7e1a26', // admin (responsável pelo sistema, Diretoria)
  '1ec5d6d0-284c-4919-aa05-8804172a070e', // charles (Diretoria)
  '84d0dbf3-216e-414e-af56-3b0ee0b18fc7'  // wanessa (Financeiro)
];
var OMIE_SIGILO_PROP = 'OMIE_SIGILO_CONTAS';
var OMIE_ACESSOS_ABA = 'FIN_OMIE_ACESSOS';
var OMIE_ACESSOS_COLUNAS = ['ID', 'EM', 'USUARIO_ID', 'USUARIO', 'NOME', 'CONSULTA', 'RESULTADO', 'DETALHE'];
var OMIE_SIGILO_MSG = 'O Financeiro é sigiloso: só a Diretoria e o Financeiro autorizado o acessam. Nada foi consultado. Se você precisa de uma informação financeira, peça à Diretoria.';
var OMIE_SIGILO_REGISTRO_MS = 10 * 60 * 1000; // a mesma consulta da mesma pessoa é registrada uma vez a cada 10 minutos
var OMIE_SIGILO_NOMES = {
  Omie_apiIniciar: 'Abrir o Painel financeiro', Omie_apiListar: 'Contas a pagar e receber', Omie_apiResumo: 'Visão geral (resumo)',
  Omie_apiAgenda: 'Agenda de vencimentos', Omie_apiPosicao: 'Posição de hoje', Omie_apiVencidosClientes: 'Vencidos por cliente',
  Omie_apiResultado: 'Resultado do mês', Omie_apiFluxo: 'Fluxo de caixa', Omie_apiOrcamento: 'Orçamento',
  Omie_apiCsv: 'Planilha baixada (CSV)', Omie_apiSigilo: 'Sigilo e acessos', Omie_apiSigiloSalvar: 'Lista de sigilo alterada',
  OmiePed_apiListar: 'Pedidos aprovados', Omie_apiClienteBuscar: 'Ficha do cliente (busca)', Omie_apiClienteFicha: 'Ficha do cliente', OmiePed_apiPreparar: 'Preparar conta a receber', GV_omieRecebimentos_: 'Recebimentos do Omie (Ganhos)',
  // 16/11/2026: cadastro no Omie, notas recebidas, envios a conferir e planilha de Compras (especificação do Financeiro)
  OmieCad_apiBuscar: 'Busca de cliente ou fornecedor no Omie', OmieCad_apiPrevia: 'Prévia de cadastro no Omie', OmieCad_apiConfirmar: 'Cadastro no Omie',
  OmieNota_apiLer: 'Nota recebida (leitura)', OmieNota_apiPrevia: 'Nota recebida (prévia)', OmieNota_apiConfirmar: 'Nota recebida lançada no Omie', OmieNota_apiHistorico: 'Notas lançadas',
  OmieOps_apiIncertos: 'Envios a conferir', OmieOps_apiResolverIncerto: 'Envio conferido no Omie', CmpFin_planilha: 'Planilha da conferência de Compras',
  // 16/11/2026 (Onda 2): aba Indicadores (lê só a fotografia gravada; não chama o Omie) e o pedido de nova fotografia
  Fin_apiIndicadores: 'Indicadores do Financeiro', Fin_apiFotoPedir: 'Pedido de nova fotografia do Financeiro'
};

function OmieSig_s_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
/** Lista de sigilo vigente (IDs). Propriedade vazia, ilegível ou sem nenhum ID válido = lista padrão. */
function OmieSig_lista_() {
  try {
    var t = OmieSig_s_(PropertiesService.getScriptProperties().getProperty(OMIE_SIGILO_PROP));
    if (t) {
      var l = JSON.parse(t);
      if (Array.isArray(l)) {
        l = l.map(OmieSig_s_).filter(function (x, i, a) { return /^[A-Za-z0-9_-]{3,80}$/.test(x) && a.indexOf(x) === i; });
        if (l.length) return l;
      }
    }
  } catch (e) {}
  return OMIE_SIGILO_PADRAO.slice();
}
/** A conta (ID) está na lista de sigilo do Financeiro? */
function Omie_contaNoSigilo_(id) { id = OmieSig_s_(id); return !!id && OmieSig_lista_().indexOf(id) >= 0; }

/** Nome da função pública que chamou (para o registro): a primeira da pilha que não é interna. */
function OmieSig_consulta_() {
  try {
    var linhas = String(new Error().stack || '').split('\n');
    for (var i = 0; i < linhas.length; i++) {
      var m = linhas[i].match(/at (?:Object\.)?([A-Za-z][\w$]*)\s/);
      if (!m || /^(OmieSig_|Omie_exigirAcesso_|Omie_registrarAcesso_|Poderes_|SGO_pode|Error$)/.test(m[1])) continue;
      if (/_$/.test(m[1]) && !OMIE_SIGILO_NOMES[m[1]]) continue; // função interna: segue para quem a chamou
      if (/^Omie/.test(m[1]) || OMIE_SIGILO_NOMES[m[1]]) return m[1];
    }
  } catch (e) {}
  return 'consulta';
}

/** Registra a consulta (sem valores). PERMITIDO: uma vez a cada 10 min por pessoa e consulta; NEGADO e mudanças: sempre. */
function Omie_registrarAcesso_(sessao, resultado, consulta, detalhe) {
  try {
    sessao = sessao || {};
    consulta = consulta || OmieSig_consulta_();
    var uid = OmieSig_s_(sessao.userId || sessao.id), chave = 'OMIE_SIG_' + uid + '_' + consulta;
    if (resultado === 'PERMITIDO') {
      try { var c = CacheService.getScriptCache(); if (c.get(chave)) return; c.put(chave, '1', Math.round(OMIE_SIGILO_REGISTRO_MS / 1000)); } catch (e) {}
    }
    if (typeof CertCal_garantirTabela_ === 'function') {
      CertCal_garantirTabela_(OMIE_ACESSOS_ABA, OMIE_ACESSOS_COLUNAS);
      try { SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {}; } catch (e) {}
    }
    SGO_DATA.insert(OMIE_ACESSOS_ABA, { ID: Utilities.getUuid(), EM: new Date().toISOString(), USUARIO_ID: uid, USUARIO: OmieSig_s_(sessao.usuario || sessao.login),
      NOME: OmieSig_s_(sessao.nome), CONSULTA: consulta, RESULTADO: resultado, DETALHE: OmieSig_s_(detalhe).slice(0, 300) });
    if (resultado === 'NEGADO') { try { SGO_DATA.log('FIN_SIGILO_NEGADO', OmieSig_s_(sessao.usuario), 'Tentativa de acesso ao Financeiro: ' + consulta, 'FINANCEIRO'); } catch (e) {} }
  } catch (e) { try { console.error('Registro de acesso ao Financeiro: ' + (e && e.message || e)); } catch (e2) {} }
}

/** Trava de sigilo para quem não usa Omie_exigirAcesso_ (Ganhos). Lança a mensagem de sigilo e registra a recusa. */
function Omie_exigirSigilo_(sessao, consulta) {
  sessao = sessao || {};
  if (Omie_contaNoSigilo_(sessao.userId || sessao.id)) return true;
  Omie_registrarAcesso_(sessao, 'NEGADO', consulta);
  Omie_erroPublico_(OMIE_SIGILO_MSG);
}

function OmieSig_ehDono_(sessao) { return typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(sessao && sessao.usuario); }
function OmieSig_ehDiretoria_(sessao) {
  if (OmieSig_ehDono_(sessao)) return true;
  var perfil = OmieSig_s_(sessao && sessao.perfil).toUpperCase();
  if (perfil === 'DIRETORIA') return true;
  try { var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, OmieSig_s_(sessao.userId)); return !!u && OmieSig_s_(u.AREA).toUpperCase() === 'DIRETORIA'; } catch (e) { return false; }
}
function OmieSig_contas_() {
  var l = [];
  try { l = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS); } catch (e) { l = []; }
  return l;
}
function OmieSig_dataBr_(iso) {
  var d = new Date(iso); if (isNaN(d.getTime())) return OmieSig_s_(iso);
  try { return Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'); } catch (e) { return d.toISOString(); }
}

/**
 * Painel financeiro > Sigilo e acessos. Quem está na lista vê quem está na lista. A Diretoria vê também o registro de
 * consultas e recusas (últimos 300). O responsável pelo sistema recebe as contas da equipe para alterar a lista.
 */
function Omie_apiSigilo(sessionId) {
  try {
    var eu = Omie_exigirAcesso_(sessionId);
    var lista = OmieSig_lista_(), contas = OmieSig_contas_(), porId = {};
    contas.forEach(function (u) { porId[OmieSig_s_(u.ID)] = u; });
    var r = { ok: true, dono: OmieSig_ehDono_(eu), diretoria: OmieSig_ehDiretoria_(eu), padrao: !OmieSig_s_(PropertiesService.getScriptProperties().getProperty(OMIE_SIGILO_PROP)),
      autorizados: lista.map(function (id) { var u = porId[id]; return { id: id, nome: u ? OmieSig_s_(u.NOME) || OmieSig_s_(u.USUARIO) : 'Conta não encontrada', usuario: u ? OmieSig_s_(u.USUARIO) : '', perfil: u ? OmieSig_s_(u.PERFIL) : '', situacao: u ? OmieSig_s_(u.STATUS) : 'NÃO ENCONTRADA' }; }) };
    if (r.diretoria) {
      var reg = [];
      try { reg = SGO_DATA.getDB().getSheetByName(OMIE_ACESSOS_ABA) ? SGO_DATA.getAll(OMIE_ACESSOS_ABA) : []; } catch (e) { reg = []; }
      reg.sort(function (a, b) { return OmieSig_s_(b.EM) < OmieSig_s_(a.EM) ? -1 : OmieSig_s_(b.EM) > OmieSig_s_(a.EM) ? 1 : 0; });
      r.negados30 = reg.filter(function (x) { return x.RESULTADO === 'NEGADO' && Date.now() - new Date(x.EM).getTime() < 30 * 86400000; }).length;
      r.registro = reg.slice(0, 300).map(function (x) {
        return { em: OmieSig_dataBr_(x.EM), nome: OmieSig_s_(x.NOME) || OmieSig_s_(x.USUARIO), usuario: OmieSig_s_(x.USUARIO), consulta: OMIE_SIGILO_NOMES[OmieSig_s_(x.CONSULTA)] || OmieSig_s_(x.CONSULTA),
          resultado: OmieSig_s_(x.RESULTADO), detalhe: OmieSig_s_(x.DETALHE) };
      });
    }
    if (r.dono) {
      r.contas = contas.filter(function (u) {
        var p = OmieSig_s_(u.PERFIL).toUpperCase();
        return OmieSig_s_(u.STATUS).toUpperCase() === 'ATIVO' && !OmieSig_s_(u.EXCLUIDO_EM) && ['CLIENTE', 'REPRESENTADA'].indexOf(p) < 0;
      }).map(function (u) { return { id: OmieSig_s_(u.ID), nome: OmieSig_s_(u.NOME) || OmieSig_s_(u.USUARIO), usuario: OmieSig_s_(u.USUARIO), perfil: OmieSig_s_(u.PERFIL), area: OmieSig_s_(u.AREA), marcado: lista.indexOf(OmieSig_s_(u.ID)) >= 0 }; })
        .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    }
    return r;
  } catch (e) { return { ok: false, mensagem: e && e.omieOpsPublica ? e.message : 'Não foi possível abrir o sigilo do Financeiro. Tente novamente.' }; }
}

/** Só o responsável pelo sistema: grava a lista de sigilo. payload: { ids: [...], motivo }. Ele mesmo nunca sai da lista. */
function Omie_apiSigiloSalvar(sessionId, payload) {
  try {
    var eu = Omie_exigirAcesso_(sessionId);
    if (!OmieSig_ehDono_(eu)) { Omie_registrarAcesso_(eu, 'NEGADO', 'Omie_apiSigiloSalvar', 'Só o responsável pelo sistema altera a lista.'); Omie_erroPublico_('Só o responsável pelo sistema altera a lista de sigilo do Financeiro. Nada foi alterado.'); }
    var p = payload || {}, motivo = OmieSig_s_(p.motivo);
    if (motivo.length < 5) Omie_erroPublico_('Escreva o motivo da mudança (pelo menos 5 letras). Nada foi alterado.');
    var ids = (Array.isArray(p.ids) ? p.ids : []).map(OmieSig_s_).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    var porId = {}; OmieSig_contas_().forEach(function (u) { porId[OmieSig_s_(u.ID)] = u; });
    ids.forEach(function (id) {
      var u = porId[id];
      if (!u) Omie_erroPublico_('Uma das contas marcadas não existe mais. Atualize a tela. Nada foi alterado.');
      var perfil = OmieSig_s_(u.PERFIL).toUpperCase();
      if (['CLIENTE', 'REPRESENTADA'].indexOf(perfil) >= 0) Omie_erroPublico_('Conta de fora da empresa não pode ver o Financeiro (' + OmieSig_s_(u.USUARIO) + '). Nada foi alterado.');
      if (OmieSig_s_(u.STATUS).toUpperCase() !== 'ATIVO' || OmieSig_s_(u.EXCLUIDO_EM)) Omie_erroPublico_('A conta ' + OmieSig_s_(u.USUARIO) + ' não está ativa. Nada foi alterado.');
    });
    if (ids.indexOf(OmieSig_s_(eu.userId)) < 0) ids.unshift(OmieSig_s_(eu.userId)); // o responsável nunca se tranca para fora
    if (ids.length > 10) Omie_erroPublico_('A lista de sigilo aceita no máximo 10 contas. Nada foi alterado.');
    var antes = OmieSig_lista_();
    PropertiesService.getScriptProperties().setProperty(OMIE_SIGILO_PROP, JSON.stringify(ids));
    var nome = function (id) { var u = porId[id]; return u ? OmieSig_s_(u.USUARIO) : id; };
    var entrou = ids.filter(function (x) { return antes.indexOf(x) < 0; }).map(nome), saiu = antes.filter(function (x) { return ids.indexOf(x) < 0; }).map(nome);
    Omie_registrarAcesso_(eu, 'LISTA_ALTERADA', 'Omie_apiSigiloSalvar', (entrou.length ? 'Entrou: ' + entrou.join(', ') + '. ' : '') + (saiu.length ? 'Saiu: ' + saiu.join(', ') + '. ' : '') + 'Motivo: ' + motivo);
    try { SGO_DATA.log('FIN_SIGILO_LISTA', OmieSig_s_(eu.usuario), 'Lista de sigilo do Financeiro: ' + ids.map(nome).join(', '), 'FINANCEIRO'); } catch (e) {}
    try { if (typeof PODERES_CATALOGO_MEMO !== 'undefined') PODERES_CATALOGO_MEMO = null; if (typeof Poderes_memoLimpar_ === 'function') Poderes_memoLimpar_(); } catch (e) {}
    return { ok: true, mensagem: 'Lista de sigilo gravada: ' + ids.map(nome).join(', ') + '.', tela: Omie_apiSigilo(sessionId) };
  } catch (e) { return { ok: false, mensagem: e && e.omieOpsPublica ? e.message : 'Não foi possível gravar a lista de sigilo. Nada foi alterado.' }; }
}

/**
 * 16/11/2026 (seção 5): a planilha só é baixada depois de registrada. A tela manda o conteúdo montado; o servidor registra quem,
 * quando, o código único, a quantidade de linhas e o resumo SHA-256 (nenhum valor) e devolve a linha "Gerado por ... · código"
 * do começo e a do fim. Sem o registro, a tela não baixa.
 */
function Omie_apiCsv(sessionId, payload) {
  try {
    var eu = Omie_exigirAcesso_(sessionId), p = payload || {};
    var conteudo = String(p.conteudo === undefined || p.conteudo === null ? '' : p.conteudo).slice(0, 2000000);
    var id = Fin_planilhaIdentificada_(eu, { nome: OmieSig_s_(p.nome).replace(/[^\w.\- ]/g, '').slice(0, 80), conteudo: conteudo, linhas: p.linhas, consulta: 'Omie_apiCsv' });
    return { ok: true, codigo: id.codigo, cabecalho: id.cabecalho, rodape: id.rodape };
  } catch (e) { return { ok: false, mensagem: e && e.omieOpsPublica ? e.message : 'Não foi possível registrar a planilha. Nada foi baixado; tente de novo.' }; }
}
