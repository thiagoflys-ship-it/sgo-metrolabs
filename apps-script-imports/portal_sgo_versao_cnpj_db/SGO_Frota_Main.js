/****************************************************
 * FROTA — BACKEND PRINCIPAL
 *
 * Controle de frota de veículos: cadastro de veículos/condutores,
 * movimentação (retirada/devolução com checklist + fotos), manutenção
 * (com alerta de vencimento por KM/data), despesas e paradas.
 *
 * 6 tabelas próprias, criadas sob demanda (Frota_garantirTabela_,
 * idempotente — NUNCA usar setupSGO() pra provisionar isso numa base já
 * em produção, ele limpa todas as abas que gerencia, mesmo cuidado do
 * Certificado de Calibração).
 ****************************************************/

function Frota_apiDispatch(req) {
  req = req || {};
  exigirSessao(String(req.sessionId || ''));
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};

  var allow = {
    apiPing: Frota_apiPing,
    apiContextoOperacional: Frota_apiContextoOperacional,
    apiSituacaoFrota: Frota_apiSituacaoFrota,
    apiListarVeiculosAtivos: Frota_apiListarVeiculosAtivos,
    apiListarVeiculosTodos: Frota_apiListarVeiculosTodos,
    apiCriarVeiculo: Frota_apiCriarVeiculo,
    apiAtualizarVeiculo: Frota_apiAtualizarVeiculo,
    apiInativarVeiculo: Frota_apiInativarVeiculo,
    apiReativarVeiculo: Frota_apiReativarVeiculo,
    apiListarCondutoresAtivos: Frota_apiListarCondutoresAtivos,
    apiListarCondutoresTodos: Frota_apiListarCondutoresTodos,
    apiCriarCondutor: Frota_apiCriarCondutor,
    apiListarUsuariosParaVinculo: Frota_apiListarUsuariosParaVinculo,
    apiUploadCnh: Frota_apiUploadCnh,
    apiInativarCondutor: Frota_apiInativarCondutor,
    apiReativarCondutor: Frota_apiReativarCondutor,
    apiListarViagensEmAndamento: Frota_apiListarViagensEmAndamento,
    apiIniciarViagem: Frota_apiIniciarViagem,
    apiFinalizarViagem: Frota_apiFinalizarViagem,
    apiRegistrarManutencao: Frota_apiRegistrarManutencao,
    apiRegistrarDespesa: Frota_apiRegistrarDespesa,
    apiRegistrarParada: Frota_apiRegistrarParada,
    apiHistoricoVeiculo: Frota_apiHistoricoVeiculo,
    apiListarAlertasManutencao: Frota_apiListarAlertasManutencao,
    apiListarDocumentos: Frota_apiListarDocumentos,
    apiUploadDocumento: Frota_apiUploadDocumento,
    apiExcluirDocumento: Frota_apiExcluirDocumento,
    apiListarMultas: Frota_apiListarMultas,
    apiRegistrarMulta: Frota_apiRegistrarMulta,
    apiRecruzarMulta: Frota_apiRecruzarMulta,
    apiIndicarCondutorMulta: Frota_apiIndicarCondutorMulta,
    apiAtualizarStatusMulta: Frota_apiAtualizarStatusMulta,
    apiExcluirMulta: Frota_apiExcluirMulta,
    apiGerarRelatorio: Frota_apiGerarRelatorio,
    apiListarAbastecimentos: Frota_apiListarAbastecimentos,
    apiRegistrarAbastecimento: Frota_apiRegistrarAbastecimento,
    apiExcluirAbastecimento: Frota_apiExcluirAbastecimento,
    apiVerificarNovosEventos: Frota_apiVerificarNovosEventos,
    apiUploadFotoVeiculo: Frota_apiUploadFotoVeiculo,
    apiDiagLogTempoCliente: Frota_apiDiagLogTempoCliente
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  return allow[fn](req.sessionId, payload);
}

/**
 * Trava de perfil pra tudo que é cadastro/alteração/criação de dado
 * mestre (veículo, condutor, manutenção, despesa, parada) — só
 * ADMIN/DIRETORIA/GESTOR (mesma lista de `isAdminPerfilAuth_` em
 * SGO_Auth.js). Retirada/devolução (uso do dia a dia) fica de fora
 * dessa trava de propósito — é o "básico" que qualquer perfil de staff
 * (não-CLIENTE) precisa conseguir fazer, inclusive no celular.
 */
function Frota_exigirGestor_(sessionId) {
  if (!isAdminSession(sessionId)) {
    throw new Error('Acesso restrito a Gestor/Administrador — esta ação não está disponível para o seu perfil.');
  }
}


// A identidade vem da sessão validada, nunca do nome exibido no formulário.
function Frota_apiContextoOperacional(sessionId) {
  var sessao = exigirSessao(sessionId);
  Frota_bootstrap_();
  var gestor = isAdminSession(sessionId);
  var condutor = Frota_obterCondutorPorUsuario_(sessao.userId);
  var ativos = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).filter(function(c) {
    return SGO_UTILS.safeUpper(c.STATUS) !== 'INATIVO';
  });
  return { ok: true, gestor: gestor, condutor: condutor ? { id: condutor.ID, nome: condutor.NOME } : null,
    condutores: (gestor ? ativos : (condutor ? [condutor] : [])).map(function(c) { return { id: c.ID, nome: c.NOME }; }) };
}

function Frota_resolverCondutorRetirada_(sessionId, payload) {
  var sessao = exigirSessao(sessionId);
  var vinculado = Frota_obterCondutorPorUsuario_(sessao.userId);
  var id = isAdminSession(sessionId) ? (SGO_UTILS.safe(payload.condutorId) || (vinculado && vinculado.ID)) : (vinculado && vinculado.ID);
  if (!id) throw new Error('Seu login não possui condutor vinculado. Peça ao gestor para vincular seu usuário ou selecionar um condutor autorizado.');
  var condutor = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, id);
  if (!condutor || SGO_UTILS.safeUpper(condutor.STATUS) === 'INATIVO') throw new Error('Condutor não encontrado ou inativo. Atualize a seleção.');
  return condutor;
}

function Frota_movimentoAberto_(m) {
  return SGO_UTILS.safeUpper(m.STATUS) === 'EM_ANDAMENTO';
}

function Frota_veiculosComSituacao_() {
  var abertos = {};
  var condutores = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });
  SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).filter(Frota_movimentoAberto_).forEach(function(m) {
    abertos[SGO_UTILS.safe(m.VEICULO_ID)] = m;
  });
  return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).map(function(v) {
    var m = abertos[SGO_UTILS.safe(v.ID)];
    var status = SGO_UTILS.safeUpper(v.STATUS);
    var situacao = m ? 'EM_USO' : (status === 'ATIVO' || status === 'DISPONIVEL' ? 'DISPONIVEL' : status || 'INDISPONIVEL');
    var c = m && condutores[SGO_UTILS.safe(m.CONDUTOR_ID)];
    return Object.assign({}, v, { STATUS: m ? 'EM_USO' : status, SITUACAO: situacao,
      CONDUTOR_NOME: m ? (c && c.NOME || 'Condutor não localizado') : '',
      MOVIMENTACAO_ID: m ? m.ID : '', DATA_SAIDA: m ? m.DATA_SAIDA : '', HORA_SAIDA: m ? m.HORA_SAIDA : '',
      KM_SAIDA: m ? m.KM_SAIDA : '', FINALIDADE: m ? m.FINALIDADE : '' });
  });
}

function Frota_apiSituacaoFrota(sessionId) {
  exigirSessao(sessionId);
  // Consulta periódica: não reformatar dezenas de colunas a cada atualização.
  // O bootstrap continua nas operações de abertura/cadastro do módulo.
  var items = Frota_veiculosComSituacao_();
  return { ok: true, items: items, atualizadoEm: SGO_UTILS.nowIso() };
}

function Frota_validarVeiculoRetirada_(veiculo) {
  if (!veiculo) throw new Error('Veículo não encontrado.');
  var aberto = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).some(function(m) {
    return SGO_UTILS.safe(m.VEICULO_ID) === SGO_UTILS.safe(veiculo.ID) && Frota_movimentoAberto_(m);
  });
  if (aberto || SGO_UTILS.safeUpper(veiculo.STATUS) === 'EM_USO') throw new Error('Este veículo já está com uma retirada em andamento — finalize-a antes de iniciar outra.');
  if (['ATIVO', 'DISPONIVEL'].indexOf(SGO_UTILS.safeUpper(veiculo.STATUS)) < 0) throw new Error('Veículo indisponível para retirada.');
}

function Frota_apiPing() {
  return {
    ok: true, versao: '1.0', appTitle: FROTA_CFG.APP_TITLE,
    gruposChecklist: FROTA_CFG.GRUPOS_CHECKLIST,
    tiposManutencao: FROTA_CFG.TIPOS_MANUTENCAO,
    tiposDespesa: FROTA_CFG.TIPOS_DESPESA,
    tiposDocumento: FROTA_CFG.TIPOS_DOCUMENTO,
    tiposCombustivel: FROTA_CFG.TIPOS_COMBUSTIVEL
  };
}

