/****************************************************
 * MÓDULO REPRESENTAÇÃO (Brasmedical) — ENTRADA ÚNICA, VISÃO DA REPRESENTADA E VISÃO DA METROLABS (29/10/2026)
 *
 * google.script.run: Representacao_api(sessionId, acao, dados). Nunca lança.
 *  - Usuário REPRESENTADA: só as ações de REP_ACOES_REPRESENTADA, sempre pelo escopo da representada (Rep_escopo_).
 *    Busca de cliente só pelo CNPJ ou CPF completo e de equipamento só pela série exata (sem lista, sem nome), com o
 *    mesmo limite para achou e não achou. Cadastro obrigatório com "Ciente" (SGO_CadastroQualidade.js), pedido de
 *    atendimento na fila de solicitações da Assistência (ATEC_SOLICITACOES, ORIGEM REPRESENTACAO), conversa por pedido,
 *    por chamado e no canal geral (REP_MENSAGENS, só inclusão), anexos com tamanho conferido no servidor.
 *  - Equipe da Metrolabs: cadastro da representada e do catálogo de modelos, fila de pedidos com aceitar (vira chamado
 *    com REPRESENTADA_ID), pedir complemento e recusar com motivo, conversas com nota interna e a parte "Representação"
 *    da ficha do chamado. Os chamados seguem a Assistência técnica (triagem, agenda, O.S., aplicativo, relatório).
 *  - Avisos pela matriz (RP01 a RP08, SGO_Representacao_Avisos.js); alertas de prazo na central e na Caixa de decisões.
 ****************************************************/

/** Marca da chamada: exigirSessao só aceita a sessão REPRESENTADA dentro desta entrada (SGO_Auth.js). */
var SGO_REP_MODULO = false;
/** SGO_DATA.getAll('CAD_USUARIOS') devolve as contas REPRESENTADA só com esta marca ligada (SGO_Data.js). */
var SGO_DATA_REP_VISIVEL = false;

function Rep_comContasRep_(fn) { var antes = SGO_DATA_REP_VISIVEL; SGO_DATA_REP_VISIVEL = true; try { return fn(); } finally { SGO_DATA_REP_VISIVEL = antes; } }

/** Quem está usando: representada (externo) ou equipe da Metrolabs (Ast_eu_). */
function Rep_eu_(sessionId) {
  var s = exigirSessao(sessionId);
  if (Rep_up_(s.perfil) !== 'REPRESENTADA') { var eu = Ast_eu_(sessionId); eu.externo = false; return eu; }
  var u = Rep_comContasRep_(function () { return SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, s.userId); }) || {};
  var repId = Rep_s_(u.REPRESENTADA_ID) || Rep_s_(s.representadaId);
  var rep = Rep_representada_(repId);
  if (!repId || !rep) throw Rep_erro_('SEM_REPRESENTADA', 'Não foi possível abrir: o seu usuário não está ligado a uma representada. Fale com a Metrolabs para corrigir o acesso.');
  if (!Rep_ativa_(rep)) throw Rep_erro_('REP_INATIVA', 'Não foi possível abrir: o acesso da ' + Rep_s_(rep.NOME) + ' está suspenso pela Metrolabs. Fale com a Metrolabs.');
  var papel = REP_PAPEIS[Rep_up_(u.REPRESENTACAO_PAPEL)] ? Rep_up_(u.REPRESENTACAO_PAPEL) : 'LEITURA';
  return { externo: true, id: Rep_s_(s.userId), nome: Rep_s_(s.nome) || Rep_s_(u.NOME), email: Rep_s_(u.EMAIL).toLowerCase(), repId: repId, repNome: Rep_s_(rep.NOME), rep: rep,
    papel: papel, perm: REP_PAPEIS[papel], prazos: Rep_prazos_(rep), sessionId: sessionId, perfil: 'REPRESENTADA' };
}
function Rep_exigirPerm_(eu, k, acao) {
  if (eu.perm && eu.perm[k]) return;
  throw Rep_erro_('PAPEL', 'Não foi possível ' + acao + ': o seu papel (' + eu.perm.nome + ') não permite. Peça ao administrador da sua empresa no sistema ou fale com a Metrolabs pela conversa.');
}
/** Identidade usada pela Assistência quando a ação vem da representada (aparece no histórico com o nome e a empresa). */
function Rep_comoAst_(eu) { var x = Ast_sistema_(eu.nome + ' (' + eu.repNome + ')'); x.id = eu.id; x.nome = eu.nome + ' (' + eu.repNome + ')'; return x; }

// ------------------------------------------------------------
// LIMITE DE BUSCAS (mesma resposta e mesmo limite para achou e não achou)
// ------------------------------------------------------------
function Rep_contarBusca_(eu) {
  var c = CacheService.getScriptCache(), k = 'REP_BUSCAS_' + eu.id, l = Rep_json_(c.get(k), []) || [], agora = Date.now();
  l = l.filter(function (t) { return agora - t < 15 * 60000; });
  if (l.length >= REP_LIMITES.buscasPor15Min) {
    var min = Math.max(1, Math.ceil((l[0] + 15 * 60000 - agora) / 60000));
    throw Rep_erro_('LIMITE', 'Muitas buscas seguidas. Por segurança, espere ' + min + ' minuto' + (min > 1 ? 's' : '') + ' e busque de novo, com o CNPJ, o CPF ou a série completos e conferidos.');
  }
  l.push(agora); c.put(k, JSON.stringify(l), 1200);
}

