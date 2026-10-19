/****************************************************
 * ÁREAS DA METROLABS E A ÁREA DE CADA PESSOA (19/10/2026)
 *
 * Fonte única: a coluna CAD_USUARIOS.AREA, preenchida uma vez no cadastro
 * do usuário (Administração > Usuários) ou na tela Áreas (Administração >
 * Usuários > Áreas), do mesmo jeito que CELULAR e VINCULO_TRABALHO. O
 * Programa de conduta, os indicadores de qualidade e os relatórios leem
 * daqui; nenhum módulo guarda a área da pessoa em outro lugar.
 *
 * A coluna guarda o CÓDIGO da área (ex.: COMERCIAL), que não muda quando o
 * nome é corrigido na tela. A lista de áreas fica na aba CAD_AREAS (criada
 * sob demanda com as áreas usadas pela Metrolabs); área não é apagada, só
 * inativada, e só quando ninguém ativo está nela.
 *
 * Quem gere: gestão (Administrador, Gestor, Diretoria) e o perfil RH.
 * Quem consulta a lista de áreas: toda a equipe (seletores das telas).
 *
 * Migração única (USR_AREA_MIGRACAO_V1): preenche só a AREA vazia, pelo
 * perfil de acesso quando ele diz a área sem dúvida (Comercial, Financeiro,
 * RH, Diretoria, Metrologia, Técnico), ou por uma coluna antiga SETOR /
 * DEPARTAMENTO / CARGO, se existir. Administrador e Gestor não dizem a
 * área: vão para a lista "sem área" da tela, para a gestão escolher.
 * Nada que já estava preenchido é trocado.
 ****************************************************/

var AREAS_SHEET = 'CAD_AREAS';
var AREAS_COLUNAS = ['ID', 'CODIGO', 'NOME', 'DESCRICAO', 'ORDEM', 'ATIVO', 'CRIADO_EM', 'ATUALIZADO_EM', 'ATUALIZADO_POR'];
var AREAS_MIGRACAO_FLAG = 'USR_AREA_MIGRACAO_V1';
var AREAS_MIGRACAO_RESULTADO = 'USR_AREA_MIGRACAO_V1_RESULTADO';

// Áreas da Metrolabs. As do catálogo do Programa de conduta (Comercial,
// Financeiro, Logística, RH, Qualidade, Metrologia e Técnica) estão todas aqui.
var AREAS_PADRAO = Object.freeze([
  ['DIRETORIA', 'Diretoria', 'Direção da empresa'],
  ['ADMINISTRATIVO', 'Administrativo', 'Recepção, compras administrativas, apoio'],
  ['COMERCIAL', 'Comercial', 'Propostas, contratos, atendimento a clientes'],
  ['FINANCEIRO', 'Financeiro', 'Contas a pagar e a receber, faturamento'],
  ['RH', 'RH', 'Pessoas, ponto, treinamentos'],
  ['QUALIDADE', 'Qualidade', 'Documentos controlados, não conformidades, auditorias'],
  ['METROLOGIA', 'Metrologia', 'Laboratório, calibrações, certificados'],
  ['TECNICA', 'Técnica/Campo', 'Manutenção, qualificação e serviços nos clientes'],
  ['LOGISTICA', 'Logística', 'Estoque, recebimento e expedição']
]);

// Perfil de acesso que diz a área sem dúvida. ADMIN e GESTOR não entram.
var AREAS_POR_PERFIL = Object.freeze({
  COMERCIAL: 'COMERCIAL', FINANCEIRO: 'FINANCEIRO', RH: 'RH', DIRETORIA: 'DIRETORIA',
  METROLOGIA: 'METROLOGIA', TECNICO: 'TECNICA'
});