// ------------------------------------------------------------
// BOOTSTRAP — cria as 6 abas próprias sob demanda, sem tocar em nenhuma
// outra. Reaproveita CertCal_garantirTabela_/CertCal_garantirColuna_
// (SGO_CertCal_Main.js) — mesmo mecanismo genérico, sem duplicar.
// ------------------------------------------------------------
function Frota_bootstrap_() {
  CertCal_garantirTabela_(SGO_CFG.SHEETS.CAD_VEICULOS, [
    'ID', 'PLACA', 'MODELO', 'MARCA', 'ANO', 'COR', 'KM_ATUAL', 'STATUS', 'CRIADO_EM'
  ]);
  CertCal_garantirTabela_(SGO_CFG.SHEETS.CAD_CONDUTORES, [
    'ID', 'NOME', 'CNH', 'CNH_VALIDADE', 'TELEFONE', 'STATUS', 'CRIADO_EM'
  ]);
  // Fase 5 (2026-08-25) — condutor vinculado ao login do SGO (evita
  // registrar retirada em nome de outra pessoa) + CNH digitalizada.
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_CONDUTORES, 'USUARIO_ID');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_CONDUTORES, 'CNH_ARQUIVO_LINK');
  CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, [
    'ID', 'VEICULO_ID', 'CONDUTOR_ID', 'DATA_SAIDA', 'HORA_SAIDA', 'KM_SAIDA', 'CHECKLIST_SAIDA_JSON', 'FOTOS_SAIDA_JSON',
    'FINALIDADE', 'DATA_CHEGADA', 'HORA_CHEGADA', 'KM_CHEGADA', 'CHECKLIST_CHEGADA_JSON', 'FOTOS_CHEGADA_JSON',
    'OBSERVACOES', 'STATUS', 'CRIADO_EM'
  ]);
  CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO, [
    'ID', 'VEICULO_ID', 'TIPO', 'DATA', 'KM', 'DESCRICAO', 'CUSTO', 'OFICINA', 'PROXIMA_KM', 'PROXIMA_DATA', 'CRIADO_EM'
  ]);
  CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_DESPESA, [
    'ID', 'VEICULO_ID', 'TIPO', 'DATA', 'VALOR', 'DESCRICAO', 'CRIADO_EM'
  ]);
  CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_PARADA, [
    'ID', 'VEICULO_ID', 'DATA_INICIO', 'DATA_FIM', 'MOTIVO', 'DESCRICAO', 'CRIADO_EM'
  ]);
  CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO, [
    'ID', 'VEICULO_ID', 'TIPO_DOCUMENTO', 'NOME_ARQUIVO', 'LINK', 'VALIDADE', 'OBSERVACOES', 'CRIADO_EM'
  ]);
  CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_MULTA, [
    'ID', 'VEICULO_ID', 'DATA_INFRACAO', 'HORA_INFRACAO', 'LOCAL', 'DESCRICAO', 'VALOR', 'PONTOS',
    'ORGAO_AUTUADOR', 'NUMERO_AIT', 'VENCIMENTO', 'LINK_DOCUMENTO',
    'CONDUTOR_ID', 'MOVIMENTACAO_ID', 'STATUS_CRUZAMENTO', 'STATUS', 'OBSERVACOES', 'CRIADO_EM'
  ]);
  CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, [
    'ID', 'VEICULO_ID', 'CONDUTOR_ID', 'DATA', 'KM', 'TIPO_COMBUSTIVEL', 'LITROS', 'VALOR', 'POSTO', 'COMPROVANTE_LINK', 'CRIADO_EM'
  ]);
  // Mesmo bug de auto-conversão de data do Sheets que já mordeu Padrões
  // de Referência (CAD_PADROES.VALIDADE) — ver CertCal_forcarColunaTexto_.
  // Faltavam DATA_SAIDA/HORA_SAIDA/DATA_CHEGADA/HORA_CHEGADA desde a
  // criação do módulo (2026-08-20) — confirmado em produção 2026-08-25:
  // Sheets converteu "10:44" digitado pro campo HORA_SAIDA num serial de
  // hora de verdade (data-base 30/12/1899 do Sheets), e a tela passou a
  // mostrar "1899-12-30T10:44:00" em vez de "10:44". Corrige daqui pra
  // frente — não repara célula que já corrompeu (o valor gravado continua
  // Date até a linha ser reescrita).
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, 'DATA_SAIDA');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, 'HORA_SAIDA');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, 'DATA_CHEGADA');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, 'HORA_CHEGADA');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO, 'DATA');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO, 'PROXIMA_DATA');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_DESPESA, 'DATA');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_PARADA, 'DATA_INICIO');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_PARADA, 'DATA_FIM');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.CAD_CONDUTORES, 'CNH_VALIDADE');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO, 'VALIDADE');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MULTA, 'DATA_INFRACAO');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MULTA, 'VENCIMENTO');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, 'DATA');
  // Timestamp de servidor pro polling de notificação (toast/som de retirada
  // e devolução, 2026-08-28) — DATA_CHEGADA/HORA_CHEGADA são digitados pelo
  // condutor, não servem pra saber quando o registro realmente foi salvo.
  CertCal_garantirColuna_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, 'FINALIZADO_EM');
}

// ------------------------------------------------------------
// VEÍCULOS
// ------------------------------------------------------------
function Frota_apiListarVeiculosAtivos(sessionId) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  var itens = Frota_veiculosComSituacao_()
    .filter(function(v) { return SGO_UTILS.safeUpper(v.STATUS) !== 'INATIVO'; })
    .sort(function(a, b) { return SGO_UTILS.safe(a.PLACA).localeCompare(SGO_UTILS.safe(b.PLACA)); });
  return { ok: true, items: itens };
}

function Frota_apiListarVeiculosTodos(sessionId) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  var itens = Frota_veiculosComSituacao_()
    .sort(function(a, b) { return SGO_UTILS.safe(a.PLACA).localeCompare(SGO_UTILS.safe(b.PLACA)); });
  return { ok: true, items: itens };
}

function Frota_apiCriarVeiculo(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var placa = SGO_UTILS.safeUpper(payload.placa);
  if (!placa) throw new Error('Informe a placa do veículo.');

  var jaExiste = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).some(function(v) { return SGO_UTILS.safeUpper(v.PLACA) === placa; });
  if (jaExiste) throw new Error('Já existe um veículo cadastrado com essa placa.');

  var registro = SGO_DATA.normalizarObjetoParaSheet(
    SGO_CFG.SHEETS.CAD_VEICULOS,
    SGO_DATA.gerarRegistroBase({
      PLACA: placa,
      MODELO: SGO_UTILS.safe(payload.modelo),
      MARCA: SGO_UTILS.safe(payload.marca),
      ANO: SGO_UTILS.safe(payload.ano),
      COR: SGO_UTILS.safe(payload.cor),
      KM_ATUAL: SGO_UTILS.toNumber(payload.kmAtual, 0),
      STATUS: 'ATIVO'
    })
  );
  SGO_DATA.insert(SGO_CFG.SHEETS.CAD_VEICULOS, registro);
  SGO_DATA.log('FROTA_VEICULO_CRIAR', sessao.usuario, 'Veículo criado: ' + placa, 'FROTA');
  return { ok: true, item: registro };
}

function Frota_apiAtualizarVeiculo(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.id);
  var atual = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, id);
  if (!atual) throw new Error('Veículo não encontrado.');

  // Placa/KM adicionados 2026-09-08 — ferramenta de correção manual
  // (ex.: KM divergente do real), restrita a Gestor/Admin/Diretoria
  // (Frota_exigirGestor_ acima) e escondida da tela pra quem não é.
  var placa = payload.placa !== undefined && payload.placa !== '' ? SGO_UTILS.safeUpper(payload.placa) : SGO_UTILS.safeUpper(atual.PLACA);
  if (!placa) throw new Error('Informe a placa do veículo.');
  if (placa !== SGO_UTILS.safeUpper(atual.PLACA)) {
    var colisao = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).some(function (v) { return v.ID !== id && SGO_UTILS.safeUpper(v.PLACA) === placa; });
    if (colisao) throw new Error('Já existe outro veículo cadastrado com essa placa.');
  }

  var kmAtual = payload.kmAtual !== undefined && payload.kmAtual !== '' ? SGO_UTILS.toNumber(payload.kmAtual, NaN) : Number(atual.KM_ATUAL || 0);
  if (!isFinite(kmAtual) || kmAtual < 0) throw new Error('KM atual inválido.');

  SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, id, {
    PLACA: placa,
    MODELO: SGO_UTILS.safe(payload.modelo || atual.MODELO),
    MARCA: SGO_UTILS.safe(payload.marca || atual.MARCA),
    ANO: SGO_UTILS.safe(payload.ano || atual.ANO),
    COR: SGO_UTILS.safe(payload.cor || atual.COR),
    KM_ATUAL: kmAtual
  });
  SGO_DATA.log('FROTA_VEICULO_ATUALIZAR', sessao.usuario, 'Veículo atualizado ID=' + id + ' (placa=' + placa + ', km=' + kmAtual + ')', 'FROTA');
  return { ok: true };
}

