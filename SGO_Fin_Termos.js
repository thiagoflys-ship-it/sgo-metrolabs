// SGO_Fin_Termos.js - METROLABS SGO+
// Modulo FIN - Termo Online do Cartao Flash
// FIN.4.2 - backend isolado. Nao executa nada automaticamente.

const SGO_FIN_TERMOS = (() => {
  const DB = "FIN";

  const ABAS = {
    CARTOES: "FIN_CARTOES",
    TERMOS: "FIN_CARTOES_TERMOS",
    DOCUMENTOS: "FIN_CARTOES_DOCUMENTOS",
    POLITICA: "FIN_CARTOES_POLITICA",
    LOGS: "FIN_CARTOES_LOGS"
  };

  const PERFIS_OPERADOR = ["ADMIN", "DIRETORIA", "GESTOR", "FINANCEIRO"];
  const PERFIS_CONSULTA = ["ADMIN", "DIRETORIA", "GESTOR", "FINANCEIRO", "TECNICO"];
  const VERSAO_TERMO = "FIN-TRM-4.2";
  const VERSAO_POLITICA_PADRAO = "PADRAO-FIN-4";
  const HORAS_EXPIRACAO_TOKEN = 72;

  function finOk_(dados) {
    return Object.assign({ ok: true, success: true }, dados || {});
  }

  function finErro_(mensagem, detalhes) {
    const r = { ok: false, success: false, message: mensagem || "Erro desconhecido." };
    if (detalhes !== undefined) r.detalhes = detalhes;
    return r;
  }

  function finSafeText_(v) {
    return String(v == null ? "" : v).trim();
  }

  function finSafeUpper_(v) {
    return finSafeText_(v).toUpperCase();
  }

  function finNow_() {
    return new Date().toISOString();
  }

  function finUuid_() {
    return Utilities.getUuid();
  }

  function finGerarId_(prefixo) {
    return finSafeUpper_(prefixo) + "-" + finUuid_().replace(/-/g, "").slice(0, 12).toUpperCase();
  }

  function finAno_() {
    return String(new Date().getFullYear());
  }

  function finAddHoras_(iso, horas) {
    const base = iso ? new Date(iso) : new Date();
    return new Date(base.getTime() + Number(horas || 0) * 60 * 60 * 1000).toISOString();
  }

  function finDataVencida_(iso) {
    if (!finSafeText_(iso)) return false;
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return false;
    return dt.getTime() < new Date().getTime();
  }

  function finDbOk_() {
    const dbId = PropertiesService.getScriptProperties().getProperty("DB_FIN_ID");
    if (!dbId) {
      throw new Error("Banco FIN nao configurado. Configure DB_FIN_ID antes de usar o modulo financeiro.");
    }
    return dbId;
  }

  function finAll_(aba) {
    finDbOk_();
    return SGO_DATA.getAll(aba, DB) || [];
  }

  function finGetById_(aba, id) {
    finDbOk_();
    return SGO_DATA.getById(aba, finSafeText_(id), DB) || null;
  }

  function finFindBy_(aba, campo, valor) {
    finDbOk_();
    const alvo = finSafeText_(valor);
    return finAll_(aba).find(function(r) {
      return finSafeText_(r[campo]) === alvo;
    }) || null;
  }

  function finInsert_(aba, obj) {
    finDbOk_();
    return SGO_DATA.insert(aba, obj || {}, DB);
  }

  function finUpdate_(aba, id, patch) {
    finDbOk_();
    const ok = SGO_DATA.update(aba, finSafeText_(id), patch || {}, DB);
    if (!ok) throw new Error("Registro nao encontrado para atualizacao: " + id);
    return SGO_DATA.getById(aba, finSafeText_(id), DB);
  }

  function finSessao_(sessionId) {
    return exigirSessao(sessionId);
  }

  function finUsuario_(sessao) {
    return {
      id: finSafeText_(sessao && (sessao.userId || sessao.id || sessao.usuarioId)),
      nome: finSafeText_(sessao && (sessao.nome || sessao.usuario || sessao.email)),
      perfil: finSafeUpper_(sessao && sessao.perfil)
    };
  }

  function finGarantirPerfil_(sessao, perfis, acao) {
    const perfil = finSafeUpper_(sessao && sessao.perfil);
    if (perfis.indexOf(perfil) < 0) {
      throw new Error("Acesso negado: perfil " + perfil + " nao tem permissao para " + (acao || "esta acao") + ".");
    }
  }

  function finPerfilConsulta_(sessao) {
    return PERFIS_CONSULTA.indexOf(finSafeUpper_(sessao && sessao.perfil)) >= 0;
  }

  function finPerfilOperador_(sessao) {
    return PERFIS_OPERADOR.indexOf(finSafeUpper_(sessao && sessao.perfil)) >= 0;
  }

  function finCartaoPertenceUsuario_(cartao, sessao) {
    const u = finUsuario_(sessao);
    const funcionarioId = finSafeText_(cartao && cartao.FUNCIONARIO_ID);
    if (!funcionarioId || !u.id) return false;
    return funcionarioId === u.id;
  }

  function finLog_(sessaoOuNull, acao, entidadeTipo, entidadeId, antes, depois, resultado, mensagem) {
    try {
      const u = finUsuario_(sessaoOuNull || {});
      finInsert_(ABAS.LOGS, {
        ID: finUuid_(),
        LOG_ID: finGerarId_("LOG"),
        DATA_HORA: finNow_(),
        USUARIO_ID: u.id,
        USUARIO_NOME: u.nome || "SISTEMA_TERMO_PUBLICO",
        PERFIL: u.perfil,
        ACAO: finSafeText_(acao),
        MODULO: "FIN",
        ENTIDADE_TIPO: finSafeText_(entidadeTipo),
        ENTIDADE_ID: finSafeText_(entidadeId),
        DADOS_ANTES: antes ? JSON.stringify(antes) : "",
        DADOS_DEPOIS: depois ? JSON.stringify(depois) : "",
        IP_DISPOSITIVO: "",
        USER_AGENT: "",
        RESULTADO: finSafeText_(resultado) || "OK",
        MENSAGEM: finSafeText_(mensagem),
        CRIADO_EM: finNow_()
      });
    } catch (e) {
      Logger.log("FIN_TERMO_LOG_ERRO: " + e.message);
    }
  }

  function finObterUrlBase_() {
    try {
      if (typeof SGO_CFG !== "undefined" && SGO_CFG.WEBAPP_URL) return finSafeText_(SGO_CFG.WEBAPP_URL);
    } catch (e) {}
    try {
      const p1 = PropertiesService.getScriptProperties().getProperty("SGO_WEBAPP_URL");
      if (p1) return finSafeText_(p1);
    } catch (e2) {}
    try {
      const p2 = PropertiesService.getScriptProperties().getProperty("WEBAPP_URL");
      if (p2) return finSafeText_(p2);
    } catch (e3) {}
    return "";
  }

  function finMontarUrlTermo_(token) {
    const base = finObterUrlBase_();
    if (!base) return "?fin_termo=" + finUrlEncode_(token);
    const sep = base.indexOf("?") >= 0 ? "&" : "?";
    return base + sep + "fin_termo=" + finUrlEncode_(token);
  }

  function finGerarTokenTermo_() {
    return "FIN-TRM-" + finAno_() + "-" + finUuid_().replace(/-/g, "").slice(0, 12).toUpperCase();
  }

  function finHashSha256_(texto) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, finSafeText_(texto));
    return bytes.map(function(b) {
      const v = b < 0 ? b + 256 : b;
      return ("0" + v.toString(16)).slice(-2);
    }).join("");
  }

  function finObterPastaFinanceiro_() {
    const folderId = PropertiesService.getScriptProperties().getProperty("FOLDER_FINANCEIRO");
    if (!folderId) {
      throw new Error("Pasta financeira nao configurada. Configure FOLDER_FINANCEIRO antes de gerar PDF do termo.");
    }
    return DriveApp.getFolderById(folderId);
  }

  function finSalvarDataUrlDrive_(dataUrl, nomeArquivo) {
    const pasta = finObterPastaFinanceiro_();
    const partes = finSafeText_(dataUrl).split(",");
    if (partes.length < 2 || partes[0].indexOf("data:image/png;base64") !== 0) {
      throw new Error("Assinatura invalida. Envie imagem PNG em data URL.");
    }
    const blob = Utilities.newBlob(Utilities.base64Decode(partes[1]), "image/png", nomeArquivo);
    const file = pasta.createFile(blob);
    return { fileId: file.getId(), url: file.getUrl() };
  }

  function finSalvarPdfDrive_(html, nomeArquivo) {
    const pasta = finObterPastaFinanceiro_();
    const blob = Utilities.newBlob(html, "text/html", nomeArquivo.replace(/\.pdf$/i, ".html")).getAs(MimeType.PDF);
    blob.setName(nomeArquivo);
    const file = pasta.createFile(blob);
    return { fileId: file.getId(), url: file.getUrl(), nomeArquivo: nomeArquivo };
  }

  function finMontarTextoPadraoTermo_(cartao, politica) {
    const nome = finSafeText_(cartao && cartao.FUNCIONARIO_NOME) || "colaborador";
    const final4 = finMascaraFinal4_(cartao);
    const textoPolitica = politica && politica.CONTEUDO_RESUMIDO ? finSafeText_(politica.CONTEUDO_RESUMIDO) : "";
    return [
      "TERMO DE RESPONSABILIDADE PELO USO DO CARTAO CORPORATIVO FLASH",
      "",
      "Eu, " + nome + ", declaro ciencia de que o cartao corporativo Flash identificado por final " + final4 + " e instrumento de trabalho disponibilizado pela Metrolabs.",
      "Os valores carregados no cartao pertencem a empresa e devem ser utilizados exclusivamente para despesas profissionais autorizadas.",
      "E proibido o uso pessoal, o saque nao autorizado, o compartilhamento do cartao e qualquer utilizacao sem finalidade profissional comprovavel.",
      "Cada despesa deve possuir finalidade profissional, comprovante valido e vinculacao a ordem de servico quando houver. Na ausencia de OS, a justificativa e obrigatoria.",
      "A prestacao de contas deve ser realizada nos prazos e formatos definidos pela empresa, com foto ou arquivo de comprovante legivel.",
      "Quando aplicavel ao lancamento da despesa, dados de localizacao podem ser coletados para fins de auditoria, seguranca e conciliacao.",
      "Pendencias, inconsistencias ou ausencia de comprovacao podem gerar bloqueio temporario do cartao e apuracao interna.",
      "Descontos ou ressarcimentos somente ocorrerao quando legalmente permitidos e apos apuracao, contraditorio e validacao pela gestao responsavel.",
      "Medidas disciplinares poderao ser aplicadas conforme legislacao vigente, politica interna e gravidade do caso.",
      "Indicios de desvio, fraude ou uso indevido poderao ser encaminhados para gestao, diretoria ou juridico.",
      textoPolitica ? "Resumo da politica vigente: " + textoPolitica : ""
    ].filter(function(linha) { return linha !== ""; }).join("\n");
  }

  function finMontarHtmlTermoA4_(dados) {
    const termo = dados.termo || {};
    const cartao = dados.cartao || {};
    const conteudo = finSanitizarHtml_(dados.textoTermo || "");
    const assinaturaUrl = finEH_(dados.assinaturaLink);
    const logo = finObterLogoUrl_();
    return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><style>" +
      "@page{size:A4;margin:18mm;}body{font-family:Arial,sans-serif;color:#172033;font-size:12px;line-height:1.45;}" +
      ".top{display:flex;align-items:center;border-bottom:3px solid #0b3b78;padding-bottom:14px;margin-bottom:18px;}" +
      ".logo{width:150px;max-height:70px;object-fit:contain;margin-right:18px;}.brand{font-size:20px;font-weight:800;color:#0b3b78;}" +
      ".sub{font-size:12px;color:#667085;margin-top:4px;}.box{border:1px solid #d0d5dd;border-radius:6px;padding:12px;margin:12px 0;}" +
      ".grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;}.label{font-size:10px;color:#667085;text-transform:uppercase;}.value{font-weight:700;}" +
      ".term{white-space:pre-wrap;text-align:justify;}.sign{height:90px;border-bottom:1px solid #172033;margin-top:26px;display:flex;align-items:flex-end;}" +
      ".sign img{max-height:80px;max-width:260px;}.foot{margin-top:20px;font-size:10px;color:#667085;border-top:1px solid #eaecf0;padding-top:10px;}" +
      "</style></head><body>" +
      "<div class=\"top\">" + (logo ? "<img class=\"logo\" src=\"" + finEH_(logo) + "\">" : "") +
      "<div><div class=\"brand\">Metrolabs - Termo Online do Cartao Flash</div><div class=\"sub\">Documento institucional FIN</div></div></div>" +
      "<div class=\"box\"><div class=\"grid\">" +
      finCampoHtml_("Colaborador", cartao.FUNCIONARIO_NOME) +
      finCampoHtml_("Funcionario ID", cartao.FUNCIONARIO_ID) +
      finCampoHtml_("Cartao", finMascaraFinal4_(cartao)) +
      finCampoHtml_("Centro de custo", cartao.CENTRO_CUSTO) +
      finCampoHtml_("Termo", termo.TERMO_ID) +
      finCampoHtml_("Versao", termo.VERSAO_TERMO) +
      "</div></div>" +
      "<div class=\"box term\">" + conteudo + "</div>" +
      "<div class=\"box\"><div class=\"label\">Aceite</div><p>Declaro que li, compreendi e aceito as condicoes deste termo.</p>" +
      "<div class=\"sign\">" + (assinaturaUrl ? "<img src=\"" + assinaturaUrl + "\">" : "") + "</div>" +
      "<div class=\"value\">" + finEH_(cartao.FUNCIONARIO_NOME) + "</div></div>" +
      "<div class=\"foot\">Token: " + finEH_(termo.TOKEN_VALIDACAO) + " | Hash: " + finEH_(termo.HASH_TERMO) +
      " | QR: " + finEH_(termo.QRCODE_LINK) + "</div>" +
      "</body></html>";
  }

  function finCampoHtml_(label, value) {
    return "<div><div class=\"label\">" + finEH_(label) + "</div><div class=\"value\">" + finEH_(value) + "</div></div>";
  }

  function finMontarWhatsappTermo_(termo, cartao) {
    const nome = finSafeText_(cartao && cartao.FUNCIONARIO_NOME) || "colaborador";
    const url = finSafeText_(termo && termo.URL_VALIDACAO);
    const texto = "Ola, " + nome + ". A Metrolabs enviou o termo online de responsabilidade do Cartao Flash. Acesse para leitura e assinatura: " + url;
    const numero = finNormalizarTelefone_(cartao && cartao.FUNCIONARIO_TELEFONE);
    return {
      texto: texto,
      numero: numero,
      link: numero ? "https://wa.me/" + numero + "?text=" + finUrlEncode_(texto) : ""
    };
  }

  function finSanitizarHtml_(texto) {
    return finEH_(texto).replace(/\n/g, "<br>");
  }

  function finEH_(texto) {
    return finSafeText_(texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function finUrlEncode_(texto) {
    return encodeURIComponent(finSafeText_(texto));
  }

  function finObterCartao_(cartaoId) {
    const alvo = finSafeText_(cartaoId);
    if (!alvo) return null;
    return finAll_(ABAS.CARTOES).find(function(c) {
      return finSafeText_(c.ID) === alvo || finSafeText_(c.CARTAO_ID) === alvo;
    }) || null;
  }

  function finObterTermoPorToken_(token) {
    const tokenSeguro = finSafeText_(token);
    if (!tokenSeguro) return null;
    return finFindBy_(ABAS.TERMOS, "TOKEN_VALIDACAO", tokenSeguro);
  }

  function finObterTermoPorId_(termoId) {
    const alvo = finSafeText_(termoId);
    return finAll_(ABAS.TERMOS).find(function(t) {
      return finSafeText_(t.ID) === alvo || finSafeText_(t.TERMO_ID) === alvo;
    }) || null;
  }

  function finObterPoliticaVigente_() {
    const politicas = finAll_(ABAS.POLITICA).filter(function(p) {
      return finSafeUpper_(p.STATUS) === "ATIVO";
    });
    if (!politicas.length) return null;
    politicas.sort(function(a, b) {
      return finSafeText_(b.DATA_VIGENCIA_INICIO || b.CRIADO_EM).localeCompare(finSafeText_(a.DATA_VIGENCIA_INICIO || a.CRIADO_EM));
    });
    return politicas[0];
  }

  function finMontarRegistroTermo_(sessao, cartao, politica, permitirAssinado) {
    if (!cartao) throw new Error("Cartao nao encontrado.");
    if (!permitirAssinado && finSafeUpper_(cartao.TERMO_ASSINADO) === "SIM") {
      throw new Error("Cartao ja possui termo assinado.");
    }
    const u = finUsuario_(sessao);
    const agora = finNow_();
    const termoId = finGerarId_("TRM");
    const token = finGerarTokenTermo_();
    const urlPublica = finMontarUrlTermo_(token);
    const qrcodeLink = urlPublica && urlPublica.indexOf("?fin_termo=") !== 0
      ? "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + finUrlEncode_(urlPublica)
      : "";
    const textoTermo = finMontarTextoPadraoTermo_(cartao, politica);
    const hash = finHashSha256_(textoTermo + "|" + termoId + "|" + token);
    return {
      registro: {
        ID: finUuid_(),
        TERMO_ID: termoId,
        CARTAO_ID: finSafeText_(cartao.CARTAO_ID || cartao.ID),
        FUNCIONARIO_ID: finSafeText_(cartao.FUNCIONARIO_ID),
        FUNCIONARIO_NOME: finSafeText_(cartao.FUNCIONARIO_NOME),
        FUNCIONARIO_CPF: "",
        VERSAO_TERMO: VERSAO_TERMO,
        HASH_TERMO: hash,
        TOKEN_VALIDACAO: token,
        URL_VALIDACAO: urlPublica,
        QRCODE_LINK: qrcodeLink,
        DATA_EXPIRACAO_TOKEN: finAddHoras_(agora, HORAS_EXPIRACAO_TOKEN),
        ENVIADO_WHATSAPP: "NAO",
        DATA_ENVIO_WHATSAPP: "",
        NUMERO_WHATSAPP: "",
        IP_DISPOSITIVO: "",
        USER_AGENT: "",
        LATITUDE: "",
        LONGITUDE: "",
        LOCALIZACAO_TEXTO: "",
        DATA_ASSINATURA: "",
        ASSINATURA_DATA_URL: "",
        ASSINATURA_FILE_ID: "",
        ASSINATURA_LINK: "",
        PDF_FILE_ID: "",
        PDF_URL: "",
        NOME_ARQUIVO: "",
        ACEITE_POLITICA: "NAO",
        DATA_ACEITE_POLITICA: "",
        VERSAO_POLITICA: politica ? finSafeText_(politica.VERSAO) : VERSAO_POLITICA_PADRAO,
        STATUS: "PENDENTE",
        CRIADO_EM: agora,
        CRIADO_POR: u.nome
      },
      textoTermo: textoTermo,
      urlPublica: urlPublica,
      qrcodeLink: qrcodeLink,
      avisos: politica ? [] : ["Politica vigente nao encontrada. Texto padrao interno aplicado."]
    };
  }

  function finValidarTermoPendente_(termo) {
    if (!termo) throw new Error("Termo nao encontrado.");
    if (finSafeUpper_(termo.STATUS) !== "PENDENTE") throw new Error("Termo nao esta pendente.");
    if (finDataVencida_(termo.DATA_EXPIRACAO_TOKEN)) throw new Error("Token do termo expirado.");
  }

  function finPayloadAceiteSim_(payload) {
    const v = payload && (payload.aceitePolitica || payload.ACEITE_POLITICA);
    return v === true || finSafeUpper_(v) === "SIM";
  }

  function finAssinaturaDataUrl_(payload) {
    return finSafeText_(payload && (payload.assinaturaDataUrl || payload.ASSINATURA_DATA_URL));
  }

  function finPayloadCampo_(payload, a, b) {
    return finSafeText_(payload && (payload[a] || payload[b]));
  }

  function finMascaraFinal4_(cartao) {
    const final4 = finSafeText_(cartao && cartao.NUMERO_FINAL_4).replace(/\D/g, "").slice(-4);
    return final4 ? "**** **** **** " + final4 : "Cartao sem final informado";
  }

  function finObterLogoUrl_() {
    try {
      if (typeof SGO_CFG !== "undefined" && SGO_CFG.LOGO_URL) return finSafeText_(SGO_CFG.LOGO_URL);
      if (typeof SGO_CFG !== "undefined" && SGO_CFG.SISTEMA && SGO_CFG.SISTEMA.LOGO_URL) return finSafeText_(SGO_CFG.SISTEMA.LOGO_URL);
    } catch (e) {}
    return "";
  }

  function finNormalizarTelefone_(v) {
    const d = finSafeText_(v).replace(/\D/g, "");
    if (!d) return "";
    if (d.length === 10 || d.length === 11) return "55" + d;
    return d;
  }

  function gerarTermoCartao(sessionId, cartaoId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "gerar termo do cartao");
      finDbOk_();
      const cartao = finObterCartao_(cartaoId);
      if (!cartao) return finErro_("Cartao nao encontrado.");
      const politica = finObterPoliticaVigente_();
      const dados = finMontarRegistroTermo_(sessao, cartao, politica, false);
      const item = finInsert_(ABAS.TERMOS, dados.registro);
      const whatsapp = finMontarWhatsappTermo_(item, cartao);
      const avisos = dados.avisos.slice();
      if (!PropertiesService.getScriptProperties().getProperty("FOLDER_FINANCEIRO")) {
        avisos.push("Assinatura e PDF exigirao FOLDER_FINANCEIRO configurado.");
      }
      if (!finObterUrlBase_()) avisos.push("URL base do WebApp nao configurada. URL relativa gerada.");
      finLog_(sessao, "TERMO_GERADO", "TERMO_CARTAO", item.TERMO_ID, null, item, "OK", "Termo gerado.");
      return finOk_({
        termoId: item.TERMO_ID,
        token: item.TOKEN_VALIDACAO,
        urlPublica: item.URL_VALIDACAO,
        qrcodeLink: item.QRCODE_LINK,
        whatsappTexto: whatsapp.texto,
        item: item,
        avisos: avisos
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function obterTermoPublico(token) {
    try {
      finDbOk_();
      const tokenSeguro = finSafeText_(token);
      if (!tokenSeguro) return finErro_("Token do termo nao informado.");
      const termo = finObterTermoPorToken_(tokenSeguro);
      finValidarTermoPendente_(termo);
      const cartao = finObterCartao_(termo.CARTAO_ID);
      if (!cartao) return finErro_("Cartao vinculado ao termo nao encontrado.");
      const politica = finObterPoliticaVigente_();
      const textoTermo = finMontarTextoPadraoTermo_(cartao, politica);
      return finOk_({
        termo: {
          termoId: termo.TERMO_ID,
          status: termo.STATUS,
          dataExpiracaoToken: termo.DATA_EXPIRACAO_TOKEN,
          tokenValidacao: termo.TOKEN_VALIDACAO
        },
        cartao: {
          cartaoId: finSafeText_(cartao.CARTAO_ID || cartao.ID),
          identificador: finSafeText_(cartao.IDENTIFICADOR_CARTAO),
          final4: finSafeText_(cartao.NUMERO_FINAL_4),
          apelido: finSafeText_(cartao.APELIDO_CARTAO),
          operadora: finSafeText_(cartao.OPERADORA),
          bandeira: finSafeText_(cartao.BANDEIRA)
        },
        colaborador: {
          funcionarioId: finSafeText_(cartao.FUNCIONARIO_ID),
          nome: finSafeText_(cartao.FUNCIONARIO_NOME),
          email: finSafeText_(cartao.FUNCIONARIO_EMAIL)
        },
        conteudoHtml: finSanitizarHtml_(textoTermo),
        textoTermo: textoTermo,
        versaoTermo: finSafeText_(termo.VERSAO_TERMO),
        versaoPolitica: politica ? finSafeText_(politica.VERSAO) : VERSAO_POLITICA_PADRAO,
        urlValidacao: finSafeText_(termo.URL_VALIDACAO),
        qrcodeLink: finSafeText_(termo.QRCODE_LINK)
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function assinarTermoPublico(token, payload) {
    let lock = null;
    let lockObtido = false;
    let assinaturaFileIdCriado = "";
    try {
      finDbOk_();
      const tokenSeguro = finSafeText_(token);
      if (!tokenSeguro) return finErro_("Token do termo nao informado.");
      lock = LockService.getScriptLock();
      lockObtido = lock.tryLock(10000);
      if (!lockObtido) return finErro_("Assinatura em processamento. Tente novamente em instantes.");
      const termo = finObterTermoPorToken_(tokenSeguro);
      finValidarTermoPendente_(termo);
      if (!finPayloadAceiteSim_(payload)) return finErro_("Aceite da politica e obrigatorio.");
      const assinaturaDataUrl = finAssinaturaDataUrl_(payload);
      if (!assinaturaDataUrl || assinaturaDataUrl.indexOf("data:image/png;base64,") !== 0) {
        return finErro_("Assinatura invalida. Envie imagem PNG em data URL.");
      }
      const cartao = finObterCartao_(termo.CARTAO_ID);
      if (!cartao) return finErro_("Cartao vinculado ao termo nao encontrado.");
      const assinatura = finSalvarDataUrlDrive_(assinaturaDataUrl, termo.TERMO_ID + "_assinatura.png");
      assinaturaFileIdCriado = assinatura.fileId;
      const politica = finObterPoliticaVigente_();
      const textoTermo = finMontarTextoPadraoTermo_(cartao, politica);
      const hashFinal = finHashSha256_(textoTermo + "|" + termo.TERMO_ID + "|" + assinatura.fileId + "|" + finNow_());
      const html = finMontarHtmlTermoA4_({
        termo: Object.assign({}, termo, { HASH_TERMO: hashFinal }),
        cartao: cartao,
        textoTermo: textoTermo,
        assinaturaLink: assinatura.url
      });
      const pdf = finSalvarPdfDrive_(html, termo.TERMO_ID + "_termo_cartao_flash.pdf");
      const agora = finNow_();
      const patchTermo = {
        STATUS: "ASSINADO",
        DATA_ASSINATURA: agora,
        ASSINATURA_FILE_ID: assinatura.fileId,
        ASSINATURA_LINK: assinatura.url,
        ASSINATURA_DATA_URL: "ARQUIVO_DRIVE",
        PDF_FILE_ID: pdf.fileId,
        PDF_URL: pdf.url,
        NOME_ARQUIVO: pdf.nomeArquivo,
        HASH_TERMO: hashFinal,
        ACEITE_POLITICA: "SIM",
        DATA_ACEITE_POLITICA: agora,
        IP_DISPOSITIVO: finPayloadCampo_(payload, "ipDispositivo", "IP_DISPOSITIVO"),
        USER_AGENT: finPayloadCampo_(payload, "userAgent", "USER_AGENT"),
        LATITUDE: finPayloadCampo_(payload, "latitude", "LATITUDE"),
        LONGITUDE: finPayloadCampo_(payload, "longitude", "LONGITUDE"),
        LOCALIZACAO_TEXTO: finPayloadCampo_(payload, "localizacaoTexto", "LOCALIZACAO_TEXTO")
      };
      const termoAssinado = finUpdate_(ABAS.TERMOS, termo.ID, patchTermo);
      const documento = {
        ID: finUuid_(),
        DOCUMENTO_ID: finGerarId_("DOC"),
        TIPO_DOCUMENTO: "FIN_TERMO_CARTAO",
        CARTAO_ID: finSafeText_(cartao.CARTAO_ID || cartao.ID),
        FUNCIONARIO_ID: finSafeText_(cartao.FUNCIONARIO_ID),
        FUNCIONARIO_NOME: finSafeText_(cartao.FUNCIONARIO_NOME),
        PERIODO_REFERENCIA: "",
        NUMERO_DOCUMENTO: termo.TERMO_ID,
        TITULO: "Termo de Responsabilidade do Cartao Flash",
        NOME_ARQUIVO: pdf.nomeArquivo,
        FILE_ID: pdf.fileId,
        LINK_ARQUIVO: pdf.url,
        DATA_EMISSAO: agora,
        HASH_SHA256: hashFinal,
        TOKEN_VALIDACAO: termo.TOKEN_VALIDACAO,
        URL_VALIDACAO: termo.URL_VALIDACAO,
        QRCODE_LINK: termo.QRCODE_LINK,
        EMITIDO_POR: "SISTEMA_TERMO_PUBLICO",
        DESTINATARIO_NOME: finSafeText_(cartao.FUNCIONARIO_NOME),
        DESTINATARIO_EMAIL: finSafeText_(cartao.FUNCIONARIO_EMAIL),
        DESTINATARIO_WHATSAPP: finSafeText_(cartao.FUNCIONARIO_TELEFONE),
        ENVIADO_WHATSAPP: "NAO",
        DATA_ENVIO_WHATSAPP: "",
        ENVIADO_EMAIL: "NAO",
        DATA_ENVIO_EMAIL: "",
        STATUS: "ATIVO",
        CRIADO_EM: agora,
        CRIADO_POR: "SISTEMA_TERMO_PUBLICO"
      };
      finInsert_(ABAS.DOCUMENTOS, documento);
      finUpdate_(ABAS.CARTOES, cartao.ID, {
        TERMO_ASSINADO: "SIM",
        TERMO_ID: termo.TERMO_ID,
        STATUS_CARTAO: "ATIVO",
        ATUALIZADO_EM: agora,
        ATUALIZADO_POR: "SISTEMA_TERMO_PUBLICO"
      });
      finLog_(null, "TERMO_ASSINADO", "TERMO_CARTAO", termo.TERMO_ID, termo, termoAssinado, "OK", "Termo assinado pelo colaborador.");
      return finOk_({
        termoId: termo.TERMO_ID,
        pdfUrl: pdf.url,
        hashTermo: hashFinal,
        tokenValidacao: termo.TOKEN_VALIDACAO,
        qrcodeLink: termo.QRCODE_LINK
      });
    } catch (e) {
      const msg = assinaturaFileIdCriado
        ? e.message + " Assinatura ja salva no Drive com FILE_ID " + assinaturaFileIdCriado + ". Verificar arquivo orfao antes de nova tentativa."
        : e.message;
      if (assinaturaFileIdCriado) {
        finLog_(null, "TERMO_ASSINATURA_FALHA_APOS_UPLOAD", "TERMO_CARTAO", finSafeText_(token), null, { assinaturaFileId: assinaturaFileIdCriado }, "ERRO", msg);
      }
      return finErro_(msg, assinaturaFileIdCriado ? { assinaturaFileId: assinaturaFileIdCriado } : undefined);
    } finally {
      if (lockObtido && lock) {
        try {
          lock.releaseLock();
        } catch (e2) {}
      }
    }
  }

  function reemitirTermoCartao(sessionId, cartaoId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "reemitir termo do cartao");
      finDbOk_();
      const cartao = finObterCartao_(cartaoId);
      if (!cartao) return finErro_("Cartao nao encontrado.");
      const termos = finAll_(ABAS.TERMOS).filter(function(t) {
        return finSafeText_(t.CARTAO_ID) === finSafeText_(cartao.CARTAO_ID || cartao.ID);
      });
      const assinado = termos.some(function(t) { return finSafeUpper_(t.STATUS) === "ASSINADO"; });
      if (assinado) return finErro_("Cartao ja possui termo assinado. Nova versao exige regra futura explicita.");
      const novo = gerarTermoCartao(sessionId, cartaoId);
      if (!novo || novo.ok !== true) return novo;
      const novoTermoId = finSafeText_(novo.termoId);
      termos.forEach(function(t) {
        if (finSafeUpper_(t.STATUS) === "PENDENTE" && finSafeText_(t.TERMO_ID) !== novoTermoId) {
          finUpdate_(ABAS.TERMOS, t.ID, { STATUS: "CANCELADO" });
        }
      });
      if (!novo.avisos) novo.avisos = [];
      novo.avisos.push("Termos pendentes anteriores foram cancelados somente apos novo termo ser gerado com sucesso.");
      return novo;
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function obterStatusTermo(sessionId, cartaoId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "consultar status do termo");
      finDbOk_();
      const cartao = finObterCartao_(cartaoId);
      if (!cartao) return finErro_("Cartao nao encontrado.");
      if (finSafeUpper_(sessao && sessao.perfil) === "TECNICO" && !finCartaoPertenceUsuario_(cartao, sessao)) {
        return finErro_("Acesso negado: tecnico so pode consultar o proprio cartao.");
      }
      const termos = finAll_(ABAS.TERMOS).filter(function(t) {
        return finSafeText_(t.CARTAO_ID) === finSafeText_(cartao.CARTAO_ID || cartao.ID);
      });
      if (!termos.length) return finOk_({ statusTermo: "SEM_TERMO", cartaoId: finSafeText_(cartao.CARTAO_ID || cartao.ID) });
      termos.sort(function(a, b) {
        return finSafeText_(b.CRIADO_EM).localeCompare(finSafeText_(a.CRIADO_EM));
      });
      const termo = termos[0];
      let status = finSafeUpper_(termo.STATUS) || "SEM_TERMO";
      if (status === "PENDENTE" && finDataVencida_(termo.DATA_EXPIRACAO_TOKEN)) status = "EXPIRADO";
      return finOk_({
        statusTermo: status,
        termoId: termo.TERMO_ID,
        urlPublica: termo.URL_VALIDACAO,
        pdfUrl: termo.PDF_URL,
        dataAssinatura: termo.DATA_ASSINATURA,
        token: status === "PENDENTE" ? termo.TOKEN_VALIDACAO : ""
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function enviarTermoWhatsapp(sessionId, termoId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "enviar termo por WhatsApp");
      finDbOk_();
      const termo = finObterTermoPorId_(termoId);
      if (!termo) return finErro_("Termo nao encontrado.");
      const cartao = finObterCartao_(termo.CARTAO_ID);
      if (!cartao) return finErro_("Cartao vinculado ao termo nao encontrado.");
      const w = finMontarWhatsappTermo_(termo, cartao);
      const depois = finUpdate_(ABAS.TERMOS, termo.ID, {
        ENVIADO_WHATSAPP: "SIM",
        DATA_ENVIO_WHATSAPP: finNow_(),
        NUMERO_WHATSAPP: w.numero
      });
      finLog_(sessao, "TERMO_WHATSAPP_PREPARADO", "TERMO_CARTAO", termo.TERMO_ID, termo, depois, "OK", "Texto e link de WhatsApp preparados.");
      return finOk_({ whatsappTexto: w.texto, whatsappLink: w.link });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  return {
    gerarTermoCartao: gerarTermoCartao,
    obterTermoPublico: obterTermoPublico,
    assinarTermoPublico: assinarTermoPublico,
    reemitirTermoCartao: reemitirTermoCartao,
    obterStatusTermo: obterStatusTermo,
    enviarTermoWhatsapp: enviarTermoWhatsapp
  };
})();

function finGerarTermoCartao(sId, cartaoId) {
  return SGO_FIN_TERMOS.gerarTermoCartao(sId, cartaoId);
}

function finObterTermoPublico(token) {
  return SGO_FIN_TERMOS.obterTermoPublico(token);
}

function finAssinarTermoPublico(token, payload) {
  return SGO_FIN_TERMOS.assinarTermoPublico(token, payload);
}

function finReemitirTermoCartao(sId, cartaoId) {
  return SGO_FIN_TERMOS.reemitirTermoCartao(sId, cartaoId);
}

function finObterStatusTermo(sId, cartaoId) {
  return SGO_FIN_TERMOS.obterStatusTermo(sId, cartaoId);
}

function finEnviarTermoWhatsapp(sId, termoId) {
  return SGO_FIN_TERMOS.enviarTermoWhatsapp(sId, termoId);
}
