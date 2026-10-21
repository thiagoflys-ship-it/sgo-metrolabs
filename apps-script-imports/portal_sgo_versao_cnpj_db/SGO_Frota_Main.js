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
    // 17/10/2026 (Frota simples e rápida): tela inicial do celular em uma chamada
    apiInicioFrota: Frota_apiInicioFrota,
    apiListarVeiculosAtivos: Frota_apiListarVeiculosAtivos,
    apiListarVeiculosTodos: Frota_apiListarVeiculosTodos,
    apiCriarVeiculo: Frota_apiCriarVeiculo,
    apiAtualizarVeiculo: Frota_apiAtualizarVeiculo,
    apiInativarVeiculo: Frota_apiInativarVeiculo,
    apiReativarVeiculo: Frota_apiReativarVeiculo,
    apiListarCondutoresAtivos: Frota_apiListarCondutoresAtivos,
    apiListarCondutoresTodos: Frota_apiListarCondutoresTodos,
    apiCriarCondutor: Frota_apiCriarCondutor,
    apiAtualizarCondutor: Frota_apiAtualizarCondutor,
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
    // 17/10/2026: consulta de despesas (gestão) e levantamento somente leitura (Administrador)
    apiConsultarDespesas: Frota_apiConsultarDespesas,
    apiLevantamentoValoresSuspeitos: Frota_apiLevantamentoValoresSuspeitos,
    apiListarAbastecimentos: Frota_apiListarAbastecimentos,
    apiRegistrarAbastecimento: Frota_apiRegistrarAbastecimento,
    apiExcluirAbastecimento: Frota_apiExcluirAbastecimento,
    apiVerificarNovosEventos: Frota_apiVerificarNovosEventos,
    apiUploadFotoVeiculo: Frota_apiUploadFotoVeiculo,
    // 17/10/2026 (travas do dono): ajuste de KM, conferência de KM divergente e trilha de auditoria — só a gestão
    apiAjustarKm: Frota_apiAjustarKm,
    apiConferirKm: Frota_apiConferirKm,
    apiListarKmAConferir: Frota_apiListarKmAConferir,
    apiListarAuditoria: Frota_apiListarAuditoria,
    // 17/10/2026: rastreador (SGO_Frota_Rastreador.js) — tudo só da gestão; o técnico aciona pela retirada/devolução
    apiListarRastreador: Frota_apiListarRastreador,
    apiRastreadorVincular: Frota_apiRastreadorVincular,
    apiRastreadorConferirComandos: Frota_apiRastreadorConferirComandos,
    apiRastreadorLiberar: Frota_apiRastreadorLiberar,
    apiRastreadorBloquear: Frota_apiRastreadorBloquear,
    apiRastreadorConferirAlerta: Frota_apiRastreadorConferirAlerta,
    apiRastreadorAtualizarAgora: Frota_apiRastreadorAtualizarAgora,
    // 19/10/2026: gestão e melhoria (SGO_Frota_Gestao.js) — Kanban dos casos, 5 Porquês, 5W2H/PDCA e indicadores; só a gestão
    apiGestaoKanban: Frota_apiGestaoKanban,
    apiGestaoIndicadores: Frota_apiGestaoIndicadores,
    apiGestaoAbrirCaso: Frota_apiGestaoAbrirCaso,
    apiGestaoDescartar: Frota_apiGestaoDescartar,
    apiGestaoSalvarAnalise: Frota_apiGestaoSalvarAnalise,
    apiGestaoCriarPlano: Frota_apiGestaoCriarPlano,
    apiGestaoAdicionarAcao: Frota_apiGestaoAdicionarAcao,
    apiGestaoConcluir: Frota_apiGestaoConcluir,
    // 20/10/2026: rastreamento (SGO_Frota_Rastreamento.js e SGO_Frota_RastreamentoGestao.js). Mapa, rotas, combustível,
    // Gantt, copiloto e relatórios só da gestão; pedidos de comprovante: o próprio condutor vê e responde os dele.
    apiRastrMapa: Frota_apiRastrMapa,
    apiRastrRota: Frota_apiRastrRota,
    apiRastrRetiradas: Frota_apiRastrRetiradas,
    apiRastrCombustivel: Frota_apiRastrCombustivel,
    apiRastrCapacidadeTanque: Frota_apiRastrCapacidadeTanque,
    apiRastrPedirComprovante: Frota_apiRastrPedirComprovante,
    apiRastrCancelarPedido: Frota_apiRastrCancelarPedido,
    apiRastrMeusPedidos: Frota_apiRastrMeusPedidos,
    apiRastrEnviarComprovante: Frota_apiRastrEnviarComprovante,
    apiRastrConfig: Frota_apiRastrConfig,
    apiRastrConsultas: Frota_apiRastrConsultas,
    apiRastrGantt: Frota_apiRastrGantt,
    apiRastrCopiloto: Frota_apiRastrCopiloto,
    apiRastrCopilotoDecidir: Frota_apiRastrCopilotoDecidir,
    apiRastrRelatorio: Frota_apiRastrRelatorio,
    // 20/10/2026: reservas de veículo (SGO_Frota_Reservas.js). Agenda, livres, reservar, cancelar e trocar: toda a equipe
    // (as regras de quem pode o quê ficam lá); indicadores, regras e relatório: só a gestão.
    apiReservaPainel: Frota_apiReservaPainel,
    apiReservaLivres: Frota_apiReservaLivres,
    apiReservaCriar: Frota_apiReservaCriar,
    apiReservaCancelar: Frota_apiReservaCancelar,
    apiReservaTrocarVeiculo: Frota_apiReservaTrocarVeiculo,
    apiReservaIndicadores: Frota_apiReservaIndicadores,
    apiReservaConfig: Frota_apiReservaConfig,
    apiReservaRelatorio: Frota_apiReservaRelatorio
    // 17/10/2026: apiDiagLogTempoCliente (medidor provisório de 09/09) removido por decisão do dono.
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  var resultado = allow[fn](req.sessionId, payload);
  // 17/10/2026: gravação que muda pendência (CNH, documentos, manutenção, multa, retirada)
  // avisa a central de alertas, para o Início atualizar na hora.
  if (!/^api(Ping|Listar|Situacao|Inicio|Contexto|Historico|Verificar|Consultar|Levantamento|GerarRelatorio|GestaoKanban|GestaoIndicadores|RastrMapa|RastrRota|RastrRetiradas|RastrCombustivel|RastrMeusPedidos|RastrConsultas|RastrGantt|RastrCopiloto(?!Decidir)|RastrRelatorio|ReservaPainel|ReservaLivres|ReservaIndicadores|ReservaRelatorio)/.test(fn) && typeof SGO_Pendencias_invalidar_ === 'function') {
    try { SGO_Pendencias_invalidar_(); } catch (eInv) {}
  }
  return resultado;
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

// Pente fino 16/10/2026: login de CLIENTE listava veículos e condutores
// (com telefone e CNH). A Frota é da equipe interna — qualquer perfil da
// equipe entra (retirada/devolução), cliente não.
function Frota_exigirEquipe_(sessionId) {
  var sessao = exigirSessao(sessionId);
  if (SGO_UTILS.safeUpper(sessao && sessao.perfil) === 'CLIENTE') {
    throw new Error('A Frota é de uso exclusivo da equipe interna.');
  }
  return sessao;
}

// Pente fino 16/10/2026: SGO_UTILS.toNumber apaga todo ponto antes de
// converter, então "350.90" virava 35090 e "12345.5" km virava 123455.
// Aqui: número já convertido passa direto; com vírgula, ponto é milhar
// ("1.234,56"); sem vírgula, ponto só é milhar no formato 1.234 / 12.345.678,
// senão é a casa decimal ("45.6").
function Frota_num_(v, padrao) {
  if (typeof v === 'number') return isFinite(v) ? v : padrao;
  var s = String(v === null || v === undefined ? '' : v).replace(/R\$/gi, '').replace(/\s+/g, '');
  if (!s) return padrao;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  var n = Number(s);
  return isFinite(n) ? n : padrao;
}

// Datas/horas gravadas pela planilha antiga podem voltar como Date ou como
// texto ISO ("2026-10-15T00:00:00", "1899-12-30T10:44:00"). Normaliza para
// o formato que o módulo grava (dd/mm/aaaa e hh:mm) antes de comparar.
function Frota_textoData_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return ('0' + v.getDate()).slice(-2) + '/' + ('0' + (v.getMonth() + 1)).slice(-2) + '/' + v.getFullYear();
  }
  var s = String(v || '').trim();
  var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso && iso[1] !== '1899') return iso[3] + '/' + iso[2] + '/' + iso[1];
  return s;
}

function Frota_textoHora_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return ('0' + v.getHours()).slice(-2) + ':' + ('0' + v.getMinutes()).slice(-2);
  var s = String(v || '').trim();
  var iso = /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/.exec(s);
  return iso ? iso[1] + ':' + iso[2] : s;
}

/** Data de validade/vencimento (dd/mm/aaaa ou ISO) como Date à meia-noite, ou null. */
function Frota_dataDia_(v) {
  var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(Frota_textoData_(v));
  if (!m) return null;
  var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Dias de hoje até a data (negativo = já passou), ou null se a data não for válida. */
function Frota_diasAte_(v) {
  var d = Frota_dataDia_(v);
  if (!d) return null;
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - hoje.getTime()) / 86400000);
}

// Pente fino 16/10/2026 (regra do dono: nunca apagar dado): "Excluir"
// abastecimento/documento/multa passa a marcar EXCLUIDO_EM/EXCLUIDO_POR em vez
// de remover a linha. Toda leitura do módulo usa esta função.
function Frota_registrosValidos_(aba) {
  return SGO_DATA.getAll(aba).filter(function(r) { return !SGO_UTILS.safe(r.EXCLUIDO_EM); });
}

function Frota_marcarExcluido_(aba, id, usuario) {
  SGO_DATA.update(aba, id, { EXCLUIDO_EM: SGO_UTILS.nowIso(), EXCLUIDO_POR: SGO_UTILS.safe(usuario) });
}


// A identidade vem da sessão validada, nunca do nome exibido no formulário.
function Frota_apiContextoOperacional(sessionId) {
  var sessao = Frota_exigirEquipe_(sessionId);
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
  var sessao = Frota_exigirEquipe_(sessionId);
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

// 16/10/2026 (achado do agente do núcleo): em base onde a Frota nunca foi aberta
// as abas não existem, e a situação da frota (tela inicial) e os avisos ao entrar
// (Qualidade) falhavam com "Aba não encontrada: CAD_CONDUTORES" a cada login.
// Estas leituras não criam abas (são consultas periódicas): aba ausente = lista vazia.
function Frota_lerSeExistir_(aba) {
  try { if (!SGO_DATA.getDB().getSheetByName(aba)) return []; } catch (e) { return []; }
  return SGO_DATA.getAll(aba);
}

function Frota_veiculosComSituacao_() {
  var abertos = {};
  var condutores = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });
  Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).filter(Frota_movimentoAberto_).forEach(function(m) {
    abertos[SGO_UTILS.safe(m.VEICULO_ID)] = m;
  });
  return Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).map(function(v) {
    var m = abertos[SGO_UTILS.safe(v.ID)];
    var status = SGO_UTILS.safeUpper(v.STATUS);
    var situacao = m ? 'EM_USO' : (status === 'ATIVO' || status === 'DISPONIVEL' ? 'DISPONIVEL' : status || 'INDISPONIVEL');
    var c = m && condutores[SGO_UTILS.safe(m.CONDUTOR_ID)];
    return Object.assign({}, v, { STATUS: m ? 'EM_USO' : status, SITUACAO: situacao,
      CONDUTOR_NOME: m ? (c && c.NOME || 'Condutor não localizado') : '',
      CONDUTOR_ID: m ? SGO_UTILS.safe(m.CONDUTOR_ID) : '', CONDUTOR_USUARIO_ID: m ? SGO_UTILS.safe(c && c.USUARIO_ID) : '',
      MOVIMENTACAO_ID: m ? m.ID : '', DATA_SAIDA: m ? Frota_textoData_(m.DATA_SAIDA) : '', HORA_SAIDA: m ? Frota_textoHora_(m.HORA_SAIDA) : '',
      KM_SAIDA: m ? m.KM_SAIDA : '', FINALIDADE: m ? m.FINALIDADE : '' });
  });
}