function Frota_apiInativarVeiculo(sessionId, payload) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  var id = SGO_UTILS.safe((payload || {}).id);
  if (!SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, id)) throw new Error('Veículo não encontrado.');
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, id, { STATUS: 'INATIVO' });
  return { ok: true };
}

function Frota_apiReativarVeiculo(sessionId, payload) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  var id = SGO_UTILS.safe((payload || {}).id);
  if (!SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, id)) throw new Error('Veículo não encontrado.');
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, id, { STATUS: 'ATIVO' });
  return { ok: true };
}

// ------------------------------------------------------------
// CONDUTORES — cadastro pode ou não estar vinculado a um login do SGO
// (USUARIO_ID). Condutor SEM vínculo continua existindo (motorista
// terceirizado/ocasional sem conta no sistema), mas só condutor COM
// vínculo pode ser "auto-selecionado" pelo próprio login na retirada
// (ver Frota_apiIniciarViagem) — é essa trava que impede alguém
// registrar em nome de outra pessoa.
// ------------------------------------------------------------
function Frota_apiListarCondutoresAtivos(sessionId) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES)
    .filter(function(c) { return SGO_UTILS.safeUpper(c.STATUS) !== 'INATIVO'; })
    .sort(function(a, b) { return SGO_UTILS.safe(a.NOME).localeCompare(SGO_UTILS.safe(b.NOME)); });
  return { ok: true, items: itens };
}

function Frota_apiListarCondutoresTodos(sessionId) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES)
    .sort(function(a, b) { return SGO_UTILS.safe(a.NOME).localeCompare(SGO_UTILS.safe(b.NOME)); });
  return { ok: true, items: itens };
}

/** Condutor vinculado a um login específico (ativo), ou null. Usado pra travar a identidade na retirada (não-gestor). */
function Frota_obterCondutorPorUsuario_(usuarioId) {
  usuarioId = SGO_UTILS.safe(usuarioId);
  if (!usuarioId) return null;
  var achado = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).filter(function(c) {
    return SGO_UTILS.safe(c.USUARIO_ID) === usuarioId && SGO_UTILS.safeUpper(c.STATUS) !== 'INATIVO';
  })[0];
  return achado || null;
}

/** Usuários do SGO disponíveis pra vincular a um condutor novo (ainda sem condutor vinculado). Gestor-only, mesma trava de SGO_USUARIOS.listar. */
function Frota_apiListarUsuariosParaVinculo(sessionId) {
  Frota_bootstrap_();
  Frota_exigirGestor_(sessionId);
  var todos = SGO_USUARIOS.listar(sessionId);
  if (!todos.success) throw new Error(todos.message || 'Falha ao listar usuários.');

  var vinculados = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) {
    if (SGO_UTILS.safe(c.USUARIO_ID) && SGO_UTILS.safeUpper(c.STATUS) !== 'INATIVO') {
      vinculados[SGO_UTILS.safe(c.USUARIO_ID)] = true;
    }
  });

  var itens = todos.items
    .filter(function(u) { return SGO_UTILS.safeUpper(u.STATUS) !== 'INATIVO' && !vinculados[SGO_UTILS.safe(u.ID)]; });
  return { ok: true, items: itens };
}

/** Upload do arquivo da CNH (foto ou PDF) — mesmo miolo genérico de upload já usado pra documentos do veículo. */
function Frota_apiUploadCnh(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};

  var condutorId = SGO_UTILS.safe(payload.condutorId);
  var condutor = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, condutorId);
  if (!condutor) throw new Error('Condutor não encontrado.');
  if (!payload.base64) throw new Error('Selecione o arquivo da CNH.');

  var link = Frota_uploadFoto_('condutores/' + condutor.NOME, payload.base64, payload.mimeType, payload.nomeArquivo || 'CNH');
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_CONDUTORES, condutorId, { CNH_ARQUIVO_LINK: link });
  SGO_DATA.log('FROTA_CNH_UPLOAD', sessao.usuario, 'CNH anexada — condutor ' + condutor.NOME, 'FROTA');
  return { ok: true, link: link };
}

function Frota_apiCriarCondutor(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};

  var usuarioId = SGO_UTILS.safe(payload.usuarioId);
  var nome = SGO_UTILS.safeUpper(payload.nome);

  if (usuarioId) {
    var usuario = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, usuarioId);
    if (!usuario) throw new Error('Usuário do SGO não encontrado.');
    var jaVinculado = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).filter(function(c) {
      return SGO_UTILS.safe(c.USUARIO_ID) === usuarioId && SGO_UTILS.safeUpper(c.STATUS) !== 'INATIVO';
    })[0];
    if (jaVinculado) throw new Error('Este usuário já está vinculado ao condutor "' + jaVinculado.NOME + '".');
    // Nome do condutor sempre vem do cadastro de usuário quando vinculado —
    // evita divergência entre "quem está logado" e "quem aparece no relatório".
    nome = SGO_UTILS.safeUpper(usuario.NOME) || nome;
  }

  if (!nome) throw new Error('Informe o nome do condutor.');

  var registro = SGO_DATA.normalizarObjetoParaSheet(
    SGO_CFG.SHEETS.CAD_CONDUTORES,
    SGO_DATA.gerarRegistroBase({
      NOME: nome,
      CNH: SGO_UTILS.safe(payload.cnh),
      CNH_VALIDADE: SGO_UTILS.safe(payload.cnhValidade),
      TELEFONE: SGO_UTILS.onlyDigits(payload.telefone),
      USUARIO_ID: usuarioId,
      STATUS: 'ATIVO'
    })
  );
  SGO_DATA.insert(SGO_CFG.SHEETS.CAD_CONDUTORES, registro);
  SGO_DATA.log('FROTA_CONDUTOR_CRIAR', sessao.usuario, 'Condutor criado: ' + nome + (usuarioId ? ' (vinculado a login)' : ''), 'FROTA');
  return { ok: true, item: registro };
}

function Frota_apiInativarCondutor(sessionId, payload) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  var id = SGO_UTILS.safe((payload || {}).id);
  if (!SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, id)) throw new Error('Condutor não encontrado.');
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_CONDUTORES, id, { STATUS: 'INATIVO' });
  return { ok: true };
}

function Frota_apiReativarCondutor(sessionId, payload) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  var id = SGO_UTILS.safe((payload || {}).id);
  if (!SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, id)) throw new Error('Condutor não encontrado.');
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_CONDUTORES, id, { STATUS: 'ATIVO' });
  return { ok: true };
}

// ------------------------------------------------------------
// UPLOAD DE FOTOS (mesmo miolo genérico de CertCal_uploadCertificadoPadrao_,
// só muda a pasta raiz — "Frota/<PLACA>/<data>")
// ------------------------------------------------------------
function Frota_obterPastaDocumentos_() {
  var props = PropertiesService.getScriptProperties();
  var idSalvo = props.getProperty(FROTA_CFG.UPLOAD_FOLDER_PROP);
  if (idSalvo) {
    try { return DriveApp.getFolderById(idSalvo); } catch (e) { /* pasta salva não existe mais — recria abaixo */ }
  }
  var folder = DriveApp.getRootFolder().createFolder('Frota - Fotos e Documentos');
  props.setProperty(FROTA_CFG.UPLOAD_FOLDER_PROP, folder.getId());
  return folder;
}