// ------------------------------------------------------------
// VISÃO DA REPRESENTADA
// ------------------------------------------------------------
function Rep_cliPublico_(c) {
  var uns = Rep_lerAst_(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) { return Rep_s_(u.CLIENTE_ID) === Rep_s_(c.ID) && CadQ_ativo_(u); })
    .map(function (u) { return { id: Rep_s_(u.ID), nome: Rep_s_(u.NOME_UNIDADE), cidade: Rep_s_(u.CIDADE), uf: Rep_s_(u.UF) }; });
  return { id: Rep_s_(c.ID), razaoSocial: Rep_s_(c.RAZAO_SOCIAL) || Rep_s_(c.NOME_FANTASIA), cidade: Rep_s_(c.CIDADE), uf: Rep_s_(c.UF), unidades: uns };
}
function Rep_garantia_(e) {
  var ate = Rep_s_(e.GARANTIA_ATE);
  if (!ate) return { estado: 'NAO_COMPROVADA', texto: 'Garantia não comprovada (sem nota fiscal de venda e sem data de instalação)' };
  var hoje = Ast_hoje_(), br = ate.slice(8, 10) + '/' + ate.slice(5, 7) + '/' + ate.slice(0, 4);
  return ate >= hoje ? { estado: 'EM_GARANTIA', ate: ate, texto: 'Em garantia até ' + br } : { estado: 'FORA', ate: ate, texto: 'Fora de garantia desde ' + br };
}
function Rep_eqPublico_(e) {
  var un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Rep_s_(e.UNIDADE_ID)] || {};
  return { id: Rep_s_(e.ID), modelo: Rep_s_(e.MODELO), modeloCodigo: Rep_s_(e.MODELO_CODIGO), tipo: Rep_s_(e.TIPO), serie: Rep_s_(e.SERIE), setor: Rep_s_(e.SETOR),
    unidadeId: Rep_s_(e.UNIDADE_ID), unidade: Rep_s_(un.NOME_UNIDADE), dataInstalacao: Rep_s_(e.DATA_INSTALACAO), nfNumero: Rep_s_(e.NF_VENDA_NUMERO), nfData: Rep_s_(e.NF_VENDA_DATA),
    garantia: Rep_garantia_(e) };
}
function Rep_modelosDe_(repId, todos) {
  return Rep_ler_(REP_ABAS.MODELOS).filter(function (m) { return Rep_s_(m.REPRESENTADA_ID) === Rep_s_(repId) && (todos || Rep_up_(m.ATIVO || 'SIM') !== 'NAO'); })
    .map(function (m) { return { id: Rep_s_(m.ID), codigo: Rep_up_(m.CODIGO), nome: Rep_s_(m.NOME), familia: Rep_s_(m.FAMILIA), tipo: Rep_s_(m.TIPO_EQUIPAMENTO), garantiaMeses: Number(m.GARANTIA_MESES) || 0,
      padraoSerie: Rep_s_(m.PADRAO_SERIE), ativo: Rep_up_(m.ATIVO || 'SIM') !== 'NAO' }; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
}

function RepA_inicio_(eu) {
  var esc = Rep_escopo_(eu), cont = {};
  REP_ETAPAS.forEach(function (e) { cont[e.n] = 0; });
  esc.solicitacoes().forEach(function (s) { if (Rep_up_(s.SITUACAO) !== 'CONVERTIDA') cont[Rep_etapaSol_(s).n]++; });
  esc.chamados().forEach(function (c) { cont[Rep_etapaChamado_(c).n]++; });
  var pend = esc.solicitacoes().filter(function (s) { return Rep_up_(s.SITUACAO) === 'COMPLEMENTO'; })
    .map(function (s) { return { tipo: 'SOLICITACAO', id: Rep_s_(s.ID), numero: Rep_s_(s.NUMERO), texto: 'A Metrolabs pediu complemento: ' + Rep_s_(s.COMPLEMENTO_PERGUNTA).slice(0, 200) }; });
  return { eu: { nome: eu.nome, papel: eu.papel, papelNome: eu.perm.nome, perm: eu.perm }, representada: { nome: eu.repNome },
    etapas: REP_ETAPAS.map(function (e) { return { n: e.n, nome: e.nome, quantidade: cont[e.n] }; }), pendencias: pend,
    modelos: Rep_modelosDe_(eu.repId), paradas: REP_PARADA, enquadramentos: REP_ENQUADRAMENTO, tiposAnexo: REP_TIPOS_ANEXO, limites: REP_LIMITES,
    avisoCadastro: CADQ_AVISO, ciente: CADQ_CIENTE, consultaReceita: !!eu.prazos.consultaReceita, cancelarAntesVisita: !!eu.prazos.cancelarAntesVisita, ufs: CADQ_UFS };
}

function RepA_buscarCliente_(eu, d) {
  Rep_escopo_(eu);
  var dig = Rep_dig_(d && d.documento);
  if (!(dig.length === 14 && SGO_UTILS.isCnpj(dig)) && !(dig.length === 11 && SGO_UTILS.isCpf(dig))) throw Rep_erro_('DOCUMENTO', 'Não foi possível buscar: digite o CNPJ (14 números) ou o CPF (11 números) completo do cliente. Os dígitos verificadores não conferem com o que foi digitado; confira com o cliente ou na nota fiscal.');
  Rep_contarBusca_(eu);
  var achado = null;
  Rep_lerAst_(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function (c) {
    if (achado) return;
    var cn = Rep_dig_(SGO_UTILS.cnpjArmazenado(c.CNPJ)), cp = Rep_dig_(c.CPF);
    if ((dig.length === 14 && cn === dig) || (dig.length === 11 && cp === dig)) achado = c;
  });
  // juntado em outro cadastro: vale o que ficou
  for (var i = 0; achado && Rep_s_(achado.JUNTADO_COM_ID) && i < 5; i++) achado = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Rep_s_(achado.JUNTADO_COM_ID)] || achado;
  Rep_acesso_('BUSCA_CLIENTE', eu, d && d.ctx, (dig.length === 14 ? 'CNPJ ' : 'CPF ') + dig + (achado ? ' (achou)' : ' (não achou)'));
  if (!achado || !CadQ_ativo_(achado)) return { encontrado: false, documento: dig, message: 'Não há cliente com este ' + (dig.length === 14 ? 'CNPJ' : 'CPF') + '. Cadastre com os dados informados pelo cliente.' };
  Rep_marcarConsultado_(eu, 'C', Rep_s_(achado.ID));
  return { encontrado: true, cliente: Rep_cliPublico_(achado) };
}

function RepA_consultarCnpj_(eu, d) {
  Rep_exigirPerm_(eu, 'cadastrar', 'consultar o CNPJ');
  if (!eu.prazos.consultaReceita) throw Rep_erro_('DESLIGADA', 'A consulta à base pública da Receita está desligada para a sua empresa. Preencha com os dados informados pelo cliente.');
  Rep_contarBusca_(eu);
  var j = SGO_CNPJ_consultarDados_(Rep_dig_(d && d.cnpj));
  return { dados: { RAZAO_SOCIAL: Rep_s_(j.razao_social), NOME_FANTASIA: Rep_s_(j.nome_fantasia), CEP: Rep_dig_(j.cep), LOGRADOURO: [Rep_s_(j.descricao_tipo_de_logradouro), Rep_s_(j.logradouro)].filter(Boolean).join(' '),
    NUMERO: Rep_s_(j.numero), COMPLEMENTO: Rep_s_(j.complemento), BAIRRO: Rep_s_(j.bairro), CIDADE: Rep_s_(j.municipio), UF: Rep_up_(j.uf) },
    message: 'Dados da base pública da Receita preenchidos. Confira com o cliente; o contato (nome, e-mail e telefone) precisa vir do cliente.' };
}

function Rep_campoFalta_(faltam, campo, texto) { faltam.push({ campo: campo, texto: texto }); }
function Rep_falhou_(faltam, acao) {
  if (!faltam.length) return;
  var e = Rep_erro_('INCOMPLETO', 'Não foi possível ' + acao + ': ' + faltam.map(function (f) { return f.texto.replace(/\.$/, ''); }).join('; ') + '. Nada foi gravado.');
  e.faltam = faltam; throw e;
}
function Rep_quem_(eu) { return eu.nome + ' (' + eu.repNome + ')'; }

function RepA_cadastrarCliente_(eu, d) {
  Rep_exigirPerm_(eu, 'cadastrar', 'cadastrar o cliente');
  try { CadQ_garantirColunas_(); } catch (e) {}
  var p = (d && d.dados) || {}, norm = SGO_CLIENTES._normalizar(p), proj = {};
  SGO_CLIENTES.CAMPOS_EDITAVEIS.forEach(function (k) { proj[k] = norm[k]; });
  var probs = CadQ_problemasCliente_(proj);
  if (probs.length) { var e = Rep_erro_('INCOMPLETO', CadQ_msgFalta_(CadQ_faltam_(probs), true, false)); e.faltam = CadQ_faltam_(probs); throw e; }
  if (!CadQ_ciente_(p)) { var e2 = Rep_erro_('SEM_CIENTE', CADQ_MSG_CIENTE); e2.faltam = [{ campo: 'CIENTE', texto: 'Marque esta caixa para salvar.' }]; throw e2; }
  var cn = Rep_dig_(proj.CNPJ), cp = Rep_dig_(proj.CPF);
  var existe = Rep_lerAst_(SGO_CFG.SHEETS.CAD_CLIENTES).some(function (c) { return (cn && Rep_dig_(SGO_UTILS.cnpjArmazenado(c.CNPJ)) === cn) || (!cn && cp && Rep_dig_(c.CPF) === cp); });
  if (existe) throw Rep_erro_('JA_EXISTE', 'Não foi possível cadastrar: este ' + (cn ? 'CNPJ' : 'CPF') + ' já está cadastrado. Volte à busca, digite o documento completo e escolha o cliente encontrado. Nada foi gravado.');
  var agora = SGO_UTILS.nowIso(), quem = Rep_quem_(eu);
  var reg = SGO_DATA.insert(SGO_CFG.SHEETS.CAD_CLIENTES, {
    RAZAO_SOCIAL: proj.RAZAO_SOCIAL, NOME_FANTASIA: proj.NOME_FANTASIA, CNPJ: proj.CNPJ, CPF: proj.CPF, ENDERECO: [proj.LOGRADOURO + (proj.NUMERO ? ', ' + proj.NUMERO : '') + (proj.COMPLEMENTO ? ' - ' + proj.COMPLEMENTO : ''), proj.BAIRRO, proj.CIDADE + '/' + proj.UF, proj.CEP ? 'CEP ' + proj.CEP : ''].filter(Boolean).join(' - '),
    CEP: proj.CEP, LOGRADOURO: proj.LOGRADOURO, NUMERO: proj.NUMERO, COMPLEMENTO: proj.COMPLEMENTO, BAIRRO: proj.BAIRRO, CIDADE: proj.CIDADE, UF: proj.UF, CONTATO: proj.CONTATO, EMAIL: proj.EMAIL, TELEFONE: proj.TELEFONE,
    STATUS: 'ATIVO', ORIGEM: 'REPRESENTADA', ORIGEM_REPRESENTADA_ID: eu.repId, CRIADO_POR_ID: eu.id, CRIADO_POR_NOME: quem, ATUALIZADO_POR_NOME: quem, ATUALIZADO_EM: agora, CIENTE_POR_NOME: quem, CIENTE_EM: agora });
  var cliId = Rep_s_(reg && reg.ID);
  var un = SGO_DATA.insert(SGO_CFG.SHEETS.CAD_UNIDADES, { CLIENTE_ID: cliId, NOME_UNIDADE: proj.NOME_FANTASIA || proj.RAZAO_SOCIAL, CNPJ_UNIDADE: cn, ENDERECO: reg.ENDERECO, CIDADE: proj.CIDADE, UF: proj.UF,
    RESPONSAVEL: proj.CONTATO, TELEFONE: Rep_dig_(proj.TELEFONE), EMAIL: proj.EMAIL, STATUS: 'ATIVO', ORIGEM: 'REPRESENTADA', ORIGEM_REPRESENTADA_ID: eu.repId, CRIADO_POR_ID: eu.id, CRIADO_POR_NOME: quem,
    ATUALIZADO_POR_NOME: quem, ATUALIZADO_EM: agora, CIENTE_POR_NOME: quem, CIENTE_EM: agora });
  Ast_memoTirar_(SGO_CFG.SHEETS.CAD_CLIENTES); Ast_memoTirar_(SGO_CFG.SHEETS.CAD_UNIDADES);
  var sess = { userId: eu.id, nome: quem, perfil: 'REPRESENTADA' }, origem = 'Representação (' + eu.repNome + ')';
  CadQ_registrar_(sess, { entidade: 'CLIENTE', registroId: cliId, registroNome: proj.RAZAO_SOCIAL, acao: 'CRIAR', origem: origem, ciente: true, campos: CadQ_diff_({}, reg, CADQ_CAMPOS_HIST.CLIENTE), problemasAntes: [], problemasDepois: [] });
  CadQ_registrar_(sess, { entidade: 'UNIDADE', registroId: Rep_s_(un && un.ID), registroNome: un && un.NOME_UNIDADE, acao: 'CRIAR', origem: origem + ' (unidade principal)', ciente: true, campos: CadQ_diff_({}, un, CADQ_CAMPOS_HIST.UNIDADE), problemasAntes: [], problemasDepois: CadQ_problemasUnidade_(un) });
  Rep_acesso_('CADASTRO_CLIENTE', eu, d && d.ctx, proj.RAZAO_SOCIAL + ' (' + (cn || cp) + ')');
  return { cliente: Rep_cliPublico_(SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, cliId) || reg), message: 'Cliente ' + proj.RAZAO_SOCIAL + ' cadastrado com a unidade principal. A Metrolabs confere o cadastro.' };
}

function RepA_cadastrarUnidade_(eu, d) {
  Rep_exigirPerm_(eu, 'cadastrar', 'cadastrar a unidade');
  var esc = Rep_escopo_(eu), cli = esc.cliente(d && d.clienteId), p = (d && d.dados) || {};
  var norm = CadQ_normUnidade_(Object.assign({}, p, { CLIENTE_ID: cli.ID }));
  var probs = CadQ_problemasUnidade_(norm);
  if (probs.length) { var e = Rep_erro_('INCOMPLETO', CadQ_msgFalta_(CadQ_faltam_(probs), true, false)); e.faltam = CadQ_faltam_(probs); throw e; }
  if (!CadQ_ciente_(p)) { var e2 = Rep_erro_('SEM_CIENTE', CADQ_MSG_CIENTE); e2.faltam = [{ campo: 'CIENTE', texto: 'Marque esta caixa para salvar.' }]; throw e2; }
  var agora = SGO_UTILS.nowIso(), quem = Rep_quem_(eu);
  var un = SGO_DATA.insert(SGO_CFG.SHEETS.CAD_UNIDADES, Object.assign({}, norm, { EMAIL: Rep_s_(p.EMAIL).toLowerCase(), STATUS: 'ATIVO', ORIGEM: 'REPRESENTADA', ORIGEM_REPRESENTADA_ID: eu.repId,
    CRIADO_POR_ID: eu.id, CRIADO_POR_NOME: quem, ATUALIZADO_POR_NOME: quem, ATUALIZADO_EM: agora, CIENTE_POR_NOME: quem, CIENTE_EM: agora }));
  Ast_memoTirar_(SGO_CFG.SHEETS.CAD_UNIDADES);
  CadQ_registrar_({ userId: eu.id, nome: quem, perfil: 'REPRESENTADA' }, { entidade: 'UNIDADE', registroId: Rep_s_(un && un.ID), registroNome: norm.NOME_UNIDADE, acao: 'CRIAR', origem: 'Representação (' + eu.repNome + ')', ciente: true,
    campos: CadQ_diff_({}, un, CADQ_CAMPOS_HIST.UNIDADE), problemasAntes: [], problemasDepois: [] });
  return { cliente: Rep_cliPublico_(cli), unidadeId: Rep_s_(un && un.ID), message: 'Unidade ' + norm.NOME_UNIDADE + ' cadastrada.' };
}