function Frota_apiSituacaoFrota(sessionId) {
  Frota_exigirEquipe_(sessionId);
  // Consulta periódica: não reformatar dezenas de colunas a cada atualização.
  // O bootstrap continua nas operações de abertura/cadastro do módulo.
  var items = Frota_veiculosComSituacao_();
  return { ok: true, items: items, atualizadoEm: SGO_UTILS.nowIso() };
}

/**
 * Tela inicial da Frota em UMA chamada (17/10/2026, Frota simples e rápida).
 * Antes o celular fazia 2 chamadas ao abrir e mais 3 ao tocar em "Retirar"
 * (apiPing, apiListarVeiculosAtivos, apiContextoOperacional); cada uma custa a
 * latência inteira da rede do celular. Aqui vem tudo junto: veículos com
 * situação e miniatura, retiradas em aberto (as minhas marcadas), contexto do
 * condutor, grupos do checklist, tipos de combustível e alertas de manutenção.
 * Só leitura (não invalida a central de pendências).
 */
function Frota_apiInicioFrota(sessionId) {
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_bootstrap_();
  var gestor = isAdminSession(sessionId);
  var meuId = SGO_UTILS.safe(sessao.userId);
  var condutoresAtivos = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).filter(function(c) { return SGO_UTILS.safeUpper(c.STATUS) !== 'INATIVO'; });
  var meuCondutor = condutoresAtivos.filter(function(c) { return SGO_UTILS.safe(c.USUARIO_ID) === meuId; })[0] || null;
  var veiculos = Frota_veiculosComSituacao_()
    .filter(function(v) { return SGO_UTILS.safeUpper(v.STATUS) !== 'INATIVO'; })
    .sort(function(a, b) { return SGO_UTILS.safe(a.PLACA).localeCompare(SGO_UTILS.safe(b.PLACA)); });
  var enxuto = veiculos.map(function(v) {
    return { id: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), modelo: SGO_UTILS.safe(v.MODELO), marca: SGO_UTILS.safe(v.MARCA), cor: SGO_UTILS.safe(v.COR),
      km: Frota_num_(v.KM_ATUAL, 0), situacao: v.SITUACAO, foto: SGO_UTILS.safe(v.FOTO_MINIATURA_LINK) };
  });
  var emAndamento = veiculos.filter(function(v) { return v.MOVIMENTACAO_ID; }).map(function(v) {
    return { id: SGO_UTILS.safe(v.MOVIMENTACAO_ID), veiculoId: SGO_UTILS.safe(v.ID), veiculoPlaca: SGO_UTILS.safe(v.PLACA), veiculoModelo: SGO_UTILS.safe(v.MODELO),
      condutorNome: SGO_UTILS.safe(v.CONDUTOR_NOME), condutorId: SGO_UTILS.safe(v.CONDUTOR_ID), condutorUsuarioId: SGO_UTILS.safe(v.CONDUTOR_USUARIO_ID),
      dataSaida: v.DATA_SAIDA, horaSaida: v.HORA_SAIDA, kmSaida: Frota_num_(v.KM_SAIDA, 0), finalidade: SGO_UTILS.safe(v.FINALIDADE),
      minha: !!meuId && SGO_UTILS.safe(v.CONDUTOR_USUARIO_ID) === meuId, foto: SGO_UTILS.safe(v.FOTO_MINIATURA_LINK) };
  });
  var alertas = [];
  try { alertas = Frota_calcularAlertasManutencao_(); } catch (eAl) { console.error('Frota início, alertas: ' + ((eAl && eAl.message) || eAl)); }
  // 20/10/2026 (reservas): próxima reserva de cada veículo e as minhas, para a tela de retirada respeitar a reserva.
  var reservas = typeof FrotaRes_resumoInicio_ === 'function' ? FrotaRes_resumoInicio_({ userId: meuId, gestao: gestor }, meuCondutor ? SGO_UTILS.safe(meuCondutor.ID) : '') : null;
  if (reservas) enxuto.forEach(function (v) { v.reserva = reservas.porVeiculo[v.id] || null; });
  return {
    ok: true, agora: SGO_UTILS.nowIso(), gestor: gestor,
    condutor: meuCondutor ? { id: SGO_UTILS.safe(meuCondutor.ID), nome: SGO_UTILS.safe(meuCondutor.NOME) } : null,
    condutores: (gestor ? condutoresAtivos : (meuCondutor ? [meuCondutor] : [])).map(function(c) { return { id: SGO_UTILS.safe(c.ID), nome: SGO_UTILS.safe(c.NOME) }; }),
    veiculos: enxuto, emAndamento: emAndamento,
    gruposChecklist: FROTA_CFG.GRUPOS_CHECKLIST, tiposCombustivel: FROTA_CFG.TIPOS_COMBUSTIVEL,
    alertas: alertas,
    reservas: reservas ? { minhas: reservas.minhas, folgaMin: reservas.folgaMin, antecipacaoMin: reservas.antecipacaoMin, agoraData: reservas.agoraData, agoraHora: reservas.agoraHora, fimExpediente: reservas.fimExpediente } : null,
    // 20/10/2026: aviso ao condutor de que o veículo é rastreado durante o uso (LGPD); null com o rastreador desligado
    rastreamento: typeof FrotaR_avisoRetirada_ === 'function' ? FrotaR_avisoRetirada_() : null
  };
}

/** Miniatura do veículo (foto da última vistoria, reduzida no celular): só um link de arquivo já enviado. */
function Frota_linkMiniatura_(v) {
  var s = String(v || '').trim();
  return /^(https?:\/\/|\/arquivos\/)/.test(s) && s.length < 500 ? s : '';
}

/**
 * 17/10/2026: "deu erro, tentei de novo e disse que já foi retirado". A primeira tentativa tinha sido gravada e só a
 * resposta se perdeu (sinal fraco). Se a mesma pessoa repete o pedido em até 30 min, é sucesso com o registro que já
 * existe — nunca "já está retirado" para quem é o próprio dono da retirada.
 */
var FROTA_REPETICAO_MIN = 30;
function Frota_feitoPorMimHaPouco_(m, sessao, campoPor, campoEm) {
  if (SGO_UTILS.safe(m[campoPor]) !== SGO_UTILS.safe(sessao.userId) || !SGO_UTILS.safe(sessao.userId)) return false;
  var em = new Date(String(m[campoEm] || ''));
  return !isNaN(em.getTime()) && (Date.now() - em.getTime()) <= FROTA_REPETICAO_MIN * 60000;
}
function Frota_minhaRetiradaRecente_(veiculoId, sessao) {
  return SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).filter(function(m) {
    return SGO_UTILS.safe(m.VEICULO_ID) === SGO_UTILS.safe(veiculoId) && Frota_movimentoAberto_(m) &&
      Frota_feitoPorMimHaPouco_(m, sessao, 'REGISTRADO_SAIDA_POR_ID', 'CRIADO_EM');
  })[0] || null;
}
function Frota_respostaRetiradaJaFeita_(m, placa) {
  return { ok: true, jaRegistrada: true, movimentacaoId: m.ID, data: Frota_textoData_(m.DATA_SAIDA), hora: Frota_textoHora_(m.HORA_SAIDA),
    registroPelaGestao: SGO_UTILS.safe(m.REGISTRO_GESTAO_SAIDA) === 'SIM', kmDivergencia: Frota_num_(m.KM_DIVERGENCIA_SAIDA, 0),
    mensagem: 'Sua retirada do veículo ' + placa + ' já estava registrada (saída ' + Frota_textoData_(m.DATA_SAIDA) + ' às ' + Frota_textoHora_(m.HORA_SAIDA) + '). Nada foi registrado em dobro.' };
}

function Frota_respostaDevolucaoJaFeita_(m) {
  var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, m.VEICULO_ID) || {};
  return { ok: true, jaRegistrada: true, movimentacaoId: m.ID, data: Frota_textoData_(m.DATA_CHEGADA), hora: Frota_textoHora_(m.HORA_CHEGADA),
    mensagem: 'Sua devolução do veículo ' + (SGO_UTILS.safe(v.PLACA) || '') + ' já estava registrada (chegada ' + Frota_textoData_(m.DATA_CHEGADA) + ' às ' + Frota_textoHora_(m.HORA_CHEGADA) + '). Nada foi registrado em dobro.' };
}

function Frota_validarVeiculoRetirada_(veiculo) {
  if (!veiculo) throw new Error('Veículo não encontrado.');
  var aberto = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).filter(function(m) {
    return SGO_UTILS.safe(m.VEICULO_ID) === SGO_UTILS.safe(veiculo.ID) && Frota_movimentoAberto_(m);
  })[0];
  if (aberto) {
    var c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, aberto.CONDUTOR_ID) || {};
    var nome = SGO_UTILS.safe(c.NOME) || 'outro condutor';
    throw new Error('O veículo ' + veiculo.PLACA + ' já está retirado por ' + nome + ' desde ' + Frota_textoData_(aberto.DATA_SAIDA) + ' ' + Frota_textoHora_(aberto.HORA_SAIDA) +
      '. Escolha outro veículo. Se ele já voltou, ' + nome + ' (ou a gestão) precisa registrar a devolução antes de uma nova retirada.');
  }
  if (SGO_UTILS.safeUpper(veiculo.STATUS) === 'EM_USO') throw new Error('O veículo ' + veiculo.PLACA + ' está marcado como em uso. Atualize a tela; se continuar, avise a gestão.');
  if (['ATIVO', 'DISPONIVEL'].indexOf(SGO_UTILS.safeUpper(veiculo.STATUS)) < 0) throw new Error('O veículo ' + veiculo.PLACA + ' está indisponível para retirada (situação: ' + SGO_UTILS.safe(veiculo.STATUS).toLowerCase() + '). Escolha outro veículo ou fale com a gestão.');
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
// 17/10/2026: duas chamadas simultâneas na primeira abertura criavam a mesma aba
// ("Já existe uma página chamada CAD_CONDUTORES"). Trava + nova conferência dentro dela.
var FROTA_BOOTSTRAP_OK = false;
function Frota_bootstrap_() {
  if (FROTA_BOOTSTRAP_OK) return;
  var lock = LockService.getScriptLock();
  var dono = !lock.hasLock();
  if (dono) lock.waitLock(30000);
  try {
    Frota_bootstrapSemTrava_();
    FROTA_BOOTSTRAP_OK = true;
  } finally { if (dono) lock.releaseLock(); }
}

function Frota_bootstrapSemTrava_() {
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
  // Exclusão sem apagar a linha (16/10/2026) — ver Frota_registrosValidos_.
  [SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO, SGO_CFG.SHEETS.REG_FROTA_MULTA].forEach(function(aba) {
    CertCal_garantirColuna_(aba, 'EXCLUIDO_EM');
    CertCal_garantirColuna_(aba, 'EXCLUIDO_POR');
  });
  // Travas de 17/10/2026 (decisão do dono): quem registrou, registro pela gestão,
  // justificativa, KM divergente com foto do painel e conferência. Só colunas novas.
  FROTA_COLUNAS_TRAVAS.forEach(function(col) { CertCal_garantirColuna_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, col); });
  CertCal_garantirTabela_(FROTA_ABA_AUDITORIA, FROTA_COLUNAS_AUDITORIA);
  // 17/10/2026 (Frota simples): miniatura do veículo para a escolha no celular (foto da última vistoria, reduzida). Só coluna nova.
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_VEICULOS, 'FOTO_MINIATURA_LINK');
  // Rastreador (17/10/2026): vínculo no veículo, hodômetro na movimentação, comandos e alertas (SGO_Frota_Rastreador.js).
  if (typeof Rastreador_bootstrapSemTrava_ === 'function') Rastreador_bootstrapSemTrava_();
  // 20/10/2026 (rastreamento): pedidos de comprovante, trilha de consultas, HORA/ORIGEM no abastecimento e capacidade do tanque. Só colunas e tabelas novas.
  if (typeof FrotaR_garantirAbas_ === 'function') FrotaR_garantirAbas_();
  // 20/10/2026 (reservas): tabelas das reservas, eventos e avisos; devolução prevista e reserva na movimentação. Só colunas e tabelas novas.
  if (typeof FrotaRes_garantirAbas_ === 'function') FrotaRes_garantirAbas_();
}