function Frota_sanitizarNome_(nome) {
  var limpo = String(nome || '').replace(/[\\\/:*?"<>|#%]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80);
  return limpo || 'sem-nome';
}

/** Resolve/cria a subpasta da placa UMA VEZ — ver Frota_uploadFotos_ (checklist de retirada/devolução manda várias fotos de uma vez; resolver a pasta a cada foto é o que deixava o checkin lento). */
function Frota_obterPastaVeiculo_(placa) {
  var raiz = Frota_obterPastaDocumentos_();
  var nomeSubpasta = Frota_sanitizarNome_(placa || 'sem-placa');
  var subpastas = raiz.getFoldersByName(nomeSubpasta);
  return subpastas.hasNext() ? subpastas.next() : raiz.createFolder(nomeSubpasta);
}

function Frota_uploadFotoNaPasta_(pasta, base64, mimeType, nomeArquivoSugerido) {
  var partes = String(base64 || '').split(',');
  var dadosBase64 = partes.length > 1 ? partes[1] : partes[0];
  var nomeArquivo = Frota_sanitizarNome_(nomeArquivoSugerido || 'foto');

  var blob = Utilities.newBlob(Utilities.base64Decode(dadosBase64), mimeType || 'image/jpeg', nomeArquivo);
  var arquivo = pasta.createFile(blob);
  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return arquivo.getUrl();
}

function Frota_uploadFoto_(placa, base64, mimeType, nomeArquivoSugerido) {
  return Frota_uploadFotoNaPasta_(Frota_obterPastaVeiculo_(placa), base64, mimeType, nomeArquivoSugerido);
}

// Medido ao vivo (2026-08-31): 1 upload pro Drive (createFile+setSharing)
// custa ~5s sozinho. Frota_uploadFotos_ faz isso em sequência — 3 fotos
// numa retirada/devolução = 15s+ só de upload. Apps Script não tem
// paralelismo real DENTRO de 1 execução, mas o navegador pode disparar N
// chamadas independentes ao mesmo tempo (cada uma processada em paralelo
// pelo lado do servidor). Esta função sobe 1 foto só — o cliente chama
// isto em paralelo (Promise.all) pra cada foto, ANTES de registrar a
// retirada/devolução, e manda só os links prontos pro apiIniciarViagem/
// apiFinalizarViagem (ver payload.fotosSalvas).
function Frota_apiUploadFotoVeiculo(sessionId, payload) {
  exigirSessao(sessionId);
  payload = payload || {};
  var placa = SGO_UTILS.safe(payload.placa);
  if (!placa) throw new Error('Placa não informada.');
  if (!payload.base64) throw new Error('Foto não informada.');

  // Instrumentado 2026-09-09 -- quebra Frota_uploadFoto_ em etapas pra
  // achar qual chamada ao Drive (pasta raiz / busca de subpasta /
  // upload em si / setSharing) e' a lenta de verdade.
  var raiz = Frota_obterPastaDocumentos_();
  var nomeSubpasta = Frota_sanitizarNome_(placa || 'sem-placa');
  var subpastas = raiz.getFoldersByName(nomeSubpasta);
  var pasta = subpastas.hasNext() ? subpastas.next() : raiz.createFolder(nomeSubpasta);

  var partes = String(payload.base64 || '').split(',');
  var dadosBase64 = partes.length > 1 ? partes[1] : partes[0];
  var nomeArquivo = Frota_sanitizarNome_(payload.nomeArquivo || 'foto');
  var blob = Utilities.newBlob(Utilities.base64Decode(dadosBase64), payload.mimeType || 'image/jpeg', nomeArquivo);
  var arquivo = pasta.createFile(blob);
  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var link = arquivo.getUrl();
  return { ok: true, link: link, legenda: String(payload.legenda || '').trim() };
}

// Checkin/checkout com várias fotos estava demorando mais de 1 minuto —
// cada foto reabria "Frota_obterPastaDocumentos_" (leitura de Script
// Properties + DriveApp.getFolderById) e refazia a busca da subpasta da
// placa (getFoldersByName, busca linear na pasta raiz) do zero. Com N
// fotos isso era N buscas de pasta redundantes; agora resolve 1 vez só.
function Frota_uploadFotos_(placa, fotos) {
  var lista = (Array.isArray(fotos) ? fotos : []).slice(0, 10).filter(function(f) { return f && f.base64; });
  if (!lista.length) return [];
  var pasta = Frota_obterPastaVeiculo_(placa);
  return lista.map(function(f) {
    return {
      link: Frota_uploadFotoNaPasta_(pasta, f.base64, f.mimeType, f.nomeArquivo),
      legenda: String(f.legenda || '').trim()
    };
  });
}

// ------------------------------------------------------------
// MOVIMENTAÇÃO (retirada / devolução do veículo)
// ------------------------------------------------------------
function Frota_normalizarChecklist_(checklist) {
  return (Array.isArray(checklist) ? checklist : []).map(function(item) {
    return {
      grupo: String(item.grupo || ''),
      item: String(item.item || ''),
      ok: !!item.ok,
      observacao: String(item.observacao || '').trim()
    };
  });
}

// Qualidade do registro de retirada/devolução (2026-08-28, achado real:
// checklist e fotos eram opcionais — condutor podia sair/voltar sem
// preencher nada). Barra ANTES de gravar, não depois — igual ao padrão
// adotado no Auvo pro mesmo problema. `rotulo` é só pra mensagem de erro
// dizer "retirada"/"devolução" certo.
function Frota_validarQualidadeMovimentacao_(checklistNormalizado, fotosSalvas, rotulo) {
  if (!checklistNormalizado.length) {
    throw new Error('Preencha o checklist do veículo antes de confirmar a ' + rotulo + '.');
  }
  var semObservacao = checklistNormalizado.filter(function(it) { return !it.ok && !it.observacao; });
  if (semObservacao.length) {
    throw new Error('Item(ns) do checklist marcado(s) com problema sem observação: ' + semObservacao.map(function(it) { return it.item; }).join(', ') + '. Descreva o que foi encontrado antes de confirmar a ' + rotulo + '.');
  }
  if (!fotosSalvas.length) {
    throw new Error('Anexe pelo menos 1 foto do veículo antes de confirmar a ' + rotulo + '.');
  }
}

function Frota_apiListarViagensEmAndamento(sessionId) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  var veiculos = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function(v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });
  var condutores = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });

  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO)
    .filter(function(m) { return SGO_UTILS.safeUpper(m.STATUS) === 'EM_ANDAMENTO'; })
    .map(function(m) {
      var v = veiculos[SGO_UTILS.safe(m.VEICULO_ID)] || {};
      var c = condutores[SGO_UTILS.safe(m.CONDUTOR_ID)] || {};
      return {
        id: m.ID, veiculoId: m.VEICULO_ID, veiculoPlaca: v.PLACA || '', veiculoModelo: v.MODELO || '',
        condutorNome: c.NOME || '', dataSaida: m.DATA_SAIDA, horaSaida: m.HORA_SAIDA, kmSaida: m.KM_SAIDA, finalidade: m.FINALIDADE
      };
    });
  return { ok: true, items: itens };
}

/**
 * Recebe do NAVEGADOR o tempo de ida-e-volta real de uma chamada
 * (inclui rede + fila do Apps Script + execução no servidor + volta) —
 * sem sessão exigida de propósito, pra nunca falhar por causa da
 * própria instrumentação. Temporário.
 */
function Frota_apiDiagLogTempoCliente(sessionId, payload) {
  payload = payload || {};
  try { SGO_DATA.log('DIAG_FROTA_CLIENTE', 'navegador', String(payload.rotulo || '?') + ': ' + String(payload.ms || '?') + 'ms (medido no navegador, ida e volta)', 'DIAG'); } catch (e) {}
  return { ok: true };
}

function Frota_apiIniciarViagem(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  payload = payload || {};

  var veiculoId = SGO_UTILS.safe(payload.veiculoId);
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId);
  if (!veiculo) throw new Error('Veículo não encontrado.');
  Frota_validarVeiculoRetirada_(veiculo);

  // Trava de identidade (Fase 5, 2026-08-25): quem NÃO é gestor/admin não
  // escolhe condutor — o sistema usa o condutor vinculado ao próprio
  // login, sempre, ignorando o que veio no payload. Evita registrar
  // retirada em nome de outra pessoa. Gestor/admin continua podendo
  // escolher qualquer condutor (ex.: exceção, motorista esqueceu de bater).
  var condutorId = Frota_resolverCondutorRetirada_(sessionId, payload).ID;

  var kmSaida = SGO_UTILS.toNumber(payload.kmSaida, NaN);
  if (!isFinite(kmSaida)) throw new Error('Informe o KM de saída.');
  if (kmSaida < Number(veiculo.KM_ATUAL || 0)) {
    throw new Error('O KM de saída (' + kmSaida + ') não pode ser menor que o KM atual do veículo (' + veiculo.KM_ATUAL + ').');
  }

  // Fotos: o cliente já sobe cada uma em paralelo via apiUploadFotoVeiculo
  // e manda os links prontos em payload.fotosSalvas (rápido). Mantido o
  // caminho antigo (payload.fotos cru, upload sequencial aqui) só como
  // fallback pra quem ainda não atualizou o app/cache do navegador.
  var fotosSalvas = Array.isArray(payload.fotosSalvas) ? payload.fotosSalvas : Frota_uploadFotos_(veiculo.PLACA, payload.fotos);
  var checklistNormalizado = Frota_normalizarChecklist_(payload.checklist);
  Frota_validarQualidadeMovimentacao_(checklistNormalizado, fotosSalvas, 'retirada');

  // Trava evita retirada duplicada: 2 pedidos quase simultâneos pro MESMO
  // veículo (2 pessoas testando, ou duplo clique) podiam os dois ler
  // STATUS "ATIVO" antes de qualquer um gravar, passando os dois pela
  // checagem lá em cima — sem isto, 2 movimentações "EM_ANDAMENTO" abertas
  // pro mesmo veículo ao mesmo tempo (o problema de duplicidade relatado).
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId);
    if (!veiculo) throw new Error('Veículo não encontrado.');
    Frota_validarVeiculoRetirada_(veiculo);

    var registro = SGO_DATA.normalizarObjetoParaSheet(
      SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO,
      SGO_DATA.gerarRegistroBase({
        VEICULO_ID: veiculoId,
        CONDUTOR_ID: condutorId,
        DATA_SAIDA: String(payload.dataSaida || '').trim(),
        HORA_SAIDA: String(payload.horaSaida || '').trim(),
        KM_SAIDA: kmSaida,
        CHECKLIST_SAIDA_JSON: JSON.stringify(checklistNormalizado),
        FOTOS_SAIDA_JSON: JSON.stringify(fotosSalvas),
        FINALIDADE: String(payload.finalidade || '').trim(),
        DATA_CHEGADA: '', HORA_CHEGADA: '', KM_CHEGADA: '', CHECKLIST_CHEGADA_JSON: '', FOTOS_CHEGADA_JSON: '',
        OBSERVACOES: '',
        STATUS: 'EM_ANDAMENTO'
      })
    );
    SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, registro);
    SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId, { KM_ATUAL: kmSaida, STATUS: 'EM_USO' });
    SGO_DATA.log('FROTA_VIAGEM_INICIAR', sessao.usuario, 'Retirada registrada — veículo ' + veiculo.PLACA, 'FROTA');

    return { ok: true, movimentacaoId: registro.ID };
  } finally {
    try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  }
}

