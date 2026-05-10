const SGO_FROTA = (() => {
  const DB = "FROTA";
  const VEIC = SGO_CFG.SHEETS.FRT_VEICULOS;
  const AGD = SGO_CFG.SHEETS.FRT_AGENDAMENTOS;
  const VIST = SGO_CFG.SHEETS.FRT_VISTORIAS;
  const ABAST = SGO_CFG.SHEETS.FRT_ABASTECIMENTOS;
  const MANUT = SGO_CFG.SHEETS.FRT_MANUTENCAO;

  function podeEditar_(sessao) {
    const p = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    return ["ADMIN", "GESTOR"].indexOf(p) >= 0;
  }

  function podeOperar_(sessao) {
    const p = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    return ["ADMIN", "GESTOR", "TECNICO"].indexOf(p) >= 0;
  }

  function listarVeiculos(sessionId) {
    exigirSessao(sessionId);
    const items = SGO_DATA.getAll(VEIC, DB).sort((a, b) => SGO_UTILS.safe(a.PLACA).localeCompare(SGO_UTILS.safe(b.PLACA)));
    return { success: true, items: items, total: items.length };
  }

  function pesquisarVeiculos(sessionId, termo) {
    const base = listarVeiculos(sessionId).items;
    const q = SGO_UTILS.safeLower(termo);
    const items = q ? base.filter(v => [v.PLACA, v.MODELO, v.MARCA, v.STATUS, v.PROPRIETARIO].some(x => SGO_UTILS.safeLower(x).indexOf(q) >= 0)) : base;
    return { success: true, items: items, total: items.length };
  }

  function salvarVeiculo(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeEditar_(sessao)) return { success: false, message: "Acesso negado." };
    const dados = normalizarVeiculo_(payload);
    if (!dados.PLACA) return { success: false, message: "Informe a placa." };
    if (payload && payload.ID) {
      const atual = SGO_DATA.getById(VEIC, SGO_UTILS.safe(payload.ID), DB);
      if (!atual) return { success: false, message: "Veiculo nao encontrado." };
      SGO_DATA.update(VEIC, atual.ID, Object.assign({}, dados, { CRIADO_EM: atual.CRIADO_EM }), DB);
      return { success: true, message: "Veiculo atualizado." };
    }
    SGO_DATA.insert(VEIC, SGO_DATA.gerarRegistroBase(dados), DB);
    return { success: true, message: "Veiculo criado." };
  }

  function listarAgendamentos(sessionId) {
    exigirSessao(sessionId);
    return { success: true, items: enriquecerAgendamentos_(SGO_DATA.getAll(AGD, DB)) };
  }

  function salvarAgendamento(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeOperar_(sessao)) return { success: false, message: "Acesso negado." };
    const dados = normalizarAgendamento_(payload);
    if (!dados.VEICULO_ID || !dados.DATA_INICIO) return { success: false, message: "Informe veiculo e inicio." };
    dados.KM_PERCORRIDO = calcularKm_(dados.KM_SAIDA, dados.KM_CHEGADA);
    dados.CUSTO_TOTAL = SGO_UTILS.toNumber(dados.KM_PERCORRIDO, 0) * SGO_UTILS.toNumber(dados.CUSTO_KM, 0);
    if (payload && payload.ID) {
      SGO_DATA.update(AGD, SGO_UTILS.safe(payload.ID), dados, DB);
      return { success: true, message: "Agendamento atualizado." };
    }
    SGO_DATA.insert(AGD, SGO_DATA.gerarRegistroBase(dados), DB);
    return { success: true, message: "Agendamento criado." };
  }

  function listarVistorias(sessionId, veiculoId) {
    exigirSessao(sessionId);
    let items = SGO_DATA.getAll(VIST, DB);
    if (veiculoId) items = items.filter(v => SGO_UTILS.safe(v.VEICULO_ID) === SGO_UTILS.safe(veiculoId));
    return { success: true, items: items };
  }

  function salvarVistoria(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeOperar_(sessao)) return { success: false, message: "Acesso negado." };
    const dados = {
      VEICULO_ID: SGO_UTILS.safe(payload && payload.VEICULO_ID),
      TECNICO_ID: SGO_UTILS.safe((payload && payload.TECNICO_ID) || sessao.userId),
      TIPO: SGO_UTILS.safeUpper(payload && payload.TIPO),
      DATA: SGO_UTILS.safe((payload && payload.DATA) || SGO_UTILS.nowIso()),
      KM: SGO_UTILS.safe(payload && payload.KM),
      COMBUSTIVEL_PCT: SGO_UTILS.safe(payload && payload.COMBUSTIVEL_PCT),
      PNEUS_OK: boolSN_(payload && payload.PNEUS_OK),
      LATARIA_OK: boolSN_(payload && payload.LATARIA_OK),
      INTERIOR_OK: boolSN_(payload && payload.INTERIOR_OK),
      AVARIAS_DESCRICAO: SGO_UTILS.safe(payload && payload.AVARIAS_DESCRICAO),
      LINK_FOTOS: SGO_UTILS.safe(payload && payload.LINK_FOTOS),
      APROVADO: boolSN_(payload && payload.APROVADO),
      APROVADO_POR: SGO_UTILS.safe(payload && payload.APROVADO_POR)
    };
    if (!dados.VEICULO_ID) return { success: false, message: "Informe o veiculo." };
    SGO_DATA.insert(VIST, SGO_DATA.gerarRegistroBase(dados), DB);
    return { success: true, message: "Vistoria registrada." };
  }

  function listarAbastecimentos(sessionId, veiculoId) {
    exigirSessao(sessionId);
    let items = SGO_DATA.getAll(ABAST, DB);
    if (veiculoId) items = items.filter(v => SGO_UTILS.safe(v.VEICULO_ID) === SGO_UTILS.safe(veiculoId));
    return { success: true, items: items };
  }

  function salvarAbastecimento(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeOperar_(sessao)) return { success: false, message: "Acesso negado." };
    const litros = SGO_UTILS.toNumber(payload && payload.LITROS, 0);
    const valorLitro = SGO_UTILS.toNumber(payload && payload.VALOR_LITRO, 0);
    const dados = {
      VEICULO_ID: SGO_UTILS.safe(payload && payload.VEICULO_ID),
      TECNICO_ID: SGO_UTILS.safe((payload && payload.TECNICO_ID) || sessao.userId),
      DATA: SGO_UTILS.safe((payload && payload.DATA) || SGO_UTILS.nowIso()),
      KM: SGO_UTILS.safe(payload && payload.KM),
      LITROS: litros,
      VALOR_LITRO: valorLitro,
      VALOR_TOTAL: litros * valorLitro,
      TIPO_COMBUSTIVEL: SGO_UTILS.safeUpper(payload && payload.TIPO_COMBUSTIVEL),
      POSTO: SGO_UTILS.safe(payload && payload.POSTO),
      NOTA_FISCAL: SGO_UTILS.safe(payload && payload.NOTA_FISCAL),
      LINK_NF: SGO_UTILS.safe(payload && payload.LINK_NF)
    };
    if (!dados.VEICULO_ID) return { success: false, message: "Informe o veiculo." };
    SGO_DATA.insert(ABAST, SGO_DATA.gerarRegistroBase(dados), DB);
    if (dados.KM) SGO_DATA.update(VEIC, dados.VEICULO_ID, { KM_ATUAL: dados.KM }, DB);
    return { success: true, message: "Abastecimento registrado." };
  }

  function listarManutencoes(sessionId, veiculoId) {
    exigirSessao(sessionId);
    let items = SGO_DATA.getAll(MANUT, DB);
    if (veiculoId) items = items.filter(v => SGO_UTILS.safe(v.VEICULO_ID) === SGO_UTILS.safe(veiculoId));
    return { success: true, items: items };
  }

  function salvarManutencao(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeEditar_(sessao)) return { success: false, message: "Acesso negado." };
    const dados = {
      VEICULO_ID: SGO_UTILS.safe(payload && payload.VEICULO_ID),
      TIPO_MANUT: SGO_UTILS.safeUpper(payload && payload.TIPO_MANUT),
      DESCRICAO: SGO_UTILS.safe(payload && payload.DESCRICAO),
      DATA: SGO_UTILS.safe(payload && payload.DATA),
      KM: SGO_UTILS.safe(payload && payload.KM),
      OFICINA: SGO_UTILS.safe(payload && payload.OFICINA),
      CUSTO: SGO_UTILS.safe(payload && payload.CUSTO),
      NOTA_FISCAL: SGO_UTILS.safe(payload && payload.NOTA_FISCAL),
      LINK_NF: SGO_UTILS.safe(payload && payload.LINK_NF),
      PROXIMA_DATA: SGO_UTILS.safe(payload && payload.PROXIMA_DATA),
      PROXIMO_KM: SGO_UTILS.safe(payload && payload.PROXIMO_KM),
      STATUS: SGO_UTILS.safeUpper((payload && payload.STATUS) || "PROGRAMADA")
    };
    if (!dados.VEICULO_ID) return { success: false, message: "Informe o veiculo." };
    SGO_DATA.insert(MANUT, SGO_DATA.gerarRegistroBase(dados), DB);
    SGO_DATA.update(VEIC, dados.VEICULO_ID, {
      KM_ULTIMA_MANUT: dados.KM,
      KM_PROXIMA_MANUT: dados.PROXIMO_KM,
      DATA_ULTIMA_MANUT: dados.DATA,
      DATA_PROXIMA_MANUT: dados.PROXIMA_DATA
    }, DB);
    return { success: true, message: "Manutencao registrada." };
  }

  function normalizarVeiculo_(payload) {
    payload = payload || {};
    return {
      PLACA: SGO_UTILS.safeUpper(payload.PLACA),
      MODELO: SGO_UTILS.safeUpper(payload.MODELO),
      MARCA: SGO_UTILS.safeUpper(payload.MARCA),
      ANO: SGO_UTILS.safe(payload.ANO),
      COR: SGO_UTILS.safeUpper(payload.COR),
      TIPO_COMBUSTIVEL: SGO_UTILS.safeUpper(payload.TIPO_COMBUSTIVEL),
      RENAVAM: SGO_UTILS.safe(payload.RENAVAM),
      CHASSI: SGO_UTILS.safeUpper(payload.CHASSI),
      PROPRIETARIO: SGO_UTILS.safe(payload.PROPRIETARIO),
      KM_ATUAL: SGO_UTILS.safe(payload.KM_ATUAL),
      KM_ULTIMA_MANUT: SGO_UTILS.safe(payload.KM_ULTIMA_MANUT),
      KM_PROXIMA_MANUT: SGO_UTILS.safe(payload.KM_PROXIMA_MANUT),
      DATA_ULTIMA_MANUT: SGO_UTILS.safe(payload.DATA_ULTIMA_MANUT),
      DATA_PROXIMA_MANUT: SGO_UTILS.safe(payload.DATA_PROXIMA_MANUT),
      DATA_VENCIMENTO_SEGURO: SGO_UTILS.safe(payload.DATA_VENCIMENTO_SEGURO),
      DATA_VENCIMENTO_IPVA: SGO_UTILS.safe(payload.DATA_VENCIMENTO_IPVA),
      DATA_VENCIMENTO_LICENCIAMENTO: SGO_UTILS.safe(payload.DATA_VENCIMENTO_LICENCIAMENTO),
      CUSTO_KM: SGO_UTILS.safe(payload.CUSTO_KM),
      STATUS: SGO_UTILS.safeUpper(payload.STATUS || SGO_CFG.FROTA.STATUS_VEICULO.DISPONIVEL),
      BLOQUEADO: payload.BLOQUEADO ? "S" : "N",
      MOTIVO_BLOQUEIO: SGO_UTILS.safe(payload.MOTIVO_BLOQUEIO),
      TECNICO_RESPONSAVEL_ID: SGO_UTILS.safe(payload.TECNICO_RESPONSAVEL_ID),
      LINK_PASTA_DRIVE: SGO_UTILS.safe(payload.LINK_PASTA_DRIVE)
    };
  }

  function normalizarAgendamento_(payload) {
    payload = payload || {};
    return {
      VEICULO_ID: SGO_UTILS.safe(payload.VEICULO_ID),
      TECNICO_ID: SGO_UTILS.safe(payload.TECNICO_ID),
      OS_ID: SGO_UTILS.safe(payload.OS_ID),
      MISSAO_ID: SGO_UTILS.safe(payload.MISSAO_ID),
      DATA_INICIO: SGO_UTILS.safe(payload.DATA_INICIO),
      DATA_FIM: SGO_UTILS.safe(payload.DATA_FIM),
      STATUS: SGO_UTILS.safeUpper(payload.STATUS || "RESERVADO"),
      KM_SAIDA: SGO_UTILS.safe(payload.KM_SAIDA),
      KM_CHEGADA: SGO_UTILS.safe(payload.KM_CHEGADA),
      CUSTO_KM: SGO_UTILS.safe(payload.CUSTO_KM),
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES)
    };
  }

  function enriquecerAgendamentos_(items) {
    const mapa = {};
    SGO_DATA.getAll(VEIC, DB).forEach(v => mapa[SGO_UTILS.safe(v.ID)] = v);
    return (items || []).map(a => Object.assign({}, a, {
      VEICULO_PLACA: (mapa[SGO_UTILS.safe(a.VEICULO_ID)] || {}).PLACA || ""
    }));
  }

  function calcularKm_(saida, chegada) {
    const s = SGO_UTILS.toNumber(saida, 0);
    const c = SGO_UTILS.toNumber(chegada, 0);
    return c > s ? c - s : 0;
  }

  function boolSN_(v) {
    return SGO_UTILS.toBoolean(v) ? "S" : "N";
  }

  return {
    listarVeiculos, pesquisarVeiculos, salvarVeiculo,
    listarAgendamentos, salvarAgendamento,
    listarVistorias, salvarVistoria,
    listarAbastecimentos, salvarAbastecimento,
    listarManutencoes, salvarManutencao
  };
})();