// ------------------------------------------------------------
// TRAVAS DE RETIRADA/DEVOLUÇÃO (17/10/2026, decisão do dono)
//  - devolução: só o condutor da retirada; a gestão registra no lugar dele
//    com justificativa, marca, auditoria e aviso ao condutor;
//  - retirada em nome de outro condutor: só a gestão, mesma regra;
//  - data/hora: equipe = hora do servidor; gestão pode informar outra
//    (diferença acima de 10 min exige justificativa; futuro acima de 5 min é recusado);
//  - KM diferente do registrado (ou rodado absurdo) não trava: exige foto do
//    painel, grava a diferença e avisa a gestão para conferir;
//  - ajuste de KM do veículo só pela gestão, com justificativa e trilha.
// ------------------------------------------------------------
var FROTA_ABA_AUDITORIA = 'REG_FROTA_AUDITORIA';
var FROTA_COLUNAS_AUDITORIA = ['ID', 'QUANDO', 'ACAO', 'VEICULO_ID', 'PLACA', 'MOVIMENTACAO_ID', 'CONDUTOR_ID', 'CONDUTOR_NOME',
  'USUARIO_ID', 'USUARIO_NOME', 'PERFIL', 'CAMPO', 'VALOR_ANTES', 'VALOR_DEPOIS', 'JUSTIFICATIVA', 'DETALHE', 'CRIADO_EM'];
var FROTA_COLUNAS_TRAVAS = [
  'REGISTRADO_SAIDA_POR_ID', 'REGISTRADO_SAIDA_POR_NOME', 'REGISTRO_GESTAO_SAIDA', 'REGISTRO_GESTAO_SAIDA_EM', 'JUSTIFICATIVA_SAIDA', 'MOTIVO_GESTAO_SAIDA',
  'KM_VEICULO_NA_SAIDA', 'KM_DIVERGENCIA_SAIDA', 'FOTOS_PAINEL_SAIDA_JSON', 'KM_CONFERIDO_SAIDA_EM', 'KM_CONFERIDO_SAIDA_POR',
  'REGISTRADO_CHEGADA_POR_ID', 'REGISTRADO_CHEGADA_POR_NOME', 'REGISTRO_GESTAO_CHEGADA', 'REGISTRO_GESTAO_CHEGADA_EM', 'JUSTIFICATIVA_CHEGADA', 'MOTIVO_GESTAO_CHEGADA',
  'KM_ALERTA_CHEGADA', 'FOTOS_PAINEL_CHEGADA_JSON', 'KM_CONFERIDO_CHEGADA_EM', 'KM_CONFERIDO_CHEGADA_POR'
];
var FROTA_JUSTIFICATIVA_MIN = 15;
var FROTA_TOLERANCIA_HORARIO_MIN = 10;
var FROTA_TOLERANCIA_FUTURO_MIN = 5;
var FROTA_MEDIA_MAXIMA_KMH = 120;
var FROTA_KM_MAXIMO_RETIRADA = 1500;
var FROTA_HORAS_RETIRADA_ESQUECIDA = 12;
var FROTA_DIAS_AVISO_REGISTRO_GESTAO = 7;
var FROTA_TEXTO_GESTAO = 'a gestão (Administrador, Gestor ou Diretoria)';

/** Mesma regra de Frota_exigirGestor_ (ADMIN, GESTOR, DIRETORIA). */
function Frota_ehGestao_(sessionId) {
  return isAdminSession(sessionId);
}

/** KM em pt-BR ("12.650"). */
function Frota_kmTexto_(n) {
  var v = Math.round(Number(n) || 0);
  return (v < 0 ? '-' : '') + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Agora no horário de Brasília, no mesmo formato (e na mesma régua) das datas digitadas. */
function Frota_agoraSP_() {
  var agora = new Date();
  var data = Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy');
  var hora = Utilities.formatDate(agora, 'America/Sao_Paulo', 'HH:mm');
  return { data: data, hora: hora, quando: Frota_parseDataHora_(data, hora) };
}

function Frota_duracaoTexto_(min) {
  min = Math.round(Math.abs(Number(min) || 0));
  if (min < 60) return min + (min === 1 ? ' minuto' : ' minutos');
  var h = Math.floor(min / 60), m = min % 60;
  if (h < 48) return h + (h === 1 ? ' hora' : ' horas') + (m ? ' e ' + m + ' min' : '');
  var d = Math.floor(h / 24);
  return d + ' dias e ' + (h % 24) + ' h';
}

/**
 * Data/hora do registro. Quem não é gestão: sempre a hora do servidor (o que vier
 * no payload é ignorado). Gestão: o que informar (vazio = agora); futuro acima de
 * 5 min é recusado; diferença acima de 10 min marca "retroativo" (exige justificativa).
 */
function Frota_quandoRegistro_(gestao, data, hora, rotulo) {
  var agora = Frota_agoraSP_();
  if (!gestao || (!String(data || '').trim() && !String(hora || '').trim())) {
    return { data: agora.data, hora: agora.hora, quando: agora.quando, retroativo: false, difMin: 0, horaDoServidor: true };
  }
  var q = Frota_dataHoraMovimento_(String(data || '').trim() || agora.data, String(hora || '').trim() || agora.hora, rotulo);
  var difMin = (q.quando.getTime() - agora.quando.getTime()) / 60000;
  if (difMin > FROTA_TOLERANCIA_FUTURO_MIN) {
    throw new Error('A data/hora de ' + rotulo + ' (' + q.data + ' ' + q.hora + ') está no futuro. Agora são ' + agora.hora + ' de ' + agora.data +
      ' (horário de Brasília). Corrija a data/hora ou deixe os campos vazios para usar a hora atual.');
  }
  return { data: q.data, hora: q.hora, quando: q.quando, retroativo: Math.abs(difMin) > FROTA_TOLERANCIA_HORARIO_MIN, difMin: difMin, horaDoServidor: false };
}

/** Justificativa obrigatória (mínimo de 15 caracteres), com o motivo de ser exigida. */
function Frota_exigirJustificativa_(texto, motivos, exemplo) {
  var j = String(texto || '').replace(/\s+/g, ' ').trim();
  if (j.length < FROTA_JUSTIFICATIVA_MIN) {
    throw new Error('Justificativa obrigatória: ' + motivos.join('; ') + '. Escreva no campo "Justificativa" o motivo (mínimo de ' +
      FROTA_JUSTIFICATIVA_MIN + ' caracteres; foram ' + j.length + '), por exemplo: "' + (exemplo || 'condutor esqueceu de registrar, confirmado por telefone') + '".');
  }
  return j.slice(0, 500);
}

/** Fotos do painel já enviadas (links) ou, em último caso, enviadas cruas no pedido. */
function Frota_fotosPainel_(payload, placa) {
  var lista = Array.isArray(payload.fotosPainelSalvas) ? payload.fotosPainelSalvas : Frota_uploadFotos_(placa, payload.fotosPainel);
  return lista.filter(function(f) { return f && f.link; }).map(function(f) { return { link: String(f.link), legenda: String(f.legenda || 'Painel (odômetro)').trim() }; });
}

/** Linha na trilha de auditoria da Frota (REG_FROTA_AUDITORIA) + SGO_DATA.log. Nunca derruba a ação principal. */
function Frota_auditar_(sessao, o) {
  try {
    var reg = SGO_DATA.normalizarObjetoParaSheet(FROTA_ABA_AUDITORIA, SGO_DATA.gerarRegistroBase({
      QUANDO: Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'),
      ACAO: o.acao, VEICULO_ID: o.veiculoId || '', PLACA: o.placa || '', MOVIMENTACAO_ID: o.movimentacaoId || '',
      CONDUTOR_ID: o.condutorId || '', CONDUTOR_NOME: o.condutorNome || '',
      USUARIO_ID: SGO_UTILS.safe(sessao && sessao.userId), USUARIO_NOME: SGO_UTILS.safe(sessao && (sessao.nome || sessao.usuario)),
      PERFIL: SGO_UTILS.safeUpper(sessao && sessao.perfil),
      CAMPO: o.campo || '', VALOR_ANTES: o.antes === undefined ? '' : String(o.antes), VALOR_DEPOIS: o.depois === undefined ? '' : String(o.depois),
      JUSTIFICATIVA: o.justificativa || '', DETALHE: String(o.detalhe || '').slice(0, 1000)
    }));
    SGO_DATA.insert(FROTA_ABA_AUDITORIA, reg);
  } catch (e) { console.error('Frota auditoria: ' + ((e && e.message) || e)); }
  try { SGO_DATA.log('FROTA_' + o.acao, SGO_UTILS.safe(sessao && sessao.usuario), String(o.detalhe || o.acao).slice(0, 480), 'FROTA'); } catch (e2) {}
}

/**
 * Aviso ao condutor (no SGO+ o aviso aparece na central de pendências). 21/10/2026 (matriz de avisos, S33/S34): é informativo,
 * então vai no e-mail de resumo do dia e sem WhatsApp (antes saía WhatsApp a qualquer hora, sem olhar o vínculo).
 */
function Frota_avisarCondutor_(condutor, sessao, titulo, texto, refId, evento) {
  var uid = SGO_UTILS.safe(condutor && condutor.USUARIO_ID);
  if (!uid || uid === SGO_UTILS.safe(sessao && sessao.userId) || typeof SGO_notificar_ !== 'function') return null;
  try {
    return SGO_notificar_({ usuarios: [uid], titulo: titulo, texto: texto, canais: ['sgo', 'email'], origem: 'FROTA', refId: refId, evento: evento || 'S33' });
  } catch (e) { console.error('Frota aviso: ' + ((e && e.message) || e)); return null; }
}

/** Última devolução registrada do veículo (uma retirada retroativa não pode começar antes dela). */
function Frota_ultimaChegadaVeiculo_(veiculoId) {
  var ultima = null;
  SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function(m) {
    if (SGO_UTILS.safe(m.VEICULO_ID) !== SGO_UTILS.safe(veiculoId) || SGO_UTILS.safeUpper(m.STATUS) !== 'FINALIZADO') return;
    var q = Frota_parseDataHora_(m.DATA_CHEGADA, m.HORA_CHEGADA);
    if (q && (!ultima || q.getTime() > ultima.quando.getTime())) ultima = { quando: q, data: Frota_textoData_(m.DATA_CHEGADA), hora: Frota_textoHora_(m.HORA_CHEGADA) };
  });
  return ultima;
}

/**
 * KM da devolução fora do razoável para o tempo da retirada: mais de 1.500 km,
 * ou média acima de 120 km/h (tempo mínimo considerado: 15 minutos). Devolve o motivo ou ''.
 */
function Frota_kmChegadaAbsurdo_(kmSaida, kmChegada, saida, chegada) {
  var rodado = Number(kmChegada) - Number(kmSaida);
  if (!(rodado > 0)) return '';
  if (rodado > FROTA_KM_MAXIMO_RETIRADA) return 'rodou ' + Frota_kmTexto_(rodado) + ' km numa retirada (acima de ' + Frota_kmTexto_(FROTA_KM_MAXIMO_RETIRADA) + ' km)';
  if (!saida || !chegada) return '';
  var horas = Math.max((chegada.getTime() - saida.getTime()) / 3600000, 0.25);
  var media = rodado / horas;
  if (media > FROTA_MEDIA_MAXIMA_KMH) {
    return 'rodou ' + Frota_kmTexto_(rodado) + ' km em ' + Frota_duracaoTexto_((chegada.getTime() - saida.getTime()) / 60000) +
      ' (média de ' + Frota_kmTexto_(media) + ' km/h, acima de ' + FROTA_MEDIA_MAXIMA_KMH + ' km/h)';
  }
  return '';
}

// ------------------------------------------------------------
// VEÍCULOS
// ------------------------------------------------------------
function Frota_apiListarVeiculosAtivos(sessionId) {
  Frota_bootstrap_();
  Frota_exigirEquipe_(sessionId);
  var itens = Frota_veiculosComSituacao_()
    .filter(function(v) { return SGO_UTILS.safeUpper(v.STATUS) !== 'INATIVO'; })
    .sort(function(a, b) { return SGO_UTILS.safe(a.PLACA).localeCompare(SGO_UTILS.safe(b.PLACA)); });
  return { ok: true, items: itens };
}

function Frota_apiListarVeiculosTodos(sessionId) {
  Frota_bootstrap_();
  Frota_exigirEquipe_(sessionId);
  var itens = Frota_veiculosComSituacao_()
    .sort(function(a, b) { return SGO_UTILS.safe(a.PLACA).localeCompare(SGO_UTILS.safe(b.PLACA)); });
  return { ok: true, items: itens };
}