function Frota_apiFinalizarViagem(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  payload = payload || {};

  var movId = SGO_UTILS.safe(payload.movimentacaoId);
  var mov = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movId);
  if (!mov) throw new Error('Retirada não encontrada.');
  if (SGO_UTILS.safeUpper(mov.STATUS) !== 'EM_ANDAMENTO') throw new Error('Esta retirada já foi finalizada.');

  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, mov.VEICULO_ID);
  if (!veiculo) throw new Error('Veículo não encontrado.');

  var kmChegada = SGO_UTILS.toNumber(payload.kmChegada, NaN);
  if (!isFinite(kmChegada)) throw new Error('Informe o KM de chegada.');
  if (kmChegada < Number(mov.KM_SAIDA || 0)) {
    throw new Error('O KM de chegada (' + kmChegada + ') não pode ser menor que o KM de saída (' + mov.KM_SAIDA + ').');
  }

  // Fotos: mesmo esquema do Frota_apiIniciarViagem — cliente já sobe em
  // paralelo e manda os links prontos; payload.fotos cru fica só de
  // fallback.
  var fotosSalvas = Array.isArray(payload.fotosSalvas) ? payload.fotosSalvas : Frota_uploadFotos_(veiculo.PLACA, payload.fotos);
  var checklistNormalizado = Frota_normalizarChecklist_(payload.checklist);
  Frota_validarQualidadeMovimentacao_(checklistNormalizado, fotosSalvas, 'devolução');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    mov = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movId);
    if (!mov) throw new Error('Retirada não encontrada.');
    if (SGO_UTILS.safeUpper(mov.STATUS) !== 'EM_ANDAMENTO') throw new Error('Esta retirada já foi finalizada.');

    SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movId, {
      DATA_CHEGADA: String(payload.dataChegada || '').trim(),
      HORA_CHEGADA: String(payload.horaChegada || '').trim(),
      KM_CHEGADA: kmChegada,
      CHECKLIST_CHEGADA_JSON: JSON.stringify(checklistNormalizado),
      FOTOS_CHEGADA_JSON: JSON.stringify(fotosSalvas),
      OBSERVACOES: String(payload.observacoes || '').trim(),
      STATUS: 'FINALIZADO',
      FINALIZADO_EM: SGO_UTILS.nowIso()
    });
    SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, veiculo.ID, { KM_ATUAL: kmChegada, STATUS: 'ATIVO' });
    SGO_DATA.log('FROTA_VIAGEM_FINALIZAR', sessao.usuario, 'Devolução registrada — veículo ' + veiculo.PLACA, 'FROTA');

    return { ok: true };
  } finally {
    try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  }
}

// Polling de notificação (toast/som), 2026-08-28 — mesmo padrão de
// Auvo_apiVerificarNovosEventos (SGO_Auvo_Incremental.js): cliente manda
// "desde quando" e recebe só os eventos mais novos que isso. Retirada usa
// CRIADO_EM (sempre existiu); devolução usa FINALIZADO_EM (novo, carimbado
// em Frota_apiFinalizarViagem — DATA_CHEGADA/HORA_CHEGADA são digitados
// pelo condutor, não servem de timestamp real de quando foi salvo).
function Frota_apiVerificarNovosEventos(sessionId, payload) {
  Frota_bootstrap_();
  Frota_exigirGestor_(sessionId);
  var desdeIso = (payload || {}).desde;
  if (!desdeIso) return { ok: true, eventos: [] };
  var desde = new Date(desdeIso).getTime();
  if (isNaN(desde)) return { ok: true, eventos: [] };

  var veiculos = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function(v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });
  var condutores = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });

  var eventos = [];
  SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function(m) {
    var veiculo = veiculos[SGO_UTILS.safe(m.VEICULO_ID)] || {};
    var condutor = condutores[SGO_UTILS.safe(m.CONDUTOR_ID)] || {};
    [
      { campo: 'CRIADO_EM', tipo: 'retirada' },
      { campo: 'FINALIZADO_EM', tipo: 'devolucao' }
    ].forEach(function(marco) {
      var valor = m[marco.campo];
      if (!valor) return;
      var ts = new Date(valor).getTime();
      if (isNaN(ts) || ts <= desde) return;
      eventos.push({
        tipo: marco.tipo, movimentacaoId: m.ID, veiculoPlaca: veiculo.PLACA || '',
        veiculoModelo: veiculo.MODELO || '', condutorNome: condutor.NOME || '', em: valor
      });
    });
  });
  eventos.sort(function(a, b) { return new Date(a.em) - new Date(b.em); });
  return { ok: true, eventos: eventos, agora: SGO_UTILS.nowIso() };
}

// ------------------------------------------------------------
// MANUTENÇÃO / DESPESA / PARADA
// ------------------------------------------------------------
function Frota_apiRegistrarManutencao(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};

  var veiculoId = SGO_UTILS.safe(payload.veiculoId);
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId);
  if (!veiculo) throw new Error('Veículo não encontrado.');
  if (!payload.tipo) throw new Error('Selecione o tipo de manutenção.');

  var registro = SGO_DATA.normalizarObjetoParaSheet(
    SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO,
    SGO_DATA.gerarRegistroBase({
      VEICULO_ID: veiculoId,
      TIPO: String(payload.tipo),
      DATA: String(payload.data || '').trim(),
      KM: SGO_UTILS.toNumber(payload.km, veiculo.KM_ATUAL || 0),
      DESCRICAO: String(payload.descricao || '').trim(),
      CUSTO: SGO_UTILS.toNumber(payload.custo, 0),
      OFICINA: String(payload.oficina || '').trim(),
      PROXIMA_KM: payload.proximaKm !== undefined && payload.proximaKm !== '' ? SGO_UTILS.toNumber(payload.proximaKm, 0) : '',
      PROXIMA_DATA: String(payload.proximaData || '').trim()
    })
  );
  SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO, registro);
  SGO_DATA.log('FROTA_MANUTENCAO_REGISTRAR', sessao.usuario, 'Manutenção registrada — veículo ' + veiculo.PLACA + ' (' + payload.tipo + ')', 'FROTA');
  return { ok: true, item: registro };
}

function Frota_apiRegistrarDespesa(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};

  var veiculoId = SGO_UTILS.safe(payload.veiculoId);
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId);
  if (!veiculo) throw new Error('Veículo não encontrado.');

  var registro = SGO_DATA.normalizarObjetoParaSheet(
    SGO_CFG.SHEETS.REG_FROTA_DESPESA,
    SGO_DATA.gerarRegistroBase({
      VEICULO_ID: veiculoId,
      TIPO: String(payload.tipo || 'Outro'),
      DATA: String(payload.data || '').trim(),
      VALOR: SGO_UTILS.toNumber(payload.valor, 0),
      DESCRICAO: String(payload.descricao || '').trim()
    })
  );
  SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_DESPESA, registro);
  SGO_DATA.log('FROTA_DESPESA_REGISTRAR', sessao.usuario, 'Despesa registrada — veículo ' + veiculo.PLACA, 'FROTA');
  return { ok: true, item: registro };
}

function Frota_apiRegistrarParada(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};

  var veiculoId = SGO_UTILS.safe(payload.veiculoId);
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId);
  if (!veiculo) throw new Error('Veículo não encontrado.');

  var registro = SGO_DATA.normalizarObjetoParaSheet(
    SGO_CFG.SHEETS.REG_FROTA_PARADA,
    SGO_DATA.gerarRegistroBase({
      VEICULO_ID: veiculoId,
      DATA_INICIO: String(payload.dataInicio || '').trim(),
      DATA_FIM: String(payload.dataFim || '').trim(),
      MOTIVO: String(payload.motivo || '').trim(),
      DESCRICAO: String(payload.descricao || '').trim()
    })
  );
  SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_PARADA, registro);
  SGO_DATA.log('FROTA_PARADA_REGISTRAR', sessao.usuario, 'Parada registrada — veículo ' + veiculo.PLACA, 'FROTA');
  return { ok: true, item: registro };
}

