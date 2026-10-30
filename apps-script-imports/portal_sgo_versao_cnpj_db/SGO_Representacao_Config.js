/****************************************************
 * MÓDULO REPRESENTAÇÃO (Brasmedical) — CONFIGURAÇÃO, TABELAS E ESCOPO (29/10/2026)
 *
 * Pedido do dono (29/10/2026): "Quero criar uma área para representações. Um login e senha onde o pessoal da
 * Brasmedical irá entrar [...] Tudo que acontecer lá tem que comunicar com o SGO inteiro, todos os módulos." e, na
 * mesma data, "era para ser um módulo do SGO, não quero nada novo".
 *
 * Desenho:
 *  - O pessoal da representada entra pelo login normal do SGO+ (CAD_USUARIOS, SGO_Auth.js) com o perfil REPRESENTADA,
 *    ligado a CAD_USUARIOS.REPRESENTADA_ID (como o perfil CLIENTE é ligado a CLIENTE_ID) e com o papel dentro da
 *    representada em CAD_USUARIOS.REPRESENTACAO_PAPEL. O cadastro é feito pela Metrolabs em Administração > Usuários.
 *  - O perfil REPRESENTADA só usa o módulo Representação: o menu mostra só ele; o servidor próprio só deixa essa sessão
 *    chamar a lista fechada de funções do módulo (sgo_servidor, src/sistemas.ts > FUNCOES_REPRESENTADA); no legado,
 *    exigirSessao recusa a sessão REPRESENTADA fora da entrada do módulo (Representacao_api) e Ast_nivelDe_ devolve
 *    NENHUM. SGO_DATA.getAll('CAD_USUARIOS') não devolve as contas REPRESENTADA (listas de responsáveis, avisos,
 *    bate-papo, conduta, ponto, atividades não as veem), salvo em Usuários e neste módulo (SGO_DATA_REP_VISIVEL).
 *  - Toda leitura da visão da representada passa por Rep_escopo_(eu): só o que é da representada do usuário. Registro de
 *    outra representada recebe a mesma resposta de "não encontrado" que um registro que não existe.
 *
 * Tabelas novas (todas com REPRESENTADA_ID): REP_REPRESENTADAS, REP_MODELOS, REP_MENSAGENS (só inclusão), REP_ANEXOS,
 * REP_ACESSOS (ações da representada no módulo: buscas, cadastros, pedidos, cancelamentos) e REP_DOCUMENTOS (documentos A4
 * gerados, com o público que pode abrir; 29/10/2026).
 * Colunas novas (só acrescentadas): CAD_USUARIOS, ATEC_CHAMADOS, ATEC_SOLICITACOES, CAD_EQUIPAMENTOS, CAD_CLIENTES, CAD_UNIDADES, ATEC_FOTOS.
 * Nenhuma função devolve Date cru.
 ****************************************************/