function Frota_apiCriarVeiculo(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
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
      KM_ATUAL: Frota_num_(payload.kmAtual, 0),
      STATUS: 'ATIVO'
    })
  );
  SGO_DATA.insert(SGO_CFG.SHEETS.CAD_VEICULOS, registro);
  SGO_DATA.log('FROTA_VEICULO_CRIAR', sessao.usuario, 'Veículo criado: ' + placa, 'FROTA');
  return { ok: true, item: registro };
}

function Frota_apiAtualizarVeiculo(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
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

  var kmAtual = payload.kmAtual !== undefined && payload.kmAtual !== '' ? Frota_num_(payload.kmAtual, NaN) : Frota_num_(atual.KM_ATUAL, 0);
  if (!isFinite(kmAtual) || kmAtual < 0) throw new Error('KM atual inválido.');
  // 17/10/2026 (decisão do dono): mudar o KM só pelo "Ajustar KM", com justificativa e trilha.
  if (kmAtual !== Frota_num_(atual.KM_ATUAL, 0)) {
    throw new Error('O KM do veículo não é alterado por aqui. Use o botão "Ajustar KM" (Frota > Veículos e condutores), que pede a justificativa e grava o valor antigo e o novo na trilha de auditoria.');
  }

  SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, id, {
    PLACA: placa,
    MODELO: SGO_UTILS.safe(payload.modelo || atual.MODELO),
    MARCA: SGO_UTILS.safe(payload.marca || atual.MARCA),
    ANO: SGO_UTILS.safe(payload.ano || atual.ANO),
    COR: SGO_UTILS.safe(payload.cor || atual.COR)
  });
  SGO_DATA.log('FROTA_VEICULO_ATUALIZAR', sessao.usuario, 'Veículo atualizado ID=' + id + ' (placa=' + placa + ', km=' + kmAtual + ')', 'FROTA');
  // 17/10/2026: ID do dispositivo no rastreador (mesma regra e trilha do painel Rastreador).
  var rastreador = null;
  if (payload.rastreadorDeviceId !== undefined && typeof Rastreador_vincular_ === 'function' &&
      String(payload.rastreadorDeviceId || '').trim() !== SGO_UTILS.safe(atual.RASTREADOR_DEVICE_ID)) {
    rastreador = Rastreador_vincular_(sessao, id, payload.rastreadorDeviceId);
  }
  return { ok: true, rastreador: rastreador };
}

function Frota_apiInativarVeiculo(sessionId, payload) {
  Frota_bootstrap_();
  Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  var id = SGO_UTILS.safe((payload || {}).id);
  if (!SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, id)) throw new Error('Veículo não encontrado.');
  // 16/10/2026: inativar com retirada aberta deixava a devolução reativar o
  // veículo sozinha, sem ninguém perceber.
  var emUso = Frota_veiculosComSituacao_().filter(function(v) { return SGO_UTILS.safe(v.ID) === id && v.SITUACAO === 'EM_USO'; })[0];
  if (emUso) throw new Error('Este veículo está em uso (retirado por ' + (emUso.CONDUTOR_NOME || 'condutor não localizado') + '). Registre a devolução em "Retiradas em andamento" e depois inative.');
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, id, { STATUS: 'INATIVO' });
  return { ok: true };
}

function Frota_apiReativarVeiculo(sessionId, payload) {
  Frota_bootstrap_();
  Frota_exigirEquipe_(sessionId);
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
  Frota_exigirEquipe_(sessionId);
  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES)
    .filter(function(c) { return SGO_UTILS.safeUpper(c.STATUS) !== 'INATIVO'; })
    .sort(function(a, b) { return SGO_UTILS.safe(a.NOME).localeCompare(SGO_UTILS.safe(b.NOME)); });
  return { ok: true, items: Frota_condutoresParaPerfil_(sessionId, itens) };
}

function Frota_apiListarCondutoresTodos(sessionId) {
  Frota_bootstrap_();
  Frota_exigirEquipe_(sessionId);
  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES)
    .sort(function(a, b) { return SGO_UTILS.safe(a.NOME).localeCompare(SGO_UTILS.safe(b.NOME)); });
  return { ok: true, items: Frota_condutoresParaPerfil_(sessionId, itens) };
}

/** LGPD (19/10/2026): a equipe vê só nome e situação dos colegas; telefone, CNH e o arquivo da CNH são da gestão. */
function Frota_condutoresParaPerfil_(sessionId, itens) {
  if (Frota_ehGestao_(sessionId)) return itens;
  return itens.map(function(c) { return { ID: c.ID, NOME: c.NOME, STATUS: c.STATUS, USUARIO_ID: c.USUARIO_ID }; });
}

/** Condutor vinculado a um login específico (ativo), ou null. Usado pra travar a identidade na retirada (não-gestor). */
function Frota_obterCondutorPorUsuario_(usuarioId) {
  usuarioId = SGO_UTILS.safe(usuarioId);
  if (!usuarioId) return null;
  var achado = Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).filter(function(c) {
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
  var sessao = Frota_exigirEquipe_(sessionId);
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
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};

  var usuarioId = SGO_UTILS.safe(payload.usuarioId);
  // 17/10/2026: nome gravado como digitado (só sem espaços nas pontas); os já gravados não mudam.
  var nome = SGO_UTILS.safe(payload.nome).replace(/\s+/g, ' ').trim();

  if (usuarioId) {
    var usuario = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, usuarioId);
    if (!usuario) throw new Error('Usuário do SGO não encontrado.');
    var jaVinculado = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).filter(function(c) {
      return SGO_UTILS.safe(c.USUARIO_ID) === usuarioId && SGO_UTILS.safeUpper(c.STATUS) !== 'INATIVO';
    })[0];
    if (jaVinculado) throw new Error('Este usuário já está vinculado ao condutor "' + jaVinculado.NOME + '".');
    // Nome do condutor sempre vem do cadastro de usuário quando vinculado —
    // evita divergência entre "quem está logado" e "quem aparece no relatório".
    nome = SGO_UTILS.safe(usuario.NOME).trim() || nome;
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

/**
 * Editar condutor (19/10/2026, revisão da Frota): sem isto o aviso "CNH vencida" não tinha como ser resolvido (a central
 * mandava atualizar a validade e não existia tela para isso). Gestão. Campo vazio no pedido = mantém o que está gravado
 * (nunca apaga); vincular a um login só se o condutor ainda não tiver um. Mudanças vão para a trilha de auditoria.
 */
function Frota_apiAtualizarCondutor(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.id);
  var atual = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, id);
  if (!atual) throw new Error('Condutor não encontrado. Atualize a tela (aba Veículos e condutores) e tente de novo.');
  var upd = {};
  var validade = String(payload.cnhValidade === undefined ? '' : payload.cnhValidade).trim();
  if (validade) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(validade) || !Frota_parseDataHora_(validade, '00:00')) throw new Error('Validade da CNH inválida (' + validade + '). Use dd/mm/aaaa, por exemplo 15/03/2031.');
    if (validade !== Frota_textoData_(atual.CNH_VALIDADE)) upd.CNH_VALIDADE = validade;
  }
  var cnh = String(payload.cnh === undefined ? '' : payload.cnh).trim();
  if (cnh && cnh !== SGO_UTILS.safe(atual.CNH)) upd.CNH = cnh.slice(0, 40);
  var tel = SGO_UTILS.onlyDigits(payload.telefone);
  if (tel && tel !== SGO_UTILS.onlyDigits(atual.TELEFONE)) upd.TELEFONE = tel;
  var usuarioId = SGO_UTILS.safe(payload.usuarioId);
  if (usuarioId && usuarioId !== SGO_UTILS.safe(atual.USUARIO_ID)) {
    if (SGO_UTILS.safe(atual.USUARIO_ID)) throw new Error('Este condutor já está ligado a outro login. Para trocar, inative este condutor e cadastre de novo com o login certo (o histórico continua guardado).');
    var usuario = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, usuarioId);
    if (!usuario) throw new Error('Usuário do SGO+ não encontrado. Escolha de novo na lista.');
    var outro = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).filter(function(c) { return SGO_UTILS.safe(c.USUARIO_ID) === usuarioId && SGO_UTILS.safeUpper(c.STATUS) !== 'INATIVO' && SGO_UTILS.safe(c.ID) !== id; })[0];
    if (outro) throw new Error('Este login já está ligado ao condutor "' + outro.NOME + '".');
    upd.USUARIO_ID = usuarioId;
  }
  var nome = SGO_UTILS.safe(payload.nome).replace(/\s+/g, ' ').trim();
  if (nome && nome !== SGO_UTILS.safe(atual.NOME) && !SGO_UTILS.safe(atual.USUARIO_ID) && !upd.USUARIO_ID) upd.NOME = nome;
  if (!Object.keys(upd).length) return { ok: true, semMudanca: true, mensagem: 'Nada mudou no cadastro de ' + atual.NOME + ': os dados já estavam gravados.' };
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_CONDUTORES, id, upd);
  Frota_auditar_(sessao, { acao: 'CONDUTOR_ATUALIZADO', condutorId: id, condutorNome: SGO_UTILS.safe(atual.NOME), campo: Object.keys(upd).join(', '),
    antes: Object.keys(upd).map(function(k) { return k === 'USUARIO_ID' ? (atual[k] ? 'login vinculado' : 'sem login') : SGO_UTILS.safe(atual[k]); }).join(' | '),
    depois: Object.keys(upd).map(function(k) { return k === 'USUARIO_ID' ? 'login vinculado' : upd[k]; }).join(' | '),
    detalhe: 'Cadastro do condutor ' + atual.NOME + ' atualizado por ' + (sessao.nome || sessao.usuario) + '.' });
  return { ok: true, mensagem: 'Cadastro de ' + (upd.NOME || atual.NOME) + ' atualizado.' + (upd.CNH_VALIDADE ? ' O aviso de CNH some se a nova validade estiver a mais de 30 dias.' : '') };
}

function Frota_apiInativarCondutor(sessionId, payload) {
  Frota_bootstrap_();
  Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  var id = SGO_UTILS.safe((payload || {}).id);
  if (!SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, id)) throw new Error('Condutor não encontrado.');
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_CONDUTORES, id, { STATUS: 'INATIVO' });
  return { ok: true };
}

function Frota_apiReativarCondutor(sessionId, payload) {
  Frota_bootstrap_();
  Frota_exigirEquipe_(sessionId);
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
  Frota_exigirEquipe_(sessionId);
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
  Frota_exigirEquipe_(sessionId);
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
        condutorNome: c.NOME || '', condutorId: SGO_UTILS.safe(m.CONDUTOR_ID), condutorUsuarioId: SGO_UTILS.safe(c.USUARIO_ID),
        dataSaida: Frota_textoData_(m.DATA_SAIDA), horaSaida: Frota_textoHora_(m.HORA_SAIDA), kmSaida: m.KM_SAIDA, finalidade: m.FINALIDADE
      };
    });
  return { ok: true, items: itens };
}

/**
 * Data/hora digitadas na retirada/devolução (16/10/2026). Antes eram gravadas
 * como texto livre: "15-10" ou "8h" passavam e depois sumiam do relatório e
 * do cruzamento de multas sem aviso. Vazio = agora (horário de Brasília).
 */
function Frota_dataHoraMovimento_(data, hora, rotulo) {
  var agora = new Date();
  var d = String(data || '').trim() || Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy');
  var h = String(hora || '').trim() || Utilities.formatDate(agora, 'America/Sao_Paulo', 'HH:mm');
  if (/^\d:\d{2}$/.test(h)) h = '0' + h;
  var quando = Frota_parseDataHora_(d, h);
  if (!quando) throw new Error('Data/hora de ' + rotulo + ' inválida (' + d + ' ' + h + '). Use dd/mm/aaaa e hh:mm, ou deixe a data e a hora em branco para usar a hora atual.');
  return { data: d, hora: h, quando: quando };
}

