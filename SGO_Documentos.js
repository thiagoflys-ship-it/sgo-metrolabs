const SGO_DOCUMENTOS = (() => {
  const SHEET_NAME = sgoGetCfgSafe_().SHEETS.DOC_DOCUMENTOS;
  const SHEET_CLIENTES = sgoGetCfgSafe_().SHEETS.CAD_CLIENTES;
  const SHEET_UNIDADES = sgoGetCfgSafe_().SHEETS.CAD_UNIDADES;
  const SHEET_EQUIPA = sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS;
  const STATUS_ATIVO = sgoGetCfgSafe_().STATUS.ATIVO;
  const STATUS_INATIVO = sgoGetCfgSafe_().STATUS.INATIVO;
  const STATUS_PENDENTE = sgoGetCfgSafe_().STATUS.PENDENTE;
  const QR_API = "https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=";

  function listar(sessionId) {
    const sessao = exigirSessao(sessionId);
    let documentos = SGO_DATA.getAll(SHEET_NAME);
    const clientes = SGO_DATA.getAll(SHEET_CLIENTES);
    const unidades = SGO_DATA.getAll(SHEET_UNIDADES);
    const equipamentos = SGO_DATA.getAll(SHEET_EQUIPA);

    // Trava de Segurança Definitiva (Usando a sessão rápida do SGO_Auth)
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      const idClienteReal = SGO_UTILS.safe(sessao.clienteId);
      documentos = documentos.filter(function (d) {
        return SGO_UTILS.safe(d.CLIENTE_ID) === idClienteReal;
      });
    }

    const mapaClientes = montarMapa_(clientes);
    const mapaUnidades = montarMapa_(unidades);
    const mapaEquipamentos = montarMapa_(equipamentos);

    const itens = documentos
      .map(function (d) {
        return enriquecerDocumento_(d, mapaClientes, mapaUnidades, mapaEquipamentos);
      })
      .sort(function (a, b) {
        const sa = SGO_UTILS.safeUpper(a.STATUS);
        const sb = SGO_UTILS.safeUpper(b.STATUS);

        if (sa === sb) {
          const dataA = new Date(a.CRIADO_EM || 0).getTime();
          const dataB = new Date(b.CRIADO_EM || 0).getTime();
          return dataB - dataA; // Ordena do mais recente para o mais antigo
        }

        if (sa === STATUS_ATIVO) return -1;
        if (sb === STATUS_ATIVO) return 1;
        return 0;
      });

    // Módulo corrigido para alinhar com banco
    SGO_DATA.log("DOCUMENTOS_LISTAR", sessao.usuario, "Listagem de documentos executada.", "DOCUMENTOS");

    return {
      success: true,
      items: itens,
      total: itens.length
    };
  }

  function obter(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const docId = SGO_UTILS.safe(id);

    if (!docId) {
      return { success: false, message: "ID do documento não informado." };
    }

    const documento = SGO_DATA.getById(SHEET_NAME, docId);

    if (!documento) {
      return { success: false, message: "Documento não encontrado." };
    }

    // Trava de Segurança Definitiva (Usando a sessão)
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      const idClienteReal = SGO_UTILS.safe(sessao.clienteId);
      if (SGO_UTILS.safe(documento.CLIENTE_ID) !== idClienteReal) {
        SGO_DATA.log("ACESSO_NEGADO", sessao.usuario, "Tentou visualizar documento de outro cliente ID=" + docId, "DOCUMENTOS");
        return { success: false, message: "Acesso negado: Este documento não pertence à sua empresa." };
      }
    }

    const cliente = SGO_DATA.getById(SHEET_CLIENTES, documento.CLIENTE_ID);
    const unidade = SGO_DATA.getById(SHEET_UNIDADES, documento.UNIDADE_ID);
    const equipamento = SGO_DATA.getById(SHEET_EQUIPA, documento.EQUIPAMENTO_ID);

    const item = Object.assign({}, documento, {
      CLIENTE_NOME: cliente ? (cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL || "") : "",
      UNIDADE_NOME: unidade ? SGO_UTILS.safe(unidade.NOME_UNIDADE) : "",
      EQUIPAMENTO_NOME: equipamento ? (SGO_UTILS.safe(equipamento.TIPO) + " - " + SGO_UTILS.safe(equipamento.TAG)) : ""
    });

    if (item.CRIADO_EM && typeof item.CRIADO_EM.toISOString === "function") {
      item.CRIADO_EM = item.CRIADO_EM.toISOString();
    }

    if (item.DATA_EMISSAO && typeof item.DATA_EMISSAO.toISOString === "function") {
      item.DATA_EMISSAO = item.DATA_EMISSAO.toISOString();
    }

    if (item.DATA_VENCIMENTO && typeof item.DATA_VENCIMENTO.toISOString === "function") {
      item.DATA_VENCIMENTO = item.DATA_VENCIMENTO.toISOString();
    }

    return {
      success: true,
      item: item
    };
  }

  // --- MOTOR DE PASTAS NBR 15943 ---
  function obterOuCriarPasta_(pastaPai, nomePasta) {
    const nomeLimpo = String(nomePasta).replace(/[\\/:*?"<>|]/g, "_");
    const pastas = pastaPai.getFoldersByName(nomeLimpo);
    if (pastas.hasNext()) return pastas.next();
    return pastaPai.createFolder(nomeLimpo);
  }

  /**
   * MOTOR DE UPLOAD INTELIGENTE NBR 15943
   * Organiza em Cliente > Unidade > Equipamento (TAG) > Categoria Selecionada
   */
  function uploadInteligente_(sessao, payload, cliente, unidade, equipamento) {
    const rootId = sgoGetCfgSafe_().DRIVE && sgoGetCfgSafe_().DRIVE.FOLDER_DOCUMENTOS
                 ? sgoGetCfgSafe_().DRIVE.FOLDER_DOCUMENTOS
                 : PropertiesService.getScriptProperties().getProperty("FOLDER_DOCUMENTOS");

    if (!rootId) {
      throw new Error("Sistema de pastas inteligente não configurado. Execute a função setupDrive() no script SGO_DriverSetup.gs.");
    }

    const root = DriveApp.getFolderById(rootId);

    // 1. Acessa/Cria Pasta do Cliente
    const nomeCliente = SGO_UTILS.safe(cliente.NOME_FANTASIA) || SGO_UTILS.safe(cliente.RAZAO_SOCIAL) || "Cliente Indefinido";
    const pastaCliente = obterOuCriarPasta_(root, nomeCliente);

    // 2. Acessa/Cria Pasta da Unidade
    const nomeUnidade = SGO_UTILS.safe(unidade.NOME_UNIDADE) || "Unidade Indefinida";
    const pastaUnidade = obterOuCriarPasta_(pastaCliente, nomeUnidade);

    let pastaDestino = pastaUnidade;

    // 3. Se houver equipamento, cria a estrutura exclusiva para ele
    if (equipamento) {
      const nomeEquip = SGO_UTILS.safe(equipamento.TAG) + " - " + SGO_UTILS.safe(equipamento.TIPO);
      const pastaEquip = obterOuCriarPasta_(pastaUnidade, nomeEquip);

      // =========================================================================
      // LIBERAÇÃO CIRÚRGICA: Permite visualizar a pasta via Link/QR Code
      // Mantendo Cliente, Unidade e a Raiz trancados, evitando vazamento de dados
      // =========================================================================
      pastaEquip.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      // Garante que as 5 pastas da norma existam dentro do equipamento
      const categoriasNorma = [
        "1. Relatorios de Manutencao",
        "2. Certificados de Calibracao",
        "3. Relatorios de Qualificacao",
        "4. Ordens de Servico",
        "5. Contratos"
      ];
      categoriasNorma.forEach(cat => obterOuCriarPasta_(pastaEquip, cat));

      // Define a pasta final com base na escolha do Dropdown no formulário
      // Se não houver correspondência, cai em "Outros Documentos"
      const categoriaSelecionada = payload.TIPO_DOCUMENTO || "Outros Documentos";
      pastaDestino = obterOuCriarPasta_(pastaEquip, categoriaSelecionada);
    }

    const base64Data = payload.ARQUIVO_BASE64.split(",")[1] || payload.ARQUIVO_BASE64;
    const bytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(bytes, payload.ARQUIVO_MIME, payload.ARQUIVO_NOME);

    const file = pastaDestino.createFile(blob);
    // IMPORTANTE: Mantém a liberação também no arquivo físico individual
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    SGO_DATA.log("DOCUMENTOS_UPLOAD", sessao.usuario, "Upload Organizado NBR 15943: " + payload.ARQUIVO_NOME, "DOCUMENTOS");

    return {
      url: file.getUrl(),
      fileId: file.getId(),
      hashSha256: calcularHashSha256_(bytes)
    };
  }

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite a criação de registros." };
    }

    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados, false);

    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    const cliente = SGO_DATA.getById(SHEET_CLIENTES, dados.CLIENTE_ID);
    if (!cliente || SGO_UTILS.safeUpper(cliente.STATUS) !== STATUS_ATIVO) {
      return { success: false, message: "Cliente vinculado inválido ou inativo." };
    }

    const unidade = SGO_DATA.getById(SHEET_UNIDADES, dados.UNIDADE_ID);
    if (!unidade || SGO_UTILS.safeUpper(unidade.STATUS) !== STATUS_ATIVO) {
      return { success: false, message: "Unidade vinculada inválida ou inativa." };
    }

    let equipamento = null;
    if (dados.EQUIPAMENTO_ID) {
      equipamento = SGO_DATA.getById(SHEET_EQUIPA, dados.EQUIPAMENTO_ID);
    }

    if (payload.ARQUIVO_BASE64) {
      try {
        // Envia para o motor inteligente de pastas
        const upload = uploadInteligente_(sessao, payload, cliente, unidade, equipamento);
        dados.LINK_ARQUIVO = upload.url;
        dados.FILE_ID = upload.fileId;
        dados.HASH_SHA256 = upload.hashSha256;
      } catch (e) {
        return { success: false, message: "Falha ao organizar arquivo no Drive: " + e.message };
      }
    } else {
        // Se não mandou arquivo, cria o documento como PENDENTE
        dados.STATUS = STATUS_PENDENTE;
    }

    const token = gerarTokenDocumento_(dados);
    const urlValidacao = montarUrlValidacaoDocumento_(token);
    const registro = SGO_DATA.normalizarObjetoParaSheet(
      SHEET_NAME,
      SGO_DATA.gerarRegistroBase({
        CLIENTE_ID: dados.CLIENTE_ID,
        UNIDADE_ID: dados.UNIDADE_ID,
        EQUIPAMENTO_ID: dados.EQUIPAMENTO_ID,
        TIPO_DOCUMENTO: dados.TIPO_DOCUMENTO,
        NOME_ARQUIVO: dados.NOME_ARQUIVO,
        LINK_ARQUIVO: dados.LINK_ARQUIVO,
        FILE_ID: dados.FILE_ID,
        HASH_SHA256: dados.HASH_SHA256,
        TOKEN_VALIDACAO: token,
        URL_VALIDACAO: urlValidacao,
        QR_CODE_LINK: urlValidacao ? QR_API + encodeURIComponent(urlValidacao) : "",
        DATA_EMISSAO: SGO_UTILS.nowIso(),
        DATA_VENCIMENTO: dados.DATA_VENCIMENTO,
        STATUS: dados.STATUS || STATUS_ATIVO
      })
    );

    SGO_DATA.insert(SHEET_NAME, registro);
    return {
      success: true,
      message: "Documento salvo e organizado conforme NBR 15943!"
    };
  }

  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") return { success: false, message: "Acesso negado." };

    const docId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET_NAME, docId);
    if (!atual) return { success: false, message: "Não encontrado." };

    const dados = normalizarPayload_(payload);

    if (payload.ARQUIVO_BASE64) {
      try {
        const cli = SGO_DATA.getById(SHEET_CLIENTES, dados.CLIENTE_ID);
        const uni = SGO_DATA.getById(SHEET_UNIDADES, dados.UNIDADE_ID);
        const eqp = dados.EQUIPAMENTO_ID ? SGO_DATA.getById(SHEET_EQUIPA, dados.EQUIPAMENTO_ID) : null;
        const upload = uploadInteligente_(sessao, payload, cli, uni, eqp);
        dados.LINK_ARQUIVO = upload.url;
        dados.FILE_ID = upload.fileId;
        dados.HASH_SHA256 = upload.hashSha256;
        dados.STATUS = STATUS_ATIVO; // Se estava pendente e fez upload, vira ativo
      } catch (e) {
        return { success: false, message: "Erro no upload: " + e.message };
      }
    } else {
      dados.LINK_ARQUIVO = atual.LINK_ARQUIVO;
      dados.FILE_ID = atual.FILE_ID;
      dados.HASH_SHA256 = atual.HASH_SHA256;
      dados.STATUS = atual.STATUS;
    }

    const tokenAtual = SGO_UTILS.safe(atual.TOKEN_VALIDACAO) || gerarTokenDocumento_(dados);
    const urlValidacao = SGO_UTILS.safe(atual.URL_VALIDACAO) || montarUrlValidacaoDocumento_(tokenAtual);

    const novosDados = SGO_DATA.normalizarObjetoParaSheet(SHEET_NAME, {
      ID: docId,
      CLIENTE_ID: dados.CLIENTE_ID,
      UNIDADE_ID: dados.UNIDADE_ID,
      EQUIPAMENTO_ID: dados.EQUIPAMENTO_ID,
      TIPO_DOCUMENTO: dados.TIPO_DOCUMENTO,
      NOME_ARQUIVO: dados.NOME_ARQUIVO,
      LINK_ARQUIVO: dados.LINK_ARQUIVO,
      FILE_ID: dados.FILE_ID,
      HASH_SHA256: dados.HASH_SHA256,
      TOKEN_VALIDACAO: tokenAtual,
      URL_VALIDACAO: urlValidacao,
      QR_CODE_LINK: urlValidacao ? QR_API + encodeURIComponent(urlValidacao) : "",
      DATA_EMISSAO: atual.DATA_EMISSAO,
      DATA_VENCIMENTO: dados.DATA_VENCIMENTO,
      STATUS: dados.STATUS,
      CRIADO_EM: atual.CRIADO_EM
    });

    SGO_DATA.update(SHEET_NAME, docId, novosDados);

    SGO_DATA.log("DOCUMENTOS_ATUALIZAR", sessao.usuario, "Documento atualizado ID=" + docId, "DOCUMENTOS");

    return { success: true, message: "Documento atualizado com sucesso." };
  }

  function inativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") return { success: false, message: "Acesso negado." };
    SGO_DATA.update(SHEET_NAME, SGO_UTILS.safe(id), { STATUS: STATUS_INATIVO }); return { success: true };
  }
  function reativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") return { success: false, message: "Acesso negado." };
    SGO_DATA.update(SHEET_NAME, SGO_UTILS.safe(id), { STATUS: STATUS_ATIVO }); return { success: true };
  }
  function excluir(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") return { success: false, message: "Acesso negado." };

    if (!isAdminSession(sessionId)) {
      SGO_DATA.log("TENTATIVA_EXCLUSAO", sessao.usuario, "Tentativa não autorizada de excluir documento ID=" + id, "DOCUMENTOS");
      return { success: false, message: "Acesso negado: Apenas gestores podem excluir registros." };
    }

    SGO_DATA.remove(SHEET_NAME, SGO_UTILS.safe(id));
    return { success: true };
  }

  function pesquisar(sessionId, termo) {
    const sessao = exigirSessao(sessionId);
    const q = SGO_UTILS.safeLower(termo);
    let registros = SGO_DATA.getAll(SHEET_NAME);

    // Trava de Segurança Definitiva
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      const idClienteReal = SGO_UTILS.safe(sessao.clienteId);
      registros = registros.filter(r => SGO_UTILS.safe(r.CLIENTE_ID) === idClienteReal);
    }

    const mapaClientes = montarMapa_(SGO_DATA.getAll(SHEET_CLIENTES));
    const base = registros.map(d => enriquecerDocumento_(d, mapaClientes, montarMapa_(SGO_DATA.getAll(SHEET_UNIDADES)), montarMapa_(SGO_DATA.getAll(SHEET_EQUIPA))));

    if (!q) return { success: true, items: base };
    const filtrados = base.filter(r => [r.TIPO_DOCUMENTO, r.NOME_ARQUIVO, r.CLIENTE_NOME].some(v => SGO_UTILS.safeLower(v).includes(q)));
    return { success: true, items: filtrados };
  }

  function listarEquipamentosAtivosPorUnidade(sessionId, unidadeId) {
    const sessao = exigirSessao(sessionId);
    const uid = SGO_UTILS.safe(unidadeId);
    let equipamentos = SGO_DATA.getAll(SHEET_EQUIPA);

    // Trava de Segurança Definitiva
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      const idClienteReal = SGO_UTILS.safe(sessao.clienteId);
      equipamentos = equipamentos.filter(e => SGO_UTILS.safe(e.CLIENTE_ID) === idClienteReal);
    }

    const itens = equipamentos
      .filter(e => SGO_UTILS.safeUpper(e.STATUS) === STATUS_ATIVO && SGO_UTILS.safe(e.UNIDADE_ID) === uid)
      .map(e => ({ ID: SGO_UTILS.safe(e.ID), NOME_EQUIPAMENTO: SGO_UTILS.safe(e.TIPO) + " - " + SGO_UTILS.safe(e.TAG) }));
    return { success: true, items: itens };
  }

  function normalizarPayload_(p) {
    return {
      CLIENTE_ID: SGO_UTILS.safe(p.CLIENTE_ID),
      UNIDADE_ID: SGO_UTILS.safe(p.UNIDADE_ID),
      EQUIPAMENTO_ID: SGO_UTILS.safe(p.EQUIPAMENTO_ID),
      TIPO_DOCUMENTO: SGO_UTILS.safeUpper(p.TIPO_DOCUMENTO),
      NOME_ARQUIVO: SGO_UTILS.safeUpper(p.NOME_ARQUIVO),
      LINK_ARQUIVO: SGO_UTILS.safe(p.LINK_ARQUIVO),
      FILE_ID: SGO_UTILS.safe(p.FILE_ID),
      HASH_SHA256: SGO_UTILS.safe(p.HASH_SHA256),
      DATA_VENCIMENTO: SGO_UTILS.safe(p.DATA_VENCIMENTO)
    };
  }

  function validarPayload_(dados, parcial) {
    const erros = [];
    if (!parcial || dados.CLIENTE_ID !== "") if (!dados.CLIENTE_ID) erros.push("Cliente obrigatório.");
    if (!parcial || dados.UNIDADE_ID !== "") if (!dados.UNIDADE_ID) erros.push("Unidade obrigatória.");
    if (!parcial || dados.TIPO_DOCUMENTO !== "") if (!dados.TIPO_DOCUMENTO) erros.push("Categoria obrigatória.");
    return erros;
  }

  function enriquecerDocumento_(d, mC, mU, mE) {
    const c = Object.assign({}, d);
    const cli = mC[SGO_UTILS.safe(c.CLIENTE_ID)] || {};
    const uni = mU[SGO_UTILS.safe(c.UNIDADE_ID)] || {};
    const eqp = mE[SGO_UTILS.safe(c.EQUIPAMENTO_ID)] || {};
    c.CLIENTE_NOME = cli.NOME_FANTASIA || cli.RAZAO_SOCIAL || "";
    c.UNIDADE_NOME = uni.NOME_UNIDADE || "";
    c.EQUIPAMENTO_NOME = eqp.ID ? (eqp.TIPO + " - " + eqp.TAG) : "Geral da Unidade";
    return c;
  }

  function montarMapa_(lista) {
    const mapa = {};
    (lista || []).forEach(item => { mapa[SGO_UTILS.safe(item.ID)] = item; });
    return mapa;
  }

  function gerarTokenDocumento_(dados) {
    const base = [
      "DOC",
      SGO_UTILS.safeUpper(dados.TIPO_DOCUMENTO).replace(/[^\w]/g, "").substring(0, 10) || "GERAL",
      new Date().getTime(),
      Utilities.getUuid().substring(0, 8).toUpperCase()
    ];
    return base.join("-");
  }

  function montarUrlValidacaoDocumento_(token) {
    let base = "";
    try {
      base = PropertiesService.getScriptProperties().getProperty("SGO_WEBAPP_URL") || ScriptApp.getService().getUrl();
    } catch (e) {}
    if (!base) return "";
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + "validar=" + encodeURIComponent(SGO_UTILS.safeUpper(token));
  }

  function calcularHashSha256_(bytes) {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
    return digest.map(function(b) {
      const v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? "0" + v : v;
    }).join("");
  }

  return { listar, obter, criar, atualizar, inativar, reativar, excluir, pesquisar, listarEquipamentosAtivosPorUnidade };
})();

/* =========================
   WRAPPERS BLINDADOS (VACINA ANTI-DATA)
========================= */
function documentosListar(sessionId) { try { return JSON.parse(JSON.stringify(SGO_DOCUMENTOS.listar(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function documentosObter(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_DOCUMENTOS.obter(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function documentosCriar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_DOCUMENTOS.criar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function documentosAtualizar(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_DOCUMENTOS.atualizar(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function documentosInativar(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_DOCUMENTOS.inativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function documentosReativar(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_DOCUMENTOS.reativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function documentosExcluir(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_DOCUMENTOS.excluir(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function documentosPesquisar(sessionId, termo) { try { return JSON.parse(JSON.stringify(SGO_DOCUMENTOS.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function documentosListarEquipamentosAtivosPorUnidade(sessionId, unidadeId) { try { return JSON.parse(JSON.stringify(SGO_DOCUMENTOS.listarEquipamentosAtivosPorUnidade(sessionId, unidadeId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