// ------------------------------------------------------------
// DOCUMENTOS DO VEÍCULO (Fase 2, 2026-08-25) — CRLV, seguro,
// licenciamento, IPVA etc. VALIDADE (dd/mm/aaaa, opcional) alimenta o
// MESMO alarme de manutenção quando preenchida — ver
// Frota_calcularAlertasManutencao_, que já lê REG_FROTA_DOCUMENTO.
// ------------------------------------------------------------
function Frota_apiListarDocumentos(sessionId, payload) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  payload = payload || {};
  var veiculoId = SGO_UTILS.safe(payload.veiculoId);

  var veiculos = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function(v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });

  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO)
    .filter(function(d) { return !veiculoId || SGO_UTILS.safe(d.VEICULO_ID) === veiculoId; })
    .map(function(d) {
      var veiculo = veiculos[SGO_UTILS.safe(d.VEICULO_ID)] || {};
      var status = 'SEM_VALIDADE';
      var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d.VALIDADE || '').trim());
      if (m) {
        var dataVenc = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        dataVenc.setHours(0, 0, 0, 0);
        var dias = Math.ceil((dataVenc.getTime() - hoje.getTime()) / 86400000);
        status = dias < 0 ? 'VENCIDO' : (dias <= FROTA_CFG.DIAS_AVISO_VENCIMENTO ? 'VENCENDO' : 'OK');
      }
      return Object.assign({}, d, { veiculoPlaca: veiculo.PLACA || '', status: status });
    })
    .sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });

  return { ok: true, items: itens };
}

function Frota_apiUploadDocumento(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};

  var veiculoId = SGO_UTILS.safe(payload.veiculoId);
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId);
  if (!veiculo) throw new Error('Veículo não encontrado.');
  if (!payload.base64) throw new Error('Selecione o arquivo do documento.');
  if (!payload.tipoDocumento) throw new Error('Selecione o tipo de documento.');

  var validade = String(payload.validade || '').trim();
  if (validade && !/^\d{2}\/\d{2}\/\d{4}$/.test(validade)) {
    throw new Error('Validade inválida — use o formato dd/mm/aaaa.');
  }

  var link = Frota_uploadFoto_(veiculo.PLACA, payload.base64, payload.mimeType, payload.nomeArquivo || payload.tipoDocumento);

  var registro = SGO_DATA.normalizarObjetoParaSheet(
    SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO,
    SGO_DATA.gerarRegistroBase({
      VEICULO_ID: veiculoId,
      TIPO_DOCUMENTO: String(payload.tipoDocumento),
      NOME_ARQUIVO: String(payload.nomeArquivo || payload.tipoDocumento),
      LINK: link,
      VALIDADE: validade,
      OBSERVACOES: String(payload.observacoes || '').trim()
    })
  );
  SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO, registro);
  SGO_DATA.log('FROTA_DOCUMENTO_UPLOAD', sessao.usuario, 'Documento anexado — veículo ' + veiculo.PLACA + ' (' + payload.tipoDocumento + ')', 'FROTA');
  return { ok: true, item: registro };
}

function Frota_apiExcluirDocumento(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.id);
  var doc = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO, id);
  if (!doc) throw new Error('Documento não encontrado.');
  // Remove só o registro — o arquivo permanece no Drive (fica recuperável
  // manualmente se for engano), mesmo critério não-destrutivo do resto do Portal.
  SGO_DATA.remove(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO, id);
  SGO_DATA.log('FROTA_DOCUMENTO_EXCLUIR', sessao.usuario, 'Documento removido — ' + doc.TIPO_DOCUMENTO + ' (' + doc.NOME_ARQUIVO + ')', 'FROTA');
  return { ok: true };
}

// ------------------------------------------------------------
// ABASTECIMENTOS (Fase 6, 2026-08-25) — litros/valor por posto, com
// comprovante opcional. Consumo médio (km/L) e custo por km são
// calculados no relatório (FrotaRel_agregarDados_), não aqui — dependem
// de comparar abastecimentos consecutivos do mesmo veículo.
// ------------------------------------------------------------
function Frota_apiListarAbastecimentos(sessionId, payload) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  payload = payload || {};
  var veiculoId = SGO_UTILS.safe(payload.veiculoId);

  var veiculos = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function(v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });
  var condutores = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });

  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO)
    .filter(function(a) { return !veiculoId || SGO_UTILS.safe(a.VEICULO_ID) === veiculoId; })
    .map(function(a) {
      var veiculo = veiculos[SGO_UTILS.safe(a.VEICULO_ID)] || {};
      var condutor = condutores[SGO_UTILS.safe(a.CONDUTOR_ID)] || {};
      return Object.assign({}, a, { veiculoPlaca: veiculo.PLACA || '', condutorNome: condutor.NOME || '' });
    })
    .sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });

  return { ok: true, items: itens };
}

function Frota_apiRegistrarAbastecimento(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};

  var veiculoId = SGO_UTILS.safe(payload.veiculoId);
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId);
  if (!veiculo) throw new Error('Veículo não encontrado.');

  var data = String(payload.data || '').trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) throw new Error('Informe a data no formato dd/mm/aaaa.');

  var litros = SGO_UTILS.toNumber(payload.litros, NaN);
  if (!isFinite(litros) || litros <= 0) throw new Error('Informe os litros abastecidos.');

  var km = SGO_UTILS.toNumber(payload.km, NaN);
  if (!isFinite(km)) throw new Error('Informe o KM no momento do abastecimento.');

  // Achado real 2026-08-28: comprovante era opcional — abastecimento ficava
  // registrado sem nenhuma evidência. Passa a ser obrigatório, mesmo padrão
  // de qualidade aplicado na movimentação de veículo.
  if (!payload.base64) throw new Error('Anexe o comprovante do abastecimento antes de registrar.');
  var link = Frota_uploadFoto_(veiculo.PLACA, payload.base64, payload.mimeType, payload.nomeArquivo || 'comprovante-abastecimento');

  var registro = SGO_DATA.normalizarObjetoParaSheet(
    SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO,
    SGO_DATA.gerarRegistroBase({
      VEICULO_ID: veiculoId,
      CONDUTOR_ID: SGO_UTILS.safe(payload.condutorId),
      DATA: data,
      KM: km,
      TIPO_COMBUSTIVEL: SGO_UTILS.safe(payload.tipoCombustivel) || 'Outro',
      LITROS: litros,
      VALOR: SGO_UTILS.toNumber(payload.valor, 0),
      POSTO: SGO_UTILS.safe(payload.posto),
      COMPROVANTE_LINK: link
    })
  );
  SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, registro);
  SGO_DATA.log('FROTA_ABASTECIMENTO_REGISTRAR', sessao.usuario, 'Abastecimento registrado — veículo ' + veiculo.PLACA + ' (' + litros + ' L)', 'FROTA');
  return { ok: true, item: registro };
}

function Frota_apiExcluirAbastecimento(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.id);
  var abastecimento = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, id);
  if (!abastecimento) throw new Error('Abastecimento não encontrado.');
  SGO_DATA.remove(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, id);
  SGO_DATA.log('FROTA_ABASTECIMENTO_EXCLUIR', sessao.usuario, 'Abastecimento removido — ' + id, 'FROTA');
  return { ok: true };
}

// ------------------------------------------------------------
// MULTAS (Fase 3, 2026-08-25) — lançamento manual (não existe API
// pública gratuita de multas no Brasil) + cruzamento automático contra
// REG_FROTA_MOVIMENTACAO por data/hora x veículo, pra identificar quem
// estava usando o carro na hora da infração (cobrança/evidência).
// ------------------------------------------------------------
function Frota_parseDataHora_(data, hora) {
  var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(data || '').trim());
  if (!m) return null;
  var h = /^(\d{1,2}):(\d{2})$/.exec(String(hora || '').trim());
  if (String(hora || '').trim() && !h) return null;
  var hh = h ? Number(h[1]) : 0;
  var mm = h ? Number(h[2]) : 0;
  if (hh > 23 || mm > 59) return null;
  var dia = Number(m[1]), mes = Number(m[2]), ano = Number(m[3]);
  var d = new Date(ano, mes - 1, dia, hh, mm, 0);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return d;
}

/**
 * Cruza data/hora da infração contra o histórico de retiradas do veículo.
 * ENCONTRADO: exatamente 1 movimentação cobre o horário — condutor certo.
 * MULTIPLOS: mais de 1 movimentação cobre o horário (dado inconsistente,
 * ex. retiradas sobrepostas) — devolve a mais próxima como palpite, mas
 * sinaliza a ambiguidade pra conferência manual (nunca afirma certeza que
 * não tem — mesmo princípio do "não pode inventar nada" dos laudos).
 * NAO_ENCONTRADO: nenhuma retirada registrada cobre esse horário.
 */
