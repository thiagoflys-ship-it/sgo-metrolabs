const SGO_EQUIPAMENTOS = (() => {
  const SHEET_NAME = sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS;
  const SHEET_CLIENTES = sgoGetCfgSafe_().SHEETS.CAD_CLIENTES;
  const SHEET_UNIDADES = sgoGetCfgSafe_().SHEETS.CAD_UNIDADES;
  const SHEET_USUARIOS = sgoGetCfgSafe_().SHEETS.CAD_USUARIOS;
  const STATUS_ATIVO = sgoGetCfgSafe_().STATUS.ATIVO;
  const STATUS_INATIVO = sgoGetCfgSafe_().STATUS.INATIVO;

  // =========================
  // 🔒 VALIDAÇÃO CENTRAL (OTIMIZADA)
  // =========================
  function validarAcessoEquipamento_(sessao, equipamento) {
    if (!sessao || !equipamento) return false;

    const perfil = SGO_UTILS.safeUpper(sessao.perfil);

    // Permite que qualquer funcionário da Metrolabs veja os equipamentos
    if (perfil !== "CLIENTE") return true;

    // Trava de Segurança usando o dado já presente na memória da sessão
    const idClienteReal = SGO_UTILS.safe(sessao.clienteId);
    return SGO_UTILS.safe(equipamento.CLIENTE_ID) === idClienteReal;
  }

  // =========================
  // 📱 QR CODE 
  // =========================
  function obterPorQRCode(token) {
    const t = SGO_UTILS.safe(token);
    if (!t) return null;

    return SGO_DATA.getByField(SHEET_NAME, "QR_TOKEN", t);
  }

  function listar(sessionId) {
    const sessao = exigirSessao(sessionId);
    let equipamentos = SGO_DATA.getAll(SHEET_NAME);
    const clientes = SGO_DATA.getAll(SHEET_CLIENTES);
    const unidades = SGO_DATA.getAll(SHEET_UNIDADES);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      const idClienteReal = SGO_UTILS.safe(sessao.clienteId);
      equipamentos = equipamentos.filter(e => SGO_UTILS.safe(e.CLIENTE_ID) === idClienteReal);
    }

    const mapaClientes = montarMapa_(clientes);
    const mapaUnidades = montarMapa_(unidades);

    const itens = equipamentos
      .map(e => enriquecerEquipamento_(e, mapaClientes, mapaUnidades))
      .sort((a, b) => {
        const sa = SGO_UTILS.safeUpper(a.STATUS);
        const sb = SGO_UTILS.safeUpper(b.STATUS);

        if (sa === sb) return SGO_UTILS.safe(a.TAG).localeCompare(SGO_UTILS.safe(b.TAG));
        if (sa === STATUS_ATIVO) return -1;
        if (sb === STATUS_ATIVO) return 1;
        return 0;
      });

    SGO_DATA.log("EQUIPAMENTOS_LISTAR", sessao.usuario, "Listagem de equipamentos executada.", "EQUIPAMENTOS");

    return { success: true, items: itens, total: itens.length };
  }

  function obter(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const equipId = SGO_UTILS.safe(id);

    if (!equipId) return { success: false, message: "ID não informado." };

    const equipamento = SGO_DATA.getById(SHEET_NAME, equipId);
    if (!equipamento) return { success: false, message: "Não encontrado." };

    // 🔒 NOVA TRAVA
    if (!validarAcessoEquipamento_(sessao, equipamento)) {
      SGO_DATA.log("ACESSO_NEGADO", sessao.usuario, "Tentou visualizar equipamento de outro cliente ID=" + equipId, "EQUIPAMENTOS");
      return { success: false, message: "Acesso negado: Este equipamento não pertence à sua empresa." };
    }

    const cliente = SGO_DATA.getById(SHEET_CLIENTES, equipamento.CLIENTE_ID);
    const unidade = SGO_DATA.getById(SHEET_UNIDADES, equipamento.UNIDADE_ID);

    return {
      success: true,
      item: Object.assign({}, equipamento, {
        CLIENTE_NOME: cliente ? (cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL) : "",
        UNIDADE_NOME: unidade ? unidade.NOME_UNIDADE : ""
      })
    };
  }

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite criar equipamentos." };
    }

    const dados = normalizarPayload_(payload);

    const registro = SGO_DATA.normalizarObjetoParaSheet(
      SHEET_NAME,
      SGO_DATA.gerarRegistroBase({
        CLIENTE_ID: dados.CLIENTE_ID,
        UNIDADE_ID: dados.UNIDADE_ID,
        TIPO: dados.TIPO,
        FABRICANTE: dados.FABRICANTE,
        MODELO: dados.MODELO,
        SERIE: dados.SERIE,
        TAG: dados.TAG,
        SETOR: dados.SETOR,
        TIPO_POSSE: dados.TIPO_POSSE,
        PROPRIETARIO: dados.PROPRIETARIO,
        CLASSE_ANVISA: dados.CLASSE_ANVISA,
        NUMERO_ANVISA: dados.NUMERO_ANVISA,
        RISCO: dados.RISCO,
        VIDA_UTIL: dados.VIDA_UTIL,
        DATA_AQUISICAO: dados.DATA_AQUISICAO,
        PERIODICIDADE_MANUTENCAO: dados.PERIODICIDADE_MANUTENCAO,
        APLICA_CALIBRACAO: dados.APLICA_CALIBRACAO,
        APLICA_QUALIFICACAO: dados.APLICA_QUALIFICACAO,
        APLICA_ENSAIO_ELETRICO: dados.APLICA_ENSAIO_ELETRICO,
        APLICA_MANUTENCAO_PREV: dados.APLICA_MANUTENCAO_PREV,
        STATUS: STATUS_ATIVO,
        QR_TOKEN: SGO_UTILS.uuid()
      })
    );

    SGO_DATA.insert(SHEET_NAME, registro);
    SGO_DATA.log("EQUIPAMENTOS_CRIAR", sessao.usuario, "Equipamento criado TAG=" + dados.TAG, "EQUIPAMENTOS");

    return { success: true, message: "Criado com sucesso.", id: registro.ID };
  }

  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite editar equipamentos." };
    }

    const equipId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET_NAME, equipId);
    
    if (!atual) return { success: false, message: "Equipamento não encontrado." };

    const dados = normalizarPayload_(payload);

    const novosDados = SGO_DATA.normalizarObjetoParaSheet(SHEET_NAME, {
      ID: equipId,
      CLIENTE_ID: dados.CLIENTE_ID,
      UNIDADE_ID: dados.UNIDADE_ID,
      TIPO: dados.TIPO,
      FABRICANTE: dados.FABRICANTE,
      MODELO: dados.MODELO,
      SERIE: dados.SERIE,
      TAG: dados.TAG,
      SETOR: dados.SETOR,
      TIPO_POSSE: dados.TIPO_POSSE,
      PROPRIETARIO: dados.PROPRIETARIO,
      CLASSE_ANVISA: dados.CLASSE_ANVISA,
      NUMERO_ANVISA: dados.NUMERO_ANVISA,
      RISCO: dados.RISCO,
      VIDA_UTIL: dados.VIDA_UTIL,
      DATA_AQUISICAO: dados.DATA_AQUISICAO,
      PERIODICIDADE_MANUTENCAO: dados.PERIODICIDADE_MANUTENCAO,
      APLICA_CALIBRACAO: dados.APLICA_CALIBRACAO,
      APLICA_QUALIFICACAO: dados.APLICA_QUALIFICACAO,
      APLICA_ENSAIO_ELETRICO: dados.APLICA_ENSAIO_ELETRICO,
      APLICA_MANUTENCAO_PREV: dados.APLICA_MANUTENCAO_PREV,
      STATUS: atual.STATUS,
      CRIADO_EM: atual.CRIADO_EM,
      QR_TOKEN: atual.QR_TOKEN || SGO_UTILS.uuid()
    });

    const ok = SGO_DATA.update(SHEET_NAME, equipId, novosDados);
    
    if (ok) SGO_DATA.log("EQUIPAMENTOS_ATUALIZAR", sessao.usuario, "Equipamento atualizado ID=" + equipId, "EQUIPAMENTOS");

    return ok
      ? { success: true, message: "Atualizado com sucesso." }
      : { success: false, message: "Erro ao atualizar." };
  }

  function inativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") return { success: false, message: "Acesso negado." };
    
    SGO_DATA.update(SHEET_NAME, SGO_UTILS.safe(id), { STATUS: STATUS_INATIVO });
    return { success: true };
  }

  function reativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") return { success: false, message: "Acesso negado." };
    
    SGO_DATA.update(SHEET_NAME, SGO_UTILS.safe(id), { STATUS: STATUS_ATIVO });
    return { success: true };
  }

  function excluir(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado." };
    }

    if (!isAdminSession(sessionId)) {
      SGO_DATA.log("TENTATIVA_EXCLUSAO", sessao.usuario, "Tentativa não autorizada de excluir equipamento ID=" + id, "EQUIPAMENTOS");
      return { success: false, message: "Acesso negado: Apenas gestores podem excluir registros." };
    }

    SGO_DATA.remove(SHEET_NAME, SGO_UTILS.safe(id));
    SGO_DATA.log("EQUIPAMENTOS_EXCLUIR", sessao.usuario, "Equipamento excluído ID=" + id, "EQUIPAMENTOS");
    return { success: true };
  }

  function pesquisar(sessionId, termo) {
    // Como a função listar() já aplica a trava de cliente, usamos a base dela
    const base = listar(sessionId).items;
    const q = SGO_UTILS.safeLower(termo);
    
    if(!q) return { success: true, items: base, total: base.length };

    const filtrados = base.filter(r =>
      [r.TIPO, r.TAG, r.FABRICANTE, r.MODELO, r.SERIE, r.CLIENTE_NOME, r.TIPO_POSSE, r.PROPRIETARIO].some(v => SGO_UTILS.safeLower(v).includes(q))
    );

    return { success: true, items: filtrados, total: filtrados.length };
  }

  function listarClientesAtivos(sessionId) {
    const sessao = exigirSessao(sessionId);
    let clientes = SGO_DATA.getAll(SHEET_CLIENTES);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      const idClienteReal = SGO_UTILS.safe(sessao.clienteId);
      clientes = clientes.filter(c => SGO_UTILS.safe(c.ID) === idClienteReal);
    }

    const itens = clientes
      .filter(c => SGO_UTILS.safeUpper(c.STATUS) === STATUS_ATIVO)
      .map(c => ({
        ID: SGO_UTILS.safe(c.ID),
        NOME: SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL)
      }))
      .sort((a, b) => a.NOME.localeCompare(b.NOME));

    return {
      success: true,
      items: itens
    };
  }

  function listarUnidadesAtivasPorCliente(sessionId, clienteId) {
    exigirSessao(sessionId);
    
    const itens = SGO_DATA.getAll(SHEET_UNIDADES)
      .filter(u => SGO_UTILS.safeUpper(u.STATUS) === STATUS_ATIVO && SGO_UTILS.safe(u.CLIENTE_ID) === SGO_UTILS.safe(clienteId))
      .map(u => ({
        ID: SGO_UTILS.safe(u.ID),
        NOME_UNIDADE: SGO_UTILS.safe(u.NOME_UNIDADE)
      }))
      .sort((a, b) => a.NOME_UNIDADE.localeCompare(b.NOME_UNIDADE));
      
    return {
      success: true,
      items: itens
    };
  }

  function normalizarPayload_(payload) {
    payload = payload || {};
    return {
      CLIENTE_ID: SGO_UTILS.safe(payload.CLIENTE_ID),
      UNIDADE_ID: SGO_UTILS.safe(payload.UNIDADE_ID),
      TIPO: SGO_UTILS.safeUpper(payload.TIPO),
      FABRICANTE: SGO_UTILS.safeUpper(payload.FABRICANTE),
      MODELO: SGO_UTILS.safeUpper(payload.MODELO),
      SERIE: SGO_UTILS.safeUpper(payload.SERIE),
      TAG: SGO_UTILS.safeUpper(payload.TAG),
      SETOR: SGO_UTILS.safeUpper(payload.SETOR),
      TIPO_POSSE: SGO_UTILS.safeUpper(payload.TIPO_POSSE),
      PROPRIETARIO: SGO_UTILS.safe(payload.PROPRIETARIO),
      CLASSE_ANVISA: SGO_UTILS.safe(payload.CLASSE_ANVISA),
      NUMERO_ANVISA: SGO_UTILS.safe(payload.NUMERO_ANVISA),
      RISCO: SGO_UTILS.safeUpper(payload.RISCO),
      VIDA_UTIL: SGO_UTILS.safe(payload.VIDA_UTIL),
      DATA_AQUISICAO: SGO_UTILS.safe(payload.DATA_AQUISICAO),
      PERIODICIDADE_MANUTENCAO: SGO_UTILS.safe(payload.PERIODICIDADE_MANUTENCAO),
      APLICA_CALIBRACAO: payload.APLICA_CALIBRACAO ? "S" : "N",
      APLICA_QUALIFICACAO: payload.APLICA_QUALIFICACAO ? "S" : "N",
      APLICA_ENSAIO_ELETRICO: payload.APLICA_ENSAIO_ELETRICO ? "S" : "N",
      APLICA_MANUTENCAO_PREV: payload.APLICA_MANUTENCAO_PREV ? "S" : "N"
    };
  }

  function enriquecerEquipamento_(e, mapaClientes, mapaUnidades) {
    const cli = mapaClientes[SGO_UTILS.safe(e.CLIENTE_ID)] || {};
    const uni = mapaUnidades[SGO_UTILS.safe(e.UNIDADE_ID)] || {};
    
    return Object.assign({}, e, {
      CLIENTE_NOME: cli.NOME_FANTASIA || cli.RAZAO_SOCIAL || "",
      UNIDADE_NOME: uni.NOME_UNIDADE || ""
    });
  }

  function montarMapa_(lista) {
    const mapa = {};
    (lista || []).forEach(i => mapa[SGO_UTILS.safe(i.ID)] = i);
    return mapa;
  }

  function uploadFotoBase64(sessionId, equipamentoId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};

    const equipId = SGO_UTILS.safe(equipamentoId || payload.EQUIPAMENTO_ID);
    if (!equipId) return { success: false, message: "Equipamento nao informado." };

    const base64 = SGO_UTILS.safe(payload.BASE64_DATA);
    if (!base64) return { success: false, message: "Dados da foto nao informados." };

    const mimeType = SGO_UTILS.safe(payload.MIME_TYPE) || "image/jpeg";
    const ext      = mimeType.includes("png") ? ".png" : mimeType.includes("gif") ? ".gif" : ".jpg";
    const tipoFoto = SGO_UTILS.safe(payload.TIPO_FOTO || "EQUIPAMENTO");
    const nome     = SGO_UTILS.safe(payload.NOME_ARQUIVO) || ("equip_" + tipoFoto.toLowerCase() + "_" + equipId + "_" + new Date().getTime() + ext);

    let fileId = "", linkDrive = "";
    try {
      const blob     = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, nome);
      const folderId = sgoGetCfgSafe_().DRIVE.FOLDER_OS;
      const file     = folderId
        ? DriveApp.getFolderById(folderId).createFile(blob)
        : DriveApp.createFile(blob);
      fileId    = file.getId();
      linkDrive = file.getUrl();
      try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (_) {}
    } catch (e) {
      return { success: false, message: "Erro ao salvar foto no Drive: " + e.message };
    }

    const dadosFoto = {
      OS_ID:          "EQUIP-" + equipId,
      EQUIPAMENTO_ID: equipId,
      TIPO_FOTO:      tipoFoto,
      MOMENTO:        tipoFoto,
      NOME_ARQUIVO:   nome,
      FILE_ID:        fileId,
      LINK_DRIVE:     linkDrive,
      MIME_TYPE:      mimeType,
      OBSERVACAO:     SGO_UTILS.safe(payload.OBSERVACAO || ""),
      UPLOAD_POR:     sessao.usuario,
      UPLOAD_EM:      SGO_UTILS.nowIso(),
      ENVIADO_POR:    sessao.usuario,
      ENVIADO_EM:     SGO_UTILS.nowIso()
    };

    SGO_DATA.insert(sgoGetCfgSafe_().SHEETS.OS_FOTOS, SGO_DATA.gerarRegistroBase(dadosFoto), "OS");
    SGO_DATA.log("EQUIP_FOTO_UPLOAD", sessao.usuario, "Foto de equipamento enviada equip=" + equipId + " file=" + fileId, "EQUIPAMENTOS");

    return { success: true, message: "Foto enviada.", item: { FILE_ID: fileId, LINK_DRIVE: linkDrive, NOME_ARQUIVO: nome } };
  }

  return {
    listar, obter, criar, atualizar, inativar, reativar, excluir, pesquisar,
    listarClientesAtivos, listarUnidadesAtivasPorCliente,
    obterPorQRCode, uploadFotoBase64
  };
})();

/* =========================
   WRAPPERS BLINDADOS (VACINA ANTI-DATA)
========================= */
function equipamentosListar(sessionId) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.listar(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function equipamentosObter(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.obter(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function equipamentosCriar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.criar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function equipamentosAtualizar(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.atualizar(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function equipamentosInativar(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.inativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function equipamentosReativar(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.reativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function equipamentosExcluir(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.excluir(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function equipamentosPesquisar(sessionId, termo) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function equipamentosListarClientesAtivos(sessionId) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.listarClientesAtivos(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function equipamentosListarUnidadesAtivasPorCliente(sessionId, clienteId) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.listarUnidadesAtivasPorCliente(sessionId, clienteId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function equipamentoFotoUploadBase64(sessionId, equipamentoId, payload) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.uploadFotoBase64(sessionId, equipamentoId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }