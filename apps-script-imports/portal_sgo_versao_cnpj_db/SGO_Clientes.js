const SGO_CLIENTES = (() => {
  const SHEET_NAME = "CAD_CLIENTES";
  const STATUS_ATIVO = "ATIVO";
  const STATUS_INATIVO = "INATIVO";

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

    if (existeCpfDuplicado_(dados.CPF, "")) {
      return { success: false, message: "Já existe cliente cadastrado com este CPF." };
    }

    // 29/10/2026 (cadastro completo): colunas novas (CPF, endereço em partes, quem cadastrou e o "Ciente") só são
    // acrescentadas; nenhum dado existente muda. Quem chama sem as colunas continua gravando o que já gravava.
    if (typeof CadQ_garantirColunas_ === "function") { try { CadQ_garantirColunas_(); } catch (eCol) { console.error("Colunas do cadastro: " + ((eCol && eCol.message) || eCol)); } }
    const agoraCad = SGO_UTILS.nowIso();
    const quemCad = SGO_UTILS.safe(sessao.nome || sessao.usuario);
    const registro = SGO_DATA.normalizarObjetoParaSheet(
      SHEET_NAME,
      SGO_DATA.gerarRegistroBase({
        RAZAO_SOCIAL: dados.RAZAO_SOCIAL,
        NOME_FANTASIA: dados.NOME_FANTASIA,
        CNPJ: dados.CNPJ,
        CPF: dados.CPF,
        ENDERECO: compoeEndereco_(dados) || dados.ENDERECO, // <- Adicionado (Faltava preencher o banco)
        CEP: dados.CEP,
        LOGRADOURO: dados.LOGRADOURO,
        NUMERO: dados.NUMERO,
        COMPLEMENTO: dados.COMPLEMENTO,
        BAIRRO: dados.BAIRRO,
        CIDADE: dados.CIDADE,
        UF: dados.UF,
        CONTATO: dados.CONTATO,
        EMAIL: dados.EMAIL,
        TELEFONE: dados.TELEFONE,
        STATUS: STATUS_ATIVO,
        CRIADO_POR_ID: SGO_UTILS.safe(sessao.userId),
        CRIADO_POR_NOME: quemCad,
        ATUALIZADO_POR_NOME: quemCad,
        ATUALIZADO_EM: agoraCad,
        CIENTE_POR_NOME: cienteDe_(payload) ? quemCad : "",
        CIENTE_EM: cienteDe_(payload) ? agoraCad : ""
      })
    );

    SGO_DATA.insert(SHEET_NAME, registro);
    SGO_DATA.log("CLIENTES_CRIAR", sessao.usuario, "Cliente criado: " + registro.RAZAO_SOCIAL, "CLIENTES");

    return {
      success: true,
      message: "Cliente cadastrado com sucesso.",
      item: registro
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

    // Merge: campo ausente no pedido mantém o valor atual (não apaga).
    const dados = SGO_DATA.mesclarCampos_(atual, normalizarPayload_(payload), payload, CAMPOS_EDITAVEIS);
    const erros = validarPayload_(dados, false);

    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    if (dados.CNPJ && existeCnpjDuplicado_(dados.CNPJ, clienteId)) {
      return { success: false, message: "Já existe outro cliente cadastrado com este CNPJ." };
    }

    if (dados.CPF && existeCpfDuplicado_(dados.CPF, clienteId)) {
      return { success: false, message: "Já existe outro cliente cadastrado com este CPF." };
    }

    // 29/10/2026: endereço em partes. Quando o pedido traz as partes, o ENDERECO (lido pelos documentos e pelos
    // outros módulos) passa a ser montado delas; sem as partes no pedido, o ENDERECO fica como estava.
    const mandouPartes = ["CEP", "LOGRADOURO", "NUMERO", "COMPLEMENTO", "BAIRRO", "CIDADE", "UF"].some(function (k) { return Object.prototype.hasOwnProperty.call(payload || {}, k); });
    if (mandouPartes && compoeEndereco_(dados)) dados.ENDERECO = compoeEndereco_(dados);
    if (typeof CadQ_garantirColunas_ === "function") { try { CadQ_garantirColunas_(); } catch (eCol) { console.error("Colunas do cadastro: " + ((eCol && eCol.message) || eCol)); } }
    const agoraAlt = SGO_UTILS.nowIso();
    const quemAlt = SGO_UTILS.safe(sessao.nome || sessao.usuario);

    const novosDados = Object.assign({}, atual, dados, {
      ID: clienteId,
      STATUS: SGO_UTILS.safeUpper(atual.STATUS) || STATUS_ATIVO,
      CRIADO_EM: atual.CRIADO_EM,
      ATUALIZADO_POR_NOME: quemAlt,
      ATUALIZADO_EM: agoraAlt
    }, cienteDe_(payload) ? { CIENTE_POR_NOME: quemAlt, CIENTE_EM: agoraAlt } : {});

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
      return { success: false, message: "Excluir é feito pela gestão (Gestor, Diretoria ou Administrador). Nada foi alterado. Você pode continuar criando e editando cadastros; para excluir ou trocar vínculos, peça à gestão." };
    }

    const clienteId = SGO_UTILS.safe(id);

    if (!clienteId) {
      return { success: false, message: "ID do cliente não informado." };
    }

    const atual = SGO_DATA.getById(SHEET_NAME, clienteId);
    if (!atual) {
      return { success: false, message: "Cliente não encontrado." };
    }

    // Cadastro com vínculos (unidades, equipamentos, documentos...) não é apagado:
    // a regra vem de SGO_DATA.exigirSemVinculos_ e a mensagem já diz o que fazer.
    // 26/10/2026: os contatos do próprio cliente (CAD_CONTATOS) não impedem: ficam inativos depois da exclusão.
    let ok;
    try {
      ok = SGO_DATA.remove(SHEET_NAME, clienteId, { ignorarVinculos: ['CAD_CONTATOS'] });
    } catch (eVinculo) {
      const msg = String((eVinculo && eVinculo.message) || eVinculo);
      if (/possui vínculos/.test(msg)) return { success: false, message: "Não foi possível excluir o cliente: " + msg.charAt(0).toLowerCase() + msg.slice(1) };
      throw eVinculo;
    }

    if (!ok) {
      return { success: false, message: "Não foi possível excluir o cliente." };
    }

    let contatos = 0;
    try { contatos = SGO_DATA.inativarContatosDe_('CLIENTE_ID', clienteId); } catch (eC) { console.error('Contatos do cliente excluído: ' + ((eC && eC.message) || eC)); }

    SGO_DATA.log("CLIENTES_EXCLUIR", sessao.usuario, "Cliente excluído ID=" + clienteId + (contatos ? "; " + contatos + " contato(s) inativado(s)" : ""), "CLIENTES");

    return {
      success: true,
      message: "Cliente excluído com sucesso." + (contatos ? " " + contatos + (contatos === 1 ? " contato dele ficou inativo" : " contatos dele ficaram inativos") + " na lista de contatos (não foram apagados)." : "")
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

    const qDigitos = String(termo || "").replace(/\D/g, "");
    const filtrados = registros.filter(function (r) {
      const bateTexto = [
        r.RAZAO_SOCIAL,
        r.NOME_FANTASIA,
        r.CONTATO,
        r.EMAIL,
        r.TELEFONE,
        r.STATUS
      ].some(function (v) {
        return SGO_UTILS.safeLower(v).includes(q);
      });
      const bateCnpj = qDigitos.length >= 3 && String(r.CNPJ || "").replace(/\D/g, "").indexOf(qDigitos) !== -1;
      return bateTexto || bateCnpj;
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

  // 29/10/2026: CPF (cliente pessoa física) e o endereço em partes entram nos campos editáveis (com merge).
  const CAMPOS_EDITAVEIS = ["RAZAO_SOCIAL", "NOME_FANTASIA", "CNPJ", "CPF", "ENDERECO", "CEP", "LOGRADOURO", "NUMERO", "COMPLEMENTO", "BAIRRO", "CIDADE", "UF", "CONTATO", "EMAIL", "TELEFONE"];

  function cienteDe_(payload) {
    const v = payload && payload.CIENTE;
    return v === true || SGO_UTILS.safeUpper(v) === "SIM" || SGO_UTILS.safeUpper(v) === "TRUE";
  }

  function formatarCep_(v) {
    const d = SGO_UTILS.onlyDigits(v);
    return d.length === 8 ? d.slice(0, 5) + "-" + d.slice(5) : SGO_UTILS.safe(v);
  }

  /** ENDERECO montado das partes (o que os documentos e os outros módulos leem). Vazio sem logradouro. */
  function compoeEndereco_(d) {
    d = d || {};
    const rua = SGO_UTILS.safe(d.LOGRADOURO);
    if (!rua) return "";
    const linha = rua + (SGO_UTILS.safe(d.NUMERO) ? ", " + SGO_UTILS.safe(d.NUMERO) : "") + (SGO_UTILS.safe(d.COMPLEMENTO) ? " - " + SGO_UTILS.safe(d.COMPLEMENTO) : "");
    const cidade = SGO_UTILS.safe(d.CIDADE) + (SGO_UTILS.safe(d.UF) ? "/" + SGO_UTILS.safe(d.UF) : "");
    return [linha, SGO_UTILS.safe(d.BAIRRO), cidade, SGO_UTILS.safe(d.CEP) ? "CEP " + SGO_UTILS.safe(d.CEP) : ""].filter(Boolean).join(" - ");
  }

  function normalizarPayload_(payload) {
    payload = payload || {};

    return {
      RAZAO_SOCIAL: SGO_UTILS.safeUpper(payload.RAZAO_SOCIAL), // Força tudo maiúsculo no banco
      NOME_FANTASIA: SGO_UTILS.safeUpper(payload.NOME_FANTASIA),
      CNPJ: normalizarCnpj_(payload.CNPJ),
      // CPF com pontuação (texto): o zero da frente não se perde na planilha
      CPF: SGO_UTILS.onlyDigits(payload.CPF) ? (typeof SGO_UTILS.formatCpf === "function" ? SGO_UTILS.formatCpf(payload.CPF) : SGO_UTILS.onlyDigits(payload.CPF)) : "",
      ENDERECO: SGO_UTILS.safeUpper(payload.ENDERECO), // Capturado para preencher a coluna nova do banco
      CEP: formatarCep_(payload.CEP),
      LOGRADOURO: SGO_UTILS.safeUpper(payload.LOGRADOURO),
      NUMERO: SGO_UTILS.safeUpper(payload.NUMERO),
      COMPLEMENTO: SGO_UTILS.safeUpper(payload.COMPLEMENTO),
      BAIRRO: SGO_UTILS.safeUpper(payload.BAIRRO),
      CIDADE: SGO_UTILS.safeUpper(payload.CIDADE),
      UF: SGO_UTILS.safeUpper(payload.UF),
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

    if (dados.CPF && typeof SGO_UTILS.isCpf === "function" && !SGO_UTILS.isCpf(dados.CPF)) {
      erros.push("O CPF informado não é válido.");
    }

    if (dados.UF && !/^[A-Z]{2}$/.test(dados.UF)) {
      erros.push("UF deve conter 2 letras.");
    }

    return erros;
  }

  function existeCpfDuplicado_(cpf, idIgnorado) {
    const alvo = SGO_UTILS.onlyDigits(cpf);
    if (!alvo) return false;
    return SGO_DATA.getAll(SHEET_NAME).some(function (r) {
      return SGO_UTILS.onlyDigits(r.CPF) === alvo && SGO_UTILS.safe(r.ID) !== SGO_UTILS.safe(idIgnorado);
    });
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
    pesquisar,
    _compoeEndereco: compoeEndereco_,
    _normalizar: normalizarPayload_,
    CAMPOS_EDITAVEIS: CAMPOS_EDITAVEIS
  };
})();

/* =========================
   WRAPPERS BLINDADOS (VACINA ANTI-DATA)
========================= */
function clientesListar(sessionId) { 
  try { return JSON.parse(JSON.stringify(SGO_CLIENTES.listar(sessionId))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_('listar os clientes', e) }; }
}
function clientesObter(sessionId, id) { 
  try { return JSON.parse(JSON.stringify(SGO_CLIENTES.obter(sessionId, id))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_('carregar o cliente', e) }; }
}
// 29/10/2026 (pedido do dono): a tela de Clientes (computador e celular) só salva cadastro completo e com o "Ciente — os
// dados foram informados pelo cliente"; quem, quando e o que mudou vão para o histórico (SGO_CadastroQualidade.js).
function clientesCriar(sessionId, payload) {
  try { return JSON.parse(JSON.stringify(typeof CadQ_salvarCliente_ === 'function' ? CadQ_salvarCliente_(sessionId, '', payload) : SGO_VINCULOS.createClient(sessionId, payload))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_('cadastrar o cliente', e) }; }
}
function clientesAtualizar(sessionId, id, payload) {
  try { return JSON.parse(JSON.stringify(typeof CadQ_salvarCliente_ === 'function' ? CadQ_salvarCliente_(sessionId, id, payload) : SGO_CLIENTES.atualizar(sessionId, id, payload))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_('atualizar o cliente', e) }; }
}
function clientesInativar(sessionId, id) { 
  try { return SGO_Pendencias_aposGravar_(JSON.parse(JSON.stringify(SGO_CLIENTES.inativar(sessionId, id)))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_('inativar o cliente', e) }; }
}
function clientesReativar(sessionId, id) { 
  try { return SGO_Pendencias_aposGravar_(JSON.parse(JSON.stringify(SGO_CLIENTES.reativar(sessionId, id)))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_('reativar o cliente', e) }; }
}
function clientesExcluir(sessionId, id) { 
  try { return SGO_Pendencias_aposGravar_(JSON.parse(JSON.stringify(SGO_CLIENTES.excluir(sessionId, id)))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_('excluir o cliente', e) }; }
}
function clientesPesquisar(sessionId, termo) { 
  try { return JSON.parse(JSON.stringify(SGO_CLIENTES.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_('pesquisar os clientes', e) }; }
}

/**
 * Mensagem de falha para o operador (usada pelos wrappers globais dos cadastros,
 * Padrões, Templates, QR Code e Alertas).
 * O erro técnico vai para o log; na tela só aparece a mensagem do próprio sistema
 * quando ela foi escrita para o operador (ex.: "CNPJ inválido").
 */
function SGO_textoFalhaOperador_(acao, e) {
  var bruto = String((e && e.message) || e || '').trim();
  try { console.error('Falha ao ' + acao + ': ' + ((e && e.stack) || bruto)); } catch (_) {}
  var tecnico = !bruto ||
    /\b(TypeError|ReferenceError|RangeError|SyntaxError|Exception|Error|undefined|null|NaN|is not|Cannot|cannot|failed|Failed|Service|Script|timed out|Timeout|Limit|quota|Unexpected|Invalid|Access denied|Permission)\b/.test(bruto) ||
    /\w+\.\w+\(/.test(bruto);
  var base = 'Não foi possível ' + acao;
  if (!tecnico) base += ': ' + bruto.replace(/[\s.!]+$/, '');
  return base + '. Tente de novo; se repetir, avise o administrador.';
}