function Frota_cruzarMulta_(veiculoId, dataInfracao, horaInfracao) {
  var alvo = Frota_parseDataHora_(dataInfracao, horaInfracao);
  if (!alvo) return { statusCruzamento: 'DATA_INVALIDA', movimentacaoId: '', condutorId: '' };

  var candidatos = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO)
    .filter(function(m) { return SGO_UTILS.safe(m.VEICULO_ID) === veiculoId; })
    .map(function(m) {
      var inicio = Frota_parseDataHora_(m.DATA_SAIDA, m.HORA_SAIDA);
      var fim = m.DATA_CHEGADA ? Frota_parseDataHora_(m.DATA_CHEGADA, m.HORA_CHEGADA) : null;
      return { m: m, inicio: inicio, fim: fim };
    })
    .filter(function(c) {
      if (!c.inicio) return false;
      // retirada ainda em andamento (sem chegada) — considera candidata se a
      // infração ocorreu depois da saída; com chegada, tem que estar no intervalo.
      return c.fim ? (alvo.getTime() >= c.inicio.getTime() && alvo.getTime() <= c.fim.getTime())
                    : (alvo.getTime() >= c.inicio.getTime());
    });

  if (!candidatos.length) return { statusCruzamento: 'NAO_ENCONTRADO', movimentacaoId: '', condutorId: '' };

  candidatos.sort(function(a, b) {
    return Math.abs(alvo.getTime() - a.inicio.getTime()) - Math.abs(alvo.getTime() - b.inicio.getTime());
  });
  return {
    statusCruzamento: candidatos.length === 1 ? 'ENCONTRADO' : 'MULTIPLOS',
    movimentacaoId: candidatos[0].m.ID,
    condutorId: candidatos[0].m.CONDUTOR_ID
  };
}

function Frota_apiListarMultas(sessionId, payload) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  payload = payload || {};
  var veiculoId = SGO_UTILS.safe(payload.veiculoId);

  var veiculos = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function(v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });
  var condutores = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });

  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MULTA)
    .filter(function(m) { return !veiculoId || SGO_UTILS.safe(m.VEICULO_ID) === veiculoId; })
    .map(function(m) {
      var veiculo = veiculos[SGO_UTILS.safe(m.VEICULO_ID)] || {};
      var condutor = condutores[SGO_UTILS.safe(m.CONDUTOR_ID)] || {};
      return Object.assign({}, m, { veiculoPlaca: veiculo.PLACA || '', condutorNome: condutor.NOME || '' });
    })
    .sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });

  return { ok: true, items: itens };
}

function Frota_apiRegistrarMulta(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};

  var veiculoId = SGO_UTILS.safe(payload.veiculoId);
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId);
  if (!veiculo) throw new Error('Veículo não encontrado.');

  var dataInfracao = String(payload.dataInfracao || '').trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataInfracao)) throw new Error('Informe a data da infração no formato dd/mm/aaaa.');
  var horaInfracao = String(payload.horaInfracao || '').trim();

  var vencimento = String(payload.vencimento || '').trim();
  if (vencimento && !/^\d{2}\/\d{2}\/\d{4}$/.test(vencimento)) throw new Error('Vencimento inválido — use o formato dd/mm/aaaa.');

  var link = '';
  if (payload.base64) {
    link = Frota_uploadFoto_(veiculo.PLACA, payload.base64, payload.mimeType, payload.nomeArquivo || 'multa');
  }

  var cruzamento = Frota_cruzarMulta_(veiculoId, dataInfracao, horaInfracao);

  var registro = SGO_DATA.normalizarObjetoParaSheet(
    SGO_CFG.SHEETS.REG_FROTA_MULTA,
    SGO_DATA.gerarRegistroBase({
      VEICULO_ID: veiculoId,
      DATA_INFRACAO: dataInfracao,
      HORA_INFRACAO: horaInfracao,
      LOCAL: String(payload.local || '').trim(),
      DESCRICAO: String(payload.descricao || '').trim(),
      VALOR: SGO_UTILS.toNumber(payload.valor, 0),
      PONTOS: payload.pontos !== undefined && payload.pontos !== '' ? SGO_UTILS.toNumber(payload.pontos, 0) : '',
      ORGAO_AUTUADOR: String(payload.orgaoAutuador || '').trim(),
      NUMERO_AIT: String(payload.numeroAit || '').trim(),
      VENCIMENTO: vencimento,
      LINK_DOCUMENTO: link,
      CONDUTOR_ID: cruzamento.condutorId || '',
      MOVIMENTACAO_ID: cruzamento.movimentacaoId || '',
      STATUS_CRUZAMENTO: cruzamento.statusCruzamento,
      STATUS: 'ABERTA',
      OBSERVACOES: String(payload.observacoes || '').trim()
    })
  );
  SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_MULTA, registro);
  SGO_DATA.log('FROTA_MULTA_REGISTRAR', sessao.usuario, 'Multa registrada — veículo ' + veiculo.PLACA + ' (cruzamento: ' + cruzamento.statusCruzamento + ')', 'FROTA');
  return { ok: true, item: registro, cruzamento: cruzamento };
}

/** Re-roda o cruzamento (ex.: usuário registrou a movimentação depois da multa, ou corrigiu um horário). */
function Frota_apiRecruzarMulta(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.id);
  var multa = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MULTA, id);
  if (!multa) throw new Error('Multa não encontrada.');

  var cruzamento = Frota_cruzarMulta_(SGO_UTILS.safe(multa.VEICULO_ID), multa.DATA_INFRACAO, multa.HORA_INFRACAO);
  SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MULTA, id, {
    CONDUTOR_ID: cruzamento.condutorId || '',
    MOVIMENTACAO_ID: cruzamento.movimentacaoId || '',
    STATUS_CRUZAMENTO: cruzamento.statusCruzamento
  });
  SGO_DATA.log('FROTA_MULTA_RECRUZAR', sessao.usuario, 'Multa recruzada — ' + id + ' (' + cruzamento.statusCruzamento + ')', 'FROTA');
  return { ok: true, cruzamento: cruzamento };
}

/** Override manual — cruzamento automático não achou, achou errado, ou achou ambíguo. */
function Frota_apiIndicarCondutorMulta(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.id);
  var multa = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MULTA, id);
  if (!multa) throw new Error('Multa não encontrada.');
  var condutorId = SGO_UTILS.safe(payload.condutorId);
  if (condutorId && !SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, condutorId)) throw new Error('Condutor não encontrado.');

  SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MULTA, id, { CONDUTOR_ID: condutorId, STATUS_CRUZAMENTO: 'MANUAL' });
  SGO_DATA.log('FROTA_MULTA_INDICAR_CONDUTOR', sessao.usuario, 'Condutor indicado manualmente na multa ' + id, 'FROTA');
  return { ok: true };
}

function Frota_apiAtualizarStatusMulta(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.id);
  var multa = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MULTA, id);
  if (!multa) throw new Error('Multa não encontrada.');
  var status = String(payload.status || '').trim().toUpperCase();
  if (['ABERTA', 'PAGA', 'RECORRIDA', 'CANCELADA'].indexOf(status) === -1) throw new Error('Status inválido.');
  SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MULTA, id, { STATUS: status });
  SGO_DATA.log('FROTA_MULTA_STATUS', sessao.usuario, 'Multa ' + id + ' -> ' + status, 'FROTA');
  return { ok: true };
}

function Frota_apiExcluirMulta(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = exigirSessao(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.id);
  var multa = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MULTA, id);
  if (!multa) throw new Error('Multa não encontrada.');
  SGO_DATA.remove(SGO_CFG.SHEETS.REG_FROTA_MULTA, id);
  SGO_DATA.log('FROTA_MULTA_EXCLUIR', sessao.usuario, 'Multa removida — ' + id, 'FROTA');
  return { ok: true };
}

// ------------------------------------------------------------
// HISTÓRICO POR VEÍCULO (movimentações + manutenções + despesas + paradas)
// ------------------------------------------------------------
function Frota_apiHistoricoVeiculo(sessionId, payload) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  var veiculoId = SGO_UTILS.safe((payload || {}).veiculoId);
  if (!veiculoId) throw new Error('Selecione um veículo.');

  var condutores = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });

  var movimentacoes = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO)
    .filter(function(m) { return SGO_UTILS.safe(m.VEICULO_ID) === veiculoId; })
    .map(function(m) {
      var c = condutores[SGO_UTILS.safe(m.CONDUTOR_ID)] || {};
      var out = Object.assign({}, m, { condutorNome: c.NOME || '' });
      try { out.checklistSaida = JSON.parse(m.CHECKLIST_SAIDA_JSON || '[]'); } catch (e) { out.checklistSaida = []; }
      try { out.checklistChegada = JSON.parse(m.CHECKLIST_CHEGADA_JSON || '[]'); } catch (e) { out.checklistChegada = []; }
      try { out.fotosSaida = JSON.parse(m.FOTOS_SAIDA_JSON || '[]'); } catch (e) { out.fotosSaida = []; }
      try { out.fotosChegada = JSON.parse(m.FOTOS_CHEGADA_JSON || '[]'); } catch (e) { out.fotosChegada = []; }
      return out;
    })
    .sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });

  var manutencoes = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO)
    .filter(function(m) { return SGO_UTILS.safe(m.VEICULO_ID) === veiculoId; })
    .sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });

  var despesas = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_DESPESA)
    .filter(function(d) { return SGO_UTILS.safe(d.VEICULO_ID) === veiculoId; })
    .sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });

  var paradas = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_PARADA)
    .filter(function(p) { return SGO_UTILS.safe(p.VEICULO_ID) === veiculoId; })
    .sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });

  return { ok: true, movimentacoes: movimentacoes, manutencoes: manutencoes, despesas: despesas, paradas: paradas };
}

