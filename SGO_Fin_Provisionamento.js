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

  function txt_(v) {
    return String(v === null || v === undefined ? "" : v).trim();
  }

  function num_(v) {
    if (typeof v === "number") return v;
    var s = txt_(v).replace(/\./g, "").replace(",", ".");
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
      var alvo = txt_(nomes[i]).toUpperCase();
      for (var j = 0; j < headers.length; j++) {
        if (txt_(headers[j]).toUpperCase() === alvo) return j;
      }
    }
    return -1;
  }

  function chaveLote_(arquivoNome, periodoInicial, periodoFinal, total, valor) {
    return ["FLASH", arquivoNome, periodoInicial, periodoFinal, total, valor].join("|").toUpperCase();
  }

  function headersEntradaFlash_() {
    return ["DATA", "DESCRICAO", "VALOR", "TIPO", "PESSOA", "CARTAO_FINAL"];
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
      estabelecimentosDetectados: 0
    };
    var amostra = { primeirasLinhas: [] };
    if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < 1) {
      base.bloqueios.push("ENTRADA_FLASH_AUSENTE");
      base.avisos.push("Configurar entrada segura em " + ABA_TMP_FLASH + " antes do dry-run.");
      return { entrada: entrada, leitura: leitura, amostra: amostra, registros: [], chaveLote: "" };
    }

    var dados = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    var hs = dados[0].map(function(h) { return txt_(h); });
    var idxData = localizar_(hs, ["DATA", "DATA_TRANSACAO", "Data", "Data da transacao"]);
    var idxValor = localizar_(hs, ["VALOR", "VALOR_TRANSACAO", "Valor", "Valor da transacao"]);
    var idxDescricao = localizar_(hs, ["DESCRICAO", "ESTABELECIMENTO", "ESTABELECIMENTO_EXTRATO", "Descricao"]);
    var idxCartao = localizar_(hs, ["CARTAO_FINAL", "Final Cartao", "Final do cartao", "CARTAO"]);
    if (idxValor < 0) base.bloqueios.push("CAMPO_VALOR_FLASH_AUSENTE");

    var datas = [];
    var cartoes = {};
    var estabs = {};
    var registros = [];
    for (var i = 1; i < dados.length; i++) {
      var linha = dados[i];
      var preenchida = linha.some(function(c) { return txt_(c) !== ""; });
      if (!preenchida) continue;
      var data = idxData >= 0 ? txt_(linha[idxData]) : "";
      var valor = idxValor >= 0 ? num_(linha[idxValor]) : 0;
      var desc = idxDescricao >= 0 ? txt_(linha[idxDescricao]) : "";
      var cartao = idxCartao >= 0 ? txt_(linha[idxCartao]) : "";
      leitura.totalRegistrosLidos++;
      if (idxValor >= 0) leitura.totalRegistrosValidos++; else leitura.totalRegistrosInvalidos++;
      leitura.valorTotal += valor;
      if (data) datas.push(data);
      if (cartao) cartoes[cartao] = true;
      if (desc) estabs[desc] = true;
      var reg = { linha: i + 1, data: data, valor: valor, cartaoFinal: cartao, estabelecimento: desc };
      registros.push(reg);
      if (amostra.primeirasLinhas.length < 3) amostra.primeirasLinhas.push(reg);
    }
    datas.sort();
    leitura.periodoInicial = datas[0] || "";
    leitura.periodoFinal = datas[datas.length - 1] || "";
    leitura.valorTotal = Math.round(leitura.valorTotal * 100) / 100;
    leitura.cartoesDetectados = Object.keys(cartoes).length;
    leitura.estabelecimentosDetectados = Object.keys(estabs).length;
    var chave = chaveLote_(entrada.arquivoNome, leitura.periodoInicial, leitura.periodoFinal, leitura.totalRegistrosValidos, leitura.valorTotal);
    return { entrada: entrada, leitura: leitura, amostra: amostra, registros: registros, chaveLote: chave };
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

  function AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR() {
    var r = validarProd_("AUDITORIA_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR", true);
    r.resumo = { lotes: 0, extratos: 0, valorTotal: 0, periodoInicial: "", periodoFinal: "", duplicidadesLote: 0, duplicidadesExtrato: 0 };
    r.lotesResumo = [];
    r.proximaEtapa = "Se aprovado, executar PREVIA_CONCILIACAO_FLASH_PRODUCAO_B310_SEM_GRAVAR";
    var ss = abrirPlanilha_(r);
    if (ss) {
      var lotes = objetos_(ss.getSheetByName(ABA_LOTES)).items;
      var extratos = objetos_(ss.getSheetByName(ABA_EXTRATOS)).items;
      var chavesLote = {};
      var chavesExtrato = {};
      var datas = [];
      r.resumo.lotes = lotes.length;
      r.resumo.extratos = extratos.length;
      lotes.forEach(function(l) {
        var chave = txt_(l.CHAVE_LOTE || l.LOTE_ID);
        if (chave) chavesLote[chave] = (chavesLote[chave] || 0) + 1;
        r.lotesResumo.push({ loteId: txt_(l.LOTE_ID), chaveLote: txt_(l.CHAVE_LOTE), totalLancamentos: Number(l.TOTAL_LANCAMENTOS || 0), periodoInicial: txt_(l.PERIODO_INICIO), periodoFinal: txt_(l.PERIODO_FIM) });
      });
      extratos.forEach(function(e) {
        r.resumo.valorTotal += num_(e.VALOR);
        if (e.DATA_TRANSACAO) datas.push(txt_(e.DATA_TRANSACAO));
        var chaveE = txt_(e.CHAVE_DUPLICIDADE || e.EXTRATO_ID);
        if (chaveE) chavesExtrato[chaveE] = (chavesExtrato[chaveE] || 0) + 1;
      });
      Object.keys(chavesLote).forEach(function(k) { if (chavesLote[k] > 1) r.resumo.duplicidadesLote++; });
      Object.keys(chavesExtrato).forEach(function(k) { if (chavesExtrato[k] > 1) r.resumo.duplicidadesExtrato++; });
      datas.sort();
      r.resumo.periodoInicial = datas[0] || "";
      r.resumo.periodoFinal = datas[datas.length - 1] || "";
      r.resumo.valorTotal = Math.round(r.resumo.valorTotal * 100) / 100;
      if (r.resumo.lotes < 1 || r.resumo.extratos < 1) r.bloqueios.push("IMPORTACAO_FLASH_AINDA_NAO_ENCONTRADA");
      if (r.resumo.duplicidadesLote > 0) r.bloqueios.push("DUPLICIDADE_LOTE_FLASH");
      if (r.resumo.duplicidadesExtrato > 0) r.bloqueios.push("DUPLICIDADE_EXTRATO_FLASH");
    }
    r.success = r.bloqueios.length === 0;
    r.ok = r.success;
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
    DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR: DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR,
    PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR: PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR,
    IMPORTAR_FLASH_PRODUCAO_B38_AUTORIZADO: IMPORTAR_FLASH_PRODUCAO_B38_AUTORIZADO,
    AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR: AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR,
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