function frotaListarVeiculos(sessionId) { try { return JSON.parse(JSON.stringify(SGO_FROTA.listarVeiculos(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function frotaPesquisarVeiculos(sessionId, termo) { try { return JSON.parse(JSON.stringify(SGO_FROTA.pesquisarVeiculos(sessionId, termo))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function frotaSalvarVeiculo(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_FROTA.salvarVeiculo(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function frotaListarAgendamentos(sessionId) { try { return JSON.parse(JSON.stringify(SGO_FROTA.listarAgendamentos(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function frotaSalvarAgendamento(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_FROTA.salvarAgendamento(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function frotaListarVistorias(sessionId, veiculoId) { try { return JSON.parse(JSON.stringify(SGO_FROTA.listarVistorias(sessionId, veiculoId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function frotaSalvarVistoria(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_FROTA.salvarVistoria(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function frotaListarAbastecimentos(sessionId, veiculoId) { try { return JSON.parse(JSON.stringify(SGO_FROTA.listarAbastecimentos(sessionId, veiculoId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function frotaSalvarAbastecimento(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_FROTA.salvarAbastecimento(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function frotaListarManutencoes(sessionId, veiculoId) { try { return JSON.parse(JSON.stringify(SGO_FROTA.listarManutencoes(sessionId, veiculoId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function frotaSalvarManutencao(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_FROTA.salvarManutencao(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
