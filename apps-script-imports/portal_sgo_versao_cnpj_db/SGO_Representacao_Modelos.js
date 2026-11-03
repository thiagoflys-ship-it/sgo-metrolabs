/****************************************************
 * MÓDULO REPRESENTAÇÃO — CATÁLOGO DE MODELOS PELA REPRESENTADA (03/11/2026)
 *
 * Pedido do dono (03/11/2026): a representada cadastra os próprios modelos. Antes só a Metrolabs incluía modelos no
 * catálogo (Representação > Catálogo de modelos) e a representada, sem o modelo na lista, ficava parada pedindo pela conversa.
 *
 * Regras:
 *  - Quem pode: o papel da representada que abre pedido (Administrador da representada e Atendente; REP_PAPEIS.abrir).
 *    Cadastro na abertura do pedido (o modelo novo já fica escolhido) e na aba "Catálogo de modelos" do lado dela.
 *  - Isolamento: a representada só lê e altera os modelos da própria representada (REPRESENTADA_ID da sessão). Modelo de outra
 *    representada recebe a mesma resposta de "não encontrado" que um modelo que não existe.
 *  - Código único por representada (ativos e inativos). O código de um modelo que já está em equipamento não muda.
 *  - Excluir: sem nenhum equipamento com o modelo, sai do catálogo; com equipamento, vira INATIVO (some da lista de escolha,
 *    mantém o histórico e as garantias). Inativo pode ser reativado.
 *  - Garantia: o equipamento grava GARANTIA_MESES e GARANTIA_ATE no cadastro (RepA_cadastrarEquipamento_) e a leitura
 *    (Rep_garantia_) usa só o que está gravado no equipamento. Mudar a garantia do modelo vale para os equipamentos
 *    cadastrados depois; os que já existem mantêm a garantia deles (nada é recalculado).
 *  - Histórico (REP_MODELOS_HIST, só inclusão): quem cadastrou, alterou, inativou, reativou ou excluiu, de que lado
 *    (REPRESENTADA ou METROLABS), quando, o antes e o depois de cada campo e o motivo. A Metrolabs vê "cadastrado por Fulano
 *    (Brasmedical)". A Metrolabs continua alterando pelo lado interno, com motivo obrigatório na alteração.
 *  - Tudo pela entrada única do módulo (Representacao_api, ações já roteadas): nada muda na lista fechada de funções do
 *    perfil REPRESENTADA no servidor próprio.
 * Nenhuma função devolve Date cru.
 ****************************************************/

var REP_MODELO_ACOES = { CRIAR: 'Cadastrou', ALTERAR: 'Alterou', INATIVAR: 'Inativou', REATIVAR: 'Reativou', EXCLUIR: 'Excluiu' };
var REP_MODELO_CAMPOS = [['CODIGO', 'Código'], ['NOME', 'Nome'], ['TIPO_EQUIPAMENTO', 'Tipo de equipamento'], ['FAMILIA', 'Família'], ['GARANTIA_MESES', 'Garantia (meses)'],
  ['PADRAO_SERIE', 'Padrão da série'], ['ATIVO', 'Situação']];
var REP_MODELO_EXPLICA = {
  excluir: 'Excluir: se nenhum equipamento usa o modelo, ele sai do catálogo. Se algum equipamento já usa, o modelo fica INATIVO: some da lista de escolha do pedido, mas o histórico e a garantia dos equipamentos continuam guardados. Um modelo inativo pode ser reativado.',
  garantia: 'Mudar a garantia vale para os equipamentos cadastrados daqui em diante. Os equipamentos já cadastrados mantêm a garantia gravada no cadastro deles.',
  codigo: 'O código é único na sua empresa e não muda depois que algum equipamento usa o modelo.'
};

/** Quem fez, com o lado: a representada aparece como "Fulano (Empresa)"; a Metrolabs, pelo nome. */
function RepM_quem_(eu) { return eu.externo ? { lado: 'REPRESENTADA', id: Rep_s_(eu.id), nome: Rep_quem_(eu) } : { lado: 'METROLABS', id: Rep_s_(eu.id), nome: Rep_s_(eu.nome) }; }
function RepM_porNome_(lado, nome) { return Rep_s_(nome) ? (Rep_up_(lado) === 'METROLABS' && !/\(Metrolabs\)$/.test(Rep_s_(nome)) ? Rep_s_(nome) + ' (Metrolabs)' : Rep_s_(nome)) : ''; }