var REP_ABAS = { REPRESENTADAS: 'REP_REPRESENTADAS', ACESSOS: 'REP_ACESSOS', MODELOS: 'REP_MODELOS', MENSAGENS: 'REP_MENSAGENS', ANEXOS: 'REP_ANEXOS', DOCUMENTOS: 'REP_DOCUMENTOS' };
var REP_COLUNAS = {
  REP_REPRESENTADAS: ['ID', 'NOME', 'CNPJ', 'SITUACAO', 'CONTRATO', 'VIGENCIA_INICIO', 'VIGENCIA_FIM', 'CONTATO_NOME', 'CONTATO_EMAIL', 'PRAZOS_JSON', 'OBS',
    'CRIADO_POR_NOME', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  REP_ACESSOS: ['ID', 'REPRESENTADA_ID', 'USUARIO_ID', 'USUARIO_NOME', 'EMAIL', 'ACAO', 'DETALHE', 'IP', 'NAVEGADOR', 'EM'],
  REP_MODELOS: ['ID', 'REPRESENTADA_ID', 'CODIGO', 'NOME', 'FAMILIA', 'TIPO_EQUIPAMENTO', 'GARANTIA_MESES', 'PADRAO_SERIE', 'ATIVO', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  REP_MENSAGENS: ['ID', 'REPRESENTADA_ID', 'REF_TIPO', 'REF_ID', 'REF_NUMERO', 'AUTOR_LADO', 'AUTOR_ID', 'AUTOR_NOME', 'TEXTO', 'INTERNA', 'RESPONDE_A', 'ANEXO_ID', 'EM', 'CRIADO_EM'],
  REP_ANEXOS: ['ID', 'REPRESENTADA_ID', 'REF_TIPO', 'REF_ID', 'TIPO', 'NOME', 'MIME', 'TAMANHO', 'SHA256', 'ARQUIVO_ID', 'PUBLICO', 'POR_LADO', 'POR_ID', 'POR_NOME', 'EM', 'CRIADO_EM'],
  // 29/10/2026: documentos A4 gerados (relatório do atendimento e do período), com o público que pode abrir (SGO_Representacao_Documentos.js)
  REP_DOCUMENTOS: ['ID', 'TIPO', 'PUBLICO', 'REPRESENTADA_ID', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'CHAMADO_ID', 'CHAMADO_NUMERO', 'NUMERO', 'VERSAO', 'TITULO',
    'PERIODO_DIAS', 'PERIODO_DE', 'PERIODO_ATE', 'HTML_ID', 'PDF_ID', 'PASTA_URL', 'MARCA', 'PAGINAS', 'FOTOS', 'DOC_REGISTRADO', 'GERADO_POR_ID', 'GERADO_POR_NOME', 'GERADO_POR_LADO', 'EM', 'CRIADO_EM']
};
var REP_COLUNAS_TEXTO = {
  REP_REPRESENTADAS: ['CNPJ', 'VIGENCIA_INICIO', 'VIGENCIA_FIM', 'ATUALIZADO_EM'],
  REP_ACESSOS: ['EM'], REP_MODELOS: ['CODIGO', 'ATUALIZADO_EM'], REP_MENSAGENS: ['EM', 'REF_NUMERO'], REP_ANEXOS: ['EM', 'SHA256'],
  REP_DOCUMENTOS: ['EM', 'NUMERO', 'CHAMADO_NUMERO', 'PERIODO_DE', 'PERIODO_ATE', 'MARCA']
};
/** Colunas acrescentadas em tabelas que já existem (nada é apagado nem renomeado). */
var REP_COLUNAS_EXTRAS = {
  CAD_USUARIOS: ['REPRESENTADA_ID', 'REPRESENTACAO_PAPEL'],
  ATEC_CHAMADOS: ['REPRESENTADA_ID', 'REPRESENTADA_NOME', 'PROTOCOLO_REPRESENTADA', 'ENQUADRAMENTO_PRETENDIDO', 'REP_SEM_REGISTRO_ALERTA_EM'],
  ATEC_SOLICITACOES: ['REPRESENTADA_ID', 'REPRESENTADA_NOME', 'PROTOCOLO_REPRESENTADA', 'RELATO_JSON', 'ENQUADRAMENTO_PRETENDIDO', 'SETOR', 'CONTATO_NOME',
    'CONTATO_TELEFONE', 'CONTATO_EMAIL', 'COMPLEMENTO_PERGUNTA', 'COMPLEMENTO_EM', 'COMPLEMENTO_POR_NOME', 'COMPLEMENTO_RESPOSTA', 'COMPLEMENTO_RESPONDIDO_EM',
    'ACEITE_MIN_UTEIS', 'PAUSA_DESDE', 'PAUSA_MIN', 'ALERTA_RISCO_EM', 'ALERTA_VENCIDO_EM', 'CANCELADA_EM', 'CANCELADA_MOTIVO', 'CANCELADA_POR_NOME', 'ATUALIZADO_EM'],
  CAD_EQUIPAMENTOS: ['DATA_INSTALACAO', 'NF_VENDA_NUMERO', 'NF_VENDA_DATA', 'NF_VENDA_ARQUIVO_ID', 'GARANTIA_MESES', 'GARANTIA_ATE', 'REVENDA', 'MODELO_CODIGO',
    'ORIGEM_REPRESENTADA_ID', 'FOTO_ETIQUETA_ARQUIVO_ID', 'CRIADO_POR_NOME', 'CRIADO_PELA_REPRESENTADA_EM'],
  CAD_CLIENTES: ['ORIGEM', 'ORIGEM_REPRESENTADA_ID'],
  CAD_UNIDADES: ['ORIGEM', 'ORIGEM_REPRESENTADA_ID'],
  // 29/10/2026: liberação da foto do técnico para os documentos externos ('' interna, REPRESENTADA, SIM = cliente e representada) e a cópia reduzida para o A4
  ATEC_FOTOS: ['PUBLICO', 'LIBERADA_POR_NOME', 'LIBERADA_EM', 'RELATORIO_ARQUIVO_ID']
};
var REP_COLUNAS_EXTRAS_TEXTO = {
  ATEC_SOLICITACOES: ['COMPLEMENTO_EM', 'COMPLEMENTO_RESPONDIDO_EM', 'PAUSA_DESDE', 'ALERTA_RISCO_EM', 'ALERTA_VENCIDO_EM', 'CANCELADA_EM', 'ATUALIZADO_EM', 'CONTATO_TELEFONE'],
  ATEC_CHAMADOS: ['REP_SEM_REGISTRO_ALERTA_EM'], ATEC_FOTOS: ['LIBERADA_EM'],
  CAD_EQUIPAMENTOS: ['DATA_INSTALACAO', 'NF_VENDA_DATA', 'GARANTIA_ATE', 'NF_VENDA_NUMERO', 'CRIADO_PELA_REPRESENTADA_EM']
};

/** Papéis dentro da representada (seção 3.2). O servidor confere sempre; a tela só esconde o botão. */
var REP_PAPEIS = {
  ADMIN: { nome: 'Administrador da representada', abrir: true, cadastrar: true, conversar: true, cancelar: true, equipe: true },
  ATENDENTE: { nome: 'Atendente', abrir: true, cadastrar: true, conversar: true, cancelar: true, equipe: false },
  FINANCEIRO: { nome: 'Financeiro de garantia', abrir: false, cadastrar: false, conversar: true, cancelar: false, equipe: false },
  LEITURA: { nome: 'Leitura', abrir: false, cadastrar: false, conversar: false, cancelar: false, equipe: false }
};
/** Prazos e opções padrão de cada representada (seção 5.4 e decisões adotadas); a Metrolabs muda por representada. */
var REP_PRAZOS_PADRAO = {
  aceiteMin: 240,                 // aceite da solicitação: 4 h úteis do expediente da Metrolabs
  alertaFracao: 0.75,             // alerta ao responsável pela representação a 75% do prazo
  primeiroContatoMin: 480,        // primeiro contato com o cliente final (8 h úteis do aceite) — acompanhado a partir da etapa 2
  semRegistroDiasUteis: 3,        // chamado sem nenhum registro
  orcamentoDiasUteis: 2, remessaDiasUteis: 1, aceiteEncerramentoDiasUteis: 3, // etapas 2 a 4
  consultaReceita: true,          // consulta de CNPJ na base pública ao cadastrar cliente, com conferência e "Ciente" (decisão 11)
  cancelarAntesVisita: true       // a representada cancela antes da visita, com motivo (decisão 14)
};
var REP_SITUACOES_SOL = { NOVA: 'Enviado', COMPLEMENTO: 'Complemento pedido', CONVERTIDA: 'Aceito', DESCARTADA: 'Recusado', CANCELADA: 'Cancelado' };
/** Etapas que a representada lê (seção 5.2), montadas sobre as situações internas. */
var REP_ETAPAS = [
  { n: 1, nome: 'Enviado', sol: ['NOVA'] },
  { n: 2, nome: 'Complemento pedido', sol: ['COMPLEMENTO'] },
  { n: 3, nome: 'Recusado', sol: ['DESCARTADA'] },
  { n: 4, nome: 'Aceito, em análise', ch: ['ABERTO', 'EM_TRIAGEM'] },
  { n: 5, nome: 'Aguardando aprovação de orçamento', ch: ['AGUARDANDO_ORCAMENTO'] },
  { n: 6, nome: 'Aguardando peça', ch: ['AGUARDANDO_PECA'] },
  { n: 7, nome: 'Visita a agendar ou agendada', ch: ['PLANEJADO', 'AGENDADO'] },
  { n: 8, nome: 'Em atendimento', ch: ['EM_DESLOCAMENTO', 'NO_LOCAL', 'EM_EXECUCAO', 'PAUSADO', 'AGUARDANDO_CLIENTE'] },
  { n: 9, nome: 'Impedimento', ch: [] },
  { n: 10, nome: 'Concluído', ch: ['DOC_PENDENTE', 'RESOLVIDO_REMOTO'] },
  { n: 11, nome: 'Encerrado', ch: ['ENCERRADO'] },
  { n: 12, nome: 'Cancelado', ch: ['CANCELADO'], sol: ['CANCELADA'] }
];
var REP_PARADA = { TOTAL: 'Parado (total)', PARCIAL: 'Funcionando com falha (parcial)', NAO: 'Funcionando' };
var REP_ENQUADRAMENTO = { GARANTIA: 'Garantia', FORA_GARANTIA: 'Fora de garantia', NAO_SEI: 'Não sei' };
var REP_TIPOS_ANEXO = { FOTO_EQUIPAMENTO: 'Foto do equipamento', FOTO_ETIQUETA: 'Foto da etiqueta de série', VIDEO: 'Vídeo', NF_VENDA: 'Nota fiscal de venda', DOCUMENTO: 'Documento' };
var REP_LIMITES = { fotoBytes: 2 * 1024 * 1024, videoBytes: 50 * 1024 * 1024, documentoBytes: 10 * 1024 * 1024, buscasPor15Min: 20 };
var REP_MIME = {
  FOTO_EQUIPAMENTO: ['image/jpeg', 'image/png', 'image/webp'], FOTO_ETIQUETA: ['image/jpeg', 'image/png', 'image/webp'],
  VIDEO: ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'], NF_VENDA: ['application/pdf', 'image/jpeg', 'image/png'], DOCUMENTO: ['application/pdf', 'image/jpeg', 'image/png']
};
var REP_MSG_NAO_ENCONTRADO = 'Não encontramos este registro na área da sua empresa. Confira o número; se precisar, fale com a Metrolabs pela conversa.';

// ------------------------------------------------------------
// UTILITÁRIOS (reaproveitam os da Assistência: Ast_s_, Ast_agora_, Ast_br_, Ast_somarMinUteis_...)
// ------------------------------------------------------------
function Rep_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function Rep_up_(v) { return Rep_s_(v).toUpperCase(); }
function Rep_dig_(v) { return Rep_s_(v).replace(/\D/g, ''); }
function Rep_txt_(v, max) { var s = Rep_s_(v).replace(/\r\n/g, '\n'); return max && s.length > max ? s.slice(0, max) : s; }
function Rep_json_(t, padrao) { if (t && typeof t === 'object') return t; try { var v = JSON.parse(Rep_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
function Rep_agora_(ms) { return Ast_agora_(ms); }
function Rep_ms_(v) { return Ast_ms_(v); }
function Rep_br_(v) { return Ast_br_(v); }
function Rep_erro_(codigo, texto) { var e = new Error(texto); e.codigoRep = codigo; return e; }

// ------------------------------------------------------------
// TABELAS
// ------------------------------------------------------------
var REP_MEMO = {};
function Rep_memoLimpar_() { REP_MEMO = {}; }
function Rep_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('REP_ABAS_OK_V2')) return; } catch (e) { cache = null; }
  Object.keys(REP_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, REP_COLUNAS[aba]);
    REP_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (REP_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  Object.keys(REP_COLUNAS_EXTRAS).forEach(function (aba) {
    REP_COLUNAS_EXTRAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (REP_COLUNAS_EXTRAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (cache) cache.put('REP_ABAS_OK_V2', '1', 21600); } catch (e) {}
}
function Rep_ler_(aba) {
  if (REP_MEMO[aba]) return REP_MEMO[aba];
  var l = [];
  try { l = SGO_DATA.getAll(aba) || []; } catch (e) { if (!/Aba não encontrada|não encontrad/i.test(String((e && e.message) || e))) throw e; l = []; }
  REP_MEMO[aba] = l;
  return l;
}
function Rep_porId_(aba, id) { id = Rep_s_(id); if (!id) return null; var l = Rep_ler_(aba); for (var i = 0; i < l.length; i++) if (Rep_s_(l[i].ID) === id) return l[i]; return null; }
function Rep_inserir_(aba, d) { var r = SGO_DATA.insert(aba, Object.assign({ CRIADO_EM: Rep_agora_() }, d)); delete REP_MEMO[aba]; return r; }
function Rep_atualizar_(aba, id, d) { var r = SGO_DATA.update(aba, id, d); delete REP_MEMO[aba]; return r; }
/** Leituras das tabelas da Assistência e dos cadastros pela memória da Assistência (uma leitura por chamada). */
function Rep_lerAst_(aba) { return Ast_ler_(aba); }

// ------------------------------------------------------------
// REPRESENTADAS E PRAZOS
// ------------------------------------------------------------
function Rep_prazos_(rep) {
  var p = JSON.parse(JSON.stringify(REP_PRAZOS_PADRAO)), g = Rep_json_(rep && rep.PRAZOS_JSON, {}) || {};
  Object.keys(p).forEach(function (k) { if (g[k] !== undefined && g[k] !== null && g[k] !== '') p[k] = typeof p[k] === 'boolean' ? !!g[k] : Number(g[k]); });
  return p;
}
function Rep_representada_(id) { return Rep_porId_(REP_ABAS.REPRESENTADAS, id); }
function Rep_ativa_(rep) { return !!rep && Rep_up_(rep.SITUACAO || 'ATIVA') === 'ATIVA'; }
function Rep_publicoRepresentada_(r) {
  return { id: Rep_s_(r.ID), nome: Rep_s_(r.NOME), cnpj: Rep_s_(r.CNPJ), situacao: Rep_up_(r.SITUACAO || 'ATIVA'), contrato: Rep_s_(r.CONTRATO), vigenciaInicio: Rep_s_(r.VIGENCIA_INICIO),
    vigenciaFim: Rep_s_(r.VIGENCIA_FIM), contatoNome: Rep_s_(r.CONTATO_NOME), contatoEmail: Rep_s_(r.CONTATO_EMAIL), prazos: Rep_prazos_(r), obs: Rep_s_(r.OBS),
    atualizadoPor: Rep_s_(r.ATUALIZADO_POR_NOME), atualizadoEm: Rep_br_(r.ATUALIZADO_EM) };
}
/** Responsáveis pela representação (Regras da assistência > Representação); sem ninguém, quem faz a triagem. */
function Rep_responsaveis_() {
  var us = Ast_usuarios_(), ids = [];
  try { ids = (((Ast_regras_() || {}).representacao || {}).responsaveis || []).map(Ast_s_).filter(function (id) { return us[id] && us[id].ativo && !us[id].cliente ; }); } catch (e) { ids = []; }
  if (ids.length) return { ids: ids, nomes: ids.map(function (id) { return us[id].nome; }), configurado: true };
  var t = Ast_triagemPara_(us);
  return { ids: t.ids || [], nomes: (t.ids || []).map(function (id) { return (us[id] || {}).nome || ''; }), configurado: false };
}

// ------------------------------------------------------------
// ETAPAS DO PORTAL
// ------------------------------------------------------------
function Rep_etapaSol_(s) {
  var sit = Rep_up_(s.SITUACAO);
  for (var i = 0; i < REP_ETAPAS.length; i++) if ((REP_ETAPAS[i].sol || []).indexOf(sit) >= 0) return { n: REP_ETAPAS[i].n, nome: REP_ETAPAS[i].nome };
  return { n: 1, nome: 'Enviado' };
}
function Rep_etapaChamado_(c) {
  var sit = Rep_up_(c.SITUACAO);
  for (var i = 0; i < REP_ETAPAS.length; i++) if ((REP_ETAPAS[i].ch || []).indexOf(sit) >= 0) return { n: REP_ETAPAS[i].n, nome: REP_ETAPAS[i].nome };
  return { n: 4, nome: 'Aceito, em análise' };
}

// ------------------------------------------------------------
// PRAZO DE ACEITE DA SOLICITAÇÃO (4 h úteis; pausa enquanto o complemento está com a representada)
// ------------------------------------------------------------
function Rep_prazoAceite_(s, agoraMs, prazos) {
  agoraMs = agoraMs || Date.now();
  var total = Number(s.ACEITE_MIN_UTEIS) || (prazos || REP_PRAZOS_PADRAO).aceiteMin, ini = Rep_ms_(s.CRIADO_EM);
  if (ini === null) return { estado: 'SEM_PRAZO', ate: '', fracao: 0 };
  var pausa = Number(s.PAUSA_MIN) || 0, sit = Rep_up_(s.SITUACAO), desde = Rep_ms_(s.PAUSA_DESDE);
  if (sit === 'COMPLEMENTO' && desde !== null) pausa += Ast_minUteisEntre_(desde, agoraMs);
  var ateMs = Ast_somarMinUteis_(ini, total + pausa), usados = Math.max(0, Ast_minUteisEntre_(ini, agoraMs) - pausa);
  var fr = total > 0 ? usados / total : 0, alerta = Number((prazos || REP_PRAZOS_PADRAO).alertaFracao) || 0.75;
  if (sit !== 'NOVA' && sit !== 'COMPLEMENTO') return { estado: 'TRATADA', ate: Rep_agora_(ateMs), fracao: fr };
  if (sit === 'COMPLEMENTO') return { estado: 'PAUSADO', ate: Rep_agora_(ateMs), fracao: fr, texto: 'Prazo de aceite pausado: aguardando o complemento da representada' };
  if (agoraMs > ateMs) return { estado: 'VENCIDO', ate: Rep_agora_(ateMs), fracao: fr, texto: 'Prazo de aceite vencido em ' + Rep_br_(Rep_agora_(ateMs)) };
  if (fr >= alerta) return { estado: 'EM_RISCO', ate: Rep_agora_(ateMs), fracao: fr, texto: 'Prazo de aceite em risco: até ' + Rep_br_(Rep_agora_(ateMs)) };
  return { estado: 'EM_DIA', ate: Rep_agora_(ateMs), fracao: fr, texto: 'Aceite até ' + Rep_br_(Rep_agora_(ateMs)) };
}

// ------------------------------------------------------------
// ESCOPO: tudo o que a representada lê passa por aqui (seção 3.6)
// ------------------------------------------------------------
/**
 * s = quem está usando (Rep_eu_, perfil REPRESENTADA). Devolve leitores que só enxergam a representada da sessão. Registro de outra
 * representada e registro inexistente dão a MESMA resposta (REP_MSG_NAO_ENCONTRADO).
 */
function Rep_escopo_(s) {
  if (!s || !Rep_s_(s.repId)) throw Rep_erro_('SESSAO', 'Não foi possível abrir: o seu usuário não está ligado a uma representada. Fale com a Metrolabs para corrigir o acesso.');
  var rid = Rep_s_(s.repId);
  var meus = function (l) { return l.filter(function (r) { return Rep_s_(r.REPRESENTADA_ID) === rid; }); };
  var esc = {
    repId: rid,
    solicitacoes: function () { return meus(Rep_lerAst_(AST_ABAS.SOLICITACOES)); },
    chamados: function () { return meus(Rep_lerAst_(AST_ABAS.CHAMADOS)); },
    solicitacao: function (id) { var x = Ast_porId_(AST_ABAS.SOLICITACOES, id); if (!x || Rep_s_(x.REPRESENTADA_ID) !== rid) throw Rep_erro_('NAO_ENCONTRADO', REP_MSG_NAO_ENCONTRADO); return x; },
    chamado: function (id) { var x = Ast_porId_(AST_ABAS.CHAMADOS, id); if (!x || Rep_s_(x.REPRESENTADA_ID) !== rid) throw Rep_erro_('NAO_ENCONTRADO', REP_MSG_NAO_ENCONTRADO); return x; },
    /** Clientes que a representada pode usar: dos pedidos e chamados dela, os que ela cadastrou e os achados pelo CNPJ nesta sessão. */
    clienteIds: function () {
      var m = {};
      esc.solicitacoes().concat(esc.chamados()).forEach(function (r) { m[Rep_s_(r.CLIENTE_ID)] = true; });
      Rep_lerAst_(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function (c) { if (Rep_s_(c.ORIGEM_REPRESENTADA_ID) === rid) m[Rep_s_(c.ID)] = true; });
      Rep_consultados_(s, 'C').forEach(function (id) { m[id] = true; });
      delete m[''];
      return m;
    },
    cliente: function (id) {
      var c = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Rep_s_(id)];
      if (!c || !esc.clienteIds()[Rep_s_(id)]) throw Rep_erro_('NAO_ENCONTRADO', 'Escolha o cliente pela busca do CNPJ ou CPF completo. ' + REP_MSG_NAO_ENCONTRADO);
      return c;
    },
    /** Equipamentos: os dos pedidos e chamados dela, os que ela cadastrou e os achados pela série nesta sessão (decisão 4). */
    equipamentoIds: function () {
      var m = {};
      esc.solicitacoes().concat(esc.chamados()).forEach(function (r) { m[Rep_s_(r.EQUIPAMENTO_ID)] = true; });
      Rep_lerAst_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { if (Rep_s_(e.ORIGEM_REPRESENTADA_ID) === rid) m[Rep_s_(e.ID)] = true; });
      Rep_consultados_(s, 'E').forEach(function (id) { m[id] = true; });
      delete m[''];
      return m;
    },
    equipamento: function (id) {
      var e = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[Rep_s_(id)];
      if (!e || !esc.equipamentoIds()[Rep_s_(id)]) throw Rep_erro_('NAO_ENCONTRADO', 'Escolha o equipamento pela busca do número de série. ' + REP_MSG_NAO_ENCONTRADO);
      return e;
    },
    /** Referência de conversa e de anexo: GERAL (canal da representada), SOLICITACAO ou CHAMADO dela. */
    ref: function (tipo, id) {
      tipo = Rep_up_(tipo);
      if (tipo === 'GERAL') return { tipo: 'GERAL', id: rid, numero: 'Canal geral' };
      if (tipo === 'SOLICITACAO') { var so = esc.solicitacao(id); return { tipo: tipo, id: Rep_s_(so.ID), numero: Rep_s_(so.NUMERO), registro: so }; }
      if (tipo === 'CHAMADO') { var ch = esc.chamado(id); return { tipo: tipo, id: Rep_s_(ch.ID), numero: Rep_s_(ch.NUMERO), registro: ch }; }
      if (tipo === 'EQUIPAMENTO') { var eq = esc.equipamento(id); return { tipo: tipo, id: Rep_s_(eq.ID), numero: Rep_s_(eq.SERIE), registro: eq }; }
      throw Rep_erro_('NAO_ENCONTRADO', REP_MSG_NAO_ENCONTRADO);
    },
    mensagens: function (tipo, id) {
      return Rep_ler_(REP_ABAS.MENSAGENS).filter(function (m) { return Rep_s_(m.REPRESENTADA_ID) === rid && Rep_up_(m.INTERNA) !== 'SIM' && Rep_up_(m.REF_TIPO) === tipo && Rep_s_(m.REF_ID) === Rep_s_(id); });
    },
    anexos: function (tipo, id) {
      return Rep_ler_(REP_ABAS.ANEXOS).filter(function (a) { return Rep_s_(a.REPRESENTADA_ID) === rid && Rep_up_(a.PUBLICO) === 'REPRESENTADA' && (!tipo || (Rep_up_(a.REF_TIPO) === tipo && Rep_s_(a.REF_ID) === Rep_s_(id))); });
    },
    anexo: function (id) {
      var a = Rep_porId_(REP_ABAS.ANEXOS, id);
      if (!a || Rep_s_(a.REPRESENTADA_ID) !== rid || Rep_up_(a.PUBLICO) !== 'REPRESENTADA') throw Rep_erro_('NAO_ENCONTRADO', REP_MSG_NAO_ENCONTRADO);
      return a;
    }
  };
  return esc;
}
/** Clientes ('C') e equipamentos ('E') achados pela busca nesta sessão (6 h na memória de curta duração). */
function Rep_consultados_(s, tipo) { try { return Rep_json_(CacheService.getScriptCache().get('REP_CONS_' + tipo + '_' + s.sessionId), []) || []; } catch (e) { return []; } }
function Rep_marcarConsultado_(s, tipo, id) {
  try { var l = Rep_consultados_(s, tipo); if (l.indexOf(id) < 0) l.push(id); CacheService.getScriptCache().put('REP_CONS_' + tipo + '_' + s.sessionId, JSON.stringify(l.slice(-200)), 21600); } catch (e) {}
}

// ------------------------------------------------------------
// REGISTRO DE ACESSO (REP_ACESSOS): buscas, cadastros, pedidos, cancelamentos e mensagens da representada. Nunca derruba quem chamou.
// ------------------------------------------------------------
function Rep_acesso_(acao, u, ctx, detalhe) {
  try {
    Rep_inserir_(REP_ABAS.ACESSOS, { REPRESENTADA_ID: Rep_s_(u && u.repId), USUARIO_ID: Rep_s_(u && u.id), USUARIO_NOME: Rep_s_(u && u.nome), EMAIL: Rep_s_(u && u.email),
      ACAO: acao, DETALHE: Rep_txt_(detalhe, 600), IP: Rep_txt_(ctx && ctx.ip, 80), NAVEGADOR: Rep_txt_(ctx && ctx.navegador, 300), EM: Rep_agora_() });
  } catch (e) { try { console.error('Representação, registro de acesso: ' + ((e && e.message) || e)); } catch (x) {} }
}
