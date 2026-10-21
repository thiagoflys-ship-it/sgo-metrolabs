const SGO_EQUIPAMENTOS = (() => {
  const SHEET_NAME = "CAD_EQUIPAMENTOS";
  const SHEET_CLIENTES = "CAD_CLIENTES";
  const SHEET_UNIDADES = "CAD_UNIDADES";
  const SHEET_USUARIOS = "CAD_USUARIOS";
  const STATUS_ATIVO = "ATIVO";
  const STATUS_INATIVO = "INATIVO";

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
    const atendimentosAuvo = listarAtendimentosAuvo_(equipId, sessao);

    return {
      success: true,
      item: Object.assign({}, equipamento, {
        CLIENTE_NOME: cliente ? (cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL) : "",
        UNIDADE_NOME: unidade ? unidade.NOME_UNIDADE : ""
      }),
      atendimentosAuvo: atendimentosAuvo
    };
  }

  // Atendimentos do Auvo vinculados a este equipamento (via equipmentsId
  // do Task, resolvido sob demanda em SGO_Auvo_Incremental.js). Só
  // leitura — nunca cria/edita nada aqui.
  function listarAtendimentosAuvo_(equipId, sessao) {
    try {
      return SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_TAREFAS)
        .filter(function(t) { return (SGO_UTILS.safeUpper(sessao.perfil) !== "CLIENTE" || SGO_UTILS.safe(t.CLIENTE_ID_SGO) === SGO_UTILS.safe(sessao.clienteId)) && SGO_UTILS.safe(t.EQUIPAMENTOS_ID_SGO).split(",").indexOf(equipId) !== -1; })
        .sort(function(a, b) { return new Date(b.DATA_TAREFA) - new Date(a.DATA_TAREFA); })
        .slice(0, 20)
        .map(function(t) {
          return {
            auvoTaskId: t.AUVO_TASK_ID,
            data: t.DATA_TAREFA,
            tipo: t.TIPO_TAREFA,
            finalizada: t.FINALIZADA === "SIM",
            tecnico: t.TECNICO_NOME_AUVO || (t.TECNICO_AUVO_ID ? "Técnico Auvo #" + t.TECNICO_AUVO_ID : ""),
            relato: t.RELATO_SERVICO
          };
        });
    } catch (e) {
      return []; // aba AUVO_TAREFAS pode nem existir ainda (integração nunca rodou)
    }
  }

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite criar equipamentos." };
    }

    SGO_EQP_garantirColunas_();
    const dados = normalizarPayload_(payload);
    const errosVinculo = validarVinculo_(dados);
    if (errosVinculo) return { success: false, message: "Não foi possível cadastrar: " + errosVinculo };

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
        PATRIMONIO: dados.PATRIMONIO,
        ANO_FABRICACAO: dados.ANO_FABRICACAO,
        CAPACIDADE: dados.CAPACIDADE,
        NUM_CAMARAS: dados.NUM_CAMARAS,
        RESPONSAVEL_CLIENTE: dados.RESPONSAVEL_CLIENTE,
        STATUS: STATUS_ATIVO,
        QR_TOKEN: SGO_UTILS.uuid() // 🔥 QR automático
      })
    );

    SGO_DATA.insert(SHEET_NAME, registro);
    SGO_DATA.log("EQUIPAMENTOS_CRIAR", sessao.usuario, "Equipamento criado TAG=" + dados.TAG, "EQUIPAMENTOS");

    return { success: true, message: "Equipamento " + nomeEquip_(registro) + " cadastrado." + avisoSerieRepetida_(registro), item: registro };
  }

  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite editar equipamentos." };
    }

    SGO_EQP_garantirColunas_();
    const equipId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET_NAME, equipId);
    
    if (!atual) return { success: false, message: "Equipamento não encontrado." };

    // Merge: campo ausente no pedido mantém o valor atual (não apaga).
    const dados = SGO_DATA.mesclarCampos_(atual, normalizarPayload_(payload), payload,
      ["CLIENTE_ID", "UNIDADE_ID", "TIPO", "FABRICANTE", "MODELO", "SERIE", "TAG", "SETOR"].concat(SGO_EQP_CAMPOS_NOVOS));
    if (SGO_UTILS.safe(dados.CLIENTE_ID) !== SGO_UTILS.safe(atual.CLIENTE_ID) || SGO_UTILS.safe(dados.UNIDADE_ID) !== SGO_UTILS.safe(atual.UNIDADE_ID)) {
      return { success: false, message: "Não foi possível salvar: o equipamento não muda de cliente ou de unidade por esta tela. Use Gestão de vínculos (Tipo Equipamento, ação Transferir), que confere documentos e certificados ligados." };
    }

    const novosDados = Object.assign({}, atual, {
      ID: equipId,
      CLIENTE_ID: dados.CLIENTE_ID,
      UNIDADE_ID: dados.UNIDADE_ID,
      TIPO: dados.TIPO,
      FABRICANTE: dados.FABRICANTE,
      MODELO: dados.MODELO,
      SERIE: dados.SERIE,
      TAG: dados.TAG,
      SETOR: dados.SETOR,
      PATRIMONIO: dados.PATRIMONIO,
      ANO_FABRICACAO: dados.ANO_FABRICACAO,
      CAPACIDADE: dados.CAPACIDADE,
      NUM_CAMARAS: dados.NUM_CAMARAS,
      RESPONSAVEL_CLIENTE: dados.RESPONSAVEL_CLIENTE,
      STATUS: atual.STATUS,
      CRIADO_EM: atual.CRIADO_EM,
      QR_TOKEN: atual.QR_TOKEN || SGO_UTILS.uuid() // Garante token caso não tenha
    });

    const ok = SGO_DATA.update(SHEET_NAME, equipId, novosDados);
    
    if (ok) SGO_DATA.log("EQUIPAMENTOS_ATUALIZAR", sessao.usuario, "Equipamento atualizado ID=" + equipId, "EQUIPAMENTOS");

    return ok
      ? { success: true, message: "Equipamento " + nomeEquip_(Object.assign({}, atual, novosDados)) + " atualizado." + avisoSerieRepetida_(novosDados) }
      : { success: false, message: "Erro ao atualizar." };
  }

  // 17/10/2026: mensagens dizem qual equipamento (TAG, ou tipo e série).
  // 21/10/2026: número de série repetido no mesmo cliente não bloqueia (placas antigas, série curta), mas avisa.
  function avisoSerieRepetida_(e) {
    try {
      const serie = SGO_UTILS.safeUpper(e && e.SERIE);
      if (!serie || /^(N\/P|N\/A|S\/N|SEM SERIE|SEM SÉRIE|-)$/.test(serie)) return "";
      const outro = SGO_DATA.getAll(SHEET_NAME).filter(function (x) {
        return String(x.ID) !== String(e.ID) && SGO_UTILS.safe(x.CLIENTE_ID) === SGO_UTILS.safe(e.CLIENTE_ID) && SGO_UTILS.safeUpper(x.SERIE) === serie && SGO_UTILS.safeUpper(x.STATUS || STATUS_ATIVO) === STATUS_ATIVO;
      })[0];
      return outro ? " Atenção: o equipamento " + nomeEquip_(outro) + " deste cliente tem o mesmo número de série (" + serie + "). Confira se não é o mesmo equipamento cadastrado duas vezes." : "";
    } catch (err) { return ""; }
  }

  function nomeEquip_(e) { e = e || {}; return SGO_UTILS.safe(e.TAG) || [SGO_UTILS.safe(e.TIPO), SGO_UTILS.safe(e.SERIE)].filter(Boolean).join(" ") || "sem identificação"; }

  function inativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") return { success: false, message: "Acesso negado." };
    
    const equipId = SGO_UTILS.safe(id);
    const atualI = SGO_DATA.getById(SHEET_NAME, equipId);
    if (!atualI) return { success: false, message: "Equipamento não encontrado: pode ter sido alterado por outra pessoa. Atualize a lista e tente de novo." };
    if (!SGO_DATA.update(SHEET_NAME, equipId, { STATUS: STATUS_INATIVO })) return { success: false, message: "Não foi possível inativar o equipamento. Atualize a lista e tente de novo." };
    SGO_DATA.log("EQUIPAMENTOS_INATIVAR", sessao.usuario, "Equipamento inativado ID=" + equipId, "EQUIPAMENTOS");
    return { success: true, message: "Equipamento " + nomeEquip_(atualI) + " inativado." };
  }

  function reativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") return { success: false, message: "Acesso negado." };
    
    const equipId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET_NAME, equipId);
    if (!atual) return { success: false, message: "Equipamento não encontrado: pode ter sido alterado por outra pessoa. Atualize a lista e tente de novo." };
    // Não reativa equipamento ligado a cliente/unidade inativos (ficaria "ativo" sem vínculo válido).
    const errosVinculo = validarVinculo_(atual);
    if (errosVinculo) return { success: false, message: "Não foi possível reativar: " + errosVinculo };
    if (!SGO_DATA.update(SHEET_NAME, equipId, { STATUS: STATUS_ATIVO })) return { success: false, message: "Não foi possível reativar o equipamento. Atualize a lista e tente de novo." };
    SGO_DATA.log("EQUIPAMENTOS_REATIVAR", sessao.usuario, "Equipamento reativado ID=" + equipId, "EQUIPAMENTOS");
    return { success: true, message: "Equipamento " + nomeEquip_(atual) + " reativado." };
  }

  /** Cliente e unidade obrigatórios, ativos e correspondentes. Devolve a mensagem do problema ou "". */
  function validarVinculo_(dados) {
    if (!SGO_UTILS.safe(dados.CLIENTE_ID)) return "Selecione o cliente do equipamento.";
    if (!SGO_UTILS.safe(dados.UNIDADE_ID)) return "Selecione a unidade do equipamento.";
    const cliente = SGO_DATA.getById(SHEET_CLIENTES, dados.CLIENTE_ID);
    if (!cliente) return "O cliente escolhido não foi encontrado. Atualize a página e selecione de novo.";
    if (SGO_UTILS.safeUpper(cliente.STATUS) !== STATUS_ATIVO) return "o cliente deste equipamento está inativo. Reative o cliente em Cadastros > Clientes e tente de novo.";
    const unidade = SGO_DATA.getById(SHEET_UNIDADES, dados.UNIDADE_ID);
    if (!unidade || SGO_UTILS.safe(unidade.CLIENTE_ID) !== SGO_UTILS.safe(cliente.ID)) return "A unidade escolhida não pertence a este cliente. Selecione o cliente e depois uma unidade dele.";
    if (SGO_UTILS.safeUpper(unidade.STATUS) !== STATUS_ATIVO) return "a unidade deste equipamento está inativa. Reative a unidade em Cadastros > Unidades e tente de novo.";
    return "";
  }

  /** Abas (fora do cadastro) que citam este equipamento. Só leitura. */
  function tabelasComEquipamento_(equipId) {
    const achadas = [];
    SGO_DATA.getDB().getSheets().forEach(function (sheet) {
      const nome = sheet.getName();
      if (nome === SHEET_NAME || /^(SYS_LOGS|BK_|SYS_VINCULOS_AUDITORIA)/.test(nome) || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return;
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const cols = headers.map(function (h, i) { return /^(EQUIPAMENTO_ID|EQUIPAMENTOS_ID_SGO)$/.test(String(h)) ? i : -1; }).filter(function (i) { return i >= 0; });
      if (cols.some(function (i) { return sheet.getRange(2, i + 1, sheet.getLastRow() - 1, 1).getValues().some(function (r) { return String(r[0]).split(",").map(function (x) { return x.trim(); }).indexOf(equipId) >= 0; }); })) achadas.push(nome);
    });
    return achadas;
  }

  function excluir(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado." };
    }

    if (!isAdminSession(sessionId)) {
      SGO_DATA.log("TENTATIVA_EXCLUSAO", sessao.usuario, "Tentativa não autorizada de excluir equipamento ID=" + id, "EQUIPAMENTOS");
      return { success: false, message: "Excluir é feito pela gestão (Gestor, Diretoria ou Administrador). Nada foi alterado. Você pode continuar criando e editando cadastros; para excluir ou trocar vínculos, peça à gestão." };
    }

    const equipId = SGO_UTILS.safe(id);
    const atualE = SGO_DATA.getById(SHEET_NAME, equipId);
    if (!atualE) return { success: false, message: "Equipamento não encontrado: pode ter sido excluído por outra pessoa. Atualize a lista." };
    // Equipamento com documento, certificado, laudo ou atendimento ligado não é apagado
    // (perderia o histórico do prontuário): o caminho é inativar.
    const ligados = tabelasComEquipamento_(equipId);
    if (ligados.length) return { success: false, message: "Não foi possível excluir: este equipamento tem registros ligados em " + ligados.join(", ") + ". Para tirar de uso sem perder o histórico, use Inativar." };
    if (!SGO_DATA.remove(SHEET_NAME, equipId)) return { success: false, message: "Não foi possível excluir o equipamento. Atualize a lista e tente de novo." };
    SGO_DATA.log("EQUIPAMENTOS_EXCLUIR", sessao.usuario, "Equipamento excluído ID=" + equipId, "EQUIPAMENTOS");
    return { success: true, message: "Equipamento " + nomeEquip_(atualE) + " excluído." };
  }

  function pesquisar(sessionId, termo) {
    // Como a função listar() já aplica a trava de cliente, usamos a base dela
    const base = listar(sessionId).items;
    const q = SGO_UTILS.safeLower(termo);
    
    if(!q) return { success: true, items: base, total: base.length };

    const qDigitos = String(termo || "").replace(/\D/g, "");
    const filtrados = base.filter(r => {
      const bateTexto = [r.TIPO, r.TAG, r.FABRICANTE, r.MODELO, r.SERIE, r.CLIENTE_NOME, r.UNIDADE_NOME].some(v => SGO_UTILS.safeLower(v).includes(q));
      const bateCnpj = qDigitos.length >= 3 && String(r.CLIENTE_CNPJ || "").replace(/\D/g, "").indexOf(qDigitos) !== -1;
      return bateTexto || bateCnpj;
    });

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
        NOME: SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL),
        CNPJ: SGO_UTILS.safe(c.CNPJ)
      }))
      .sort((a, b) => a.NOME.localeCompare(b.NOME));

    return {
      success: true,
      items: itens
    };
  }

  function listarUnidadesAtivasPorCliente(sessionId, clienteId) {
    return SGO_VINCULOS.units(sessionId, clienteId);
}

  function normalizarPayload_(payload) {
    payload = payload || {};
    return {
      CLIENTE_ID: SGO_UTILS.safe(payload.CLIENTE_ID),
      UNIDADE_ID: SGO_UTILS.safe(payload.UNIDADE_ID),
      TIPO: SGO_UTILS.safeUpper(payload.TIPO), // Padroniza tipo no banco
      FABRICANTE: SGO_UTILS.safeUpper(payload.FABRICANTE),
      MODELO: SGO_UTILS.safeUpper(payload.MODELO),
      SERIE: SGO_UTILS.safeUpper(payload.SERIE),
      TAG: SGO_UTILS.safeUpper(payload.TAG),
      SETOR: SGO_UTILS.safeUpper(payload.SETOR),
      PATRIMONIO: SGO_UTILS.safeUpper(payload.PATRIMONIO),
      ANO_FABRICACAO: SGO_UTILS.safe(payload.ANO_FABRICACAO).replace(/\D/g, "").slice(0, 4),
      CAPACIDADE: SGO_UTILS.safe(payload.CAPACIDADE),
      NUM_CAMARAS: SGO_UTILS.safe(payload.NUM_CAMARAS).replace(/\D/g, "").slice(0, 3),
      RESPONSAVEL_CLIENTE: SGO_UTILS.safe(payload.RESPONSAVEL_CLIENTE)
    };
  }

  function enriquecerEquipamento_(e, mapaClientes, mapaUnidades) {
    const cli = mapaClientes[SGO_UTILS.safe(e.CLIENTE_ID)] || {};
    const uni = mapaUnidades[SGO_UTILS.safe(e.UNIDADE_ID)] || {};
    
    return Object.assign({}, e, {
      CLIENTE_NOME: cli.NOME_FANTASIA || cli.RAZAO_SOCIAL || "",
      CLIENTE_CNPJ: cli.CNPJ || "",
      UNIDADE_NOME: uni.NOME_UNIDADE || ""
    });
  }

  function montarMapa_(lista) {
    const mapa = {};
    (lista || []).forEach(i => mapa[SGO_UTILS.safe(i.ID)] = i);
    return mapa;
  }

  return {
    listar, obter, criar, atualizar, inativar, reativar, excluir, pesquisar,
    listarClientesAtivos, listarUnidadesAtivasPorCliente,
    obterPorQRCode
  };
})();