function Rep_serieNorm_(v) { return Rep_up_(v).replace(/\s+/g, ''); }
function RepA_buscarEquipamento_(eu, d) {
  var esc = Rep_escopo_(eu), cli = esc.cliente(d && d.clienteId), serie = Rep_serieNorm_(d && d.serie);
  if (serie.length < 3) throw Rep_erro_('SERIE', 'Não foi possível buscar: digite o número de série completo, como está na etiqueta do equipamento (pelo menos 3 letras ou números).');
  Rep_contarBusca_(eu);
  var noCliente = null, emOutro = false;
  Rep_lerAst_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) {
    if (Rep_up_(e.STATUS || 'ATIVO') === 'INATIVO' || Rep_serieNorm_(e.SERIE) !== serie) return;
    if (Rep_s_(e.CLIENTE_ID) === Rep_s_(cli.ID)) noCliente = noCliente || e; else emOutro = true;
  });
  Rep_acesso_('BUSCA_SERIE', eu, d && d.ctx, 'série ' + serie + (noCliente ? ' (achou)' : emOutro ? ' (em outro cliente)' : ' (não achou)'));
  if (noCliente) { Rep_marcarConsultado_(eu, 'E', Rep_s_(noCliente.ID)); return { encontrado: true, equipamento: Rep_eqPublico_(noCliente) }; }
  if (emOutro) return { encontrado: false, outroCliente: true, message: 'Esta série já está cadastrada em outro cliente. Fale com a Metrolabs pela conversa (canal geral) para conferir: equipamento vendido, transferido ou série digitada errada.' };
  return { encontrado: false, message: 'Não há equipamento com esta série neste cliente. Cadastre o equipamento.' };
}

/** Arquivo enviado pela representada: tipo e tamanho conferidos aqui (a tela reduz a foto antes de enviar). */
function Rep_conferirArquivo_(a, tipo, rotulo) {
  if (!a || !Rep_s_(a.base64)) return null;
  var mime = Rep_s_(a.tipo).toLowerCase(), bytes = Math.floor(Rep_s_(a.base64).length * 3 / 4);
  if ((REP_MIME[tipo] || []).indexOf(mime) < 0) throw Rep_erro_('ARQUIVO', 'Não foi possível enviar ' + rotulo + ' (' + Rep_s_(a.nome) + '): tipo de arquivo não aceito. Use ' + (REP_MIME[tipo] || []).map(function (m) { return m.split('/')[1].toUpperCase(); }).join(', ') + '.');
  var max = tipo === 'VIDEO' ? REP_LIMITES.videoBytes : /^FOTO/.test(tipo) ? REP_LIMITES.fotoBytes : REP_LIMITES.documentoBytes;
  if (bytes > max) throw Rep_erro_('ARQUIVO', 'Não foi possível enviar ' + rotulo + ' (' + Rep_s_(a.nome) + '): passa de ' + Math.round(max / 1048576) + ' MB. ' + (tipo === 'VIDEO' ? 'Grave um vídeo mais curto (até 1 minuto costuma bastar).' : 'Reduza o arquivo e envie de novo.'));
  return { nome: Rep_txt_(a.nome, 120) || (tipo.toLowerCase() + '.' + mime.split('/')[1]), mime: mime, base64: Rep_s_(a.base64), bytes: bytes };
}
function Rep_pastaAnexos_(repId) {
  var raiz = SGO_DocSalvar_pastaPersistente_('REP_PASTA_ANEXOS_ID', 'Representação - Anexos', '');
  var ano = Ast_hoje_().slice(0, 4);
  return Ast_subpasta_(Ast_subpasta_(raiz, Rep_s_(repId) || 'sem-representada'), ano);
}
function Rep_salvarAnexo_(eu, repId, refTipo, refId, tipo, arq, publico) {
  var blob = Utilities.newBlob(Utilities.base64Decode(arq.base64), arq.mime, arq.nome);
  var f = Rep_pastaAnexos_(repId).createFile(blob);
  Ast_privado_(f);
  return Rep_inserir_(REP_ABAS.ANEXOS, { REPRESENTADA_ID: repId, REF_TIPO: refTipo, REF_ID: Rep_s_(refId), TIPO: tipo, NOME: arq.nome, MIME: arq.mime, TAMANHO: arq.bytes,
    SHA256: Rep_hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.base64Decode(arq.base64))), ARQUIVO_ID: f.getId(), PUBLICO: publico || 'REPRESENTADA',
    POR_LADO: eu.externo ? 'REPRESENTADA' : 'METROLABS', POR_ID: eu.id, POR_NOME: eu.externo ? Rep_quem_(eu) : eu.nome, EM: Rep_agora_() });
}
function Rep_hex_(bytes) { return Array.prototype.map.call(bytes, function (b) { var v = b < 0 ? b + 256 : b; return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
function Rep_anexoPublico_(a) {
  return { id: Rep_s_(a.ID), tipo: Rep_up_(a.TIPO), tipoNome: REP_TIPOS_ANEXO[Rep_up_(a.TIPO)] || Rep_s_(a.TIPO), nome: Rep_s_(a.NOME), mime: Rep_s_(a.MIME), tamanho: Number(a.TAMANHO) || 0,
    url: '/arquivos/' + Rep_s_(a.ARQUIVO_ID), por: Rep_s_(a.POR_NOME), lado: Rep_up_(a.POR_LADO), em: Rep_br_(a.EM) };
}
function Rep_diaOk_(v) { return /^\d{4}-\d{2}-\d{2}$/.test(Rep_s_(v)) && Rep_s_(v) <= Ast_hoje_() && Rep_s_(v) >= '1990-01-01'; }
function Rep_somarMeses_(dia, meses) {
  var y = +dia.slice(0, 4), m = +dia.slice(5, 7) - 1 + meses, dd = +dia.slice(8, 10);
  var dt = new Date(Date.UTC(y + Math.floor(m / 12), ((m % 12) + 12) % 12, 1)), fim = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(dd, fim));
  return dt.toISOString().slice(0, 10);
}

function RepA_cadastrarEquipamento_(eu, d) {
  Rep_exigirPerm_(eu, 'cadastrar', 'cadastrar o equipamento');
  d = d || {};
  var esc = Rep_escopo_(eu), cli = esc.cliente(d.clienteId), faltam = [];
  var un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Rep_s_(d.unidadeId)];
  if (!un || Rep_s_(un.CLIENTE_ID) !== Rep_s_(cli.ID)) Rep_campoFalta_(faltam, 'unidadeId', 'escolha a unidade do cliente onde o equipamento está instalado');
  var mod = Rep_modelosDe_(eu.repId).filter(function (m) { return m.codigo === Rep_up_(d.modeloCodigo); })[0];
  if (!mod) Rep_campoFalta_(faltam, 'modeloCodigo', 'escolha o modelo na lista (se o modelo não aparece, peça à Metrolabs pela conversa para incluir no catálogo)');
  var serie = Rep_serieNorm_(d.serie);
  if (serie.length < 3) Rep_campoFalta_(faltam, 'serie', 'informe o número de série completo, como está na etiqueta');
  else if (mod && mod.padraoSerie) { var ok = true; try { ok = new RegExp('^(?:' + mod.padraoSerie + ')$', 'i').test(serie); } catch (e) { ok = true; } if (!ok) Rep_campoFalta_(faltam, 'serie', 'a série não segue o padrão do modelo ' + mod.nome + '; confira na etiqueta'); }
  if (Rep_s_(d.dataInstalacao) && !Rep_diaOk_(d.dataInstalacao)) Rep_campoFalta_(faltam, 'dataInstalacao', 'a data da instalação precisa ser uma data válida até hoje');
  if (Rep_s_(d.nfNumero) && !Rep_diaOk_(d.nfData)) Rep_campoFalta_(faltam, 'nfData', 'informe a data da nota fiscal de venda (até hoje)');
  if (Rep_s_(d.nfData) && !Rep_s_(d.nfNumero)) Rep_campoFalta_(faltam, 'nfNumero', 'informe o número da nota fiscal de venda');
  var foto = Rep_conferirArquivo_(d.fotoEtiqueta, 'FOTO_ETIQUETA', 'a foto da etiqueta');
  if (!foto) Rep_campoFalta_(faltam, 'fotoEtiqueta', 'envie a foto da etiqueta de série (legível)');
  var nf = Rep_conferirArquivo_(d.nfArquivo, 'NF_VENDA', 'a nota fiscal');
  if (!CadQ_ciente_({ CIENTE: d.ciente })) Rep_campoFalta_(faltam, 'ciente', 'marque "' + CADQ_CIENTE + '"');
  Rep_falhou_(faltam, 'cadastrar o equipamento');
  var repetida = Rep_lerAst_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).some(function (e) { return Rep_up_(e.STATUS || 'ATIVO') !== 'INATIVO' && Rep_serieNorm_(e.SERIE) === serie; });
  if (repetida) throw Rep_erro_('SERIE_EXISTE', 'Não foi possível cadastrar: esta série já está cadastrada. Busque de novo pela série no cliente certo; se ela estiver em outro cliente, fale com a Metrolabs pela conversa. Nada foi gravado.');
  var inicio = Rep_s_(d.dataInstalacao) || Rep_s_(d.nfData), ate = inicio && mod.garantiaMeses > 0 ? Rep_somarMeses_(inicio, mod.garantiaMeses) : '';
  var eq = SGO_DATA.insert(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, {
    CLIENTE_ID: cli.ID, UNIDADE_ID: un.ID, TIPO: Rep_up_(mod.tipo), FABRICANTE: Rep_up_(eu.repNome), MODELO: Rep_up_(mod.nome), SERIE: serie, TAG: '', SETOR: Rep_up_(Rep_txt_(d.setor, 80)),
    PATRIMONIO: Rep_up_(Rep_txt_(d.patrimonio, 60)), STATUS: 'ATIVO', QR_TOKEN: SGO_UTILS.uuid(), DATA_INSTALACAO: Rep_s_(d.dataInstalacao), NF_VENDA_NUMERO: Rep_txt_(d.nfNumero, 40),
    NF_VENDA_DATA: Rep_s_(d.nfData), GARANTIA_MESES: mod.garantiaMeses || '', GARANTIA_ATE: ate, REVENDA: Rep_up_(Rep_txt_(d.revenda, 120)), MODELO_CODIGO: mod.codigo,
    ORIGEM_REPRESENTADA_ID: eu.repId, CRIADO_POR_NOME: Rep_quem_(eu), CRIADO_PELA_REPRESENTADA_EM: Rep_agora_() });
  Ast_memoTirar_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS);
  var a1 = Rep_salvarAnexo_(eu, eu.repId, 'EQUIPAMENTO', eq.ID, 'FOTO_ETIQUETA', foto);
  var campos = { FOTO_ETIQUETA_ARQUIVO_ID: a1.ARQUIVO_ID };
  if (nf) campos.NF_VENDA_ARQUIVO_ID = Rep_salvarAnexo_(eu, eu.repId, 'EQUIPAMENTO', eq.ID, 'NF_VENDA', nf).ARQUIVO_ID;
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, eq.ID, campos);
  Ast_memoTirar_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS);
  Rep_acesso_('CADASTRO_EQUIPAMENTO', eu, d.ctx, mod.nome + ' série ' + serie + ' em ' + Rep_s_(cli.RAZAO_SOCIAL));
  return { equipamento: Rep_eqPublico_(Object.assign({}, eq, campos)), message: 'Equipamento ' + mod.nome + ' série ' + serie + ' cadastrado. ' + Rep_garantia_(Object.assign({}, eq)).texto + '.' };
}