function Areas_semAcento_(v) {
  return String(v === null || v === undefined ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
}

/** Texto livre ("Técnica/Campo", "tecnica", "Comercial") -> código da área, ou '' se não reconhecer. */
function Areas_codigoDeTexto_(texto, lista) {
  var t = Areas_semAcento_(texto).replace(/[^A-Z0-9]+/g, ' ').trim();
  if (!t) return '';
  var areas = lista || Areas_todas_();
  var achada = areas.filter(function (a) {
    return Areas_semAcento_(a.CODIGO) === t.replace(/ /g, '_') || Areas_semAcento_(a.NOME).replace(/[^A-Z0-9]+/g, ' ').trim() === t;
  })[0];
  if (achada) return achada.CODIGO;
  // apelidos usados nos dados e no catálogo do Programa de conduta
  var apelidos = { TECNICA: 'TECNICA', TECNICO: 'TECNICA', CAMPO: 'TECNICA', TECNICA_CAMPO: 'TECNICA', OFICINA: 'TECNICA', ASSISTENCIA_TECNICA: 'TECNICA',
    PESSOAS: 'RH', RECURSOS_HUMANOS: 'RH', ADM: 'ADMINISTRATIVO', ADMINISTRACAO: 'ADMINISTRATIVO', VENDAS: 'COMERCIAL', LABORATORIO: 'METROLOGIA',
    CALIBRACAO: 'METROLOGIA', ESTOQUE: 'LOGISTICA', DIRECAO: 'DIRETORIA' };
  var chave = t.replace(/ /g, '_');
  var cod = apelidos[chave] || apelidos[t.split(' ')[0]] || '';
  return cod && areas.some(function (a) { return a.CODIGO === cod; }) ? cod : '';
}

/** Cria a aba e as áreas padrão que faltarem (só acrescenta; nada é apagado). Leve depois da 1ª vez. */
function Areas_garantir_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('AREAS_OK_V1')) return; } catch (e) {}
  CertCal_garantirTabela_(AREAS_SHEET, AREAS_COLUNAS);
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_USUARIOS, 'AREA');
  SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {};
  var atuais = SGO_DATA.getAll(AREAS_SHEET);
  var faltam = AREAS_PADRAO.filter(function (p) { return !atuais.some(function (a) { return Areas_semAcento_(a.CODIGO) === p[0]; }); });
  if (faltam.length) {
    var agora = SGO_UTILS.nowIso();
    SGO_DATA.insertMany(AREAS_SHEET, faltam.map(function (p) {
      return { CODIGO: p[0], NOME: p[1], DESCRICAO: p[2], ORDEM: AREAS_PADRAO.indexOf(p) + 1, ATIVO: 'SIM', ATUALIZADO_EM: agora, ATUALIZADO_POR: 'sistema' };
    }));
  }
  Areas_migrarUmaVez_();
  try { if (cache) cache.put('AREAS_OK_V1', '1', 21600); } catch (e) {}
}

function Areas_ativa_(a) { var v = Areas_semAcento_(a && a.ATIVO); return v === '' || v === 'SIM' || v === 'TRUE'; }

/** Todas as áreas (ativas e inativas), em ordem. */
function Areas_todas_() {
  return SGO_DATA.getAll(AREAS_SHEET).map(function (a) {
    return { ID: String(a.ID), CODIGO: Areas_semAcento_(a.CODIGO), NOME: SGO_UTILS.safe(a.NOME), DESCRICAO: SGO_UTILS.safe(a.DESCRICAO),
      ORDEM: Number(a.ORDEM) || 99, ATIVO: Areas_ativa_(a) };
  }).filter(function (a) { return a.CODIGO; }).sort(function (a, b) { return a.ORDEM - b.ORDEM || a.NOME.localeCompare(b.NOME, 'pt-BR'); });
}

/** Mapa código -> nome (para leitura rápida em listas e relatórios). */
function Areas_mapaNomes_() {
  var m = {};
  try { Areas_todas_().forEach(function (a) { m[a.CODIGO] = a.NOME; }); } catch (e) {}
  return m;
}

/**
 * Área de uma pessoa do CAD_USUARIOS: { codigo, nome }. Sem área: codigo ''
 * e nome 'Sem área definida'. Ponto único de leitura para os outros módulos
 * (Programa de conduta, indicadores, relatórios).
 */
function SGO_areaDoUsuario_(u, mapaNomes) {
  var cod = Areas_semAcento_(u && u.AREA);
  if (!cod) return { codigo: '', nome: 'Sem área definida' };
  var nomes = mapaNomes || Areas_mapaNomes_();
  // mapa vazio ou sem a área (área criada depois): lê o cadastro de áreas antes de cair no código
  var nome = nomes[cod] || (mapaNomes ? Areas_mapaNomes_()[cod] : '') || SGO_UTILS.safe(u.AREA);
  return { codigo: cod, nome: nome };
}

