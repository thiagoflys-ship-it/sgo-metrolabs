/****************************************************
 * SGO_Qualidade_Ocorrencias.js
 * PAINEL DE QUALIDADE — cobrança/elogio/observação
 *
 * Pedido do usuário 2026-08-28: o painel não pode ser só leitura — precisa
 * servir pra AGIR (cobrar alguém, parabenizar alguém), com registro que
 * fica salvo (histórico), não só um número na tela que ninguém acompanha
 * depois. 1 tabela nova, sem depender de nenhum módulo — funciona pra
 * qualquer PESSOA_TIPO (técnico, condutor, e o que mais entrar no futuro).
 ****************************************************/

var QUALIDADE_OCORRENCIAS_SHEET = 'QUALIDADE_OCORRENCIAS';

var QUALIDADE_OCORRENCIAS_TIPOS = Object.freeze(['COBRANCA', 'ELOGIO', 'OBSERVACAO']);
var QUALIDADE_OCORRENCIAS_STATUS = Object.freeze({ ABERTA: 'ABERTA', RESOLVIDA: 'RESOLVIDA' });

function Qualidade_bootstrapOcorrencias_() {
  CertCal_garantirTabela_(QUALIDADE_OCORRENCIAS_SHEET, [
    'ID', 'AREA', 'TIPO', 'PESSOA_TIPO', 'PESSOA_ID', 'PESSOA_NOME',
    'DESCRICAO', 'CRIADO_POR', 'CRIADO_EM', 'STATUS', 'RESOLVIDO_EM'
  ]);
  // Pedido do usuário 2026-08-31: fechar o ciclo de cobrança — não basta
  // registrar, a pessoa precisa VER e confirmar que viu (ver
  // Qualidade_apiObterAvisosLogin/apiMarcarCiencia, abaixo). Eixo
  // independente de STATUS/RESOLVIDO_EM: "ela já viu" != "o gestor já
  // considerou resolvido".
  CertCal_garantirColuna_(QUALIDADE_OCORRENCIAS_SHEET, 'CIENTE_EM');
}

function Qualidade_apiRegistrarOcorrencia(sessionId, payload) {
  Qualidade_exigirGestor_(sessionId);
  Qualidade_bootstrapOcorrencias_();
  var sessao = exigirSessao(sessionId);
  payload = payload || {};

  var tipo = SGO_UTILS.safeUpper(payload.tipo);
  if (QUALIDADE_OCORRENCIAS_TIPOS.indexOf(tipo) === -1) throw new Error('Tipo de ocorrência inválido.');
  var pessoaNome = SGO_UTILS.safe(payload.pessoaNome);
  if (!pessoaNome) throw new Error('Informe a pessoa.');
  var descricao = SGO_UTILS.safe(payload.descricao);
  if (!descricao) throw new Error('Descreva o motivo.');

  var registro = SGO_DATA.normalizarObjetoParaSheet(
    QUALIDADE_OCORRENCIAS_SHEET,
    SGO_DATA.gerarRegistroBase({
      AREA: SGO_UTILS.safe(payload.area) || 'GERAL',
      TIPO: tipo,
      PESSOA_TIPO: SGO_UTILS.safe(payload.pessoaTipo) || 'PESSOA',
      PESSOA_ID: SGO_UTILS.safe(payload.pessoaId),
      PESSOA_NOME: pessoaNome,
      DESCRICAO: descricao,
      CRIADO_POR: sessao.usuario,
      STATUS: QUALIDADE_OCORRENCIAS_STATUS.ABERTA,
      RESOLVIDO_EM: ''
    })
  );
  SGO_DATA.insert(QUALIDADE_OCORRENCIAS_SHEET, registro);
  if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_();
  SGO_DATA.log('QUALIDADE_OCORRENCIA_REGISTRAR', sessao.usuario, tipo + ' — ' + pessoaNome, 'QUALIDADE');
  // 16/10/2026: o aviso ao entrar só chega a quem tem login ligado ao registro
  // (técnico = usuário do SGO; condutor = condutor vinculado a um login). Sem
  // isso a cobrança fica salva, mas a pessoa nunca vê — o gestor precisa saber.
  var aviso = '';
  var pessoaTipo = SGO_UTILS.safeUpper(registro.PESSOA_TIPO), pessoaId = SGO_UTILS.safe(registro.PESSOA_ID);
  if (tipo !== 'OBSERVACAO') {
    var alcanca = false;
    if (pessoaTipo === 'TECNICO') alcanca = !!pessoaId && !!SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, pessoaId);
    else if (pessoaTipo === 'CONDUTOR') { var cond = pessoaId && SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, pessoaId); alcanca = !!(cond && SGO_UTILS.safe(cond.USUARIO_ID)); }
    if (!alcanca) aviso = 'Registro salvo. ' + pessoaNome + ' não tem login do SGO+ ligado a este cadastro, então o aviso não aparece para a pessoa ao entrar — comunique pessoalmente' + (pessoaTipo === 'CONDUTOR' ? ' ou vincule o condutor a um usuário na Frota (Condutores).' : '.');
  }
  return { ok: true, item: registro, aviso: aviso };
}