/** Relato da abertura (seção 5.3). Devolve o texto que a Assistência lê em DESCRICAO/SINTOMA. */
function Rep_textoRelato_(r) {
  return [r.sintoma, 'Começou: ' + r.inicio, 'Código de erro no visor: ' + (r.naoExibe ? 'não exibe' : r.codigoErro), 'Equipamento: ' + (REP_PARADA[r.parada] || r.parada),
    'Risco de uso: ' + r.risco, 'Já tentado: ' + r.tentado, 'Enquadramento pretendido: ' + (REP_ENQUADRAMENTO[r.enquadramento] || r.enquadramento)].join('\n');
}
function RepA_abrir_(eu, d) {
  Rep_exigirPerm_(eu, 'abrir', 'abrir o pedido de atendimento');
  d = d || {};
  var esc = Rep_escopo_(eu), faltam = [], cli = null, eq = null, un = null;
  try { cli = esc.cliente(d.clienteId); } catch (e) { Rep_campoFalta_(faltam, 'clienteId', 'escolha o cliente final pela busca do CNPJ ou CPF (ou cadastre)'); }
  if (cli) {
    un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Rep_s_(d.unidadeId)];
    if (!un || Rep_s_(un.CLIENTE_ID) !== Rep_s_(cli.ID)) { un = null; Rep_campoFalta_(faltam, 'unidadeId', 'escolha a unidade do cliente'); }
    try { eq = esc.equipamento(d.equipamentoId); if (Rep_s_(eq.CLIENTE_ID) !== Rep_s_(cli.ID)) { eq = null; throw new Error('x'); } } catch (e2) { Rep_campoFalta_(faltam, 'equipamentoId', 'escolha o equipamento pela busca da série (ou cadastre)'); }
  }
  var r = { sintoma: Rep_txt_(d.sintoma, 3000), inicio: Rep_txt_(d.inicio, 120), codigoErro: Rep_txt_(d.codigoErro, 120), naoExibe: !!d.naoExibe, parada: Rep_up_(d.parada),
    risco: Rep_txt_(d.risco, 500), tentado: Rep_txt_(d.tentado, 1000), enquadramento: Rep_up_(d.enquadramento) };
  var setor = Rep_txt_(d.setor, 80), cNome = Rep_txt_(d.contatoNome, 120), cTel = Rep_dig_(d.contatoTelefone), cEmail = Rep_s_(d.contatoEmail).toLowerCase();
  if (setor.length < 2) Rep_campoFalta_(faltam, 'setor', 'informe o setor onde o equipamento está (ex.: CME, centro cirúrgico)');
  if (cNome.length < 3) Rep_campoFalta_(faltam, 'contatoNome', 'informe o nome do contato no local');
  if (!CadQ_telefoneOk_(cTel)) Rep_campoFalta_(faltam, 'contatoTelefone', 'informe o telefone do contato no local com DDD (10 ou 11 números)');
  if (!SGO_UTILS.isEmail(cEmail)) Rep_campoFalta_(faltam, 'contatoEmail', 'informe um e-mail válido do contato no local');
  if (r.sintoma.length < 30) Rep_campoFalta_(faltam, 'sintoma', 'descreva o sintoma com pelo menos 30 letras (o que acontece, em que etapa, com que frequência)');
  if (r.inicio.length < 3) Rep_campoFalta_(faltam, 'inicio', 'informe quando o problema começou');
  if (!r.naoExibe && r.codigoErro.length < 1) Rep_campoFalta_(faltam, 'codigoErro', 'informe o código de erro do visor ou marque "não exibe"');
  if (!REP_PARADA[r.parada]) Rep_campoFalta_(faltam, 'parada', 'diga se o equipamento está parado (total, parcial ou funcionando)');
  if (r.risco.length < 3) Rep_campoFalta_(faltam, 'risco', 'informe o risco de continuar usando o equipamento');
  if (r.tentado.length < 3) Rep_campoFalta_(faltam, 'tentado', 'informe o que já foi tentado (ou "nada")');
  if (!REP_ENQUADRAMENTO[r.enquadramento]) Rep_campoFalta_(faltam, 'enquadramento', 'escolha o enquadramento pretendido (garantia, fora de garantia ou não sei)');
  var fotos = (Array.isArray(d.fotos) ? d.fotos : []).slice(0, 10).map(function (f, i) { return Rep_conferirArquivo_(f, 'FOTO_EQUIPAMENTO', 'a foto ' + (i + 1)); }).filter(Boolean);
  var etq = (Array.isArray(d.fotosEtiqueta) ? d.fotosEtiqueta : []).slice(0, 3).map(function (f) { return Rep_conferirArquivo_(f, 'FOTO_ETIQUETA', 'a foto da etiqueta'); }).filter(Boolean);
  var video = Rep_conferirArquivo_(d.video, 'VIDEO', 'o vídeo');
  if (!fotos.length) Rep_campoFalta_(faltam, 'fotos', 'envie pelo menos 1 foto do equipamento');
  if (!etq.length) Rep_campoFalta_(faltam, 'fotosEtiqueta', 'envie pelo menos 1 foto da etiqueta de série');
  Rep_falhou_(faltam, 'enviar o pedido');
  var desc = Rep_textoRelato_(r), prazos = eu.prazos;
  var s = Ast_comTrava_(function () {
    return Ast_inserir_(AST_ABAS.SOLICITACOES, { NUMERO: Ast_proximoNumero_('SOL', AST_ABAS.SOLICITACOES), ORIGEM: 'REPRESENTACAO', CLIENTE_ID: cli.ID, CLIENTE_NOME: Ast_clienteNome_(cli),
      UNIDADE_ID: un.ID, EQUIPAMENTO_ID: eq.ID, EQUIPAMENTO_TEXTO: Ast_equipTexto_(eq), SOLICITANTE: cNome, CONTATO: [cTel, cEmail].join(' · '), DESCRICAO: desc, PARADA: r.parada,
      SITUACAO: 'NOVA', POR_ID: eu.id, POR_NOME: Rep_quem_(eu), REPRESENTADA_ID: eu.repId, REPRESENTADA_NOME: eu.repNome, PROTOCOLO_REPRESENTADA: Rep_txt_(d.protocolo, 60),
      RELATO_JSON: JSON.stringify(r), ENQUADRAMENTO_PRETENDIDO: r.enquadramento, SETOR: setor, CONTATO_NOME: cNome, CONTATO_TELEFONE: cTel, CONTATO_EMAIL: cEmail,
      ACEITE_MIN_UTEIS: prazos.aceiteMin, PAUSA_MIN: 0, ATUALIZADO_EM: Ast_agora_() });
  });
  fotos.forEach(function (f) { Rep_salvarAnexo_(eu, eu.repId, 'SOLICITACAO', s.ID, 'FOTO_EQUIPAMENTO', f); });
  etq.forEach(function (f) { Rep_salvarAnexo_(eu, eu.repId, 'SOLICITACAO', s.ID, 'FOTO_ETIQUETA', f); });
  if (video) Rep_salvarAnexo_(eu, eu.repId, 'SOLICITACAO', s.ID, 'VIDEO', video);
  Ast_evento_('SOLICITACAO', s.ID, 'ABERTURA', Rep_comoAst_(eu), 'Pedido enviado pela ' + eu.repNome + ': ' + r.sintoma.slice(0, 300), { numero: s.NUMERO, publico: 'REPRESENTADA', para: 'Enviado' });
  var pz = Rep_prazoAceite_(s, Date.now(), prazos), resp = Rep_responsaveis_();
  Ast_avisar_(resp.ids, 'REP_PEDIDO', 'Pedido da ' + eu.repNome + ': ' + s.NUMERO + ' (' + Ast_clienteNome_(cli) + ')', Ast_equipTexto_(eq) + '\n' + desc.slice(0, 500) +
    '\nAceite, peça complemento ou recuse até ' + Rep_br_(pz.ate) + ' em Representação > Pedidos.', s.ID, { evento: r.parada === 'TOTAL' ? 'RP02' : 'RP01' });
  Rep_acesso_('PEDIDO', eu, d.ctx, s.NUMERO);
  return { solicitacao: { id: Rep_s_(s.ID), numero: Rep_s_(s.NUMERO) }, message: 'Pedido ' + s.NUMERO + ' enviado. A Metrolabs responde (aceita, pede complemento ou recusa com o motivo) até ' + Rep_br_(pz.ate) + '; você acompanha em Chamados.' };
}

function RepA_responderComplemento_(eu, d) {
  Rep_exigirPerm_(eu, 'abrir', 'responder o complemento');
  var esc = Rep_escopo_(eu), s = esc.solicitacao(d && d.id), t = Rep_txt_(d && d.resposta, 3000);
  if (Rep_up_(s.SITUACAO) !== 'COMPLEMENTO') throw Rep_erro_('ESTADO', 'Não foi possível responder: o pedido ' + s.NUMERO + ' não está aguardando complemento (' + (REP_SITUACOES_SOL[Rep_up_(s.SITUACAO)] || s.SITUACAO) + '). Atualize a tela.');
  if (t.length < 10) { var e = Rep_erro_('INCOMPLETO', 'Não foi possível responder: escreva a resposta com pelo menos 10 letras.'); e.faltam = [{ campo: 'resposta', texto: 'Obrigatório.' }]; throw e; }
  var fotos = (Array.isArray(d.fotos) ? d.fotos : []).slice(0, 10).map(function (f, i) { return Rep_conferirArquivo_(f, 'FOTO_EQUIPAMENTO', 'a foto ' + (i + 1)); }).filter(Boolean);
  var pausa = (Number(s.PAUSA_MIN) || 0) + (Rep_ms_(s.PAUSA_DESDE) !== null ? Ast_minUteisEntre_(Rep_ms_(s.PAUSA_DESDE), Date.now()) : 0);
  Ast_comTrava_(function () { Ast_atualizar_(AST_ABAS.SOLICITACOES, s.ID, { SITUACAO: 'NOVA', COMPLEMENTO_RESPOSTA: t, COMPLEMENTO_RESPONDIDO_EM: Ast_agora_(), PAUSA_DESDE: '', PAUSA_MIN: pausa, ATUALIZADO_EM: Ast_agora_() }); });
  fotos.forEach(function (f) { Rep_salvarAnexo_(eu, eu.repId, 'SOLICITACAO', s.ID, 'FOTO_EQUIPAMENTO', f); });
  Ast_evento_('SOLICITACAO', s.ID, 'COMPLEMENTO_RESPONDIDO', Rep_comoAst_(eu), t.slice(0, 2000), { numero: s.NUMERO, publico: 'REPRESENTADA', de: 'Complemento pedido', para: 'Enviado' });
  Ast_avisar_(Rep_responsaveis_().ids, 'REP_COMPLEMENTO', 'Complemento respondido: ' + s.NUMERO + ' (' + eu.repNome + ')', t.slice(0, 600) + '\nO prazo de aceite voltou a contar. Trate em Representação > Pedidos.', s.ID, { evento: 'RP03' });
  return { message: 'Resposta enviada. O pedido ' + s.NUMERO + ' voltou para a Metrolabs.' };
}

