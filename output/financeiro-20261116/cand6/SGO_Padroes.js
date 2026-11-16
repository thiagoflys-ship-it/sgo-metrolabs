/****************************************************
 * CAD_PADROES — cadastro de padrões de referência (Certificado de
 * Calibração). Mesma família mecânica de SGO_Tecnicos.js, mas sem a
 * trava "só o próprio cadastro" (padrões são catálogo interno do
 * laboratório, não dado pessoal) — só bloqueia perfil CLIENTE, mesmo
 * padrão de SGO_Documentos.js.
 *
 * INCERTEZA_U95/FATOR_K/VEFF alimentam direto SGO_CertCal_Calculo.js —
 * ver a explicação completa da conversão U95->incerteza-padrão (dividir
 * por FATOR_K, default 2) no cabeçalho daquele arquivo.
 ****************************************************/
const SGO_PADROES = (() => {
  const SHEET_NAME = "CAD_PADROES";
  const STATUS_ATIVO = "ATIVO";
  const STATUS_INATIVO = "INATIVO";

  function listar(sessionId) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado." };
    }

    const itens = SGO_DATA.getAll(SHEET_NAME).slice().sort((a, b) => {
      const sa = SGO_UTILS.safeUpper(a.STATUS);
      const sb = SGO_UTILS.safeUpper(b.STATUS);
      if (sa === sb) return SGO_UTILS.safe(a.TAG).localeCompare(SGO_UTILS.safe(b.TAG));
      if (sa === STATUS_ATIVO) return -1;
      if (sb === STATUS_ATIVO) return 1;
      return 0;
    });

    return { success: true, items: itens, total: itens.length };
  }

  function listarAtivos(sessionId) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado." };
    }
    const itens = SGO_DATA.getAll(SHEET_NAME).filter(r => SGO_UTILS.safeUpper(r.STATUS) === STATUS_ATIVO);
    return { success: true, items: itens, total: itens.length };
  }

  function obter(sessionId, id) {
    exigirSessao(sessionId);
    const registro = SGO_DATA.getById(SHEET_NAME, SGO_UTILS.safe(id));
    if (!registro) return { success: false, message: "Padrão não encontrado." };
    return { success: true, item: registro };
  }

  function normalizarPayload_(payload) {
    payload = payload || {};
    // 13/11/2026 (pontos calibrados): com a tabela de pontos, U95/k/νeff das colunas antigas passam a ser o ponto de
    // maior incerteza-padrão da tabela (conservador para as telas e documentos que leem só essas colunas).
    if (payload.pontos !== undefined) return normalizarComPontos_(payload);
    return {
      TAG: SGO_UTILS.safeUpper(payload.tag || payload.TAG),
      DESCRICAO: SGO_UTILS.safe(payload.descricao || payload.DESCRICAO),
      INCERTEZA_U95: CertCalCalculo.numero(payload.incertezaU95 !== undefined ? payload.incertezaU95 : payload.INCERTEZA_U95, 'Incerteza U95'),
      FATOR_K: CertCalCalculo.numero(payload.fatorK !== undefined ? payload.fatorK : payload.FATOR_K, 'Fator K', 2),
      VEFF: CertCalCalculo.numero(payload.veff !== undefined ? payload.veff : payload.VEFF, 'Graus de liberdade', 0),
      CERTIFICADO_NUMERO: SGO_UTILS.safe(payload.certificadoNumero || payload.CERTIFICADO_NUMERO),
      VALIDADE: CertCal_normalizarData_(payload.validade !== undefined ? payload.validade : payload.VALIDADE),
      LINK_CERTIFICADO_PDF: SGO_UTILS.safe(payload.linkCertificadoPdf || payload.LINK_CERTIFICADO_PDF)
    };
  }

  function normalizarComPontos_(payload) {
    if (typeof PadPontos === 'undefined') throw new Error('A tabela de pontos não pôde ser conferida (arquivo SGO_Padroes_Pontos.js ausente no servidor). Nada foi salvo. Avise o gestor do sistema.');
    const v = PadPontos.validar(payload.pontos);
    if (v.erros.length) {
      throw new Error('A tabela de pontos calibrados tem ' + v.erros.length + ' problema(s) e nada foi salvo. ' + v.erros.slice(0, 6).join(' ') +
        (v.erros.length > 6 ? ' (e mais ' + (v.erros.length - 6) + ')' : '') + ' Corrija as linhas indicadas e salve de novo.');
    }
    const r = PadPontos.resumo(v.pontos);
    const certificado = SGO_UTILS.safe(payload.certificadoNumero || payload.CERTIFICADO_NUMERO);
    return {
      TAG: SGO_UTILS.safeUpper(payload.tag || payload.TAG),
      DESCRICAO: SGO_UTILS.safe(payload.descricao || payload.DESCRICAO),
      INCERTEZA_U95: r.u95,
      FATOR_K: r.k,
      VEFF: r.veff,
      CERTIFICADO_NUMERO: certificado,
      VALIDADE: CertCal_normalizarData_(payload.validade !== undefined ? payload.validade : payload.VALIDADE),
      LINK_CERTIFICADO_PDF: SGO_UTILS.safe(payload.linkCertificadoPdf || payload.LINK_CERTIFICADO_PDF),
      PONTOS_JSON: PadPontos.serializar(v.pontos, certificado)
    };
  }

  function mesmoNumero_(a, b) {
    const x = Number(String(a == null ? '' : a).trim().replace(',', '.')), y = Number(String(b == null ? '' : b).trim().replace(',', '.'));
    return (String(a == null ? '' : a).trim() === String(b == null ? '' : b).trim()) || (isFinite(x) && isFinite(y) && Math.abs(x - y) <= 1e-12 * Math.max(1, Math.abs(x)));
  }

  /* Padrão que já tem tabela de pontos e recebe uma gravação sem a tabela (tela antiga, anexar PDF): U95/k/νeff precisam
   * continuar iguais ao resumo da tabela e o número do certificado não pode mudar sem conferir os pontos. */
  function conferirSemPontos_(atual, dados) {
    if (!SGO_UTILS.safe(atual.PONTOS_JSON) || dados.PONTOS_JSON !== undefined) return '';
    const tag = SGO_UTILS.safe(atual.TAG);
    if (!mesmoNumero_(atual.INCERTEZA_U95, dados.INCERTEZA_U95) || !mesmoNumero_(atual.FATOR_K, dados.FATOR_K) || !mesmoNumero_(atual.VEFF, dados.VEFF)) {
      return 'O padrão ' + tag + ' tem uma tabela de pontos calibrados, e U95, k e νeff são calculados a partir dela. Nada foi salvo. Para mudar a incerteza, abra Padrões de referência > ' + tag + ' > Cadastro e validade e altere a tabela de pontos.';
    }
    if (SGO_UTILS.safe(atual.CERTIFICADO_NUMERO) !== SGO_UTILS.safe(dados.CERTIFICADO_NUMERO)) {
      return 'O padrão ' + tag + ' tem uma tabela de pontos ligada ao certificado nº ' + SGO_UTILS.safe(atual.CERTIFICADO_NUMERO) + '. Trocar o número do certificado sem conferir os pontos deixaria valores da calibração anterior. Nada foi salvo. Use Padrões de referência > ' + tag + ' > Novo certificado, que troca o número e a tabela juntos.';
    }
    return '';
  }

  function validarPayload_(dados) {
    const erros = [];
    if (!dados.TAG) erros.push("Identificação (TAG) do padrão é obrigatória.");
    if (!dados.DESCRICAO) erros.push("Descrição do padrão é obrigatória.");
    if (!(dados.INCERTEZA_U95 > 0)) erros.push("Incerteza (U95) do padrão deve ser maior que zero.");
    if (!(dados.FATOR_K > 0)) erros.push("Fator de abrangência (K) do padrão deve ser maior que zero.");
    if (dados.VEFF < 0) erros.push("Graus de liberdade devem ser zero (infinito) ou positivos.");
    return erros;
  }

  // Fase 2 (16/10): duas TAGs iguais deixavam o técnico escolher o padrão errado no ensaio.
  // A TAG é única no cadastro (ativos e inativos); a edição do próprio padrão é permitida.
  function tagDuplicada_(tag, ignorarId) {
    const alvo = SGO_UTILS.safeUpper(tag);
    if (!alvo) return null;
    const ign = SGO_UTILS.safe(ignorarId);
    return SGO_DATA.getAll(SHEET_NAME).filter(function (p) {
      return SGO_UTILS.safeUpper(p.TAG) === alvo && SGO_UTILS.safe(p.ID) !== ign;
    })[0] || null;
  }

  function mensagemTagDuplicada_(existente) {
    const inativo = SGO_UTILS.safeUpper(existente.STATUS) !== STATUS_ATIVO;
    return "Já existe um padrão com a TAG " + existente.TAG + (inativo ? " (inativo)" : "") + ". Cada padrão precisa de uma TAG própria: " +
      (inativo ? "reative o cadastro existente na lista de Padrões de referência, ou " : "edite o cadastro existente na lista de Padrões de referência, ou ") +
      "use outra TAG (por exemplo, com o canal ou a grandeza: " + existente.TAG + "-UR).";
  }

  function validar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === 'CLIENTE') throw new Error('Acesso negado.');
    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados);
    const dup = tagDuplicada_(dados.TAG, payload && payload.padraoId);
    if (dup) erros.push(mensagemTagDuplicada_(dup));
    if (erros.length) throw new Error(erros.join(' '));
    return dados;
  }

  // Só nas gravações do cadastro: H2 em texto não garante que H3:H estejam
  // em texto. Formatar antes de appendRow/setValues evita coerção en_US.
  function prepararTexto_() {
    const sheet = SGO_DATA.getSheet(SHEET_NAME);
    const headers = SGO_DATA.getHeaders(SHEET_NAME);
    if (sheet.getLastRow() >= sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
    ['VALIDADE', 'CERTIFICADO_NUMERO'].forEach(function(campo) {
      const coluna = headers.indexOf(campo);
      if (coluna >= 0) sheet.getRange(2, coluna + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    });
  }

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado." };
    }

    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados);
    const dupCriar = tagDuplicada_(dados.TAG, "");
    if (dupCriar) erros.push(mensagemTagDuplicada_(dupCriar));
    if (erros.length) return { success: false, message: erros.join(" ") };
    if (dados.PONTOS_JSON === '') delete dados.PONTOS_JSON;

    const registro = SGO_DATA.normalizarObjetoParaSheet(
      SHEET_NAME,
      SGO_DATA.gerarRegistroBase(Object.assign({}, dados, { STATUS: STATUS_ATIVO }))
    );

    prepararTexto_();
    SGO_DATA.insert(SHEET_NAME, registro);
    SGO_DATA.log("PADROES_CRIAR", sessao.usuario, "Padrão criado: " + registro.TAG, "PADROES");

    return { success: true, message: "Padrão cadastrado com sucesso.", item: registro };
  }

  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado." };
    }

    const padraoId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET_NAME, padraoId);
    if (!atual) return { success: false, message: "Padrão não encontrado." };

    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados);
    const dupAtualizar = tagDuplicada_(dados.TAG, padraoId);
    if (dupAtualizar) erros.push(mensagemTagDuplicada_(dupAtualizar));
    if (erros.length) return { success: false, message: erros.join(" ") };
    const travaPontos = conferirSemPontos_(atual, dados);
    if (travaPontos) return { success: false, message: travaPontos };
    // Tabela equivalente ao cadastro antigo: só limpa a coluna quando havia tabela (não cria valor à toa).
    if (dados.PONTOS_JSON === '' && !SGO_UTILS.safe(atual.PONTOS_JSON)) delete dados.PONTOS_JSON;

    const novosDados = SGO_DATA.normalizarObjetoParaSheet(SHEET_NAME, Object.assign({}, atual, dados, {
      ID: padraoId,
      // Nunca apaga um PDF já anexado só porque a edição atual não mandou um novo.
      LINK_CERTIFICADO_PDF: dados.LINK_CERTIFICADO_PDF || atual.LINK_CERTIFICADO_PDF || "",
      STATUS: atual.STATUS || STATUS_ATIVO,
      CRIADO_EM: atual.CRIADO_EM
    }));

    prepararTexto_();
    const ok = SGO_DATA.update(SHEET_NAME, padraoId, novosDados);
    if (!ok) return { success: false, message: "Não foi possível atualizar o padrão." };

    SGO_DATA.log("PADROES_ATUALIZAR", sessao.usuario, "Padrão atualizado ID=" + padraoId, "PADROES");
    return { success: true, message: "Padrão atualizado com sucesso." };
  }

  function inativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado." };
    }
    const padraoId = SGO_UTILS.safe(id);
    if (!SGO_DATA.getById(SHEET_NAME, padraoId)) return { success: false, message: "Padrão não encontrado." };
    SGO_DATA.update(SHEET_NAME, padraoId, { STATUS: STATUS_INATIVO });
    SGO_DATA.log("PADROES_INATIVAR", sessao.usuario, "Padrão inativado ID=" + padraoId, "PADROES");
    return { success: true, message: "Padrão inativado com sucesso." };
  }

  function reativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado." };
    }
    const padraoId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET_NAME, padraoId);
    if (!atual) return { success: false, message: "Padrão não encontrado." };

    // Um padrão inativado pode ter sido retirado justamente porque o
    // certificado não fornece U95/K/Veff. Não permita que ele volte a
    // alimentar cálculos apenas pela troca do STATUS.
    // 13/11/2026: validade com data inválida no cadastro lançava "Data inválida" sem dizer onde corrigir.
    let dados;
    try { dados = normalizarPayload_(atual); }
    catch (e) { return { success: false, message: "Corrija o cadastro antes de reativar. " + e.message + " Abra o padrão (filtro Inativos) e corrija em \"Cadastro e validade\"." }; }
    const erros = validarPayload_(dados);
    if (erros.length) {
      return { success: false, message: "Corrija o cadastro antes de reativar. " + erros.join(" ") };
    }
    SGO_DATA.update(SHEET_NAME, padraoId, { STATUS: STATUS_ATIVO });
    SGO_DATA.log("PADROES_REATIVAR", sessao.usuario, "Padrão reativado ID=" + padraoId, "PADROES");
    return { success: true, message: "Padrão reativado com sucesso." };
  }

  return { listar, listarAtivos, obter, criar, atualizar, inativar, reativar, validar };
})();