function Frota_apiIniciarViagem(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
  payload = payload || {};
  var gestao = Frota_ehGestao_(sessionId);

  var veiculoId = SGO_UTILS.safe(payload.veiculoId);
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId);
  if (!veiculo) throw new Error('Veículo não encontrado. Atualize a tela e escolha o veículo de novo.');
  var jaFeita = Frota_minhaRetiradaRecente_(veiculoId, sessao);
  if (jaFeita) return Frota_respostaRetiradaJaFeita_(jaFeita, veiculo.PLACA);
  Frota_validarVeiculoRetirada_(veiculo);

  // Trava de identidade (Fase 5, 2026-08-25): quem NÃO é gestão não escolhe
  // condutor — o sistema usa o condutor vinculado ao próprio login, sempre,
  // ignorando o que veio no payload. A gestão pode escolher outro condutor
  // (ex.: a pessoa esqueceu de registrar) — 17/10/2026: com justificativa,
  // marca "registrado pela gestão", auditoria e aviso ao condutor.
  var condutor = Frota_resolverCondutorRetirada_(sessionId, payload);
  var condutorId = condutor.ID;
  var vinculado = Frota_obterCondutorPorUsuario_(sessao.userId);
  var emNomeDeOutro = gestao && (!vinculado || SGO_UTILS.safe(vinculado.ID) !== SGO_UTILS.safe(condutorId));

  var kmSaida = Frota_num_(payload.kmSaida, NaN);
  if (!isFinite(kmSaida) || kmSaida < 0) throw new Error('Informe o KM de saída (o número do odômetro do painel, só números).');

  // 17/10/2026: para quem não é gestão vale a hora do servidor (o que vier no pedido é ignorado).
  var quandoSaida = Frota_quandoRegistro_(gestao, payload.dataSaida, payload.horaSaida, 'saída');
  if (!quandoSaida.horaDoServidor) {
    var ultimaChegada = Frota_ultimaChegadaVeiculo_(veiculoId);
    if (ultimaChegada && quandoSaida.quando.getTime() < ultimaChegada.quando.getTime()) {
      throw new Error('A data/hora de saída informada (' + quandoSaida.data + ' ' + quandoSaida.hora + ') é anterior à última devolução deste veículo (' +
        ultimaChegada.data + ' ' + ultimaChegada.hora + '). Duas retiradas não podem se sobrepor: confira a data/hora ou deixe os campos vazios para usar a hora atual.');
    }
  }

  // 20/10/2026 (reservas): a retirada respeita a reserva. Devolução prevista informada; reserva de outra pessoa (ou manutenção
  // programada) começando antes da devolução prevista + folga recusa a retirada, salvo liberação da gestão com justificativa.
  var reservasLigadas = typeof FrotaRes_conferirRetirada_ === 'function';
  var prevista = reservasLigadas ? FrotaRes_previstaRetirada_(payload, quandoSaida.quando.getTime()) : null;
  var liberacao = '';
  var chkReserva = null;
  if (reservasLigadas) {
    chkReserva = FrotaRes_conferirRetirada_(veiculoId, SGO_UTILS.safe(condutorId), quandoSaida.quando.getTime(), prevista.ms);
    if (chkReserva.bloqueio) {
      if (!(gestao && payload.liberarReserva === true)) return FrotaRes_respostaBloqueio_(chkReserva, veiculo, condutor, sessao, quandoSaida.quando.getTime(), prevista.ms, gestao);
      liberacao = Frota_exigirJustificativa_(payload.justificativa, ['liberação do veículo reservado (' + SGO_UTILS.safe(chkReserva.bloqueio.r.CODIGO) + ') para esta retirada'], 'viagem urgente ao cliente; a reserva foi remanejada para outro veículo');
    }
  }

  var fotosSalvas = Array.isArray(payload.fotosSalvas) ? payload.fotosSalvas : Frota_uploadFotos_(veiculo.PLACA, payload.fotos);
  var checklistNormalizado = Frota_normalizarChecklist_(payload.checklist);
  Frota_validarQualidadeMovimentacao_(checklistNormalizado, fotosSalvas, 'retirada');
  var fotosPainel = Frota_fotosPainel_(payload, veiculo.PLACA);

  // Regras do KM e da justificativa, conferidas de novo dentro da trava com o KM atual relido.
  function conferir(v) {
    var kmAtual = Frota_num_(v.KM_ATUAL, 0);
    var dif = kmSaida - kmAtual;
    if (dif < 0 && !gestao) {
      throw new Error('O KM de saída (' + Frota_kmTexto_(kmSaida) + ') é menor que o KM registrado do veículo ' + v.PLACA + ' (' + Frota_kmTexto_(kmAtual) +
        '). O odômetro não volta: confira o número no painel. Se o KM registrado estiver errado, peça à gestão (Administrador, Gestor ou Diretoria) o ajuste de KM do veículo (Frota > Veículos e condutores > Ajustar KM).');
    }
    if (dif !== 0 && !fotosPainel.length) {
      throw new Error('O KM de saída (' + Frota_kmTexto_(kmSaida) + ') é diferente do KM registrado do veículo ' + v.PLACA + ' (' + Frota_kmTexto_(kmAtual) +
        '): diferença de ' + Frota_kmTexto_(dif) + ' km. A retirada não é bloqueada, mas precisa da foto do painel mostrando o odômetro: tire a foto do painel na tela (aparece "foto do painel (obrigatória)") e toque em Confirmar de novo. A gestão será avisada para conferir.');
    }
    var motivos = [];
    if (emNomeDeOutro) motivos.push('retirada registrada pela gestão em nome de ' + condutor.NOME);
    if (quandoSaida.retroativo) motivos.push('data/hora de saída diferente de agora (' + Frota_duracaoTexto_(quandoSaida.difMin) + (quandoSaida.difMin < 0 ? ' antes' : ' depois') + ')');
    if (dif < 0) motivos.push('KM de saída menor que o KM registrado do veículo');
    return { kmAtual: kmAtual, dif: dif, motivos: motivos };
  }
  var regra = conferir(veiculo);
  var justificativa = regra.motivos.length ? Frota_exigirJustificativa_(payload.justificativa, regra.motivos) : String(payload.justificativa || '').trim().slice(0, 500);

  // Trava evita retirada duplicada: 2 pedidos quase simultâneos pro MESMO
  // veículo (2 pessoas, ou duplo clique) podiam os dois ler STATUS "ATIVO"
  // antes de qualquer um gravar. Dentro da trava, relê e confere tudo de novo.
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var registro, depois;
  try {
    veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId);
    if (!veiculo) throw new Error('Veículo não encontrado. Atualize a tela e escolha o veículo de novo.');
    var jaFeitaNaTrava = Frota_minhaRetiradaRecente_(veiculoId, sessao);
    if (jaFeitaNaTrava) return Frota_respostaRetiradaJaFeita_(jaFeitaNaTrava, veiculo.PLACA);
    Frota_validarVeiculoRetirada_(veiculo);
    depois = conferir(veiculo);
    if (depois.motivos.length > regra.motivos.length) justificativa = Frota_exigirJustificativa_(payload.justificativa, depois.motivos);
    // Reservas relidas dentro da trava: outra pessoa pode ter reservado o veículo agora há pouco.
    if (reservasLigadas) {
      chkReserva = FrotaRes_conferirRetirada_(veiculoId, SGO_UTILS.safe(condutorId), quandoSaida.quando.getTime(), prevista.ms);
      if (chkReserva.bloqueio && !liberacao) return FrotaRes_respostaBloqueio_(chkReserva, veiculo, condutor, sessao, quandoSaida.quando.getTime(), prevista.ms, gestao);
    }

    var pelaGestao = emNomeDeOutro || quandoSaida.retroativo || depois.dif < 0;
    registro = SGO_DATA.normalizarObjetoParaSheet(
      SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO,
      SGO_DATA.gerarRegistroBase({
        VEICULO_ID: veiculoId,
        CONDUTOR_ID: condutorId,
        DATA_SAIDA: quandoSaida.data,
        HORA_SAIDA: quandoSaida.hora,
        KM_SAIDA: kmSaida,
        CHECKLIST_SAIDA_JSON: JSON.stringify(checklistNormalizado),
        FOTOS_SAIDA_JSON: JSON.stringify(fotosSalvas),
        FINALIDADE: String(payload.finalidade || '').trim(),
        DATA_CHEGADA: '', HORA_CHEGADA: '', KM_CHEGADA: '', CHECKLIST_CHEGADA_JSON: '', FOTOS_CHEGADA_JSON: '',
        OBSERVACOES: '',
        STATUS: 'EM_ANDAMENTO',
        REGISTRADO_SAIDA_POR_ID: SGO_UTILS.safe(sessao.userId),
        REGISTRADO_SAIDA_POR_NOME: SGO_UTILS.safe(sessao.nome || sessao.usuario),
        REGISTRO_GESTAO_SAIDA: pelaGestao ? 'SIM' : '',
        REGISTRO_GESTAO_SAIDA_EM: pelaGestao ? SGO_UTILS.nowIso() : '',
        JUSTIFICATIVA_SAIDA: justificativa,
        MOTIVO_GESTAO_SAIDA: depois.motivos.join('; '),
        KM_VEICULO_NA_SAIDA: depois.kmAtual,
        KM_DIVERGENCIA_SAIDA: depois.dif !== 0 ? depois.dif : '',
        FOTOS_PAINEL_SAIDA_JSON: fotosPainel.length ? JSON.stringify(fotosPainel) : '',
        DEVOLUCAO_PREVISTA_DATA: prevista ? FrotaRes_data_(prevista.ms) : '',
        DEVOLUCAO_PREVISTA_HORA: prevista ? FrotaRes_hora_(prevista.ms) : '',
        DEVOLUCAO_PREVISTA_ORIGEM: prevista ? prevista.origem : '',
        RESERVA_ID: chkReserva && chkReserva.minha ? SGO_UTILS.safe(chkReserva.minha.r.ID) : '',
        RESERVA_LIBERADA_ID: liberacao && chkReserva && chkReserva.bloqueio ? SGO_UTILS.safe(chkReserva.bloqueio.r.ID) : '',
        RESERVA_LIBERADA_JUSTIFICATIVA: liberacao
      })
    );
    SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, registro);
    var mudVeic = { KM_ATUAL: kmSaida, STATUS: 'EM_USO' };
    if (Frota_linkMiniatura_(payload.miniaturaLink)) mudVeic.FOTO_MINIATURA_LINK = Frota_linkMiniatura_(payload.miniaturaLink);
    SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId, mudVeic);
    SGO_DATA.log('FROTA_VIAGEM_INICIAR', sessao.usuario, 'Retirada registrada — veículo ' + veiculo.PLACA + ' — condutor ' + condutor.NOME, 'FROTA');
  } finally {
    try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  }

  // Auditoria e avisos fora da trava (não seguram a fila de quem está retirando outro veículo).
  var base = { veiculoId: veiculoId, placa: veiculo.PLACA, movimentacaoId: registro.ID, condutorId: condutorId, condutorNome: condutor.NOME };
  if (registro.REGISTRO_GESTAO_SAIDA === 'SIM') {
    Frota_auditar_(sessao, Object.assign({}, base, { acao: 'RETIRADA_PELA_GESTAO', justificativa: justificativa,
      campo: 'DATA_SAIDA/HORA_SAIDA', depois: quandoSaida.data + ' ' + quandoSaida.hora,
      detalhe: 'Retirada do veículo ' + veiculo.PLACA + ' registrada por ' + (sessao.nome || sessao.usuario) + ' para ' + condutor.NOME + ' (' + depois.motivos.join('; ') + ').' }));
  }
  if (depois.dif !== 0) {
    Frota_auditar_(sessao, Object.assign({}, base, { acao: 'KM_DIVERGENTE_SAIDA', campo: 'KM_ATUAL', antes: depois.kmAtual, depois: kmSaida, justificativa: justificativa,
      detalhe: 'KM de saída ' + Frota_kmTexto_(kmSaida) + ' diferente do KM registrado ' + Frota_kmTexto_(depois.kmAtual) + ' (diferença de ' + Frota_kmTexto_(depois.dif) + ' km), com foto do painel. A gestão confere.' }));
  }
  if (emNomeDeOutro) {
    Frota_avisarCondutor_(condutor, sessao, 'Retirada registrada em seu nome: veículo ' + veiculo.PLACA,
      (sessao.nome || sessao.usuario) + ' registrou no SGO+ a retirada do veículo ' + veiculo.PLACA + ' em seu nome, com saída em ' + quandoSaida.data + ' às ' + quandoSaida.hora +
      ' e KM ' + Frota_kmTexto_(kmSaida) + '.\nJustificativa: ' + justificativa + '\n\nConfira os dados na Frota. Se algo estiver errado, fale com ' + (sessao.nome || sessao.usuario) + ' ou com a gestão. Ao devolver o veículo, registre a devolução normalmente.',
      registro.ID, 'S33');
  }
  // Reservas (20/10/2026): a reserva do condutor vira "iniciada"; a liberação avisa quem tinha reservado. Nunca derruba a retirada.
  var resRes = reservasLigadas ? FrotaRes_aposRetirada_(sessao, registro, veiculo, condutor, chkReserva, liberacao, prevista.ms) : {};
  // Rastreador (17/10/2026): libera a partida. Nunca derruba a retirada, que já está gravada.
  var rastreador = Frota_rastreadorAoRetirar_(sessao, veiculoId, registro.ID);
  return { ok: true, movimentacaoId: registro.ID, registroPelaGestao: registro.REGISTRO_GESTAO_SAIDA === 'SIM', kmDivergencia: depois.dif || 0,
    data: quandoSaida.data, hora: quandoSaida.hora, horaDoServidor: quandoSaida.horaDoServidor, rastreador: rastreador,
    devolucaoPrevista: prevista ? FrotaRes_txt_(prevista.ms) : '', reservaIniciada: resRes.reservaIniciada || '', reservaLiberada: resRes.reservaLiberada || '' };
}