var REP_CANCELA_CHAMADO = ['ABERTO', 'EM_TRIAGEM', 'AGUARDANDO_ORCAMENTO', 'AGUARDANDO_PECA', 'PLANEJADO', 'AGENDADO'];
function RepA_cancelar_(eu, d) {
  Rep_exigirPerm_(eu, 'cancelar', 'cancelar');
  if (!eu.prazos.cancelarAntesVisita) throw Rep_erro_('DESLIGADO', 'Não foi possível cancelar: o cancelamento pela sua empresa está desligado no contrato. Peça o cancelamento à Metrolabs pela conversa.');
  d = d || {};
  var esc = Rep_escopo_(eu), motivo = Rep_txt_(d.motivo, 500);
  if (motivo.length < 10) { var e = Rep_erro_('INCOMPLETO', 'Não foi possível cancelar: escreva o motivo (pelo menos 10 letras). Ele fica no histórico.'); e.faltam = [{ campo: 'motivo', texto: 'Obrigatório.' }]; throw e; }
  if (Rep_up_(d.tipo) === 'SOLICITACAO') {
    var s = esc.solicitacao(d.id);
    if (['NOVA', 'COMPLEMENTO'].indexOf(Rep_up_(s.SITUACAO)) < 0) throw Rep_erro_('ESTADO', 'Não foi possível cancelar: o pedido ' + s.NUMERO + ' já foi ' + (Rep_up_(s.SITUACAO) === 'CONVERTIDA' ? 'aceito e virou o chamado ' + s.CHAMADO_NUMERO + ' (cancele pelo chamado)' : 'tratado') + '.');
    Ast_comTrava_(function () { Ast_atualizar_(AST_ABAS.SOLICITACOES, s.ID, { SITUACAO: 'CANCELADA', CANCELADA_EM: Ast_agora_(), CANCELADA_MOTIVO: motivo, CANCELADA_POR_NOME: Rep_quem_(eu), ATUALIZADO_EM: Ast_agora_() }); });
    Ast_evento_('SOLICITACAO', s.ID, 'CANCELAMENTO', Rep_comoAst_(eu), motivo, { numero: s.NUMERO, publico: 'REPRESENTADA', para: 'Cancelado' });
    Ast_avisar_(Rep_responsaveis_().ids, 'REP_CANCELADO', 'Pedido cancelado pela ' + eu.repNome + ': ' + s.NUMERO, motivo, s.ID, { evento: 'RP04' });
    Rep_acesso_('CANCELAMENTO', eu, d.ctx, s.NUMERO + ': ' + motivo);
    return { message: 'Pedido ' + s.NUMERO + ' cancelado.' };
  }
  var c = esc.chamado(d.id);
  if (REP_CANCELA_CHAMADO.indexOf(Rep_up_(c.SITUACAO)) < 0) throw Rep_erro_('ESTADO', 'Não foi possível cancelar: o chamado ' + c.NUMERO + ' já está em atendimento ou concluído (' + (AST_SITUACOES[Rep_up_(c.SITUACAO)] || c.SITUACAO) + '). Fale com a Metrolabs pela conversa do chamado.');
  AstC_cancelar_(Rep_comoAst_(eu), { id: c.ID, motivo: 'Cancelado pela ' + eu.repNome + ' (' + eu.nome + '): ' + motivo });
  Ast_avisar_(Rep_responsaveis_().ids.concat(Ast_gestoresTecnica_()), 'REP_CANCELADO', 'Chamado cancelado pela ' + eu.repNome + ': ' + c.NUMERO, motivo, c.ID, { evento: 'RP04' });
  Rep_acesso_('CANCELAMENTO', eu, d.ctx, c.NUMERO + ': ' + motivo);
  return { message: 'Chamado ' + c.NUMERO + ' cancelado.' };
}