// ------------------------------------------------------------
// MIGRAÇÃO (só preenche vazio)
// ------------------------------------------------------------
function Areas_deduzir_(u, lista) {
  var perfil = SGO_UTILS.safeUpper(u.PERFIL);
  if (AREAS_POR_PERFIL[perfil]) return { codigo: AREAS_POR_PERFIL[perfil], motivo: 'pelo perfil de acesso' };
  var antigos = ['SETOR', 'DEPARTAMENTO', 'CARGO', 'FUNCAO'];
  for (var i = 0; i < antigos.length; i++) {
    var cod = Areas_codigoDeTexto_(u[antigos[i]], lista);
    if (cod) return { codigo: cod, motivo: 'pela coluna ' + antigos[i] };
  }
  return null;
}

/** Conta do sistema (login "admin" / nome "Administrador"): não é uma pessoa e não precisa de área. */
function Areas_contaDoSistema_(u) {
  var login = String((u && u.USUARIO) || '').trim().toLowerCase(), nome = String((u && u.NOME) || '').trim().toLowerCase();
  return login === 'admin' || nome === 'administrador';
}

function Areas_pessoasDaEquipe_() {
  return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
    return SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE' && SGO_UTILS.safeUpper(u.PERFIL) !== 'AUVO_SYNC';
  });
}

/** Prévia ou aplicação do preenchimento pelo perfil. Só toca em quem está sem área. */
function Areas_preencherVazias_(aplicar, quem) {
  var lista = Areas_todas_().filter(function (a) { return a.ATIVO; });
  var nomes = Areas_mapaNomes_();
  var preenchidas = [], semDeducao = [];
  Areas_pessoasDaEquipe_().forEach(function (u) {
    if (Areas_semAcento_(u.AREA) || Areas_contaDoSistema_(u)) return;
    var nome = SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(u.USUARIO);
    var d = Areas_deduzir_(u, lista);
    if (!d) {
      semDeducao.push({ id: String(u.ID), nome: nome, perfil: SGO_UTILS.safeUpper(u.PERFIL), situacao: SGO_UTILS.safeUpper(u.STATUS) || 'ATIVO',
        motivo: 'O perfil ' + SGO_UTILS.safeUpper(u.PERFIL) + ' não diz a área; escolha na lista.' });
      return;
    }
    preenchidas.push({ id: String(u.ID), nome: nome, perfil: SGO_UTILS.safeUpper(u.PERFIL), area: d.codigo, areaNome: nomes[d.codigo] || d.codigo, motivo: d.motivo });
    if (aplicar) SGO_DATA.update(SGO_CFG.SHEETS.CAD_USUARIOS, u.ID, { AREA: d.codigo });
  });
  if (aplicar && preenchidas.length) {
    SGO_DATA.log('USUARIOS_AREA_PREENCHIDA', quem || 'sistema', preenchidas.length + ' pessoa(s) com a área preenchida (só onde estava vazia): ' +
      preenchidas.map(function (p) { return p.nome + ' = ' + p.areaNome + ' (' + p.motivo + ')'; }).join('; ').slice(0, 1500), 'USUARIOS');
  }
  return { preenchidas: preenchidas, semDeducao: semDeducao };
}

function Areas_migrarUmaVez_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(AREAS_MIGRACAO_FLAG) === '1') return;
  var r = Areas_preencherVazias_(true, 'sistema');
  props.setProperty(AREAS_MIGRACAO_RESULTADO, JSON.stringify({ em: SGO_UTILS.nowIso(), preenchidas: r.preenchidas, semDeducao: r.semDeducao }).slice(0, 8500));
  props.setProperty(AREAS_MIGRACAO_FLAG, '1');
}

// ------------------------------------------------------------
// PERMISSÕES
// ------------------------------------------------------------
function Areas_sessaoGestao_(sessionId, acao) {
  var s = exigirSessao(sessionId);
  if (!SGO_podeConsultarPessoas_(s.perfil)) {
    throw new Error('Não foi possível ' + acao + ': as áreas são geridas pela gestão (Administrador, Gestor, Diretoria) e pelo RH. Peça a uma dessas pessoas.');
  }
  return s;
}

function Areas_resposta_(acao, fn) {
  try { return JSON.parse(JSON.stringify(Object.assign({ success: true }, fn() || {}))); }
  catch (e) { return { success: false, message: SGO_textoFalhaOperador_(acao, e) }; }
}

// ------------------------------------------------------------
// API (google.script.run)
// ------------------------------------------------------------