function Frota_apiFinalizarViagem(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
  payload = payload || {};
  var gestao = Frota_ehGestao_(sessionId);

  var movId = SGO_UTILS.safe(payload.movimentacaoId);
  var mov = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movId);
  if (!mov) throw new Error('Retirada não encontrada. Atualize a tela: ela pode ter sido devolvida por outra pessoa.');
  if (SGO_UTILS.safeUpper(mov.STATUS) !== 'EM_ANDAMENTO') {
    // A mesma pessoa repetindo a devolução que já gravou (a resposta se perdeu): sucesso, sem registrar de novo.
    if (Frota_feitoPorMimHaPouco_(mov, sessao, 'REGISTRADO_CHEGADA_POR_ID', 'FINALIZADO_EM')) return Frota_respostaDevolucaoJaFeita_(mov);
    throw new Error('Esta retirada já foi devolvida. Atualize a tela para ver a situação atual do veículo.');
  }

  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, mov.VEICULO_ID);
  if (!veiculo) throw new Error('Veículo não encontrado.');

  // 17/10/2026 (decisão do dono): só o condutor da retirada devolve. A gestão
  // devolve no lugar dele (esqueceu) com justificativa, marca, auditoria e aviso.
  var condutor = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, mov.CONDUTOR_ID) || {};
  var nomeCondutor = SGO_UTILS.safe(condutor.NOME) || 'o condutor da retirada';
  var souCondutor = !!SGO_UTILS.safe(condutor.USUARIO_ID) && SGO_UTILS.safe(condutor.USUARIO_ID) === SGO_UTILS.safe(sessao.userId);
  if (!souCondutor && !gestao) {
    throw new Error('Esta retirada está com ' + nomeCondutor + '. Só ' + nomeCondutor + ' ou a gestão podem registrar a devolução. ' +
      'Se o veículo já voltou, peça a ' + nomeCondutor + ' para registrar a devolução no SGO+; se não for possível, procure ' + FROTA_TEXTO_GESTAO + ', que registra no lugar dele com justificativa.');
  }
  var pelaGestao = !souCondutor;

  var kmChegada = Frota_num_(payload.kmChegada, NaN);
  if (!isFinite(kmChegada) || kmChegada < 0) throw new Error('Informe o KM de chegada (o número do odômetro do painel, só números).');
  var quandoChegada = Frota_quandoRegistro_(gestao, payload.dataChegada, payload.horaChegada, 'chegada');
  var saidaReg = Frota_parseDataHora_(mov.DATA_SAIDA, mov.HORA_SAIDA);
  if (saidaReg && quandoChegada.quando.getTime() < saidaReg.getTime()) {
    throw new Error('A data/hora de chegada (' + quandoChegada.data + ' ' + quandoChegada.hora + ') é anterior à saída registrada (' + Frota_textoData_(mov.DATA_SAIDA) + ' ' + Frota_textoHora_(mov.HORA_SAIDA) + '). ' +
      (quandoChegada.horaDoServidor ? 'A saída foi registrada com data/hora errada: peça à gestão (Administrador, Gestor ou Diretoria) para conferir a retirada.' : 'Confira os campos de chegada.'));
  }
  var kmSaidaMov = Frota_num_(mov.KM_SAIDA, 0);
  if (kmChegada < kmSaidaMov) {
    throw new Error('O KM de chegada (' + Frota_kmTexto_(kmChegada) + ') não pode ser menor que o KM de saída desta retirada (' + Frota_kmTexto_(kmSaidaMov) +
      '). Confira o número no painel. Se o KM de saída foi digitado errado, procure ' + FROTA_TEXTO_GESTAO + '.');
  }
  var alertaKm = Frota_kmChegadaAbsurdo_(kmSaidaMov, kmChegada, saidaReg, quandoChegada.quando);

  var fotosSalvas = Array.isArray(payload.fotosSalvas) ? payload.fotosSalvas : Frota_uploadFotos_(veiculo.PLACA, payload.fotos);
  var checklistNormalizado = Frota_normalizarChecklist_(payload.checklist);
  Frota_validarQualidadeMovimentacao_(checklistNormalizado, fotosSalvas, 'devolução');
  var fotosPainel = Frota_fotosPainel_(payload, veiculo.PLACA);
  if (alertaKm && !fotosPainel.length) {
    throw new Error('O KM de chegada ficou fora do esperado: ' + alertaKm + '. A devolução não é bloqueada, mas precisa da foto do painel mostrando o odômetro: ' +
      'tire a foto do painel na tela (aparece "foto do painel (obrigatória)") e toque em Confirmar de novo. Se o número foi digitado errado, corrija o KM de chegada. A gestão será avisada para conferir.');
  }

  var motivos = [];
  if (pelaGestao) motivos.push('devolução registrada pela gestão no lugar de ' + nomeCondutor);
  if (quandoChegada.retroativo) motivos.push('data/hora de chegada diferente de agora (' + Frota_duracaoTexto_(quandoChegada.difMin) + (quandoChegada.difMin < 0 ? ' antes' : ' depois') + ')');
  var justificativa = motivos.length ? Frota_exigirJustificativa_(payload.justificativa, motivos) : String(payload.justificativa || '').trim().slice(0, 500);
  var marcaGestao = pelaGestao || quandoChegada.retroativo;

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    mov = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movId);
    if (!mov) throw new Error('Retirada não encontrada. Atualize a tela.');
    if (SGO_UTILS.safeUpper(mov.STATUS) !== 'EM_ANDAMENTO') {
      if (Frota_feitoPorMimHaPouco_(mov, sessao, 'REGISTRADO_CHEGADA_POR_ID', 'FINALIZADO_EM')) return Frota_respostaDevolucaoJaFeita_(mov);
      throw new Error('Esta retirada acabou de ser devolvida por outra pessoa. Atualize a tela para ver a situação atual do veículo.');
    }
    veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, mov.VEICULO_ID) || veiculo;

    SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movId, {
      DATA_CHEGADA: quandoChegada.data,
      HORA_CHEGADA: quandoChegada.hora,
      KM_CHEGADA: kmChegada,
      CHECKLIST_CHEGADA_JSON: JSON.stringify(checklistNormalizado),
      FOTOS_CHEGADA_JSON: JSON.stringify(fotosSalvas),
      OBSERVACOES: String(payload.observacoes || '').trim(),
      STATUS: 'FINALIZADO',
      FINALIZADO_EM: SGO_UTILS.nowIso(),
      REGISTRADO_CHEGADA_POR_ID: SGO_UTILS.safe(sessao.userId),
      REGISTRADO_CHEGADA_POR_NOME: SGO_UTILS.safe(sessao.nome || sessao.usuario),
      REGISTRO_GESTAO_CHEGADA: marcaGestao ? 'SIM' : '',
      REGISTRO_GESTAO_CHEGADA_EM: marcaGestao ? SGO_UTILS.nowIso() : '',
      JUSTIFICATIVA_CHEGADA: justificativa,
      MOTIVO_GESTAO_CHEGADA: motivos.join('; '),
      KM_ALERTA_CHEGADA: alertaKm,
      FOTOS_PAINEL_CHEGADA_JSON: fotosPainel.length ? JSON.stringify(fotosPainel) : ''
    });
    // Veículo inativado durante a retirada continua inativo depois da devolução.
    var statusDepois = SGO_UTILS.safeUpper(veiculo.STATUS) === 'INATIVO' ? 'INATIVO' : 'ATIVO';
    var mudVeicD = { KM_ATUAL: kmChegada, STATUS: statusDepois };
    if (Frota_linkMiniatura_(payload.miniaturaLink)) mudVeicD.FOTO_MINIATURA_LINK = Frota_linkMiniatura_(payload.miniaturaLink);
    SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, veiculo.ID, mudVeicD);
    SGO_DATA.log('FROTA_VIAGEM_FINALIZAR', sessao.usuario, 'Devolução registrada — veículo ' + veiculo.PLACA + ' — condutor ' + nomeCondutor, 'FROTA');
  } finally {
    try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  }

  var base = { veiculoId: veiculo.ID, placa: veiculo.PLACA, movimentacaoId: movId, condutorId: SGO_UTILS.safe(mov.CONDUTOR_ID), condutorNome: nomeCondutor };
  if (marcaGestao) {
    Frota_auditar_(sessao, Object.assign({}, base, { acao: 'DEVOLUCAO_PELA_GESTAO', justificativa: justificativa,
      campo: 'DATA_CHEGADA/HORA_CHEGADA', depois: quandoChegada.data + ' ' + quandoChegada.hora,
      detalhe: 'Devolução do veículo ' + veiculo.PLACA + ' (retirada de ' + nomeCondutor + ') registrada por ' + (sessao.nome || sessao.usuario) + ' (' + motivos.join('; ') + ').' }));
  }
  if (alertaKm) {
    Frota_auditar_(sessao, Object.assign({}, base, { acao: 'KM_DIVERGENTE_CHEGADA', campo: 'KM_CHEGADA', antes: kmSaidaMov, depois: kmChegada, justificativa: justificativa,
      detalhe: 'KM de chegada fora do esperado: ' + alertaKm + '. Com foto do painel. A gestão confere.' }));
  }
  if (pelaGestao) {
    Frota_avisarCondutor_(condutor, sessao, 'Devolução registrada em seu nome: veículo ' + veiculo.PLACA,
      (sessao.nome || sessao.usuario) + ' registrou no SGO+ a devolução do veículo ' + veiculo.PLACA + ' (sua retirada de ' + Frota_textoData_(mov.DATA_SAIDA) + ' ' + Frota_textoHora_(mov.HORA_SAIDA) +
      '), com chegada em ' + quandoChegada.data + ' às ' + quandoChegada.hora + ' e KM ' + Frota_kmTexto_(kmChegada) + '.\nJustificativa: ' + justificativa +
      '\n\nConfira os dados na Frota. Se algo estiver errado, fale com ' + (sessao.nome || sessao.usuario) + ' ou com a gestão. Da próxima vez, registre a devolução assim que entregar o veículo.',
      movId, 'S34');
  }
  // Reservas (20/10/2026): reserva iniciada vira concluída; cobrança de atraso encerrada; o próximo reservante sabe que o veículo voltou.
  if (typeof FrotaRes_aposDevolucao_ === 'function') FrotaRes_aposDevolucao_(sessao, mov, veiculo);
  // Rastreador (17/10/2026): bloqueio da partida fica pendente até o veículo estar parado com a ignição desligada.
  var rastreador = Frota_rastreadorAoDevolver_(sessao, veiculo.ID, movId);
  return { ok: true, registroPelaGestao: marcaGestao, alertaKm: alertaKm, data: quandoChegada.data, hora: quandoChegada.hora, horaDoServidor: quandoChegada.horaDoServidor, rastreador: rastreador };
}