function Rep_itemSol_(s) {
  var et = Rep_etapaSol_(s), un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Rep_s_(s.UNIDADE_ID)] || {}, eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[Rep_s_(s.EQUIPAMENTO_ID)] || {};
  return { tipo: 'SOLICITACAO', id: Rep_s_(s.ID), numero: Rep_s_(s.NUMERO), etapa: et.n, etapaNome: et.nome, clienteNome: Rep_s_(s.CLIENTE_NOME), unidade: Rep_s_(un.NOME_UNIDADE),
    cidade: [Rep_s_(un.CIDADE), Rep_s_(un.UF)].filter(Boolean).join('/'), equipamento: [Rep_s_(eq.MODELO), Rep_s_(eq.SERIE) ? 'série ' + Rep_s_(eq.SERIE) : ''].filter(Boolean).join(' · '),
    protocolo: Rep_s_(s.PROTOCOLO_REPRESENTADA), abertoEm: Rep_br_(s.CRIADO_EM), chamadoNumero: Rep_s_(s.CHAMADO_NUMERO), complemento: Rep_s_(s.COMPLEMENTO_PERGUNTA),
    recusaMotivo: Rep_up_(s.SITUACAO) === 'DESCARTADA' ? Rep_s_(s.DESCARTE_MOTIVO) : '', canceladoMotivo: Rep_s_(s.CANCELADA_MOTIVO),
    podeCancelar: ['NOVA', 'COMPLEMENTO'].indexOf(Rep_up_(s.SITUACAO)) >= 0, podeResponder: Rep_up_(s.SITUACAO) === 'COMPLEMENTO' };
}
function Rep_itemChamado_(c) {
  var et = Rep_etapaChamado_(c), sit = Rep_up_(c.SITUACAO), un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Rep_s_(c.UNIDADE_ID)] || {}, eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[Rep_s_(c.EQUIPAMENTO_ID)] || {};
  var visita = ['AGENDADO', 'EM_DESLOCAMENTO', 'NO_LOCAL', 'EM_EXECUCAO', 'PAUSADO', 'AGUARDANDO_CLIENTE'].indexOf(sit) >= 0;
  return { tipo: 'CHAMADO', id: Rep_s_(c.ID), numero: Rep_s_(c.NUMERO), etapa: et.n, etapaNome: et.nome, clienteNome: Rep_s_(c.CLIENTE_NOME), unidade: Rep_s_(c.UNIDADE_NOME),
    cidade: [Rep_s_(un.CIDADE), Rep_s_(un.UF)].filter(Boolean).join('/'), equipamento: [Rep_s_(eq.MODELO), Rep_s_(eq.SERIE) ? 'série ' + Rep_s_(eq.SERIE) : ''].filter(Boolean).join(' · '),
    protocolo: Rep_s_(c.PROTOCOLO_REPRESENTADA), abertoEm: Rep_br_(c.ABERTO_EM), agendadoPara: visita ? Rep_br_(c.AGENDADO_PARA) : '', tecnico: visita ? Rep_s_(c.TECNICO_NOME) : '',
    encerradoEm: Rep_br_(c.ENCERRADO_EM), canceladoMotivo: sit === 'CANCELADO' ? Rep_s_(c.CANCELADO_MOTIVO) : '', podeCancelar: REP_CANCELA_CHAMADO.indexOf(sit) >= 0 };
}
function RepA_chamados_(eu, d) {
  var esc = Rep_escopo_(eu), et = Number(d && d.etapa) || 0;
  var l = esc.solicitacoes().filter(function (s) { return Rep_up_(s.SITUACAO) !== 'CONVERTIDA'; }).map(Rep_itemSol_).concat(esc.chamados().map(Rep_itemChamado_));
  if (et) l = l.filter(function (x) { return x.etapa === et; });
  l.sort(function (a, b) { return String(b.numero).localeCompare(String(a.numero)); });
  return { itens: l, etapas: REP_ETAPAS.map(function (e) { return { n: e.n, nome: e.nome }; }) };
}
/** Linha do tempo pública para a representada: eventos marcados para ela ou para o cliente final (PUBLICO = REPRESENTADA ou SIM). */
function Rep_linhaDoTempo_(refs) {
  var quer = {};
  refs.forEach(function (r) { quer[r.tipo + '|' + r.id] = true; });
  return Rep_lerAst_(AST_ABAS.EVENTOS).filter(function (e) { var p = Rep_up_(e.PUBLICO); return quer[Rep_up_(e.ENTIDADE) + '|' + Rep_s_(e.ENTIDADE_ID)] && (p === 'SIM' || p === 'REPRESENTADA'); })
    .sort(function (a, b) { return String(a.EM).localeCompare(String(b.EM)); })
    .map(function (e) { var nome = Rep_s_(e.USUARIO_NOME); return { tipo: Rep_s_(e.TIPO), texto: Rep_s_(e.TEXTO), de: Rep_s_(e.DE), para: Rep_s_(e.PARA), numero: Rep_s_(e.NUMERO), em: Rep_br_(e.EM),
      por: /\(.+\)$/.test(nome) && Rep_s_(e.USUARIO_ID) ? nome : 'Metrolabs' }; });
}
function Rep_msgPublica_(m) {
  return { id: Rep_s_(m.ID), lado: Rep_up_(m.AUTOR_LADO), autor: Rep_up_(m.AUTOR_LADO) === 'METROLABS' ? Rep_s_(m.AUTOR_NOME) + ' (Metrolabs)' : Rep_s_(m.AUTOR_NOME), texto: Rep_s_(m.TEXTO),
    respondeA: Rep_s_(m.RESPONDE_A), interna: Rep_up_(m.INTERNA) === 'SIM', em: Rep_br_(m.EM), emIso: Rep_s_(m.EM), anexoId: Rep_s_(m.ANEXO_ID) };
}
function RepA_chamado_(eu, d) {
  var esc = Rep_escopo_(eu), tipo = Rep_up_(d && d.tipo) === 'SOLICITACAO' ? 'SOLICITACAO' : 'CHAMADO', reg, refs, item, sol = null;
  if (tipo === 'SOLICITACAO') { reg = esc.solicitacao(d.id); item = Rep_itemSol_(reg); sol = reg; refs = [{ tipo: 'SOLICITACAO', id: Rep_s_(reg.ID) }]; }
  else {
    reg = esc.chamado(d.id); item = Rep_itemChamado_(reg); refs = [{ tipo: 'CHAMADO', id: Rep_s_(reg.ID) }];
    if (Rep_s_(reg.SOLICITACAO_ID)) { sol = Ast_porId_(AST_ABAS.SOLICITACOES, reg.SOLICITACAO_ID); if (sol && Rep_s_(sol.REPRESENTADA_ID) === eu.repId) refs.push({ tipo: 'SOLICITACAO', id: Rep_s_(sol.ID) }); else sol = null; }
  }
  var eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[Rep_s_(reg.EQUIPAMENTO_ID)];
  var anexos = [], msgs = [];
  refs.forEach(function (r) { anexos = anexos.concat(esc.anexos(r.tipo, r.id).map(Rep_anexoPublico_)); msgs = msgs.concat(esc.mensagens(r.tipo, r.id).map(Rep_msgPublica_)); });
  msgs.sort(function (a, b) { return a.emIso.localeCompare(b.emIso); });
  var relato = sol ? Rep_json_(sol.RELATO_JSON, {}) : {};
  return { item: item, tipo: tipo, relato: relato, setor: sol ? Rep_s_(sol.SETOR) : '', contato: sol ? { nome: Rep_s_(sol.CONTATO_NOME), telefone: Rep_s_(sol.CONTATO_TELEFONE), email: Rep_s_(sol.CONTATO_EMAIL) } : null,
    complementoPergunta: sol ? Rep_s_(sol.COMPLEMENTO_PERGUNTA) : '', complementoResposta: sol ? Rep_s_(sol.COMPLEMENTO_RESPOSTA) : '',
    equipamento: eq && esc.equipamentoIds()[Rep_s_(eq.ID)] ? Rep_eqPublico_(eq) : null, linhaDoTempo: Rep_linhaDoTempo_(refs), anexos: anexos, mensagens: msgs,
    etapas: REP_ETAPAS.map(function (e) { return { n: e.n, nome: e.nome }; }), conversa: { refTipo: tipo, refId: Rep_s_(reg.ID) } };
}
function RepA_mensagens_(eu, d) {
  var esc = Rep_escopo_(eu), r = esc.ref(d && d.refTipo, d && d.refId), depois = Rep_s_(d && d.depoisDe);
  var l = esc.mensagens(r.tipo, r.id).filter(function (m) { return !depois || Rep_s_(m.EM) > depois; }).map(Rep_msgPublica_).sort(function (a, b) { return a.emIso.localeCompare(b.emIso); });
  return { ref: { tipo: r.tipo, id: r.id, numero: r.numero }, mensagens: l };
}
function Rep_gravarMensagem_(eu, repId, r, texto, interna, respondeA, anexoArq) {
  var m = Rep_inserir_(REP_ABAS.MENSAGENS, { REPRESENTADA_ID: repId, REF_TIPO: r.tipo, REF_ID: r.id, REF_NUMERO: r.numero, AUTOR_LADO: eu.externo ? 'REPRESENTADA' : 'METROLABS', AUTOR_ID: eu.id,
    AUTOR_NOME: eu.externo ? Rep_quem_(eu) : eu.nome, TEXTO: texto, INTERNA: interna ? 'SIM' : '', RESPONDE_A: Rep_s_(respondeA), ANEXO_ID: '', EM: Rep_agora_() });
  if (anexoArq) { var a = Rep_salvarAnexo_(eu, repId, r.tipo === 'GERAL' ? 'GERAL' : r.tipo, r.id, /^image\//.test(anexoArq.mime) ? 'FOTO_EQUIPAMENTO' : 'DOCUMENTO', anexoArq, interna ? 'INTERNO' : 'REPRESENTADA'); Rep_atualizar_(REP_ABAS.MENSAGENS, m.ID, { ANEXO_ID: a.ID }); m.ANEXO_ID = a.ID; }
  if (!interna && r.tipo !== 'GERAL') Ast_evento_(r.tipo, r.id, 'MENSAGEM', eu.externo ? Rep_comoAst_(eu) : eu, (eu.externo ? 'Mensagem da representada' : 'Mensagem da Metrolabs') + ' (conversa): ' + texto.slice(0, 200), { numero: r.numero, publico: 'REPRESENTADA' });
  return m;
}
function Rep_anexoDaMensagem_(a) {
  if (!a || !Rep_s_(a.base64)) return null;
  var tipo = /^image\//.test(Rep_s_(a.tipo).toLowerCase()) ? 'FOTO_EQUIPAMENTO' : 'DOCUMENTO';
  return Rep_conferirArquivo_(a, tipo, 'o anexo');
}
function RepA_enviarMensagem_(eu, d) {
  Rep_exigirPerm_(eu, 'conversar', 'enviar a mensagem');
  var esc = Rep_escopo_(eu), r = esc.ref(d && d.refTipo, d && d.refId), t = Rep_txt_(d && d.texto, 4000);
  if (r.tipo === 'EQUIPAMENTO') throw Rep_erro_('NAO_ENCONTRADO', REP_MSG_NAO_ENCONTRADO);
  if (t.length < 2) throw Rep_erro_('INCOMPLETO', 'Não foi possível enviar: escreva a mensagem.');
  var m = Rep_gravarMensagem_(eu, eu.repId, r, t, false, d && d.respondeA, Rep_anexoDaMensagem_(d && d.anexo));
  var dest = Rep_responsaveis_().ids;
  if (r.tipo === 'CHAMADO' && Rep_s_(r.registro.TECNICO_ID)) dest = dest.concat([Rep_s_(r.registro.TECNICO_ID)]);
  Ast_avisar_(dest, 'REP_MENSAGEM', 'Mensagem da ' + eu.repNome + (r.tipo === 'GERAL' ? ' (canal geral)' : ': ' + r.numero), eu.nome + ': ' + t.slice(0, 500) + '\nResponda em Representação > Conversas.', r.id, { evento: 'RP05' });
  var fora = typeof SGO_dentroDoExpediente_ === 'function' ? !SGO_dentroDoExpediente_(new Date()).dentro : false;
  return { mensagem: Rep_msgPublica_(m), message: fora ? 'Mensagem enviada. Estamos fora do horário de trabalho da Metrolabs: a resposta vem no próximo horário útil.' : 'Mensagem enviada.' };
}
function RepA_equipamentos_(eu) {
  var esc = Rep_escopo_(eu), ids = esc.equipamentoIds(), cl = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES);
  return { equipamentos: Rep_lerAst_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) { return ids[Rep_s_(e.ID)]; })
    .map(function (e) { var x = Rep_eqPublico_(e); x.clienteNome = Ast_clienteNome_(cl[Rep_s_(e.CLIENTE_ID)]); return x; }) };
}
function RepA_equipe_(eu) {
  Rep_exigirPerm_(eu, 'equipe', 'ver a equipe');
  var l = Rep_comContasRep_(function () { return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS); }).filter(function (u) { return Rep_up_(u.PERFIL) === 'REPRESENTADA' && Rep_s_(u.REPRESENTADA_ID) === eu.repId; });
  return { usuarios: l.map(function (u) { var p = Rep_up_(u.REPRESENTACAO_PAPEL); return { nome: Rep_s_(u.NOME), email: Rep_s_(u.EMAIL), papel: (REP_PAPEIS[p] || REP_PAPEIS.LEITURA).nome, situacao: Rep_up_(u.STATUS || 'ATIVO') }; }),
    acessos: Rep_ler_(REP_ABAS.ACESSOS).filter(function (a) { return Rep_s_(a.REPRESENTADA_ID) === eu.repId; }).slice(-100).reverse()
      .map(function (a) { return { quem: Rep_s_(a.USUARIO_NOME), acao: Rep_s_(a.ACAO), detalhe: Rep_s_(a.DETALHE), em: Rep_br_(a.EM) }; }),
    message: 'Para incluir ou tirar uma pessoa, escreva para a Metrolabs no canal geral: a Metrolabs cadastra e inativa os acessos.' };
}

var REP_ACOES_REPRESENTADA = {
  inicio: RepA_inicio_, buscarCliente: RepA_buscarCliente_, consultarCnpj: RepA_consultarCnpj_, cadastrarCliente: RepA_cadastrarCliente_, cadastrarUnidade: RepA_cadastrarUnidade_,
  buscarEquipamento: RepA_buscarEquipamento_, cadastrarEquipamento: RepA_cadastrarEquipamento_, abrir: RepA_abrir_, responderComplemento: RepA_responderComplemento_, cancelar: RepA_cancelar_,
  chamados: RepA_chamados_, chamado: RepA_chamado_, mensagens: RepA_mensagens_, enviarMensagem: RepA_enviarMensagem_, equipamentos: RepA_equipamentos_, equipe: RepA_equipe_,
  ajuda: function () { return { ajuda: Rep_ajuda_('representacao/representada') }; }
};
/** Texto da ajuda do módulo (SGO_Ajuda_Representacao.js): a representada lê a versão dela, sem termos internos. */
function Rep_ajuda_(chave) {
  try { var t = typeof SGO_ajudaTelas_Representacao_ === 'function' ? SGO_ajudaTelas_Representacao_()[chave] : null; return t ? JSON.parse(JSON.stringify(t)) : null; } catch (e) { return null; }
}

