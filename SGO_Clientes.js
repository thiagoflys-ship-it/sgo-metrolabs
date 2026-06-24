const SGO_CLIENTES = (() => {
  const SHEET_NAME = sgoGetCfgSafe_().SHEETS.CAD_CLIENTES;
  const STATUS_ATIVO = sgoGetCfgSafe_().STATUS.ATIVO;
  const STATUS_INATIVO = sgoGetCfgSafe_().STATUS.INATIVO;

  function listar(sessionId) {
    const sessao = exigirSessao(sessionId);
    let registros = SGO_DATA.getAll(SHEET_NAME);

    // Trava do Portal do Cliente: Filtra apenas o cliente vinculado à sessão
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      registros = registros.filter(function (r) {
        return SGO_UTILS.safe(r.ID) === SGO_UTILS.safe(sessao.clienteId);
      });
    }

    const itens = registros.slice().sort((a, b) => {
      const sa = SGO_UTILS.safeUpper(a.STATUS);
      const sb = SGO_UTILS.safeUpper(b.STATUS);

      if (sa === sb) {
        return SGO_UTILS.safe(a.RAZAO_SOCIAL).localeCompare(
          SGO_UTILS.safe(b.RAZAO_SOCIAL)
        );
      }

      if (sa === STATUS_ATIVO) return -1;
      if (sb === STATUS_ATIVO) return 1;
      return 0;
    });

    // Módulo corrigido para alinhar com as 6 colunas de log do banco de dados
    SGO_DATA.log("CLIENTES_LISTAR", sessao.usuario, "Listagem de clientes executada.", "CLIENTES");

    return {
      success: true,
      items: itens,
      total: itens.length
    };
  }

  function obter(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const clienteId = SGO_UTILS.safe(id);

    if (!clienteId) {
      return { success: false, message: "ID do cliente não informado." };
    }

    // Trava do Portal do Cliente: Bloqueia acesso a dados de terceiros
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE" && clienteId !== SGO_UTILS.safe(sessao.clienteId)) {
      SGO_DATA.log("ACESSO_NEGADO", sessao.usuario, "Tentou visualizar cliente ID=" + clienteId, "CLIENTES");
      return { success: false, message: "Acesso negado: Você só pode visualizar os dados da sua própria empresa." };
    }

    const registro = SGO_DATA.getById(SHEET_NAME, clienteId);

    if (!registro) {
      return { success: false, message: "Cliente não encontrado." };
    }

    // Prevenção de falha de serialização JSON com datas puras
    if (registro.CRIADO_EM && typeof registro.CRIADO_EM.toISOString === "function") {
      registro.CRIADO_EM = registro.CRIADO_EM.toISOString();
    }

    return {
      success: true,
      item: registro
    };
  }

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    
    // Trava do Portal do Cliente: Escrita bloqueada
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite a criação de registros." };
    }

    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados, false);

    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    if (existeCnpjDuplicado_(dados.CNPJ, "")) {
      return { success: false, message: "Já existe cliente cadastrado com este CNPJ." };
    }

    const registro = SGO_DATA.normalizarObjetoParaSheet(
      SHEET_NAME,
      SGO_DATA.gerarRegistroBase({
        RAZAO_SOCIAL: dados.RAZAO_SOCIAL,
        NOME_FANTASIA: dados.NOME_FANTASIA,
        CNPJ: dados.CNPJ,
        ENDERECO: dados.ENDERECO, // <- Adicionado (Faltava preencher o banco)
        CONTATO: dados.CONTATO,
        EMAIL: dados.EMAIL,
        TELEFONE: dados.TELEFONE,
        STATUS: STATUS_ATIVO
      })
    );

    SGO_DATA.insert(SHEET_NAME, registro);
    SGO_DATA.log("CLIENTES_CRIAR", sessao.usuario, "Cliente criado: " + registro.RAZAO_SOCIAL, "CLIENTES");

    return {
      success: true,
      message: "Cliente cadastrado com sucesso."
    };
  }

  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite a edição de registros." };
    }

    const clienteId = SGO_UTILS.safe(id);

    if (!clienteId) {
      return { success: false, message: "ID do cliente não informado." };
    }

    const atual = SGO_DATA.getById(SHEET_NAME, clienteId);
    if (!atual) {
      return { success: false, message: "Cliente não encontrado." };
    }

    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados, false);

    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    if (dados.CNPJ && existeCnpjDuplicado_(dados.CNPJ, clienteId)) {
      return { success: false, message: "Já existe outro cliente cadastrado com este CNPJ." };
    }

    const novosDados = SGO_DATA.normalizarObjetoParaSheet(SHEET_NAME, {
      ID: clienteId,
      RAZAO_SOCIAL: dados.RAZAO_SOCIAL,
      NOME_FANTASIA: dados.NOME_FANTASIA,
      CNPJ: dados.CNPJ,
      ENDERECO: dados.ENDERECO, // <- Adicionado (Faltava preencher o banco)
      CONTATO: dados.CONTATO,
      EMAIL: dados.EMAIL,
      TELEFONE: dados.TELEFONE,
      STATUS: SGO_UTILS.safeUpper(atual.STATUS) || STATUS_ATIVO,
      CRIADO_EM: atual.CRIADO_EM
    });

    const ok = SGO_DATA.update(SHEET_NAME, clienteId, novosDados);

    if (!ok) {
      return { success: false, message: "Não foi possível atualizar o cliente." };
    }

    SGO_DATA.log("CLIENTES_ATUALIZAR", sessao.usuario, "Cliente atualizado ID=" + clienteId, "CLIENTES");

    return {
      success: true,
      message: "Cliente atualizado com sucesso."
    };
  }

  function inativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite esta ação." };
    }

    const clienteId = SGO_UTILS.safe(id);

    if (!clienteId) {
      return { success: false, message: "ID do cliente não informado." };
    }

    const atual = SGO_DATA.getById(SHEET_NAME, clienteId);
    if (!atual) {
      return { success: false, message: "Cliente não encontrado." };
    }

    const ok = SGO_DATA.update(SHEET_NAME, clienteId, {
      STATUS: STATUS_INATIVO
    });

    if (!ok) {
      return { success: false, message: "Não foi possível inativar o cliente." };
    }

    SGO_DATA.log("CLIENTES_INATIVAR", sessao.usuario, "Cliente inativado ID=" + clienteId, "CLIENTES");

    return {
      success: true,
      message: "Cliente inativado com sucesso."
    };
  }

  function reativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite esta ação." };
    }

    const clienteId = SGO_UTILS.safe(id);

    if (!clienteId) {
      return { success: false, message: "ID do cliente não informado." };
    }

    const atual = SGO_DATA.getById(SHEET_NAME, clienteId);
    if (!atual) {
      return { success: false, message: "Cliente não encontrado." };
    }

    const ok = SGO_DATA.update(SHEET_NAME, clienteId, {
      STATUS: STATUS_ATIVO
    });

    if (!ok) {
      return { success: false, message: "Não foi possível reativar o cliente." };
    }

    SGO_DATA.log("CLIENTES_REATIVAR", sessao.usuario, "Cliente reativado ID=" + clienteId, "CLIENTES");

    return {
      success: true,
      message: "Cliente reativado com sucesso."
    };
  }

  function excluir(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite a exclusão de registros." };
    }

    // Trava Extra de Segurança: Só admins e gestores podem EXCLUIR registros definitivamente
    if (!isAdminSession(sessionId)) {
      SGO_DATA.log("TENTATIVA_EXCLUSAO", sessao.usuario, "Tentativa não autorizada de excluir cliente ID=" + id, "CLIENTES");
      return { success: false, message: "Acesso negado: Apenas gestores podem excluir registros da base." };
    }

    const clienteId = SGO_UTILS.safe(id);

    if (!clienteId) {
      return { success: false, message: "ID do cliente não informado." };
    }

    const atual = SGO_DATA.getById(SHEET_NAME, clienteId);
    if (!atual) {
      return { success: false, message: "Cliente não encontrado." };
    }

    const ok = SGO_DATA.remove(SHEET_NAME, clienteId);

    if (!ok) {
      return { success: false, message: "Não foi possível excluir o cliente." };
    }

    SGO_DATA.log("CLIENTES_EXCLUIR", sessao.usuario, "Cliente excluído ID=" + clienteId, "CLIENTES");

    return {
      success: true,
      message: "Cliente excluído com sucesso."
    };
  }

  function pesquisar(sessionId, termo) {
    const sessao = exigirSessao(sessionId);
    const q = SGO_UTILS.safeLower(termo);
    let registros = SGO_DATA.getAll(SHEET_NAME);

    // Trava do Portal do Cliente
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      registros = registros.filter(function (r) {
        return SGO_UTILS.safe(r.ID) === SGO_UTILS.safe(sessao.clienteId);
      });
    }

    if (!q) {
      return {
        success: true,
        items: registros,
        total: registros.length
      };
    }

    const filtrados = registros.filter(function (r) {
      return [
        r.RAZAO_SOCIAL,
        r.NOME_FANTASIA,
        r.CNPJ,
        r.CONTATO,
        r.EMAIL,
        r.TELEFONE,
        r.STATUS
      ].some(function (v) {
        return SGO_UTILS.safeLower(v).includes(q);
      });
    });

    return {
      success: true,
      items: filtrados,
      total: filtrados.length
    };
  }

  // --- Funções Nativas de Normalização para Segurança ---
  function normalizarCnpj_(valor) {
    // Agora chama a função de formatação limpa do UTILS para centralizar regras
    return SGO_UTILS.normalizeCnpj(valor);
  }

  function isCnpjValido_(valor) {
    // Agora valida com a fórmula matemática real que implementamos no SGO_UTILS, e não apenas o tamanho
    return SGO_UTILS.isCnpj(valor);
  }

  function isEmailValido_(valor) {
    // Chama o UTILS para centralizar regras
    return SGO_UTILS.isEmail(valor);
  }

  function normalizarPayload_(payload) {
    payload = payload || {};

    return {
      RAZAO_SOCIAL: SGO_UTILS.safeUpper(payload.RAZAO_SOCIAL), // Força tudo maiúsculo no banco
      NOME_FANTASIA: SGO_UTILS.safeUpper(payload.NOME_FANTASIA),
      CNPJ: normalizarCnpj_(payload.CNPJ),
      ENDERECO: SGO_UTILS.safeUpper(payload.ENDERECO), // Capturado para preencher a coluna nova do banco
      CONTATO: SGO_UTILS.safeUpper(payload.CONTATO),
      EMAIL: SGO_UTILS.safeLower(payload.EMAIL),
      TELEFONE: SGO_UTILS.onlyDigits(payload.TELEFONE) // Salva só números, UI formata depois
    };
  }

  function validarPayload_(dados, parcial) {
    const erros = [];

    if (!parcial || dados.RAZAO_SOCIAL !== "") {
      if (!dados.RAZAO_SOCIAL) erros.push("Razão social é obrigatória.");
    }

    if (dados.EMAIL && !isEmailValido_(dados.EMAIL)) {
      erros.push("E-mail inválido.");
    }

    // Usando validação pesada que criamos no SGO_Utils.gs (matemática real)
    if (dados.CNPJ && !isCnpjValido_(dados.CNPJ)) {
      erros.push("O CNPJ informado não é válido.");
    }

    return erros;
  }

  function existeCnpjDuplicado_(cnpj, idIgnorado) {
    const alvo = normalizarCnpj_(cnpj);
    if (!alvo) return false;

    const registros = SGO_DATA.getAll(SHEET_NAME);

    return registros.some(function (r) {
      return (
        normalizarCnpj_(r.CNPJ) === alvo &&
        SGO_UTILS.safe(r.ID) !== SGO_UTILS.safe(idIgnorado)
      );
    });
  }

  return {
    listar,
    obter,
    criar,
    atualizar,
    inativar,
    reativar,
    excluir,
    pesquisar
  };
})();

/* =========================
   WRAPPERS BLINDADOS (VACINA ANTI-DATA)
========================= */
function clientesListar(sessionId) { 
  try { return JSON.parse(JSON.stringify(SGO_CLIENTES.listar(sessionId))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function clientesObter(sessionId, id) { 
  try { return JSON.parse(JSON.stringify(SGO_CLIENTES.obter(sessionId, id))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function clientesCriar(sessionId, payload) { 
  try { return JSON.parse(JSON.stringify(SGO_CLIENTES.criar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function clientesAtualizar(sessionId, id, payload) { 
  try { return JSON.parse(JSON.stringify(SGO_CLIENTES.atualizar(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function clientesInativar(sessionId, id) { 
  try { return JSON.parse(JSON.stringify(SGO_CLIENTES.inativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function clientesReativar(sessionId, id) { 
  try { return JSON.parse(JSON.stringify(SGO_CLIENTES.reativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function clientesExcluir(sessionId, id) { 
  try { return JSON.parse(JSON.stringify(SGO_CLIENTES.excluir(sessionId, id))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function clientesPesquisar(sessionId, termo) { 
  try { return JSON.parse(JSON.stringify(SGO_CLIENTES.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}