function Qualidade_apiListarOcorrencias(sessionId, payload) {
  Qualidade_exigirGestor_(sessionId);
  Qualidade_bootstrapOcorrencias_();
  payload = payload || {};
  var itens = SGO_DATA.getAll(QUALIDADE_OCORRENCIAS_SHEET);
  if (payload.status) itens = itens.filter(function(o) { return SGO_UTILS.safeUpper(o.STATUS) === SGO_UTILS.safeUpper(payload.status); });
  if (payload.pessoaId) itens = itens.filter(function(o) { return SGO_UTILS.safe(o.PESSOA_ID) === SGO_UTILS.safe(payload.pessoaId); });
  itens.sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });
  return { ok: true, items: itens.slice(0, 200) };
}

function Qualidade_apiResolverOcorrencia(sessionId, payload) {
  Qualidade_exigirGestor_(sessionId);
  Qualidade_bootstrapOcorrencias_();
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.id);
  var oc = SGO_DATA.getById(QUALIDADE_OCORRENCIAS_SHEET, id);
  if (!oc) throw new Error('Ocorrência não encontrada.');
  SGO_DATA.update(QUALIDADE_OCORRENCIAS_SHEET, id, { STATUS: QUALIDADE_OCORRENCIAS_STATUS.RESOLVIDA, RESOLVIDO_EM: SGO_UTILS.nowIso() });
  if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_();
  return { ok: true };
}

// Usado pelos coletores (Auvo/Frota) e pelo relatório — contagem rápida de
// ocorrências ABERTAS por pessoa, sem duplicar a leitura da planilha em
// cada lugar que precisar disso.
function Qualidade_contarOcorrenciasAbertasPorPessoa_() {
  Qualidade_bootstrapOcorrencias_();
  var contagem = {};
  SGO_DATA.getAll(QUALIDADE_OCORRENCIAS_SHEET).forEach(function(o) {
    if (SGO_UTILS.safeUpper(o.STATUS) !== QUALIDADE_OCORRENCIAS_STATUS.ABERTA) return;
    if (SGO_UTILS.safeUpper(o.TIPO) !== 'COBRANCA') return;
    var chave = SGO_UTILS.safe(o.PESSOA_ID) || SGO_UTILS.safe(o.PESSOA_NOME);
    if (!chave) return;
    contagem[chave] = (contagem[chave] || 0) + 1;
  });
  return contagem;
}

// ------------------------------------------------------------
// AVISOS NO LOGIN — pedido do usuário 2026-08-31: cobrança precisa chegar
// até a pessoa (com confirmação de que ela viu), elogio precisa aparecer
// como reconhecimento por um tempo, não só uma vez. Genérico por
// construção: qualquer ocorrência de qualquer área aparece aqui, porque
// tudo passa pela mesma tabela.
//
// Resolve a(s) identidade(s) de PESSOA_TIPO que a sessão logada pode
// representar. Técnico: PESSOA_ID já é o próprio USUARIO_ID (ver
// SGO_Qualidade_Auvo.js — TECNICO_ID_SGO = CAD_USUARIOS.ID). Condutor:
// PESSOA_ID é CAD_CONDUTORES.ID, resolvido via login vinculado (Frota_
// obterCondutorPorUsuario_) — nem todo condutor tem login, então pode
// não existir.
// ------------------------------------------------------------
function Qualidade_resolverPessoaSessao_(usuarioId) {
  var ids = { TECNICO: SGO_UTILS.safe(usuarioId), CONDUTOR: null };
  var condutor = (typeof Frota_obterCondutorPorUsuario_ === 'function') ? Frota_obterCondutorPorUsuario_(usuarioId) : null;
  if (condutor) ids.CONDUTOR = SGO_UTILS.safe(condutor.ID);
  return ids;
}

var QUALIDADE_AVISOS_JANELA_ELOGIO_DIAS = 14;

function Qualidade_apiObterAvisosLogin(sessionId) {
  var sessao = exigirSessao(sessionId);
  Qualidade_bootstrapOcorrencias_();
  var pessoa = Qualidade_resolverPessoaSessao_(sessao.userId);

  var pertenceAMim_ = function(o) {
    var tipo = SGO_UTILS.safeUpper(o.PESSOA_TIPO);
    if (tipo === 'TECNICO') return SGO_UTILS.safe(o.PESSOA_ID) === pessoa.TECNICO;
    if (tipo === 'CONDUTOR') return !!pessoa.CONDUTOR && SGO_UTILS.safe(o.PESSOA_ID) === pessoa.CONDUTOR;
    return false;
  };

  var minhas = SGO_DATA.getAll(QUALIDADE_OCORRENCIAS_SHEET).filter(pertenceAMim_);

  var cobrancas = minhas.filter(function(o) {
    return SGO_UTILS.safeUpper(o.TIPO) === 'COBRANCA' &&
      SGO_UTILS.safeUpper(o.STATUS) === QUALIDADE_OCORRENCIAS_STATUS.ABERTA &&
      !SGO_UTILS.safe(o.CIENTE_EM);
  }).sort(function(a, b) { return String(a.CRIADO_EM || '').localeCompare(String(b.CRIADO_EM || '')); });

  var limiteElogio = new Date(Date.now() - QUALIDADE_AVISOS_JANELA_ELOGIO_DIAS * 24 * 3600 * 1000).toISOString();
  var elogios = minhas.filter(function(o) {
    return SGO_UTILS.safeUpper(o.TIPO) === 'ELOGIO' && String(o.CRIADO_EM || '') >= limiteElogio;
  }).sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });

  // 17/10/2026: a janela ao entrar também resume as pendências CRÍTICAS da central (SGO_Alertas_Central.js),
  // as mesmas do Início. Só entra o que não tem janela própria (atividade atrasada, aviso com ciência,
  // Conduta e cobrança já abrem sozinhos) e o balão de padrões, para quem já recebe esse balão.
  var resumo = null;
  try {
    var pend = SGO_Pendencias_listar(sessionId, {});
    resumo = { total: pend.resumo.total, criticos: pend.resumo.criticos, geradoEm: pend.geradoEm };
    var item = Qualidade_itemResumoPendencias_(sessao, pend);
    if (item) cobrancas = [item].concat(cobrancas);
  } catch (e) { resumo = null; }

  return { ok: true, cobrancas: cobrancas, elogios: elogios, pendencias: resumo };
}