// ------------------------------------------------------------
// VISÃO DA METROLABS
// ------------------------------------------------------------
function RepI_podeAdministrar_(eu) { return eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA' || eu.perfil === 'GESTOR' || !!eu.diretoria || Rep_responsaveis_().ids.indexOf(eu.id) >= 0; }
function RepI_exigirAdm_(eu, acao) { if (!RepI_podeAdministrar_(eu)) throw Rep_erro_('PERFIL', 'Não foi possível ' + acao + ': o cadastro da representada e do catálogo é do Administrador, da Diretoria, dos gestores e dos responsáveis pela representação (Regras da assistência > Representação).'); }
function RepI_representadas_() { return Rep_ler_(REP_ABAS.REPRESENTADAS).map(Rep_publicoRepresentada_).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }); }
function RepI_iniciar_(eu) {
  var resp = Rep_responsaveis_();
  return { podeAdministrar: RepI_podeAdministrar_(eu), representadas: RepI_representadas_(), responsaveis: resp, papeis: Object.keys(REP_PAPEIS).map(function (k) { return { codigo: k, nome: REP_PAPEIS[k].nome }; }),
    prazosPadrao: REP_PRAZOS_PADRAO, etapas: REP_ETAPAS.map(function (e) { return { n: e.n, nome: e.nome }; }), eu: { id: eu.id, nome: eu.nome } };
}
function RepI_salvarRepresentada_(eu, d) {
  RepI_exigirAdm_(eu, 'salvar a representada');
  d = d || {};
  var nome = Rep_txt_(d.nome, 120), cnpj = Rep_dig_(d.cnpj), faltam = [];
  if (nome.length < 2) Rep_campoFalta_(faltam, 'nome', 'informe o nome da representada');
  if (cnpj && !SGO_UTILS.isCnpj(cnpj)) Rep_campoFalta_(faltam, 'cnpj', 'o CNPJ não confere (dígitos verificadores)');
  if (Rep_s_(d.contatoEmail) && !SGO_UTILS.isEmail(d.contatoEmail)) Rep_campoFalta_(faltam, 'contatoEmail', 'e-mail do contato inválido');
  var pz = Object.assign({}, REP_PRAZOS_PADRAO, d.prazos || {});
  if (!(Number(pz.aceiteMin) >= 30 && Number(pz.aceiteMin) <= 60 * 24 * 5)) Rep_campoFalta_(faltam, 'aceiteMin', 'o prazo de aceite precisa ficar entre 30 minutos e 5 dias úteis');
  if (!(Number(pz.alertaFracao) > 0 && Number(pz.alertaFracao) < 1)) Rep_campoFalta_(faltam, 'alertaFracao', 'o alerta precisa ser uma fração entre 0 e 1 (padrão 0,75)');
  if (!(Number(pz.semRegistroDiasUteis) >= 1 && Number(pz.semRegistroDiasUteis) <= 30)) Rep_campoFalta_(faltam, 'semRegistroDiasUteis', 'chamado sem registro: de 1 a 30 dias úteis');
  Rep_falhou_(faltam, 'salvar a representada');
  var prazos = {};
  Object.keys(REP_PRAZOS_PADRAO).forEach(function (k) { prazos[k] = typeof REP_PRAZOS_PADRAO[k] === 'boolean' ? !!pz[k] : Number(pz[k]); });
  var campos = { NOME: nome, CNPJ: cnpj, SITUACAO: Rep_up_(d.situacao) === 'INATIVA' ? 'INATIVA' : 'ATIVA', CONTRATO: Rep_txt_(d.contrato, 120), VIGENCIA_INICIO: Rep_s_(d.vigenciaInicio), VIGENCIA_FIM: Rep_s_(d.vigenciaFim),
    CONTATO_NOME: Rep_txt_(d.contatoNome, 120), CONTATO_EMAIL: Rep_s_(d.contatoEmail).toLowerCase(), PRAZOS_JSON: JSON.stringify(prazos), OBS: Rep_txt_(d.obs, 1000), ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Rep_agora_() };
  var atual = Rep_s_(d.id) ? Rep_representada_(d.id) : null;
  if (Rep_s_(d.id) && !atual) throw Rep_erro_('NAO_ENCONTRADO', 'Não foi possível salvar: a representada não foi encontrada. Atualize a tela.');
  var dup = Rep_ler_(REP_ABAS.REPRESENTADAS).some(function (r) { return Rep_s_(r.ID) !== Rep_s_(d.id) && Ast_semAcento_(r.NOME) === Ast_semAcento_(nome); });
  if (dup) throw Rep_erro_('DUPLICADA', 'Não foi possível salvar: já existe representada com o nome ' + nome + '.');
  var r = atual ? (Rep_atualizar_(REP_ABAS.REPRESENTADAS, atual.ID, campos), Object.assign({}, atual, campos)) : Rep_inserir_(REP_ABAS.REPRESENTADAS, Object.assign({ CRIADO_POR_NOME: eu.nome }, campos));
  return { representada: Rep_publicoRepresentada_(r), representadas: RepI_representadas_(), message: 'Representada ' + nome + ' salva.' + (campos.SITUACAO === 'INATIVA' ? ' Inativa: os usuários dela não abrem mais o módulo.' : '') };
}
function RepI_salvarModelo_(eu, d) {
  RepI_exigirAdm_(eu, 'salvar o modelo');
  d = d || {};
  var rep = Rep_representada_(d.representadaId), faltam = [];
  if (!rep) Rep_campoFalta_(faltam, 'representadaId', 'escolha a representada');
  var cod = Rep_up_(d.codigo).replace(/\s+/g, ''), nome = Rep_txt_(d.nome, 120), g = Number(d.garantiaMeses);
  if (cod.length < 2) Rep_campoFalta_(faltam, 'codigo', 'informe o código do modelo');
  if (nome.length < 2) Rep_campoFalta_(faltam, 'nome', 'informe o nome do modelo');
  if (Rep_txt_(d.tipo, 80).length < 3) Rep_campoFalta_(faltam, 'tipo', 'informe o tipo de equipamento (ex.: Autoclave, Lavadora ultrassônica)');
  if (!(g >= 0 && g <= 120 && Math.round(g) === g)) Rep_campoFalta_(faltam, 'garantiaMeses', 'garantia em meses inteiros, de 0 a 120');
  if (Rep_s_(d.padraoSerie)) { try { new RegExp(d.padraoSerie); } catch (e) { Rep_campoFalta_(faltam, 'padraoSerie', 'o padrão da série não é válido; deixe em branco se não souber'); } }
  Rep_falhou_(faltam, 'salvar o modelo');
  var atual = Rep_ler_(REP_ABAS.MODELOS).filter(function (m) { return Rep_s_(m.REPRESENTADA_ID) === Rep_s_(rep.ID) && Rep_up_(m.CODIGO) === cod; })[0];
  var campos = { REPRESENTADA_ID: rep.ID, CODIGO: cod, NOME: nome, FAMILIA: Rep_txt_(d.familia, 80), TIPO_EQUIPAMENTO: Rep_txt_(d.tipo, 80), GARANTIA_MESES: g, PADRAO_SERIE: Rep_txt_(d.padraoSerie, 120),
    ATIVO: d.ativo === false || Rep_up_(d.ativo) === 'NAO' ? 'NAO' : 'SIM', ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Rep_agora_() };
  if (atual) Rep_atualizar_(REP_ABAS.MODELOS, atual.ID, campos); else Rep_inserir_(REP_ABAS.MODELOS, campos);
  return { modelos: Rep_modelosDe_(rep.ID, true), message: 'Modelo ' + nome + ' salvo. Equipamentos já cadastrados mantêm a garantia calculada no cadastro.' };
}
function RepI_solPublica_(s) {
  var rep = Rep_representada_(s.REPRESENTADA_ID), pz = Rep_prazoAceite_(s, Date.now(), Rep_prazos_(rep));
  var x = Rep_itemSol_(s);
  x.representadaId = Rep_s_(s.REPRESENTADA_ID); x.representadaNome = Rep_s_(s.REPRESENTADA_NOME); x.situacao = Rep_up_(s.SITUACAO); x.prazo = pz; x.descricao = Rep_s_(s.DESCRICAO);
  x.solicitante = Rep_s_(s.SOLICITANTE); x.contato = Rep_s_(s.CONTATO); x.por = Rep_s_(s.POR_NOME); x.complementoResposta = Rep_s_(s.COMPLEMENTO_RESPOSTA); x.parada = Rep_up_(s.PARADA);
  x.equipamentoId = Rep_s_(s.EQUIPAMENTO_ID); x.clienteId = Rep_s_(s.CLIENTE_ID); x.unidadeId = Rep_s_(s.UNIDADE_ID);
  x.anexos = Rep_ler_(REP_ABAS.ANEXOS).filter(function (a) { return Rep_up_(a.REF_TIPO) === 'SOLICITACAO' && Rep_s_(a.REF_ID) === Rep_s_(s.ID); }).map(Rep_anexoPublico_);
  return x;
}
function RepI_solicitacoes_(eu, d) {
  var rid = Rep_s_(d && d.representadaId), sit = Rep_up_(d && d.situacao) || 'ABERTAS';
  var l = Rep_lerAst_(AST_ABAS.SOLICITACOES).filter(function (s) {
    if (!Rep_s_(s.REPRESENTADA_ID) || (rid && Rep_s_(s.REPRESENTADA_ID) !== rid)) return false;
    var x = Rep_up_(s.SITUACAO);
    return sit === 'TODAS' || (sit === 'ABERTAS' ? (x === 'NOVA' || x === 'COMPLEMENTO') : x === sit);
  }).map(RepI_solPublica_).sort(function (a, b) { return String(a.prazo.ate).localeCompare(String(b.prazo.ate)); });
  return { solicitacoes: l, prioridades: AST_PRIORIDADES, tipos: Ast_tipos_(false).map(function (t) { return { codigo: t.codigo, nome: t.nome }; }) };
}
function RepI_aceitar_(eu, d) {
  d = d || {};
  var s = Ast_porId_(AST_ABAS.SOLICITACOES, d.solicitacaoId);
  if (!s || !Rep_s_(s.REPRESENTADA_ID)) throw Rep_erro_('NAO_ENCONTRADO', 'Não foi possível aceitar: o pedido não foi encontrado. Atualize a fila.');
  var r = AstC_converter_(eu, { solicitacaoId: s.ID, prioridade: d.prioridade, prioridadeMotivo: d.prioridadeMotivo, tipoCodigo: d.tipoCodigo, confirmarDuplicado: d.confirmarDuplicado });
  return r;
}
function RepI_conversas_(eu, d) {
  var rid = Rep_s_(d && d.representadaId), grupos = {};
  Rep_ler_(REP_ABAS.MENSAGENS).forEach(function (m) {
    if (rid && Rep_s_(m.REPRESENTADA_ID) !== rid) return;
    var k = Rep_s_(m.REPRESENTADA_ID) + '|' + Rep_up_(m.REF_TIPO) + '|' + Rep_s_(m.REF_ID), g = grupos[k];
    if (!g) g = grupos[k] = { representadaId: Rep_s_(m.REPRESENTADA_ID), representadaNome: Rep_s_((Rep_representada_(m.REPRESENTADA_ID) || {}).NOME), refTipo: Rep_up_(m.REF_TIPO), refId: Rep_s_(m.REF_ID), numero: Rep_s_(m.REF_NUMERO), total: 0, ultima: null };
    g.total++;
    if (!g.ultima || Rep_s_(m.EM) >= g.ultima.emIso) g.ultima = Rep_msgPublica_(m);
  });
  if (rid) { var k0 = rid + '|GERAL|' + rid; if (!grupos[k0]) grupos[k0] = { representadaId: rid, representadaNome: Rep_s_((Rep_representada_(rid) || {}).NOME), refTipo: 'GERAL', refId: rid, numero: 'Canal geral', total: 0, ultima: null }; }
  var l = Object.keys(grupos).map(function (k) { return grupos[k]; });
  l.sort(function (a, b) { return String(b.ultima ? b.ultima.emIso : '').localeCompare(String(a.ultima ? a.ultima.emIso : '')); });
  return { conversas: l };
}
function RepI_ref_(d) {
  var tipo = Rep_up_(d && d.refTipo), id = Rep_s_(d && d.refId), rep;
  if (tipo === 'GERAL') { rep = Rep_representada_(id); if (!rep) throw Rep_erro_('NAO_ENCONTRADO', 'Representada não encontrada.'); return { tipo: tipo, id: id, numero: 'Canal geral', repId: id }; }
  var reg = Ast_porId_(tipo === 'SOLICITACAO' ? AST_ABAS.SOLICITACOES : AST_ABAS.CHAMADOS, id);
  if (!reg || !Rep_s_(reg.REPRESENTADA_ID)) throw Rep_erro_('NAO_ENCONTRADO', 'Não foi possível abrir a conversa: o registro não é de uma representada.');
  return { tipo: tipo === 'SOLICITACAO' ? 'SOLICITACAO' : 'CHAMADO', id: id, numero: Rep_s_(reg.NUMERO), repId: Rep_s_(reg.REPRESENTADA_ID), registro: reg };
}
function RepI_mensagens_(eu, d) {
  var r = RepI_ref_(d);
  var l = Rep_ler_(REP_ABAS.MENSAGENS).filter(function (m) { return Rep_s_(m.REPRESENTADA_ID) === r.repId && Rep_up_(m.REF_TIPO) === r.tipo && Rep_s_(m.REF_ID) === r.id; })
    .map(Rep_msgPublica_).sort(function (a, b) { return a.emIso.localeCompare(b.emIso); });
  return { ref: { tipo: r.tipo, id: r.id, numero: r.numero, representadaId: r.repId }, mensagens: l };
}
/** Usuários ativos da representada (para os avisos): quem abriu o pedido e os administradores dela. */
function Rep_usuariosDa_(repId, papeis) {
  return Rep_comContasRep_(function () { return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS); }).filter(function (u) {
    return Rep_up_(u.PERFIL) === 'REPRESENTADA' && Rep_s_(u.REPRESENTADA_ID) === Rep_s_(repId) && Rep_up_(u.STATUS || 'ATIVO') === 'ATIVO' && (!papeis || papeis.indexOf(Rep_up_(u.REPRESENTACAO_PAPEL)) >= 0);
  }).map(function (u) { return Rep_s_(u.ID); });
}
/** Aviso à representada (sistema não tem tela para ela: só e-mail, pela matriz). Nunca lança. */
function Rep_avisarRepresentada_(repId, porId, titulo, texto, refId, evento) {
  try {
    var ids = Rep_usuariosDa_(repId, ['ADMIN']).concat(porId ? [Rep_s_(porId)] : []).filter(function (x, i, l) { return x && l.indexOf(x) === i; });
    if (!ids.length || typeof SGO_notificar_ !== 'function') return 0;
    if (typeof Representacao_registrarTipos_ === 'function') Representacao_registrarTipos_();
    Ast_depois_(function () { Rep_comContasRep_(function () { SGO_notificar_({ usuarios: ids, canais: ['email'], titulo: titulo, texto: texto + '\n\nAbra o SGO+ > Representação para ver o andamento.', origem: 'REPRESENTACAO', categoria: 'REPRESENTACAO', evento: evento, refId: Rep_s_(refId) }); }); });
    return ids.length;
  } catch (e) { return 0; }
}
function RepI_enviarMensagem_(eu, d) {
  var r = RepI_ref_(d), t = Rep_txt_(d && d.texto, 4000), interna = !!(d && d.interna);
  if (t.length < 2) throw Rep_erro_('INCOMPLETO', 'Não foi possível enviar: escreva a mensagem.');
  var m = Rep_gravarMensagem_(eu, r.repId, r, t, interna, d && d.respondeA, Rep_anexoDaMensagem_(d && d.anexo));
  if (!interna) Rep_avisarRepresentada_(r.repId, r.registro ? r.registro.POR_ID || '' : '', 'Mensagem da Metrolabs' + (r.tipo === 'GERAL' ? '' : ': ' + r.numero), eu.nome + ': ' + t.slice(0, 600), r.id, 'RP06');
  return { mensagem: Rep_msgPublica_(m), message: interna ? 'Nota interna gravada (a representada não vê).' : 'Mensagem enviada à representada.' };
}
function RepI_chamado_(eu, d) {
  var c = Ast_porId_(AST_ABAS.CHAMADOS, d && d.id);
  if (!c) throw Rep_erro_('NAO_ENCONTRADO', 'Chamado não encontrado. Atualize a lista.');
  if (!AstC_podeVer_(eu, c)) throw Rep_erro_('NAO_ENCONTRADO', 'Não foi possível abrir: o chamado ' + c.NUMERO + ' não está entre os que você acompanha.');
  if (!Rep_s_(c.REPRESENTADA_ID)) return { representacao: null };
  var sol = Rep_s_(c.SOLICITACAO_ID) ? Ast_porId_(AST_ABAS.SOLICITACOES, c.SOLICITACAO_ID) : null;
  var refs = [['CHAMADO', c.ID]].concat(sol ? [['SOLICITACAO', sol.ID]] : []);
  var anexos = Rep_ler_(REP_ABAS.ANEXOS).filter(function (a) { return refs.some(function (r) { return Rep_up_(a.REF_TIPO) === r[0] && Rep_s_(a.REF_ID) === Rep_s_(r[1]); }); }).map(Rep_anexoPublico_);
  var msgs = Rep_ler_(REP_ABAS.MENSAGENS).filter(function (m) { return refs.some(function (r) { return Rep_up_(m.REF_TIPO) === r[0] && Rep_s_(m.REF_ID) === Rep_s_(r[1]); }); }).map(Rep_msgPublica_).sort(function (a, b) { return a.emIso.localeCompare(b.emIso); });
  var et = Rep_etapaChamado_(c);
  return { representacao: { representadaId: Rep_s_(c.REPRESENTADA_ID), representadaNome: Rep_s_(c.REPRESENTADA_NOME), protocolo: Rep_s_(c.PROTOCOLO_REPRESENTADA), enquadramento: REP_ENQUADRAMENTO[Rep_up_(c.ENQUADRAMENTO_PRETENDIDO)] || '',
    etapaRepresentada: et.nome, solicitacao: sol ? { id: Rep_s_(sol.ID), numero: Rep_s_(sol.NUMERO), relato: Rep_json_(sol.RELATO_JSON, {}), setor: Rep_s_(sol.SETOR), contatoNome: Rep_s_(sol.CONTATO_NOME),
      contatoTelefone: Rep_s_(sol.CONTATO_TELEFONE), contatoEmail: Rep_s_(sol.CONTATO_EMAIL), por: Rep_s_(sol.POR_NOME) } : null, anexos: anexos, mensagens: msgs } };
}
function RepI_acessos_(eu, d) {
  RepI_exigirAdm_(eu, 'ver o registro das ações das representadas');
  var rid = Rep_s_(d && d.representadaId);
  return { acessos: Rep_ler_(REP_ABAS.ACESSOS).filter(function (a) { return !rid || Rep_s_(a.REPRESENTADA_ID) === rid; }).slice(-300).reverse()
    .map(function (a) { return { representada: Rep_s_((Rep_representada_(a.REPRESENTADA_ID) || {}).NOME), quem: Rep_s_(a.USUARIO_NOME), email: Rep_s_(a.EMAIL), acao: Rep_s_(a.ACAO), detalhe: Rep_s_(a.DETALHE), em: Rep_br_(a.EM) }; }) };
}
function RepI_usuarios_(eu, d) {
  var rid = Rep_s_(d && d.representadaId);
  return { usuarios: Rep_comContasRep_(function () { return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS); }).filter(function (u) { return Rep_up_(u.PERFIL) === 'REPRESENTADA' && (!rid || Rep_s_(u.REPRESENTADA_ID) === rid); })
    .map(function (u) { var p = Rep_up_(u.REPRESENTACAO_PAPEL); return { id: Rep_s_(u.ID), nome: Rep_s_(u.NOME), login: Rep_s_(u.USUARIO), email: Rep_s_(u.EMAIL), papel: (REP_PAPEIS[p] || REP_PAPEIS.LEITURA).nome,
      representada: Rep_s_((Rep_representada_(u.REPRESENTADA_ID) || {}).NOME), situacao: Rep_up_(u.STATUS || 'ATIVO') }; }),
    message: 'Os acessos da representada são criados e inativados em Administração > Usuários (perfil "Representada", com a representada e o papel).' };
}