/** Modelos da representada (linhas da tabela, ativos e inativos). */
function RepM_linhas_(repId) { return Rep_ler_(REP_ABAS.MODELOS).filter(function (m) { return Rep_s_(m.REPRESENTADA_ID) === Rep_s_(repId) && Rep_s_(repId); }); }
/** Modelo pelo ID dentro da representada; de outra representada ou inexistente: a mesma resposta. */
function RepM_doEscopo_(repId, id) {
  var m = Rep_s_(id) ? Rep_porId_(REP_ABAS.MODELOS, id) : null;
  if (!m || Rep_s_(m.REPRESENTADA_ID) !== Rep_s_(repId)) throw Rep_erro_('NAO_ENCONTRADO', 'Não encontramos este modelo no catálogo da sua empresa. Atualize a tela; se o modelo foi excluído, cadastre de novo.');
  return m;
}
/** Quantos equipamentos (ativos ou não) usam o modelo: os cadastrados pela representada com o código do modelo. */
function RepM_usos_(repId, codigo) {
  var cod = Rep_up_(codigo);
  if (!cod) return 0;
  return Rep_lerAst_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) { return Rep_s_(e.ORIGEM_REPRESENTADA_ID) === Rep_s_(repId) && Rep_up_(e.MODELO_CODIGO) === cod; }).length;
}
function RepM_campos_(m) { var o = {}; REP_MODELO_CAMPOS.forEach(function (c) { o[c[0]] = c[0] === 'GARANTIA_MESES' ? (Number(m[c[0]]) || 0) : c[0] === 'ATIVO' ? (Rep_up_(m.ATIVO || 'SIM') === 'NAO' ? 'NAO' : 'SIM') : Rep_s_(m[c[0]]); }); return o; }
function RepM_valorTela_(campo, v) { return campo === 'ATIVO' ? (v === 'NAO' ? 'Inativo' : 'Ativo') : campo === 'GARANTIA_MESES' ? v + ' meses' : (Rep_s_(v) || '(vazio)'); }
function RepM_hist_(m, acao, quem, antes, depois, motivo) {
  try {
    Rep_inserir_(REP_ABAS.MODELOS_HIST, { REPRESENTADA_ID: Rep_s_(m.REPRESENTADA_ID), MODELO_ID: Rep_s_(m.ID), CODIGO: Rep_up_(m.CODIGO), ACAO: acao, LADO: quem.lado, POR_ID: quem.id, POR_NOME: quem.nome,
      ANTES_JSON: antes ? JSON.stringify(antes) : '', DEPOIS_JSON: depois ? JSON.stringify(depois) : '', MOTIVO: Rep_txt_(motivo, 500), EM: Rep_agora_() });
  } catch (e) { try { console.error('Representação, histórico do modelo: ' + ((e && e.message) || e)); } catch (x) {} }
}
function RepM_histPublico_(h) {
  var antes = Rep_json_(h.ANTES_JSON, {}) || {}, depois = Rep_json_(h.DEPOIS_JSON, {}) || {}, mud = [];
  REP_MODELO_CAMPOS.forEach(function (c) {
    var a = antes[c[0]], d = depois[c[0]];
    if (Rep_up_(h.ACAO) === 'CRIAR' || Rep_up_(h.ACAO) === 'EXCLUIR') return;
    if (String(a === undefined ? '' : a) !== String(d === undefined ? '' : d)) mud.push({ campo: c[1], de: RepM_valorTela_(c[0], a === undefined ? '' : a), para: RepM_valorTela_(c[0], d === undefined ? '' : d) });
  });
  return { acao: Rep_up_(h.ACAO), acaoNome: REP_MODELO_ACOES[Rep_up_(h.ACAO)] || Rep_s_(h.ACAO), lado: Rep_up_(h.LADO), por: RepM_porNome_(h.LADO, h.POR_NOME), em: Rep_br_(h.EM), emIso: Rep_s_(h.EM),
    mudancas: mud, motivo: Rep_s_(h.MOTIVO) };
}
function RepM_historico_(modeloId) {
  return Rep_ler_(REP_ABAS.MODELOS_HIST).filter(function (h) { return Rep_s_(h.MODELO_ID) === Rep_s_(modeloId); }).map(RepM_histPublico_)
    .sort(function (a, b) { return b.emIso.localeCompare(a.emIso); });
}
function RepM_publico_(m) {
  var ativo = Rep_up_(m.ATIVO || 'SIM') !== 'NAO', usos = RepM_usos_(m.REPRESENTADA_ID, m.CODIGO);
  var hist = RepM_historico_(m.ID), cri = hist.filter(function (h) { return h.acao === 'CRIAR'; }).slice(-1)[0];
  return { id: Rep_s_(m.ID), codigo: Rep_up_(m.CODIGO), nome: Rep_s_(m.NOME), tipo: Rep_s_(m.TIPO_EQUIPAMENTO), familia: Rep_s_(m.FAMILIA), garantiaMeses: Number(m.GARANTIA_MESES) || 0,
    padraoSerie: Rep_s_(m.PADRAO_SERIE), ativo: ativo, situacao: ativo ? 'Ativo' : 'Inativo', usos: usos,
    criadoPor: RepM_porNome_(m.CRIADO_POR_LADO, m.CRIADO_POR_NOME) || (cri ? cri.por : '') || 'Metrolabs (antes do histórico)', criadoLado: Rep_up_(m.CRIADO_POR_LADO) || (cri ? cri.lado : 'METROLABS'),
    criadoEm: Rep_br_(m.CRIADO_EM), atualizadoPor: RepM_porNome_(m.ATUALIZADO_POR_LADO || 'METROLABS', m.ATUALIZADO_POR_NOME), atualizadoEm: Rep_br_(m.ATUALIZADO_EM),
    inativadoEm: Rep_br_(m.INATIVADO_EM), inativadoPor: Rep_s_(m.INATIVADO_POR_NOME), historico: hist };
}
/** Modelos excluídos da representada (a linha "Excluiu" do histórico guarda os dados de antes), mais recentes primeiro. */
function RepM_excluidos_(repId) {
  return Rep_ler_(REP_ABAS.MODELOS_HIST).filter(function (h) { return Rep_s_(h.REPRESENTADA_ID) === Rep_s_(repId) && Rep_s_(repId) && Rep_up_(h.ACAO) === 'EXCLUIR'; })
    .map(function (h) { var a = Rep_json_(h.ANTES_JSON, {}) || {}, p = RepM_histPublico_(h);
      return { codigo: Rep_up_(a.CODIGO || h.CODIGO), nome: Rep_s_(a.NOME), tipo: Rep_s_(a.TIPO_EQUIPAMENTO), garantiaMeses: Number(a.GARANTIA_MESES) || 0, por: p.por, lado: p.lado, em: p.em, emIso: p.emIso, motivo: p.motivo,
        historico: RepM_historico_(h.MODELO_ID) }; })
    .sort(function (a, b) { return b.emIso.localeCompare(a.emIso); });
}
/** Catálogo completo da representada (ativos primeiro, depois inativos), com uso e histórico. */
function RepM_lista_(repId) {
  return RepM_linhas_(repId).map(RepM_publico_).sort(function (a, b) { return (b.ativo - a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'); });
}

/** Confere os campos (os mesmos dos dois lados). Devolve os campos normalizados; faltas vão em `faltam`. */
function RepM_validar_(d, faltam) {
  var cod = Rep_up_(d.codigo).replace(/\s+/g, ''), nome = Rep_txt_(d.nome, 120), tipo = Rep_txt_(d.tipo, 80), g = Number(String(d.garantiaMeses === undefined || d.garantiaMeses === null ? '' : d.garantiaMeses).replace(',', '.'));
  if (cod.length < 2) Rep_campoFalta_(faltam, 'codigo', 'informe o código do modelo (pelo menos 2 letras ou números, como está no catálogo do fabricante ou na etiqueta)');
  else if (!/^[A-Z0-9._\/-]{2,40}$/.test(cod)) Rep_campoFalta_(faltam, 'codigo', 'o código aceita só letras, números, ponto, traço, barra e sublinhado (até 40)');
  if (nome.length < 2) Rep_campoFalta_(faltam, 'nome', 'informe o nome do modelo');
  if (tipo.length < 3) Rep_campoFalta_(faltam, 'tipo', 'informe o tipo de equipamento (ex.: Autoclave, Lavadora ultrassônica)');
  if (Rep_s_(d.garantiaMeses) === '' || !(g >= 0 && g <= 120 && Math.round(g) === g)) Rep_campoFalta_(faltam, 'garantiaMeses', 'garantia em meses inteiros, de 0 a 120 (0 = sem garantia)');
  var pad = Rep_txt_(d.padraoSerie, 120);
  if (pad) { try { new RegExp(pad); } catch (e) { Rep_campoFalta_(faltam, 'padraoSerie', 'o padrão da série não é válido; deixe em branco se não souber'); } }
  return { CODIGO: cod, NOME: nome, TIPO_EQUIPAMENTO: tipo, FAMILIA: Rep_txt_(d.familia, 80), GARANTIA_MESES: g, PADRAO_SERIE: pad };
}

/**
 * Cadastro e alteração (os dois lados). eu: quem está usando; repId: representada; d: { id?, codigo, nome, tipo, familia,
 * garantiaMeses, padraoSerie, motivo?, ativo? (só a Metrolabs) }. opcoes: { porCodigo: true } = sem id, o mesmo código altera
 * (compatível com a tela interna antiga). Devolve { modelo, novo, mudou, usos }.
 */
function RepM_salvar_(eu, repId, d, opcoes) {
  d = d || {}; opcoes = opcoes || {};
  var faltam = [], quem = RepM_quem_(eu), interno = !eu.externo;
  var campos = RepM_validar_(d, faltam);
  // revisão 03/11/2026: a conferência do código único e a gravação ficam dentro da trava da Assistência (dois cadastros ao
  // mesmo tempo não gravam o mesmo código); a tabela é lida de novo dentro da trava
  return Ast_comTrava_(function () {
  delete REP_MEMO[REP_ABAS.MODELOS];
  var linhas = RepM_linhas_(repId), atual = null;
  if (Rep_s_(d.id)) atual = RepM_doEscopo_(repId, d.id);
  else if (opcoes.porCodigo && campos.CODIGO) atual = linhas.filter(function (m) { return Rep_up_(m.CODIGO) === campos.CODIGO; })[0] || null;
  if (interno && Rep_s_(d.ativo) !== '') campos.ATIVO = d.ativo === false || Rep_up_(d.ativo) === 'NAO' ? 'NAO' : 'SIM';
  var motivo = Rep_txt_(d.motivo, 500);
  if (atual && interno && motivo.length < 10) Rep_campoFalta_(faltam, 'motivo', 'escreva o motivo da alteração (pelo menos 10 letras); ele fica no histórico do modelo e a representada vê');
  Rep_falhou_(faltam, atual ? 'alterar o modelo' : 'cadastrar o modelo');
  var igual = linhas.filter(function (m) { return Rep_up_(m.CODIGO) === campos.CODIGO && (!atual || Rep_s_(m.ID) !== Rep_s_(atual.ID)); })[0];
  if (igual) {
    var e = Rep_erro_('DUPLICADO', 'Não foi possível salvar: já existe o modelo ' + Rep_s_(igual.NOME) + ' com o código ' + campos.CODIGO + (Rep_up_(igual.ATIVO || 'SIM') === 'NAO' ? ' (inativo). Reative esse modelo no Catálogo de modelos em vez de cadastrar de novo' : '. Escolha esse modelo na lista ou use outro código') + '. Nada foi gravado.');
    e.faltam = [{ campo: 'codigo', texto: 'Código já usado na sua empresa.' }]; throw e;
  }
  var usos = atual ? RepM_usos_(repId, atual.CODIGO) : 0;
  if (atual && usos && Rep_up_(atual.CODIGO) !== campos.CODIGO) {
    var e2 = Rep_erro_('CODIGO_EM_USO', 'Não foi possível alterar: o código ' + Rep_up_(atual.CODIGO) + ' já está em ' + usos + ' equipamento' + (usos > 1 ? 's' : '') + ' e não muda. Mantenha o código e altere os outros campos; se o código estava errado, cadastre um modelo novo com o código certo e inative este. Nada foi gravado.');
    e2.faltam = [{ campo: 'codigo', texto: 'O código não muda depois de usado.' }]; throw e2;
  }
  var agora = Rep_agora_();
  if (!atual) {
    var novo = Rep_inserir_(REP_ABAS.MODELOS, Object.assign({ REPRESENTADA_ID: Rep_s_(repId), ATIVO: campos.ATIVO || 'SIM', CRIADO_POR_LADO: quem.lado, CRIADO_POR_ID: quem.id, CRIADO_POR_NOME: quem.nome,
      ATUALIZADO_POR_LADO: quem.lado, ATUALIZADO_POR_ID: quem.id, ATUALIZADO_POR_NOME: quem.nome, ATUALIZADO_EM: agora }, campos));
    RepM_hist_(novo, 'CRIAR', quem, null, RepM_campos_(novo), motivo);
    return { modelo: novo, novo: true, mudou: true, usos: 0 };
  }
  var antes = RepM_campos_(atual), depois = RepM_campos_(Object.assign({}, atual, campos));
  var mudou = REP_MODELO_CAMPOS.some(function (c) { return String(antes[c[0]]) !== String(depois[c[0]]); });
  if (!mudou) return { modelo: atual, novo: false, mudou: false, usos: usos };
  var extra = { ATUALIZADO_POR_LADO: quem.lado, ATUALIZADO_POR_ID: quem.id, ATUALIZADO_POR_NOME: quem.nome, ATUALIZADO_EM: agora };
  if (antes.ATIVO !== depois.ATIVO) { extra.INATIVADO_EM = depois.ATIVO === 'NAO' ? agora : ''; extra.INATIVADO_POR_NOME = depois.ATIVO === 'NAO' ? quem.nome : ''; }
  Rep_atualizar_(REP_ABAS.MODELOS, atual.ID, Object.assign({}, campos, extra));
  var acao = antes.ATIVO !== depois.ATIVO && REP_MODELO_CAMPOS.every(function (c) { return c[0] === 'ATIVO' || String(antes[c[0]]) === String(depois[c[0]]); }) ? (depois.ATIVO === 'NAO' ? 'INATIVAR' : 'REATIVAR') : 'ALTERAR';
  RepM_hist_(atual, acao, quem, antes, depois, motivo);
  return { modelo: Object.assign({}, atual, campos, extra), novo: false, mudou: true, usos: usos, garantiaMudou: antes.GARANTIA_MESES !== depois.GARANTIA_MESES };
  });
}
function RepM_msgSalvo_(r) {
  var m = r.modelo, nome = Rep_s_(m.NOME);
  if (!r.mudou) return 'Nada mudou no modelo ' + nome + ': os dados enviados são iguais aos gravados.';
  if (r.novo) return 'Modelo ' + nome + ' (' + Rep_up_(m.CODIGO) + ') cadastrado no catálogo.';
  return 'Modelo ' + nome + ' alterado.' + (r.garantiaMudou ? ' ' + REP_MODELO_EXPLICA.garantia + (r.usos ? ' (' + r.usos + ' equipamento' + (r.usos > 1 ? 's' : '') + ' com a garantia de antes.)' : '') : '');
}

/** Exclui (sem uso) ou inativa (com uso). Devolve { excluido, inativado, message }. */
function RepM_excluir_(eu, repId, d) {
  return Ast_comTrava_(function () {
  delete REP_MEMO[REP_ABAS.MODELOS];
  var m = RepM_doEscopo_(repId, d && d.id), quem = RepM_quem_(eu), usos = RepM_usos_(repId, m.CODIGO), nome = Rep_s_(m.NOME);
  if (!usos) {
    // revisão 03/11/2026: o "Excluiu" vai para o histórico só depois que o modelo saiu da tabela
    var saiu = false;
    try { saiu = SGO_DATA.remove(REP_ABAS.MODELOS, m.ID) !== false; } catch (e) { saiu = false; }
    delete REP_MEMO[REP_ABAS.MODELOS];
    if (!saiu) throw Rep_erro_('FALHOU', 'Não foi possível excluir o modelo ' + nome + ' agora (o registro não foi encontrado na tabela). Nada mudou no catálogo. Atualize a tela e tente de novo.');
    RepM_hist_(m, 'EXCLUIR', quem, RepM_campos_(m), null, Rep_txt_(d && d.motivo, 500));
    return { excluido: true, message: 'Modelo ' + nome + ' excluído do catálogo: nenhum equipamento usava este modelo. O registro da exclusão fica em "Excluídos do catálogo".' };
  }
  if (Rep_up_(m.ATIVO || 'SIM') === 'NAO') return { inativado: true, message: 'O modelo ' + nome + ' já estava inativo (' + usos + ' equipamento' + (usos > 1 ? 's usam' : ' usa') + ' este modelo, por isso ele não sai do catálogo).' };
  var agora = Rep_agora_();
  Rep_atualizar_(REP_ABAS.MODELOS, m.ID, { ATIVO: 'NAO', INATIVADO_EM: agora, INATIVADO_POR_NOME: quem.nome, ATUALIZADO_POR_LADO: quem.lado, ATUALIZADO_POR_ID: quem.id, ATUALIZADO_POR_NOME: quem.nome, ATUALIZADO_EM: agora });
  RepM_hist_(m, 'INATIVAR', quem, RepM_campos_(m), RepM_campos_(Object.assign({}, m, { ATIVO: 'NAO' })), Rep_txt_(d && d.motivo, 500));
  return { inativado: true, message: 'O modelo ' + nome + ' ficou INATIVO: ' + usos + ' equipamento' + (usos > 1 ? 's já usam' : ' já usa') + ' este modelo, então ele não pode sair do catálogo. Ele some da lista de escolha do pedido; o histórico e a garantia dos equipamentos continuam guardados. Para voltar a usar, toque em "Reativar".' };
  });
}
function RepM_reativar_(eu, repId, d) {
  var m = RepM_doEscopo_(repId, d && d.id), quem = RepM_quem_(eu);
  if (Rep_up_(m.ATIVO || 'SIM') !== 'NAO') return { message: 'O modelo ' + Rep_s_(m.NOME) + ' já está ativo.' };
  var agora = Rep_agora_();
  Rep_atualizar_(REP_ABAS.MODELOS, m.ID, { ATIVO: 'SIM', INATIVADO_EM: '', INATIVADO_POR_NOME: '', ATUALIZADO_POR_LADO: quem.lado, ATUALIZADO_POR_ID: quem.id, ATUALIZADO_POR_NOME: quem.nome, ATUALIZADO_EM: agora });
  RepM_hist_(m, 'REATIVAR', quem, RepM_campos_(m), RepM_campos_(Object.assign({}, m, { ATIVO: 'SIM' })), Rep_txt_(d && d.motivo, 500));
  return { message: 'Modelo ' + Rep_s_(m.NOME) + ' reativado: volta a aparecer na lista de escolha do pedido.' };
}

// ------------------------------------------------------------
// AÇÕES DA REPRESENTADA (entram em REP_ACOES_REPRESENTADA, SGO_Representacao.js)
// ------------------------------------------------------------
function RepA_catalogo_(eu) {
  return { modelos: RepM_lista_(eu.repId), excluidos: RepM_excluidos_(eu.repId), podeEditar: !!(eu.perm && eu.perm.abrir), explica: REP_MODELO_EXPLICA,
    message: eu.perm && eu.perm.abrir ? '' : 'Consulta: o seu papel (' + eu.perm.nome + ') não cadastra modelos. Quem cadastra é o Administrador da sua empresa no sistema ou o Atendente.' };
}
function RepA_salvarModelo_(eu, d) {
  Rep_exigirPerm_(eu, 'abrir', Rep_s_(d && d.id) ? 'alterar o modelo' : 'cadastrar o modelo');
  var r = RepM_salvar_(eu, eu.repId, d || {}, {});
  if (r.mudou) Rep_acesso_(r.novo ? 'MODELO_CADASTRO' : 'MODELO_ALTERACAO', eu, d && d.ctx, Rep_s_(r.modelo.NOME) + ' (' + Rep_up_(r.modelo.CODIGO) + ')');
  return { modelo: RepM_publico_(r.modelo), modelos: Rep_modelosDe_(eu.repId), message: RepM_msgSalvo_(r) };
}
function RepA_excluirModelo_(eu, d) {
  Rep_exigirPerm_(eu, 'abrir', 'excluir o modelo');
  var r = RepM_excluir_(eu, eu.repId, d || {});
  Rep_acesso_(r.excluido ? 'MODELO_EXCLUSAO' : 'MODELO_INATIVACAO', eu, d && d.ctx, r.message.slice(0, 200));
  return { excluido: !!r.excluido, inativado: !!r.inativado, modelos: Rep_modelosDe_(eu.repId), message: r.message };
}
function RepA_reativarModelo_(eu, d) {
  Rep_exigirPerm_(eu, 'abrir', 'reativar o modelo');
  var r = RepM_reativar_(eu, eu.repId, d || {});
  Rep_acesso_('MODELO_REATIVACAO', eu, d && d.ctx, r.message.slice(0, 200));
  return { modelos: Rep_modelosDe_(eu.repId), message: r.message };
}