/** Lista das áreas ativas para os seletores (toda a equipe). */
function areasListar(sessionId) {
  return Areas_resposta_('carregar as áreas', function () {
    var s = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(s.perfil) === 'CLIENTE') throw new Error('a lista de áreas é da equipe Metrolabs');
    Areas_garantir_();
    return { items: Areas_todas_().filter(function (a) { return a.ATIVO; }) };
  });
}

/** Tela Áreas: cada área com as pessoas, quem está sem área e o resultado do preenchimento automático. */
function areasPainel(sessionId) {
  return Areas_resposta_('carregar as áreas', function () {
    var s = Areas_sessaoGestao_(sessionId, 'abrir as áreas');
    Areas_garantir_();
    var areas = Areas_todas_();
    var nomes = Areas_mapaNomes_();
    var pessoas = Areas_pessoasDaEquipe_().map(function (u) {
      var ar = SGO_areaDoUsuario_(u, nomes);
      return { id: String(u.ID), nome: SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(u.USUARIO), login: SGO_UTILS.safe(u.USUARIO),
        perfil: SGO_UTILS.safeUpper(u.PERFIL), ativo: SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO', area: ar.codigo, areaNome: ar.codigo ? ar.nome : '', sistema: Areas_contaDoSistema_(u) };
    }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    areas.forEach(function (a) {
      a.QTD_ATIVOS = pessoas.filter(function (p) { return p.ativo && p.area === a.CODIGO; }).length;
    });
    var migracao = null;
    try { migracao = JSON.parse(PropertiesService.getScriptProperties().getProperty(AREAS_MIGRACAO_RESULTADO) || 'null'); } catch (e) { migracao = null; }
    return {
      areas: areas, pessoas: pessoas,
      semArea: pessoas.filter(function (p) { return p.ativo && !p.area && !p.sistema; }),
      areaDesconhecida: pessoas.filter(function (p) { return p.area && !areas.some(function (a) { return a.CODIGO === p.area; }); }),
      migracao: migracao,
      podeGerir: true, perfil: SGO_UTILS.safeUpper(s.perfil)
    };
  });
}

/** Nova área ou correção de nome/descrição. Payload: { id?, nome, descricao }. */
function areasSalvar(sessionId, payload) {
  return Areas_resposta_('salvar a área', function () {
    var s = Areas_sessaoGestao_(sessionId, 'salvar a área');
    Areas_garantir_();
    var p = payload || {};
    var nome = SGO_UTILS.safe(p.nome).replace(/\s+/g, ' ');
    if (nome.length < 2 || nome.length > 60) throw new Error('escreva o nome da área (de 2 a 60 letras) e salve de novo');
    var descricao = SGO_UTILS.safe(p.descricao).slice(0, 200);
    var todas = Areas_todas_();
    var id = SGO_UTILS.safe(p.id);
    var repetida = todas.filter(function (a) { return Areas_semAcento_(a.NOME) === Areas_semAcento_(nome) && a.ID !== id; })[0];
    if (repetida) throw new Error('já existe a área "' + repetida.NOME + '"' + (repetida.ATIVO ? '' : ' (inativa: reative-a na lista)'));
    var agora = SGO_UTILS.nowIso();
    if (id) {
      var atual = todas.filter(function (a) { return a.ID === id; })[0];
      if (!atual) throw new Error('a área não foi encontrada; atualize a tela e tente de novo');
      SGO_DATA.update(AREAS_SHEET, id, { NOME: nome, DESCRICAO: descricao, ATUALIZADO_EM: agora, ATUALIZADO_POR: s.usuario });
      SGO_DATA.log('AREAS_EDITAR', s.usuario, 'Área ' + atual.CODIGO + ': "' + atual.NOME + '" -> "' + nome + '"', 'USUARIOS');
      return { message: 'Área salva. As pessoas desta área continuam nela.' };
    }
    var codigo = Areas_semAcento_(nome).replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'AREA';
    var base = codigo, n = 2;
    while (todas.some(function (a) { return a.CODIGO === codigo; })) codigo = base + '_' + (n++);
    SGO_DATA.insert(AREAS_SHEET, { CODIGO: codigo, NOME: nome, DESCRICAO: descricao, ORDEM: todas.length + 1, ATIVO: 'SIM', ATUALIZADO_EM: agora, ATUALIZADO_POR: s.usuario });
    SGO_DATA.log('AREAS_CRIAR', s.usuario, 'Área criada: ' + nome + ' (' + codigo + ')', 'USUARIOS');
    return { message: 'Área "' + nome + '" criada. Escolha-a no cadastro das pessoas.' };
  });
}

/** Inativa (some dos seletores) ou reativa. Nunca apaga. Payload: { id, ativo:boolean }. */
function areasAlterarSituacao(sessionId, payload) {
  return Areas_resposta_('mudar a situação da área', function () {
    var s = Areas_sessaoGestao_(sessionId, 'mudar a situação da área');
    Areas_garantir_();
    var p = payload || {};
    var area = Areas_todas_().filter(function (a) { return a.ID === SGO_UTILS.safe(p.id); })[0];
    if (!area) throw new Error('a área não foi encontrada; atualize a tela e tente de novo');
    var ativar = p.ativo === true;
    if (!ativar) {
      var qtd = Areas_pessoasDaEquipe_().filter(function (u) { return SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO' && Areas_semAcento_(u.AREA) === area.CODIGO; }).length;
      if (qtd) throw new Error(qtd + ' pessoa(s) ativa(s) estão na área ' + area.NOME + '. Mude a área delas na lista "Pessoas e áreas" e inative depois');
    }
    SGO_DATA.update(AREAS_SHEET, area.ID, { ATIVO: ativar ? 'SIM' : 'NAO', ATUALIZADO_EM: SGO_UTILS.nowIso(), ATUALIZADO_POR: s.usuario });
    SGO_DATA.log(ativar ? 'AREAS_REATIVAR' : 'AREAS_INATIVAR', s.usuario, 'Área ' + area.NOME + ' (' + area.CODIGO + ')', 'USUARIOS');
    return { message: ativar ? 'Área reativada.' : 'Área inativada: ela não aparece mais para escolha. O histórico continua com o nome dela.' };
  });
}

/** Define a área de uma pessoa (gestão e RH). Payload: { usuarioId, area } (area '' = sem área). */
function areasDefinirDoUsuario(sessionId, payload) {
  return Areas_resposta_('salvar a área da pessoa', function () {
    var s = Areas_sessaoGestao_(sessionId, 'salvar a área da pessoa');
    Areas_garantir_();
    var p = payload || {};
    var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, SGO_UTILS.safe(p.usuarioId));
    if (!u || SGO_UTILS.safeUpper(u.PERFIL) === 'CLIENTE') throw new Error('a pessoa não foi encontrada; atualize a tela e tente de novo');
    var cod = Areas_semAcento_(p.area);
    var nomes = Areas_mapaNomes_();
    if (cod && !Areas_todas_().some(function (a) { return a.CODIGO === cod && a.ATIVO; })) throw new Error('a área escolhida não existe ou está inativa; escolha outra na lista');
    var antes = Areas_semAcento_(u.AREA);
    if (antes === cod) return { message: 'A área já estava assim.' };
    SGO_DATA.update(SGO_CFG.SHEETS.CAD_USUARIOS, u.ID, { AREA: cod });
    SGO_DATA.log('USUARIOS_AREA', s.usuario, (SGO_UTILS.safe(u.NOME) || u.USUARIO) + ': área ' + (nomes[antes] || antes || 'vazia') + ' -> ' + (nomes[cod] || cod || 'vazia'), 'USUARIOS');
    return { message: 'Área de ' + (SGO_UTILS.safe(u.NOME) || u.USUARIO) + ' salva: ' + (nomes[cod] || 'sem área') + '.' };
  });
}

/** Preenche pelo perfil quem ainda está sem área. Payload: { aplicar:boolean }. Sem aplicar = só a prévia. */
function areasPreencherPeloPerfil(sessionId, payload) {
  return Areas_resposta_('preencher as áreas', function () {
    var s = Areas_sessaoGestao_(sessionId, 'preencher as áreas');
    Areas_garantir_();
    var aplicar = !!(payload && payload.aplicar === true);
    var r = Areas_preencherVazias_(aplicar, s.usuario);
    r.aplicado = aplicar;
    r.message = aplicar
      ? (r.preenchidas.length ? r.preenchidas.length + ' pessoa(s) com a área preenchida pelo perfil.' : 'Ninguém para preencher pelo perfil.') +
        (r.semDeducao.length ? ' ' + r.semDeducao.length + ' pessoa(s) continuam sem área: escolha na lista.' : '')
      : 'Prévia: nada foi gravado.';
    return r;
  });
}