var REP_ACOES_INTERNAS = {
  iniciar: RepI_iniciar_, salvarRepresentada: RepI_salvarRepresentada_, representadas: function () { return { representadas: RepI_representadas_() }; },
  modelos: function (eu, d) { return { modelos: Rep_modelosDe_(d && d.representadaId, true) }; }, salvarModelo: RepI_salvarModelo_,
  solicitacoes: RepI_solicitacoes_, aceitar: RepI_aceitar_,
  complemento: function (eu, d) { return AstC_complemento_(eu, d); }, recusar: function (eu, d) { return AstC_descartar_(eu, d); },
  conversas: RepI_conversas_, mensagens: RepI_mensagens_, enviarMensagem: RepI_enviarMensagem_, chamado: RepI_chamado_, acessos: RepI_acessos_, usuarios: RepI_usuarios_,
  ajuda: function () { return { ajuda: Rep_ajuda_('representacao') }; }
};

/** google.script.run: Representacao_api(sessionId, acao, dados). Nunca lança. */
function Representacao_api(sessionId, acao, dados) {
  var antes = SGO_REP_MODULO;
  SGO_REP_MODULO = true;
  try {
    Ast_memoLimpar_(); Rep_memoLimpar_();
    acao = Rep_s_(acao);
    var eu = Rep_eu_(sessionId);
    var mapa = eu.externo ? REP_ACOES_REPRESENTADA : REP_ACOES_INTERNAS;
    if (!Object.prototype.hasOwnProperty.call(mapa, acao)) return { ok: false, message: 'Ação do módulo Representação desconhecida (' + acao + '). Atualize a página (F5) e tente de novo.' };
    if (!eu.externo) Ast_exigir_(eu, 'INTERNO', 'abrir o módulo Representação');
    try { Rep_garantirAbas_(); Ast_garantirAbas_(); } catch (e0) {}
    var r = mapa[acao](eu, dados || {});
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r || {})));
  } catch (e) {
    var m = String((e && e.message) || e).replace(/[.\s]+$/, '');
    return { ok: false, codigo: (e && e.codigoRep) || '', faltam: (e && e.faltam) || undefined, message: (/^Não |^Sessão|^Muitas|^Acesso/.test(m) ? m : 'Não foi possível concluir: ' + m) + '.' };
  } finally { SGO_REP_MODULO = antes; }
}

/**
 * Servidor próprio (rota /arquivos/:id): a sessão REPRESENTADA só abre arquivo que é anexo da própria representada e que
 * ela pode ver (REP_ANEXOS.PUBLICO = REPRESENTADA). Nome com "_": o navegador não chama; só o servidor. Nunca lança.
 */
function Representacao_arquivoPermitido_(sessionId, arquivoId) {
  var antes = SGO_REP_MODULO;
  SGO_REP_MODULO = true;
  try {
    Rep_memoLimpar_(); Ast_memoLimpar_();
    var eu = Rep_eu_(sessionId);
    if (!eu.externo) return false;
    var id = Rep_s_(arquivoId);
    return !!id && Rep_escopo_(eu).anexos().some(function (a) { return Rep_s_(a.ARQUIVO_ID) === id; });
  } catch (e) { return false; } finally { SGO_REP_MODULO = antes; }
}
