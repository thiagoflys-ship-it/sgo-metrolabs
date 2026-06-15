// SGO_Fin_Provisionamento.js - METROLABS SGO+
// Modulo FIN - Provisionamento controlado do ambiente financeiro
// REGRA: nao executa nada automaticamente.

const SGO_FIN_PROVISIONAMENTO = (() => {
  const MODO_DIAGNOSTICO = "DIAGNOSTICO_AMBIENTE_FIN_V2";
  const MODO_PROVISIONAMENTO = "PROVISIONAMENTO_AMBIENTE_FIN_V2";
  const MODO_PROVISIONAMENTO_PROD_B34 = "PROVISIONAMENTO_FIN_PRODUCAO_LIMPA_B34";
  const NOME_PLANILHA_FIN = "SGO_FIN_CARTAO_FLASH_DB";
  const NOME_PASTA_FIN = "SGO_FINANCEIRO_DOCUMENTOS";
  const NOME_PLANILHA_FIN_PROD = "SGO_FIN_CARTAO_FLASH_DB_PROD";
  const NOME_PASTA_FIN_PROD = "SGO_FINANCEIRO_DOCUMENTOS_PROD";
  const CHAVE_DB_FIN = "DB_FIN_ID";
  const CHAVE_DB_FIN_URL = "DB_FIN_URL";
  const CHAVE_PASTA_FIN = "FOLDER_FINANCEIRO";
  const CHAVE_WEBAPP_SGO = "SGO_WEBAPP_URL";
  const CHAVE_WEBAPP_LEGADO = "WEBAPP_URL";
  const TEXTO_AUTORIZACAO = "CRIAR_AMBIENTE_FINANCEIRO_SGO_2026";
  const TEXTO_AUTORIZACAO_URL = "CONFIGURAR_URL_WEBAPP_FINANCEIRO_SGO_2026";
  const TEXTO_AUTORIZACAO_URL_AUTO = "ATUALIZAR_URL_WEBAPP_FINANCEIRO_SGO_2026";
  const TEXTO_AUTORIZACAO_TERMO_TESTE = "CRIAR_TERMO_FINANCEIRO_TESTE_SGO_2026";
  const TEXTO_AUTORIZACAO_POLITICA_FLASH = "CADASTRAR_POLITICA_CARTAO_FLASH_SGO_2026";
  const MODO_CONFIGURAR_URL = "CONFIGURAR_URL_WEBAPP_FIN_V2";
  const MODO_ATUALIZAR_URL = "ATUALIZAR_URL_WEBAPP_FIN_V2";
  const MODO_TERMO_TESTE = "CRIAR_TERMO_FINANCEIRO_TESTE_V2";
  const MODO_POLITICA_FLASH = "CADASTRAR_POLITICA_CARTAO_FLASH_V1";
  const MODO_AUDITORIA_POLITICA_FLASH = "AUDITORIA_POLITICA_CARTAO_FLASH_V1";
  const MODO_AUDITORIA_URL_WEBAPP = "AUDITORIA_URL_WEBAPP_FIN_V1";
  // ID da base de homologacao/DEV — referencia informacional; nao usar como validacao de producao
  const DB_FIN_ID_HOMOLOGACAO_DEV = "1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0";
  const MODO_AUDITORIA_SETUP = "AUDITORIA_SETUP_FIN_V2";
  const MODO_AUDITORIA_ASSINATURA = "AUDITORIA_ASSINATURA_FIN_V2";
  const TERMO_ASSINADO_TESTE = {
    termoId: "TRM-702C3EA1568D",
    token: "FIN-TRM-2026-B9D797D8A27F",
    cartaoId: "CAR-3F3F7845191A",
    hash: "a63e917ba0d14186896594f1a22e9cb3b622955a7c9bf27bfd7b2c0f65c3c14f"
  };
  const HEADERS_FIN_ESPERADOS = {
    FIN_CARTOES: 31,
    FIN_CARTOES_TERMOS: 33,
    FIN_CARTOES_RECARGAS: 23,
    FIN_CARTOES_LANCAMENTOS: 37,
    FIN_CARTOES_ANEXOS: 18,
    FIN_CARTOES_EXTRATOS: 27,
    FIN_CARTOES_CONCILIACAO: 30,
    FIN_CARTOES_PENDENCIAS: 25,
    FIN_CARTOES_DOCUMENTOS: 28,
    FIN_CARTOES_POLITICA: 20,
    FIN_CARTOES_LOGS: 17,
    FIN_CARTOES_CONFIG: 11
  };
  const HEADERS_POLITICA_FLASH = [
    "ID", "POLITICA_ID", "TIPO_DOCUMENTO", "VERSAO", "TITULO",
    "CONTEUDO_HTML", "CONTEUDO_RESUMIDO",
    "DATA_VIGENCIA_INICIO", "DATA_VIGENCIA_FIM",
    "ELABORADO_POR", "APROVADO_POR", "DATA_APROVACAO",
    "FILE_ID", "LINK_ARQUIVO", "TOKEN_VALIDACAO", "HASH_CONTEUDO",
    "TOTAL_ACEITES",
    "STATUS", "CRIADO_EM", "CRIADO_POR"
  ];
  const POLITICA_FLASH_PADRAO = {
    TIPO_DOCUMENTO: "FIN_POLITICA_CARTAO_FLASH",
    VERSAO: "FIN-POL-CARTAO-FLASH-2026-01",
    TITULO: "Politica de Uso do Cartao Corporativo Flash - Metrolabs",
    CONTEUDO_RESUMIDO: "O cartao corporativo Flash e instrumento de trabalho disponibilizado pela Metrolabs para despesas profissionais autorizadas. O colaborador deve utilizar o cartao exclusivamente para finalidades vinculadas as atividades da empresa, manter comprovantes legiveis, prestar contas nos prazos definidos, justificar despesas sem OS quando aplicavel e comunicar imediatamente perda, roubo, uso indevido ou inconsistencias. E proibido uso pessoal, saque nao autorizado, compartilhamento do cartao e qualquer despesa sem finalidade profissional comprovavel. Pendencias, ausencia de comprovacao, fraude ou uso indevido podem gerar bloqueio, apuracao interna, ressarcimento quando legalmente permitido e medidas disciplinares conforme politica interna e legislacao vigente.",
    ELABORADO_POR: "Metrolabs",
    APROVADO_POR: "Diretoria",
    STATUS: "ATIVO",
    CRIADO_POR: "SISTEMA_FIN_POLITICA_AUTORIZADA"
  };

  function texto_(v) {
    return String(v == null ? "" : v).trim();
  }

  function props_() {
    return PropertiesService.getScriptProperties();
  }

  function lerPropriedades_() {
    const p = props_();
    return {
      DB_FIN_ID: texto_(p.getProperty(CHAVE_DB_FIN)),
      DB_FIN_URL: texto_(p.getProperty(CHAVE_DB_FIN_URL)),
      FOLDER_FINANCEIRO: texto_(p.getProperty(CHAVE_PASTA_FIN)),
      SGO_WEBAPP_URL: texto_(p.getProperty(CHAVE_WEBAPP_SGO)),
      WEBAPP_URL: texto_(p.getProperty(CHAVE_WEBAPP_LEGADO))
    };
  }

  function testarPlanilhaPorId_(id) {
    const r = { existe: false, acessivel: false, id: texto_(id), nome: "", erro: "" };
    if (!r.id) return r;
    try {
      const ss = SpreadsheetApp.openById(r.id);
      r.existe = true;
      r.acessivel = true;
      r.nome = ss.getName();
    } catch (e) {
      r.erro = e.message;
    }
    return r;
  }

  function testarPastaPorId_(id) {
    const r = { existe: false, acessivel: false, id: texto_(id), nome: "", erro: "" };
    if (!r.id) return r;
    try {
      const pasta = DriveApp.getFolderById(r.id);
      r.existe = true;
      r.acessivel = true;
      r.nome = pasta.getName();
    } catch (e) {
      r.erro = e.message;
    }
    return r;
  }

  function listarPlanilhasPorNome_(nome) {
    const itens = [];
    const arquivos = DriveApp.getFilesByName(nome);
    while (arquivos.hasNext()) {
      const arq = arquivos.next();
      if (arq.getMimeType() === MimeType.GOOGLE_SHEETS) {
        itens.push({
          id: arq.getId(),
          nome: arq.getName(),
          url: arq.getUrl()
        });
      }
    }
    return itens;
  }

  function listarPastasPorNome_(nome) {
    const itens = [];
    const pastas = DriveApp.getFoldersByName(nome);
    while (pastas.hasNext()) {
      const pasta = pastas.next();
      itens.push({
        id: pasta.getId(),
        nome: pasta.getName(),
        url: pasta.getUrl()
      });
    }
    return itens;
  }

  function diagnosticarAmbienteFinanceiroV2() {
    const bloqueios = [];
    const avisos = [];
    const recomendacoes = [];
    const propriedades = lerPropriedades_();
    const planilhaConfigurada = testarPlanilhaPorId_(propriedades.DB_FIN_ID);
    const pastaConfigurada = testarPastaPorId_(propriedades.FOLDER_FINANCEIRO);
    const planilhasPorNome = listarPlanilhasPorNome_(NOME_PLANILHA_FIN);
    const pastasPorNome = listarPastasPorNome_(NOME_PASTA_FIN);

    if (!propriedades.DB_FIN_ID) {
      avisos.push("DB_FIN_ID ainda nao configurado.");
    } else if (!planilhaConfigurada.acessivel) {
      bloqueios.push("DB_FIN_ID configurado, mas a planilha nao abriu: " + planilhaConfigurada.erro);
    }

    if (!propriedades.FOLDER_FINANCEIRO) {
      avisos.push("FOLDER_FINANCEIRO ainda nao configurado.");
    } else if (!pastaConfigurada.acessivel) {
      bloqueios.push("FOLDER_FINANCEIRO configurado, mas a pasta nao abriu: " + pastaConfigurada.erro);
    }

    if (!propriedades.SGO_WEBAPP_URL && !propriedades.WEBAPP_URL) {
      avisos.push("URL publica do WebApp ainda nao configurada.");
    }

    if (planilhasPorNome.length > 1) {
      bloqueios.push("Mais de uma planilha encontrada com nome " + NOME_PLANILHA_FIN + ".");
    }
    if (pastasPorNome.length > 1) {
      bloqueios.push("Mais de uma pasta encontrada com nome " + NOME_PASTA_FIN + ".");
    }

    recomendacoes.push("Executar provisionarAmbienteFinanceiroV2_AUTORIZADO somente em etapa autorizada.");
    recomendacoes.push("Executar setupFinanceiroV2 em etapa separada apos provisionamento.");

    const resultado = {
      success: bloqueios.length === 0,
      modo: MODO_DIAGNOSTICO,
      executado: false,
      propriedadesEncontradas: propriedades,
      planilhaDbFin: planilhaConfigurada,
      pastaFinanceira: pastaConfigurada,
      planilhasComNomePadrao: planilhasPorNome,
      pastasComNomePadrao: pastasPorNome,
      recomendacoes: recomendacoes,
      bloqueios: bloqueios,
      avisos: avisos
    };
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  function validarPayload_(payload) {
    const bloqueios = [];
    const p = payload || {};
    if (p.executar !== true) {
      bloqueios.push("Payload deve conter executar true.");
    }
    if (texto_(p.confirmacao) !== TEXTO_AUTORIZACAO) {
      bloqueios.push("Confirmacao invalida para provisionamento FIN.");
    }
    return bloqueios;
  }

  function nomeProducaoUnico_(nomeBase, listarPorNome) {
    const encontrados = listarPorNome(nomeBase);
    if (encontrados.length === 0) return nomeBase;

    const timezone = Session.getScriptTimeZone() || "America/Sao_Paulo";
    const sufixo = Utilities.formatDate(new Date(), timezone, "yyyyMMdd_HHmmss");
    return nomeBase + "_" + sufixo;
  }

  function criarPlanilhaProducaoLimpaB34_() {
    const nome = nomeProducaoUnico_(NOME_PLANILHA_FIN_PROD, listarPlanilhasPorNome_);
    const ss = SpreadsheetApp.create(nome);
    return {
      id: ss.getId(),
      url: ss.getUrl(),
      nome: ss.getName(),
      criada: true,
      reutilizada: false,
      origem: "SpreadsheetApp.create"
    };
  }

  function obterOuCriarPastaProducaoLimpaB34_() {
    const encontradasProd = listarPastasPorNome_(NOME_PASTA_FIN_PROD);
    if (encontradasProd.length === 1) {
      return {
        id: encontradasProd[0].id,
        url: encontradasProd[0].url,
        nome: encontradasProd[0].nome,
        criada: false,
        reutilizada: true,
        origem: "Drive.nome.PROD"
      };
    }

    const nome = encontradasProd.length === 0
      ? NOME_PASTA_FIN_PROD
      : nomeProducaoUnico_(NOME_PASTA_FIN_PROD, listarPastasPorNome_);
    const pasta = DriveApp.createFolder(nome);
    return {
      id: pasta.getId(),
      url: pasta.getUrl(),
      nome: pasta.getName(),
      criada: true,
      reutilizada: false,
      origem: "DriveApp.createFolder"
    };
  }

  function montarRetornoProducaoLimpaB34_(bloqueios, avisos) {
    const propriedades = lerPropriedades_();
    return {
      success: false,
      ok: false,
      executado: false,
      modo: MODO_PROVISIONAMENTO_PROD_B34,
      planilhaCriada: false,
      planilhaReutilizada: false,
      pastaCriada: false,
      pastaReutilizada: false,
      DB_FIN_ID: propriedades.DB_FIN_ID,
      DB_FIN_URL: propriedades.DB_FIN_URL,
      FOLDER_FINANCEIRO: propriedades.FOLDER_FINANCEIRO,
      dbFinIdDevBloqueado: DB_FIN_ID_HOMOLOGACAO_DEV,
      dbFinIdDiferenteDev: propriedades.DB_FIN_ID !== DB_FIN_ID_HOMOLOGACAO_DEV,
      SGO_WEBAPP_URL: propriedades.SGO_WEBAPP_URL,
      WEBAPP_URL: propriedades.WEBAPP_URL,
      bloqueios: bloqueios,
      avisos: avisos,
      proximaEtapa: "Provisionamento bloqueado; nao executar setupFinanceiroV2."
    };
  }

  function provisionarAmbienteFinanceiroProducaoLimpaB34_AUTORIZADO(payload) {
    const bloqueios = validarPayload_(payload);
    const avisos = [];
    if (bloqueios.length > 0) {
      return montarRetornoProducaoLimpaB34_(bloqueios, avisos);
    }

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      bloqueios.push("Nao foi possivel obter lock de provisionamento FIN producao B.3.4.");
      return montarRetornoProducaoLimpaB34_(bloqueios, avisos);
    }

    try {
      const propriedadesAntes = lerPropriedades_();
      if (propriedadesAntes.DB_FIN_ID === DB_FIN_ID_HOMOLOGACAO_DEV) {
        avisos.push("DB_FIN_ID atual aponta para DEV/homologacao e sera substituido por DB_FIN PROD limpo.");
      }

      const planilha = criarPlanilhaProducaoLimpaB34_();
      if (planilha.id === DB_FIN_ID_HOMOLOGACAO_DEV) {
        bloqueios.push("DB_FIN_ID_DEV_DETECTADO_PRODUCAO_BLOQUEADA");
        return montarRetornoProducaoLimpaB34_(bloqueios, avisos);
      }

      const pasta = obterOuCriarPastaProducaoLimpaB34_();
      const p = props_();
      p.setProperty(CHAVE_DB_FIN, planilha.id);
      p.setProperty(CHAVE_DB_FIN_URL, planilha.url);
      p.setProperty(CHAVE_PASTA_FIN, pasta.id);
      avisos.push("WEBAPP_URL nao configurada porque ainda nao ha deploy de producao.");

      const propriedades = lerPropriedades_();
      if (propriedades.DB_FIN_ID === DB_FIN_ID_HOMOLOGACAO_DEV) {
        bloqueios.push("DB_FIN_ID_DEV_DETECTADO_PRODUCAO_BLOQUEADA");
      }

      return {
        success: bloqueios.length === 0,
        ok: bloqueios.length === 0,
        executado: bloqueios.length === 0,
        modo: MODO_PROVISIONAMENTO_PROD_B34,
        planilhaCriada: planilha.criada,
        planilhaReutilizada: planilha.reutilizada,
        planilhaNome: planilha.nome,
        pastaCriada: pasta.criada,
        pastaReutilizada: pasta.reutilizada,
        pastaNome: pasta.nome,
        DB_FIN_ID: propriedades.DB_FIN_ID,
        DB_FIN_URL: propriedades.DB_FIN_URL,
        FOLDER_FINANCEIRO: propriedades.FOLDER_FINANCEIRO,
        dbFinIdDevBloqueado: DB_FIN_ID_HOMOLOGACAO_DEV,
        dbFinIdDiferenteDev: propriedades.DB_FIN_ID !== DB_FIN_ID_HOMOLOGACAO_DEV,
        SGO_WEBAPP_URL: propriedades.SGO_WEBAPP_URL,
        WEBAPP_URL: propriedades.WEBAPP_URL,
        bloqueios: bloqueios,
        avisos: avisos,
        proximaEtapa: "Executar setupFinanceiroV2 em etapa separada"
      };
    } catch (e) {
      bloqueios.push("Falha no provisionamento FIN producao B.3.4: " + e.message);
      return montarRetornoProducaoLimpaB34_(bloqueios, avisos);
    } finally {
      lock.releaseLock();
    }
  }

  function obterOuCriarPlanilha_(bloqueios) {
    const propriedades = lerPropriedades_();
    const atual = testarPlanilhaPorId_(propriedades.DB_FIN_ID);
    if (propriedades.DB_FIN_ID && atual.acessivel) {
      return {
        id: atual.id,
        criada: false,
        reutilizada: true,
        origem: "ScriptProperties.DB_FIN_ID"
      };
    }
    if (propriedades.DB_FIN_ID && !atual.acessivel) {
      bloqueios.push("DB_FIN_ID existente nao abriu: " + atual.erro);
      return null;
    }

    const encontradas = listarPlanilhasPorNome_(NOME_PLANILHA_FIN);
    if (encontradas.length > 1) {
      bloqueios.push("Mais de uma planilha encontrada com nome " + NOME_PLANILHA_FIN + ".");
      return null;
    }
    if (encontradas.length === 1) {
      return {
        id: encontradas[0].id,
        criada: false,
        reutilizada: true,
        origem: "Drive.nome"
      };
    }

    const ss = SpreadsheetApp.create(NOME_PLANILHA_FIN);
    return {
      id: ss.getId(),
      criada: true,
      reutilizada: false,
      origem: "SpreadsheetApp.create"
    };
  }

  function obterOuCriarPasta_(bloqueios) {
    const propriedades = lerPropriedades_();
    const atual = testarPastaPorId_(propriedades.FOLDER_FINANCEIRO);
    if (propriedades.FOLDER_FINANCEIRO && atual.acessivel) {
      return {
        id: atual.id,
        criada: false,
        reutilizada: true,
        origem: "ScriptProperties.FOLDER_FINANCEIRO"
      };
    }
    if (propriedades.FOLDER_FINANCEIRO && !atual.acessivel) {
      bloqueios.push("FOLDER_FINANCEIRO existente nao abriu: " + atual.erro);
      return null;
    }

    const encontradas = listarPastasPorNome_(NOME_PASTA_FIN);
    if (encontradas.length > 1) {
      bloqueios.push("Mais de uma pasta encontrada com nome " + NOME_PASTA_FIN + ".");
      return null;
    }
    if (encontradas.length === 1) {
      return {
        id: encontradas[0].id,
        criada: false,
        reutilizada: true,
        origem: "Drive.nome"
      };
    }

    const pasta = DriveApp.createFolder(NOME_PASTA_FIN);
    return {
      id: pasta.getId(),
      criada: true,
      reutilizada: false,
      origem: "DriveApp.createFolder"
    };
  }

  function provisionarAmbienteFinanceiroV2_AUTORIZADO(payload) {
    const bloqueios = validarPayload_(payload);
    const avisos = [];
    const retornoBase = {
      success: false,
      executado: false,
      modo: MODO_PROVISIONAMENTO,
      planilhaCriada: false,
      planilhaReutilizada: false,
      pastaCriada: false,
      pastaReutilizada: false,
      DB_FIN_ID: "",
      FOLDER_FINANCEIRO: "",
      SGO_WEBAPP_URL: "",
      bloqueios: bloqueios,
      avisos: avisos,
      proximaEtapa: "Executar setupFinanceiroV2 em etapa separada"
    };

    if (bloqueios.length > 0) return retornoBase;

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      bloqueios.push("Nao foi possivel obter lock de provisionamento FIN.");
      return retornoBase;
    }

    try {
      const planilha = obterOuCriarPlanilha_(bloqueios);
      const pasta = obterOuCriarPasta_(bloqueios);
      if (bloqueios.length > 0 || !planilha || !pasta) return retornoBase;

      const p = props_();
      p.setProperty(CHAVE_DB_FIN, planilha.id);
      p.setProperty(CHAVE_PASTA_FIN, pasta.id);

      const webAppUrl = texto_(payload && payload.webAppUrl);
      if (webAppUrl) {
        p.setProperty(CHAVE_WEBAPP_SGO, webAppUrl);
        p.setProperty(CHAVE_WEBAPP_LEGADO, webAppUrl);
      } else {
        avisos.push("webAppUrl nao informado; SGO_WEBAPP_URL e WEBAPP_URL nao foram atualizadas.");
      }

      const propriedades = lerPropriedades_();
      return {
        success: true,
        executado: true,
        modo: MODO_PROVISIONAMENTO,
        planilhaCriada: planilha.criada,
        planilhaReutilizada: planilha.reutilizada,
        pastaCriada: pasta.criada,
        pastaReutilizada: pasta.reutilizada,
        DB_FIN_ID: propriedades.DB_FIN_ID,
        FOLDER_FINANCEIRO: propriedades.FOLDER_FINANCEIRO,
        SGO_WEBAPP_URL: propriedades.SGO_WEBAPP_URL,
        bloqueios: bloqueios,
        avisos: avisos,
        proximaEtapa: "Executar setupFinanceiroV2 em etapa separada"
      };
    } catch (e) {
      bloqueios.push("Falha no provisionamento FIN: " + e.message);
      return retornoBase;
    } finally {
      lock.releaseLock();
    }
  }

  function auditarSetupFinanceiroV2() {
    const bloqueios = [];
    const avisos = [];
    const checks = [];
    const propriedades = lerPropriedades_();
    const abasEsperadas = Object.keys(HEADERS_FIN_ESPERADOS);
    const abasEncontradas = [];
    const abasFaltando = [];
    const abasExtras = [];
    const detalhesAbas = [];
    let nomePlanilha = "";
    let totalHeadersEncontrado = 0;
    let ss = null;

    function check_(nome, ok, detalhe) {
      checks.push({
        check: nome,
        ok: !!ok,
        detalhe: String(detalhe || "")
      });
    }

    check_("DB_FIN_ID informado", !!propriedades.DB_FIN_ID, propriedades.DB_FIN_ID || "vazio");
    check_(
      "DB_FIN_ID configurado e acessivel",
      !!propriedades.DB_FIN_ID,
      propriedades.DB_FIN_ID || "vazio"
    );

    if (!propriedades.DB_FIN_ID) {
      bloqueios.push("DB_FIN_ID nao configurado.");
    } else if (propriedades.DB_FIN_ID === DB_FIN_ID_HOMOLOGACAO_DEV) {
      avisos.push("DB_FIN_ID aponta para base de homologacao/DEV conhecida. Para producao real, use projeto Apps Script separado com DB_FIN_ID proprio.");
    }

    if (bloqueios.length === 0) {
      try {
        ss = SpreadsheetApp.openById(propriedades.DB_FIN_ID);
        nomePlanilha = ss.getName();
        check_("Planilha FIN acessivel", true, nomePlanilha);
      } catch (e) {
        bloqueios.push("Falha ao abrir planilha FIN: " + e.message);
        check_("Planilha FIN acessivel", false, e.message);
      }
    }

    if (ss) {
      const nomesEncontrados = ss.getSheets().map(function(sheet) {
        return sheet.getName();
      });

      abasEsperadas.forEach(function(nomeAba) {
        const sheet = ss.getSheetByName(nomeAba);
        if (!sheet) {
          abasFaltando.push(nomeAba);
          detalhesAbas.push({
            nomeAba: nomeAba,
            existe: false,
            headersEsperados: HEADERS_FIN_ESPERADOS[nomeAba],
            headersEncontrados: 0,
            ok: false
          });
          check_("Aba " + nomeAba, false, "nao encontrada");
          return;
        }

        abasEncontradas.push(nomeAba);
        const esperado = HEADERS_FIN_ESPERADOS[nomeAba];
        const lastCol = sheet.getLastColumn();
        let headersEncontrados = 0;
        if (lastCol > 0) {
          const linha = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
          headersEncontrados = linha.filter(function(h) {
            return texto_(h) !== "";
          }).length;
        }
        totalHeadersEncontrado += headersEncontrados;
        const ok = headersEncontrados === esperado;
        detalhesAbas.push({
          nomeAba: nomeAba,
          existe: true,
          headersEsperados: esperado,
          headersEncontrados: headersEncontrados,
          ok: ok
        });
        check_("Headers " + nomeAba, ok, headersEncontrados + "/" + esperado);
      });

      nomesEncontrados.forEach(function(nomeAba) {
        if (abasEsperadas.indexOf(nomeAba) < 0) {
          abasExtras.push(nomeAba);
        }
      });

      if (abasExtras.length > 0) {
        avisos.push("Abas extras encontradas: " + abasExtras.join(", "));
      }
    }

    const totalHeadersEsperado = abasEsperadas.reduce(function(total, nomeAba) {
      return total + HEADERS_FIN_ESPERADOS[nomeAba];
    }, 0);

    check_("Total de abas FIN", abasEncontradas.length === abasEsperadas.length, abasEncontradas.length + "/" + abasEsperadas.length);
    check_("Total de headers FIN", totalHeadersEncontrado === totalHeadersEsperado, totalHeadersEncontrado + "/" + totalHeadersEsperado);
    check_("FIN_CARTOES_TERMOS com 33 headers", detalhesAbas.some(function(aba) {
      return aba.nomeAba === "FIN_CARTOES_TERMOS" && aba.headersEncontrados === 33;
    }), "validacao especifica");

    if (abasFaltando.length > 0) {
      bloqueios.push("Abas FIN faltando: " + abasFaltando.join(", "));
    }
    if (totalHeadersEncontrado !== totalHeadersEsperado) {
      bloqueios.push("Total de headers diferente do esperado.");
    }

    const resultado = {
      success: bloqueios.length === 0,
      modo: MODO_AUDITORIA_SETUP,
      executado: false,
      DB_FIN_ID: propriedades.DB_FIN_ID,
      nomePlanilha: nomePlanilha,
      abasEsperadas: abasEsperadas,
      abasEncontradas: abasEncontradas,
      abasFaltando: abasFaltando,
      abasExtras: abasExtras,
      totalHeadersEsperado: totalHeadersEsperado,
      totalHeadersEncontrado: totalHeadersEncontrado,
      detalhesAbas: detalhesAbas,
      checks: checks,
      bloqueios: bloqueios,
      avisos: avisos
    };
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  function linhasAba_(ss, nomeAba) {
    const sheet = ss.getSheetByName(nomeAba);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return [];
    const valores = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = valores[0].map(function(h) {
      return texto_(h);
    });
    const linhas = [];
    for (let i = 1; i < valores.length; i++) {
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        if (headers[j]) obj[headers[j]] = valores[i][j];
      }
      linhas.push(obj);
    }
    return linhas;
  }

  function acharLinha_(linhas, campo, valor) {
    const alvo = texto_(valor);
    return linhas.find(function(linha) {
      return texto_(linha[campo]) === alvo;
    }) || null;
  }

  function linhasAbaComNumero_(ss, nomeAba) {
    const sheet = ss.getSheetByName(nomeAba);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return [];
    const valores = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = valores[0].map(function(h) {
      return texto_(h);
    });
    const linhas = [];
    for (let i = 1; i < valores.length; i++) {
      const obj = { linha: i + 1 };
      for (let j = 0; j < headers.length; j++) {
        if (headers[j]) obj[headers[j]] = valores[i][j];
      }
      linhas.push(obj);
    }
    return linhas;
  }

  function arquivoDriveResumo_(fileId) {
    const id = texto_(fileId);
    const r = {
      fileId: id,
      existe: false,
      nome: "",
      mimeType: "",
      tamanhoBytes: "",
      url: "",
      erro: ""
    };
    if (!id) return r;
    try {
      const file = DriveApp.getFileById(id);
      r.existe = true;
      r.nome = file.getName();
      r.mimeType = file.getMimeType();
      r.tamanhoBytes = String(file.getSize());
      r.url = file.getUrl();
    } catch (e) {
      r.erro = e.message;
    }
    return r;
  }

  function dataHojeScript_() {
    const tz = Session.getScriptTimeZone() || "America/Sao_Paulo";
    return Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  }

  function agoraIso_() {
    return new Date().toISOString();
  }

  function uuid_() {
    return Utilities.getUuid();
  }

  function hashSha256Hex_(texto) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto_(texto));
    return bytes.map(function(b) {
      const v = b < 0 ? b + 256 : b;
      return ("0" + v.toString(16)).slice(-2);
    }).join("");
  }

  function conteudoHtmlPoliticaFlash_(conteudoResumo) {
    return "<h1>Politica de Uso do Cartao Corporativo Flash - Metrolabs</h1>" +
      "<p>" + texto_(conteudoResumo) + "</p>";
  }

  function validarHeadersPolitica_(headers) {
    const faltando = [];
    HEADERS_POLITICA_FLASH.forEach(function(h) {
      if (headers.indexOf(h) < 0) faltando.push(h);
    });
    return faltando;
  }

  function cadastrarPoliticaCartaoFlashV1_AUTORIZADO(payload) {
    const bloqueios = [];
    const avisos = [];
    const p = payload || {};
    const propriedades = lerPropriedades_();
    let politicaId = "";
    let linha = 0;
    let hashConteudo = "";
    let status = "";
    let versao = POLITICA_FLASH_PADRAO.VERSAO;

    if (p.executar !== true) {
      bloqueios.push("Payload deve conter executar true.");
    }
    if (texto_(p.confirmacao) !== TEXTO_AUTORIZACAO_POLITICA_FLASH) {
      bloqueios.push("Confirmacao invalida para cadastrar politica do Cartao Flash.");
    }
    if (!propriedades.DB_FIN_ID) {
      bloqueios.push("DB_FIN_ID nao configurado.");
    }

    if (bloqueios.length === 0) {
      try {
        const ss = SpreadsheetApp.openById(propriedades.DB_FIN_ID);
        const sheet = ss.getSheetByName("FIN_CARTOES_POLITICA");
        if (!sheet) {
          bloqueios.push("Aba FIN_CARTOES_POLITICA nao encontrada.");
        } else {
          const lastCol = sheet.getLastColumn();
          const headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
            return texto_(h);
          }) : [];
          const headersFaltando = validarHeadersPolitica_(headers);
          if (headersFaltando.length > 0) {
            bloqueios.push("Headers obrigatorios ausentes em FIN_CARTOES_POLITICA: " + headersFaltando.join(", "));
          }

          const linhas = linhasAba_(ss, "FIN_CARTOES_POLITICA");
          const duplicada = linhas.some(function(item) {
            return texto_(item.VERSAO) === POLITICA_FLASH_PADRAO.VERSAO &&
              texto_(item.STATUS).toUpperCase() === "ATIVO";
          });
          if (duplicada) {
            bloqueios.push("Ja existe politica ATIVO com a versao " + POLITICA_FLASH_PADRAO.VERSAO + ".");
          }

          if (bloqueios.length === 0) {
            const dataHoje = dataHojeScript_();
            const conteudoResumo = POLITICA_FLASH_PADRAO.CONTEUDO_RESUMIDO;
            const conteudoHtml = conteudoHtmlPoliticaFlash_(conteudoResumo);
            hashConteudo = hashSha256Hex_(conteudoResumo + POLITICA_FLASH_PADRAO.VERSAO + POLITICA_FLASH_PADRAO.TITULO);
            politicaId = "POL-FLASH-" + dataHoje.replace(/-/g, "") + "-01";
            status = POLITICA_FLASH_PADRAO.STATUS;
            const registro = {
              ID: uuid_(),
              POLITICA_ID: politicaId,
              TIPO_DOCUMENTO: POLITICA_FLASH_PADRAO.TIPO_DOCUMENTO,
              VERSAO: POLITICA_FLASH_PADRAO.VERSAO,
              TITULO: POLITICA_FLASH_PADRAO.TITULO,
              CONTEUDO_HTML: conteudoHtml,
              CONTEUDO_RESUMIDO: conteudoResumo,
              DATA_VIGENCIA_INICIO: dataHoje,
              DATA_VIGENCIA_FIM: "",
              ELABORADO_POR: POLITICA_FLASH_PADRAO.ELABORADO_POR,
              APROVADO_POR: POLITICA_FLASH_PADRAO.APROVADO_POR,
              DATA_APROVACAO: dataHoje,
              FILE_ID: "",
              LINK_ARQUIVO: "",
              TOKEN_VALIDACAO: "",
              HASH_CONTEUDO: hashConteudo,
              TOTAL_ACEITES: 0,
              STATUS: status,
              CRIADO_EM: agoraIso_(),
              CRIADO_POR: POLITICA_FLASH_PADRAO.CRIADO_POR
            };
            const novaLinha = headers.map(function(h) {
              return registro[h] !== undefined ? registro[h] : "";
            });
            sheet.appendRow(novaLinha);
            linha = sheet.getLastRow();
          }
        }
      } catch (e) {
        bloqueios.push("Falha ao cadastrar politica do Cartao Flash: " + e.message);
      }
    }

    const resultado = {
      success: bloqueios.length === 0,
      executado: bloqueios.length === 0,
      modo: MODO_POLITICA_FLASH,
      politicaId: politicaId,
      versao: versao,
      status: status,
      linha: linha,
      hashConteudo: hashConteudo,
      bloqueios: bloqueios,
      avisos: avisos
    };
    return resultado;
  }

  function resumoPolitica_(p) {
    if (!p) return null;
    return {
      linha: p.linha || 0,
      politicaId: texto_(p.POLITICA_ID),
      versao: texto_(p.VERSAO),
      titulo: texto_(p.TITULO),
      status: texto_(p.STATUS),
      dataVigenciaInicio: texto_(p.DATA_VIGENCIA_INICIO),
      criadoEm: texto_(p.CRIADO_EM),
      hashConteudo: texto_(p.HASH_CONTEUDO),
      totalAceites: texto_(p.TOTAL_ACEITES)
    };
  }

  function auditarPoliticaCartaoFlashV1() {
    const bloqueios = [];
    const avisos = [];
    const propriedades = lerPropriedades_();
    let politicasAtivas = [];
    let politicaVigente = null;

    if (!propriedades.DB_FIN_ID) {
      bloqueios.push("DB_FIN_ID nao configurado.");
    }

    if (bloqueios.length === 0) {
      try {
        const ss = SpreadsheetApp.openById(propriedades.DB_FIN_ID);
        const sheet = ss.getSheetByName("FIN_CARTOES_POLITICA");
        if (!sheet) {
          bloqueios.push("Aba FIN_CARTOES_POLITICA nao encontrada.");
        } else {
          const linhas = linhasAbaComNumero_(ss, "FIN_CARTOES_POLITICA");
          politicasAtivas = linhas.filter(function(item) {
            return texto_(item.STATUS).toUpperCase() === "ATIVO";
          }).sort(function(a, b) {
            return texto_(b.DATA_VIGENCIA_INICIO || b.CRIADO_EM).localeCompare(texto_(a.DATA_VIGENCIA_INICIO || a.CRIADO_EM));
          });
          politicaVigente = politicasAtivas.length ? politicasAtivas[0] : null;
          if (!politicaVigente) {
            avisos.push("Nenhuma politica ATIVO encontrada. O fallback PADRAO-FIN-4 ainda seria usado.");
          }
        }
      } catch (e) {
        bloqueios.push("Falha na auditoria da politica do Cartao Flash: " + e.message);
      }
    }

    const resumoVigente = resumoPolitica_(politicaVigente);
    const resultado = {
      success: bloqueios.length === 0,
      executado: false,
      modo: MODO_AUDITORIA_POLITICA_FLASH,
      politicasAtivas: politicasAtivas.map(resumoPolitica_),
      politicaVigenteId: resumoVigente ? resumoVigente.politicaId : "",
      versaoVigente: resumoVigente ? resumoVigente.versao : "",
      statusVigente: resumoVigente ? resumoVigente.status : "",
      linhaVigente: resumoVigente ? resumoVigente.linha : 0,
      hashConteudo: resumoVigente ? resumoVigente.hashConteudo : "",
      fallbackPadraoFin4SeraUsado: !resumoVigente,
      bloqueios: bloqueios,
      avisos: avisos
    };
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  function auditarAssinaturaFinanceiraTesteV2() {
    const bloqueios = [];
    const avisos = [];
    const checks = [];
    const propriedades = lerPropriedades_();
    let termo = null;
    let cartao = null;
    let documento = null;
    let logs = [];
    let assinaturaDrive = arquivoDriveResumo_("");
    let pdfDrive = arquivoDriveResumo_("");

    function check_(nome, ok, detalhe) {
      checks.push({
        check: nome,
        ok: !!ok,
        detalhe: String(detalhe || "")
      });
      if (!ok) bloqueios.push(nome + ": " + String(detalhe || "falhou"));
    }

    try {
      check_("DB_FIN_ID configurado", !!propriedades.DB_FIN_ID, propriedades.DB_FIN_ID || "vazio");
      check_("FOLDER_FINANCEIRO configurado", !!propriedades.FOLDER_FINANCEIRO, propriedades.FOLDER_FINANCEIRO || "vazio");
      const ss = SpreadsheetApp.openById(propriedades.DB_FIN_ID);
      const termos = linhasAba_(ss, "FIN_CARTOES_TERMOS");
      const cartoes = linhasAba_(ss, "FIN_CARTOES");
      const documentos = linhasAba_(ss, "FIN_CARTOES_DOCUMENTOS");
      const logsAba = linhasAba_(ss, "FIN_CARTOES_LOGS");

      termo = acharLinha_(termos, "TERMO_ID", TERMO_ASSINADO_TESTE.termoId);
      cartao = acharLinha_(cartoes, "CARTAO_ID", TERMO_ASSINADO_TESTE.cartaoId);
      documento = documentos.find(function(item) {
        return texto_(item.NUMERO_DOCUMENTO) === TERMO_ASSINADO_TESTE.termoId ||
          texto_(item.TOKEN_VALIDACAO) === TERMO_ASSINADO_TESTE.token ||
          texto_(item.CARTAO_ID) === TERMO_ASSINADO_TESTE.cartaoId;
      }) || null;
      logs = logsAba.filter(function(item) {
        return texto_(item.ACAO) === "TERMO_ASSINADO" &&
          (texto_(item.ENTIDADE_ID) === TERMO_ASSINADO_TESTE.termoId ||
           texto_(item.ENTIDADE_ID) === TERMO_ASSINADO_TESTE.token ||
           texto_(item.ENTIDADE_ID) === TERMO_ASSINADO_TESTE.cartaoId);
      });

      check_("Termo encontrado", !!termo, TERMO_ASSINADO_TESTE.termoId);
      if (termo) {
        check_("Token confere", texto_(termo.TOKEN_VALIDACAO) === TERMO_ASSINADO_TESTE.token, texto_(termo.TOKEN_VALIDACAO));
        check_("Status ASSINADO", texto_(termo.STATUS).toUpperCase() === "ASSINADO", texto_(termo.STATUS));
        check_("Hash confere", texto_(termo.HASH_TERMO) === TERMO_ASSINADO_TESTE.hash, texto_(termo.HASH_TERMO));
        check_("PDF_FILE_ID preenchido", !!texto_(termo.PDF_FILE_ID), texto_(termo.PDF_FILE_ID));
        check_("PDF_URL preenchido", !!texto_(termo.PDF_URL), texto_(termo.PDF_URL));
        check_("Aceite SIM", texto_(termo.ACEITE_POLITICA).toUpperCase() === "SIM", texto_(termo.ACEITE_POLITICA));
        check_("Data assinatura preenchida", !!texto_(termo.DATA_ASSINATURA), texto_(termo.DATA_ASSINATURA));
        check_("UserAgent preenchido", !!texto_(termo.USER_AGENT), texto_(termo.USER_AGENT) ? "SIM" : "NAO");
        assinaturaDrive = arquivoDriveResumo_(termo.ASSINATURA_FILE_ID);
        pdfDrive = arquivoDriveResumo_(termo.PDF_FILE_ID);
        check_("Arquivo PNG assinatura acessivel", assinaturaDrive.existe, assinaturaDrive.nome || assinaturaDrive.erro);
        check_("Arquivo PDF termo acessivel", pdfDrive.existe, pdfDrive.nome || pdfDrive.erro);
      }

      check_("Cartao encontrado", !!cartao, TERMO_ASSINADO_TESTE.cartaoId);
      if (cartao) {
        check_("Cartao TERMO_ASSINADO SIM", texto_(cartao.TERMO_ASSINADO).toUpperCase() === "SIM", texto_(cartao.TERMO_ASSINADO));
        check_("Cartao termo vinculado", texto_(cartao.TERMO_ID) === TERMO_ASSINADO_TESTE.termoId, texto_(cartao.TERMO_ID));
        check_("Cartao ativo apos assinatura", texto_(cartao.STATUS_CARTAO).toUpperCase() === "ATIVO", texto_(cartao.STATUS_CARTAO));
      }

      check_("Documento PDF registrado", !!documento, documento ? texto_(documento.DOCUMENTO_ID) : "nao encontrado");
      if (documento) {
        check_("Documento termo vinculado", texto_(documento.NUMERO_DOCUMENTO) === TERMO_ASSINADO_TESTE.termoId, texto_(documento.NUMERO_DOCUMENTO));
        check_("Documento cartao vinculado", texto_(documento.CARTAO_ID) === TERMO_ASSINADO_TESTE.cartaoId, texto_(documento.CARTAO_ID));
        check_("Documento FILE_ID preenchido", !!texto_(documento.FILE_ID), texto_(documento.FILE_ID));
        check_("Documento hash preenchido", !!texto_(documento.HASH_SHA256), texto_(documento.HASH_SHA256));
      }

      check_("Log TERMO_ASSINADO encontrado", logs.length > 0, String(logs.length));
      if (assinaturaDrive.existe && assinaturaDrive.nome.indexOf("TESTE_FIN") < 0) {
        avisos.push("Arquivo PNG da assinatura nao possui marcador TESTE_FIN no nome.");
      }
      if (pdfDrive.existe && pdfDrive.nome.indexOf("TESTE_FIN") < 0) {
        avisos.push("Arquivo PDF do termo nao possui marcador TESTE_FIN no nome.");
      }
    } catch (e) {
      bloqueios.push("Falha na auditoria somente leitura: " + e.message);
    }

    const resultado = {
      success: bloqueios.length === 0,
      modo: MODO_AUDITORIA_ASSINATURA,
      executado: false,
      termoEsperado: TERMO_ASSINADO_TESTE,
      DB_FIN_ID: propriedades.DB_FIN_ID,
      FOLDER_FINANCEIRO: propriedades.FOLDER_FINANCEIRO,
      termo: termo,
      cartao: cartao,
      documento: documento,
      logsEncontrados: logs.length,
      logs: logs,
      assinaturaDrive: assinaturaDrive,
      pdfDrive: pdfDrive,
      checks: checks,
      bloqueios: bloqueios,
      avisos: avisos,
      proximaEtapa: "Se APROVADO, decidir se o teste FIN pode ser encerrado ou se precisa criar rotina de limpeza controlada."
    };
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  function auditarUrlWebAppFinanceiroV1() {
    const propriedades = lerPropriedades_();
    const bloqueios = [];
    const avisos = [];
    let sgoCfgWebAppUrl = "";

    try {
      if (typeof SGO_CFG !== "undefined" && SGO_CFG.WEBAPP_URL) {
        sgoCfgWebAppUrl = texto_(SGO_CFG.WEBAPP_URL);
      }
    } catch (e) {
      avisos.push("Nao foi possivel ler SGO_CFG.WEBAPP_URL: " + e.message);
    }

    const sgoWebAppUrlEhExec = propriedades.SGO_WEBAPP_URL.slice(-5) === "/exec";
    const webAppUrlEhExec = propriedades.WEBAPP_URL.slice(-5) === "/exec";
    const sgoCfgWebAppUrlEhExec = !sgoCfgWebAppUrl || sgoCfgWebAppUrl.slice(-5) === "/exec";
    const algumaUrlDev =
      propriedades.SGO_WEBAPP_URL.indexOf("/dev") >= 0 ||
      propriedades.WEBAPP_URL.indexOf("/dev") >= 0 ||
      sgoCfgWebAppUrl.indexOf("/dev") >= 0;
    const urlEfetivaNovosTermos = sgoCfgWebAppUrl || propriedades.SGO_WEBAPP_URL || propriedades.WEBAPP_URL;
    const urlEfetivaEhExec = urlEfetivaNovosTermos.slice(-5) === "/exec";
    const dbFinIdPreenchido = !!propriedades.DB_FIN_ID;
    const folderFinanceiroPreenchido = !!propriedades.FOLDER_FINANCEIRO;

    if (!propriedades.SGO_WEBAPP_URL) bloqueios.push("SGO_WEBAPP_URL nao configurada.");
    if (!propriedades.WEBAPP_URL) bloqueios.push("WEBAPP_URL nao configurada.");
    if (propriedades.SGO_WEBAPP_URL && !sgoWebAppUrlEhExec) bloqueios.push("SGO_WEBAPP_URL nao termina com /exec.");
    if (propriedades.WEBAPP_URL && !webAppUrlEhExec) bloqueios.push("WEBAPP_URL nao termina com /exec.");
    if (sgoCfgWebAppUrl && !sgoCfgWebAppUrlEhExec) bloqueios.push("SGO_CFG.WEBAPP_URL nao termina com /exec e tem prioridade sobre ScriptProperties.");
    if (algumaUrlDev) bloqueios.push("Alguma URL publica FIN ainda aponta para /dev.");
    if (!dbFinIdPreenchido) bloqueios.push("DB_FIN_ID nao configurado.");
    if (!folderFinanceiroPreenchido) bloqueios.push("FOLDER_FINANCEIRO nao configurado.");
    if (!urlEfetivaEhExec) bloqueios.push("URL efetiva para novos termos nao termina com /exec.");

    const resultado = {
      success: bloqueios.length === 0,
      executado: false,
      modo: MODO_AUDITORIA_URL_WEBAPP,
      SGO_WEBAPP_URL: propriedades.SGO_WEBAPP_URL,
      WEBAPP_URL: propriedades.WEBAPP_URL,
      SGO_CFG_WEBAPP_URL: sgoCfgWebAppUrl,
      sgoWebAppUrlEhExec: sgoWebAppUrlEhExec,
      webAppUrlEhExec: webAppUrlEhExec,
      sgoCfgWebAppUrlEhExec: sgoCfgWebAppUrlEhExec,
      algumaUrlDev: algumaUrlDev,
      DB_FIN_ID: propriedades.DB_FIN_ID,
      FOLDER_FINANCEIRO: propriedades.FOLDER_FINANCEIRO,
      dbFinIdPreenchido: dbFinIdPreenchido,
      folderFinanceiroPreenchido: folderFinanceiroPreenchido,
      urlEfetivaNovosTermos: urlEfetivaNovosTermos,
      urlEfetivaEhExec: urlEfetivaEhExec,
      novosTermosApontaraoParaExec: bloqueios.length === 0,
      origemUrlNovosTermos: sgoCfgWebAppUrl ? "SGO_CFG.WEBAPP_URL" : (propriedades.SGO_WEBAPP_URL ? "SGO_WEBAPP_URL" : "WEBAPP_URL"),
      regraCodigo: "SGO_Fin_Termos.js: finObterUrlBase_ -> finMontarUrlTermo_ -> URL_VALIDACAO",
      bloqueios: bloqueios,
      avisos: avisos
    };
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  function configurarUrlWebAppFinanceiroV2_AUTORIZADO(payload) {
    const bloqueios = [];
    const avisos = [];
    const p = payload || {};
    const webAppUrl = texto_(p.webAppUrl);
    const propriedadesAntes = lerPropriedades_();

    if (p.executar !== true) {
      bloqueios.push("Payload deve conter executar true.");
    }
    if (texto_(p.confirmacao) !== TEXTO_AUTORIZACAO_URL) {
      bloqueios.push("Confirmacao invalida para configurar URL WebApp FIN.");
    }
    if (!webAppUrl) {
      bloqueios.push("webAppUrl e obrigatoria.");
    } else if (webAppUrl.indexOf("https://script.google.com/") !== 0) {
      bloqueios.push("webAppUrl deve iniciar com https://script.google.com/.");
    }

    if (bloqueios.length === 0) {
      const sp = props_();
      sp.setProperty(CHAVE_WEBAPP_SGO, webAppUrl);
      sp.setProperty(CHAVE_WEBAPP_LEGADO, webAppUrl);
    }

    const propriedadesDepois = lerPropriedades_();
    const resultado = {
      success: bloqueios.length === 0,
      executado: bloqueios.length === 0,
      modo: MODO_CONFIGURAR_URL,
      SGO_WEBAPP_URL: propriedadesDepois.SGO_WEBAPP_URL,
      WEBAPP_URL: propriedadesDepois.WEBAPP_URL,
      DB_FIN_ID_preservado: propriedadesDepois.DB_FIN_ID,
      FOLDER_FINANCEIRO_preservado: propriedadesDepois.FOLDER_FINANCEIRO,
      DB_FIN_ID_inalterado: propriedadesAntes.DB_FIN_ID === propriedadesDepois.DB_FIN_ID,
      FOLDER_FINANCEIRO_inalterado: propriedadesAntes.FOLDER_FINANCEIRO === propriedadesDepois.FOLDER_FINANCEIRO,
      bloqueios: bloqueios,
      avisos: avisos,
      proximaEtapa: "Executar validacao do termo online FIN em etapa separada"
    };
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  function atualizarUrlWebAppFinanceiroV2_AUTORIZADO(payload) {
    const bloqueios = [];
    const avisos = [];
    const p = payload || {};
    const propriedadesAntes = lerPropriedades_();
    let urlDetectada = "";

    if (p.executar !== true) {
      bloqueios.push("Payload deve conter executar true.");
    }
    if (texto_(p.confirmacao) !== TEXTO_AUTORIZACAO_URL_AUTO) {
      bloqueios.push("Confirmacao invalida para atualizar URL WebApp FIN.");
    }

    if (bloqueios.length === 0) {
      try {
        urlDetectada = texto_(ScriptApp.getService().getUrl());
      } catch (e) {
        bloqueios.push("Falha ao detectar URL do WebApp: " + e.message);
      }
    }

    if (bloqueios.length === 0) {
      if (!urlDetectada) {
        bloqueios.push("WebApp ainda nao possui URL detectavel por ScriptApp.getService().getUrl().");
        avisos.push("Use configurarUrlWebAppFinanceiroV2_AUTORIZADO com URL informada.");
      } else if (urlDetectada.indexOf("https://script.google.com/") !== 0) {
        bloqueios.push("URL detectada deve iniciar com https://script.google.com/.");
      }
    }

    if (bloqueios.length === 0) {
      const sp = props_();
      sp.setProperty(CHAVE_WEBAPP_SGO, urlDetectada);
      sp.setProperty(CHAVE_WEBAPP_LEGADO, urlDetectada);
    }

    const propriedadesDepois = lerPropriedades_();
    const resultado = {
      success: bloqueios.length === 0,
      executado: bloqueios.length === 0,
      modo: MODO_ATUALIZAR_URL,
      urlDetectada: urlDetectada,
      SGO_WEBAPP_URL: propriedadesDepois.SGO_WEBAPP_URL,
      WEBAPP_URL: propriedadesDepois.WEBAPP_URL,
      DB_FIN_ID_preservado: propriedadesDepois.DB_FIN_ID,
      FOLDER_FINANCEIRO_preservado: propriedadesDepois.FOLDER_FINANCEIRO,
      DB_FIN_ID_inalterado: propriedadesAntes.DB_FIN_ID === propriedadesDepois.DB_FIN_ID,
      FOLDER_FINANCEIRO_inalterado: propriedadesAntes.FOLDER_FINANCEIRO === propriedadesDepois.FOLDER_FINANCEIRO,
      bloqueios: bloqueios,
      avisos: avisos,
      proximaEtapa: bloqueios.length === 0
        ? "Executar validacao do termo online FIN em etapa separada"
        : "Usar configurarUrlWebAppFinanceiroV2_AUTORIZADO com URL informada"
    };
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  function validarSessaoOperadorFinTeste_(sessionId, bloqueios) {
    const sid = texto_(sessionId);
    if (!sid) {
      bloqueios.push("sessionId valido e obrigatorio para criar dados de teste sem burlar seguranca.");
      return null;
    }
    if (typeof validarSessao !== "function") {
      bloqueios.push("validarSessao indisponivel no escopo do Apps Script.");
      return null;
    }
    const validacao = validarSessao(sid);
    if (!validacao || validacao.valid !== true || !validacao.data) {
      bloqueios.push("sessionId invalido ou expirado.");
      return null;
    }
    const perfil = texto_(validacao.data.perfil).toUpperCase();
    const permitidos = ["ADMIN", "DIRETORIA", "GESTOR", "FINANCEIRO"];
    if (permitidos.indexOf(perfil) < 0) {
      bloqueios.push("Perfil sem permissao para teste FIN: " + perfil + ".");
      return null;
    }
    return sid;
  }

  function criarTermoFinanceiroTesteV2_AUTORIZADO(payload) {
    const bloqueios = [];
    const avisos = [];
    const p = payload || {};
    const abasGravadasEsperadas = ["FIN_CARTOES", "FIN_CARTOES_TERMOS", "FIN_CARTOES_LOGS"];
    let cartaoId = "";
    let termoId = "";
    let token = "";
    let urlValidacao = "";

    if (p.executar !== true) {
      bloqueios.push("Payload deve conter executar true.");
    }
    if (texto_(p.confirmacao) !== TEXTO_AUTORIZACAO_TERMO_TESTE) {
      bloqueios.push("Confirmacao invalida para criar termo financeiro de teste.");
    }

    const sessionId = bloqueios.length === 0
      ? validarSessaoOperadorFinTeste_(p.sessionId, bloqueios)
      : null;

    if (bloqueios.length === 0) {
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, "");
      const payloadTeste = {
        FUNCIONARIO_ID: "TESTE_FIN_FUNC_001",
        FUNCIONARIO_NOME: "TESTE FINANCEIRO CARTAO FLASH",
        NUMERO_FINAL_4: "9999",
        APELIDO_CARTAO: "TESTE_FIN_CARTAO_FLASH",
        IDENTIFICADOR_CARTAO: "TESTE_FIN_" + timestamp,
        BANDEIRA: "FLASH",
        CENTRO_CUSTO: "TESTE_FIN",
        FINALIDADE: "TESTE_FIN_VALIDACAO_TERMO_ONLINE_DEV",
        OBSERVACOES: "REGISTRO DE TESTE CONTROLADO FIN.5.16 - NAO USAR COMO DADO REAL"
      };

      const cartaoResp = finCriarCartao(sessionId, payloadTeste);
      if (!cartaoResp || (cartaoResp.ok !== true && cartaoResp.success !== true)) {
        bloqueios.push("Falha ao criar cartao de teste: " + texto_(cartaoResp && cartaoResp.message));
      } else {
        cartaoId = texto_(cartaoResp.cartaoId || (cartaoResp.item && cartaoResp.item.CARTAO_ID));
      }

      if (bloqueios.length === 0 && !cartaoId) {
        bloqueios.push("Cartao de teste criado sem cartaoId retornado.");
      }

      if (bloqueios.length === 0) {
        const termoResp = finGerarTermoCartao(sessionId, cartaoId);
        if (!termoResp || (termoResp.ok !== true && termoResp.success !== true)) {
          bloqueios.push("Falha ao gerar termo de teste: " + texto_(termoResp && termoResp.message));
        } else {
          termoId = texto_(termoResp.termoId);
          token = texto_(termoResp.token);
          urlValidacao = texto_(termoResp.urlPublica);
          if (termoResp.avisos && termoResp.avisos.length) {
            avisos.push.apply(avisos, termoResp.avisos);
          }
        }
      }
    }

    const resultado = {
      success: bloqueios.length === 0,
      executado: bloqueios.length === 0,
      modo: MODO_TERMO_TESTE,
      cartaoId: cartaoId,
      termoId: termoId,
      token: token,
      urlValidacao: urlValidacao,
      abasGravadasEsperadas: abasGravadasEsperadas,
      marcadorTeste: "TESTE_FIN",
      bloqueios: bloqueios,
      avisos: avisos,
      proximaEtapa: "Abrir urlValidacao em /dev e validar carregamento publico sem assinatura"
    };
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  function sanitizarResultadoWebFin_(valor) {
    if (Array.isArray(valor)) {
      return valor.map(function(item) {
        return sanitizarResultadoWebFin_(item);
      });
    }
    if (valor && typeof valor === "object") {
      const limpo = {};
      Object.keys(valor).forEach(function(chave) {
        if (String(chave).toLowerCase() === "sessionid") return;
        limpo[chave] = sanitizarResultadoWebFin_(valor[chave]);
      });
      return limpo;
    }
    return valor;
  }

  function criarTermoFinanceiroTesteV2_WEB_AUTORIZADO(payload) {
    const p = payload || {};
    const resultado = criarTermoFinanceiroTesteV2_AUTORIZADO({
      executar: p.executar,
      confirmacao: p.confirmacao,
      sessionId: p.sessionId
    });
    const sanitizado = sanitizarResultadoWebFin_(resultado);
    Logger.log(JSON.stringify(sanitizado, null, 2));
    return sanitizado;
  }

  return {
    diagnosticarAmbienteFinanceiroV2: diagnosticarAmbienteFinanceiroV2,
    provisionarAmbienteFinanceiroV2_AUTORIZADO: provisionarAmbienteFinanceiroV2_AUTORIZADO,
    provisionarAmbienteFinanceiroProducaoLimpaB34_AUTORIZADO: provisionarAmbienteFinanceiroProducaoLimpaB34_AUTORIZADO,
    auditarSetupFinanceiroV2: auditarSetupFinanceiroV2,
    auditarAssinaturaFinanceiraTesteV2: auditarAssinaturaFinanceiraTesteV2,
    auditarPoliticaCartaoFlashV1: auditarPoliticaCartaoFlashV1,
    auditarUrlWebAppFinanceiroV1: auditarUrlWebAppFinanceiroV1,
    cadastrarPoliticaCartaoFlashV1_AUTORIZADO: cadastrarPoliticaCartaoFlashV1_AUTORIZADO,
    configurarUrlWebAppFinanceiroV2_AUTORIZADO: configurarUrlWebAppFinanceiroV2_AUTORIZADO,
    atualizarUrlWebAppFinanceiroV2_AUTORIZADO: atualizarUrlWebAppFinanceiroV2_AUTORIZADO,
    criarTermoFinanceiroTesteV2_AUTORIZADO: criarTermoFinanceiroTesteV2_AUTORIZADO,
    criarTermoFinanceiroTesteV2_WEB_AUTORIZADO: criarTermoFinanceiroTesteV2_WEB_AUTORIZADO
  };
})();

function diagnosticarAmbienteFinanceiroV2() {
  return SGO_FIN_PROVISIONAMENTO.diagnosticarAmbienteFinanceiroV2();
}

function provisionarAmbienteFinanceiroV2_AUTORIZADO(payload) {
  return SGO_FIN_PROVISIONAMENTO.provisionarAmbienteFinanceiroV2_AUTORIZADO(payload);
}

function provisionarAmbienteFinanceiroV2_MANUAL_AUTORIZADO() {
  var resultado = provisionarAmbienteFinanceiroV2_AUTORIZADO({
    executar: true,
    confirmacao: "CRIAR_AMBIENTE_FINANCEIRO_SGO_2026",
    webAppUrl: ""
  });
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function PROVISIONAR_AMBIENTE_FINANCEIRO_PRODUCAO_LIMPA_B34_AUTORIZADO() {
  var resultado = SGO_FIN_PROVISIONAMENTO.provisionarAmbienteFinanceiroProducaoLimpaB34_AUTORIZADO({
    executar: true,
    confirmacao: "CRIAR_AMBIENTE_FINANCEIRO_SGO_2026"
  });
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function SETUP_FINANCEIRO_PRODUCAO_LIMPA_B34_LOG_AUTORIZADO() {
  var props = PropertiesService.getScriptProperties();
  var dbFinId = props.getProperty("DB_FIN_ID");
  var dbFinUrl = props.getProperty("DB_FIN_URL");
  var folderFinanceiro = props.getProperty("FOLDER_FINANCEIRO");
  var dbFinIdProdEsperado = "1A3rjluetfMYfSwwpcGbbnfpkPdgR7R9iiwDVWvyp4Zw";
  var dbFinIdDevBloqueado = "1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0";
  var bloqueios = [];

  if (!dbFinId) {
    bloqueios.push("DB_FIN_ID_AUSENTE");
  }
  if (dbFinId === dbFinIdDevBloqueado) {
    bloqueios.push("DB_FIN_ID_DEV_DETECTADO_PRODUCAO_BLOQUEADA");
  }
  if (dbFinId !== dbFinIdProdEsperado) {
    bloqueios.push("DB_FIN_ID_DIFERENTE_DO_PROD_ESPERADO");
  }
  if (!folderFinanceiro) {
    bloqueios.push("FOLDER_FINANCEIRO_AUSENTE");
  }

  if (bloqueios.length > 0) {
    var bloqueado = {
      success: false,
      ok: false,
      executado: false,
      modo: "SETUP_FINANCEIRO_PRODUCAO_LIMPA_B34",
      DB_FIN_ID: dbFinId,
      DB_FIN_URL: dbFinUrl,
      FOLDER_FINANCEIRO: folderFinanceiro,
      DB_FIN_ID_PROD_ESPERADO: dbFinIdProdEsperado,
      DB_FIN_ID_DEV_BLOQUEADO: dbFinIdDevBloqueado,
      bloqueios: bloqueios
    };
    Logger.log(JSON.stringify(bloqueado, null, 2));
    return bloqueado;
  }

  try {
    var resultadoSetup = setupFinanceiroV2();
    var resultado = {
      success: true,
      ok: true,
      executado: true,
      modo: "SETUP_FINANCEIRO_PRODUCAO_LIMPA_B34",
      DB_FIN_ID: dbFinId,
      DB_FIN_URL: dbFinUrl,
      FOLDER_FINANCEIRO: folderFinanceiro,
      DB_FIN_ID_PROD_ESPERADO: dbFinIdProdEsperado,
      DB_FIN_ID_DEV_BLOQUEADO: dbFinIdDevBloqueado,
      dbFinIdDiferenteDev: dbFinId !== dbFinIdDevBloqueado,
      resultadoSetup: resultadoSetup,
      bloqueios: []
    };
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  } catch (e) {
    var falha = {
      success: false,
      ok: false,
      executado: true,
      modo: "SETUP_FINANCEIRO_PRODUCAO_LIMPA_B34",
      DB_FIN_ID: dbFinId,
      DB_FIN_URL: dbFinUrl,
      FOLDER_FINANCEIRO: folderFinanceiro,
      DB_FIN_ID_PROD_ESPERADO: dbFinIdProdEsperado,
      DB_FIN_ID_DEV_BLOQUEADO: dbFinIdDevBloqueado,
      dbFinIdDiferenteDev: dbFinId !== dbFinIdDevBloqueado,
      erro: e && e.message ? e.message : String(e),
      bloqueios: ["SETUP_FINANCEIRO_V2_FALHOU"]
    };
    Logger.log(JSON.stringify(falha, null, 2));
    return falha;
  }
}

function AUDITAR_FIN_PRODUCAO_LIMPA_B35_SEM_GRAVAR() {
  var dbFinIdProdEsperado = "1A3rjluetfMYfSwwpcGbbnfpkPdgR7R9iiwDVWvyp4Zw";
  var dbFinIdDevBloqueado = "1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0";
  var props = PropertiesService.getScriptProperties();
  var dbFinId = props.getProperty("DB_FIN_ID");
  var dbFinUrl = props.getProperty("DB_FIN_URL");
  var folderFinanceiro = props.getProperty("FOLDER_FINANCEIRO");
  var bloqueios = [];
  var avisos = [];
  var abas = [];
  var resumo = {
    abasEsperadas: 13,
    abasEncontradas: 0,
    headersEsperados: 330,
    headersEncontrados: 0,
    totalLinhasDados: 0,
    baseSemDadosOperacionais: true
  };
  var planilha = {
    nome: "",
    id: dbFinId || "",
    url: dbFinUrl || ""
  };

  function montarResultado_() {
    return {
      success: bloqueios.length === 0,
      ok: bloqueios.length === 0,
      executado: false,
      modo: "AUDITORIA_FIN_PRODUCAO_LIMPA_B35_SEM_GRAVAR",
      somenteLeitura: true,
      DB_FIN_ID: dbFinId,
      DB_FIN_URL: dbFinUrl,
      FOLDER_FINANCEIRO: folderFinanceiro,
      DB_FIN_ID_PROD_ESPERADO: dbFinIdProdEsperado,
      DB_FIN_ID_DEV_BLOQUEADO: dbFinIdDevBloqueado,
      dbFinIdDiferenteDev: dbFinId !== dbFinIdDevBloqueado,
      planilha: planilha,
      resumo: resumo,
      abas: abas,
      bloqueios: bloqueios,
      avisos: avisos
    };
  }

  if (!dbFinId) {
    bloqueios.push("DB_FIN_ID_AUSENTE");
  }
  if (dbFinId === dbFinIdDevBloqueado) {
    bloqueios.push("DB_FIN_ID_DEV_DETECTADO_PRODUCAO_BLOQUEADA");
  }
  if (dbFinId !== dbFinIdProdEsperado) {
    bloqueios.push("DB_FIN_ID_DIFERENTE_DO_PROD_ESPERADO");
  }
  if (!folderFinanceiro) {
    bloqueios.push("FOLDER_FINANCEIRO_AUSENTE");
  }

  if (bloqueios.length === 0) {
    try {
      var ss = SpreadsheetApp.openById(dbFinId);
      planilha = {
        nome: ss.getName(),
        id: ss.getId(),
        url: ss.getUrl()
      };
      if (planilha.id !== dbFinIdProdEsperado) {
        bloqueios.push("PLANILHA_ABERTA_DIFERENTE_DO_PROD_ESPERADO");
      }
      if (dbFinUrl && planilha.url !== dbFinUrl) {
        avisos.push("DB_FIN_URL_DIVERGE_DA_URL_ABERTA");
      }

      var schema = obterSchemaFinanceiroV2();
      var abasSchema = schema && schema.abas ? schema.abas : [];
      var abasOperacionais = {
        FIN_CARTOES: true,
        FIN_CARTOES_TERMOS: true,
        FIN_CARTOES_RECARGAS: true,
        FIN_CARTOES_LANCAMENTOS: true,
        FIN_CARTOES_ANEXOS: true,
        FIN_CARTOES_EXTRATOS: true,
        FIN_LOTES_EXTRATO_FLASH: true,
        FIN_CARTOES_CONCILIACAO: true,
        FIN_CARTOES_PENDENCIAS: true,
        FIN_CARTOES_DOCUMENTOS: true
      };
      var abasComDadosPermitidos = {
        FIN_CARTOES_POLITICA: true,
        FIN_CARTOES_LOGS: true,
        FIN_CARTOES_CONFIG: true
      };

      resumo.abasEsperadas = abasSchema.length;
      resumo.headersEsperados = schema && schema.totalHeaders ? schema.totalHeaders : 0;

      abasSchema.forEach(function(def) {
        var nomeAba = def.nomeAba;
        var headersEsperadosLista = def.headers || [];
        var sheet = ss.getSheetByName(nomeAba);
        var existe = !!sheet;
        var ultimaLinha = existe ? sheet.getLastRow() : 0;
        var ultimaColuna = existe ? sheet.getLastColumn() : 0;
        var headersEncontradosLista = [];
        if (existe) {
          resumo.abasEncontradas++;
          if (ultimaColuna > 0) {
            headersEncontradosLista = sheet.getRange(1, 1, 1, ultimaColuna).getValues()[0].map(function(h) {
              return String(h == null ? "" : h).trim();
            });
          }
        }

        var mapaEncontrados = {};
        headersEncontradosLista.forEach(function(h) {
          if (h) mapaEncontrados[h] = true;
        });
        var mapaEsperados = {};
        headersEsperadosLista.forEach(function(h) {
          mapaEsperados[h] = true;
        });

        var headersFaltantes = headersEsperadosLista.filter(function(h) {
          return !mapaEncontrados[h];
        });
        var headersExtras = headersEncontradosLista.filter(function(h) {
          return h && !mapaEsperados[h];
        });
        var linhasDados = Math.max(ultimaLinha - 1, 0);
        resumo.headersEncontrados += headersEncontradosLista.filter(function(h) { return !!h; }).length;
        resumo.totalLinhasDados += linhasDados;

        if (!existe) {
          bloqueios.push("ABA_AUSENTE_" + nomeAba);
        }
        if (headersFaltantes.length > 0) {
          bloqueios.push("HEADERS_FALTANTES_" + nomeAba);
        }
        if (headersExtras.length > 0) {
          avisos.push("HEADERS_EXTRAS_" + nomeAba);
        }
        if (linhasDados > 0 && abasOperacionais[nomeAba]) {
          resumo.baseSemDadosOperacionais = false;
          bloqueios.push("DADOS_OPERACIONAIS_ENCONTRADOS_" + nomeAba);
        } else if (linhasDados > 0 && abasComDadosPermitidos[nomeAba]) {
          avisos.push("DADOS_NAO_OPERACIONAIS_ENCONTRADOS_" + nomeAba + "_" + linhasDados + "_LINHAS");
        }

        abas.push({
          nomeAba: nomeAba,
          existe: existe,
          ultimaLinha: ultimaLinha,
          ultimaColuna: ultimaColuna,
          headersEncontrados: headersEncontradosLista,
          headersEsperados: headersEsperadosLista,
          totalHeadersEncontrados: headersEncontradosLista.filter(function(h) { return !!h; }).length,
          totalHeadersEsperados: headersEsperadosLista.length,
          headersFaltantes: headersFaltantes,
          headersExtras: headersExtras,
          linhasDados: linhasDados,
          ok: existe && headersFaltantes.length === 0
        });
      });

      if (resumo.abasEncontradas !== resumo.abasEsperadas) {
        bloqueios.push("TOTAL_ABAS_DIVERGENTE");
      }
      if (resumo.headersEsperados !== 330) {
        bloqueios.push("TOTAL_HEADERS_ESPERADOS_DIFERENTE_DE_330");
      }
      if (resumo.headersEncontrados !== resumo.headersEsperados) {
        bloqueios.push("TOTAL_HEADERS_ENCONTRADOS_DIVERGENTE");
      }
    } catch (e) {
      bloqueios.push("FALHA_AUDITORIA_FIN_PRODUCAO_LIMPA_B35: " + (e && e.message ? e.message : String(e)));
    }
  }

  var resultado = montarResultado_();
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_FIN_PRODUCAO_LIMPA_B35_RESUMO_SEM_GRAVAR() {
  var dbFinIdProdEsperado = "1A3rjluetfMYfSwwpcGbbnfpkPdgR7R9iiwDVWvyp4Zw";
  var dbFinIdDevBloqueado = "1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0";
  var props = PropertiesService.getScriptProperties();
  var dbFinId = props.getProperty("DB_FIN_ID");
  var dbFinUrl = props.getProperty("DB_FIN_URL");
  var folderFinanceiro = props.getProperty("FOLDER_FINANCEIRO");
  var bloqueios = [];
  var avisos = [];
  var abasResumo = [];
  var resumo = {
    abasEsperadas: 13,
    abasEncontradas: 0,
    headersEsperados: 330,
    headersEncontrados: 0,
    totalLinhasDados: 0,
    baseSemDadosOperacionais: true
  };
  var planilha = {
    nome: "",
    id: dbFinId || "",
    url: dbFinUrl || ""
  };

  function resultadoCompacto_() {
    return {
      success: bloqueios.length === 0,
      ok: bloqueios.length === 0,
      executado: false,
      somenteLeitura: true,
      modo: "AUDITORIA_FIN_PRODUCAO_LIMPA_B35_RESUMO_SEM_GRAVAR",
      DB_FIN_ID: dbFinId,
      DB_FIN_URL: dbFinUrl,
      FOLDER_FINANCEIRO: folderFinanceiro,
      DB_FIN_ID_PROD_ESPERADO: dbFinIdProdEsperado,
      DB_FIN_ID_DEV_BLOQUEADO: dbFinIdDevBloqueado,
      dbFinIdDiferenteDev: dbFinId !== dbFinIdDevBloqueado,
      planilha: planilha,
      resumo: resumo,
      abasResumo: abasResumo,
      bloqueios: bloqueios,
      avisos: avisos
    };
  }

  if (!dbFinId) {
    bloqueios.push("DB_FIN_ID_AUSENTE");
  }
  if (dbFinId === dbFinIdDevBloqueado) {
    bloqueios.push("DB_FIN_ID_DEV_DETECTADO_PRODUCAO_BLOQUEADA");
  }
  if (dbFinId !== dbFinIdProdEsperado) {
    bloqueios.push("DB_FIN_ID_DIFERENTE_DO_PROD_ESPERADO");
  }
  if (!folderFinanceiro) {
    bloqueios.push("FOLDER_FINANCEIRO_AUSENTE");
  }

  if (bloqueios.length === 0) {
    try {
      var ss = SpreadsheetApp.openById(dbFinId);
      planilha = {
        nome: ss.getName(),
        id: ss.getId(),
        url: ss.getUrl()
      };
      if (planilha.id !== dbFinIdProdEsperado) {
        bloqueios.push("PLANILHA_ABERTA_DIFERENTE_DO_PROD_ESPERADO");
      }
      if (dbFinUrl && planilha.url !== dbFinUrl) {
        avisos.push("DB_FIN_URL_DIVERGE_DA_URL_ABERTA");
      }

      var schema = obterSchemaFinanceiroV2();
      var abasSchema = schema && schema.abas ? schema.abas : [];
      var abasOperacionais = {
        FIN_CARTOES: true,
        FIN_CARTOES_TERMOS: true,
        FIN_CARTOES_RECARGAS: true,
        FIN_CARTOES_LANCAMENTOS: true,
        FIN_CARTOES_ANEXOS: true,
        FIN_CARTOES_EXTRATOS: true,
        FIN_LOTES_EXTRATO_FLASH: true,
        FIN_CARTOES_CONCILIACAO: true,
        FIN_CARTOES_PENDENCIAS: true,
        FIN_CARTOES_DOCUMENTOS: true
      };
      var abasComDadosPermitidos = {
        FIN_CARTOES_POLITICA: true,
        FIN_CARTOES_LOGS: true,
        FIN_CARTOES_CONFIG: true
      };

      resumo.abasEsperadas = abasSchema.length;
      resumo.headersEsperados = schema && schema.totalHeaders ? schema.totalHeaders : 0;

      abasSchema.forEach(function(def) {
        var nomeAba = def.nomeAba;
        var headersEsperadosLista = def.headers || [];
        var sheet = ss.getSheetByName(nomeAba);
        var existe = !!sheet;
        var ultimaLinha = existe ? sheet.getLastRow() : 0;
        var ultimaColuna = existe ? sheet.getLastColumn() : 0;
        var headersEncontradosLista = [];
        if (existe) {
          resumo.abasEncontradas++;
          if (ultimaColuna > 0) {
            headersEncontradosLista = sheet.getRange(1, 1, 1, ultimaColuna).getValues()[0].map(function(h) {
              return String(h == null ? "" : h).trim();
            });
          }
        }

        var mapaEncontrados = {};
        headersEncontradosLista.forEach(function(h) {
          if (h) mapaEncontrados[h] = true;
        });
        var mapaEsperados = {};
        headersEsperadosLista.forEach(function(h) {
          mapaEsperados[h] = true;
        });
        var headersFaltantes = headersEsperadosLista.filter(function(h) {
          return !mapaEncontrados[h];
        });
        var headersExtras = headersEncontradosLista.filter(function(h) {
          return h && !mapaEsperados[h];
        });
        var totalHeadersEncontrados = headersEncontradosLista.filter(function(h) { return !!h; }).length;
        var linhasDados = Math.max(ultimaLinha - 1, 0);
        var item = {
          nomeAba: nomeAba,
          existe: existe,
          ultimaLinha: ultimaLinha,
          ultimaColuna: ultimaColuna,
          totalHeadersEncontrados: totalHeadersEncontrados,
          totalHeadersEsperados: headersEsperadosLista.length,
          totalHeadersFaltantes: headersFaltantes.length,
          totalHeadersExtras: headersExtras.length,
          linhasDados: linhasDados,
          ok: existe && headersFaltantes.length === 0
        };

        resumo.headersEncontrados += totalHeadersEncontrados;
        resumo.totalLinhasDados += linhasDados;

        if (!existe) {
          bloqueios.push("ABA_AUSENTE_" + nomeAba);
        }
        if (headersFaltantes.length > 0) {
          bloqueios.push("HEADERS_FALTANTES_" + nomeAba);
          item.headersFaltantes = headersFaltantes.slice(0, 20);
        }
        if (headersExtras.length > 0) {
          avisos.push("HEADERS_EXTRAS_" + nomeAba);
          item.headersExtras = headersExtras.slice(0, 20);
        }
        if (linhasDados > 0 && abasOperacionais[nomeAba]) {
          resumo.baseSemDadosOperacionais = false;
          bloqueios.push("DADOS_OPERACIONAIS_ENCONTRADOS_" + nomeAba);
        } else if (linhasDados > 0 && abasComDadosPermitidos[nomeAba]) {
          avisos.push("DADOS_NAO_OPERACIONAIS_ENCONTRADOS_" + nomeAba + "_" + linhasDados + "_LINHAS");
        }

        abasResumo.push(item);
      });

      if (resumo.abasEncontradas !== resumo.abasEsperadas) {
        bloqueios.push("TOTAL_ABAS_DIVERGENTE");
      }
      if (resumo.headersEsperados !== 330) {
        bloqueios.push("TOTAL_HEADERS_ESPERADOS_DIFERENTE_DE_330");
      }
      if (resumo.headersEncontrados !== resumo.headersEsperados) {
        bloqueios.push("TOTAL_HEADERS_ENCONTRADOS_DIVERGENTE");
      }
    } catch (e) {
      bloqueios.push("FALHA_AUDITORIA_FIN_PRODUCAO_LIMPA_B35_RESUMO: " + (e && e.message ? e.message : String(e)));
    }
  }

  var resultado = resultadoCompacto_();
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

const SGO_FIN_FLASH_PROD_B3 = (() => {
  var DB_FIN_ID_PROD_ESPERADO = "1A3rjluetfMYfSwwpcGbbnfpkPdgR7R9iiwDVWvyp4Zw";
  var DB_FIN_ID_DEV_BLOQUEADO = "1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0";
  var ABA_TMP_FLASH = "TMP_IMPORT_EXTRATO_FLASH";
  var ABA_LOTES = "FIN_LOTES_EXTRATO_FLASH";
  var ABA_EXTRATOS = "FIN_CARTOES_EXTRATOS";
  var ABA_LANCAMENTOS = "FIN_CARTOES_LANCAMENTOS";
  var ABA_CONCILIACAO = "FIN_CARTOES_CONCILIACAO";
  var ABA_PENDENCIAS = "FIN_CARTOES_PENDENCIAS";
  var PROP_FONTE_TIPO = "FIN_FLASH_FONTE_TIPO";
  var PROP_XLSX_FILE_ID = "FIN_FLASH_XLSX_FILE_ID";
  var PROP_XLSX_NOME_ESPERADO = "FIN_FLASH_XLSX_NOME_ESPERADO";
  var PROP_IMPORTACAO_MODO = "FIN_FLASH_IMPORTACAO_MODO";
  var PROP_ABA_TMP = "FIN_FLASH_ABA_TMP";
  var PROP_PROD_DB_CONFIRMADO = "FIN_FLASH_PROD_DB_CONFIRMADO";
  var PROP_SOURCE_SPREADSHEET_ID = "FIN_FLASH_SOURCE_SPREADSHEET_ID";
  var PROP_SOURCE_SHEET_NAME = "FIN_FLASH_SOURCE_SHEET_NAME";

  function txt_(v) {
    return String(v === null || v === undefined ? "" : v).trim();
  }

  function num_(v) {
    if (typeof v === "number") return v;
    var s = txt_(v)
      .replace(/R\$/gi, "")
      .replace(/\s/g, "")
      .replace(/[^\d,.-]/g, "");
    if (s.indexOf(",") >= 0) {
      s = s.replace(/\./g, "").replace(",", ".");
    }
    var n = Number(s);
    return isNaN(n) ? 0 : n;
  }

  function props_() {
    var p = PropertiesService.getScriptProperties();
    return {
      DB_FIN_ID: txt_(p.getProperty("DB_FIN_ID")),
      DB_FIN_URL: txt_(p.getProperty("DB_FIN_URL")),
      FOLDER_FINANCEIRO: txt_(p.getProperty("FOLDER_FINANCEIRO"))
    };
  }

  function validarProd_(modo, somenteLeitura) {
    var pr = props_();
    var bloqueios = [];
    var avisos = [];
    if (!pr.DB_FIN_ID) bloqueios.push("DB_FIN_ID_AUSENTE");
    if (pr.DB_FIN_ID === DB_FIN_ID_DEV_BLOQUEADO) bloqueios.push("DB_FIN_ID_DEV_DETECTADO_PRODUCAO_BLOQUEADA");
    if (pr.DB_FIN_ID !== DB_FIN_ID_PROD_ESPERADO) bloqueios.push("DB_FIN_ID_DIFERENTE_DO_PROD_ESPERADO");
    if (!pr.FOLDER_FINANCEIRO) bloqueios.push("FOLDER_FINANCEIRO_AUSENTE");
    return {
      success: false,
      ok: false,
      executado: false,
      somenteLeitura: !!somenteLeitura,
      modo: modo,
      DB_FIN_ID: pr.DB_FIN_ID,
      DB_FIN_URL: pr.DB_FIN_URL,
      FOLDER_FINANCEIRO: pr.FOLDER_FINANCEIRO,
      DB_FIN_ID_PROD_ESPERADO: DB_FIN_ID_PROD_ESPERADO,
      DB_FIN_ID_DEV_BLOQUEADO: DB_FIN_ID_DEV_BLOQUEADO,
      dbFinIdDiferenteDev: pr.DB_FIN_ID !== DB_FIN_ID_DEV_BLOQUEADO,
      bloqueios: bloqueios,
      avisos: avisos,
      proximaEtapa: ""
    };
  }

  function abrirPlanilha_(base) {
    if (base.bloqueios.length) return null;
    try {
      var ss = SpreadsheetApp.openById(base.DB_FIN_ID);
      base.planilha = {
        nome: ss.getName(),
        id: ss.getId(),
        url: ss.getUrl()
      };
      if (base.planilha.id !== DB_FIN_ID_PROD_ESPERADO) {
        base.bloqueios.push("PLANILHA_ABERTA_DIFERENTE_DO_PROD_ESPERADO");
        return null;
      }
      return ss;
    } catch (e) {
      base.bloqueios.push("FALHA_ABRIR_DB_FIN_PROD: " + (e && e.message ? e.message : String(e)));
      return null;
    }
  }

  function headers_(sheet) {
    if (!sheet || sheet.getLastColumn() < 1) return [];
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
      return txt_(h);
    });
  }

  function objetos_(sheet) {
    if (!sheet) return { headers: [], items: [] };
    var hs = headers_(sheet);
    if (sheet.getLastRow() < 2 || hs.length < 1) return { headers: hs, items: [] };
    var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    var items = vals.map(function(linha) {
      var o = {};
      hs.forEach(function(h, i) {
        if (h) o[h] = linha[i];
      });
      return o;
    });
    return { headers: hs, items: items };
  }

  function contarAba_(ss, nome) {
    var sh = ss ? ss.getSheetByName(nome) : null;
    return {
      nomeAba: nome,
      existe: !!sh,
      linhasDados: sh ? Math.max(0, sh.getLastRow() - 1) : 0,
      ultimaLinha: sh ? sh.getLastRow() : 0,
      ultimaColuna: sh ? sh.getLastColumn() : 0
    };
  }

  function localizar_(headers, nomes) {
    for (var i = 0; i < nomes.length; i++) {
      var alvo = normalizarHeaderFlash_(nomes[i]);
      for (var j = 0; j < headers.length; j++) {
        var atual = normalizarHeaderFlash_(headers[j]);
        if (!atual || !alvo) continue;
        if (atual === alvo || atual.indexOf(alvo) >= 0 || alvo.indexOf(atual) >= 0) return j;
      }
    }
    return -1;
  }

  function normalizarHeaderFlash_(v) {
    return txt_(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function aliasesFonteFlash_() {
    return {
      DATA: ["DATA", "DATA DA TRANSACAO", "DATA_TRANSACAO", "DATA TRANSACAO", "DATA/HORA", "DATA E HORA"],
      DESCRICAO: ["DESCRICAO", "DESCRICAO DA TRANSACAO", "ESTABELECIMENTO", "HISTORICO", "MOVIMENTACAO", "MERCHANT"],
      VALOR: ["VALOR", "VALOR R$", "VALOR_TRANSACAO", "VALOR DA TRANSACAO", "AMOUNT"],
      TIPO: ["TIPO", "TIPO TRANSACAO", "TIPO DA TRANSACAO", "CATEGORIA", "OPERACAO", "PAGAMENTO", "PRESTACAO DE CONTAS"],
      PESSOA: ["PESSOA", "PORTADOR", "USUARIO", "FUNCIONARIO", "NOME"],
      CARTAO_FINAL: ["CARTAO_FINAL", "CARTAO FINAL", "FINAL CARTAO", "FINAL DO CARTAO", "ULTIMOS 4", "PAGAMENTO", "CARTAO"]
    };
  }

  function ultimosDigitosCartao_(v) {
    var digitos = txt_(v).replace(/\D/g, "");
    if (digitos.length <= 4) return digitos;
    return digitos.slice(digitos.length - 4);
  }

  function cartaoFlash_(v) {
    var digitos = txt_(v).replace(/\D/g, "");
    var finalCartao = digitos.length > 4 ? digitos.slice(digitos.length - 4) : digitos;
    return {
      finalCartao: finalCartao,
      valido: finalCartao.length >= 3 && finalCartao.length <= 4,
      com3Digitos: finalCartao.length === 3
    };
  }

  function pad2_(n) {
    return String(n < 10 ? "0" + n : n);
  }

  function formatarDataFlash_(d) {
    return Utilities.formatDate(d, "America/Sao_Paulo", "yyyy-MM-dd HH:mm:ss");
  }

  function dataUtcFlash_(ano, mes, dia, hora, minuto, segundo) {
    return new Date(Date.UTC(ano, mes - 1, dia, hora || 0, minuto || 0, segundo || 0));
  }

  function periodoEsperadoFlash_(nome) {
    var m = /(\d{4})-(\d{2})-(\d{2})-ate-(\d{4})-(\d{2})-(\d{2})/i.exec(txt_(nome));
    if (!m) return { encontrado: false, inicio: "", fim: "", inicioTs: null, fimTs: null };
    var ini = dataUtcFlash_(Number(m[1]), Number(m[2]), Number(m[3]), 0, 0, 0);
    var fim = dataUtcFlash_(Number(m[4]), Number(m[5]), Number(m[6]), 23, 59, 59);
    return {
      encontrado: true,
      inicio: m[1] + "-" + m[2] + "-" + m[3],
      fim: m[4] + "-" + m[5] + "-" + m[6],
      inicioTs: ini.getTime(),
      fimTs: fim.getTime()
    };
  }

  function dataDentroPeriodo_(ts, periodo) {
    if (!periodo || !periodo.encontrado || ts === null || ts === undefined) return true;
    return ts >= periodo.inicioTs && ts <= periodo.fimTs;
  }

  function serialDataFlash_(n) {
    var base = Date.UTC(1899, 11, 30);
    return new Date(base + Number(n) * 24 * 60 * 60 * 1000);
  }

  function montarDataFlash_(ano, mes, dia, hora, minuto, segundo) {
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    var d = new Date(ano, mes - 1, dia, hora || 0, minuto || 0, segundo || 0);
    if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
    return d;
  }

  function normalizarDataFlash_(valor, display, periodo) {
    var bruto = valor;
    var exibido = txt_(display);
    var texto = txt_(valor);
    var origem = "";
    var data = null;
    var corrigidaPorInversao = false;

    function escolher(d, o) {
      if (!d) return false;
      data = d;
      origem = o;
      return true;
    }

    var br = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(exibido || texto);
    if (br) {
      escolher(montarDataFlash_(Number(br[3]), Number(br[2]), Number(br[1]), Number(br[4] || 0), Number(br[5] || 0), Number(br[6] || 0)), "STRING_BR");
    } else if (Object.prototype.toString.call(valor) === "[object Date]" && !isNaN(valor.getTime())) {
      escolher(valor, "DATE_OBJECT");
    } else if (typeof valor === "number" && isFinite(valor)) {
      escolher(serialDataFlash_(valor), "SERIAL");
    } else {
      var iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(texto);
      if (iso) escolher(montarDataFlash_(Number(iso[1]), Number(iso[2]), Number(iso[3]), Number(iso[4] || 0), Number(iso[5] || 0), Number(iso[6] || 0)), "STRING_ISO");
    }

    if (data && !dataDentroPeriodo_(data.getTime(), periodo)) {
      var tentativa = montarDataFlash_(data.getFullYear(), data.getDate(), data.getMonth() + 1, data.getHours(), data.getMinutes(), data.getSeconds());
      if (tentativa && dataDentroPeriodo_(tentativa.getTime(), periodo)) {
        data = tentativa;
        origem += "_DIA_MES_CORRIGIDO";
        corrigidaPorInversao = true;
      }
    }

    return {
      valorBruto: bruto,
      display: exibido,
      tipo: Object.prototype.toString.call(valor) === "[object Date]" ? "Date" : typeof valor,
      origem: origem || "INVALIDA",
      ok: !!data,
      normalizada: data ? formatarDataFlash_(data) : "",
      timestamp: data ? data.getTime() : null,
      foraPeriodoEsperado: data ? !dataDentroPeriodo_(data.getTime(), periodo) : false,
      corrigidaPorInversao: corrigidaPorInversao
    };
  }

  function chaveLote_(arquivoNome, periodoInicial, periodoFinal, total, valor) {
    return ["FLASH", arquivoNome, periodoInicial, periodoFinal, total, valor].join("|").toUpperCase();
  }

  function headersEntradaFlash_() {
    return ["DATA", "DESCRICAO", "VALOR", "TIPO", "PESSOA", "CARTAO_FINAL"];
  }

  function configFonteFlash_() {
    var p = PropertiesService.getScriptProperties();
    return {
      fonteTipo: txt_(p.getProperty(PROP_FONTE_TIPO)),
      xlsxFileId: txt_(p.getProperty(PROP_XLSX_FILE_ID)),
      xlsxNomeEsperado: txt_(p.getProperty(PROP_XLSX_NOME_ESPERADO)),
      modo: txt_(p.getProperty(PROP_IMPORTACAO_MODO)) || "TMP_ONLY",
      abaTmp: txt_(p.getProperty(PROP_ABA_TMP)) || ABA_TMP_FLASH,
      prodDbConfirmado: txt_(p.getProperty(PROP_PROD_DB_CONFIRMADO)),
      sourceSpreadsheetId: txt_(p.getProperty(PROP_SOURCE_SPREADSHEET_ID)),
      sourceSheetName: txt_(p.getProperty(PROP_SOURCE_SHEET_NAME))
    };
  }

  function configFonteFlashSaida_(cfg) {
    return {
      fonteTipo: cfg.fonteTipo,
      xlsxFileIdConfigurado: !!cfg.xlsxFileId,
      nomeEsperado: cfg.xlsxNomeEsperado,
      modo: cfg.modo,
      abaTmp: cfg.abaTmp,
      sourceSpreadsheetIdConfigurado: !!cfg.sourceSpreadsheetId,
      sourceSheetName: cfg.sourceSheetName
    };
  }

  function auditarEntradaFlash_() {
    var r = validarProd_("AUDITORIA_ENTRADA_FLASH_PRODUCAO_B36A_SEM_GRAVAR", true);
    var esperados = headersEntradaFlash_();
    r.abaTemporaria = ABA_TMP_FLASH;
    r.headersEsperados = esperados;
    r.headersEncontrados = [];
    r.headersFaltantes = esperados.slice();
    r.headersExtras = [];
    r.linhasDados = 0;
    r.existe = false;
    r.proximaEtapa = "Preparar ou colar dados na TMP_IMPORT_EXTRATO_FLASH e executar DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR";
    var ss = abrirPlanilha_(r);
    if (ss) {
      var sh = ss.getSheetByName(ABA_TMP_FLASH);
      r.existe = !!sh;
      if (!sh) {
        r.bloqueios.push("TMP_IMPORT_EXTRATO_FLASH_AUSENTE");
      } else {
        var hs = headers_(sh).filter(function(h) { return !!h; });
        var mapa = {};
        var mapaEsperados = {};
        hs.forEach(function(h) { mapa[h] = true; });
        esperados.forEach(function(h) { mapaEsperados[h] = true; });
        r.headersEncontrados = hs;
        r.headersFaltantes = esperados.filter(function(h) { return !mapa[h]; });
        r.headersExtras = hs.filter(function(h) { return !mapaEsperados[h]; });
        r.linhasDados = Math.max(0, sh.getLastRow() - 1);
        if (r.headersFaltantes.length) r.bloqueios.push("HEADERS_TMP_FLASH_FALTANTES");
        if (r.headersExtras.length) r.avisos.push("HEADERS_TMP_FLASH_EXTRAS");
        if (r.linhasDados < 1) r.bloqueios.push("ENTRADA_FLASH_AUSENTE");
      }
    }
    r.instrucaoColagemManual = {
      aba: ABA_TMP_FLASH,
      linha1Headers: esperados,
      dadosApartirDaLinha: 2,
      observacao: "Colar apenas dados revisados do extrato Flash real. Nao colar formulas, totais soltos ou linhas em branco no meio da base."
    };
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    return r;
  }

  function PREPARAR_ENTRADA_FLASH_PRODUCAO_B36A_AUTORIZADO() {
    var r = validarProd_("PREPARACAO_ENTRADA_FLASH_PRODUCAO_B36A_AUTORIZADO", false);
    var esperados = headersEntradaFlash_();
    r.abaTemporaria = ABA_TMP_FLASH;
    r.criada = false;
    r.limpouDados = false;
    r.linhasPreparadas = 0;
    r.headers = esperados;
    r.proximaEtapa = "Colar dados reais revisados em TMP_IMPORT_EXTRATO_FLASH e executar DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR";
    var ss = abrirPlanilha_(r);
    if (ss) {
      var sh = ss.getSheetByName(ABA_TMP_FLASH);
      if (!sh) {
        sh = ss.insertSheet(ABA_TMP_FLASH);
        r.criada = true;
      }
      var linhasDados = Math.max(0, sh.getLastRow() - 1);
      var hs = headers_(sh).filter(function(h) { return !!h; });
      if (hs.length === 0 && linhasDados === 0) {
        sh.getRange(1, 1, 1, esperados.length).setValues([esperados]);
        r.linhasPreparadas = 1;
      } else {
        var mapa = {};
        hs.forEach(function(h) { mapa[h] = true; });
        var faltantes = esperados.filter(function(h) { return !mapa[h]; });
        if (faltantes.length) r.bloqueios.push("HEADERS_TMP_FLASH_FALTANTES");
        if (linhasDados > 0) r.avisos.push("TMP_IMPORT_EXTRATO_FLASH_JA_POSSUI_DADOS_NAO_LIMPOS_AUTOMATICAMENTE");
      }
      r.bloqueios.push("FONTE_FLASH_NAO_CONFIGURADA");
      r.avisos.push("A funcao preparou somente a aba temporaria e headers; dados Flash reais devem ser colados ou carregados por fonte autorizada em etapa separada.");
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    r.executado = r.criada || r.linhasPreparadas > 0;
    return log_(r);
  }

  function AUDITAR_ENTRADA_FLASH_PRODUCAO_B36A_SEM_GRAVAR() {
    return log_(auditarEntradaFlash_());
  }

  function CONFIGURAR_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO() {
    var r = validarProd_("CONFIGURACAO_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO", false);
    var CONFIG = {
      FIN_FLASH_FONTE_TIPO: 'GOOGLE_SHEETS',
      FIN_FLASH_SOURCE_SPREADSHEET_ID: '1aJGp7AM0PR5ry8CPONcsRhqXg0_ZZKvHbq6irwHU1GU',
      FIN_FLASH_SOURCE_SHEET_NAME: 'Sheet1',
      FIN_FLASH_XLSX_NOME_ESPERADO: 'extrato-do-colaborador-2026-05-10-ate-2026-06-10.xlsx',
      FIN_FLASH_IMPORTACAO_MODO: 'TMP_ONLY',
      FIN_FLASH_ABA_TMP: 'TMP_IMPORT_EXTRATO_FLASH'
    };
    var cfg = {
      fonteTipo: txt_(CONFIG.FIN_FLASH_FONTE_TIPO).toUpperCase(),
      xlsxFileId: "",
      xlsxNomeEsperado: txt_(CONFIG.FIN_FLASH_XLSX_NOME_ESPERADO),
      modo: txt_(CONFIG.FIN_FLASH_IMPORTACAO_MODO) || "TMP_ONLY",
      abaTmp: txt_(CONFIG.FIN_FLASH_ABA_TMP) || ABA_TMP_FLASH,
      sourceSpreadsheetId: txt_(CONFIG.FIN_FLASH_SOURCE_SPREADSHEET_ID),
      sourceSheetName: txt_(CONFIG.FIN_FLASH_SOURCE_SHEET_NAME)
    };
    r.config = configFonteFlashSaida_(cfg);
    r.proximaEtapa = "Configurar ID do arquivo Flash real e executar novamente.";

    if (!cfg.fonteTipo) {
      r.bloqueios.push("FONTE_TIPO_NAO_CONFIGURADO");
    } else if (cfg.fonteTipo !== "XLSX" && cfg.fonteTipo !== "GOOGLE_SHEETS") {
      r.bloqueios.push("FONTE_TIPO_INVALIDO");
    }
    if (cfg.fonteTipo === "XLSX") {
      r.bloqueios.push("LEITOR_XLSX_NAO_IMPLEMENTADO_COM_SEGURANCA");
      r.avisos.push("Converter o XLSX Flash real para Google Sheets e configurar FIN_FLASH_SOURCE_SPREADSHEET_ID.");
    }
    if (cfg.fonteTipo === "GOOGLE_SHEETS" && !cfg.sourceSpreadsheetId) {
      r.bloqueios.push("SOURCE_SPREADSHEET_ID_NAO_CONFIGURADO");
      r.avisos.push("Converter o XLSX Flash real para Google Sheets e preencher FIN_FLASH_SOURCE_SPREADSHEET_ID.");
    }
    if (cfg.fonteTipo === "GOOGLE_SHEETS" && !cfg.sourceSheetName) {
      r.bloqueios.push("SOURCE_SHEET_NAME_NAO_CONFIGURADO");
      r.avisos.push("Informar o nome exato da aba fonte convertida antes de configurar.");
    }
    if (cfg.fonteTipo === "GOOGLE_SHEETS" && !cfg.xlsxNomeEsperado) {
      r.bloqueios.push("XLSX_NOME_ESPERADO_NAO_CONFIGURADO");
      r.avisos.push("Informar o nome do arquivo XLSX real usado para gerar a planilha convertida.");
    }
    if (cfg.modo !== "TMP_ONLY") {
      r.bloqueios.push("MODO_IMPORTACAO_DEVE_SER_TMP_ONLY");
    }
    if (cfg.abaTmp !== ABA_TMP_FLASH) {
      r.bloqueios.push("ABA_TMP_DIFERENTE_DO_PADRAO_SEGURO");
    }

    if (r.bloqueios.length === 0) {
      try {
        var ssFonte = SpreadsheetApp.openById(cfg.sourceSpreadsheetId);
        var sheetFonte = ssFonte.getSheetByName(cfg.sourceSheetName);
        r.fonte = {
          tipo: "GOOGLE_SHEETS",
          spreadsheetId: ssFonte.getId(),
          nomeArquivo: ssFonte.getName(),
          sheetName: sheetFonte ? sheetFonte.getName() : "",
          ultimaLinha: sheetFonte ? sheetFonte.getLastRow() : 0,
          ultimaColuna: sheetFonte ? sheetFonte.getLastColumn() : 0,
          linhasDados: sheetFonte ? Math.max(0, sheetFonte.getLastRow() - 1) : 0
        };
        if (!sheetFonte) r.bloqueios.push("SOURCE_SHEET_NAME_NAO_ENCONTRADA");
        if (sheetFonte && sheetFonte.getLastRow() < 2) r.bloqueios.push("FONTE_FLASH_SEM_DADOS");
        if (sheetFonte && sheetFonte.getLastColumn() < 1) r.bloqueios.push("FONTE_FLASH_SEM_HEADERS");
      } catch (e) {
        r.bloqueios.push("FALHA_VALIDAR_FONTE_FLASH: " + (e && e.message ? e.message : String(e)));
      }
    }

    if (r.bloqueios.length === 0) {
      var p = PropertiesService.getScriptProperties();
      p.setProperty(PROP_FONTE_TIPO, cfg.fonteTipo);
      p.setProperty(PROP_IMPORTACAO_MODO, cfg.modo);
      p.setProperty(PROP_ABA_TMP, cfg.abaTmp);
      p.setProperty(PROP_XLSX_NOME_ESPERADO, cfg.xlsxNomeEsperado);
      p.setProperty(PROP_SOURCE_SPREADSHEET_ID, cfg.sourceSpreadsheetId);
      p.setProperty(PROP_SOURCE_SHEET_NAME, cfg.sourceSheetName);
      r.executado = true;
      r.proximaEtapa = "Executar CARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_AUTORIZADO.";
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    return log_(r);
  }

  function normalizarLinhaFonteFlash_(headers, linha, displayLinha, periodo) {
    var aliases = aliasesFonteFlash_();
    var idxData = localizar_(headers, aliases.DATA);
    var idxDescricao = localizar_(headers, aliases.DESCRICAO);
    var idxValor = localizar_(headers, aliases.VALOR);
    var idxTipo = localizar_(headers, aliases.TIPO);
    var idxPessoa = localizar_(headers, aliases.PESSOA);
    var idxCartao = localizar_(headers, aliases.CARTAO_FINAL);
    var dataInfo = idxData >= 0 ? normalizarDataFlash_(linha[idxData], displayLinha ? displayLinha[idxData] : "", periodo) : normalizarDataFlash_("", "", periodo);
    var cartaoInfo = idxCartao >= 0 ? cartaoFlash_(linha[idxCartao]) : cartaoFlash_("");
    return {
      valores: [
        dataInfo.normalizada,
        idxDescricao >= 0 ? txt_(linha[idxDescricao]) : "",
        idxValor >= 0 ? num_(linha[idxValor]) : "",
        idxTipo >= 0 ? txt_(linha[idxTipo]) : "",
        idxPessoa >= 0 ? txt_(linha[idxPessoa]) : "",
        cartaoInfo.finalCartao
      ],
      indices: {
        data: idxData,
        descricao: idxDescricao,
        valor: idxValor,
        tipo: idxTipo,
        pessoa: idxPessoa,
        cartaoFinal: idxCartao
      },
      dataInfo: dataInfo,
      cartaoInfo: cartaoInfo
    };
  }

  function lerFonteGoogleSheetsFlash_(cfg, r) {
    var ssFonte = SpreadsheetApp.openById(cfg.sourceSpreadsheetId);
    var sheet = cfg.sourceSheetName ? ssFonte.getSheetByName(cfg.sourceSheetName) : ssFonte.getSheets()[0];
    if (!sheet) {
      r.bloqueios.push("SOURCE_SHEET_NAME_NAO_ENCONTRADA");
      return { linhas: [], leitura: { registrosLidos: 0, registrosValidos: 0, registrosInvalidos: 0, periodoInicial: "", periodoFinal: "", valorTotal: 0, datasForaPeriodoEsperado: 0 }, cartoes: { cartoesDetectados: 0, cartoesCom3Digitos: 0, cartoesInvalidos: 0 } };
    }
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) {
      r.bloqueios.push("FONTE_FLASH_SEM_DADOS");
      return { linhas: [], leitura: { registrosLidos: 0, registrosValidos: 0, registrosInvalidos: 0, periodoInicial: "", periodoFinal: "", valorTotal: 0, datasForaPeriodoEsperado: 0 }, cartoes: { cartoesDetectados: 0, cartoesCom3Digitos: 0, cartoesInvalidos: 0 } };
    }
    var dados = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var displays = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
    var headersFonte = dados[0].map(function(h) { return txt_(h); });
    var periodo = periodoEsperadoFlash_(cfg.xlsxNomeEsperado);
    var probe = normalizarLinhaFonteFlash_(headersFonte, [], [], periodo);
    var camposObrigatorios = ["data", "descricao", "valor", "tipo", "pessoa", "cartaoFinal"];
    var faltantes = camposObrigatorios.filter(function(c) { return probe.indices[c] < 0; });
    r.mapeamento = {
      headersFonteTotal: headersFonte.filter(function(h) { return !!h; }).length,
      camposMapeados: camposObrigatorios.length - faltantes.length,
      camposFaltantes: faltantes
    };
    if (faltantes.length) {
      r.bloqueios.push("MAPEAMENTO_COLUNAS_FLASH_INSUFICIENTE");
      return { linhas: [], leitura: { registrosLidos: 0, registrosValidos: 0, registrosInvalidos: 0, periodoInicial: "", periodoFinal: "", valorTotal: 0, datasForaPeriodoEsperado: 0 }, cartoes: { cartoesDetectados: 0, cartoesCom3Digitos: 0, cartoesInvalidos: 0 } };
    }
    var linhas = [];
    var datas = [];
    var valorTotal = 0;
    var validos = 0;
    var invalidos = 0;
    var datasForaPeriodo = 0;
    var datasCorrigidas = 0;
    var cartoes = {};
    var cartoesCom3 = {};
    var cartoesInvalidos = 0;
    for (var i = 1; i < dados.length; i++) {
      var linha = dados[i];
      var preenchida = linha.some(function(c) { return txt_(c) !== ""; });
      if (!preenchida) continue;
      var n = normalizarLinhaFonteFlash_(headersFonte, linha, displays[i], periodo);
      var valor = num_(n.valores[2]);
      if (!n.dataInfo.ok || n.dataInfo.foraPeriodoEsperado) datasForaPeriodo++;
      if (n.dataInfo.corrigidaPorInversao) datasCorrigidas++;
      if (n.cartaoInfo.finalCartao) cartoes[n.cartaoInfo.finalCartao] = true;
      if (n.cartaoInfo.com3Digitos) cartoesCom3[n.cartaoInfo.finalCartao] = true;
      if (!n.cartaoInfo.valido) cartoesInvalidos++;
      if (!n.dataInfo.ok || n.dataInfo.foraPeriodoEsperado || valor === 0 || !n.cartaoInfo.valido) invalidos++; else validos++;
      if (n.dataInfo.ok) datas.push({ ts: n.dataInfo.timestamp, valor: n.dataInfo.normalizada });
      valorTotal += valor;
      linhas.push(n.valores);
    }
    datas.sort(function(a, b) { return a.ts - b.ts; });
    if (datasForaPeriodo > 0) r.avisos.push("DATA_FORA_DO_PERIODO_ESPERADO");
    if (datasForaPeriodo > 3) r.bloqueios.push("DATAS_NORMALIZADAS_INCONSISTENTES");
    if (Object.keys(cartoesCom3).length > 0) r.avisos.push("CARTAO_FINAL_COM_3_DIGITOS");
    return {
      linhas: linhas,
      leitura: {
        registrosLidos: linhas.length,
        registrosValidos: validos,
        registrosInvalidos: invalidos,
        periodoInicial: datas[0] ? datas[0].valor : "",
        periodoFinal: datas[datas.length - 1] ? datas[datas.length - 1].valor : "",
        valorTotal: Math.round(valorTotal * 100) / 100,
        periodoEsperadoInicial: periodo.inicio,
        periodoEsperadoFinal: periodo.fim,
        datasForaPeriodoEsperado: datasForaPeriodo,
        datasCorrigidasPorInversaoDiaMes: datasCorrigidas
      },
      cartoes: {
        cartoesDetectados: Object.keys(cartoes).length,
        cartoesCom3Digitos: Object.keys(cartoesCom3).length,
        cartoesInvalidos: cartoesInvalidos
      }
    };
  }

  function CARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_AUTORIZADO() {
    var r = validarProd_("CARGA_ENTRADA_FLASH_PRODUCAO_B36B_AUTORIZADO", false);
    var cfg = configFonteFlash_();
    var esperados = headersEntradaFlash_();
    r.fonte = { tipo: cfg.fonteTipo, fileId: cfg.xlsxFileId, nomeArquivo: "", mimeType: "" };
    r.abaTemporaria = { nome: ABA_TMP_FLASH, criada: false, headersOk: false, linhasAntes: 0, linhasGravadas: 0, linhasDepois: 0 };
    r.leitura = { registrosLidos: 0, registrosValidos: 0, registrosInvalidos: 0, periodoInicial: "", periodoFinal: "", valorTotal: 0, datasForaPeriodoEsperado: 0 };
    r.cartoes = { cartoesDetectados: 0, cartoesCom3Digitos: 0, cartoesInvalidos: 0 };
    r.seguranca = { gravouSomenteTmp: false, gravouAbasOficiais: false, limpouDadosExistentes: false };
    r.proximaEtapa = "Executar AUDITAR_CARGA_ENTRADA_FLASH_PRODUCAO_B36B_SEM_GRAVAR e depois DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR";

    if (!cfg.fonteTipo) r.bloqueios.push("FONTE_FLASH_NAO_CONFIGURADA");
    if (cfg.fonteTipo === "XLSX") r.bloqueios.push("LEITOR_XLSX_NAO_IMPLEMENTADO_COM_SEGURANCA");
    if (cfg.fonteTipo === "GOOGLE_SHEETS" && !cfg.sourceSpreadsheetId) r.bloqueios.push("SOURCE_SPREADSHEET_ID_NAO_CONFIGURADO");
    if (cfg.fonteTipo === "GOOGLE_SHEETS" && !cfg.sourceSheetName) r.bloqueios.push("SOURCE_SHEET_NAME_NAO_CONFIGURADO");
    if (cfg.abaTmp !== ABA_TMP_FLASH) r.bloqueios.push("ABA_TMP_DIFERENTE_DO_PADRAO_SEGURO");

    var ss = abrirPlanilha_(r);
    if (ss && r.bloqueios.length === 0) {
      var sh = ss.getSheetByName(ABA_TMP_FLASH);
      if (!sh) {
        sh = ss.insertSheet(ABA_TMP_FLASH);
        r.abaTemporaria.criada = true;
      }
      r.abaTemporaria.linhasAntes = Math.max(0, sh.getLastRow() - 1);
      if (r.abaTemporaria.linhasAntes > 0) {
        r.bloqueios.push("TMP_IMPORT_EXTRATO_FLASH_JA_POSSUI_DADOS");
      }
      var hs = headers_(sh).filter(function(h) { return !!h; });
      if (hs.length === 0 && r.bloqueios.length === 0) {
        sh.getRange(1, 1, 1, esperados.length).setValues([esperados]);
        hs = esperados.slice();
      }
      r.abaTemporaria.headersOk = esperados.every(function(h) { return hs.indexOf(h) >= 0; });
      if (!r.abaTemporaria.headersOk) r.bloqueios.push("HEADERS_TMP_FLASH_INVALIDOS");

      if (r.bloqueios.length === 0 && cfg.fonteTipo === "GOOGLE_SHEETS") {
        var carga = lerFonteGoogleSheetsFlash_(cfg, r);
        r.leitura = carga.leitura;
        r.cartoes = carga.cartoes;
        if (r.leitura.registrosValidos < 1) r.bloqueios.push("REGISTROS_VALIDOS_ZERO");
        if (r.bloqueios.length === 0) {
          sh.getRange(2, 1, carga.linhas.length, esperados.length).setValues(carga.linhas);
          r.abaTemporaria.linhasGravadas = carga.linhas.length;
          r.abaTemporaria.linhasDepois = Math.max(0, sh.getLastRow() - 1);
          r.seguranca.gravouSomenteTmp = true;
          r.executado = true;
        }
      }
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    return log_(r);
  }

  function oficiaisFlash_(ss) {
    return {
      FIN_LOTES_EXTRATO_FLASH: contarAba_(ss, ABA_LOTES).linhasDados,
      FIN_CARTOES_EXTRATOS: contarAba_(ss, ABA_EXTRATOS).linhasDados,
      FIN_CARTOES_CONCILIACAO: contarAba_(ss, ABA_CONCILIACAO).linhasDados,
      FIN_CARTOES_PENDENCIAS: contarAba_(ss, ABA_PENDENCIAS).linhasDados
    };
  }

  function DIAGNOSTICAR_DATAS_FONTE_FLASH_PRODUCAO_B36B_SEM_GRAVAR() {
    var r = validarProd_("DIAGNOSTICO_DATAS_FONTE_FLASH_PRODUCAO_B36B_SEM_GRAVAR", true);
    var cfg = configFonteFlash_();
    r.fonte = { tipo: cfg.fonteTipo, spreadsheetId: cfg.sourceSpreadsheetId, sheetName: cfg.sourceSheetName };
    r.periodoEsperado = periodoEsperadoFlash_(cfg.xlsxNomeEsperado);
    r.amostraDatas = [];
    if (!cfg.sourceSpreadsheetId) r.bloqueios.push("SOURCE_SPREADSHEET_ID_NAO_CONFIGURADO");
    if (!cfg.sourceSheetName) r.bloqueios.push("SOURCE_SHEET_NAME_NAO_CONFIGURADO");
    if (cfg.fonteTipo !== "GOOGLE_SHEETS") r.bloqueios.push("FONTE_FLASH_GOOGLE_SHEETS_NAO_CONFIGURADA");
    if (r.bloqueios.length === 0) {
      try {
        var ssFonte = SpreadsheetApp.openById(cfg.sourceSpreadsheetId);
        var sh = ssFonte.getSheetByName(cfg.sourceSheetName);
        if (!sh) {
          r.bloqueios.push("SOURCE_SHEET_NAME_NAO_ENCONTRADA");
        } else {
          var maxRows = Math.min(sh.getLastRow(), 11);
          var maxCols = sh.getLastColumn();
          var valores = sh.getRange(1, 1, maxRows, maxCols).getValues();
          var displays = sh.getRange(1, 1, maxRows, maxCols).getDisplayValues();
          var headersFonte = valores[0].map(function(h) { return txt_(h); });
          var idxData = localizar_(headersFonte, aliasesFonteFlash_().DATA);
          r.headers = headersFonte;
          r.idxData = idxData;
          if (idxData < 0) {
            r.bloqueios.push("CAMPO_DATA_FLASH_AUSENTE");
          } else {
            for (var i = 1; i < valores.length; i++) {
              var info = normalizarDataFlash_(valores[i][idxData], displays[i][idxData], r.periodoEsperado);
              r.amostraDatas.push({
                linha: i + 1,
                valorBruto: info.tipo === "Date" ? formatarDataFlash_(valores[i][idxData]) : txt_(valores[i][idxData]),
                tipoJS: info.tipo,
                displayValue: info.display,
                origemParse: info.origem,
                dataNormalizada: info.normalizada,
                foraPeriodoEsperado: info.foraPeriodoEsperado,
                corrigidaPorInversaoDiaMes: info.corrigidaPorInversao
              });
            }
          }
        }
      } catch (e) {
        r.bloqueios.push("FALHA_DIAGNOSTICAR_FONTE_FLASH: " + (e && e.message ? e.message : String(e)));
      }
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    return log_(r);
  }

  function RECARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_CORRIGIR_DATAS_AUTORIZADO() {
    var r = validarProd_("RECARREGAMENTO_ENTRADA_FLASH_PRODUCAO_B36B_CORRIGIR_DATAS_AUTORIZADO", false);
    var cfg = configFonteFlash_();
    var esperados = headersEntradaFlash_();
    r.abaTemporaria = { nome: ABA_TMP_FLASH, linhasAntes: 0, limpouDadosExistentes: false, linhasGravadas: 0, linhasDepois: 0 };
    r.leitura = { registrosLidos: 0, registrosValidos: 0, registrosInvalidos: 0, periodoInicial: "", periodoFinal: "", valorTotal: 0, datasForaPeriodoEsperado: 0 };
    r.cartoes = { cartoesDetectados: 0, cartoesCom3Digitos: 0, cartoesInvalidos: 0 };
    r.oficiais = { FIN_LOTES_EXTRATO_FLASH: 0, FIN_CARTOES_EXTRATOS: 0, FIN_CARTOES_CONCILIACAO: 0, FIN_CARTOES_PENDENCIAS: 0 };
    if (!cfg.sourceSpreadsheetId) r.bloqueios.push("SOURCE_SPREADSHEET_ID_NAO_CONFIGURADO");
    if (!cfg.sourceSheetName) r.bloqueios.push("SOURCE_SHEET_NAME_NAO_CONFIGURADO");
    if (cfg.fonteTipo !== "GOOGLE_SHEETS") r.bloqueios.push("FONTE_FLASH_GOOGLE_SHEETS_NAO_CONFIGURADA");
    var ss = abrirPlanilha_(r);
    if (ss) {
      r.oficiais = oficiaisFlash_(ss);
      var oficiaisComDados = Object.keys(r.oficiais).filter(function(k) { return r.oficiais[k] > 0; });
      if (oficiaisComDados.length) r.bloqueios.push("ABAS_OFICIAIS_NAO_ESTAO_ZERADAS_RECARREGAMENTO_BLOQUEADO");
      var sh = ss.getSheetByName(ABA_TMP_FLASH);
      if (!sh) {
        sh = ss.insertSheet(ABA_TMP_FLASH);
      }
      r.abaTemporaria.linhasAntes = Math.max(0, sh.getLastRow() - 1);
      if (r.bloqueios.length === 0) {
        var carga = lerFonteGoogleSheetsFlash_(cfg, r);
        r.leitura = carga.leitura;
        r.cartoes = carga.cartoes;
        if (r.leitura.registrosValidos < 1) r.bloqueios.push("REGISTROS_VALIDOS_ZERO");
        if (r.bloqueios.length === 0) {
          sh.clearContents();
          r.abaTemporaria.limpouDadosExistentes = true;
          sh.getRange(1, 1, 1, esperados.length).setValues([esperados]);
          sh.getRange(2, 1, carga.linhas.length, esperados.length).setValues(carga.linhas);
          r.abaTemporaria.linhasGravadas = carga.linhas.length;
          r.abaTemporaria.linhasDepois = Math.max(0, sh.getLastRow() - 1);
          r.executado = true;
        }
      }
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    return log_(r);
  }

  function AUDITAR_CARGA_ENTRADA_FLASH_PRODUCAO_B36B_SEM_GRAVAR() {
    var r = validarProd_("AUDITORIA_CARGA_ENTRADA_FLASH_PRODUCAO_B36B_SEM_GRAVAR", true);
    var esperados = headersEntradaFlash_();
    r.abaTemporaria = { existe: false, headersOk: false, linhasDados: 0 };
    r.leitura = { registrosValidos: 0, registrosInvalidos: 0, periodoInicial: "", periodoFinal: "", valorTotal: 0, cartoesDetectados: 0, pessoasDetectadas: 0, datasForaPeriodoEsperado: 0 };
    r.cartoes = { cartoesDetectados: 0, cartoesCom3Digitos: 0, cartoesInvalidos: 0 };
    r.oficiais = { FIN_LOTES_EXTRATO_FLASH: 0, FIN_CARTOES_EXTRATOS: 0, FIN_CARTOES_CONCILIACAO: 0, FIN_CARTOES_PENDENCIAS: 0 };
    r.amostra = [];
    r.proximaEtapa = "Executar DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR";
    var ss = abrirPlanilha_(r);
    if (ss) {
      var sh = ss.getSheetByName(ABA_TMP_FLASH);
      r.abaTemporaria.existe = !!sh;
      if (!sh) {
        r.bloqueios.push("TMP_IMPORT_EXTRATO_FLASH_AUSENTE");
      } else {
        var hs = headers_(sh);
        r.abaTemporaria.headersOk = esperados.every(function(h) { return hs.indexOf(h) >= 0; });
        r.abaTemporaria.linhasDados = Math.max(0, sh.getLastRow() - 1);
        if (!r.abaTemporaria.headersOk) r.bloqueios.push("HEADERS_TMP_FLASH_INVALIDOS");
        var pacote = lerEntradaFlash_(ss, r);
        r.leitura.registrosValidos = pacote.leitura.totalRegistrosValidos;
        r.leitura.registrosInvalidos = pacote.leitura.totalRegistrosInvalidos;
        r.leitura.periodoInicial = pacote.leitura.periodoInicial;
        r.leitura.periodoFinal = pacote.leitura.periodoFinal;
        r.leitura.valorTotal = pacote.leitura.valorTotal;
        r.leitura.cartoesDetectados = pacote.leitura.cartoesDetectados;
        r.leitura.pessoasDetectadas = pacote.leitura.pessoasDetectadas;
        r.leitura.datasForaPeriodoEsperado = pacote.leitura.datasForaPeriodoEsperado;
        r.cartoes = pacote.cartoes;
        r.amostra = pacote.amostra.primeirasLinhas.slice(0, 5);
      }
      r.oficiais = oficiaisFlash_(ss);
      Object.keys(r.oficiais).forEach(function(k) {
        if (r.oficiais[k] !== 0) r.bloqueios.push("ABA_OFICIAL_NAO_ESTA_ZERADA_" + k);
      });
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    return log_(r);
  }

  function lerEntradaFlash_(ss, base) {
    var sh = ss ? ss.getSheetByName(ABA_TMP_FLASH) : null;
    var entrada = {
      tipo: "CONFIG",
      origem: "Aba " + ABA_TMP_FLASH,
      arquivoNome: ABA_TMP_FLASH,
      arquivoId: "",
      possuiEntrada: !!sh
    };
    var leitura = {
      totalRegistrosLidos: 0,
      totalRegistrosValidos: 0,
      totalRegistrosInvalidos: 0,
      periodoInicial: "",
      periodoFinal: "",
      valorTotal: 0,
      moeda: "BRL",
      cartoesDetectados: 0,
      estabelecimentosDetectados: 0,
      pessoasDetectadas: 0,
      datasForaPeriodoEsperado: 0,
      datasCorrigidasPorInversaoDiaMes: 0
    };
    var cartoesResumo = { cartoesDetectados: 0, cartoesCom3Digitos: 0, cartoesInvalidos: 0 };
    var amostra = { primeirasLinhas: [] };
    if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < 1) {
      base.bloqueios.push("ENTRADA_FLASH_AUSENTE");
      base.avisos.push("Configurar entrada segura em " + ABA_TMP_FLASH + " antes do dry-run.");
      return { entrada: entrada, leitura: leitura, cartoes: cartoesResumo, amostra: amostra, registros: [], chaveLote: "" };
    }

    var cfg = configFonteFlash_();
    var periodo = periodoEsperadoFlash_(cfg.xlsxNomeEsperado);
    var dados = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    var displays = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getDisplayValues();
    var hs = dados[0].map(function(h) { return txt_(h); });
    var aliases = aliasesFonteFlash_();
    var idxData = localizar_(hs, aliases.DATA);
    var idxValor = localizar_(hs, aliases.VALOR);
    var idxDescricao = localizar_(hs, aliases.DESCRICAO);
    var idxPessoa = localizar_(hs, aliases.PESSOA);
    var idxCartao = localizar_(hs, aliases.CARTAO_FINAL);
    var idxTipo = localizar_(hs, aliases.TIPO);
    if (idxData < 0) base.bloqueios.push("CAMPO_DATA_FLASH_AUSENTE");
    if (idxValor < 0) base.bloqueios.push("CAMPO_VALOR_FLASH_AUSENTE");

    var datas = [];
    var cartoes = {};
    var cartoesCom3 = {};
    var cartoesInvalidos = 0;
    var estabs = {};
    var pessoas = {};
    var registros = [];
    for (var i = 1; i < dados.length; i++) {
      var linha = dados[i];
      var preenchida = linha.some(function(c) { return txt_(c) !== ""; });
      if (!preenchida) continue;
      var dataInfo = idxData >= 0 ? normalizarDataFlash_(linha[idxData], displays[i][idxData], periodo) : normalizarDataFlash_("", "", periodo);
      var data = dataInfo.normalizada;
      var valor = idxValor >= 0 ? num_(linha[idxValor]) : 0;
      var desc = idxDescricao >= 0 ? txt_(linha[idxDescricao]) : "";
      var pessoa = idxPessoa >= 0 ? txt_(linha[idxPessoa]) : "";
      var cartaoInfo = idxCartao >= 0 ? cartaoFlash_(linha[idxCartao]) : cartaoFlash_("");
      var cartao = cartaoInfo.finalCartao;
      var tipo = idxTipo >= 0 ? txt_(linha[idxTipo]) : "";
      leitura.totalRegistrosLidos++;
      if (dataInfo.foraPeriodoEsperado) leitura.datasForaPeriodoEsperado++;
      if (dataInfo.corrigidaPorInversao) leitura.datasCorrigidasPorInversaoDiaMes++;
      if (cartaoInfo.com3Digitos) cartoesCom3[cartao] = true;
      if (!cartaoInfo.valido) cartoesInvalidos++;
      if (idxData >= 0 && dataInfo.ok && !dataInfo.foraPeriodoEsperado && idxValor >= 0 && valor !== 0 && cartaoInfo.valido) leitura.totalRegistrosValidos++; else leitura.totalRegistrosInvalidos++;
      leitura.valorTotal += valor;
      if (dataInfo.ok) datas.push({ ts: dataInfo.timestamp, valor: dataInfo.normalizada });
      if (cartao) cartoes[cartao] = true;
      if (desc) estabs[desc] = true;
      if (pessoa) pessoas[pessoa] = true;
      var reg = { linha: i + 1, dataNormalizada: data, descricao: desc, valor: valor, tipo: tipo, pessoa: pessoa, cartaoFinal: cartao, estabelecimento: desc };
      registros.push(reg);
      if (amostra.primeirasLinhas.length < 3) amostra.primeirasLinhas.push(reg);
    }
    datas.sort(function(a, b) { return a.ts - b.ts; });
    leitura.periodoInicial = datas[0] ? datas[0].valor : "";
    leitura.periodoFinal = datas[datas.length - 1] ? datas[datas.length - 1].valor : "";
    leitura.valorTotal = Math.round(leitura.valorTotal * 100) / 100;
    leitura.cartoesDetectados = Object.keys(cartoes).length;
    leitura.estabelecimentosDetectados = Object.keys(estabs).length;
    leitura.pessoasDetectadas = Object.keys(pessoas).length;
    cartoesResumo = {
      cartoesDetectados: Object.keys(cartoes).length,
      cartoesCom3Digitos: Object.keys(cartoesCom3).length,
      cartoesInvalidos: cartoesInvalidos
    };
    if (leitura.datasForaPeriodoEsperado > 0) base.avisos.push("DATA_FORA_DO_PERIODO_ESPERADO");
    if (leitura.datasForaPeriodoEsperado > 3) base.bloqueios.push("DATAS_NORMALIZADAS_INCONSISTENTES");
    if (cartoesResumo.cartoesCom3Digitos > 0) base.avisos.push("CARTAO_FINAL_COM_3_DIGITOS");
    var chave = chaveLote_(entrada.arquivoNome, leitura.periodoInicial, leitura.periodoFinal, leitura.totalRegistrosValidos, leitura.valorTotal);
    return { entrada: entrada, leitura: leitura, cartoes: cartoesResumo, amostra: amostra, registros: registros, chaveLote: chave };
  }

  function duplicidade_(ss, chave) {
    var sh = ss ? ss.getSheetByName(ABA_LOTES) : null;
    var total = 0;
    if (sh && sh.getLastRow() > 1) {
      var dados = objetos_(sh).items;
      dados.forEach(function(l) {
        var c = txt_(l.CHAVE_LOTE) || chaveLote_(txt_(l.ARQUIVO_NOME), txt_(l.PERIODO_INICIO), txt_(l.PERIODO_FIM), txt_(l.TOTAL_LANCAMENTOS), txt_(l.SOMA_DEBITOS || l.SALDO_LIQUIDO));
        if (chave && c === chave) total++;
      });
    }
    return {
      chaveLote: chave,
      jaExisteLote: total > 0,
      lotesEncontrados: total
    };
  }

  function dryRun_() {
    var r = validarProd_("DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR", true);
    r.entrada = { tipo: "CONFIG", origem: "Aba " + ABA_TMP_FLASH, possuiEntrada: false };
    r.leitura = {};
    r.cartoes = {};
    r.duplicidade = {};
    r.seguranca = { gravou: false, linhasCriadas: 0, arquivosCriados: 0 };
    r.amostra = { primeirasLinhas: [] };
    r.proximaEtapa = "Se aprovado, executar PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR";
    var ss = abrirPlanilha_(r);
    if (ss) {
      [ABA_LOTES, ABA_EXTRATOS].forEach(function(nome) {
        var c = contarAba_(ss, nome);
        if (!c.existe) r.bloqueios.push("ABA_AUSENTE_" + nome);
      });
      var pacote = lerEntradaFlash_(ss, r);
      r.entrada = pacote.entrada;
      r.leitura = pacote.leitura;
      r.cartoes = pacote.cartoes;
      r.duplicidade = duplicidade_(ss, pacote.chaveLote);
      r.amostra = pacote.amostra;
      if (r.duplicidade.jaExisteLote) r.bloqueios.push("LOTE_FLASH_DUPLICADO");
      if (r.leitura.totalRegistrosValidos < 1) r.bloqueios.push("TOTAL_REGISTROS_VALIDOS_ZERO");
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    return r;
  }

  function log_(r) {
    Logger.log(JSON.stringify(r, null, 2));
    return r;
  }

  function DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR() {
    return log_(dryRun_());
  }

  function PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR() {
    var d = dryRun_();
    d.modo = "PRE_CONFIRMACAO_FLASH_PRODUCAO_B37_SEM_GRAVAR";
    d.lote = {
      chaveLote: d.duplicidade ? d.duplicidade.chaveLote : "",
      periodoInicial: d.leitura ? d.leitura.periodoInicial : "",
      periodoFinal: d.leitura ? d.leitura.periodoFinal : "",
      totalTransacoes: d.leitura ? d.leitura.totalRegistrosValidos : 0,
      valorTotal: d.leitura ? d.leitura.valorTotal : 0
    };
    d.impactoPrevisto = {
      criarLote: d.bloqueios.length === 0,
      linhasLote: d.bloqueios.length === 0 ? 1 : 0,
      linhasExtratos: d.bloqueios.length === 0 && d.leitura ? d.leitura.totalRegistrosValidos : 0
    };
    d.checklist = [
      { item: "DB_FIN_ID_PROD", ok: d.DB_FIN_ID === DB_FIN_ID_PROD_ESPERADO },
      { item: "SEM_DUPLICIDADE_LOTE", ok: !(d.duplicidade && d.duplicidade.jaExisteLote) },
      { item: "TOTAL_TRANSACOES_VALIDO", ok: d.leitura && d.leitura.totalRegistrosValidos > 0 },
      { item: "VALOR_TOTAL_VALIDO", ok: d.leitura && d.leitura.valorTotal !== 0 }
    ];
    d.proximaEtapa = "Se aprovado manualmente, executar IMPORTAR_FLASH_PRODUCAO_B38_AUTORIZADO";
    return log_(d);
  }

  function IMPORTAR_FLASH_PRODUCAO_B38_AUTORIZADO() {
    var d = dryRun_();
    d.modo = "IMPORTACAO_FLASH_PRODUCAO_B38_AUTORIZADO";
    d.somenteLeitura = false;
    d.executado = false;
    d.gravacao = { loteCriado: false, linhasLoteCriadas: 0, extratosCriados: 0, linhasCriadasTotal: 0 };
    d.seguranca = { lock: false, duplicidadeBloqueada: !!(d.duplicidade && d.duplicidade.jaExisteLote) };
    d.proximaEtapa = "Executar AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR";
    if (typeof importarExtratoFlashReal_FIN1117 !== "function") {
      d.bloqueios.push("ROTINA_IMPORTACAO_REAL_FLASH_NAO_LOCALIZADA");
    }
    if (d.bloqueios.length === 0) {
      var lock = LockService.getScriptLock();
      d.seguranca.lock = lock.tryLock(30000);
      if (!d.seguranca.lock) {
        d.bloqueios.push("LOCK_IMPORTACAO_FLASH_NAO_OBTIDO");
      } else {
        try {
          var imp = importarExtratoFlashReal_FIN1117("IMPORTAR_EXTRATO_FLASH_REAL_FIN1117");
          d.resultadoImportacao = {
            success: !!(imp && imp.success),
            executado: !!(imp && imp.executado),
            loteId: imp ? imp.loteId : "",
            linhasEntrada: imp ? imp.linhasEntrada : 0,
            linhasValidas: imp ? imp.linhasValidas : 0,
            linhasGravadasExtrato: imp ? imp.linhasGravadasExtrato : 0,
            loteGravado: !!(imp && imp.loteGravado),
            bloqueios: imp && imp.bloqueios ? imp.bloqueios : []
          };
          d.executado = !!(imp && imp.executado);
          d.success = !!(imp && imp.success);
          d.ok = d.success;
          d.gravacao.loteCriado = !!(imp && imp.loteGravado);
          d.gravacao.linhasLoteCriadas = d.gravacao.loteCriado ? 1 : 0;
          d.gravacao.extratosCriados = imp ? Number(imp.linhasGravadasExtrato || 0) : 0;
          d.gravacao.linhasCriadasTotal = d.gravacao.linhasLoteCriadas + d.gravacao.extratosCriados;
          if (!d.success) d.bloqueios = d.bloqueios.concat(d.resultadoImportacao.bloqueios || []);
        } finally {
          lock.releaseLock();
        }
      }
    }
    d.success = d.bloqueios.length === 0 && d.executado === true;
    d.ok = d.success;
    return log_(d);
  }

  function mapaContagemB39_(itens, chaveFn) {
    var mapa = {};
    itens.forEach(function(item) {
      var chave = txt_(chaveFn(item));
      if (!chave) return;
      if (!mapa[chave]) mapa[chave] = { chave: chave, quantidade: 0, linhas: [] };
      mapa[chave].quantidade++;
      if (mapa[chave].linhas.length < 20) mapa[chave].linhas.push(item.__linha || "");
    });
    return mapa;
  }

  function repetidosB39_(mapa) {
    return Object.keys(mapa).filter(function(k) {
      return mapa[k].quantidade > 1;
    }).map(function(k) {
      return mapa[k];
    });
  }

  function valorLinhaExtratoB39_(e) {
    return num_(e.VALOR !== undefined && e.VALOR !== "" ? e.VALOR : e.VALOR_TRANSACAO);
  }

  function dataLinhaExtratoB39_(e) {
    return txt_(e.DATA_TRANSACAO || e.DATA);
  }

  function resumirExtratosPorLoteB39_(extratos) {
    var porLote = {};
    extratos.forEach(function(e) {
      var loteId = txt_(e.LOTE_ID || e.IMPORTACAO_ID);
      if (!loteId) loteId = "__SEM_LOTE_ID__";
      if (!porLote[loteId]) {
        porLote[loteId] = {
          loteId: loteId,
          quantidade: 0,
          valorTotal: 0,
          periodoInicial: "",
          periodoFinal: "",
          chavesDuplicidade: [],
          extratos: []
        };
      }
      var grupo = porLote[loteId];
      var valor = valorLinhaExtratoB39_(e);
      var data = dataLinhaExtratoB39_(e);
      grupo.quantidade++;
      grupo.valorTotal += valor;
      if (data && (!grupo.periodoInicial || data < grupo.periodoInicial)) grupo.periodoInicial = data;
      if (data && (!grupo.periodoFinal || data > grupo.periodoFinal)) grupo.periodoFinal = data;
      if (txt_(e.CHAVE_DUPLICIDADE) && grupo.chavesDuplicidade.length < 200) grupo.chavesDuplicidade.push(txt_(e.CHAVE_DUPLICIDADE));
      if (grupo.extratos.length < 200) {
        grupo.extratos.push({
          linha: e.__linha,
          extratoId: txt_(e.EXTRATO_ID || e.ID),
          loteId: loteId,
          data: data,
          valor: valor,
          cartaoFinal: txt_(e.CARTAO_FINAL || e.CARTAO_ID),
          pessoa: txt_(e.PESSOA || e.PORTADOR),
          chaveDuplicidade: txt_(e.CHAVE_DUPLICIDADE),
          status: txt_(e.STATUS)
        });
      }
    });
    Object.keys(porLote).forEach(function(loteId) {
      porLote[loteId].valorTotal = Math.round(porLote[loteId].valorTotal * 100) / 100;
    });
    return porLote;
  }

  function anexarLinhasB39_(items) {
    return items.map(function(item, idx) {
      item.__linha = idx + 2;
      return item;
    });
  }

  function logsRelacionadosB39_(ss) {
    var sh = ss ? ss.getSheetByName("FIN_CARTOES_LOGS") : null;
    var out = { existe: !!sh, totalLinhas: 0, encontrados: [] };
    if (!sh) return out;
    var obj = objetos_(sh);
    var itens = anexarLinhasB39_(obj.items);
    out.totalLinhas = itens.length;
    var padrao = /(FLASH|FIN1117|B38|B39|IMPORTACAO_EXTRATO|IMPORTAR_FLASH|EXTRATO_FLASH)/i;
    itens.forEach(function(item) {
      var texto = JSON.stringify(item);
      if (padrao.test(texto)) {
        out.encontrados.push({
          linha: item.__linha,
          dataHora: txt_(item.DATA_HORA || item.DATA || item.CRIADO_EM),
          acao: txt_(item.ACAO || item.EVENTO || item.MODO),
          usuario: txt_(item.USUARIO_EMAIL || item.USUARIO || item.CRIADO_POR),
          resumo: texto.slice(0, 500)
        });
      }
    });
    out.encontrados = out.encontrados.slice(-30);
    return out;
  }

  function compararPayloadB39_(payload, lotes, porLote) {
    var comparacoes = [];
    var divergencias = [];
    var esperado = {
      totalTransacoes: payload.leitura ? Number(payload.leitura.totalRegistrosValidos || 0) : 0,
      periodoInicial: payload.leitura ? txt_(payload.leitura.periodoInicial) : "",
      periodoFinal: payload.leitura ? txt_(payload.leitura.periodoFinal) : "",
      valorTotal: payload.leitura ? Math.round(num_(payload.leitura.valorTotal) * 100) / 100 : 0,
      chaveLoteB36B37: txt_(payload.chaveLote)
    };
    lotes.forEach(function(lote) {
      var loteId = txt_(lote.LOTE_ID);
      var gravado = porLote[loteId] || { quantidade: 0, valorTotal: 0, periodoInicial: "", periodoFinal: "" };
      var item = {
        loteId: loteId,
        chaveLoteGravada: txt_(lote.CHAVE_LOTE),
        esperado: esperado,
        gravado: {
          totalLancamentosLote: Number(lote.TOTAL_LANCAMENTOS || 0),
          totalExtratos: gravado.quantidade,
          periodoInicioLote: txt_(lote.PERIODO_INICIO),
          periodoFimLote: txt_(lote.PERIODO_FIM),
          periodoInicioExtratos: gravado.periodoInicial,
          periodoFimExtratos: gravado.periodoFinal,
          valorTotalExtratos: gravado.valorTotal,
          somaDebitosLote: Math.round(num_(lote.SOMA_DEBITOS) * 100) / 100,
          somaCreditosLote: Math.round(num_(lote.SOMA_CREDITOS) * 100) / 100,
          saldoLiquidoLote: Math.round(num_(lote.SALDO_LIQUIDO) * 100) / 100
        },
        divergencias: []
      };
      if (item.gravado.totalLancamentosLote !== esperado.totalTransacoes) item.divergencias.push("TOTAL_LANCAMENTOS_DIVERGE_PAYLOAD");
      if (item.gravado.totalExtratos !== esperado.totalTransacoes) item.divergencias.push("QTD_EXTRATOS_DIVERGE_PAYLOAD");
      if (item.gravado.periodoInicioLote !== esperado.periodoInicial) item.divergencias.push("PERIODO_INICIO_LOTE_DIVERGE_PAYLOAD");
      if (item.gravado.periodoFimLote !== esperado.periodoFinal) item.divergencias.push("PERIODO_FIM_LOTE_DIVERGE_PAYLOAD");
      if (item.gravado.periodoInicioExtratos !== esperado.periodoInicial) item.divergencias.push("PERIODO_INICIO_EXTRATOS_DIVERGE_PAYLOAD");
      if (item.gravado.periodoFimExtratos !== esperado.periodoFinal) item.divergencias.push("PERIODO_FIM_EXTRATOS_DIVERGE_PAYLOAD");
      if (item.gravado.valorTotalExtratos !== esperado.valorTotal) item.divergencias.push("VALOR_TOTAL_EXTRATOS_DIVERGE_PAYLOAD");
      if (item.chaveLoteGravada && esperado.chaveLoteB36B37 && item.chaveLoteGravada !== esperado.chaveLoteB36B37) item.divergencias.push("CHAVE_LOTE_GRAVADA_DIFERE_CHAVE_B36_B37");
      if (item.divergencias.length) {
        divergencias.push({ loteId: loteId, divergencias: item.divergencias });
      }
      comparacoes.push(item);
    });
    return { esperado: esperado, comparacoes: comparacoes, divergencias: divergencias };
  }

  function AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR() {
    var r = validarProd_("AUDITORIA_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR", true);
    r.incidente = "B38";
    r.rotinaAntigaAuditada = "IMPORTACAO_EXTRATO_FLASH_REAL_FIN1117";
    r.proibicoes = ["NAO_IMPORTAR", "NAO_CORRIGIR_PLANILHA_MANUALMENTE", "NAO_APAGAR_LOTES_OU_EXTRATOS"];
    r.resumo = {
      lotesExistentes: 0,
      extratosExistentes: 0,
      lotesFin1117: 0,
      extratosFin1117: 0,
      valorTotalGravado: 0,
      periodoInicialGravado: "",
      periodoFinalGravado: "",
      duplicidadesLoteId: 0,
      duplicidadesChaveLote: 0,
      duplicidadesExtrato: 0,
      divergenciasPayloadVsGravacao: 0
    };
    r.abas = {};
    r.lotesExistentes = [];
    r.extratosPorLote = {};
    r.chaves = { lotes: [], chavesLoteRepetidas: [], loteIdRepetidos: [], chavesExtratoRepetidas: [] };
    r.payloadAprovadoB36B37 = {};
    r.comparacaoPayloadVsB38 = {};
    r.logsRelacionados = {};
    r.decisaoPendente = ["A_APROVEITAR_LOTE_GRAVADO", "B_BLOQUEAR_LOTE_E_CORRECAO_CONTROLADA", "C_REVERTER_COM_ROTINA_ESPECIFICA", "D_RECRIAR_IMPORTACAO_SEGURA_COM_ROTINA_NOVA"];
    r.proximaEtapa = "Decidir A/B/C/D apos revisar esta auditoria. Nao executar conciliacao nem nova importacao.";
    var ss = abrirPlanilha_(r);
    if (ss) {
      r.abas[ABA_LOTES] = contarAba_(ss, ABA_LOTES);
      r.abas[ABA_EXTRATOS] = contarAba_(ss, ABA_EXTRATOS);
      r.abas[ABA_TMP_FLASH] = contarAba_(ss, ABA_TMP_FLASH);
      r.abas.FIN_CARTOES_LOGS = contarAba_(ss, "FIN_CARTOES_LOGS");

      var lotes = anexarLinhasB39_(objetos_(ss.getSheetByName(ABA_LOTES)).items);
      var extratos = anexarLinhasB39_(objetos_(ss.getSheetByName(ABA_EXTRATOS)).items);
      var lotesFin1117 = lotes.filter(function(l) {
        var obs = txt_(l.OBSERVACOES);
        var origem = txt_(l.ORIGEM);
        var arq = txt_(l.ARQUIVO_NOME);
        return origem === "FLASH" || arq === ABA_TMP_FLASH || /FIN\.?11\.?17|TMP_IMPORT_EXTRATO_FLASH/i.test(obs);
      });
      var loteIdsFin1117 = {};
      lotesFin1117.forEach(function(l) {
        if (txt_(l.LOTE_ID)) loteIdsFin1117[txt_(l.LOTE_ID)] = true;
      });
      var extratosFin1117 = extratos.filter(function(e) {
        return !!loteIdsFin1117[txt_(e.LOTE_ID || e.IMPORTACAO_ID)] || txt_(e.ORIGEM) === "FLASH";
      });

      r.resumo.lotesExistentes = lotes.length;
      r.resumo.extratosExistentes = extratos.length;
      r.resumo.lotesFin1117 = lotesFin1117.length;
      r.resumo.extratosFin1117 = extratosFin1117.length;

      var porLote = resumirExtratosPorLoteB39_(extratosFin1117);
      var datas = [];
      extratosFin1117.forEach(function(e) {
        r.resumo.valorTotalGravado += valorLinhaExtratoB39_(e);
        var data = dataLinhaExtratoB39_(e);
        if (data) datas.push(data);
      });
      datas.sort();
      r.resumo.valorTotalGravado = Math.round(r.resumo.valorTotalGravado * 100) / 100;
      r.resumo.periodoInicialGravado = datas[0] || "";
      r.resumo.periodoFinalGravado = datas[datas.length - 1] || "";

      r.lotesExistentes = lotesFin1117.map(function(l) {
        return {
          linha: l.__linha,
          loteId: txt_(l.LOTE_ID),
          origem: txt_(l.ORIGEM),
          arquivoNome: txt_(l.ARQUIVO_NOME),
          arquivoHash: txt_(l.ARQUIVO_HASH),
          chaveLote: txt_(l.CHAVE_LOTE),
          periodoInicio: txt_(l.PERIODO_INICIO),
          periodoFim: txt_(l.PERIODO_FIM),
          totalLancamentos: Number(l.TOTAL_LANCAMENTOS || 0),
          somaDebitos: Math.round(num_(l.SOMA_DEBITOS) * 100) / 100,
          somaCreditos: Math.round(num_(l.SOMA_CREDITOS) * 100) / 100,
          saldoLiquido: Math.round(num_(l.SALDO_LIQUIDO) * 100) / 100,
          status: txt_(l.STATUS_LOTE || l.STATUS),
          importadoEm: txt_(l.IMPORTADO_EM || l.CRIADO_EM),
          observacoes: txt_(l.OBSERVACOES)
        };
      });
      r.extratosPorLote = porLote;

      var mapaLoteId = mapaContagemB39_(lotesFin1117, function(l) { return l.LOTE_ID; });
      var mapaChaveLote = mapaContagemB39_(lotesFin1117, function(l) { return l.CHAVE_LOTE || l.ARQUIVO_HASH; });
      var mapaChaveExtrato = mapaContagemB39_(extratos, function(e) { return e.CHAVE_DUPLICIDADE; });
      r.chaves.lotes = r.lotesExistentes.map(function(l) {
        return { loteId: l.loteId, chaveLote: l.chaveLote, arquivoHash: l.arquivoHash };
      });
      r.chaves.loteIdRepetidos = repetidosB39_(mapaLoteId);
      r.chaves.chavesLoteRepetidas = repetidosB39_(mapaChaveLote);
      r.chaves.chavesExtratoRepetidas = repetidosB39_(mapaChaveExtrato);
      r.resumo.duplicidadesLoteId = r.chaves.loteIdRepetidos.length;
      r.resumo.duplicidadesChaveLote = r.chaves.chavesLoteRepetidas.length;
      r.resumo.duplicidadesExtrato = r.chaves.chavesExtratoRepetidas.length;

      var basePayload = validarProd_("RECONSTRUCAO_PAYLOAD_APROVADO_B36_B37_PARA_B39_SEM_GRAVAR", true);
      basePayload.bloqueios = [];
      basePayload.avisos = [];
      var pacote = lerEntradaFlash_(ss, basePayload);
      r.payloadAprovadoB36B37 = {
        entrada: pacote.entrada,
        leitura: pacote.leitura,
        cartoes: pacote.cartoes,
        chaveLote: pacote.chaveLote,
        bloqueiosReconstrucao: basePayload.bloqueios,
        avisosReconstrucao: basePayload.avisos,
        amostra: pacote.amostra
      };
      r.comparacaoPayloadVsB38 = compararPayloadB39_(pacote, lotesFin1117, porLote);
      r.resumo.divergenciasPayloadVsGravacao = r.comparacaoPayloadVsB38.divergencias.length;
      r.logsRelacionados = logsRelacionadosB39_(ss);

      if (r.resumo.lotesFin1117 < 1 || r.resumo.extratosFin1117 < 1) r.bloqueios.push("IMPORTACAO_B38_FIN1117_NAO_ENCONTRADA");
      if (r.resumo.duplicidadesLoteId > 0) r.bloqueios.push("DUPLICIDADE_LOTE_ID_FLASH");
      if (r.resumo.duplicidadesChaveLote > 0) r.bloqueios.push("DUPLICIDADE_CHAVE_LOTE_FLASH");
      if (r.resumo.duplicidadesExtrato > 0) r.bloqueios.push("DUPLICIDADE_CHAVE_EXTRATO_FLASH");
      if (r.resumo.divergenciasPayloadVsGravacao > 0) r.bloqueios.push("DIVERGENCIA_PAYLOAD_B36_B37_VS_GRAVACAO_B38");
      if (basePayload.bloqueios.length) r.avisos.push("PAYLOAD_B36_B37_RECONSTRUIDO_COM_BLOQUEIOS: " + basePayload.bloqueios.join("|"));
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    return log_(r);
  }

  function normalizarHeaderB392_(v) {
    return txt_(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function localizarColunaB392_(headers, aliases) {
    var normalizados = headers.map(function(h) { return normalizarHeaderB392_(h); });
    for (var i = 0; i < aliases.length; i++) {
      var alvo = normalizarHeaderB392_(aliases[i]);
      for (var j = 0; j < normalizados.length; j++) {
        var atual = normalizados[j];
        if (!atual || !alvo) continue;
        if (atual === alvo || atual.indexOf(alvo) >= 0 || alvo.indexOf(atual) >= 0) return j;
      }
    }
    return -1;
  }

  function valorMonetarioB392_(v) {
    if (typeof v === "number") return { ok: !isNaN(v), valor: isNaN(v) ? 0 : Math.round(v * 100) / 100, motivo: isNaN(v) ? "VALOR_INVALIDO" : "" };
    var s = txt_(v).replace(/R\$/gi, "").replace(/\s/g, "").replace(/[^\d,.-]/g, "");
    if (!s) return { ok: false, valor: 0, motivo: "VALOR_VAZIO" };
    var negativo = s.charAt(0) === "-";
    s = s.replace(/-/g, "");
    var temVirgula = s.indexOf(",") >= 0;
    var temPonto = s.indexOf(".") >= 0;
    if (temVirgula && temPonto) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (temVirgula) {
      s = s.replace(/\./g, "").replace(",", ".");
    }
    var n = Number(s);
    if (isNaN(n)) return { ok: false, valor: 0, motivo: "VALOR_INVALIDO" };
    if (negativo) n = n * -1;
    return { ok: true, valor: Math.round(n * 100) / 100, motivo: "" };
  }

  function pad2B392_(n) {
    return ("0" + n).slice(-2);
  }

  function dataSerialB392_(n) {
    var base = new Date(Date.UTC(1899, 11, 30));
    var d = new Date(base.getTime() + Math.round(Number(n) * 86400000));
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  function dataInfoB392_(valor, display) {
    var bruto = txt_(display || valor);
    var d = null;
    var status = "INVALIDA";
    var motivo = "DATA_VAZIA";
    if (Object.prototype.toString.call(valor) === "[object Date]" && !isNaN(valor.getTime())) {
      d = valor;
      status = "VALIDA";
      motivo = "DATE_OBJECT";
    } else if (typeof valor === "number" && valor > 20000 && valor < 80000) {
      d = dataSerialB392_(valor);
      status = "VALIDA";
      motivo = "SERIAL_PLANILHA";
    } else {
      var s = txt_(display || valor);
      if (s) {
        var mBr = s.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
        var mIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
        if (mBr) {
          var dia = Number(mBr[1]);
          var mes = Number(mBr[2]);
          var ano = Number(mBr[3]);
          if (ano < 100) ano += 2000;
          if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
            d = new Date(ano, mes - 1, dia, Number(mBr[4] || 0), Number(mBr[5] || 0), 0);
            if (d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia) {
              status = "VALIDA";
              motivo = "BR_DD_MM_YYYY";
            } else {
              motivo = "DATA_BR_INEXISTENTE";
            }
          } else {
            motivo = "DATA_BR_FORA_DE_FAIXA";
          }
        } else if (mIso) {
          var anoIso = Number(mIso[1]);
          var mesIso = Number(mIso[2]);
          var diaIso = Number(mIso[3]);
          if (mesIso >= 1 && mesIso <= 12 && diaIso >= 1 && diaIso <= 31) {
            d = new Date(anoIso, mesIso - 1, diaIso, Number(mIso[4] || 0), Number(mIso[5] || 0), 0);
            if (d.getFullYear() === anoIso && d.getMonth() === mesIso - 1 && d.getDate() === diaIso) {
              status = "VALIDA";
              motivo = "ISO_YYYY_MM_DD";
            } else {
              motivo = "DATA_ISO_INEXISTENTE";
            }
          } else {
            motivo = "DATA_ISO_FORA_DE_FAIXA";
          }
        } else if (/^[A-Z][a-z]{2}\s[A-Z][a-z]{2}\s\d{1,2}\s\d{4}/.test(s)) {
          var js = new Date(s);
          if (!isNaN(js.getTime())) {
            d = js;
            status = "VALIDA";
            motivo = "JS_DATE_STRING";
          } else {
            motivo = "JS_DATE_STRING_INVALIDA";
          }
        } else {
          motivo = "FORMATO_DATA_NAO_RECONHECIDO";
        }
      }
    }
    return {
      dataBruta: bruto,
      dataNormalizada: d ? Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm") : "",
      dataDia: d ? Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd") : "",
      timestamp: d ? d.getTime() : null,
      statusData: status,
      motivo: motivo
    };
  }

  function resumoDatasB392_() {
    return { menorDataNormalizada: "", maiorDataNormalizada: "", datasValidas: 0, datasInvalidasOuAmbiguas: 0 };
  }

  function acumularDataB392_(resumo, info) {
    if (info && info.statusData === "VALIDA" && info.dataNormalizada) {
      resumo.datasValidas++;
      if (!resumo.menorDataNormalizada || info.dataNormalizada < resumo.menorDataNormalizada) resumo.menorDataNormalizada = info.dataNormalizada;
      if (!resumo.maiorDataNormalizada || info.dataNormalizada > resumo.maiorDataNormalizada) resumo.maiorDataNormalizada = info.dataNormalizada;
    } else {
      resumo.datasInvalidasOuAmbiguas++;
    }
  }

  function cartaoInfoB392_(v) {
    var bruto = txt_(v);
    var digitos = bruto.replace(/\D/g, "");
    return {
      bruto: bruto,
      finalCartao: digitos,
      possui3Digitos: digitos.length === 3,
      valido: digitos.length === 4
    };
  }

  function simplificarTextoB392_(v) {
    return normalizarHeaderB392_(v).replace(/\s/g, "");
  }

  function chaveComparacaoB392_(dataDia, valor, descricao, cartaoFinal) {
    return [txt_(dataDia), String(Math.round(num_(valor) * 100)), simplificarTextoB392_(descricao), txt_(cartaoFinal)].join("|");
  }

  function classificarTmpB392_(linha, displays, idx, linhaTmp) {
    var data = idx.data >= 0 ? dataInfoB392_(linha[idx.data], displays[idx.data]) : dataInfoB392_("", "");
    var valorInfo = idx.valor >= 0 ? valorMonetarioB392_(linha[idx.valor]) : { ok: false, valor: 0, motivo: "COLUNA_VALOR_AUSENTE" };
    var descricao = idx.descricao >= 0 ? txt_(linha[idx.descricao]) : "";
    var colaborador = idx.pessoa >= 0 ? txt_(linha[idx.pessoa]) : "";
    var cartao = idx.cartao >= 0 ? cartaoInfoB392_(linha[idx.cartao]) : cartaoInfoB392_("");
    var motivos = [];
    var classe = "VALIDA";
    if (idx.data < 0 || idx.valor < 0 || idx.cartao < 0) motivos.push("INVALIDA_COLUNA_OBRIGATORIA");
    if (cartao.possui3Digitos) motivos.push("INVALIDA_CARTAO_FINAL_3_DIGITOS");
    if (!cartao.valido && !cartao.possui3Digitos) motivos.push("INVALIDA_COLUNA_OBRIGATORIA");
    if (data.statusData !== "VALIDA") motivos.push("INVALIDA_DATA");
    if (!valorInfo.ok || valorInfo.valor === 0) motivos.push("INVALIDA_VALOR");
    if (motivos.length) classe = motivos[0];
    return {
      linhaTmp: linhaTmp,
      classe: classe,
      motivos: motivos,
      dataBruta: data.dataBruta,
      dataNormalizada: data.dataNormalizada,
      dataDia: data.dataDia,
      statusData: data.statusData,
      motivoData: data.motivo,
      descricao: descricao,
      valor: valorInfo.valor,
      colaborador: colaborador,
      cartaoFinal: cartao.finalCartao,
      cartaoBruto: cartao.bruto,
      chaveComparacao: chaveComparacaoB392_(data.dataDia, valorInfo.valor, descricao, cartao.finalCartao)
    };
  }

  function indiceExtratosB392_(extratos) {
    var porLinhaOrigem = {};
    var porChave = {};
    extratos.forEach(function(e) {
      var linhaOrigem = Number(e.LINHA_ORIGEM || 0);
      var data = dataInfoB392_(e.DATA_TRANSACAO || e.DATA, e.DATA_TRANSACAO || e.DATA);
      var valor = valorMonetarioB392_(e.VALOR !== undefined && e.VALOR !== "" ? e.VALOR : e.VALOR_TRANSACAO).valor;
      var desc = txt_(e.ESTABELECIMENTO_EXTRATO || e.ESTABELECIMENTO || e.DESCRICAO);
      var cartao = cartaoInfoB392_(e.CARTAO_FINAL || e.CARTAO_ID);
      var chave = chaveComparacaoB392_(data.dataDia, valor, desc, cartao.finalCartao);
      var resumo = {
        linhaExtrato: e.__linha,
        loteId: txt_(e.LOTE_ID || e.IMPORTACAO_ID),
        dataInfo: data,
        valor: valor,
        descricao: desc,
        colaborador: txt_(e.PESSOA || e.PORTADOR),
        cartaoFinal: cartao.finalCartao,
        chaveComparacao: chave
      };
      if (linhaOrigem) porLinhaOrigem[linhaOrigem] = resumo;
      if (chave && !porChave[chave]) porChave[chave] = resumo;
    });
    return { porLinhaOrigem: porLinhaOrigem, porChave: porChave };
  }

  function AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_2_RESUMO_SEM_GRAVAR() {
    var r = validarProd_("AUDITORIA_IMPORTACAO_FLASH_PRODUCAO_B39_2_RESUMO_SEM_GRAVAR", true);
    r.incidente = "B38";
    r.db = { DB_FIN_ID: r.DB_FIN_ID, dbFinIdDiferenteDev: r.dbFinIdDiferenteDev };
    r.proibicoes = ["NAO_IMPORTAR", "NAO_CONCILIAR", "NAO_CORRIGIR", "NAO_APAGAR", "NAO_REIMPORTAR"];
    r.resumo = {
      tmpTotal: 0,
      tmpValidas: 0,
      tmpInvalidas: 0,
      extratosGravados: 0,
      valorTmpTotal: 0,
      valorTmpValidas: 0,
      valorTmpInvalidas: 0,
      valorGravado: 0,
      invalidasEncontradasNosExtratos: 0,
      divergenciasCriticas: 0
    };
    r.loteB38 = {
      encontrado: false,
      loteId: "LOTE-FLASH-20260615-163548",
      status: "",
      totalLancamentos: 0,
      saldoLiquido: 0,
      periodoInicioBruto: "",
      periodoFimBruto: "",
      periodoInicioNormalizado: "",
      periodoFimNormalizado: "",
      statusPeriodo: "NAO_AVALIADO"
    };
    r.datas = { tmp: resumoDatasB392_(), extratos: resumoDatasB392_(), lote: {} };
    r.invalidas = [];
    r.totalInvalidas = 0;
    r.divergencias = [];
    r.totalDivergencias = 0;
    r.amostrasDivergencias = [];
    r.logsRelacionados = { existe: false, linhasDados: 0 };
    r.decisaoSugerida = "D_INVESTIGACAO_COMPLEMENTAR";
    r.proximaEtapa = "Nao executar conciliacao nem nova importacao. Criar B40 conforme resultado.";

    try {
      var ss = abrirPlanilha_(r);
      if (!ss) {
        r.success = false;
        r.ok = false;
        return log_(r);
      }

      var shTmp = ss.getSheetByName(ABA_TMP_FLASH);
      var shLotes = ss.getSheetByName(ABA_LOTES);
      var shExtratos = ss.getSheetByName(ABA_EXTRATOS);
      var shLogs = ss.getSheetByName("FIN_CARTOES_LOGS");
      if (!shTmp) r.bloqueios.push("ABA_TMP_IMPORT_EXTRATO_FLASH_AUSENTE");
      if (!shLotes) r.bloqueios.push("ABA_FIN_LOTES_EXTRATO_FLASH_AUSENTE");
      if (!shExtratos) r.bloqueios.push("ABA_FIN_CARTOES_EXTRATOS_AUSENTE");
      if (r.bloqueios.length) {
        r.success = false;
        r.ok = false;
        return log_(r);
      }
      r.logsRelacionados = { existe: !!shLogs, linhasDados: shLogs ? Math.max(0, shLogs.getLastRow() - 1) : 0 };

      var tmpValores = shTmp.getLastRow() > 0 && shTmp.getLastColumn() > 0
        ? shTmp.getRange(1, 1, shTmp.getLastRow(), shTmp.getLastColumn()).getValues()
        : [];
      var tmpDisplays = shTmp.getLastRow() > 0 && shTmp.getLastColumn() > 0
        ? shTmp.getRange(1, 1, shTmp.getLastRow(), shTmp.getLastColumn()).getDisplayValues()
        : [];
      var headersTmp = tmpValores.length ? tmpValores[0].map(function(h) { return txt_(h); }) : [];
      var idxTmp = {
        data: localizarColunaB392_(headersTmp, ["DATA", "DATA_TRANSACAO", "DATA DA TRANSACAO", "DATA/HORA"]),
        descricao: localizarColunaB392_(headersTmp, ["DESCRICAO", "ESTABELECIMENTO", "HISTORICO", "MOVIMENTACAO"]),
        valor: localizarColunaB392_(headersTmp, ["VALOR", "VALOR_TRANSACAO", "VALOR R$"]),
        pessoa: localizarColunaB392_(headersTmp, ["PESSOA", "COLABORADOR", "PORTADOR", "NOME"]),
        cartao: localizarColunaB392_(headersTmp, ["CARTAO_FINAL", "FINAL CARTAO", "FINAL DO CARTAO", "CARTAO"])
      };

      var tmpClassificada = [];
      for (var i = 1; i < tmpValores.length; i++) {
        var preenchida = tmpValores[i].some(function(c) { return txt_(c) !== ""; });
        if (!preenchida) continue;
        var itemTmp = classificarTmpB392_(tmpValores[i], tmpDisplays[i], idxTmp, i + 1);
        tmpClassificada.push(itemTmp);
        r.resumo.tmpTotal++;
        r.resumo.valorTmpTotal += itemTmp.valor;
        acumularDataB392_(r.datas.tmp, { statusData: itemTmp.statusData, dataNormalizada: itemTmp.dataNormalizada });
        if (itemTmp.classe === "VALIDA") {
          r.resumo.tmpValidas++;
          r.resumo.valorTmpValidas += itemTmp.valor;
        } else {
          r.resumo.tmpInvalidas++;
          r.resumo.valorTmpInvalidas += itemTmp.valor;
        }
      }
      r.resumo.valorTmpTotal = Math.round(r.resumo.valorTmpTotal * 100) / 100;
      r.resumo.valorTmpValidas = Math.round(r.resumo.valorTmpValidas * 100) / 100;
      r.resumo.valorTmpInvalidas = Math.round(r.resumo.valorTmpInvalidas * 100) / 100;

      var lotes = anexarLinhasB39_(objetos_(shLotes).items);
      var lote = null;
      for (var l = 0; l < lotes.length; l++) {
        if (txt_(lotes[l].LOTE_ID) === "LOTE-FLASH-20260615-163548") {
          lote = lotes[l];
          break;
        }
      }
      if (lote) {
        var periodoInicioInfo = dataInfoB392_(lote.PERIODO_INICIO, lote.PERIODO_INICIO);
        var periodoFimInfo = dataInfoB392_(lote.PERIODO_FIM, lote.PERIODO_FIM);
        r.loteB38.encontrado = true;
        r.loteB38.status = txt_(lote.STATUS_LOTE || lote.STATUS);
        r.loteB38.totalLancamentos = Number(lote.TOTAL_LANCAMENTOS || 0);
        r.loteB38.saldoLiquido = Math.round(num_(lote.SALDO_LIQUIDO) * 100) / 100;
        r.loteB38.periodoInicioBruto = txt_(lote.PERIODO_INICIO);
        r.loteB38.periodoFimBruto = txt_(lote.PERIODO_FIM);
        r.loteB38.periodoInicioNormalizado = periodoInicioInfo.dataNormalizada;
        r.loteB38.periodoFimNormalizado = periodoFimInfo.dataNormalizada;
        r.loteB38.statusPeriodo = (periodoInicioInfo.statusData === "VALIDA" && periodoFimInfo.statusData === "VALIDA") ? "LEGIVEL" : "DIVERGENTE_OU_CORROMPIDO";
        r.datas.lote = {
          periodoInicioBruto: r.loteB38.periodoInicioBruto,
          periodoFimBruto: r.loteB38.periodoFimBruto,
          periodoInicioNormalizado: r.loteB38.periodoInicioNormalizado,
          periodoFimNormalizado: r.loteB38.periodoFimNormalizado,
          statusInicio: periodoInicioInfo.statusData,
          statusFim: periodoFimInfo.statusData,
          motivoInicio: periodoInicioInfo.motivo,
          motivoFim: periodoFimInfo.motivo,
          statusPeriodo: r.loteB38.statusPeriodo
        };
      } else {
        r.divergencias.push({ tipo: "LOTE_B38_NAO_ENCONTRADO", severidade: "ALTA", detalhe: "Lote LOTE-FLASH-20260615-163548 nao localizado em FIN_LOTES_EXTRATO_FLASH." });
      }

      var extratos = anexarLinhasB39_(objetos_(shExtratos).items).filter(function(e) {
        return txt_(e.LOTE_ID || e.IMPORTACAO_ID) === "LOTE-FLASH-20260615-163548";
      });
      var indiceExtratos = indiceExtratosB392_(extratos);
      r.resumo.extratosGravados = extratos.length;
      extratos.forEach(function(e) {
        var dataEx = dataInfoB392_(e.DATA_TRANSACAO || e.DATA, e.DATA_TRANSACAO || e.DATA);
        var valorEx = valorMonetarioB392_(e.VALOR !== undefined && e.VALOR !== "" ? e.VALOR : e.VALOR_TRANSACAO).valor;
        r.resumo.valorGravado += valorEx;
        acumularDataB392_(r.datas.extratos, dataEx);
      });
      r.resumo.valorGravado = Math.round(r.resumo.valorGravado * 100) / 100;

      tmpClassificada.forEach(function(item) {
        if (item.classe === "VALIDA") return;
        r.totalInvalidas++;
        var match = indiceExtratos.porLinhaOrigem[item.linhaTmp] || indiceExtratos.porChave[item.chaveComparacao] || null;
        if (match) r.resumo.invalidasEncontradasNosExtratos++;
        if (r.invalidas.length < 10) {
          r.invalidas.push({
            linhaTmp: item.linhaTmp,
            linhaExtrato: match ? match.linhaExtrato : null,
            encontradaNoExtrato: !!match,
            motivo: item.motivos.join("|") || item.classe,
            dataBruta: item.dataBruta,
            dataNormalizada: item.dataNormalizada,
            statusData: item.statusData,
            descricao: item.descricao,
            valor: item.valor,
            colaborador: item.colaborador,
            cartaoFinal: item.cartaoFinal,
            chaveComparacao: item.chaveComparacao,
            sugestao: match ? "ISOLAR_EXTRATO_INVALIDO" : "RECLASSIFICAR_SE_VALIDACAO_ESTAVA_ERRADA"
          });
        }
      });

      if (r.resumo.tmpTotal !== 49) r.divergencias.push({ tipo: "TMP_TOTAL_DIFERENTE_DO_ESPERADO_B39", severidade: "MEDIA", detalhe: "TMP possui " + r.resumo.tmpTotal + " linhas preenchidas." });
      if (r.resumo.tmpValidas !== 46) r.divergencias.push({ tipo: "TMP_VALIDAS_DIFERENTE_B36_B37", severidade: "ALTA", detalhe: "B36/B37 esperavam 46 validas; B39.2 classificou " + r.resumo.tmpValidas + "." });
      if (r.resumo.extratosGravados !== r.resumo.tmpValidas) r.divergencias.push({ tipo: "B38_GRAVOU_QUANTIDADE_DIFERENTE_DAS_VALIDAS", severidade: "ALTA", detalhe: "Extratos gravados: " + r.resumo.extratosGravados + "; validas esperadas: " + r.resumo.tmpValidas + "." });
      if (r.resumo.invalidasEncontradasNosExtratos > 0) r.divergencias.push({ tipo: "INVALIDAS_FORAM_GRAVADAS", severidade: "ALTA", detalhe: r.resumo.invalidasEncontradasNosExtratos + " linhas invalidas da TMP aparecem nos extratos gravados." });
      if (r.datas.extratos.datasInvalidasOuAmbiguas > 0 || r.loteB38.statusPeriodo !== "LEGIVEL") r.divergencias.push({ tipo: "DATAS_GRAVADAS_DIVERGENTES_OU_CORROMPIDAS", severidade: "ALTA", detalhe: "Ha datas invalidas/ambiguas nos extratos ou periodo do lote." });
      if (Math.round(r.resumo.valorGravado * 100) !== Math.round(720.79 * 100)) r.divergencias.push({ tipo: "VALOR_GRAVADO_DIFERE_B39", severidade: "ALTA", detalhe: "Valor gravado calculado: " + r.resumo.valorGravado + "." });
      if (!r.loteB38.encontrado) r.bloqueios.push("LOTE_B38_NAO_ENCONTRADO");

      r.totalDivergencias = r.divergencias.length;
      r.amostrasDivergencias = r.divergencias.slice(0, 10);
      r.resumo.divergenciasCriticas = r.divergencias.filter(function(d) { return d.severidade === "ALTA"; }).length;
      r.decisaoSugerida = r.resumo.divergenciasCriticas > 0 ? "B_CORRECAO_CONTROLADA" : "D_INVESTIGACAO_COMPLEMENTAR";
      r.bloqueios = r.bloqueios.concat(r.divergencias.filter(function(d) { return d.severidade === "ALTA"; }).map(function(d) { return d.tipo; }));
      r.success = true;
      r.ok = r.bloqueios.length === 0 && r.resumo.divergenciasCriticas === 0;
    } catch (e) {
      r.bloqueios.push("ERRO_TECNICO_B39_2: " + (e && e.message ? e.message : String(e)));
      r.success = false;
      r.ok = false;
    }
    return log_(r);
  }

  function reclassificarRegraB36B37_(ss, base) {
    var pacote = lerEntradaFlash_(ss, base);
    var grupos = { validasAmostra: [], avisosAmostra: [], invalidasAmostra: [], bloqueiosAmostra: [] };
    var resumo = {
      tmpTotal: 0,
      validas: 0,
      avisos: 0,
      invalidas: 0,
      bloqueios: 0,
      valorValidas: 0,
      valorAvisos: 0,
      valorInvalidas: 0,
      valorTotal: 0
    };
    var cartoesCom3Linhas = {};
    (pacote.registros || []).forEach(function(reg) {
      var cartaoInfo = cartaoFlash_(reg.cartaoFinal);
      var dataOk = !!reg.dataNormalizada;
      var valorOk = num_(reg.valor) !== 0;
      var validoPelaRegraB36 = dataOk && valorOk && cartaoInfo.valido;
      var item = {
        linhaTmp: reg.linha,
        dataNormalizada: reg.dataNormalizada,
        descricao: reg.descricao,
        valor: Math.round(num_(reg.valor) * 100) / 100,
        colaborador: reg.pessoa,
        cartaoFinal: reg.cartaoFinal,
        classificacaoB36B37: validoPelaRegraB36 ? "VALIDA" : "INVALIDA",
        avisos: [],
        motivos: []
      };
      resumo.tmpTotal++;
      resumo.valorTotal += item.valor;
      if (cartaoInfo.com3Digitos) {
        item.avisos.push("CARTAO_FINAL_COM_3_DIGITOS");
        cartoesCom3Linhas[reg.linha] = true;
      }
      if (!dataOk) item.motivos.push("DATA_INVALIDA");
      if (!valorOk) item.motivos.push("VALOR_INVALIDO_OU_ZERO");
      if (!cartaoInfo.valido) item.motivos.push("CARTAO_FINAL_INVALIDO");
      if (validoPelaRegraB36) {
        resumo.validas++;
        resumo.valorValidas += item.valor;
        if (grupos.validasAmostra.length < 10) grupos.validasAmostra.push(item);
        if (item.avisos.length) {
          resumo.avisos++;
          resumo.valorAvisos += item.valor;
          if (grupos.avisosAmostra.length < 10) grupos.avisosAmostra.push(item);
        }
      } else {
        resumo.invalidas++;
        resumo.valorInvalidas += item.valor;
        if (grupos.invalidasAmostra.length < 10) grupos.invalidasAmostra.push(item);
      }
    });
    resumo.valorTotal = Math.round(resumo.valorTotal * 100) / 100;
    resumo.valorValidas = Math.round(resumo.valorValidas * 100) / 100;
    resumo.valorAvisos = Math.round(resumo.valorAvisos * 100) / 100;
    resumo.valorInvalidas = Math.round(resumo.valorInvalidas * 100) / 100;
    return {
      pacote: pacote,
      resumo: resumo,
      grupos: grupos,
      cartoesCom3Linhas: Object.keys(cartoesCom3Linhas).length
    };
  }

  function AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_3_REGRA_B36_B37_SEM_GRAVAR() {
    var r = validarProd_("AUDITORIA_IMPORTACAO_FLASH_PRODUCAO_B39_3_REGRA_B36_B37_SEM_GRAVAR", true);
    r.incidente = "B38";
    r.db = { DB_FIN_ID: r.DB_FIN_ID, dbFinIdDiferenteDev: r.dbFinIdDiferenteDev };
    r.resumoB39_2 = { tmpTotal: 49, tmpValidasB39_2: 0, tmpInvalidasB39_2: 49 };
    r.regraB36B37 = {
      encontrada: true,
      funcoesReferencia: [
        "DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR",
        "PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR",
        "dryRun_",
        "lerEntradaFlash_",
        "cartaoFlash_",
        "normalizarDataFlash_"
      ],
      descricaoRegra: "B36/B37 usam dryRun_ -> lerEntradaFlash_. Linha valida quando data normalizada ok e dentro do periodo esperado, valor diferente de zero e cartaoFlash_.valido true.",
      criterioCartaoFinal3Digitos: "cartaoFlash_ considera final com 3 digitos valido; com3Digitos gera aviso CARTAO_FINAL_COM_3_DIGITOS, nao bloqueio automatico.",
      criterioValido: "idxData >= 0, dataInfo.ok, !dataInfo.foraPeriodoEsperado, idxValor >= 0, valor !== 0 e cartaoInfo.valido.",
      criterioAviso: "cartaoInfo.com3Digitos adiciona aviso CARTAO_FINAL_COM_3_DIGITOS; datas fora do periodo adicionam aviso DATA_FORA_DO_PERIODO_ESPERADO.",
      criterioBloqueio: "Menos de 1 registro valido, duplicidade de lote ou mais de 3 datas fora do periodo esperado bloqueiam o fluxo."
    };
    r.reclassificacaoB36B37 = {
      tmpTotal: 0,
      validas: 0,
      avisos: 0,
      invalidas: 0,
      bloqueios: 0,
      valorValidas: 0,
      valorAvisos: 0,
      valorInvalidas: 0,
      valorTotal: 0
    };
    r.comparacaoComEsperado = {
      esperadoValidas: 46,
      esperadoInvalidasOuAvisos: 3,
      bateComB36B37: false,
      diferencaValidas: 0,
      diferencaInvalidasOuAvisos: 0
    };
    r.grupos = { validasAmostra: [], avisosAmostra: [], invalidasAmostra: [], bloqueiosAmostra: [] };
    r.extratosGravados = { total: 0, encontradosDasValidas: 0, encontradosDosAvisos: 0, encontradosDasInvalidas: 0 };
    r.datas = {
      tmpPeriodoCorreto: { inicio: "", fim: "" },
      gravacaoCorrompida: false
    };
    r.conclusao = {
      classificacaoB39_2EstavaRigida: false,
      podeProsseguirParaB40: false,
      tipoB40Sugerido: "NAO_DECIDIDO"
    };
    r.proximaEtapa = "Nao executar B40 ainda se a regra nao reproduzir 46/3. Revisar JSON da B39.3 e decidir proxima auditoria/correcao controlada.";

    try {
      var ss = abrirPlanilha_(r);
      if (!ss) {
        r.success = false;
        r.ok = false;
        return log_(r);
      }
      var shTmp = ss.getSheetByName(ABA_TMP_FLASH);
      var shLotes = ss.getSheetByName(ABA_LOTES);
      var shExtratos = ss.getSheetByName(ABA_EXTRATOS);
      if (!shTmp) r.bloqueios.push("ABA_TMP_IMPORT_EXTRATO_FLASH_AUSENTE");
      if (!shLotes) r.bloqueios.push("ABA_FIN_LOTES_EXTRATO_FLASH_AUSENTE");
      if (!shExtratos) r.bloqueios.push("ABA_FIN_CARTOES_EXTRATOS_AUSENTE");
      if (r.bloqueios.length) {
        r.success = false;
        r.ok = false;
        return log_(r);
      }

      var baseRegra = validarProd_("RECONSTRUCAO_REGRA_B36_B37_B39_3_SEM_GRAVAR", true);
      baseRegra.bloqueios = [];
      baseRegra.avisos = [];
      var rec = reclassificarRegraB36B37_(ss, baseRegra);
      r.reclassificacaoB36B37 = rec.resumo;
      r.grupos = rec.grupos;
      r.datas.tmpPeriodoCorreto.inicio = rec.pacote.leitura.periodoInicial;
      r.datas.tmpPeriodoCorreto.fim = rec.pacote.leitura.periodoFinal;
      r.avisos = r.avisos.concat(baseRegra.avisos || []);

      var extratos = anexarLinhasB39_(objetos_(shExtratos).items).filter(function(e) {
        return txt_(e.LOTE_ID || e.IMPORTACAO_ID) === "LOTE-FLASH-20260615-163548";
      });
      var indiceExtratos = indiceExtratosB392_(extratos);
      r.extratosGravados.total = extratos.length;
      function contaEncontrados(lista) {
        var total = 0;
        lista.forEach(function(item) {
          var chave = chaveComparacaoB392_(txt_(item.dataNormalizada).slice(0, 10), item.valor, item.descricao, item.cartaoFinal);
          if (indiceExtratos.porLinhaOrigem[item.linhaTmp] || indiceExtratos.porChave[chave]) total++;
        });
        return total;
      }
      r.extratosGravados.encontradosDasValidas = contaEncontrados(r.grupos.validasAmostra);
      r.extratosGravados.encontradosDosAvisos = contaEncontrados(r.grupos.avisosAmostra);
      r.extratosGravados.encontradosDasInvalidas = contaEncontrados(r.grupos.invalidasAmostra);

      var lote = null;
      anexarLinhasB39_(objetos_(shLotes).items).forEach(function(l) {
        if (txt_(l.LOTE_ID) === "LOTE-FLASH-20260615-163548") lote = l;
      });
      var dataExResumo = resumoDatasB392_();
      extratos.forEach(function(e) {
        acumularDataB392_(dataExResumo, dataInfoB392_(e.DATA_TRANSACAO || e.DATA, e.DATA_TRANSACAO || e.DATA));
      });
      var loteInicio = lote ? dataInfoB392_(lote.PERIODO_INICIO, lote.PERIODO_INICIO) : dataInfoB392_("", "");
      var loteFim = lote ? dataInfoB392_(lote.PERIODO_FIM, lote.PERIODO_FIM) : dataInfoB392_("", "");
      r.datas.gravacaoCorrompida = dataExResumo.datasInvalidasOuAmbiguas > 0 || loteInicio.statusData !== "VALIDA" || loteFim.statusData !== "VALIDA";

      var invalidasOuAvisos = r.reclassificacaoB36B37.invalidas + r.reclassificacaoB36B37.avisos;
      r.comparacaoComEsperado.diferencaValidas = r.reclassificacaoB36B37.validas - r.comparacaoComEsperado.esperadoValidas;
      r.comparacaoComEsperado.diferencaInvalidasOuAvisos = invalidasOuAvisos - r.comparacaoComEsperado.esperadoInvalidasOuAvisos;
      r.comparacaoComEsperado.bateComB36B37 = r.comparacaoComEsperado.diferencaValidas === 0 && r.comparacaoComEsperado.diferencaInvalidasOuAvisos === 0;

      r.conclusao.classificacaoB39_2EstavaRigida = r.resumoB39_2.tmpInvalidasB39_2 === 49 && r.reclassificacaoB36B37.validas > 0;
      if (r.comparacaoComEsperado.bateComB36B37) {
        r.conclusao.podeProsseguirParaB40 = true;
        r.conclusao.tipoB40Sugerido = r.datas.gravacaoCorrompida ? "CORRIGIR_DATAS_E_METADADOS" : "ISOLAR_3_INVALIDAS";
        r.proximaEtapa = "Preparar B40 de correcao controlada conforme tipoB40Sugerido. Nao executar conciliacao nem nova importacao.";
      } else {
        r.conclusao.podeProsseguirParaB40 = false;
        r.conclusao.tipoB40Sugerido = "INVESTIGAR_MAIS";
        r.bloqueios.push("REGRA_B36_B37_ATUAL_NAO_REPRODUZ_MEMORIA_46_3");
        r.proximaEtapa = "Nao executar B40 ainda. Rastrear logs/evidencias do resultado B36/B37 que informou 46 validos e 3 invalidos/avisos.";
      }
      if (!r.regraB36B37.encontrada) r.bloqueios.push("REGRA_B36_B37_NAO_ENCONTRADA");
      r.success = true;
      r.ok = r.bloqueios.length === 0 && r.comparacaoComEsperado.bateComB36B37;
    } catch (e) {
      r.bloqueios.push("ERRO_TECNICO_B39_3: " + (e && e.message ? e.message : String(e)));
      r.success = false;
      r.ok = false;
    }
    return log_(r);
  }

  function previaConciliacao_() {
    var r = validarProd_("PREVIA_CONCILIACAO_FLASH_PRODUCAO_B310_SEM_GRAVAR", true);
    r.resumo = { extratosLidos: 0, lancamentosLidos: 0, matchesProvaveis: 0, semPrestacao: 0, divergencias: 0 };
    r.amostras = { matches: [], semPrestacao: [], divergencias: [] };
    r.proximaEtapa = "Se aprovado, executar CONCILIAR_FLASH_PRODUCAO_B311_AUTORIZADO";
    var ss = abrirPlanilha_(r);
    if (ss) {
      var extratos = objetos_(ss.getSheetByName(ABA_EXTRATOS)).items;
      var lancamentos = objetos_(ss.getSheetByName(ABA_LANCAMENTOS)).items;
      r.resumo.extratosLidos = extratos.length;
      r.resumo.lancamentosLidos = lancamentos.length;
      extratos.forEach(function(e) {
        var match = null;
        for (var i = 0; i < lancamentos.length; i++) {
          if (txt_(e.CARTAO_ID) && txt_(e.CARTAO_ID) === txt_(lancamentos[i].CARTAO_ID) && num_(e.VALOR) === num_(lancamentos[i].VALOR)) {
            match = lancamentos[i];
            break;
          }
        }
        if (match) {
          r.resumo.matchesProvaveis++;
          if (r.amostras.matches.length < 5) r.amostras.matches.push({ extratoId: txt_(e.EXTRATO_ID), lancamentoId: txt_(match.LANCAMENTO_ID || match.ID), valor: num_(e.VALOR) });
        } else {
          r.resumo.semPrestacao++;
          if (r.amostras.semPrestacao.length < 5) r.amostras.semPrestacao.push({ extratoId: txt_(e.EXTRATO_ID), valor: num_(e.VALOR), cartaoFinal: txt_(e.CARTAO_FINAL) });
        }
      });
      if (r.resumo.extratosLidos < 1) r.bloqueios.push("SEM_EXTRATOS_PARA_CONCILIAR");
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    return r;
  }

  function PREVIA_CONCILIACAO_FLASH_PRODUCAO_B310_SEM_GRAVAR() {
    return log_(previaConciliacao_());
  }

  function CONCILIAR_FLASH_PRODUCAO_B311_AUTORIZADO() {
    var r = previaConciliacao_();
    r.modo = "CONCILIACAO_FLASH_PRODUCAO_B311_AUTORIZADO";
    r.somenteLeitura = false;
    r.executado = false;
    r.gravacao = { conciliacoesGravadas: 0 };
    r.proximaEtapa = "Executar AUDITAR_CONCILIACAO_FLASH_PRODUCAO_B312_SEM_GRAVAR";
    if (typeof conciliarExtratoFlashTeste_FIN125 !== "function") r.bloqueios.push("ROTINA_CONCILIACAO_REAL_NAO_LOCALIZADA");
    r.bloqueios.push("ROTINA_CONCILIACAO_REAL_PRODUCAO_NAO_HOMOLOGADA");
    r.success = false;
    r.ok = false;
    return log_(r);
  }

  function AUDITAR_CONCILIACAO_FLASH_PRODUCAO_B312_SEM_GRAVAR() {
    var r = validarProd_("AUDITORIA_CONCILIACAO_FLASH_PRODUCAO_B312_SEM_GRAVAR", true);
    r.resumo = { conciliacoes: 0, divergencias: 0, naoConciliados: 0, extratos: 0, lancamentos: 0 };
    r.proximaEtapa = "Se aprovado, executar PREVIA_PENDENCIAS_FLASH_PRODUCAO_B313_SEM_GRAVAR";
    var ss = abrirPlanilha_(r);
    if (ss) {
      r.resumo.conciliacoes = objetos_(ss.getSheetByName(ABA_CONCILIACAO)).items.length;
      var extratos = objetos_(ss.getSheetByName(ABA_EXTRATOS)).items;
      var lanc = objetos_(ss.getSheetByName(ABA_LANCAMENTOS)).items;
      r.resumo.extratos = extratos.length;
      r.resumo.lancamentos = lanc.length;
      extratos.forEach(function(e) { if (txt_(e.CONCILIADO).toUpperCase() !== "SIM") r.resumo.naoConciliados++; });
      if (r.resumo.conciliacoes < 1 && r.resumo.extratos > 0) r.avisos.push("SEM_REGISTRO_CONCILIACAO");
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    return log_(r);
  }

  function previaPendencias_() {
    var r = validarProd_("PREVIA_PENDENCIAS_FLASH_PRODUCAO_B313_SEM_GRAVAR", true);
    r.resumo = { pendenciasPrevistas: 0, semComprovante: 0, semOS: 0, semPrestacao: 0, divergenciaValor: 0 };
    r.amostras = [];
    r.proximaEtapa = "Se aprovado, executar GERAR_PENDENCIAS_FLASH_PRODUCAO_B314_AUTORIZADO";
    var ss = abrirPlanilha_(r);
    if (ss) {
      var extratos = objetos_(ss.getSheetByName(ABA_EXTRATOS)).items;
      extratos.forEach(function(e) {
        if (txt_(e.CONCILIADO).toUpperCase() !== "SIM") {
          r.resumo.semPrestacao++;
          r.resumo.pendenciasPrevistas++;
          if (r.amostras.length < 10) r.amostras.push({ tipo: "SEM_PRESTACAO", extratoId: txt_(e.EXTRATO_ID), valor: num_(e.VALOR) });
        }
      });
      if (extratos.length < 1) r.bloqueios.push("SEM_EXTRATOS_PARA_PREVER_PENDENCIAS");
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    return r;
  }

  function PREVIA_PENDENCIAS_FLASH_PRODUCAO_B313_SEM_GRAVAR() {
    return log_(previaPendencias_());
  }

  function GERAR_PENDENCIAS_FLASH_PRODUCAO_B314_AUTORIZADO() {
    var r = previaPendencias_();
    r.modo = "GERACAO_PENDENCIAS_FLASH_PRODUCAO_B314_AUTORIZADO";
    r.somenteLeitura = false;
    r.executado = false;
    r.gravacao = { pendenciasGravadas: 0 };
    r.proximaEtapa = "Executar AUDITAR_FIN_FLASH_PRODUCAO_FINAL_B315_SEM_GRAVAR";
    if (typeof gerarPendenciasFlash_FIN132 !== "function") r.bloqueios.push("ROTINA_GERACAO_PENDENCIAS_NAO_LOCALIZADA");
    r.bloqueios.push("ROTINA_GERACAO_PENDENCIAS_PRODUCAO_NAO_HOMOLOGADA");
    r.success = false;
    r.ok = false;
    return log_(r);
  }

  function AUDITAR_FIN_FLASH_PRODUCAO_FINAL_B315_SEM_GRAVAR() {
    var r = validarProd_("AUDITORIA_FIN_FLASH_PRODUCAO_FINAL_B315_SEM_GRAVAR", true);
    r.statusFinal = "BLOQUEADO_COM_PENDENCIAS";
    r.resumo = { abas: {}, lotes: 0, extratos: 0, conciliacoes: 0, pendencias: 0, logs: 0, documentos: 0, headersEsperados: 330 };
    r.proximaEtapa = "Deploy WebApp producao somente apos aprovacao manual";
    var ss = abrirPlanilha_(r);
    if (ss) {
      [ABA_LOTES, ABA_EXTRATOS, ABA_CONCILIACAO, ABA_PENDENCIAS, "FIN_CARTOES_LOGS", "FIN_CARTOES_DOCUMENTOS"].forEach(function(nome) {
        r.resumo.abas[nome] = contarAba_(ss, nome);
      });
      r.resumo.lotes = r.resumo.abas[ABA_LOTES].linhasDados;
      r.resumo.extratos = r.resumo.abas[ABA_EXTRATOS].linhasDados;
      r.resumo.conciliacoes = r.resumo.abas[ABA_CONCILIACAO].linhasDados;
      r.resumo.pendencias = r.resumo.abas[ABA_PENDENCIAS].linhasDados;
      r.resumo.logs = r.resumo.abas.FIN_CARTOES_LOGS.linhasDados;
      r.resumo.documentos = r.resumo.abas.FIN_CARTOES_DOCUMENTOS.linhasDados;
      if (r.resumo.lotes > 0 && r.resumo.extratos > 0 && r.resumo.pendencias === 0) {
        r.statusFinal = "PRONTO_PARA_DEPLOY";
      } else {
        r.bloqueios.push("CADEIA_FLASH_PRODUCAO_INCOMPLETA");
      }
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
    return log_(r);
  }

  return {
    PREPARAR_ENTRADA_FLASH_PRODUCAO_B36A_AUTORIZADO: PREPARAR_ENTRADA_FLASH_PRODUCAO_B36A_AUTORIZADO,
    AUDITAR_ENTRADA_FLASH_PRODUCAO_B36A_SEM_GRAVAR: AUDITAR_ENTRADA_FLASH_PRODUCAO_B36A_SEM_GRAVAR,
    CONFIGURAR_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO: CONFIGURAR_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO,
    CARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_AUTORIZADO: CARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_AUTORIZADO,
    DIAGNOSTICAR_DATAS_FONTE_FLASH_PRODUCAO_B36B_SEM_GRAVAR: DIAGNOSTICAR_DATAS_FONTE_FLASH_PRODUCAO_B36B_SEM_GRAVAR,
    RECARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_CORRIGIR_DATAS_AUTORIZADO: RECARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_CORRIGIR_DATAS_AUTORIZADO,
    AUDITAR_CARGA_ENTRADA_FLASH_PRODUCAO_B36B_SEM_GRAVAR: AUDITAR_CARGA_ENTRADA_FLASH_PRODUCAO_B36B_SEM_GRAVAR,
    DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR: DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR,
    PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR: PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR,
    IMPORTAR_FLASH_PRODUCAO_B38_AUTORIZADO: IMPORTAR_FLASH_PRODUCAO_B38_AUTORIZADO,
    AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR: AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR,
    AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_2_RESUMO_SEM_GRAVAR: AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_2_RESUMO_SEM_GRAVAR,
    AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_3_REGRA_B36_B37_SEM_GRAVAR: AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_3_REGRA_B36_B37_SEM_GRAVAR,
    PREVIA_CONCILIACAO_FLASH_PRODUCAO_B310_SEM_GRAVAR: PREVIA_CONCILIACAO_FLASH_PRODUCAO_B310_SEM_GRAVAR,
    CONCILIAR_FLASH_PRODUCAO_B311_AUTORIZADO: CONCILIAR_FLASH_PRODUCAO_B311_AUTORIZADO,
    AUDITAR_CONCILIACAO_FLASH_PRODUCAO_B312_SEM_GRAVAR: AUDITAR_CONCILIACAO_FLASH_PRODUCAO_B312_SEM_GRAVAR,
    PREVIA_PENDENCIAS_FLASH_PRODUCAO_B313_SEM_GRAVAR: PREVIA_PENDENCIAS_FLASH_PRODUCAO_B313_SEM_GRAVAR,
    GERAR_PENDENCIAS_FLASH_PRODUCAO_B314_AUTORIZADO: GERAR_PENDENCIAS_FLASH_PRODUCAO_B314_AUTORIZADO,
    AUDITAR_FIN_FLASH_PRODUCAO_FINAL_B315_SEM_GRAVAR: AUDITAR_FIN_FLASH_PRODUCAO_FINAL_B315_SEM_GRAVAR
  };
})();

function PREPARAR_ENTRADA_FLASH_PRODUCAO_B36A_AUTORIZADO() {
  return SGO_FIN_FLASH_PROD_B3.PREPARAR_ENTRADA_FLASH_PRODUCAO_B36A_AUTORIZADO();
}

function AUDITAR_ENTRADA_FLASH_PRODUCAO_B36A_SEM_GRAVAR() {
  return SGO_FIN_FLASH_PROD_B3.AUDITAR_ENTRADA_FLASH_PRODUCAO_B36A_SEM_GRAVAR();
}

function CONFIGURAR_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO() {
  return SGO_FIN_FLASH_PROD_B3.CONFIGURAR_FONTE_FLASH_PRODUCAO_B36B_AUTORIZADO();
}

function CARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_AUTORIZADO() {
  return SGO_FIN_FLASH_PROD_B3.CARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_AUTORIZADO();
}

function DIAGNOSTICAR_DATAS_FONTE_FLASH_PRODUCAO_B36B_SEM_GRAVAR() {
  return SGO_FIN_FLASH_PROD_B3.DIAGNOSTICAR_DATAS_FONTE_FLASH_PRODUCAO_B36B_SEM_GRAVAR();
}

function RECARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_CORRIGIR_DATAS_AUTORIZADO() {
  return SGO_FIN_FLASH_PROD_B3.RECARREGAR_ENTRADA_FLASH_PRODUCAO_B36B_CORRIGIR_DATAS_AUTORIZADO();
}

function AUDITAR_CARGA_ENTRADA_FLASH_PRODUCAO_B36B_SEM_GRAVAR() {
  return SGO_FIN_FLASH_PROD_B3.AUDITAR_CARGA_ENTRADA_FLASH_PRODUCAO_B36B_SEM_GRAVAR();
}

function DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR() {
  return SGO_FIN_FLASH_PROD_B3.DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR();
}

function PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR() {
  return SGO_FIN_FLASH_PROD_B3.PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR();
}

function IMPORTAR_FLASH_PRODUCAO_B38_AUTORIZADO() {
  return SGO_FIN_FLASH_PROD_B3.IMPORTAR_FLASH_PRODUCAO_B38_AUTORIZADO();
}

function AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR() {
  return SGO_FIN_FLASH_PROD_B3.AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR();
}

function AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_2_RESUMO_SEM_GRAVAR() {
  return SGO_FIN_FLASH_PROD_B3.AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_2_RESUMO_SEM_GRAVAR();
}

function AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_3_REGRA_B36_B37_SEM_GRAVAR() {
  return SGO_FIN_FLASH_PROD_B3.AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_3_REGRA_B36_B37_SEM_GRAVAR();
}

function PREVIA_CONCILIACAO_FLASH_PRODUCAO_B310_SEM_GRAVAR() {
  return SGO_FIN_FLASH_PROD_B3.PREVIA_CONCILIACAO_FLASH_PRODUCAO_B310_SEM_GRAVAR();
}

function CONCILIAR_FLASH_PRODUCAO_B311_AUTORIZADO() {
  return SGO_FIN_FLASH_PROD_B3.CONCILIAR_FLASH_PRODUCAO_B311_AUTORIZADO();
}

function AUDITAR_CONCILIACAO_FLASH_PRODUCAO_B312_SEM_GRAVAR() {
  return SGO_FIN_FLASH_PROD_B3.AUDITAR_CONCILIACAO_FLASH_PRODUCAO_B312_SEM_GRAVAR();
}

function PREVIA_PENDENCIAS_FLASH_PRODUCAO_B313_SEM_GRAVAR() {
  return SGO_FIN_FLASH_PROD_B3.PREVIA_PENDENCIAS_FLASH_PRODUCAO_B313_SEM_GRAVAR();
}

function GERAR_PENDENCIAS_FLASH_PRODUCAO_B314_AUTORIZADO() {
  return SGO_FIN_FLASH_PROD_B3.GERAR_PENDENCIAS_FLASH_PRODUCAO_B314_AUTORIZADO();
}

function AUDITAR_FIN_FLASH_PRODUCAO_FINAL_B315_SEM_GRAVAR() {
  return SGO_FIN_FLASH_PROD_B3.AUDITAR_FIN_FLASH_PRODUCAO_FINAL_B315_SEM_GRAVAR();
}

function auditarSetupFinanceiroV2() {
  return SGO_FIN_PROVISIONAMENTO.auditarSetupFinanceiroV2();
}

function auditarAssinaturaFinanceiraTesteV2() {
  return SGO_FIN_PROVISIONAMENTO.auditarAssinaturaFinanceiraTesteV2();
}

function auditarPoliticaCartaoFlashV1() {
  return SGO_FIN_PROVISIONAMENTO.auditarPoliticaCartaoFlashV1();
}

function auditarUrlWebAppFinanceiroV1() {
  return SGO_FIN_PROVISIONAMENTO.auditarUrlWebAppFinanceiroV1();
}

function cadastrarPoliticaCartaoFlashV1_AUTORIZADO(payload) {
  return SGO_FIN_PROVISIONAMENTO.cadastrarPoliticaCartaoFlashV1_AUTORIZADO(payload);
}

function cadastrarPoliticaCartaoFlashV1_MANUAL_AUTORIZADO() {
  var resultado = cadastrarPoliticaCartaoFlashV1_AUTORIZADO({
    executar: true,
    confirmacao: "CADASTRAR_POLITICA_CARTAO_FLASH_SGO_2026"
  });
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function configurarUrlWebAppFinanceiroV2_AUTORIZADO(payload) {
  return SGO_FIN_PROVISIONAMENTO.configurarUrlWebAppFinanceiroV2_AUTORIZADO(payload);
}

function configurarUrlWebAppFinanceiroV2_MANUAL_AUTORIZADO() {
  // Preencher webAppUrl antes de executar manualmente no editor Apps Script.
  var resultado = configurarUrlWebAppFinanceiroV2_AUTORIZADO({
    executar: true,
    confirmacao: "CONFIGURAR_URL_WEBAPP_FINANCEIRO_SGO_2026",
    webAppUrl: ""
  });
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function configurarUrlWebAppFinanceiroExecV1_MANUAL_AUTORIZADO() {
  var resultado = configurarUrlWebAppFinanceiroV2_AUTORIZADO({
    executar: true,
    confirmacao: "CONFIGURAR_URL_WEBAPP_FINANCEIRO_SGO_2026",
    webAppUrl: "https://script.google.com/macros/s/AKfycbyNnXLa3Bc4U2BkCnO7F_pScoJrLthlyDQ9oRKi6s1kk9oKOqPmDsuibRMO1iCDTTT4dQ/exec"
  });
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function atualizarUrlWebAppFinanceiroV2_AUTORIZADO(payload) {
  return SGO_FIN_PROVISIONAMENTO.atualizarUrlWebAppFinanceiroV2_AUTORIZADO(payload);
}

function atualizarUrlWebAppFinanceiroV2_MANUAL_AUTORIZADO() {
  var resultado = atualizarUrlWebAppFinanceiroV2_AUTORIZADO({
    executar: true,
    confirmacao: "ATUALIZAR_URL_WEBAPP_FINANCEIRO_SGO_2026"
  });
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function criarTermoFinanceiroTesteV2_AUTORIZADO(payload) {
  return SGO_FIN_PROVISIONAMENTO.criarTermoFinanceiroTesteV2_AUTORIZADO(payload);
}

function criarTermoFinanceiroTesteV2_MANUAL_AUTORIZADO() {
  var resultado = criarTermoFinanceiroTesteV2_AUTORIZADO({
    executar: true,
    confirmacao: "CRIAR_TERMO_FINANCEIRO_TESTE_SGO_2026"
  });
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function criarTermoFinanceiroTesteV2_WEB_AUTORIZADO(payload) {
  return SGO_FIN_PROVISIONAMENTO.criarTermoFinanceiroTesteV2_WEB_AUTORIZADO(payload);
}