var QUALIDADE_PEND_VISTO_PREFIXO = 'PEND_LOGIN_VISTO_';

/** Item "Pendências críticas" para a janela ao entrar (formato de cobrança; ID começa com PEND:). null = nada a mostrar. */
function Qualidade_itemResumoPendencias_(sessao, pend) {
  var perfil = SGO_UTILS.safeUpper(sessao.perfil);
  var balaoPadroes = false;
  try { var cfg = AlertasPadroes_config_(); balaoPadroes = !!cfg.ativo && (cfg.perfis || []).indexOf(perfil) >= 0; } catch (e) {}
  var grupos = (pend.grupos || []).filter(function(g) {
    if (g.gravidade !== 'CRITICO') return false;
    if (PEND_TIPOS_COM_JANELA_PROPRIA.indexOf(g.tipo) >= 0) return false;
    if (balaoPadroes && g.modulo === 'padroes') return false;
    return true;
  });
  if (!grupos.length) return null;
  var ids = [];
  grupos.forEach(function(g) { ids = ids.concat(g.ids || []); });
  var assinatura = Pend_hash_(ids.sort().join('|'));
  try {
    if (CacheService.getScriptCache().get(QUALIDADE_PEND_VISTO_PREFIXO + sessao.userId) === assinatura) return null;
  } catch (e) {}
  var n = grupos.reduce(function(s, g) { return s + (g.criticos || g.qtd); }, 0);
  var linhas = grupos.slice(0, 5).map(function(g) { return g.titulo + (g.qtd > 1 ? ' (' + Pend_listaCurta_([g.detalhe.split(' · ')[0]], 1) + ')' : '') + ': ' + (g.oQueFazer || '').replace(/\.$/, ''); });
  return {
    ID: 'PEND:' + assinatura,
    TIPO: 'PENDENCIAS',
    DESCRICAO: (n === 1 ? 'Há 1 pendência crítica no SGO+. ' : 'Há ' + n + ' pendências críticas no SGO+. ') + linhas.join('. ') +
      (grupos.length > 5 ? '. E mais ' + (grupos.length - 5) + ' grupo(s)' : '') +
      '. A lista completa, com o motivo e o que fazer em cada uma, está no Início (Ver todas as pendências).'
  };
}

function Qualidade_apiMarcarCiencia(sessionId, payload) {
  var sessao = exigirSessao(sessionId);
  Qualidade_bootstrapOcorrencias_();
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.ocorrenciaId);
  // Resumo de pendências da janela ao entrar: "Estou ciente" só deixa de mostrar o mesmo conjunto
  // de pendências por 20 horas (nada é gravado na planilha; a pendência continua no Início).
  if (id.indexOf('PEND:') === 0) {
    try { CacheService.getScriptCache().put(QUALIDADE_PEND_VISTO_PREFIXO + sessao.userId, id.slice(5), 72000); } catch (e) {}
    return { ok: true };
  }
  var oc = SGO_DATA.getById(QUALIDADE_OCORRENCIAS_SHEET, id);
  if (!oc) throw new Error('Ocorrência não encontrada.');

  var pessoa = Qualidade_resolverPessoaSessao_(sessao.userId);
  var tipo = SGO_UTILS.safeUpper(oc.PESSOA_TIPO);
  var ehMinha =
    (tipo === 'TECNICO' && SGO_UTILS.safe(oc.PESSOA_ID) === pessoa.TECNICO) ||
    (tipo === 'CONDUTOR' && !!pessoa.CONDUTOR && SGO_UTILS.safe(oc.PESSOA_ID) === pessoa.CONDUTOR);
  if (!ehMinha) throw new Error('Essa ocorrência não pertence a você.');

  SGO_DATA.update(QUALIDADE_OCORRENCIAS_SHEET, id, { CIENTE_EM: SGO_UTILS.nowIso() });
  if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_();
  return { ok: true };
}