// ------------------------------------------------------------
// ALERTA DE VENCIMENTO DE MANUTENÇÃO (por KM e/ou data — mesmo esquema
// dos Padrões de Referência do Certificado de Calibração)
// ------------------------------------------------------------
function Frota_classificarManutencao_(manutencao, veiculo) {
  var pior = null;
  var prioridade = { VENCIDO: 3, VENCENDO: 2, OK: 1 };
  function considerar(status) {
    if (status && (!pior || prioridade[status] > prioridade[pior])) pior = status;
  }

  if (manutencao.PROXIMA_KM !== '' && manutencao.PROXIMA_KM !== undefined && manutencao.PROXIMA_KM !== null) {
    var faltamKm = Number(manutencao.PROXIMA_KM) - Number(veiculo.KM_ATUAL || 0);
    considerar(faltamKm < 0 ? 'VENCIDO' : (faltamKm <= FROTA_CFG.KM_AVISO_VENCIMENTO ? 'VENCENDO' : 'OK'));
  }

  var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(manutencao.PROXIMA_DATA || '').trim());
  if (m) {
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var dataVenc = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); dataVenc.setHours(0, 0, 0, 0);
    var diasRestantes = Math.ceil((dataVenc.getTime() - hoje.getTime()) / 86400000);
    considerar(diasRestantes < 0 ? 'VENCIDO' : (diasRestantes <= FROTA_CFG.DIAS_AVISO_VENCIMENTO ? 'VENCENDO' : 'OK'));
  }

  return pior || 'SEM_PREVISAO';
}

/** Última manutenção de cada TIPO, por veículo (a mais recente por DATA_CRIADO_EM). */
function Frota_ultimasManutencoesPorVeiculo_() {
  var todas = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO);
  var porVeiculoTipo = {};
  todas.forEach(function(m) {
    var chave = SGO_UTILS.safe(m.VEICULO_ID) + '|' + SGO_UTILS.safe(m.TIPO);
    var atual = porVeiculoTipo[chave];
    if (!atual || String(m.CRIADO_EM || '') > String(atual.CRIADO_EM || '')) porVeiculoTipo[chave] = m;
  });
  return porVeiculoTipo;
}

/** Lista de alertas (VENCENDO/VENCIDO) — usado pela tela + reaproveitado por SGO_Alertas.js pro Dashboard/balão do menu. */
function Frota_apiListarAlertasManutencao(sessionId) {
  Frota_bootstrap_();
  exigirSessao(sessionId);
  return { ok: true, items: Frota_calcularAlertasManutencao_() };
}

function Frota_calcularAlertasManutencao_() {
  // Chamado direto por SGO_Alertas.js (dashboard), sem passar por nenhum
  // wrapper apiXxx que já rodasse bootstrap antes — sem isto, instalação
  // onde ninguém abriu a Frota ainda (ou abriu antes da Fase 2, quando
  // REG_FROTA_DOCUMENTO não existia) quebra a leitura de documentos aqui
  // dentro e o alarme de manutenção inteiro cai em silêncio (try/catch do
  // chamador engole o erro). Idempotente e barato — ver CertCal_garantirTabela_.
  Frota_bootstrap_();
  var veiculos = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function(v) {
    if (SGO_UTILS.safeUpper(v.STATUS) !== 'INATIVO') veiculos[SGO_UTILS.safe(v.ID)] = v;
  });

  var ultimas = Frota_ultimasManutencoesPorVeiculo_();
  var alertas = [];
  Object.keys(ultimas).forEach(function(chave) {
    var m = ultimas[chave];
    var veiculo = veiculos[SGO_UTILS.safe(m.VEICULO_ID)];
    if (!veiculo) return;
    var status = Frota_classificarManutencao_(m, veiculo);
    if (status !== 'VENCENDO' && status !== 'VENCIDO') return;

    var tipoInfo = FROTA_CFG.TIPOS_MANUTENCAO.filter(function(t) { return t.codigo === m.TIPO; })[0];
    var tipoLabel = tipoInfo ? tipoInfo.label : m.TIPO;
    alertas.push({ veiculoId: veiculo.ID, veiculoPlaca: veiculo.PLACA, tipo: m.TIPO, tipoLabel: tipoLabel, status: status, categoria: 'MANUTENCAO', vencimento: SGO_UTILS.safe(m.PROXIMA_DATA) });
  });

  // Documentos do veículo com validade (CRLV, seguro, licenciamento...) —
  // mesmo alarme de manutenção vencida, só que pra papelada. Documento sem
  // VALIDADE preenchida (ex.: nota fiscal, laudo avulso) nunca entra aqui
  // de propósito — não tem prazo pra vencer.
  SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO).forEach(function(doc) {
    var veiculo = veiculos[SGO_UTILS.safe(doc.VEICULO_ID)];
    if (!veiculo) return;
    var m2 = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(doc.VALIDADE || '').trim());
    if (!m2) return;
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var dataVenc = new Date(Number(m2[3]), Number(m2[2]) - 1, Number(m2[1])); dataVenc.setHours(0, 0, 0, 0);
    var diasRestantes = Math.ceil((dataVenc.getTime() - hoje.getTime()) / 86400000);
    var statusDoc = diasRestantes < 0 ? 'VENCIDO' : (diasRestantes <= FROTA_CFG.DIAS_AVISO_VENCIMENTO ? 'VENCENDO' : 'OK');
    if (statusDoc !== 'VENCENDO' && statusDoc !== 'VENCIDO') return;
    alertas.push({ veiculoId: veiculo.ID, veiculoPlaca: veiculo.PLACA, tipo: 'DOC_' + doc.TIPO_DOCUMENTO, tipoLabel: doc.TIPO_DOCUMENTO, status: statusDoc, categoria: 'DOCUMENTO', vencimento: SGO_UTILS.safe(doc.VALIDADE) });
  });

  // CNH dos condutores (Fase 5, 2026-08-25) — mesmo alarme, mas por
  // pessoa, não por veículo. Reaproveita o campo veiculoPlaca como
  // "rótulo do assunto do alerta" pra não obrigar todo consumidor
  // (dashboard/mobile/desktop) a aprender um campo novo — quem lê
  // categoria:'CNH' sabe que ali vai o nome do condutor, não a placa.
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) {
    if (SGO_UTILS.safeUpper(c.STATUS) === 'INATIVO') return;
    var m3 = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(c.CNH_VALIDADE || '').trim());
    if (!m3) return;
    var hoje2 = new Date(); hoje2.setHours(0, 0, 0, 0);
    var dataVenc2 = new Date(Number(m3[3]), Number(m3[2]) - 1, Number(m3[1])); dataVenc2.setHours(0, 0, 0, 0);
    var dias2 = Math.ceil((dataVenc2.getTime() - hoje2.getTime()) / 86400000);
    var statusCnh = dias2 < 0 ? 'VENCIDO' : (dias2 <= FROTA_CFG.DIAS_AVISO_VENCIMENTO ? 'VENCENDO' : 'OK');
    if (statusCnh !== 'VENCENDO' && statusCnh !== 'VENCIDO') return;
    alertas.push({ veiculoId: '', veiculoPlaca: c.NOME, tipo: 'CNH', tipoLabel: 'CNH', status: statusCnh, categoria: 'CNH', vencimento: SGO_UTILS.safe(c.CNH_VALIDADE) });
  });

  // Multa sem condutor vinculado (2026-08-28, achado real: o cruzamento
  // automático não acha condutor quando não há retirada compatível, ou
  // acha mais de uma — a multa fica salva do jeito assim mesmo, sem virar
  // pendência visível pra ninguém resolver). Só entra em ABERTA — multa já
  // paga/recorrida/cancelada não precisa mais de condutor pra nada.
  SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MULTA).forEach(function(multa) {
    if (SGO_UTILS.safeUpper(multa.STATUS) !== 'ABERTA') return;
    if (SGO_UTILS.safe(multa.CONDUTOR_ID)) return;
    var veiculo = veiculos[SGO_UTILS.safe(multa.VEICULO_ID)];
    alertas.push({
      veiculoId: multa.VEICULO_ID, veiculoPlaca: veiculo ? veiculo.PLACA : '',
      tipo: 'MULTA_SEM_CONDUTOR', tipoLabel: 'Multa sem condutor vinculado',
      status: 'VENCIDO', categoria: 'QUALIDADE', vencimento: SGO_UTILS.safe(multa.DATA_INFRACAO)
    });
  });

  return alertas;
}