// ------------------------------------------------------------
// AJUSTE DE KM, CONFERÊNCIA E TRILHA (só a gestão) — 17/10/2026
// ------------------------------------------------------------
function Frota_apiAjustarKm(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
  if (!Frota_ehGestao_(sessionId)) {
    throw new Error('O ajuste de KM do veículo é feito só pela gestão (Administrador, Gestor ou Diretoria). Se o KM registrado está errado, avise a gestão com a foto do painel.');
  }
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.veiculoId);
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, id);
  if (!veiculo) throw new Error('Veículo não encontrado. Atualize a tela e escolha o veículo de novo.');
  var kmNovo = Frota_num_(payload.kmNovo, NaN);
  if (!isFinite(kmNovo) || kmNovo < 0) throw new Error('Informe o KM novo (o número do odômetro do painel, só números).');
  var kmAntes = Frota_num_(veiculo.KM_ATUAL, 0);
  if (kmNovo === kmAntes) throw new Error('O KM informado (' + Frota_kmTexto_(kmNovo) + ') é igual ao KM registrado. Nada a ajustar.');
  var justificativa = Frota_exigirJustificativa_(payload.justificativa, ['ajuste do KM do veículo ' + veiculo.PLACA + ' de ' + Frota_kmTexto_(kmAntes) + ' para ' + Frota_kmTexto_(kmNovo)], 'KM digitado errado na devolução de 15/10, conferido pela foto do painel');
  var fotos = Array.isArray(payload.fotosSalvas) ? payload.fotosSalvas.filter(function(f) { return f && f.link; }) : [];

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, id);
    var emUso = Frota_veiculosComSituacao_().filter(function(v) { return SGO_UTILS.safe(v.ID) === id && v.SITUACAO === 'EM_USO'; })[0];
    if (emUso) {
      throw new Error('O veículo ' + veiculo.PLACA + ' está em uso (retirado por ' + (emUso.CONDUTOR_NOME || 'condutor não localizado') +
        '). A devolução grava o KM de chegada; ajuste o KM depois que a devolução for registrada.');
    }
    kmAntes = Frota_num_(veiculo.KM_ATUAL, 0);
    SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, id, { KM_ATUAL: kmNovo });
  } finally {
    try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  }
  Frota_auditar_(sessao, { acao: 'AJUSTE_KM', veiculoId: id, placa: veiculo.PLACA, campo: 'KM_ATUAL', antes: kmAntes, depois: kmNovo, justificativa: justificativa,
    detalhe: 'KM do veículo ' + veiculo.PLACA + ' ajustado de ' + Frota_kmTexto_(kmAntes) + ' para ' + Frota_kmTexto_(kmNovo) + ' por ' + (sessao.nome || sessao.usuario) + '.' +
      (fotos.length ? ' Foto: ' + fotos.map(function(f) { return f.link; }).join(' ') : '') });
  return { ok: true, kmAntes: kmAntes, kmNovo: kmNovo, placa: veiculo.PLACA };
}

/** Movimentações com KM divergente ainda não conferidas pela gestão (saída e chegada). */
function Frota_kmAConferir_() {
  var veiculos = {}, condutores = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function(v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });
  var lista = [];
  Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function(m) {
    var v = veiculos[SGO_UTILS.safe(m.VEICULO_ID)] || {}, c = condutores[SGO_UTILS.safe(m.CONDUTOR_ID)] || {};
    var fotos = function(txt) { try { return JSON.parse(txt || '[]') || []; } catch (e) { return []; } };
    var comum = { movimentacaoId: SGO_UTILS.safe(m.ID), veiculoId: SGO_UTILS.safe(m.VEICULO_ID), placa: SGO_UTILS.safe(v.PLACA), condutorNome: SGO_UTILS.safe(c.NOME),
      condutorUsuarioId: SGO_UTILS.safe(c.USUARIO_ID), dataSaida: Frota_textoData_(m.DATA_SAIDA), horaSaida: Frota_textoHora_(m.HORA_SAIDA) };
    var difSaida = Frota_num_(m.KM_DIVERGENCIA_SAIDA, 0);
    if (String(m.KM_DIVERGENCIA_SAIDA === undefined ? '' : m.KM_DIVERGENCIA_SAIDA).trim() !== '' && difSaida !== 0 && !SGO_UTILS.safe(m.KM_CONFERIDO_SAIDA_EM)) {
      lista.push(Object.assign({ etapa: 'SAIDA', data: comum.dataSaida, hora: comum.horaSaida,
        motivo: 'KM de saída ' + Frota_kmTexto_(m.KM_SAIDA) + ' diferente do KM registrado ' + Frota_kmTexto_(m.KM_VEICULO_NA_SAIDA) + ' (diferença de ' + Frota_kmTexto_(difSaida) + ' km)',
        fotos: fotos(m.FOTOS_PAINEL_SAIDA_JSON), registradoPor: SGO_UTILS.safe(m.REGISTRADO_SAIDA_POR_NOME) }, comum));
    }
    if (SGO_UTILS.safe(m.KM_ALERTA_CHEGADA) && !SGO_UTILS.safe(m.KM_CONFERIDO_CHEGADA_EM)) {
      lista.push(Object.assign({ etapa: 'CHEGADA', data: Frota_textoData_(m.DATA_CHEGADA), hora: Frota_textoHora_(m.HORA_CHEGADA),
        motivo: 'KM de chegada ' + Frota_kmTexto_(m.KM_CHEGADA) + ' (saída ' + Frota_kmTexto_(m.KM_SAIDA) + '): ' + SGO_UTILS.safe(m.KM_ALERTA_CHEGADA),
        fotos: fotos(m.FOTOS_PAINEL_CHEGADA_JSON), registradoPor: SGO_UTILS.safe(m.REGISTRADO_CHEGADA_POR_NOME) }, comum));
    }
    // 19/10/2026 (revisão da Frota): o hodômetro do rastreador conta desde a instalação do aparelho e nunca é igual ao
    // painel; comparar o número de cada ponta dava alerta falso em toda retirada. Vale só a conferência do KM RODADO
    // na devolução (Rastreador_kmRodadoConferencia_), calculada aqui com o que está gravado. As divergências antigas
    // gravadas pela regra anterior (KM_RASTREADOR_DIVERGENCIA_SAIDA) ficam na planilha e não aparecem mais.
    if (typeof Rastreador_kmRodadoConferencia_ === 'function' && !SGO_UTILS.safe(m.KM_CONFERIDO_RASTREADOR_CHEGADA_EM)) {
      var rc = Rastreador_kmRodadoConferencia_(m);
      if (rc && rc.divergente) {
        lista.push(Object.assign({ etapa: 'RASTREADOR_CHEGADA', rastreador: true, data: Frota_textoData_(m.DATA_CHEGADA), hora: Frota_textoHora_(m.HORA_CHEGADA),
          motivo: Rastreador_textoConferencia_(m, rc) + ' (tolerância de 20 km ou 5%)',
          rodadoInformado: rc.rodadoInformado, rodadoRastreador: rc.rodadoRastreador, fonteRastreador: rc.fonte,
          fotos: fotos(m.FOTOS_PAINEL_CHEGADA_JSON), registradoPor: SGO_UTILS.safe(m.REGISTRADO_CHEGADA_POR_NOME) }, comum));
      }
    }
  });
  return lista;
}

function Frota_apiListarKmAConferir(sessionId) {
  Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  return { ok: true, items: Frota_kmAConferir_() };
}

function Frota_apiConferirKm(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
  if (!Frota_ehGestao_(sessionId)) throw new Error('A conferência de KM é feita só pela gestão (Administrador, Gestor ou Diretoria).');
  payload = payload || {};
  var movId = SGO_UTILS.safe(payload.movimentacaoId);
  // 17/10/2026: também as divergências com o hodômetro do rastreador (RASTREADOR_SAIDA / RASTREADOR_CHEGADA).
  var etapa = ['SAIDA', 'CHEGADA', 'RASTREADOR_SAIDA', 'RASTREADOR_CHEGADA'].indexOf(SGO_UTILS.safeUpper(payload.etapa)) >= 0 ? SGO_UTILS.safeUpper(payload.etapa) : 'SAIDA';
  var mov = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movId);
  if (!mov) throw new Error('Movimentação não encontrada. Atualize a tela.');
  if (SGO_UTILS.safe(mov['KM_CONFERIDO_' + etapa + '_EM'])) throw new Error('Este KM já foi conferido. Atualize a tela.');
  var obs = String(payload.observacao || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  var upd = {};
  upd['KM_CONFERIDO_' + etapa + '_EM'] = SGO_UTILS.nowIso();
  upd['KM_CONFERIDO_' + etapa + '_POR'] = SGO_UTILS.safe(sessao.nome || sessao.usuario);
  SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movId, upd);
  var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, mov.VEICULO_ID) || {};
  Frota_auditar_(sessao, { acao: 'KM_CONFERIDO_' + etapa, veiculoId: SGO_UTILS.safe(mov.VEICULO_ID), placa: SGO_UTILS.safe(v.PLACA), movimentacaoId: movId,
    condutorId: SGO_UTILS.safe(mov.CONDUTOR_ID), justificativa: obs,
    detalhe: 'KM ' + (/SAIDA$/.test(etapa) ? 'de saída' : 'de chegada') + (/^RASTREADOR/.test(etapa) ? ' (hodômetro do rastreador)' : '') + ' conferido pela gestão' + (obs ? ': ' + obs : '.') });
  return { ok: true };
}

/** Trilha de auditoria da Frota (gestão), mais recente primeiro. */
function Frota_apiListarAuditoria(sessionId, payload) {
  Frota_bootstrap_();
  Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var veiculoId = SGO_UTILS.safe(payload.veiculoId);
  var itens = Frota_lerSeExistir_(FROTA_ABA_AUDITORIA)
    .filter(function(a) { return !veiculoId || SGO_UTILS.safe(a.VEICULO_ID) === veiculoId; })
    .sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); })
    .slice(0, Math.min(Number(payload.limite) || 100, 500))
    .map(function(a) {
      return { quando: SGO_UTILS.safe(a.QUANDO), acao: SGO_UTILS.safe(a.ACAO), placa: SGO_UTILS.safe(a.PLACA), condutorNome: SGO_UTILS.safe(a.CONDUTOR_NOME),
        usuarioNome: SGO_UTILS.safe(a.USUARIO_NOME), campo: SGO_UTILS.safe(a.CAMPO), antes: SGO_UTILS.safe(a.VALOR_ANTES), depois: SGO_UTILS.safe(a.VALOR_DEPOIS),
        justificativa: SGO_UTILS.safe(a.JUSTIFICATIVA), detalhe: SGO_UTILS.safe(a.DETALHE) };
    });
  return { ok: true, items: itens };
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
  var sessao = Frota_exigirEquipe_(sessionId);
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
      KM: Frota_num_(payload.km, veiculo.KM_ATUAL || 0),
      DESCRICAO: String(payload.descricao || '').trim(),
      CUSTO: Frota_num_(payload.custo, 0),
      OFICINA: String(payload.oficina || '').trim(),
      PROXIMA_KM: payload.proximaKm !== undefined && payload.proximaKm !== '' ? Frota_num_(payload.proximaKm, 0) : '',
      PROXIMA_DATA: String(payload.proximaData || '').trim()
    })
  );
  SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO, registro);
  SGO_DATA.log('FROTA_MANUTENCAO_REGISTRAR', sessao.usuario, 'Manutenção registrada — veículo ' + veiculo.PLACA + ' (' + payload.tipo + ')', 'FROTA');
  return { ok: true, item: registro };
}

function Frota_apiRegistrarDespesa(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
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
      VALOR: Frota_num_(payload.valor, 0),
      DESCRICAO: String(payload.descricao || '').trim()
    })
  );
  SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_DESPESA, registro);
  SGO_DATA.log('FROTA_DESPESA_REGISTRAR', sessao.usuario, 'Despesa registrada — veículo ' + veiculo.PLACA, 'FROTA');
  return { ok: true, item: registro };
}