/* =========================
   WRAPPERS BLINDADOS (VACINA ANTI-DATA)
========================= */
/* 21/10/2026: campos de identificação que os documentos usam e que antes eram digitados na tela do ensaio.
 * Só acrescenta coluna (nunca remove nem reordena); registros antigos ficam com o campo vazio. */
var SGO_EQP_CAMPOS_NOVOS = ["PATRIMONIO", "ANO_FABRICACAO", "CAPACIDADE", "NUM_CAMARAS", "RESPONSAVEL_CLIENTE"];
var SGO_EQP_COLUNAS_OK_ = false;
function SGO_EQP_garantirColunas_() {
  if (SGO_EQP_COLUNAS_OK_) return;
  if (typeof CertCal_garantirColuna_ !== "function") return;
  ["SETOR"].concat(SGO_EQP_CAMPOS_NOVOS).forEach(function (c) { CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, c); });
  SGO_EQP_COLUNAS_OK_ = true;
}

function equipamentosListar(sessionId) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.listar(sessionId))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("listar os equipamentos", e) }; } }
function equipamentosObter(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.obter(sessionId, id))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("carregar o equipamento", e) }; } }
function equipamentosCriar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.criar(sessionId, payload))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("cadastrar o equipamento", e) }; } }
function equipamentosAtualizar(sessionId, id, payload) { try { return SGO_Pendencias_aposGravar_(JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.atualizar(sessionId, id, payload)))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("atualizar o equipamento", e) }; } }
function equipamentosInativar(sessionId, id) { try { return SGO_Pendencias_aposGravar_(JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.inativar(sessionId, id)))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("inativar o equipamento", e) }; } }
function equipamentosReativar(sessionId, id) { try { return SGO_Pendencias_aposGravar_(JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.reativar(sessionId, id)))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("reativar o equipamento", e) }; } }
function equipamentosExcluir(sessionId, id) { try { return SGO_Pendencias_aposGravar_(JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.excluir(sessionId, id)))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("excluir o equipamento", e) }; } }
function equipamentosPesquisar(sessionId, termo) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("pesquisar os equipamentos", e) }; } }
function equipamentosListarClientesAtivos(sessionId) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.listarClientesAtivos(sessionId))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("listar os clientes", e) }; } }
function equipamentosListarUnidadesAtivasPorCliente(sessionId, clienteId) { try { return JSON.parse(JSON.stringify(SGO_EQUIPAMENTOS.listarUnidadesAtivasPorCliente(sessionId, clienteId))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("listar as unidades do cliente", e) }; } }