function Frota_apiRegistrarParada(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
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
// 16/10/2026: um CRLV/seguro renovado não apagava o aviso do anterior —
// o documento vencido continuava em VENCIDO para sempre (a única saída era
// excluir). Para cada veículo + tipo vale o documento de validade mais
// distante; os anteriores ficam como SUBSTITUIDO. Tipos sem prazo comum
// ("Outro", "Nota Fiscal", "Laudo de Vistoria") contam um a um.
var FROTA_DOC_TIPOS_AVULSOS = ['OUTRO', 'NOTA FISCAL', 'LAUDO DE VISTORIA'];

function Frota_chaveDocumento_(d) {
  var tipo = SGO_UTILS.safeUpper(d.TIPO_DOCUMENTO);
  return FROTA_DOC_TIPOS_AVULSOS.indexOf(tipo) >= 0 ? 'ID|' + SGO_UTILS.safe(d.ID) : SGO_UTILS.safe(d.VEICULO_ID) + '|' + tipo;
}

/** Mapa chave -> ID do documento vigente (validade mais distante) entre os que têm validade. */
function Frota_documentosVigentes_(docs) {
  var melhor = {};
  docs.forEach(function(d) {
    var dt = Frota_dataDia_(d.VALIDADE);
    if (!dt) return;
    var k = Frota_chaveDocumento_(d);
    if (!melhor[k] || dt.getTime() > melhor[k].t) melhor[k] = { t: dt.getTime(), id: SGO_UTILS.safe(d.ID) };
  });
  var out = {};
  Object.keys(melhor).forEach(function(k) { out[k] = melhor[k].id; });
  return out;
}

/** OK / VENCENDO / VENCIDO / SEM_VALIDADE / SUBSTITUIDO */
function Frota_statusDocumento_(d, vigentes) {
  var dias = Frota_diasAte_(d.VALIDADE);
  if (dias === null) return 'SEM_VALIDADE';
  var vigente = vigentes && vigentes[Frota_chaveDocumento_(d)];
  if (vigente && vigente !== SGO_UTILS.safe(d.ID)) return 'SUBSTITUIDO';
  return Frota_situacaoPorDias_(dias);
}

// 17/10/2026: regra única com a central de alertas — vencido OU vence hoje = VENCIDO;
// até 30 dias = VENCENDO.
function Frota_situacaoPorDias_(dias) {
  return dias <= 0 ? 'VENCIDO' : (dias <= FROTA_CFG.DIAS_AVISO_VENCIMENTO ? 'VENCENDO' : 'OK');
}

function Frota_apiListarDocumentos(sessionId, payload) {
  Frota_bootstrap_();
  Frota_exigirEquipe_(sessionId);
  payload = payload || {};
  var veiculoId = SGO_UTILS.safe(payload.veiculoId);

  var veiculos = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function(v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });

  var todos = Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO);
  var vigentes = Frota_documentosVigentes_(todos);

  var itens = todos
    .filter(function(d) { return !veiculoId || SGO_UTILS.safe(d.VEICULO_ID) === veiculoId; })
    .map(function(d) {
      var veiculo = veiculos[SGO_UTILS.safe(d.VEICULO_ID)] || {};
      return Object.assign({}, d, { VALIDADE: Frota_textoData_(d.VALIDADE), veiculoPlaca: veiculo.PLACA || '', status: Frota_statusDocumento_(d, vigentes) });
    })
    .sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });

  return { ok: true, items: itens };
}

function Frota_apiUploadDocumento(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
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
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.id);
  var doc = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO, id);
  if (!doc) throw new Error('Documento não encontrado.');
  // Marca como excluído (a linha e o arquivo continuam guardados) — 16/10/2026.
  Frota_marcarExcluido_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO, id, sessao.usuario);
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
  Frota_exigirEquipe_(sessionId);
  payload = payload || {};
  var veiculoId = SGO_UTILS.safe(payload.veiculoId);

  var veiculos = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function(v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });
  var condutores = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });

  var itens = Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO)
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
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};

  var veiculoId = SGO_UTILS.safe(payload.veiculoId);
  var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId);
  if (!veiculo) throw new Error('Veículo não encontrado.');

  var data = String(payload.data || '').trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) throw new Error('Informe a data no formato dd/mm/aaaa.');

  var litros = Frota_num_(payload.litros, NaN);
  if (!isFinite(litros) || litros <= 0) throw new Error('Informe os litros abastecidos.');

  var km = Frota_num_(payload.km, NaN);
  if (!isFinite(km)) throw new Error('Informe o KM no momento do abastecimento.');
  var hora = String(payload.hora || '').trim();
  if (hora && !/^\d{1,2}:\d{2}$/.test(hora)) throw new Error('Informe a hora do abastecimento no formato hh:mm (exemplo: 14:35) ou deixe vazio.');

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
      VALOR: Frota_num_(payload.valor, 0),
      POSTO: SGO_UTILS.safe(payload.posto),
      COMPROVANTE_LINK: link,
      // 20/10/2026: hora (opcional) para conferir com a posição do veículo; origem do lançamento
      HORA: hora,
      ORIGEM: 'GESTAO'
    })
  );
  SGO_DATA.insert(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, registro);
  SGO_DATA.log('FROTA_ABASTECIMENTO_REGISTRAR', sessao.usuario, 'Abastecimento registrado — veículo ' + veiculo.PLACA + ' (' + litros + ' L)', 'FROTA');
  return { ok: true, item: registro };
}

function Frota_apiExcluirAbastecimento(sessionId, payload) {
  Frota_bootstrap_();
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.id);
  var abastecimento = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, id);
  if (!abastecimento) throw new Error('Abastecimento não encontrado.');
  Frota_marcarExcluido_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, id, sessao.usuario);
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
  // 16/10/2026: aceita também Date/ISO vindos da planilha antiga (ver Frota_textoData_).
  var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(Frota_textoData_(data));
  if (!m) return null;
  hora = Frota_textoHora_(hora);
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
      // 16/10/2026: devolução gravada com data ilegível virava retirada "sem
      // fim" e o condutor aparecia em toda multa posterior. Usa o carimbo do
      // servidor; sem nenhum dos dois, a retirada finalizada não entra.
      var finalizada = SGO_UTILS.safeUpper(m.STATUS) === 'FINALIZADO';
      if (finalizada && !fim && m.FINALIZADO_EM) { var f = new Date(m.FINALIZADO_EM); if (!isNaN(f.getTime())) fim = f; }
      if (finalizada && !fim) return { m: m, inicio: null, fim: null };
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
  Frota_exigirEquipe_(sessionId);
  payload = payload || {};
  var veiculoId = SGO_UTILS.safe(payload.veiculoId);

  var veiculos = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function(v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });
  var condutores = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) { condutores[SGO_UTILS.safe(c.ID)] = c; });

  var itens = Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_MULTA)
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
  var sessao = Frota_exigirEquipe_(sessionId);
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
      VALOR: Frota_num_(payload.valor, 0),
      PONTOS: payload.pontos !== undefined && payload.pontos !== '' ? Frota_num_(payload.pontos, 0) : '',
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
  var sessao = Frota_exigirEquipe_(sessionId);
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
  var sessao = Frota_exigirEquipe_(sessionId);
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
  var sessao = Frota_exigirEquipe_(sessionId);
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
  var sessao = Frota_exigirEquipe_(sessionId);
  Frota_exigirGestor_(sessionId);
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.id);
  var multa = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MULTA, id);
  if (!multa) throw new Error('Multa não encontrada.');
  Frota_marcarExcluido_(SGO_CFG.SHEETS.REG_FROTA_MULTA, id, sessao.usuario);
  SGO_DATA.log('FROTA_MULTA_EXCLUIR', sessao.usuario, 'Multa removida — ' + id, 'FROTA');
  return { ok: true };
}

// ------------------------------------------------------------
// HISTÓRICO POR VEÍCULO (movimentações + manutenções + despesas + paradas)
// ------------------------------------------------------------
function Frota_apiHistoricoVeiculo(sessionId, payload) {
  Frota_bootstrap_();
  Frota_exigirEquipe_(sessionId);
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

  var diasRestantes = Frota_diasAte_(manutencao.PROXIMA_DATA);
  if (diasRestantes !== null) considerar(Frota_situacaoPorDias_(diasRestantes));

  return pior || 'SEM_PREVISAO';
}

/**
 * Última manutenção de cada TIPO, por veículo. 16/10/2026: a mais recente
 * pela DATA da manutenção (depois KM), não pela data em que foi digitada —
 * lançar hoje uma troca de óleo antiga (histórico) passava a valer como a
 * última e reabria um alerta já resolvido. CRIADO_EM só desempata.
 */
function Frota_ultimasManutencoesPorVeiculo_() {
  var todas = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO);
  var porVeiculoTipo = {};
  function chaveOrdem(m) {
    var d = Frota_dataDia_(m.DATA);
    return [d ? d.getTime() : -1, Number(m.KM) || 0, String(m.CRIADO_EM || '')];
  }
  function maisNova(a, b) {
    var x = chaveOrdem(a), y = chaveOrdem(b);
    if (x[0] !== y[0]) return x[0] > y[0];
    if (x[1] !== y[1]) return x[1] > y[1];
    return x[2] > y[2];
  }
  todas.forEach(function(m) {
    var chave = SGO_UTILS.safe(m.VEICULO_ID) + '|' + SGO_UTILS.safe(m.TIPO);
    var atual = porVeiculoTipo[chave];
    if (!atual || maisNova(m, atual)) porVeiculoTipo[chave] = m;
  });
  return porVeiculoTipo;
}

/** Lista de alertas (VENCENDO/VENCIDO) — usado pela tela + reaproveitado por SGO_Alertas.js pro Dashboard/balão do menu. */
function Frota_apiListarAlertasManutencao(sessionId) {
  Frota_bootstrap_();
  Frota_exigirEquipe_(sessionId);
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
  // 16/10/2026: documento renovado substitui o anterior (Frota_statusDocumento_).
  var documentos = Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO);
  var docsVigentes = Frota_documentosVigentes_(documentos);
  documentos.forEach(function(doc) {
    var veiculo = veiculos[SGO_UTILS.safe(doc.VEICULO_ID)];
    if (!veiculo) return;
    var statusDoc = Frota_statusDocumento_(doc, docsVigentes);
    if (statusDoc !== 'VENCENDO' && statusDoc !== 'VENCIDO') return;
    alertas.push({ veiculoId: veiculo.ID, veiculoPlaca: veiculo.PLACA, tipo: 'DOC_' + doc.TIPO_DOCUMENTO, tipoLabel: doc.TIPO_DOCUMENTO, status: statusDoc, categoria: 'DOCUMENTO', vencimento: Frota_textoData_(doc.VALIDADE) });
  });

  // CNH dos condutores (Fase 5, 2026-08-25) — mesmo alarme, mas por
  // pessoa, não por veículo. Reaproveita o campo veiculoPlaca como
  // "rótulo do assunto do alerta" pra não obrigar todo consumidor
  // (dashboard/mobile/desktop) a aprender um campo novo — quem lê
  // categoria:'CNH' sabe que ali vai o nome do condutor, não a placa.
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function(c) {
    if (SGO_UTILS.safeUpper(c.STATUS) === 'INATIVO') return;
    var dias2 = Frota_diasAte_(c.CNH_VALIDADE);
    if (dias2 === null) return;
    var statusCnh = Frota_situacaoPorDias_(dias2);
    if (statusCnh !== 'VENCENDO' && statusCnh !== 'VENCIDO') return;
    alertas.push({ veiculoId: '', veiculoPlaca: c.NOME, tipo: 'CNH', tipoLabel: 'CNH', status: statusCnh, categoria: 'CNH', vencimento: Frota_textoData_(c.CNH_VALIDADE) });
  });

  // Multa sem condutor vinculado (2026-08-28, achado real: o cruzamento
  // automático não acha condutor quando não há retirada compatível, ou
  // acha mais de uma — a multa fica salva do jeito assim mesmo, sem virar
  // pendência visível pra ninguém resolver). Só entra em ABERTA — multa já
  // paga/recorrida/cancelada não precisa mais de condutor pra nada.
  Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_MULTA).forEach(function(multa) {
    if (SGO_UTILS.safeUpper(multa.STATUS) !== 'ABERTA') return;
    // 16/10/2026: MULTIPLOS (mais de uma retirada cobre o horário) grava um
    // condutor só como palpite — também precisa de conferência do gestor.
    var ambigua = SGO_UTILS.safeUpper(multa.STATUS_CRUZAMENTO) === 'MULTIPLOS';
    if (SGO_UTILS.safe(multa.CONDUTOR_ID) && !ambigua) return;
    var veiculo = veiculos[SGO_UTILS.safe(multa.VEICULO_ID)];
    alertas.push({
      veiculoId: multa.VEICULO_ID, veiculoPlaca: veiculo ? veiculo.PLACA : '',
      tipo: 'MULTA_SEM_CONDUTOR', tipoLabel: ambigua ? 'Multa com condutor a conferir (mais de uma retirada no horário)' : 'Multa sem condutor vinculado',
      status: 'VENCIDO', categoria: 'QUALIDADE', vencimento: Frota_textoData_(multa.DATA_INFRACAO)
    });
  });

  return alertas;
}
