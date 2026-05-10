const SGO_AST = (() => {
  const DB = "PRINCIPAL";
  const DB_ESTOQUE = "ESTOQUE";
  const S = SGO_CFG.SHEETS;
  const QR_API = "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=";
  const STATUS_PECA_PENDENTE = ["PECA_SOLICITADA", "PECA_EM_COTACAO", "PECA_AGUARDANDO_APROVACAO", "PECA_COMPRADA", "PECA_INDISPONIVEL"];

  const COLUNAS = {
    AST_ENTRADAS: [
      "ID", "PROTOCOLO", "CLIENTE_ID", "UNIDADE_ID", "EQUIPAMENTO_ID",
      "CADASTRO_PROVISORIO", "CLIENTE_PROVISORIO", "UNIDADE_PROVISORIA", "EQUIPAMENTO_PROVISORIO",
      "NUMERO_SERIE_INFORMADO", "CONDICAO_FISICA", "PROBLEMA_RELATADO", "PRIORIDADE",
      "PRAZO_PROMETIDO", "TECNICO_ID", "TECNICO_NOME", "STATUS", "BANDEIRA",
      "LOCALIZACAO_ATUAL", "QR_TOKEN", "QR_URL", "URL_PUBLICA", "DOCUMENTO_ENTRADA_ID",
      "DOCUMENTO_ENTRADA_LINK", "DOCUMENTO_ENTRADA_DOWNLOAD", "ETIQUETA_HTML", "ETIQUETA_PDF_ID",
      "ETIQUETA_PDF_LINK", "ETIQUETA_PDF_DOWNLOAD", "ACESSORIOS_CONFERIDOS", "ULTIMA_MOVIMENTACAO_EM",
      "PROXIMA_ACAO", "CRIADO_POR", "CRIADO_EM", "ATUALIZADO_POR", "ATUALIZADO_EM"
    ],
    AST_ACESSORIOS: [
      "ID", "ENTRADA_ID", "DESCRICAO", "QUANTIDADE", "ESTADO", "FOTO_LINK",
      "FILE_ID", "OBSERVACAO", "CONFERIDO", "CRIADO_POR", "CRIADO_EM"
    ],
    AST_FOTOS: [
      "ID", "ENTRADA_ID", "TERCEIRO_ID", "ETAPA", "TIPO_FOTO", "NOME_ARQUIVO", "LINK_DRIVE", "FILE_ID",
      "MIME_TYPE", "OBSERVACAO", "VISIBILIDADE_PUBLICA", "STATUS", "UPLOAD_POR", "UPLOAD_EM", "CRIADO_EM"
    ],
    AST_DIAGNOSTICOS: [
      "ID", "ENTRADA_ID", "TECNICO_ID", "TECNICO_NOME", "DATA_DIAGNOSTICO",
      "DEFEITO_RELATADO_CLIENTE", "DEFEITO_CONFIRMADO", "DEFEITO_INTERMITENTE",
      "EQUIPAMENTO_LIGA", "INSPECAO_VISUAL_OK", "TESTE_ELETRICO_BASICO",
      "NECESSITA_LIMPEZA", "NECESSITA_PECA", "NECESSITA_TERCEIRO", "RISCO_USO",
      "TESTES_REALIZADOS", "EVIDENCIAS_ENCONTRADAS", "CAUSA_PROVAVEL",
      "RECOMENDACAO_TECNICA", "CONCLUSAO_PRELIMINAR", "STATUS_APOS_DIAGNOSTICO",
      "STATUS", "CRIADO_POR", "CRIADO_EM", "ATUALIZADO_POR", "ATUALIZADO_EM"
    ],
    AST_PECAS: [
      "ID", "ENTRADA_ID", "DIAGNOSTICO_ID", "PECA_ID", "NOME_PECA", "CODIGO_INTERNO",
      "CODIGO_FABRICANTE", "DESCRICAO", "QUANTIDADE", "URGENCIA", "JUSTIFICATIVA_TECNICA",
      "TEM_ESTOQUE", "FORNECEDOR_SUGERIDO", "VALOR_ESTIMADO", "STATUS",
      "SOLICITADA_EM", "COMPRADA_EM", "RECEBIDA_EM", "INSTALADA_EM", "OBSERVACAO",
      "CRIADO_POR", "CRIADO_EM", "ATUALIZADO_POR", "ATUALIZADO_EM"
    ],
    AST_MOVIMENTACOES: [
      "ID", "ENTRADA_ID", "TIPO", "STATUS_ANTERIOR", "STATUS_NOVO", "TECNICO_ANTERIOR_ID",
      "TECNICO_NOVO_ID", "LOCALIZACAO", "DESCRICAO", "MOTIVO", "PROXIMA_ACAO",
      "CRIADO_POR", "CRIADO_EM"
    ],
    AST_DOCUMENTOS: [
      "ID", "ENTRADA_ID", "TIPO_DOCUMENTO", "NUMERO_DOCUMENTO", "TITULO", "FILE_ID",
      "LINK_ARQUIVO", "HASH_SHA256", "TOKEN_VALIDACAO", "URL_VALIDACAO", "QR_CODE_LINK",
      "DOWNLOAD_URL", "TAMANHO_ETIQUETA", "STATUS", "CRIADO_POR", "CRIADO_EM"
    ],
    AST_ALERTAS: [
      "ID", "ENTRADA_ID", "TIPO_ALERTA", "SEVERIDADE", "MENSAGEM", "STATUS",
      "GERADO_EM", "RESOLVIDO_POR", "RESOLVIDO_EM", "CRIADO_EM"
    ],
    AST_TERCEIROS: [
      "ID", "ENTRADA_ID", "CLIENTE_ID", "UNIDADE_ID", "EQUIPAMENTO_ID", "FORNECEDOR_ID",
      "EMPRESA_NOME", "EMPRESA_CNPJ", "TIPO_EMPRESA", "RESPONSAVEL_EMPRESA",
      "TELEFONE_WHATSAPP", "EMAIL", "CIDADE_UF", "ESPECIALIDADE", "STATUS_FORNECEDOR",
      "MOTIVO_ENVIO", "FORMA_ENVIO", "CODIGO_RASTREIO", "PRAZO_PROMETIDO",
      "VALOR_ESTIMADO", "CLIENTE_INFORMADO", "NECESSITA_APROVACAO_CLIENTE",
      "OBSERVACOES", "STATUS_TERCEIRO", "PRAZO_INFORMADO", "PROXIMA_ACAO",
      "ACESSORIOS_CONFIRMADOS", "SEM_ACESSORIOS", "LIBERACAO_GESTOR",
      "ENVIADO_POR", "ENVIADO_EM", "RETORNADO_EM", "RETORNO_RECEBIDO_POR",
      "CONDICAO_RETORNO", "SERVICO_TERCEIRO", "PECAS_SUBSTITUIDAS_TERCEIRO",
      "GARANTIA_TERCEIRO", "PENDENCIAS_RETORNO", "PRECISA_TESTE_INTERNO",
      "PRECISA_EXECUCAO_INTERNA", "CONCLUSAO_RETORNO", "INSPECAO_TECNICO",
      "INSPECAO_CONDICAO", "INSPECAO_ACESSORIOS", "INSPECAO_VISUAL",
      "INSPECAO_FUNCIONAL", "INSPECAO_RESULTADO", "INSPECAO_OBSERVACOES",
      "INSPECAO_PROXIMA_ACAO", "CRIADO_POR", "CRIADO_EM", "ATUALIZADO_POR", "ATUALIZADO_EM"
    ],
    AST_TERCEIROS_ACESSORIOS: ["ID", "TERCEIRO_ID", "ENTRADA_ID", "DESCRICAO", "QUANTIDADE", "ESTADO", "FOTO_LINK", "FILE_ID", "OBSERVACAO", "CRIADO_POR", "CRIADO_EM"],
    AST_TERCEIROS_ANEXOS: ["ID", "TERCEIRO_ID", "ENTRADA_ID", "TIPO_ANEXO", "NOME_ARQUIVO", "FILE_ID", "LINK_ARQUIVO", "OBSERVACAO", "CRIADO_POR", "CRIADO_EM"],
    AST_TERCEIROS_ACOMPANHAMENTOS: ["ID", "TERCEIRO_ID", "ENTRADA_ID", "CANAL", "STATUS_INFORMADO", "PRAZO_INFORMADO", "PROXIMA_ACAO", "INFORMACAO_RECEBIDA", "ANEXO_LINK", "CRIADO_POR", "CRIADO_EM"],
    AST_TERCEIROS_DOCUMENTOS: ["ID", "TERCEIRO_ID", "ENTRADA_ID", "TIPO_DOCUMENTO", "NUMERO_DOCUMENTO", "TITULO", "FILE_ID", "LINK_ARQUIVO", "DOWNLOAD_URL", "TOKEN_VALIDACAO", "URL_VALIDACAO", "HASH_SHA256", "STATUS", "CRIADO_POR", "CRIADO_EM"],
    AST_LAB_ENTRADAS: [
      "ID", "ENTRADA_ID", "CLIENTE_ID", "UNIDADE_ID", "EQUIPAMENTO_ID", "TIPO_SERVICO",
      "AREA_RESPONSAVEL", "PROCEDIMENTO", "NORMA", "CRITERIO_ACEITACAO", "PRIORIDADE",
      "PRAZO_PROMETIDO", "RESPONSAVEL_ID", "RESPONSAVEL_NOME", "OBSERVACOES",
      "STATUS", "RESULTADO_FINAL", "CONFORMIDADE", "RESUMO_TECNICO", "RESTRICOES",
      "RECOMENDACOES", "NECESSITA_MANUTENCAO", "NECESSITA_NOVA_CALIBRACAO",
      "NECESSITA_QUALIFICACAO_COMPLEMENTAR", "VALIDADE_RESULTADO",
      "PROXIMA_CALIBRACAO_SUGERIDA", "APROVACAO_GESTOR", "ENTRADA_EM",
      "CRIADO_POR", "CRIADO_EM", "ATUALIZADO_POR", "ATUALIZADO_EM"
    ],
    AST_LAB_ENSAIOS: [
      "ID", "LAB_ENTRADA_ID", "ENTRADA_ID", "TIPO_ENSAIO", "INICIO_EM", "FIM_EM",
      "TECNICO_ID", "TECNICO_NOME", "TEMPERATURA", "UMIDADE", "PRESSAO",
      "OBS_AMBIENTAIS", "PROCEDIMENTO_EXECUTADO", "PONTOS_AVALIADOS",
      "RESULTADO_BRUTO", "RESULTADO_TRATADO", "CRITERIO_ACEITACAO",
      "DESVIO_ENCONTRADO", "INCERTEZA", "CONFORMIDADE", "OBSERVACOES",
      "EVIDENCIAS", "CRIADO_POR", "CRIADO_EM", "ATUALIZADO_POR", "ATUALIZADO_EM"
    ],
    AST_LAB_PADROES: [
      "ID", "LAB_ENTRADA_ID", "ENTRADA_ID", "NOME_PADRAO", "CODIGO_INTERNO",
      "NUMERO_SERIE", "CERTIFICADO_PADRAO", "VALIDADE_CERTIFICADO", "INCERTEZA",
      "RASTREABILIDADE", "SITUACAO", "OBSERVACAO", "LIBERACAO_GESTOR",
      "FILE_ID", "LINK_CERTIFICADO", "CRIADO_POR", "CRIADO_EM"
    ],
    AST_LAB_RESULTADOS: [
      "ID", "LAB_ENTRADA_ID", "ENTRADA_ID", "RESULTADO_FINAL", "CONFORMIDADE",
      "RESUMO_TECNICO", "RESTRICOES", "RECOMENDACOES", "NECESSITA_MANUTENCAO",
      "NECESSITA_NOVA_CALIBRACAO", "NECESSITA_QUALIFICACAO_COMPLEMENTAR",
      "VALIDADE_RESULTADO", "PROXIMA_CALIBRACAO_SUGERIDA", "RESPONSAVEL_ID",
      "RESPONSAVEL_NOME", "APROVACAO_GESTOR", "CRIADO_POR", "CRIADO_EM"
    ],
    AST_LAB_DOCUMENTOS: ["ID", "LAB_ENTRADA_ID", "ENTRADA_ID", "TIPO_DOCUMENTO", "NUMERO_DOCUMENTO", "TITULO", "FILE_ID", "LINK_ARQUIVO", "DOWNLOAD_URL", "TOKEN_VALIDACAO", "URL_VALIDACAO", "HASH_SHA256", "STATUS", "CRIADO_POR", "CRIADO_EM"],
    AST_LAB_EVIDENCIAS: ["ID", "LAB_ENTRADA_ID", "ENTRADA_ID", "TIPO_EVIDENCIA", "NOME", "LINK_ARQUIVO", "FILE_ID", "OBSERVACAO", "CRIADO_POR", "CRIADO_EM"],
    AST_TESTES_BANCADA: [
      "ID", "ENTRADA_ID", "TECNICO_ID", "TECNICO_NOME", "DATA_TESTE", "TIPO_TESTE",
      "CONDICAO_INICIAL", "PROCEDIMENTO_REALIZADO", "RESULTADO", "PARAMETROS_OBSERVADOS",
      "EVIDENCIAS", "OBSERVACOES", "PROXIMA_ACAO", "CRIADO_POR", "CRIADO_EM",
      "ATUALIZADO_POR", "ATUALIZADO_EM"
    ],
    AST_EXECUCOES: [
      "ID", "ENTRADA_ID", "TECNICO_ID", "TECNICO_NOME", "DATA_EXECUCAO",
      "SERVICO_REALIZADO", "PECAS_APLICADAS", "AJUSTES_REALIZADOS", "LIMPEZA_REALIZADA",
      "COMPONENTES_SUBSTITUIDOS", "TESTES_APOS_REPARO", "RESULTADO_FINAL",
      "RECOMENDACAO_CLIENTE", "GARANTIA_SERVICO", "CONCLUSAO_TECNICA",
      "STATUS_FINAL", "CRIADO_POR", "CRIADO_EM", "ATUALIZADO_POR", "ATUALIZADO_EM"
    ],
    AST_INDICADORES_DIARIOS: ["ID", "DATA", "TOTAL_ABERTO", "ATRASADOS", "EM_TERCEIRO", "EM_LABORATORIO", "PRONTOS", "SEM_MOVIMENTACAO", "CRIADO_EM"],
    AST_PRODUTIVIDADE_TECNICOS: ["ID", "PERIODO", "TECNICO_ID", "TOTAL_ATRIBUIDO", "TOTAL_CONCLUIDO", "TOTAL_ATRASADO", "TEMPO_MEDIO_HORAS", "CRIADO_EM"],
    AST_CONFORMIDADE: ["ID", "ENTRADA_ID", "CLIENTE_ID", "DOCUMENTOS_OBRIGATORIOS", "DOCUMENTOS_GERADOS", "INDICE_CONFORMIDADE", "STATUS", "CRIADO_EM"],
    AST_RELATORIOS_GERADOS: ["ID", "TIPO_RELATORIO", "CLIENTE_ID", "UNIDADE_ID", "ENTRADA_ID", "EQUIPAMENTO_ID", "PERIODO_INICIAL", "PERIODO_FINAL", "FILE_ID", "LINK_ARQUIVO", "DOWNLOAD_URL", "TOKEN_VALIDACAO", "URL_VALIDACAO", "QR_CODE_LINK", "HASH_SHA256", "STATUS", "RESUMO", "CRIADO_POR", "CRIADO_EM"]
  };

  function setup() {
    const ss = SGO_DATA.getDB(DB);
    const log = [];
    Object.keys(COLUNAS).forEach(function(nome) {
      garantirAba_(ss, S[nome] || nome, COLUNAS[nome], log);
    });
    if (SGO_DATA.clearCache) SGO_DATA.clearCache();
    return { success: true, message: "Estrutura da Assistencia Tecnica verificada.", log: log };
  }

  function contexto(sessionId) {
    const sessao = exigirSessao(sessionId);
    setup();
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    return {
      success: true,
      clientes: filtrarClienteSessao_(SGO_DATA.getAll(S.CAD_CLIENTES), sessao),
      tecnicos: SGO_DATA.getAll(S.CAD_TECNICOS).filter(function(t) { return ativo_(t.STATUS); }),
      fornecedores: listarFornecedoresTerceiro_(),
      status: SGO_CFG.ASSISTENCIA_TECNICA.STATUS,
      prioridades: SGO_CFG.ASSISTENCIA_TECNICA.PRIORIDADES,
      tiposFoto: SGO_CFG.ASSISTENCIA_TECNICA.TIPOS_FOTO,
      dashboard: dashboardInterno_(sessao)
    };
  }

  function listarUnidades(sessionId, clienteId) {
    const sessao = exigirSessao(sessionId);
    if (!podeVerCliente_(sessao, clienteId)) return { success: false, message: "Acesso negado." };
    const items = SGO_DATA.getManyByField(S.CAD_UNIDADES, "CLIENTE_ID", clienteId)
      .filter(function(u) { return ativo_(u.STATUS); });
    return { success: true, items: items };
  }

  function listarEquipamentos(sessionId, clienteId, unidadeId) {
    const sessao = exigirSessao(sessionId);
    if (!podeVerCliente_(sessao, clienteId)) return { success: false, message: "Acesso negado." };
    let items = SGO_DATA.getManyByField(S.CAD_EQUIPAMENTOS, "CLIENTE_ID", clienteId);
    if (unidadeId) items = items.filter(function(e) { return SGO_UTILS.safe(e.UNIDADE_ID) === SGO_UTILS.safe(unidadeId); });
    return { success: true, items: items.filter(function(e) { return ativo_(e.STATUS); }) };
  }

  function criarEntrada(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    setup();
    payload = payload || {};
    const perm = exigirAst_(sessao, "GERENCIAR_ENTRADAS");
    if (!perm.success) return perm;

    const acessorios = Array.isArray(payload.ACESSORIOS) ? payload.ACESSORIOS : [];
    if (SGO_UTILS.safeUpper(payload.ACESSORIOS_CONFERIDOS) !== "S") return { success: false, message: "Confirme a conferencia dos acessorios." };
    if (!acessorios.length) return { success: false, message: "Registre ao menos um item de acessorio, mesmo que seja 'sem acessorios'." };

    const provis = SGO_UTILS.safeUpper(payload.CADASTRO_PROVISORIO) === "S";
    if (!provis && (!payload.CLIENTE_ID || !payload.UNIDADE_ID || !payload.EQUIPAMENTO_ID)) {
      return { success: false, message: "Selecione cliente, unidade e equipamento ou marque cadastro provisorio." };
    }
    if (provis && (!payload.CLIENTE_PROVISORIO || !payload.UNIDADE_PROVISORIA || !payload.EQUIPAMENTO_PROVISORIO)) {
      return { success: false, message: "Cadastro provisorio exige cliente, unidade e equipamento provisorios." };
    }
    if (!payload.CONDICAO_FISICA || !payload.PROBLEMA_RELATADO) return { success: false, message: "Informe condicao fisica e problema relatado." };

    const protocolo = gerarProtocolo_();
    const token = gerarTokenEntradaUnico_();
    const urlPublica = montarUrlPublica_(token);
    const qrUrl = QR_API + encodeURIComponent(urlPublica);
    const tecnico = payload.TECNICO_ID ? SGO_DATA.getById(S.CAD_TECNICOS, payload.TECNICO_ID) : null;
    const agora = SGO_UTILS.nowIso();

    const entrada = SGO_DATA.insert(S.AST_ENTRADAS, SGO_DATA.gerarRegistroBase({
      PROTOCOLO: protocolo,
      CLIENTE_ID: SGO_UTILS.safe(payload.CLIENTE_ID),
      UNIDADE_ID: SGO_UTILS.safe(payload.UNIDADE_ID),
      EQUIPAMENTO_ID: SGO_UTILS.safe(payload.EQUIPAMENTO_ID),
      CADASTRO_PROVISORIO: provis ? "S" : "N",
      CLIENTE_PROVISORIO: SGO_UTILS.safe(payload.CLIENTE_PROVISORIO),
      UNIDADE_PROVISORIA: SGO_UTILS.safe(payload.UNIDADE_PROVISORIA),
      EQUIPAMENTO_PROVISORIO: SGO_UTILS.safe(payload.EQUIPAMENTO_PROVISORIO),
      NUMERO_SERIE_INFORMADO: SGO_UTILS.safe(payload.NUMERO_SERIE_INFORMADO),
      CONDICAO_FISICA: SGO_UTILS.safe(payload.CONDICAO_FISICA),
      PROBLEMA_RELATADO: SGO_UTILS.safe(payload.PROBLEMA_RELATADO),
      PRIORIDADE: SGO_UTILS.safeUpper(payload.PRIORIDADE || "NORMAL"),
      PRAZO_PROMETIDO: SGO_UTILS.safe(payload.PRAZO_PROMETIDO),
      TECNICO_ID: SGO_UTILS.safe(payload.TECNICO_ID),
      TECNICO_NOME: tecnico ? SGO_UTILS.safe(tecnico.NOME) : "",
      STATUS: "ENTRADA",
      BANDEIRA: bandeira_("ENTRADA", payload.PRIORIDADE),
      LOCALIZACAO_ATUAL: "ASSISTENCIA_LOCAL",
      QR_TOKEN: token,
      QR_URL: qrUrl,
      URL_PUBLICA: urlPublica,
      ACESSORIOS_CONFERIDOS: "S",
      ULTIMA_MOVIMENTACAO_EM: agora,
      PROXIMA_ACAO: "Realizar triagem tecnica",
      CRIADO_POR: sessao.usuario,
      CRIADO_EM: agora,
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: agora
    }));

    acessorios.forEach(function(a) {
      SGO_DATA.insert(S.AST_ACESSORIOS, SGO_DATA.gerarRegistroBase({
        ENTRADA_ID: entrada.ID,
        DESCRICAO: SGO_UTILS.safe(a.DESCRICAO),
        QUANTIDADE: SGO_UTILS.safe(a.QUANTIDADE || "1"),
        ESTADO: SGO_UTILS.safe(a.ESTADO),
        FOTO_LINK: SGO_UTILS.safe(a.FOTO_LINK),
        FILE_ID: SGO_UTILS.safe(a.FILE_ID),
        OBSERVACAO: SGO_UTILS.safe(a.OBSERVACAO),
        CONFERIDO: "S",
        CRIADO_POR: sessao.usuario
      }));
    });

    registrarMov_(sessao, entrada.ID, "ENTRADA", "", "ENTRADA", "", entrada.TECNICO_ID, "ASSISTENCIA_LOCAL", "Entrada de equipamento registrada.", "", "Realizar triagem tecnica");
    const doc = gerarDocumentoEntrada_(sessao, entrada.ID);
    if (doc.success) {
      SGO_DATA.update(S.AST_ENTRADAS, entrada.ID, {
        DOCUMENTO_ENTRADA_ID: doc.documentoId,
        DOCUMENTO_ENTRADA_LINK: doc.pdfUrl,
        DOCUMENTO_ENTRADA_DOWNLOAD: doc.downloadUrl,
        ETIQUETA_HTML: gerarEtiquetaHtml_(entrada.ID, "MEDIA")
      });
    }
    gerarAlertasEntrada_(entrada.ID);
    SGO_DATA.log("AST_ENTRADA_CRIAR", sessao.usuario, "Entrada " + protocolo + " criada.", "ASSISTENCIA_TECNICA");
    return { success: true, message: "Entrada registrada.", id: entrada.ID, protocolo: protocolo, qrUrl: qrUrl, documento: doc };
  }

  function listarEntradas(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    setup();
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    let items = SGO_DATA.getAll(S.AST_ENTRADAS).map(enriquecerEntrada_);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      items = items.filter(function(e) { return SGO_UTILS.safe(e.CLIENTE_ID) === SGO_UTILS.safe(sessao.clienteId); });
    }
    filtros = filtros || {};
    const texto = SGO_UTILS.safeLower(filtros.TEXTO);
    const status = SGO_UTILS.safeUpper(filtros.STATUS);
    if (status) items = items.filter(function(e) { return SGO_UTILS.safeUpper(e.STATUS) === status; });
    if (texto) {
      items = items.filter(function(e) {
        return [e.PROTOCOLO, e.CLIENTE_NOME, e.UNIDADE_NOME, e.EQUIPAMENTO_NOME, e.PROBLEMA_RELATADO, e.TECNICO_NOME].join(" ").toLowerCase().indexOf(texto) >= 0;
      });
    }
    items.sort(function(a, b) { return SGO_UTILS.safe(b.CRIADO_EM).localeCompare(SGO_UTILS.safe(a.CRIADO_EM)); });
    return { success: true, items: items, total: items.length };
  }

  function obterEntrada(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    setup();
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, id);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    if (!podeVerCliente_(sessao, entrada.CLIENTE_ID)) return { success: false, message: "Acesso negado." };
    return {
      success: true,
      item: enriquecerEntrada_(entrada),
      acessorios: SGO_DATA.getManyByField(S.AST_ACESSORIOS, "ENTRADA_ID", id),
      fotos: SGO_DATA.getManyByField(S.AST_FOTOS, "ENTRADA_ID", id),
      movimentos: SGO_DATA.getManyByField(S.AST_MOVIMENTACOES, "ENTRADA_ID", id),
      documentos: SGO_DATA.getManyByField(S.AST_DOCUMENTOS, "ENTRADA_ID", id),
      diagnosticos: SGO_DATA.getManyByField(S.AST_DIAGNOSTICOS, "ENTRADA_ID", id),
      pecas: SGO_DATA.getManyByField(S.AST_PECAS, "ENTRADA_ID", id),
      testes: SGO_DATA.getManyByField(sheet_("AST_TESTES_BANCADA"), "ENTRADA_ID", id),
      execucoes: SGO_DATA.getManyByField(sheet_("AST_EXECUCOES"), "ENTRADA_ID", id),
      terceiros: montarTerceirosEntrada_(id),
      laboratorio: montarLaboratorioEntrada_(id),
      whatsapp: montarWhatsapp_(enriquecerEntrada_(entrada), SGO_DATA.getManyByField(S.AST_DOCUMENTOS, "ENTRADA_ID", id)),
      alertas: SGO_DATA.getManyByField(S.AST_ALERTAS, "ENTRADA_ID", id)
    };
  }

  function salvarDiagnostico(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    setup();
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    if (!payload.DEFEITO_CONFIRMADO || !payload.CAUSA_PROVAVEL || !payload.RECOMENDACAO_TECNICA) {
      return { success: false, message: "Diagnostico exige defeito confirmado, causa provavel e recomendacao tecnica." };
    }

    const dados = normalizarDiagnostico_(sessao, entrada, payload);
    const existente = diagnosticoAtual_(entradaId);
    let diagnostico;
    if (existente) {
      SGO_DATA.update(S.AST_DIAGNOSTICOS, existente.ID, Object.assign({}, dados, {
        ATUALIZADO_POR: sessao.usuario,
        ATUALIZADO_EM: SGO_UTILS.nowIso()
      }));
      diagnostico = Object.assign({}, existente, dados);
    } else {
      diagnostico = SGO_DATA.insert(S.AST_DIAGNOSTICOS, SGO_DATA.gerarRegistroBase(dados));
      registrarMov_(sessao, entradaId, "DIAGNOSTICO_INICIADO", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Diagnostico tecnico iniciado.", "", entrada.PROXIMA_ACAO);
    }

    const novoStatus = statusAposDiagnostico_(dados);
    atualizarEntradaStatus_(sessao, entrada, novoStatus, "Diagnostico tecnico concluido.", dados.STATUS_APOS_DIAGNOSTICO || "Executar proxima etapa tecnica");
    registrarMov_(sessao, entradaId, "DIAGNOSTICO_CONCLUIDO", entrada.STATUS, novoStatus, entrada.TECNICO_ID, dados.TECNICO_ID, localizacaoPorStatus_(novoStatus), "Diagnostico tecnico registrado.", "", dados.STATUS_APOS_DIAGNOSTICO);

    if (dados.RISCO_USO === "CRITICO") criarAlerta_(entradaId, "RISCO_CRITICO", "CRITICO", "Diagnostico classificou risco de uso como critico.");
    if (dados.NECESSITA_PECA === "S") {
      criarAlerta_(entradaId, "PECA_PENDENTE", "AMARELO", "Diagnostico indicou necessidade de peca.");
      criarAlerta_(entradaId, "PECA_SEM_COTACAO", "AMARELO", "Peca pendente de cotacao/compras.");
    }
    if (dados.NECESSITA_TERCEIRO === "S") criarAlerta_(entradaId, "AGUARDANDO_TERCEIRO", "AMARELO", "Diagnostico indicou necessidade de envio a terceiro.");

    const pecas = Array.isArray(payload.PECAS) ? payload.PECAS : [];
    if (dados.NECESSITA_PECA === "S") {
      pecas.forEach(function(p) {
        salvarPeca_(sessao, entradaId, diagnostico.ID, p);
      });
      registrarMov_(sessao, entradaId, "PECA_SOLICITADA", entrada.STATUS, novoStatus, entrada.TECNICO_ID, dados.TECNICO_ID, localizacaoPorStatus_(novoStatus), "Peca solicitada pelo diagnostico tecnico.", "", "Compras/comercial avaliar peca solicitada");
    }

    return { success: true, message: "Diagnostico tecnico salvo.", id: diagnostico.ID, status: novoStatus };
  }

  function adicionarEvidencia(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    setup();
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    const link = SGO_UTILS.safe(payload.LINK_DRIVE || payload.URL_ANEXO || payload.URL);
    const fileId = SGO_UTILS.safe(payload.FILE_ID);
    if (!link && !fileId) return { success: false, message: "Informe URL/anexo ou File ID da evidencia." };
    const item = SGO_DATA.insert(S.AST_FOTOS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TIPO_FOTO: SGO_UTILS.safeUpper(payload.TIPO_EVIDENCIA || payload.TIPO_FOTO || "OUTRA_EVIDENCIA"),
      NOME_ARQUIVO: SGO_UTILS.safe(payload.NOME_ARQUIVO || payload.TIPO_EVIDENCIA || "Evidencia tecnica"),
      LINK_DRIVE: link,
      FILE_ID: fileId,
      MIME_TYPE: SGO_UTILS.safe(payload.MIME_TYPE),
      OBSERVACAO: SGO_UTILS.safe(payload.DESCRICAO || payload.OBSERVACAO),
      VISIBILIDADE_PUBLICA: SGO_UTILS.safeUpper(payload.VISIBILIDADE_PUBLICA) === "S" ? "S" : "N",
      STATUS: "ATIVA",
      UPLOAD_POR: sessao.usuario,
      UPLOAD_EM: SGO_UTILS.nowIso()
    }));
    registrarMov_(sessao, entradaId, "EVIDENCIA_TECNICA", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Evidencia tecnica adicionada: " + item.TIPO_FOTO, "", entrada.PROXIMA_ACAO);
    return { success: true, message: "Evidencia registrada.", item: item };
  }

  function salvarPeca(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    setup();
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "PECAS", entrada);
    if (!perm.success) return perm;
    const item = salvarPeca_(sessao, entradaId, SGO_UTILS.safe(payload && payload.DIAGNOSTICO_ID), payload || {});
    atualizarEntradaStatus_(sessao, entrada, "AGUARDANDO_PECAS", "Peca solicitada.", "Compras/comercial avaliar solicitacao");
    criarAlerta_(entradaId, "PECA_PENDENTE", "AMARELO", "Peca pendente para manutencao.");
    registrarMov_(sessao, entradaId, "PECA_SOLICITADA", entrada.STATUS, "AGUARDANDO_PECAS", entrada.TECNICO_ID, entrada.TECNICO_ID, "ASSISTENCIA_LOCAL", "Peca solicitada pelo diagnostico tecnico.", "", "Compras/comercial avaliar solicitacao");
    return { success: true, message: "Peca solicitada.", item: item };
  }

  function atualizarPeca(sessionId, pecaId, payload) {
    const sessao = exigirSessao(sessionId);
    const peca = SGO_DATA.getById(S.AST_PECAS, pecaId);
    if (!peca) return { success: false, message: "Peca nao encontrada." };
    const entradaPerm = SGO_DATA.getById(S.AST_ENTRADAS, peca.ENTRADA_ID);
    const perm = exigirAst_(sessao, "PECAS", entradaPerm || {});
    if (!perm.success) return perm;
    const status = SGO_UTILS.safeUpper(payload && payload.STATUS);
    const dados = {
      STATUS: status || peca.STATUS,
      OBSERVACAO: SGO_UTILS.safe(payload && payload.OBSERVACAO) || peca.OBSERVACAO,
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    };
    if (status === "PECA_COMPRADA") dados.COMPRADA_EM = SGO_UTILS.nowIso();
    if (status === "PECA_RECEBIDA") dados.RECEBIDA_EM = SGO_UTILS.nowIso();
    if (status === "PECA_INSTALADA") dados.INSTALADA_EM = SGO_UTILS.nowIso();
    SGO_DATA.update(S.AST_PECAS, pecaId, dados);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, peca.ENTRADA_ID);
    if (entrada) registrarMov_(sessao, peca.ENTRADA_ID, "PECA_ATUALIZADA", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Status da peca atualizado para " + dados.STATUS, "", entrada.PROXIMA_ACAO);
    return { success: true, message: "Peca atualizada." };
  }

  function registrarTesteBancada(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    setup();
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    if (!payload.TIPO_TESTE || !payload.PROCEDIMENTO_REALIZADO || !payload.RESULTADO) {
      return { success: false, message: "Teste exige tipo, procedimento realizado e resultado." };
    }
    const tecnico = payload.TECNICO_ID ? SGO_DATA.getById(S.CAD_TECNICOS, payload.TECNICO_ID) : null;
    const resultado = SGO_UTILS.safeUpper(payload.RESULTADO || "TESTE_INCONCLUSIVO");
    const item = SGO_DATA.insert(sheet_("AST_TESTES_BANCADA"), SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TECNICO_ID: SGO_UTILS.safe(payload.TECNICO_ID || entrada.TECNICO_ID),
      TECNICO_NOME: tecnico ? tecnico.NOME : entrada.TECNICO_NOME,
      DATA_TESTE: SGO_UTILS.safe(payload.DATA_TESTE) || SGO_UTILS.nowIso(),
      TIPO_TESTE: SGO_UTILS.safe(payload.TIPO_TESTE),
      CONDICAO_INICIAL: SGO_UTILS.safe(payload.CONDICAO_INICIAL),
      PROCEDIMENTO_REALIZADO: SGO_UTILS.safe(payload.PROCEDIMENTO_REALIZADO),
      RESULTADO: resultado,
      PARAMETROS_OBSERVADOS: SGO_UTILS.safe(payload.PARAMETROS_OBSERVADOS),
      EVIDENCIAS: SGO_UTILS.safe(payload.EVIDENCIAS),
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES),
      PROXIMA_ACAO: SGO_UTILS.safe(payload.PROXIMA_ACAO),
      CRIADO_POR: sessao.usuario
    }));
    let novoStatus = entrada.STATUS;
    if (resultado === "APROVADO" || resultado === "APROVADO_COM_RESSALVA") novoStatus = "TESTE_CONCLUIDO";
    if (resultado === "REPROVADO") novoStatus = "EM_MANUTENCAO";
    if (resultado === "TESTE_INCONCLUSIVO") {
      novoStatus = "AGUARDANDO_DIAGNOSTICO_COMPLEMENTAR";
      criarAlerta_(entradaId, "TESTE_INCONCLUSIVO", "AMARELO", "Teste de bancada inconclusivo.");
    }
    if (resultado === "REPROVADO") criarAlerta_(entradaId, "TESTE_REPROVADO", "VERMELHO", "Teste de bancada reprovado.");
    atualizarEntradaStatus_(sessao, entrada, novoStatus, "Teste de bancada registrado.", item.PROXIMA_ACAO);
    registrarMov_(sessao, entradaId, "TESTE_BANCADA", entrada.STATUS, novoStatus, entrada.TECNICO_ID, item.TECNICO_ID, localizacaoPorStatus_(novoStatus), "Teste de bancada registrado: " + resultado, "", item.PROXIMA_ACAO);
    return { success: true, message: "Teste de bancada registrado.", item: item, status: novoStatus };
  }

  function registrarExecucao(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    setup();
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    if (!payload.SERVICO_REALIZADO || !payload.RESULTADO_FINAL) {
      return { success: false, message: "Execucao exige servico realizado e resultado final." };
    }
    const tecnico = payload.TECNICO_ID ? SGO_DATA.getById(S.CAD_TECNICOS, payload.TECNICO_ID) : null;
    const item = SGO_DATA.insert(sheet_("AST_EXECUCOES"), SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TECNICO_ID: SGO_UTILS.safe(payload.TECNICO_ID || entrada.TECNICO_ID),
      TECNICO_NOME: tecnico ? tecnico.NOME : entrada.TECNICO_NOME,
      DATA_EXECUCAO: SGO_UTILS.safe(payload.DATA_EXECUCAO) || SGO_UTILS.nowIso(),
      SERVICO_REALIZADO: SGO_UTILS.safe(payload.SERVICO_REALIZADO),
      PECAS_APLICADAS: SGO_UTILS.safe(payload.PECAS_APLICADAS),
      AJUSTES_REALIZADOS: SGO_UTILS.safe(payload.AJUSTES_REALIZADOS),
      LIMPEZA_REALIZADA: SGO_UTILS.safe(payload.LIMPEZA_REALIZADA),
      COMPONENTES_SUBSTITUIDOS: SGO_UTILS.safe(payload.COMPONENTES_SUBSTITUIDOS),
      TESTES_APOS_REPARO: SGO_UTILS.safe(payload.TESTES_APOS_REPARO),
      RESULTADO_FINAL: SGO_UTILS.safe(payload.RESULTADO_FINAL),
      RECOMENDACAO_CLIENTE: SGO_UTILS.safe(payload.RECOMENDACAO_CLIENTE),
      GARANTIA_SERVICO: SGO_UTILS.safe(payload.GARANTIA_SERVICO),
      CONCLUSAO_TECNICA: SGO_UTILS.safe(payload.CONCLUSAO_TECNICA),
      STATUS_FINAL: SGO_UTILS.safeUpper(payload.STATUS_FINAL || "EM_MANUTENCAO"),
      CRIADO_POR: sessao.usuario
    }));
    atualizarEntradaStatus_(sessao, entrada, "EM_MANUTENCAO", "Execucao de manutencao registrada.", "Realizar teste/conclusao tecnica");
    registrarMov_(sessao, entradaId, "EXECUCAO_MANUTENCAO", entrada.STATUS, "EM_MANUTENCAO", entrada.TECNICO_ID, item.TECNICO_ID, "ASSISTENCIA_LOCAL", "Execucao da manutencao registrada.", "", "Realizar teste/conclusao tecnica");
    return { success: true, message: "Execucao registrada.", item: item };
  }

  function concluirTecnica(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    setup();
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    const diag = diagnosticoAtual_(entradaId);
    if (!diag) return { success: false, message: "Nao e permitido concluir sem diagnostico." };
    const pendentes = pecasPendentes_(entradaId);
    if (pendentes.length) return { success: false, message: "Nao e permitido concluir com peca pendente." };
    if (SGO_UTILS.safeUpper(entrada.STATUS) === "AGUARDANDO_TERCEIRO" || SGO_UTILS.safeUpper(entrada.STATUS) === "TERCEIROS" || SGO_UTILS.safeUpper(entrada.STATUS) === "ENVIADO_PARA_TERCEIRO") {
      return { success: false, message: "Nao e permitido concluir enquanto aguarda terceiro." };
    }
    if (SGO_UTILS.safeUpper(payload.TESTE_OBRIGATORIO) === "S" && !testeAprovado_(entradaId)) {
      return { success: false, message: "Teste de bancada obrigatorio pendente ou nao aprovado." };
    }
    if (!payload.CONCLUSAO_TECNICA || !payload.RESULTADO_FINAL) return { success: false, message: "Informe conclusao tecnica e resultado final." };

    const exec = registrarExecucao(sessionId, entradaId, Object.assign({}, payload, {
      SERVICO_REALIZADO: payload.SERVICO_REALIZADO || payload.CONCLUSAO_TECNICA,
      STATUS_FINAL: SGO_UTILS.safeUpper(payload.STATUS_FINAL || "PRONTO_PARA_RETIRADA")
    }));
    const novoStatus = SGO_UTILS.safeUpper(payload.STATUS_FINAL || "PRONTO_PARA_RETIRADA");
    atualizarEntradaStatus_(sessao, entrada, novoStatus, "Conclusao tecnica registrada.", "Equipamento pronto para retirada/entrega");
    criarAlerta_(entradaId, "PRONTO_PARA_RETIRADA", "VERDE", "Equipamento pronto para retirada/entrega.");
    registrarMov_(sessao, entradaId, "MANUTENCAO_CONCLUIDA", entrada.STATUS, novoStatus, entrada.TECNICO_ID, SGO_UTILS.safe(payload.TECNICO_ID || entrada.TECNICO_ID), localizacaoPorStatus_(novoStatus), "Manutencao concluida tecnicamente.", "", "Equipamento pronto para retirada/entrega");
    return { success: true, message: "Conclusao tecnica registrada.", execucao: exec.item, status: novoStatus };
  }

  function gerarRelatorioDiagnostico(sessionId, entradaId) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    return gerarRelatorioTecnico_(sessao, entradaId, "RELATORIO_DIAGNOSTICO_TECNICO");
  }

  function gerarRelatorioManutencao(sessionId, entradaId) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    return gerarRelatorioTecnico_(sessao, entradaId, "RELATORIO_MANUTENCAO_AST");
  }

  function obterResumoComercial(sessionId, entradaId) {
    const sessao = exigirSessao(sessionId);
    const dados = montarContextoTecnico_(entradaId);
    if (!dados) return { success: false, message: "Entrada nao encontrada." };
    const e = dados.entrada;
    const perm = exigirAst_(sessao, "COMERCIAL", e);
    if (!perm.success) return perm;
    const diag = dados.diagnostico || {};
    const pecas = dados.pecas || [];
    const texto = [
      "Resumo tecnico para orcamento - Metrolabs SGO+",
      "Entrada: " + e.PROTOCOLO,
      "Cliente: " + e.CLIENTE_NOME,
      "Unidade: " + e.UNIDADE_NOME,
      "Equipamento: " + e.EQUIPAMENTO_NOME,
      "Serie: " + (e.EQUIPAMENTO_SERIE || "--"),
      "Defeito confirmado: " + (diag.DEFEITO_CONFIRMADO || "--"),
      "Causa provavel: " + (diag.CAUSA_PROVAVEL || "--"),
      "Recomendacao: " + (diag.RECOMENDACAO_TECNICA || "--"),
      "Pecas: " + (pecas.length ? pecas.map(function(p) { return (p.NOME_PECA || p.DESCRICAO) + " x" + (p.QUANTIDADE || 1); }).join("; ") : "Sem pecas registradas"),
      "Rastreabilidade: " + e.URL_PUBLICA
    ].join("\n");
    registrarMov_(sessao, entradaId, "RESUMO_ORCAMENTO", e.STATUS, e.STATUS, e.TECNICO_ID, e.TECNICO_ID, e.LOCALIZACAO_ATUAL, "Resumo tecnico para orcamento gerado.", "", e.PROXIMA_ACAO);
    return { success: true, texto: texto, url: "https://wa.me/?text=" + encodeURIComponent(texto) };
  }

  function registrarEnvioTerceiro(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    setup();
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    if (!podeVerCliente_(sessao, entrada.CLIENTE_ID)) return { success: false, message: "Acesso negado." };
    const perm = exigirAst_(sessao, "TERCEIROS", entrada);
    if (!perm.success) return perm;

    const acessorios = Array.isArray(payload.ACESSORIOS) ? payload.ACESSORIOS : [];
    const semAcessorios = simNao_(payload.SEM_ACESSORIOS);
    if (simNao_(payload.ACESSORIOS_CONFIRMADOS) !== "S") return { success: false, message: "Confirme formalmente os acessorios enviados ao terceiro." };
    if (semAcessorios !== "S" && !acessorios.length) return { success: false, message: "Registre os acessorios enviados ou marque que nao ha acessorios." };
    if (!payload.MOTIVO_ENVIO || !payload.EMPRESA_NOME) return { success: false, message: "Informe empresa terceira e motivo do envio." };

    const fornecedor = payload.FORNECEDOR_ID ? SGO_DATA.getById(S.CAD_FORNECEDORES, payload.FORNECEDOR_ID, DB_ESTOQUE) : null;
    const statusFornecedor = statusFornecedorTerceiro_(payload, fornecedor);
    if (["BLOQUEADO", "REPROVADO"].indexOf(statusFornecedor) >= 0 && simNao_(payload.LIBERACAO_GESTOR) !== "S") {
      criarAlerta_(entradaId, "EMPRESA_TERCEIRA_BLOQUEADA", "VERMELHO", "Tentativa de envio para empresa bloqueada/reprovada.");
      return { success: false, message: "Empresa bloqueada/reprovada exige liberacao de gestor." };
    }

    const statusInicial = SGO_UTILS.safeUpper(payload.STATUS_TERCEIRO || "TERCEIRO_ENVIADO");
    const terceiro = SGO_DATA.insert(S.AST_TERCEIROS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      CLIENTE_ID: entrada.CLIENTE_ID,
      UNIDADE_ID: entrada.UNIDADE_ID,
      EQUIPAMENTO_ID: entrada.EQUIPAMENTO_ID,
      FORNECEDOR_ID: SGO_UTILS.safe(payload.FORNECEDOR_ID),
      EMPRESA_NOME: SGO_UTILS.safe(payload.EMPRESA_NOME || (fornecedor && (fornecedor.NOME_FANTASIA || fornecedor.RAZAO_SOCIAL))),
      EMPRESA_CNPJ: SGO_UTILS.safe(payload.EMPRESA_CNPJ || (fornecedor && fornecedor.CNPJ)),
      TIPO_EMPRESA: SGO_UTILS.safeUpper(payload.TIPO_EMPRESA || (fornecedor && fornecedor.TIPO_FORNECEDOR) || "ASSISTENCIA_TECNICA"),
      RESPONSAVEL_EMPRESA: SGO_UTILS.safe(payload.RESPONSAVEL_EMPRESA || (fornecedor && fornecedor.CONTATO)),
      TELEFONE_WHATSAPP: SGO_UTILS.safe(payload.TELEFONE_WHATSAPP || (fornecedor && fornecedor.TELEFONE)),
      EMAIL: SGO_UTILS.safe(payload.EMAIL || (fornecedor && fornecedor.EMAIL)),
      CIDADE_UF: SGO_UTILS.safe(payload.CIDADE_UF || ((fornecedor && fornecedor.CIDADE ? fornecedor.CIDADE : "") + (fornecedor && fornecedor.UF ? "/" + fornecedor.UF : ""))),
      ESPECIALIDADE: SGO_UTILS.safe(payload.ESPECIALIDADE),
      STATUS_FORNECEDOR: statusFornecedor,
      MOTIVO_ENVIO: SGO_UTILS.safe(payload.MOTIVO_ENVIO),
      FORMA_ENVIO: SGO_UTILS.safeUpper(payload.FORMA_ENVIO || "OUTRO"),
      CODIGO_RASTREIO: SGO_UTILS.safe(payload.CODIGO_RASTREIO),
      PRAZO_PROMETIDO: SGO_UTILS.safe(payload.PRAZO_PROMETIDO),
      VALOR_ESTIMADO: SGO_UTILS.safe(payload.VALOR_ESTIMADO),
      CLIENTE_INFORMADO: simNao_(payload.CLIENTE_INFORMADO),
      NECESSITA_APROVACAO_CLIENTE: simNao_(payload.NECESSITA_APROVACAO_CLIENTE),
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES),
      STATUS_TERCEIRO: statusInicial,
      PRAZO_INFORMADO: SGO_UTILS.safe(payload.PRAZO_PROMETIDO),
      PROXIMA_ACAO: SGO_UTILS.safe(payload.PROXIMA_ACAO || "Acompanhar recebimento e diagnostico do terceiro"),
      ACESSORIOS_CONFIRMADOS: "S",
      SEM_ACESSORIOS: semAcessorios,
      LIBERACAO_GESTOR: simNao_(payload.LIBERACAO_GESTOR),
      ENVIADO_POR: sessao.usuario,
      ENVIADO_EM: SGO_UTILS.safe(payload.ENVIADO_EM) || SGO_UTILS.nowIso(),
      CRIADO_POR: sessao.usuario,
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    }));

    acessorios.forEach(function(a) { salvarAcessorioTerceiro_(sessao, terceiro.ID, entradaId, a); });
    (Array.isArray(payload.FOTOS) ? payload.FOTOS : []).forEach(function(f) { salvarFotoTerceiro_(sessao, terceiro.ID, entradaId, f); });
    (Array.isArray(payload.ANEXOS) ? payload.ANEXOS : []).forEach(function(a) { salvarAnexoTerceiro_(sessao, terceiro.ID, entradaId, a); });

    atualizarEntradaStatus_(sessao, entrada, "ENVIADO_PARA_TERCEIRO", "Equipamento enviado para assistencia terceirizada.", terceiro.PROXIMA_ACAO);
    registrarMov_(sessao, entradaId, "ENVIO_TERCEIRO", entrada.STATUS, "ENVIADO_PARA_TERCEIRO", entrada.TECNICO_ID, entrada.TECNICO_ID, "ASSISTENCIA_TERCEIRIZADA", "Equipamento enviado para terceiro: " + terceiro.EMPRESA_NOME, terceiro.MOTIVO_ENVIO, terceiro.PROXIMA_ACAO);
    gerarAlertasTerceiro_(entradaId, terceiro);
    return { success: true, message: "Envio para terceiro registrado.", item: terceiro };
  }

  function salvarAcessorioTerceiro(sessionId, terceiroId, payload) {
    const sessao = exigirSessao(sessionId);
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return { success: false, message: "Registro de terceiro nao encontrado." };
    const perm = exigirAst_(sessao, "TERCEIROS", SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID) || {});
    if (!perm.success) return perm;
    const item = salvarAcessorioTerceiro_(sessao, terceiroId, terceiro.ENTRADA_ID, payload || {});
    registrarMovTerceiro_(sessao, terceiro, "TERCEIRO_ACESSORIO", "Acessorio enviado ao terceiro registrado.");
    return { success: true, message: "Acessorio de terceiro registrado.", item: item };
  }

  function anexarDocumentoTerceiro(sessionId, terceiroId, payload) {
    const sessao = exigirSessao(sessionId);
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return { success: false, message: "Registro de terceiro nao encontrado." };
    const perm = exigirAst_(sessao, "TERCEIROS", SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID) || {});
    if (!perm.success) return perm;
    const item = salvarAnexoTerceiro_(sessao, terceiroId, terceiro.ENTRADA_ID, payload || {});
    registrarMovTerceiro_(sessao, terceiro, "TERCEIRO_ANEXO", "Anexo externo registrado: " + item.TIPO_ANEXO);
    return { success: true, message: "Anexo de terceiro registrado.", item: item };
  }

  function registrarAcompanhamentoTerceiro(sessionId, terceiroId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return { success: false, message: "Registro de terceiro nao encontrado." };
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    const perm = exigirAst_(sessao, "TERCEIROS", entrada || {});
    if (!perm.success) return perm;
    const status = SGO_UTILS.safeUpper(payload.STATUS_INFORMADO || terceiro.STATUS_TERCEIRO || "TERCEIRO_ENVIADO");
    const item = SGO_DATA.insert(S.AST_TERCEIROS_ACOMPANHAMENTOS, SGO_DATA.gerarRegistroBase({
      TERCEIRO_ID: terceiroId,
      ENTRADA_ID: terceiro.ENTRADA_ID,
      CANAL: SGO_UTILS.safeUpper(payload.CANAL || "WHATSAPP"),
      STATUS_INFORMADO: status,
      PRAZO_INFORMADO: SGO_UTILS.safe(payload.PRAZO_INFORMADO),
      PROXIMA_ACAO: SGO_UTILS.safe(payload.PROXIMA_ACAO),
      INFORMACAO_RECEBIDA: SGO_UTILS.safe(payload.INFORMACAO_RECEBIDA),
      ANEXO_LINK: SGO_UTILS.safe(payload.ANEXO_LINK),
      CRIADO_POR: sessao.usuario
    }));
    SGO_DATA.update(S.AST_TERCEIROS, terceiroId, {
      STATUS_TERCEIRO: status,
      PRAZO_INFORMADO: SGO_UTILS.safe(payload.PRAZO_INFORMADO) || terceiro.PRAZO_INFORMADO,
      PROXIMA_ACAO: SGO_UTILS.safe(payload.PROXIMA_ACAO) || terceiro.PROXIMA_ACAO,
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    });
    if (entrada) {
      atualizarEntradaStatus_(sessao, entrada, statusEntradaPorTerceiro_(status), "Acompanhamento de terceiro registrado.", item.PROXIMA_ACAO);
      registrarMov_(sessao, terceiro.ENTRADA_ID, "ACOMPANHAMENTO_TERCEIRO", entrada.STATUS, statusEntradaPorTerceiro_(status), entrada.TECNICO_ID, entrada.TECNICO_ID, "ASSISTENCIA_TERCEIRIZADA", "Acompanhamento terceiro (" + item.CANAL + "): " + status, "", item.PROXIMA_ACAO);
    }
    alertasPorStatusTerceiro_(terceiro.ENTRADA_ID, status);
    return { success: true, message: "Acompanhamento registrado.", item: item };
  }

  function registrarRetornoTerceiro(sessionId, terceiroId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return { success: false, message: "Registro de terceiro nao encontrado." };
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "TERCEIROS", entrada);
    if (!perm.success) return perm;
    if (!payload.CONDICAO_RETORNO || !payload.CONCLUSAO_RETORNO) return { success: false, message: "Informe condicao e conclusao do retorno." };

    SGO_DATA.update(S.AST_TERCEIROS, terceiroId, {
      RETORNADO_EM: SGO_UTILS.safe(payload.RETORNADO_EM) || SGO_UTILS.nowIso(),
      RETORNO_RECEBIDO_POR: SGO_UTILS.safe(payload.RETORNO_RECEBIDO_POR || sessao.usuario),
      CONDICAO_RETORNO: SGO_UTILS.safe(payload.CONDICAO_RETORNO),
      SERVICO_TERCEIRO: SGO_UTILS.safe(payload.SERVICO_TERCEIRO),
      PECAS_SUBSTITUIDAS_TERCEIRO: SGO_UTILS.safe(payload.PECAS_SUBSTITUIDAS_TERCEIRO),
      GARANTIA_TERCEIRO: SGO_UTILS.safe(payload.GARANTIA_TERCEIRO),
      PENDENCIAS_RETORNO: SGO_UTILS.safe(payload.PENDENCIAS_RETORNO),
      PRECISA_TESTE_INTERNO: simNao_(payload.PRECISA_TESTE_INTERNO),
      PRECISA_EXECUCAO_INTERNA: simNao_(payload.PRECISA_EXECUCAO_INTERNA),
      CONCLUSAO_RETORNO: SGO_UTILS.safe(payload.CONCLUSAO_RETORNO),
      STATUS_TERCEIRO: "TERCEIRO_RECEBIDO_METROLABS",
      PROXIMA_ACAO: SGO_UTILS.safe(payload.PROXIMA_ACAO || "Realizar inspecao pos-retorno"),
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    });
    (Array.isArray(payload.FOTOS) ? payload.FOTOS : []).forEach(function(f) { salvarFotoTerceiro_(sessao, terceiroId, terceiro.ENTRADA_ID, f); });
    (Array.isArray(payload.ANEXOS) ? payload.ANEXOS : []).forEach(function(a) { salvarAnexoTerceiro_(sessao, terceiroId, terceiro.ENTRADA_ID, a); });

    atualizarEntradaStatus_(sessao, entrada, "TERCEIRO_RECEBIDO_METROLABS", "Retorno de terceiro registrado.", "Realizar inspecao pos-retorno");
    registrarMov_(sessao, terceiro.ENTRADA_ID, "RETORNO_TERCEIRO", entrada.STATUS, "TERCEIRO_RECEBIDO_METROLABS", entrada.TECNICO_ID, entrada.TECNICO_ID, "ASSISTENCIA_LOCAL", "Equipamento recebido de terceiro.", "", "Realizar inspecao pos-retorno");
    criarAlerta_(terceiro.ENTRADA_ID, "INSPECAO_POS_RETORNO_PENDENTE", "AMARELO", "Equipamento retornou do terceiro e exige inspecao Metrolabs.");
    return { success: true, message: "Retorno de terceiro registrado." };
  }

  function registrarInspecaoRetornoTerceiro(sessionId, terceiroId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return { success: false, message: "Registro de terceiro nao encontrado." };
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "TERCEIROS", entrada);
    if (!perm.success) return perm;
    if (!payload.INSPECAO_RESULTADO) return { success: false, message: "Informe o resultado da inspecao pos-retorno." };
    const resultado = SGO_UTILS.safeUpper(payload.INSPECAO_RESULTADO);
    const novoStatus = resultado === "REPROVADO" ? "EM_MANUTENCAO" : (resultado === "INCONCLUSIVO" ? "TERCEIRO_INSPECAO_RETORNO" : "TESTE");
    SGO_DATA.update(S.AST_TERCEIROS, terceiroId, {
      INSPECAO_TECNICO: SGO_UTILS.safe(payload.INSPECAO_TECNICO),
      INSPECAO_CONDICAO: SGO_UTILS.safe(payload.INSPECAO_CONDICAO),
      INSPECAO_ACESSORIOS: SGO_UTILS.safe(payload.INSPECAO_ACESSORIOS),
      INSPECAO_VISUAL: SGO_UTILS.safe(payload.INSPECAO_VISUAL),
      INSPECAO_FUNCIONAL: SGO_UTILS.safe(payload.INSPECAO_FUNCIONAL),
      INSPECAO_RESULTADO: resultado,
      INSPECAO_OBSERVACOES: SGO_UTILS.safe(payload.INSPECAO_OBSERVACOES),
      INSPECAO_PROXIMA_ACAO: SGO_UTILS.safe(payload.INSPECAO_PROXIMA_ACAO),
      STATUS_TERCEIRO: resultado === "REPROVADO" ? "TERCEIRO_INSPECAO_RETORNO" : "TERCEIRO_FINALIZADO",
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    });
    atualizarEntradaStatus_(sessao, entrada, novoStatus, "Inspecao pos-retorno registrada.", payload.INSPECAO_PROXIMA_ACAO || "Seguir fluxo tecnico interno");
    registrarMov_(sessao, terceiro.ENTRADA_ID, "INSPECAO_POS_RETORNO", entrada.STATUS, novoStatus, entrada.TECNICO_ID, entrada.TECNICO_ID, "ASSISTENCIA_LOCAL", "Inspecao pos-retorno registrada: " + resultado, "", payload.INSPECAO_PROXIMA_ACAO);
    return { success: true, message: "Inspecao pos-retorno registrada.", status: novoStatus };
  }

  function gerarDocumentoTerceiro(sessionId, terceiroId, tipo) {
    const sessao = exigirSessao(sessionId);
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return { success: false, message: "Registro de terceiro nao encontrado." };
    const perm = exigirAst_(sessao, "TERCEIROS", SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID) || {});
    if (!perm.success) return perm;
    const tipoDoc = SGO_UTILS.safeUpper(tipo || "TERMO_ENVIO_TERCEIRO");
    return gerarDocumentoTerceiro_(sessao, terceiroId, tipoDoc);
  }

  function obterWhatsappTerceiro(sessionId, terceiroId, tipo) {
    const sessao = exigirSessao(sessionId);
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return { success: false, message: "Registro de terceiro nao encontrado." };
    const perm = exigirAst_(sessao, "TERCEIROS", SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID) || {});
    if (!perm.success) return perm;
    const ctx = montarContextoTerceiro_(terceiroId);
    const texto = montarWhatsappTerceiro_(ctx, tipo || "ACOMPANHAMENTO");
    registrarMovTerceiro_(sessao, terceiro, "WHATSAPP_TERCEIRO", "Mensagem WhatsApp de terceiro gerada.");
    return { success: true, texto: texto, url: "https://wa.me/?text=" + encodeURIComponent(texto) };
  }

  function registrarEntradaLaboratorio(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    setup();
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    if (!podeVerCliente_(sessao, entrada.CLIENTE_ID)) return { success: false, message: "Acesso negado." };
    const perm = exigirAst_(sessao, "LABORATORIO", entrada);
    if (!perm.success) return perm;
    if (!payload.TIPO_SERVICO || !payload.PROCEDIMENTO || !payload.CRITERIO_ACEITACAO) {
      return { success: false, message: "Informe tipo de servico, procedimento e criterio de aceitacao." };
    }
    const tecnico = payload.RESPONSAVEL_ID ? SGO_DATA.getById(S.CAD_TECNICOS, payload.RESPONSAVEL_ID) : null;
    const existente = labAtual_(entradaId);
    const dados = {
      ENTRADA_ID: entradaId,
      CLIENTE_ID: entrada.CLIENTE_ID,
      UNIDADE_ID: entrada.UNIDADE_ID,
      EQUIPAMENTO_ID: entrada.EQUIPAMENTO_ID,
      TIPO_SERVICO: SGO_UTILS.safeUpper(payload.TIPO_SERVICO),
      AREA_RESPONSAVEL: SGO_UTILS.safeUpper(payload.AREA_RESPONSAVEL || "LABORATORIO_INTERNO"),
      PROCEDIMENTO: SGO_UTILS.safe(payload.PROCEDIMENTO),
      NORMA: SGO_UTILS.safe(payload.NORMA),
      CRITERIO_ACEITACAO: SGO_UTILS.safe(payload.CRITERIO_ACEITACAO),
      PRIORIDADE: SGO_UTILS.safeUpper(payload.PRIORIDADE || entrada.PRIORIDADE || "NORMAL"),
      PRAZO_PROMETIDO: SGO_UTILS.safe(payload.PRAZO_PROMETIDO || entrada.PRAZO_PROMETIDO),
      RESPONSAVEL_ID: SGO_UTILS.safe(payload.RESPONSAVEL_ID),
      RESPONSAVEL_NOME: tecnico ? SGO_UTILS.safe(tecnico.NOME) : "",
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES),
      STATUS: "LAB_ENTRADA_REGISTRADA",
      ENTRADA_EM: SGO_UTILS.safe(payload.ENTRADA_EM) || SGO_UTILS.nowIso(),
      CRIADO_POR: sessao.usuario,
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    };
    let lab;
    if (existente) {
      SGO_DATA.update(S.AST_LAB_ENTRADAS, existente.ID, dados);
      lab = Object.assign({}, existente, dados);
    } else {
      lab = SGO_DATA.insert(S.AST_LAB_ENTRADAS, SGO_DATA.gerarRegistroBase(dados));
    }
    atualizarEntradaStatus_(sessao, entrada, "ENTRADA_LABORATORIO", "Entrada em laboratorio registrada.", "Aguardar ensaio laboratorial");
    registrarMov_(sessao, entradaId, "LAB_ENTRADA", entrada.STATUS, "ENTRADA_LABORATORIO", entrada.TECNICO_ID, dados.RESPONSAVEL_ID, "LABORATORIO_INTERNO", "Entrada em laboratorio registrada: " + dados.TIPO_SERVICO, "", "Aguardar ensaio laboratorial");
    criarAlerta_(entradaId, "LAB_AGUARDANDO_ENSAIO", "AMARELO", "Laboratorio aguardando ensaio.");
    if (prazoProximo_(dados.PRAZO_PROMETIDO)) criarAlerta_(entradaId, "LAB_PRAZO_PROXIMO", "AMARELO", "Prazo laboratorial proximo do vencimento.");
    return { success: true, message: "Entrada de laboratorio registrada.", item: lab };
  }

  function adicionarPadraoLaboratorio(sessionId, labId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, labId);
    if (!lab) return { success: false, message: "Entrada de laboratorio nao encontrada." };
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID);
    const perm = exigirAst_(sessao, "LABORATORIO", entrada || {});
    if (!perm.success) return perm;
    if (!payload.NOME_PADRAO) return { success: false, message: "Informe o padrao utilizado." };
    const situacao = situacaoPadrao_(payload);
    if (["VENCIDO", "BLOQUEADO"].indexOf(situacao) >= 0 && simNao_(payload.LIBERACAO_GESTOR) === "S" && !astPodePerfil_(sessao, "GESTAO")) {
      return { success: false, message: "Liberacao de padrao vencido/bloqueado exige ADMIN ou GESTOR." };
    }
    const item = SGO_DATA.insert(S.AST_LAB_PADROES, SGO_DATA.gerarRegistroBase({
      LAB_ENTRADA_ID: labId,
      ENTRADA_ID: lab.ENTRADA_ID,
      NOME_PADRAO: SGO_UTILS.safe(payload.NOME_PADRAO),
      CODIGO_INTERNO: SGO_UTILS.safe(payload.CODIGO_INTERNO),
      NUMERO_SERIE: SGO_UTILS.safe(payload.NUMERO_SERIE),
      CERTIFICADO_PADRAO: SGO_UTILS.safe(payload.CERTIFICADO_PADRAO),
      VALIDADE_CERTIFICADO: SGO_UTILS.safe(payload.VALIDADE_CERTIFICADO),
      INCERTEZA: SGO_UTILS.safe(payload.INCERTEZA),
      RASTREABILIDADE: SGO_UTILS.safe(payload.RASTREABILIDADE),
      SITUACAO: situacao,
      OBSERVACAO: SGO_UTILS.safe(payload.OBSERVACAO),
      LIBERACAO_GESTOR: simNao_(payload.LIBERACAO_GESTOR),
      FILE_ID: SGO_UTILS.safe(payload.FILE_ID),
      LINK_CERTIFICADO: SGO_UTILS.safe(payload.LINK_CERTIFICADO),
      CRIADO_POR: sessao.usuario
    }));
    if (entrada) registrarMov_(sessao, lab.ENTRADA_ID, "LAB_PADRAO", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, lab.RESPONSAVEL_ID, "LABORATORIO_INTERNO", "Padrao laboratorial adicionado: " + item.NOME_PADRAO, "", entrada.PROXIMA_ACAO);
    if (situacao === "VENCIDO") criarAlerta_(lab.ENTRADA_ID, "LAB_PADRAO_VENCIDO", "VERMELHO", "Padrao laboratorial vencido.");
    if (situacao === "BLOQUEADO") criarAlerta_(lab.ENTRADA_ID, "LAB_PADRAO_BLOQUEADO", "VERMELHO", "Padrao laboratorial bloqueado.");
    return { success: true, message: "Padrao laboratorial registrado.", item: item };
  }

  function registrarEnsaioLaboratorio(sessionId, labId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, labId);
    if (!lab) return { success: false, message: "Entrada de laboratorio nao encontrada." };
    const perm = exigirAst_(sessao, "LABORATORIO", SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID) || {});
    if (!perm.success) return perm;
    if (!payload.TIPO_ENSAIO || !payload.PROCEDIMENTO_EXECUTADO) return { success: false, message: "Informe tipo de ensaio e procedimento executado." };
    const tecnico = payload.TECNICO_ID ? SGO_DATA.getById(S.CAD_TECNICOS, payload.TECNICO_ID) : null;
    const conformidade = SGO_UTILS.safeUpper(payload.CONFORMIDADE || "INCONCLUSIVO");
    const item = SGO_DATA.insert(S.AST_LAB_ENSAIOS, SGO_DATA.gerarRegistroBase({
      LAB_ENTRADA_ID: labId,
      ENTRADA_ID: lab.ENTRADA_ID,
      TIPO_ENSAIO: SGO_UTILS.safeUpper(payload.TIPO_ENSAIO),
      INICIO_EM: SGO_UTILS.safe(payload.INICIO_EM) || SGO_UTILS.nowIso(),
      FIM_EM: SGO_UTILS.safe(payload.FIM_EM),
      TECNICO_ID: SGO_UTILS.safe(payload.TECNICO_ID || lab.RESPONSAVEL_ID),
      TECNICO_NOME: tecnico ? SGO_UTILS.safe(tecnico.NOME) : SGO_UTILS.safe(lab.RESPONSAVEL_NOME),
      TEMPERATURA: SGO_UTILS.safe(payload.TEMPERATURA),
      UMIDADE: SGO_UTILS.safe(payload.UMIDADE),
      PRESSAO: SGO_UTILS.safe(payload.PRESSAO),
      OBS_AMBIENTAIS: SGO_UTILS.safe(payload.OBS_AMBIENTAIS),
      PROCEDIMENTO_EXECUTADO: SGO_UTILS.safe(payload.PROCEDIMENTO_EXECUTADO),
      PONTOS_AVALIADOS: SGO_UTILS.safe(payload.PONTOS_AVALIADOS),
      RESULTADO_BRUTO: SGO_UTILS.safe(payload.RESULTADO_BRUTO),
      RESULTADO_TRATADO: SGO_UTILS.safe(payload.RESULTADO_TRATADO),
      CRITERIO_ACEITACAO: SGO_UTILS.safe(payload.CRITERIO_ACEITACAO || lab.CRITERIO_ACEITACAO),
      DESVIO_ENCONTRADO: SGO_UTILS.safe(payload.DESVIO_ENCONTRADO),
      INCERTEZA: SGO_UTILS.safe(payload.INCERTEZA),
      CONFORMIDADE: conformidade,
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES),
      EVIDENCIAS: SGO_UTILS.safe(payload.EVIDENCIAS),
      CRIADO_POR: sessao.usuario
    }));
    atualizarLabStatus_(sessao, lab, "LAB_AGUARDANDO_ANALISE");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID);
    if (entrada) {
      atualizarEntradaStatus_(sessao, entrada, "LAB_EM_PROCESSO", "Ensaio laboratorial registrado.", "Analisar resultado laboratorial");
      registrarMov_(sessao, lab.ENTRADA_ID, "LAB_ENSAIO", entrada.STATUS, "LAB_EM_PROCESSO", entrada.TECNICO_ID, item.TECNICO_ID, "LABORATORIO_INTERNO", "Ensaio laboratorial registrado: " + item.TIPO_ENSAIO, "", "Analisar resultado laboratorial");
    }
    if (conformidade === "INCONCLUSIVO") criarAlerta_(lab.ENTRADA_ID, "LAB_RESULTADO_INCONCLUSIVO", "AMARELO", "Resultado laboratorial inconclusivo.");
    return { success: true, message: "Ensaio laboratorial registrado.", item: item };
  }

  function anexarEvidenciaLaboratorio(sessionId, labId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, labId);
    if (!lab) return { success: false, message: "Entrada de laboratorio nao encontrada." };
    const perm = exigirAst_(sessao, "LABORATORIO", SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID) || {});
    if (!perm.success) return perm;
    const link = SGO_UTILS.safe(payload.LINK_ARQUIVO || payload.URL || payload.URL_ANEXO);
    if (!link && !payload.FILE_ID) return { success: false, message: "Informe link/URL ou File ID da evidencia." };
    const item = SGO_DATA.insert(sheet_("AST_LAB_EVIDENCIAS"), SGO_DATA.gerarRegistroBase({
      LAB_ENTRADA_ID: labId,
      ENTRADA_ID: lab.ENTRADA_ID,
      TIPO_EVIDENCIA: SGO_UTILS.safeUpper(payload.TIPO_EVIDENCIA || "OUTRO"),
      NOME: SGO_UTILS.safe(payload.NOME || payload.TIPO_EVIDENCIA || "Evidencia laboratorial"),
      LINK_ARQUIVO: link,
      FILE_ID: SGO_UTILS.safe(payload.FILE_ID),
      OBSERVACAO: SGO_UTILS.safe(payload.OBSERVACAO),
      CRIADO_POR: sessao.usuario
    }));
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID);
    if (entrada) registrarMov_(sessao, lab.ENTRADA_ID, "LAB_EVIDENCIA", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, lab.RESPONSAVEL_ID, "LABORATORIO_INTERNO", "Evidencia laboratorial anexada: " + item.TIPO_EVIDENCIA, "", entrada.PROXIMA_ACAO);
    return { success: true, message: "Evidencia laboratorial anexada.", item: item };
  }

  function consolidarResultadoLaboratorio(sessionId, labId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, labId);
    if (!lab) return { success: false, message: "Entrada de laboratorio nao encontrada." };
    const entradaLab = SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID);
    const perm = exigirAst_(sessao, "LABORATORIO", entradaLab || {});
    if (!perm.success) return perm;
    if (!payload.RESULTADO_FINAL || !payload.CONFORMIDADE) return { success: false, message: "Informe resultado final e conformidade." };
    const bloqueio = padroesBloqueantes_(labId);
    if (bloqueio.length && simNao_(payload.APROVACAO_GESTOR) !== "S") {
      return { success: false, message: "Existe padrao vencido/bloqueado. Informe liberacao de gestor para concluir." };
    }
    if (bloqueio.length && !astPodePerfil_(sessao, "GESTAO")) {
      return { success: false, message: "Conclusao com padrao vencido/bloqueado exige ADMIN ou GESTOR." };
    }
    const responsavel = payload.RESPONSAVEL_ID ? SGO_DATA.getById(S.CAD_TECNICOS, payload.RESPONSAVEL_ID) : null;
    const conformidade = SGO_UTILS.safeUpper(payload.CONFORMIDADE);
    const item = SGO_DATA.insert(S.AST_LAB_RESULTADOS, SGO_DATA.gerarRegistroBase({
      LAB_ENTRADA_ID: labId,
      ENTRADA_ID: lab.ENTRADA_ID,
      RESULTADO_FINAL: SGO_UTILS.safe(payload.RESULTADO_FINAL),
      CONFORMIDADE: conformidade,
      RESUMO_TECNICO: SGO_UTILS.safe(payload.RESUMO_TECNICO),
      RESTRICOES: SGO_UTILS.safe(payload.RESTRICOES),
      RECOMENDACOES: SGO_UTILS.safe(payload.RECOMENDACOES),
      NECESSITA_MANUTENCAO: simNao_(payload.NECESSITA_MANUTENCAO),
      NECESSITA_NOVA_CALIBRACAO: simNao_(payload.NECESSITA_NOVA_CALIBRACAO),
      NECESSITA_QUALIFICACAO_COMPLEMENTAR: simNao_(payload.NECESSITA_QUALIFICACAO_COMPLEMENTAR),
      VALIDADE_RESULTADO: SGO_UTILS.safe(payload.VALIDADE_RESULTADO),
      PROXIMA_CALIBRACAO_SUGERIDA: SGO_UTILS.safe(payload.PROXIMA_CALIBRACAO_SUGERIDA),
      RESPONSAVEL_ID: SGO_UTILS.safe(payload.RESPONSAVEL_ID || lab.RESPONSAVEL_ID),
      RESPONSAVEL_NOME: responsavel ? responsavel.NOME : lab.RESPONSAVEL_NOME,
      APROVACAO_GESTOR: simNao_(payload.APROVACAO_GESTOR),
      CRIADO_POR: sessao.usuario
    }));
    const novoStatus = statusLabPorConformidade_(conformidade);
    SGO_DATA.update(S.AST_LAB_ENTRADAS, labId, {
      RESULTADO_FINAL: item.RESULTADO_FINAL,
      CONFORMIDADE: conformidade,
      RESUMO_TECNICO: item.RESUMO_TECNICO,
      RESTRICOES: item.RESTRICOES,
      RECOMENDACOES: item.RECOMENDACOES,
      NECESSITA_MANUTENCAO: item.NECESSITA_MANUTENCAO,
      NECESSITA_NOVA_CALIBRACAO: item.NECESSITA_NOVA_CALIBRACAO,
      NECESSITA_QUALIFICACAO_COMPLEMENTAR: item.NECESSITA_QUALIFICACAO_COMPLEMENTAR,
      VALIDADE_RESULTADO: item.VALIDADE_RESULTADO,
      PROXIMA_CALIBRACAO_SUGERIDA: item.PROXIMA_CALIBRACAO_SUGERIDA,
      APROVACAO_GESTOR: item.APROVACAO_GESTOR,
      STATUS: novoStatus,
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    });
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID);
    if (entrada) {
      atualizarEntradaStatus_(sessao, entrada, novoStatus, "Resultado laboratorial consolidado.", "Gerar certificado/relatorio laboratorial");
      registrarMov_(sessao, lab.ENTRADA_ID, "LAB_RESULTADO", entrada.STATUS, novoStatus, entrada.TECNICO_ID, item.RESPONSAVEL_ID, "LABORATORIO_INTERNO", "Resultado laboratorial consolidado: " + conformidade, "", "Gerar certificado/relatorio laboratorial");
    }
    if (conformidade === "REPROVADO") criarAlerta_(lab.ENTRADA_ID, "LAB_RESULTADO_REPROVADO", "VERMELHO", "Resultado laboratorial reprovado.");
    if (conformidade === "INCONCLUSIVO") criarAlerta_(lab.ENTRADA_ID, "LAB_RESULTADO_INCONCLUSIVO", "AMARELO", "Resultado laboratorial inconclusivo.");
    if (["APROVADO", "APROVADO_COM_RESSALVA"].indexOf(conformidade) >= 0) criarAlerta_(lab.ENTRADA_ID, "LAB_CERTIFICADO_PENDENTE", "AMARELO", "Certificado/relatorio laboratorial pendente.");
    return { success: true, message: "Resultado laboratorial consolidado.", item: item, status: novoStatus };
  }

  function gerarDocumentoLaboratorio(sessionId, labId, tipo) {
    const sessao = exigirSessao(sessionId);
    const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, labId);
    if (!lab) return { success: false, message: "Entrada de laboratorio nao encontrada." };
    const perm = exigirAst_(sessao, "LABORATORIO", SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID) || {});
    if (!perm.success) return perm;
    return gerarDocumentoLaboratorio_(sessao, labId, SGO_UTILS.safeUpper(tipo || "PROTOCOLO_ENTRADA_LABORATORIO"));
  }

  function obterWhatsappLaboratorio(sessionId, labId, tipo) {
    const sessao = exigirSessao(sessionId);
    const ctx = montarContextoLaboratorio_(labId);
    if (!ctx) return { success: false, message: "Entrada de laboratorio nao encontrada." };
    const perm = exigirAst_(sessao, "LABORATORIO", ctx.entrada);
    if (!perm.success) return perm;
    const texto = montarWhatsappLaboratorio_(ctx, tipo || "ENTRADA");
    registrarMov_(sessao, ctx.entrada.ID, "WHATSAPP_LAB", ctx.entrada.STATUS, ctx.entrada.STATUS, ctx.entrada.TECNICO_ID, ctx.lab.RESPONSAVEL_ID, "LABORATORIO_INTERNO", "Mensagem WhatsApp de laboratorio gerada.", "", ctx.entrada.PROXIMA_ACAO);
    return { success: true, texto: texto, url: "https://wa.me/?text=" + encodeURIComponent(texto) };
  }

  function normalizarDiagnostico_(sessao, entrada, payload) {
    const tecnico = payload.TECNICO_ID ? SGO_DATA.getById(S.CAD_TECNICOS, payload.TECNICO_ID) : null;
    return {
      ENTRADA_ID: entrada.ID,
      TECNICO_ID: SGO_UTILS.safe(payload.TECNICO_ID || entrada.TECNICO_ID),
      TECNICO_NOME: tecnico ? SGO_UTILS.safe(tecnico.NOME) : SGO_UTILS.safe(entrada.TECNICO_NOME),
      DATA_DIAGNOSTICO: SGO_UTILS.safe(payload.DATA_DIAGNOSTICO) || SGO_UTILS.nowIso(),
      DEFEITO_RELATADO_CLIENTE: SGO_UTILS.safe(payload.DEFEITO_RELATADO_CLIENTE || entrada.PROBLEMA_RELATADO),
      DEFEITO_CONFIRMADO: SGO_UTILS.safe(payload.DEFEITO_CONFIRMADO),
      DEFEITO_INTERMITENTE: simNao_(payload.DEFEITO_INTERMITENTE),
      EQUIPAMENTO_LIGA: simNao_(payload.EQUIPAMENTO_LIGA),
      INSPECAO_VISUAL_OK: simNao_(payload.INSPECAO_VISUAL_OK),
      TESTE_ELETRICO_BASICO: SGO_UTILS.safeUpper(payload.TESTE_ELETRICO_BASICO || "NAO_APLICAVEL"),
      NECESSITA_LIMPEZA: simNao_(payload.NECESSITA_LIMPEZA),
      NECESSITA_PECA: simNao_(payload.NECESSITA_PECA),
      NECESSITA_TERCEIRO: simNao_(payload.NECESSITA_TERCEIRO),
      RISCO_USO: SGO_UTILS.safeUpper(payload.RISCO_USO || "BAIXO"),
      TESTES_REALIZADOS: SGO_UTILS.safe(payload.TESTES_REALIZADOS),
      EVIDENCIAS_ENCONTRADAS: SGO_UTILS.safe(payload.EVIDENCIAS_ENCONTRADAS),
      CAUSA_PROVAVEL: SGO_UTILS.safe(payload.CAUSA_PROVAVEL),
      RECOMENDACAO_TECNICA: SGO_UTILS.safe(payload.RECOMENDACAO_TECNICA),
      CONCLUSAO_PRELIMINAR: SGO_UTILS.safe(payload.CONCLUSAO_PRELIMINAR),
      STATUS_APOS_DIAGNOSTICO: SGO_UTILS.safeUpper(payload.STATUS_APOS_DIAGNOSTICO),
      STATUS: "ATIVO",
      CRIADO_POR: sessao.usuario
    };
  }

  function salvarPeca_(sessao, entradaId, diagnosticoId, payload) {
    payload = payload || {};
    return SGO_DATA.insert(S.AST_PECAS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      DIAGNOSTICO_ID: diagnosticoId,
      PECA_ID: SGO_UTILS.safe(payload.PECA_ID),
      NOME_PECA: SGO_UTILS.safe(payload.NOME_PECA || payload.DESCRICAO),
      CODIGO_INTERNO: SGO_UTILS.safe(payload.CODIGO_INTERNO),
      CODIGO_FABRICANTE: SGO_UTILS.safe(payload.CODIGO_FABRICANTE),
      DESCRICAO: SGO_UTILS.safe(payload.DESCRICAO || payload.NOME_PECA),
      QUANTIDADE: SGO_UTILS.safe(payload.QUANTIDADE || "1"),
      URGENCIA: SGO_UTILS.safeUpper(payload.URGENCIA || "NORMAL"),
      JUSTIFICATIVA_TECNICA: SGO_UTILS.safe(payload.JUSTIFICATIVA_TECNICA),
      TEM_ESTOQUE: SGO_UTILS.safeUpper(payload.TEM_ESTOQUE || "NAO_VERIFICADO"),
      FORNECEDOR_SUGERIDO: SGO_UTILS.safe(payload.FORNECEDOR_SUGERIDO),
      VALOR_ESTIMADO: SGO_UTILS.safe(payload.VALOR_ESTIMADO),
      STATUS: SGO_UTILS.safeUpper(payload.STATUS || "PECA_SOLICITADA"),
      SOLICITADA_EM: SGO_UTILS.nowIso(),
      OBSERVACAO: SGO_UTILS.safe(payload.OBSERVACAO),
      CRIADO_POR: sessao.usuario
    }));
  }

  function gerarRelatorioTecnico_(sessao, entradaId, tipo) {
    const ctx = montarContextoTecnico_(entradaId);
    if (!ctx) return { success: false, message: "Entrada nao encontrada." };
    if (tipo === "RELATORIO_DIAGNOSTICO_TECNICO" && !ctx.diagnostico) {
      return { success: false, message: "Nao existe diagnostico para gerar relatorio." };
    }
    const token = gerarTokenDocumentoUnico_(tipo === "RELATORIO_DIAGNOSTICO_TECNICO" ? "DIAG-AST" : "MAN-AST");
    const validacaoUrl = montarUrlValidacao_(token);
    const qrCode = QR_API + encodeURIComponent(validacaoUrl);
    const html = relatorioTecnicoHtml_(tipo, ctx, token, validacaoUrl, qrCode);
    const nome = tipo + "_" + ctx.entrada.PROTOCOLO + ".pdf";
    const blob = Utilities.newBlob(html, "text/html", nome.replace(".pdf", ".html")).getAs("application/pdf").setName(nome);
    const file = pastaAst_().createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const hash = sha256_(html);
    const doc = SGO_DATA.insert(S.AST_DOCUMENTOS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TIPO_DOCUMENTO: tipo,
      NUMERO_DOCUMENTO: ctx.entrada.PROTOCOLO,
      TITULO: tipo === "RELATORIO_DIAGNOSTICO_TECNICO" ? "Relatorio de Diagnostico Tecnico" : "Relatorio de Manutencao",
      FILE_ID: file.getId(),
      LINK_ARQUIVO: file.getUrl(),
      HASH_SHA256: hash,
      TOKEN_VALIDACAO: token,
      URL_VALIDACAO: validacaoUrl,
      QR_CODE_LINK: qrCode,
      DOWNLOAD_URL: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(file.getId()),
      STATUS: "VALIDO",
      CRIADO_POR: sessao.usuario
    }));
    registrarMov_(sessao, entradaId, "PDF_GERADO", ctx.entrada.STATUS, ctx.entrada.STATUS, ctx.entrada.TECNICO_ID, ctx.entrada.TECNICO_ID, ctx.entrada.LOCALIZACAO_ATUAL, "PDF gerado: " + tipo, "", ctx.entrada.PROXIMA_ACAO);
    return { success: true, documentoId: doc.ID, pdfUrl: file.getUrl(), downloadUrl: doc.DOWNLOAD_URL, token: token, hash: hash };
  }

  function montarContextoTecnico_(entradaId) {
    const entradaRaw = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entradaRaw) return null;
    const diagnosticos = SGO_DATA.getManyByField(S.AST_DIAGNOSTICOS, "ENTRADA_ID", entradaId);
    diagnosticos.sort(function(a, b) { return SGO_UTILS.safe(b.CRIADO_EM).localeCompare(SGO_UTILS.safe(a.CRIADO_EM)); });
    const testes = SGO_DATA.getManyByField(sheet_("AST_TESTES_BANCADA"), "ENTRADA_ID", entradaId);
    testes.sort(function(a, b) { return SGO_UTILS.safe(b.CRIADO_EM).localeCompare(SGO_UTILS.safe(a.CRIADO_EM)); });
    const execucoes = SGO_DATA.getManyByField(sheet_("AST_EXECUCOES"), "ENTRADA_ID", entradaId);
    execucoes.sort(function(a, b) { return SGO_UTILS.safe(b.CRIADO_EM).localeCompare(SGO_UTILS.safe(a.CRIADO_EM)); });
    return {
      entrada: enriquecerEntrada_(entradaRaw),
      diagnostico: diagnosticos[0] || null,
      pecas: SGO_DATA.getManyByField(S.AST_PECAS, "ENTRADA_ID", entradaId),
      fotos: SGO_DATA.getManyByField(S.AST_FOTOS, "ENTRADA_ID", entradaId),
      testes: testes,
      execucao: execucoes[0] || null,
      execucoes: execucoes
    };
  }

  function relatorioTecnicoHtml_(tipo, ctx, token, validacaoUrl, qrCode) {
    const e = ctx.entrada;
    const d = ctx.diagnostico || {};
    const t = (ctx.testes || [])[0] || {};
    const x = ctx.execucao || {};
    const pecasRows = (ctx.pecas || []).map(function(p) {
      return "<tr><td>" + esc_(p.NOME_PECA || p.DESCRICAO) + "</td><td>" + esc_(p.QUANTIDADE) + "</td><td>" + esc_(p.STATUS) + "</td><td>" + esc_(p.JUSTIFICATIVA_TECNICA) + "</td></tr>";
    }).join("") || "<tr><td colspan='4'>Sem pecas registradas.</td></tr>";
    const fotos = (ctx.fotos || []).slice(0, 8).map(function(f) {
      const src = f.FILE_ID ? ("https://drive.google.com/thumbnail?id=" + encodeURIComponent(f.FILE_ID) + "&sz=w500") : f.LINK_DRIVE;
      return src ? '<div class="photo"><img src="' + esc_(src) + '"><div>' + esc_(f.TIPO_FOTO || "EVIDENCIA") + '</div></div>' : "";
    }).join("");
    const titulo = tipo === "RELATORIO_DIAGNOSTICO_TECNICO" ? "Relatorio de Diagnostico Tecnico" : "Relatorio de Manutencao";
    return '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:14mm}body{font-family:Arial;color:#172033}.head{border-bottom:4px solid #0b7a3e;padding-bottom:14px}.logo{max-width:230px}.title{color:#0b3b78;font-size:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.box{border:1px solid #d7dee8;border-radius:6px;padding:9px;margin:7px 0}.lab{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:800}.val{font-weight:700;line-height:1.35}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #d7dee8;padding:7px;text-align:left;font-size:12px}th{font-size:10px;text-transform:uppercase;color:#64748b}.photos{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.photo{border:1px solid #d7dee8;padding:5px;font-size:10px}.photo img{max-width:100%;height:78px;object-fit:cover}.qr{width:120px}.footer{font-size:10px;color:#64748b;margin-top:16px}</style></head><body><section class="head"><img class="logo" src="' + esc_(SGO_CFG.LOGO_URL || "") + '"><h1 class="title">' + esc_(titulo) + '</h1><p>Entrada ' + esc_(e.PROTOCOLO) + ' - Metrolabs SGO+</p></section><h2>Entrada</h2><div class="grid"><div class="box"><div class="lab">Cliente</div><div class="val">' + esc_(e.CLIENTE_NOME) + '</div></div><div class="box"><div class="lab">Unidade</div><div class="val">' + esc_(e.UNIDADE_NOME) + '</div></div><div class="box"><div class="lab">Equipamento</div><div class="val">' + esc_(e.EQUIPAMENTO_NOME) + '</div></div><div class="box"><div class="lab">Serie</div><div class="val">' + esc_(e.EQUIPAMENTO_SERIE) + '</div></div></div><div class="box"><div class="lab">Problema relatado</div><p>' + esc_(e.PROBLEMA_RELATADO) + '</p></div><h2>Diagnostico tecnico</h2><div class="grid"><div class="box"><div class="lab">Defeito confirmado</div><div class="val">' + esc_(d.DEFEITO_CONFIRMADO || "--") + '</div></div><div class="box"><div class="lab">Risco</div><div class="val">' + esc_(d.RISCO_USO || "--") + '</div></div><div class="box"><div class="lab">Causa provavel</div><div class="val">' + esc_(d.CAUSA_PROVAVEL || "--") + '</div></div><div class="box"><div class="lab">Tecnico</div><div class="val">' + esc_(d.TECNICO_NOME || e.TECNICO_NOME || "--") + '</div></div></div><div class="box"><div class="lab">Testes realizados</div><p>' + esc_(d.TESTES_REALIZADOS || "--") + '</p><div class="lab">Evidencias</div><p>' + esc_(d.EVIDENCIAS_ENCONTRADAS || "--") + '</p><div class="lab">Recomendacao</div><p>' + esc_(d.RECOMENDACAO_TECNICA || "--") + '</p></div><h2>Pecas necessarias/aplicadas</h2><table><thead><tr><th>Peca</th><th>Qtd</th><th>Status</th><th>Justificativa</th></tr></thead><tbody>' + pecasRows + '</tbody></table><h2>Teste de bancada</h2><div class="box"><div class="lab">Resultado</div><div class="val">' + esc_(t.RESULTADO || "--") + '</div><p>' + esc_(t.PROCEDIMENTO_REALIZADO || "") + '</p></div><h2>Execucao e resultado final</h2><div class="box"><div class="lab">Servico realizado</div><p>' + esc_(x.SERVICO_REALIZADO || "--") + '</p><div class="lab">Resultado final</div><p>' + esc_(x.RESULTADO_FINAL || "--") + '</p><div class="lab">Recomendacao ao cliente</div><p>' + esc_(x.RECOMENDACAO_CLIENTE || "--") + '</p></div>' + (fotos ? '<h2>Fotos/evidencias</h2><div class="photos">' + fotos + '</div>' : '') + '<h2>Validacao</h2><div class="grid"><div class="box"><img class="qr" src="' + esc_(qrCode) + '"></div><div class="box"><div class="lab">Token</div><div class="val">' + esc_(token) + '</div><div class="lab">Hash</div><div class="val">' + esc_(sha256_(token + validacaoUrl + e.PROTOCOLO)) + '</div><div class="lab">URL</div><div class="val">' + esc_(validacaoUrl) + '</div></div></div><div class="footer">Documento emitido pela Metrolabs com QR Code, token e hash de validacao publica.</div></body></html>';
  }

  function diagnosticoAtual_(entradaId) {
    const lista = SGO_DATA.getManyByField(S.AST_DIAGNOSTICOS, "ENTRADA_ID", entradaId);
    lista.sort(function(a, b) { return SGO_UTILS.safe(b.CRIADO_EM).localeCompare(SGO_UTILS.safe(a.CRIADO_EM)); });
    return lista[0] || null;
  }

  function pecasPendentes_(entradaId) {
    return SGO_DATA.getManyByField(S.AST_PECAS, "ENTRADA_ID", entradaId).filter(function(p) {
      return STATUS_PECA_PENDENTE.indexOf(SGO_UTILS.safeUpper(p.STATUS)) >= 0;
    });
  }

  function testeAprovado_(entradaId) {
    return SGO_DATA.getManyByField(sheet_("AST_TESTES_BANCADA"), "ENTRADA_ID", entradaId).some(function(t) {
      const r = SGO_UTILS.safeUpper(t.RESULTADO);
      return r === "APROVADO" || r === "APROVADO_COM_RESSALVA";
    });
  }

  function statusAposDiagnostico_(dados) {
    if (dados.NECESSITA_TERCEIRO === "S") return "AGUARDANDO_TERCEIRO";
    if (dados.NECESSITA_PECA === "S") return "AGUARDANDO_PECAS";
    return dados.STATUS_APOS_DIAGNOSTICO || "EM_MANUTENCAO";
  }

  function atualizarEntradaStatus_(sessao, entrada, status, descricao, proximaAcao) {
    const agora = SGO_UTILS.nowIso();
    SGO_DATA.update(S.AST_ENTRADAS, entrada.ID, {
      STATUS: status,
      BANDEIRA: bandeira_(status, entrada.PRIORIDADE),
      LOCALIZACAO_ATUAL: localizacaoPorStatus_(status),
      ULTIMA_MOVIMENTACAO_EM: agora,
      PROXIMA_ACAO: SGO_UTILS.safe(proximaAcao),
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: agora
    });
    SGO_DATA.log("AST_STATUS_TECNICO", sessao.usuario, descricao + " entrada=" + entrada.ID + " status=" + status, "ASSISTENCIA_TECNICA");
  }

  function criarAlerta_(entradaId, tipo, severidade, mensagem) {
    SGO_DATA.insert(S.AST_ALERTAS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TIPO_ALERTA: tipo,
      SEVERIDADE: severidade,
      MENSAGEM: mensagem,
      STATUS: "ABERTO",
      GERADO_EM: SGO_UTILS.nowIso()
    }));
  }

  function simNao_(valor) {
    const v = SGO_UTILS.safeUpper(valor);
    return (v === "S" || v === "SIM" || v === "TRUE" || v === "1") ? "S" : "N";
  }

  function listarFornecedoresTerceiro_() {
    try {
      return SGO_DATA.getAll(S.CAD_FORNECEDORES, DB_ESTOQUE).filter(function(f) {
        return ativo_(f.STATUS);
      }).map(function(f) {
        return {
          ID: f.ID,
          RAZAO_SOCIAL: f.RAZAO_SOCIAL,
          NOME_FANTASIA: f.NOME_FANTASIA,
          CNPJ: f.CNPJ,
          TIPO_FORNECEDOR: f.TIPO_FORNECEDOR,
          CONTATO: f.CONTATO,
          TELEFONE: f.TELEFONE,
          EMAIL: f.EMAIL,
          CIDADE: f.CIDADE,
          UF: f.UF,
          STATUS: f.STATUS,
          BLOQUEADO: f.BLOQUEADO,
          QUALIFICACAO_STATUS: f.QUALIFICACAO_STATUS || f.STATUS_QUALIFICACAO || f.STATUS
        };
      });
    } catch (e) {
      return [];
    }
  }

  function statusFornecedorTerceiro_(payload, fornecedor) {
    const direto = SGO_UTILS.safeUpper(payload.STATUS_FORNECEDOR);
    if (direto) return direto;
    if (!fornecedor) return "EM_AVALIACAO";
    if (simNao_(fornecedor.BLOQUEADO) === "S" || SGO_UTILS.safeUpper(fornecedor.STATUS) === "BLOQUEADO") return "BLOQUEADO";
    const q = SGO_UTILS.safeUpper(fornecedor.QUALIFICACAO_STATUS || fornecedor.STATUS_QUALIFICACAO);
    if (q === "BLOQUEADO" || q === "REPROVADO") return q;
    if (q === "QUALIFICADO" || q === "APROVADO" || SGO_UTILS.safeUpper(fornecedor.STATUS) === "ATIVO") return "APROVADO";
    return q || "EM_AVALIACAO";
  }

  function montarTerceirosEntrada_(entradaId) {
    const terceiros = SGO_DATA.getManyByField(S.AST_TERCEIROS, "ENTRADA_ID", entradaId);
    terceiros.sort(function(a, b) { return SGO_UTILS.safe(b.CRIADO_EM).localeCompare(SGO_UTILS.safe(a.CRIADO_EM)); });
    return terceiros.map(function(t) {
      return Object.assign({}, t, {
        ACESSORIOS: SGO_DATA.getManyByField(S.AST_TERCEIROS_ACESSORIOS, "TERCEIRO_ID", t.ID),
        ANEXOS: SGO_DATA.getManyByField(S.AST_TERCEIROS_ANEXOS, "TERCEIRO_ID", t.ID),
        ACOMPANHAMENTOS: SGO_DATA.getManyByField(S.AST_TERCEIROS_ACOMPANHAMENTOS, "TERCEIRO_ID", t.ID),
        DOCUMENTOS: SGO_DATA.getManyByField(S.AST_TERCEIROS_DOCUMENTOS, "TERCEIRO_ID", t.ID),
        FOTOS: SGO_DATA.getManyByField(S.AST_FOTOS, "TERCEIRO_ID", t.ID)
      });
    });
  }

  function terceiroAtual_(entradaId) {
    const lista = SGO_DATA.getManyByField(S.AST_TERCEIROS, "ENTRADA_ID", entradaId);
    lista.sort(function(a, b) { return SGO_UTILS.safe(b.CRIADO_EM).localeCompare(SGO_UTILS.safe(a.CRIADO_EM)); });
    return lista[0] || null;
  }

  function salvarAcessorioTerceiro_(sessao, terceiroId, entradaId, payload) {
    payload = payload || {};
    return SGO_DATA.insert(S.AST_TERCEIROS_ACESSORIOS, SGO_DATA.gerarRegistroBase({
      TERCEIRO_ID: terceiroId,
      ENTRADA_ID: entradaId,
      DESCRICAO: SGO_UTILS.safe(payload.DESCRICAO),
      QUANTIDADE: SGO_UTILS.safe(payload.QUANTIDADE || "1"),
      ESTADO: SGO_UTILS.safe(payload.ESTADO),
      FOTO_LINK: SGO_UTILS.safe(payload.FOTO_LINK),
      FILE_ID: SGO_UTILS.safe(payload.FILE_ID),
      OBSERVACAO: SGO_UTILS.safe(payload.OBSERVACAO),
      CRIADO_POR: sessao.usuario
    }));
  }

  function salvarAnexoTerceiro_(sessao, terceiroId, entradaId, payload) {
    payload = payload || {};
    return SGO_DATA.insert(S.AST_TERCEIROS_ANEXOS, SGO_DATA.gerarRegistroBase({
      TERCEIRO_ID: terceiroId,
      ENTRADA_ID: entradaId,
      TIPO_ANEXO: SGO_UTILS.safeUpper(payload.TIPO_ANEXO || "OUTRO"),
      NOME_ARQUIVO: SGO_UTILS.safe(payload.NOME_ARQUIVO || payload.NOME || "Anexo externo"),
      FILE_ID: SGO_UTILS.safe(payload.FILE_ID),
      LINK_ARQUIVO: SGO_UTILS.safe(payload.LINK_ARQUIVO || payload.URL || payload.URL_ANEXO),
      OBSERVACAO: SGO_UTILS.safe(payload.OBSERVACAO),
      CRIADO_POR: sessao.usuario
    }));
  }

  function salvarFotoTerceiro_(sessao, terceiroId, entradaId, payload) {
    payload = payload || {};
    return SGO_DATA.insert(S.AST_FOTOS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TERCEIRO_ID: terceiroId,
      ETAPA: SGO_UTILS.safeUpper(payload.ETAPA || "TERCEIRO"),
      TIPO_FOTO: SGO_UTILS.safeUpper(payload.TIPO_FOTO || payload.TIPO || "TERCEIRO_CONDICAO"),
      NOME_ARQUIVO: SGO_UTILS.safe(payload.NOME_ARQUIVO || "Foto terceiro"),
      LINK_DRIVE: SGO_UTILS.safe(payload.LINK_DRIVE || payload.URL || payload.URL_ANEXO),
      FILE_ID: SGO_UTILS.safe(payload.FILE_ID),
      MIME_TYPE: SGO_UTILS.safe(payload.MIME_TYPE),
      OBSERVACAO: SGO_UTILS.safe(payload.DESCRICAO || payload.OBSERVACAO),
      VISIBILIDADE_PUBLICA: SGO_UTILS.safeUpper(payload.VISIBILIDADE_PUBLICA) === "S" ? "S" : "N",
      STATUS: "ATIVA",
      UPLOAD_POR: sessao.usuario,
      UPLOAD_EM: SGO_UTILS.nowIso()
    }));
  }

  function registrarMovTerceiro_(sessao, terceiro, tipo, descricao) {
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    if (!entrada) return;
    registrarMov_(sessao, terceiro.ENTRADA_ID, tipo, entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, descricao, "", entrada.PROXIMA_ACAO);
  }

  function statusEntradaPorTerceiro_(status) {
    const s = SGO_UTILS.safeUpper(status);
    if (s === "TERCEIRO_RECEBIDO_METROLABS" || s === "TERCEIRO_INSPECAO_RETORNO") return s;
    if (s === "TERCEIRO_FINALIZADO") return "TESTE";
    if (s === "TERCEIRO_CANCELADO") return "CANCELADO";
    if (s === "TERCEIRO_SEM_REPARO") return "SEM_REPARO";
    if (s === "TERCEIRO_ATRASADO" || s === "TERCEIRO_EXTRAVIADO") return s;
    return "ENVIADO_PARA_TERCEIRO";
  }

  function gerarAlertasTerceiro_(entradaId, terceiro) {
    if (SGO_UTILS.safeUpper(terceiro.STATUS_TERCEIRO) === "TERCEIRO_AGUARDANDO_ENVIO") {
      criarAlerta_(entradaId, "TERCEIRO_ENVIO_NAO_REALIZADO", "AMARELO", "Decisao de envio tomada, mas envio ainda nao realizado.");
    }
    criarAlerta_(entradaId, "TERCEIRO_SEM_RECEBIMENTO", "AMARELO", "Equipamento enviado sem confirmacao de recebimento do terceiro.");
    criarAlerta_(entradaId, "TERCEIRO_SEM_DIAGNOSTICO", "AMARELO", "Terceiro sem diagnostico no prazo previsto.");
    if (estaPrazoTerceiroVencido_(terceiro)) criarAlerta_(entradaId, "TERCEIRO_PRAZO_VENCIDO", "VERMELHO", "Prazo do terceiro vencido.");
  }

  function alertasPorStatusTerceiro_(entradaId, status) {
    const s = SGO_UTILS.safeUpper(status);
    if (s === "TERCEIRO_AGUARDANDO_ORCAMENTO") criarAlerta_(entradaId, "TERCEIRO_ORCAMENTO_PENDENTE", "AMARELO", "Orcamento externo pendente.");
    if (s === "TERCEIRO_AGUARDANDO_APROVACAO_CLIENTE") criarAlerta_(entradaId, "TERCEIRO_ORCAMENTO_AGUARDANDO_CLIENTE", "AMARELO", "Orcamento externo aguardando aprovacao do cliente.");
    if (s === "TERCEIRO_ATRASADO") criarAlerta_(entradaId, "TERCEIRO_ATRASADO", "VERMELHO", "Reparo externo atrasado.");
    if (s === "TERCEIRO_LIBERADO_PARA_RETIRADA") criarAlerta_(entradaId, "TERCEIRO_LIBERADO_SEM_RETORNO", "AMARELO", "Equipamento liberado pelo terceiro e ainda nao retornou.");
    if (s === "TERCEIRO_EXTRAVIADO") criarAlerta_(entradaId, "TERCEIRO_EXTRAVIADO", "CRITICO", "Equipamento informado como extraviado.");
  }

  function estaPrazoTerceiroVencido_(terceiro) {
    const prazo = SGO_UTILS.safe(terceiro.PRAZO_INFORMADO || terceiro.PRAZO_PROMETIDO);
    if (!prazo) return false;
    return new Date(prazo + "T23:59:59").getTime() < Date.now();
  }

  function montarLaboratorioEntrada_(entradaId) {
    const labs = SGO_DATA.getManyByField(S.AST_LAB_ENTRADAS, "ENTRADA_ID", entradaId);
    labs.sort(function(a, b) { return SGO_UTILS.safe(b.CRIADO_EM).localeCompare(SGO_UTILS.safe(a.CRIADO_EM)); });
    return labs.map(function(l) {
      return Object.assign({}, l, {
        PADROES: SGO_DATA.getManyByField(S.AST_LAB_PADROES, "LAB_ENTRADA_ID", l.ID),
        ENSAIOS: SGO_DATA.getManyByField(S.AST_LAB_ENSAIOS, "LAB_ENTRADA_ID", l.ID),
        RESULTADOS: SGO_DATA.getManyByField(S.AST_LAB_RESULTADOS, "LAB_ENTRADA_ID", l.ID),
        EVIDENCIAS: SGO_DATA.getManyByField(sheet_("AST_LAB_EVIDENCIAS"), "LAB_ENTRADA_ID", l.ID),
        DOCUMENTOS: SGO_DATA.getManyByField(S.AST_LAB_DOCUMENTOS, "LAB_ENTRADA_ID", l.ID)
      });
    });
  }

  function labAtual_(entradaId) {
    const labs = SGO_DATA.getManyByField(S.AST_LAB_ENTRADAS, "ENTRADA_ID", entradaId);
    labs.sort(function(a, b) { return SGO_UTILS.safe(b.CRIADO_EM).localeCompare(SGO_UTILS.safe(a.CRIADO_EM)); });
    return labs[0] || null;
  }

  function atualizarLabStatus_(sessao, lab, status) {
    SGO_DATA.update(S.AST_LAB_ENTRADAS, lab.ID, {
      STATUS: status,
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    });
  }

  function situacaoPadrao_(payload) {
    const informado = SGO_UTILS.safeUpper(payload.SITUACAO);
    if (informado) return informado;
    const validade = SGO_UTILS.safe(payload.VALIDADE_CERTIFICADO);
    if (!validade) return "NAO_INFORMADO";
    return new Date(validade + "T23:59:59").getTime() < Date.now() ? "VENCIDO" : "VALIDO";
  }

  function padroesBloqueantes_(labId) {
    return SGO_DATA.getManyByField(S.AST_LAB_PADROES, "LAB_ENTRADA_ID", labId).filter(function(p) {
      const s = SGO_UTILS.safeUpper(p.SITUACAO);
      return (s === "VENCIDO" || s === "BLOQUEADO") && simNao_(p.LIBERACAO_GESTOR) !== "S";
    });
  }

  function statusLabPorConformidade_(conformidade) {
    const c = SGO_UTILS.safeUpper(conformidade);
    if (c === "APROVADO") return "LAB_APROVADO";
    if (c === "APROVADO_COM_RESSALVA") return "LAB_APROVADO_COM_RESSALVA";
    if (c === "REPROVADO") return "LAB_REPROVADO";
    return "LAB_AGUARDANDO_ANALISE";
  }

  function prazoProximo_(prazo) {
    if (!prazo) return false;
    const diff = new Date(prazo + "T23:59:59").getTime() - Date.now();
    return diff > 0 && diff <= 48 * 3600000;
  }

  function montarContextoLaboratorio_(labId) {
    const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, labId);
    if (!lab) return null;
    const entradaRaw = SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID);
    if (!entradaRaw) return null;
    const resultados = SGO_DATA.getManyByField(S.AST_LAB_RESULTADOS, "LAB_ENTRADA_ID", labId);
    resultados.sort(function(a, b) { return SGO_UTILS.safe(b.CRIADO_EM).localeCompare(SGO_UTILS.safe(a.CRIADO_EM)); });
    return {
      lab: lab,
      entrada: enriquecerEntrada_(entradaRaw),
      padroes: SGO_DATA.getManyByField(S.AST_LAB_PADROES, "LAB_ENTRADA_ID", labId),
      ensaios: SGO_DATA.getManyByField(S.AST_LAB_ENSAIOS, "LAB_ENTRADA_ID", labId),
      resultado: resultados[0] || null,
      resultados: resultados,
      evidencias: SGO_DATA.getManyByField(sheet_("AST_LAB_EVIDENCIAS"), "LAB_ENTRADA_ID", labId),
      documentos: SGO_DATA.getManyByField(S.AST_LAB_DOCUMENTOS, "LAB_ENTRADA_ID", labId)
    };
  }

  function gerarDocumentoLaboratorio_(sessao, labId, tipo) {
    const ctx = montarContextoLaboratorio_(labId);
    if (!ctx) return { success: false, message: "Entrada de laboratorio nao encontrada." };
    const token = gerarTokenDocumentoUnico_(prefixoDocumentoLab_(tipo));
    const validacaoUrl = montarUrlValidacao_(token);
    const qrCode = QR_API + encodeURIComponent(validacaoUrl);
    const html = documentoLaboratorioHtml_(ctx, tipo, token, validacaoUrl, qrCode);
    const nome = tipo + "_" + ctx.entrada.PROTOCOLO + ".pdf";
    const blob = Utilities.newBlob(html, "text/html", nome.replace(".pdf", ".html")).getAs("application/pdf").setName(nome);
    const file = pastaAst_().createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const hash = sha256_(html);
    const comum = {
      ENTRADA_ID: ctx.entrada.ID,
      TIPO_DOCUMENTO: tipo,
      NUMERO_DOCUMENTO: ctx.entrada.PROTOCOLO,
      TITULO: tituloDocumentoLab_(tipo),
      FILE_ID: file.getId(),
      LINK_ARQUIVO: file.getUrl(),
      DOWNLOAD_URL: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(file.getId()),
      TOKEN_VALIDACAO: token,
      URL_VALIDACAO: validacaoUrl,
      HASH_SHA256: hash,
      STATUS: "VALIDO",
      CRIADO_POR: sessao.usuario
    };
    const docAst = SGO_DATA.insert(S.AST_DOCUMENTOS, SGO_DATA.gerarRegistroBase(Object.assign({}, comum, { QR_CODE_LINK: qrCode })));
    const docLab = SGO_DATA.insert(S.AST_LAB_DOCUMENTOS, SGO_DATA.gerarRegistroBase(Object.assign({}, comum, { LAB_ENTRADA_ID: labId })));
    const statusDoc = tipo === "PROTOCOLO_ENTRADA_LABORATORIO" ? "LAB_ENTRADA_REGISTRADA" : (tipo === "FICHA_ENSAIO_LABORATORIAL" ? "LAB_RELATORIO_GERADO" : "LAB_CERTIFICADO_GERADO");
    SGO_DATA.update(S.AST_LAB_ENTRADAS, labId, {
      STATUS: statusDoc,
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    });
    atualizarEntradaStatus_(sessao, ctx.entrada, statusDoc, "Documento laboratorial gerado.", ctx.entrada.PROXIMA_ACAO);
    registrarMov_(sessao, ctx.entrada.ID, "PDF_LAB", ctx.entrada.STATUS, ctx.entrada.STATUS, ctx.entrada.TECNICO_ID, ctx.lab.RESPONSAVEL_ID, "LABORATORIO_INTERNO", "Documento laboratorial gerado: " + tipo, "", ctx.entrada.PROXIMA_ACAO);
    return { success: true, documentoId: docAst.ID, labDocumentoId: docLab.ID, pdfUrl: file.getUrl(), downloadUrl: comum.DOWNLOAD_URL, token: token, hash: hash };
  }

  function prefixoDocumentoLab_(tipo) {
    const mapa = {
      PROTOCOLO_ENTRADA_LABORATORIO: "LAB-ENT",
      FICHA_ENSAIO_LABORATORIAL: "LAB-ENS",
      CERTIFICADO_RELATORIO_CALIBRACAO: "LAB-CAL",
      RELATORIO_QUALIFICACAO: "LAB-QUA",
      RELATORIO_CONFORMIDADE_LABORATORIAL: "LAB-CONF"
    };
    return mapa[tipo] || "LAB-DOC";
  }

  function tituloDocumentoLab_(tipo) {
    const mapa = {
      PROTOCOLO_ENTRADA_LABORATORIO: "Protocolo de Entrada no Laboratorio",
      FICHA_ENSAIO_LABORATORIAL: "Ficha de Ensaio / Registro Laboratorial",
      CERTIFICADO_RELATORIO_CALIBRACAO: "Certificado / Relatorio de Calibracao",
      RELATORIO_QUALIFICACAO: "Relatorio de Qualificacao",
      RELATORIO_CONFORMIDADE_LABORATORIAL: "Relatorio de Conformidade Laboratorial"
    };
    return mapa[tipo] || "Documento Laboratorial";
  }

  function documentoLaboratorioHtml_(ctx, tipo, token, url, qr) {
    const e = ctx.entrada;
    const l = ctx.lab;
    const r = ctx.resultado || {};
    const ensaio = (ctx.ensaios || [])[0] || {};
    const padroes = (ctx.padroes || []).map(function(p) {
      return "<tr><td>" + esc_(p.NOME_PADRAO) + "</td><td>" + esc_(p.CODIGO_INTERNO) + "</td><td>" + esc_(p.NUMERO_SERIE) + "</td><td>" + esc_(p.CERTIFICADO_PADRAO) + "</td><td>" + esc_(p.VALIDADE_CERTIFICADO) + "</td><td>" + esc_(p.SITUACAO) + "</td></tr>";
    }).join("") || "<tr><td colspan='6'>Sem padroes registrados.</td></tr>";
    const evidencias = (ctx.evidencias || []).map(function(ev) {
      return "<tr><td>" + esc_(ev.TIPO_EVIDENCIA) + "</td><td>" + esc_(ev.NOME) + "</td><td>" + esc_(ev.LINK_ARQUIVO) + "</td></tr>";
    }).join("") || "<tr><td colspan='3'>Sem evidencias registradas.</td></tr>";
    const titulo = tituloDocumentoLab_(tipo);
    return '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:14mm}body{font-family:Arial;color:#172033}.head{border-bottom:4px solid #0b7a3e;padding-bottom:14px}.logo{max-width:230px}.title{color:#0b3b78;font-size:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.box{border:1px solid #d7dee8;border-radius:6px;padding:9px;margin:7px 0}.lab{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:800}.val{font-weight:700;line-height:1.35}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #d7dee8;padding:7px;text-align:left;font-size:12px}th{font-size:10px;text-transform:uppercase;color:#64748b}.qr{width:120px}.footer{font-size:10px;color:#64748b;margin-top:16px}</style></head><body><section class="head"><img class="logo" src="' + esc_(SGO_CFG.LOGO_URL || "") + '"><h1 class="title">' + esc_(titulo) + '</h1><p>Entrada ' + esc_(e.PROTOCOLO) + ' - Metrolabs SGO+</p></section><h2>Identificacao</h2><div class="grid"><div class="box"><div class="lab">Cliente</div><div class="val">' + esc_(e.CLIENTE_NOME) + '</div></div><div class="box"><div class="lab">Unidade</div><div class="val">' + esc_(e.UNIDADE_NOME) + '</div></div><div class="box"><div class="lab">Equipamento</div><div class="val">' + esc_(e.EQUIPAMENTO_NOME) + '</div></div><div class="box"><div class="lab">Serie</div><div class="val">' + esc_(e.EQUIPAMENTO_SERIE) + '</div></div></div><h2>Servico laboratorial</h2><div class="grid"><div class="box"><div class="lab">Tipo de servico</div><div class="val">' + esc_(l.TIPO_SERVICO) + '</div></div><div class="box"><div class="lab">Status</div><div class="val">' + esc_(l.STATUS) + '</div></div><div class="box"><div class="lab">Procedimento</div><div class="val">' + esc_(l.PROCEDIMENTO) + '</div></div><div class="box"><div class="lab">Norma/referencia</div><div class="val">' + esc_(l.NORMA || "--") + '</div></div><div class="box"><div class="lab">Criterio de aceitacao</div><div class="val">' + esc_(l.CRITERIO_ACEITACAO) + '</div></div><div class="box"><div class="lab">Responsavel</div><div class="val">' + esc_(l.RESPONSAVEL_NOME || "--") + '</div></div></div><h2>Padroes utilizados</h2><table><thead><tr><th>Padrao</th><th>Codigo</th><th>Serie</th><th>Certificado</th><th>Validade</th><th>Situacao</th></tr></thead><tbody>' + padroes + '</tbody></table><h2>Ensaio / qualificacao</h2><div class="box"><div class="lab">Tipo de ensaio</div><p>' + esc_(ensaio.TIPO_ENSAIO || "--") + '</p><div class="lab">Condicoes ambientais</div><p>Temperatura: ' + esc_(ensaio.TEMPERATURA || "--") + ' | Umidade: ' + esc_(ensaio.UMIDADE || "--") + ' | Pressao: ' + esc_(ensaio.PRESSAO || "--") + '</p><div class="lab">Procedimento executado</div><p>' + esc_(ensaio.PROCEDIMENTO_EXECUTADO || "--") + '</p><div class="lab">Pontos avaliados</div><p>' + esc_(ensaio.PONTOS_AVALIADOS || "--") + '</p><div class="lab">Resultados</div><p>' + esc_(ensaio.RESULTADO_TRATADO || ensaio.RESULTADO_BRUTO || "--") + '</p><div class="lab">Desvios/incerteza</div><p>' + esc_(ensaio.DESVIO_ENCONTRADO || "--") + ' / ' + esc_(ensaio.INCERTEZA || "--") + '</p></div><h2>Resultado consolidado</h2><div class="box"><div class="lab">Conformidade</div><div class="val">' + esc_(r.CONFORMIDADE || l.CONFORMIDADE || "--") + '</div><div class="lab">Resultado final</div><p>' + esc_(r.RESULTADO_FINAL || l.RESULTADO_FINAL || "--") + '</p><div class="lab">Resumo tecnico</div><p>' + esc_(r.RESUMO_TECNICO || l.RESUMO_TECNICO || "--") + '</p><div class="lab">Restricoes</div><p>' + esc_(r.RESTRICOES || "--") + '</p><div class="lab">Recomendacoes</div><p>' + esc_(r.RECOMENDACOES || "--") + '</p><div class="lab">Validade/proxima calibracao</div><p>' + esc_(r.VALIDADE_RESULTADO || "--") + ' / ' + esc_(r.PROXIMA_CALIBRACAO_SUGERIDA || "--") + '</p></div><h2>Evidencias</h2><table><thead><tr><th>Tipo</th><th>Nome</th><th>Link</th></tr></thead><tbody>' + evidencias + '</tbody></table><h2>Validacao</h2><div class="grid"><div class="box"><img class="qr" src="' + esc_(qr) + '"></div><div class="box"><div class="lab">Token</div><div class="val">' + esc_(token) + '</div><div class="lab">Hash</div><div class="val">' + esc_(sha256_(token + url + e.PROTOCOLO)) + '</div><div class="lab">URL</div><div class="val">' + esc_(url) + '</div></div></div><div class="footer">Documento emitido pela Metrolabs com QR Code, token e hash de validacao publica.</div></body></html>';
  }

  function montarWhatsappLaboratorio_(ctx, tipo) {
    const e = ctx.entrada;
    const l = ctx.lab;
    const alvo = SGO_UTILS.safeUpper(tipo);
    const titulo = alvo === "RESULTADO" ? "Resultado laboratorial disponivel" : (alvo === "DOCUMENTO" ? "Certificado/relatorio emitido" : (alvo === "REPROVACAO" ? "Pendencia laboratorial" : (alvo === "PRONTO" ? "Equipamento pronto para retirada" : "Entrada em laboratorio")));
    return [
      "Metrolabs SGO+ - " + titulo,
      "Cliente: " + SGO_UTILS.safe(e.CLIENTE_NOME),
      "Unidade: " + SGO_UTILS.safe(e.UNIDADE_NOME),
      "Equipamento: " + SGO_UTILS.safe(e.EQUIPAMENTO_NOME),
      "Serie: " + SGO_UTILS.safe(e.EQUIPAMENTO_SERIE || "--"),
      "Entrada: " + SGO_UTILS.safe(e.PROTOCOLO),
      "Servico: " + SGO_UTILS.safe(l.TIPO_SERVICO),
      "Status laboratorio: " + SGO_UTILS.safe(l.STATUS),
      "Resultado: " + SGO_UTILS.safe(l.CONFORMIDADE || "--"),
      "Rastreabilidade: " + SGO_UTILS.safe(e.URL_PUBLICA)
    ].join("\n");
  }

  function montarContextoTerceiro_(terceiroId) {
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return null;
    const entradaRaw = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    if (!entradaRaw) return null;
    return {
      terceiro: terceiro,
      entrada: enriquecerEntrada_(entradaRaw),
      diagnostico: diagnosticoAtual_(terceiro.ENTRADA_ID),
      acessorios: SGO_DATA.getManyByField(S.AST_TERCEIROS_ACESSORIOS, "TERCEIRO_ID", terceiroId),
      anexos: SGO_DATA.getManyByField(S.AST_TERCEIROS_ANEXOS, "TERCEIRO_ID", terceiroId),
      acompanhamentos: SGO_DATA.getManyByField(S.AST_TERCEIROS_ACOMPANHAMENTOS, "TERCEIRO_ID", terceiroId),
      documentos: SGO_DATA.getManyByField(S.AST_TERCEIROS_DOCUMENTOS, "TERCEIRO_ID", terceiroId),
      fotos: SGO_DATA.getManyByField(S.AST_FOTOS, "TERCEIRO_ID", terceiroId)
    };
  }

  function gerarDocumentoTerceiro_(sessao, terceiroId, tipo) {
    const ctx = montarContextoTerceiro_(terceiroId);
    if (!ctx) return { success: false, message: "Registro de terceiro nao encontrado." };
    const token = gerarTokenDocumentoUnico_(prefixoDocumentoTerceiro_(tipo));
    const validacaoUrl = montarUrlValidacao_(token);
    const qrCode = QR_API + encodeURIComponent(validacaoUrl);
    const html = documentoTerceiroHtml_(ctx, tipo, token, validacaoUrl, qrCode);
    const nome = tipo + "_" + ctx.entrada.PROTOCOLO + ".pdf";
    const blob = Utilities.newBlob(html, "text/html", nome.replace(".pdf", ".html")).getAs("application/pdf").setName(nome);
    const file = pastaAst_().createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const hash = sha256_(html);
    const comum = {
      ENTRADA_ID: ctx.entrada.ID,
      TIPO_DOCUMENTO: tipo,
      NUMERO_DOCUMENTO: ctx.entrada.PROTOCOLO,
      TITULO: tituloDocumentoTerceiro_(tipo),
      FILE_ID: file.getId(),
      LINK_ARQUIVO: file.getUrl(),
      DOWNLOAD_URL: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(file.getId()),
      TOKEN_VALIDACAO: token,
      URL_VALIDACAO: validacaoUrl,
      HASH_SHA256: hash,
      STATUS: "VALIDO",
      CRIADO_POR: sessao.usuario
    };
    const docAst = SGO_DATA.insert(S.AST_DOCUMENTOS, SGO_DATA.gerarRegistroBase(Object.assign({}, comum, {
      QR_CODE_LINK: qrCode
    })));
    const docTer = SGO_DATA.insert(S.AST_TERCEIROS_DOCUMENTOS, SGO_DATA.gerarRegistroBase(Object.assign({}, comum, {
      TERCEIRO_ID: terceiroId
    })));
    registrarMov_(sessao, ctx.entrada.ID, "PDF_TERCEIRO", ctx.entrada.STATUS, ctx.entrada.STATUS, ctx.entrada.TECNICO_ID, ctx.entrada.TECNICO_ID, ctx.entrada.LOCALIZACAO_ATUAL, "Documento de terceiro gerado: " + tipo, "", ctx.entrada.PROXIMA_ACAO);
    return { success: true, documentoId: docAst.ID, terceiroDocumentoId: docTer.ID, pdfUrl: file.getUrl(), downloadUrl: comum.DOWNLOAD_URL, token: token, hash: hash };
  }

  function prefixoDocumentoTerceiro_(tipo) {
    const mapa = {
      TERMO_ENVIO_TERCEIRO: "TER-ENV",
      PROTOCOLO_ACOMPANHAMENTO_TERCEIRO: "TER-ACO",
      RELATORIO_RETORNO_TERCEIRO: "TER-RET",
      RELATORIO_FINAL_CONSOLIDADO_TERCEIRO: "TER-FIN"
    };
    return mapa[tipo] || "TER-DOC";
  }

  function tituloDocumentoTerceiro_(tipo) {
    const mapa = {
      TERMO_ENVIO_TERCEIRO: "Termo de Envio para Assistencia Terceirizada",
      PROTOCOLO_ACOMPANHAMENTO_TERCEIRO: "Protocolo de Acompanhamento de Terceiro",
      RELATORIO_RETORNO_TERCEIRO: "Relatorio de Retorno de Terceiro",
      RELATORIO_FINAL_CONSOLIDADO_TERCEIRO: "Relatorio Final Consolidado"
    };
    return mapa[tipo] || "Documento de Assistencia Terceirizada";
  }

  function documentoTerceiroHtml_(ctx, tipo, token, url, qr) {
    const e = ctx.entrada;
    const t = ctx.terceiro;
    const acess = (ctx.acessorios || []).map(function(a) {
      return "<tr><td>" + esc_(a.DESCRICAO) + "</td><td>" + esc_(a.QUANTIDADE) + "</td><td>" + esc_(a.ESTADO) + "</td><td>" + esc_(a.OBSERVACAO) + "</td></tr>";
    }).join("") || "<tr><td colspan='4'>Sem acessorios enviados.</td></tr>";
    const acomp = (ctx.acompanhamentos || []).map(function(a) {
      return "<tr><td>" + esc_(a.CRIADO_EM) + "</td><td>" + esc_(a.CANAL) + "</td><td>" + esc_(a.STATUS_INFORMADO) + "</td><td>" + esc_(a.INFORMACAO_RECEBIDA) + "</td><td>" + esc_(a.PROXIMA_ACAO) + "</td></tr>";
    }).join("") || "<tr><td colspan='5'>Sem acompanhamentos registrados.</td></tr>";
    const anexos = (ctx.anexos || []).map(function(a) {
      return "<tr><td>" + esc_(a.TIPO_ANEXO) + "</td><td>" + esc_(a.NOME_ARQUIVO) + "</td><td>" + esc_(a.LINK_ARQUIVO) + "</td></tr>";
    }).join("") || "<tr><td colspan='3'>Sem anexos externos.</td></tr>";
    const fotos = (ctx.fotos || []).slice(0, 8).map(function(f) {
      const src = f.FILE_ID ? ("https://drive.google.com/thumbnail?id=" + encodeURIComponent(f.FILE_ID) + "&sz=w500") : f.LINK_DRIVE;
      return src ? '<div class="photo"><img src="' + esc_(src) + '"><div>' + esc_(f.TIPO_FOTO || "FOTO") + '</div></div>' : "";
    }).join("");
    const titulo = tituloDocumentoTerceiro_(tipo);
    return '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:14mm}body{font-family:Arial;color:#172033}.head{border-bottom:4px solid #0b7a3e;padding-bottom:14px}.logo{max-width:230px}.title{color:#0b3b78;font-size:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.box{border:1px solid #d7dee8;border-radius:6px;padding:9px;margin:7px 0}.lab{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:800}.val{font-weight:700;line-height:1.35}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #d7dee8;padding:7px;text-align:left;font-size:12px}th{font-size:10px;text-transform:uppercase;color:#64748b}.photos{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.photo{border:1px solid #d7dee8;padding:5px;font-size:10px}.photo img{max-width:100%;height:78px;object-fit:cover}.qr{width:120px}.footer{font-size:10px;color:#64748b;margin-top:16px}</style></head><body><section class="head"><img class="logo" src="' + esc_(SGO_CFG.LOGO_URL || "") + '"><h1 class="title">' + esc_(titulo) + '</h1><p>Entrada ' + esc_(e.PROTOCOLO) + ' - Metrolabs SGO+</p></section><h2>Equipamento e cliente</h2><div class="grid"><div class="box"><div class="lab">Cliente</div><div class="val">' + esc_(e.CLIENTE_NOME) + '</div></div><div class="box"><div class="lab">Unidade</div><div class="val">' + esc_(e.UNIDADE_NOME) + '</div></div><div class="box"><div class="lab">Equipamento</div><div class="val">' + esc_(e.EQUIPAMENTO_NOME) + '</div></div><div class="box"><div class="lab">Serie</div><div class="val">' + esc_(e.EQUIPAMENTO_SERIE) + '</div></div></div><h2>Empresa terceira</h2><div class="grid"><div class="box"><div class="lab">Empresa</div><div class="val">' + esc_(t.EMPRESA_NOME) + '</div></div><div class="box"><div class="lab">Tipo/status</div><div class="val">' + esc_(t.TIPO_EMPRESA) + ' / ' + esc_(t.STATUS_TERCEIRO) + '</div></div><div class="box"><div class="lab">Contato</div><div class="val">' + esc_(t.RESPONSAVEL_EMPRESA) + ' - ' + esc_(t.TELEFONE_WHATSAPP) + '</div></div><div class="box"><div class="lab">Prazo</div><div class="val">' + esc_(t.PRAZO_INFORMADO || t.PRAZO_PROMETIDO) + '</div></div></div><div class="box"><div class="lab">Motivo do envio</div><p>' + esc_(t.MOTIVO_ENVIO) + '</p><div class="lab">Forma/rastreio</div><p>' + esc_(t.FORMA_ENVIO) + ' - ' + esc_(t.CODIGO_RASTREIO || "--") + '</p><div class="lab">Proxima acao</div><p>' + esc_(t.PROXIMA_ACAO || "--") + '</p></div><h2>Acessorios enviados</h2><table><thead><tr><th>Descricao</th><th>Qtd</th><th>Estado</th><th>Obs</th></tr></thead><tbody>' + acess + '</tbody></table><h2>Acompanhamentos</h2><table><thead><tr><th>Data</th><th>Canal</th><th>Status</th><th>Informacao</th><th>Proxima acao</th></tr></thead><tbody>' + acomp + '</tbody></table><h2>Anexos externos</h2><table><thead><tr><th>Tipo</th><th>Nome</th><th>Link</th></tr></thead><tbody>' + anexos + '</tbody></table><h2>Retorno e inspecao Metrolabs</h2><div class="box"><div class="lab">Retorno</div><p>' + esc_(t.CONDICAO_RETORNO || "--") + '</p><div class="lab">Servico informado pelo terceiro</div><p>' + esc_(t.SERVICO_TERCEIRO || "--") + '</p><div class="lab">Inspecao</div><p>' + esc_(t.INSPECAO_RESULTADO || "--") + ' - ' + esc_(t.INSPECAO_OBSERVACOES || "") + '</p></div>' + (fotos ? '<h2>Fotos</h2><div class="photos">' + fotos + '</div>' : '') + '<h2>Validacao</h2><div class="grid"><div class="box"><img class="qr" src="' + esc_(qr) + '"></div><div class="box"><div class="lab">Token</div><div class="val">' + esc_(token) + '</div><div class="lab">Hash</div><div class="val">' + esc_(sha256_(token + url + e.PROTOCOLO)) + '</div><div class="lab">URL</div><div class="val">' + esc_(url) + '</div></div></div><div class="footer">Documento emitido pela Metrolabs com QR Code, token e hash de validacao publica.</div></body></html>';
  }

  function montarWhatsappTerceiro_(ctx, tipo) {
    const e = ctx.entrada;
    const t = ctx.terceiro;
    const alvo = SGO_UTILS.safeUpper(tipo);
    const titulo = alvo === "RETORNO" ? "Retorno de terceiro" : (alvo === "CONCLUSAO" ? "Conclusao de terceiro" : (alvo === "ENVIO" ? "Envio para terceiro" : "Acompanhamento de terceiro"));
    return [
      "Metrolabs SGO+ - " + titulo,
      "Cliente: " + SGO_UTILS.safe(e.CLIENTE_NOME),
      "Unidade: " + SGO_UTILS.safe(e.UNIDADE_NOME),
      "Equipamento: " + SGO_UTILS.safe(e.EQUIPAMENTO_NOME),
      "Serie: " + SGO_UTILS.safe(e.EQUIPAMENTO_SERIE || "--"),
      "Entrada: " + SGO_UTILS.safe(e.PROTOCOLO),
      "Empresa terceira: " + SGO_UTILS.safe(t.EMPRESA_NOME),
      "Status: " + SGO_UTILS.safe(t.STATUS_TERCEIRO),
      "Prazo: " + SGO_UTILS.safe(t.PRAZO_INFORMADO || t.PRAZO_PROMETIDO || "--"),
      "Proxima acao: " + SGO_UTILS.safe(t.PROXIMA_ACAO || "--"),
      "Rastreabilidade: " + SGO_UTILS.safe(e.URL_PUBLICA)
    ].join("\n");
  }

  function sheet_(key) {
    return S[key] || key;
  }

  function trocarTecnico(sessionId, entradaId, tecnicoId, motivo) {
    const sessao = exigirSessao(sessionId);
    if (!motivo) return { success: false, message: "Informe o motivo da troca de tecnico." };
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "GESTAO", entrada);
    if (!perm.success) return perm;
    const tecnico = SGO_DATA.getById(S.CAD_TECNICOS, tecnicoId);
    SGO_DATA.update(S.AST_ENTRADAS, entradaId, {
      TECNICO_ID: SGO_UTILS.safe(tecnicoId),
      TECNICO_NOME: tecnico ? SGO_UTILS.safe(tecnico.NOME) : "",
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    });
    registrarMov_(sessao, entradaId, "TROCA_TECNICO", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, tecnicoId, entrada.LOCALIZACAO_ATUAL, "Tecnico responsavel alterado.", motivo, entrada.PROXIMA_ACAO);
    return { success: true, message: "Tecnico alterado com historico preservado." };
  }

  function atualizarStatus(sessionId, entradaId, status, descricao, proximaAcao) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "GESTAO", entrada);
    if (!perm.success) return perm;
    const novoStatus = SGO_UTILS.safeUpper(status);
    const agora = SGO_UTILS.nowIso();
    SGO_DATA.update(S.AST_ENTRADAS, entradaId, {
      STATUS: novoStatus,
      BANDEIRA: bandeira_(novoStatus, entrada.PRIORIDADE),
      LOCALIZACAO_ATUAL: localizacaoPorStatus_(novoStatus),
      ULTIMA_MOVIMENTACAO_EM: agora,
      PROXIMA_ACAO: SGO_UTILS.safe(proximaAcao),
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: agora
    });
    registrarMov_(sessao, entradaId, "STATUS", entrada.STATUS, novoStatus, entrada.TECNICO_ID, entrada.TECNICO_ID, localizacaoPorStatus_(novoStatus), descricao || "Status atualizado.", "", proximaAcao);
    return { success: true, message: "Status atualizado." };
  }

  function uploadFotoBase64(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    const base64 = SGO_UTILS.safe(payload.BASE64_DATA);
    if (!base64) return { success: false, message: "Dados da foto nao informados." };
    const mimeType = SGO_UTILS.safe(payload.MIME_TYPE) || "image/jpeg";
    const ext = mimeType.indexOf("png") >= 0 ? ".png" : ".jpg";
    const nome = SGO_UTILS.safe(payload.NOME_ARQUIVO) || ("ast_" + entradaId + "_" + Date.now() + ext);
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, nome);
    const file = pastaAst_().createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const item = SGO_DATA.insert(S.AST_FOTOS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TIPO_FOTO: SGO_UTILS.safeUpper(payload.TIPO_FOTO || "CHEGADA"),
      NOME_ARQUIVO: nome,
      LINK_DRIVE: file.getUrl(),
      FILE_ID: file.getId(),
      MIME_TYPE: mimeType,
      OBSERVACAO: SGO_UTILS.safe(payload.OBSERVACAO),
      VISIBILIDADE_PUBLICA: SGO_UTILS.safeUpper(payload.VISIBILIDADE_PUBLICA) === "S" ? "S" : "N",
      STATUS: "ATIVA",
      UPLOAD_POR: sessao.usuario,
      UPLOAD_EM: SGO_UTILS.nowIso()
    }));
    registrarMov_(sessao, entradaId, "FOTO", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Foto/evidencia registrada: " + item.TIPO_FOTO, "", entrada.PROXIMA_ACAO);
    return { success: true, message: "Foto enviada.", item: item };
  }

  function uploadAnexo(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    setup();
    payload = payload || {};
    const vinculo = SGO_UTILS.safeUpper(payload.VINCULO || payload.TIPO_VINCULO || "ENTRADA");
    const idRelacionado = SGO_UTILS.safe(payload.ID_RELACIONADO || payload.ENTRADA_ID || payload.ID);
    if (!idRelacionado) return { success: false, message: "Informe o ID relacionado ao anexo." };
    const entradaId = entradaIdPorVinculoAnexo_(vinculo, idRelacionado);
    const entrada = entradaId ? SGO_DATA.getById(S.AST_ENTRADAS, entradaId) : null;
    if (!entrada) return { success: false, message: "Entrada relacionada nao encontrada." };
    if (!podeVerCliente_(sessao, entrada.CLIENTE_ID)) return { success: false, message: "Acesso negado." };
    const acao = vinculo === "TERCEIRO" ? "TERCEIROS" : (vinculo === "LABORATORIO" ? "LABORATORIO" : "TECNICO");
    const perm = exigirAst_(sessao, acao, entrada);
    if (!perm.success) return perm;

    const base64 = SGO_UTILS.safe(payload.BASE64_DATA || payload.BASE64 || payload.base64);
    if (!base64) return { success: false, message: "Dados do arquivo nao informados." };
    const mimeType = SGO_UTILS.safe(payload.MIME_TYPE || payload.mimeType) || "application/octet-stream";
    const nome = nomeArquivoAst_(payload.NOME_ARQUIVO || payload.nomeArquivo || ("ast_anexo_" + Date.now()));
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, nome);
    const file = pastaAst_().createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}

    let item;
    if (vinculo === "TERCEIRO") {
      const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, idRelacionado);
      if (!terceiro) return { success: false, message: "Registro de terceiro nao encontrado." };
      item = salvarAnexoTerceiro_(sessao, terceiro.ID, entrada.ID, {
        TIPO_ANEXO: SGO_UTILS.safeUpper(payload.TIPO_ANEXO || payload.TIPO || "ANEXO_TERCEIRO"),
        NOME_ARQUIVO: nome,
        LINK_ARQUIVO: file.getUrl(),
        FILE_ID: file.getId(),
        MIME_TYPE: mimeType,
        OBSERVACAO: SGO_UTILS.safe(payload.OBSERVACAO)
      });
      registrarMovTerceiro_(sessao, terceiro, "UPLOAD_ANEXO", "Upload real de anexo do terceiro: " + item.TIPO_ANEXO);
    } else if (vinculo === "LABORATORIO") {
      const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, idRelacionado);
      if (!lab) return { success: false, message: "Entrada de laboratorio nao encontrada." };
      item = SGO_DATA.insert(sheet_("AST_LAB_EVIDENCIAS"), SGO_DATA.gerarRegistroBase({
        LAB_ENTRADA_ID: lab.ID,
        ENTRADA_ID: entrada.ID,
        TIPO_EVIDENCIA: SGO_UTILS.safeUpper(payload.TIPO_EVIDENCIA || payload.TIPO || "OUTRO"),
        NOME: SGO_UTILS.safe(payload.NOME || nome),
        LINK_ARQUIVO: file.getUrl(),
        FILE_ID: file.getId(),
        OBSERVACAO: SGO_UTILS.safe(payload.OBSERVACAO),
        CRIADO_POR: sessao.usuario
      }));
      registrarMov_(sessao, entrada.ID, "UPLOAD_ANEXO_LAB", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, lab.RESPONSAVEL_ID, "LABORATORIO_INTERNO", "Upload real de evidencia laboratorial: " + item.TIPO_EVIDENCIA, "", entrada.PROXIMA_ACAO);
    } else {
      item = SGO_DATA.insert(S.AST_FOTOS, SGO_DATA.gerarRegistroBase({
        ENTRADA_ID: entrada.ID,
        TIPO_FOTO: SGO_UTILS.safeUpper(payload.TIPO_FOTO || payload.TIPO_EVIDENCIA || payload.TIPO || vinculo),
        NOME_ARQUIVO: nome,
        LINK_DRIVE: file.getUrl(),
        FILE_ID: file.getId(),
        MIME_TYPE: mimeType,
        OBSERVACAO: SGO_UTILS.safe(payload.OBSERVACAO),
        VISIBILIDADE_PUBLICA: SGO_UTILS.safeUpper(payload.VISIBILIDADE_PUBLICA) === "S" ? "S" : "N",
        STATUS: "ATIVA",
        UPLOAD_POR: sessao.usuario,
        UPLOAD_EM: SGO_UTILS.nowIso()
      }));
      registrarMov_(sessao, entrada.ID, "UPLOAD_ANEXO", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Upload real de anexo/evidencia: " + item.TIPO_FOTO, "", entrada.PROXIMA_ACAO);
    }
    SGO_DATA.log("AST_UPLOAD_ANEXO", sessao.usuario, "Upload AST vinculo=" + vinculo + " entrada=" + entrada.ID + " arquivo=" + nome, "ASSISTENCIA_TECNICA");
    return { success: true, message: "Anexo enviado.", item: item, fileId: file.getId(), linkArquivo: file.getUrl(), downloadUrl: "https://drive.google.com/uc?export=download&id=" + file.getId() };
  }

  function dashboard(sessionId) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    return { success: true, dashboard: dashboardInterno_(sessao) };
  }

  function obterDashboardGerencial(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    setup();
    const perm = exigirAst_(sessao, "RELATORIOS");
    if (!perm.success) return perm;
    const dados = dadosGerenciais_(sessao, filtros || {});
    return {
      success: true,
      filtros: dados.filtros,
      cards: calcularIndicadoresAssistencia(dados.entradas, dados),
      status: calcularIndicadoresStatus_(dados.entradas),
      clientes: calcularIndicadoresPorCliente(dados.entradas, dados),
      tecnicos: calcularIndicadoresPorTecnico(dados.entradas, dados),
      rotatividade: calcularIndicadoresRotatividade(dados.entradas, dados),
      gargalos: calcularIndicadoresGargalos(dados.entradas, dados),
      conformidade: calcularConformidadeDocumental(dados.entradas, dados),
      alertas: listarAlertasCriticosGerenciais(dados.entradas, dados),
      resumoExecutivo: obterResumoExecutivoAST(sessionId, filtros)
    };
  }

  function calcularIndicadoresAssistencia(entradas, dados) {
    entradas = entradas || [];
    dados = dados || {};
    const hoje = Utilities.formatDate(new Date(), SGO_CFG.SISTEMA.TIMEZONE, "yyyy-MM-dd");
    const mes = Utilities.formatDate(new Date(), SGO_CFG.SISTEMA.TIMEZONE, "yyyy-MM");
    const abertos = entradas.filter(aberto_);
    const concluidosMes = entradas.filter(function(e) {
      return concluido_(e) && SGO_UTILS.safe(e.ATUALIZADO_EM || e.CRIADO_EM).indexOf(mes) === 0;
    });
    return {
      totalAssistencia: entradas.length,
      entradasHoje: entradas.filter(function(e) { return SGO_UTILS.safe(e.CRIADO_EM).indexOf(hoje) === 0; }).length,
      entradasMes: entradas.filter(function(e) { return SGO_UTILS.safe(e.CRIADO_EM).indexOf(mes) === 0; }).length,
      concluidosMes: concluidosMes.length,
      emAberto: abertos.length,
      atrasados: entradas.filter(estaAtrasado_).length,
      aguardandoDiagnostico: contarStatus_(entradas, ["ENTRADA", "TRIAGEM", "DIAGNOSTICO", "AGUARDANDO_DIAGNOSTICO_COMPLEMENTAR"]),
      aguardandoPecas: contarStatus_(entradas, ["AGUARDANDO_PECAS", "PECA_SOLICITADA", "PECA_EM_COTACAO", "PECA_AGUARDANDO_APROVACAO"]),
      aguardandoOrcamento: contarStatus_(entradas, ["ORCAMENTO", "AGUARDANDO_ORCAMENTO", "TERCEIRO_AGUARDANDO_ORCAMENTO"]),
      aguardandoAprovacaoCliente: contarStatus_(entradas, ["AGUARDANDO_APROVACAO", "AGUARDANDO_APROVACAO_CLIENTE", "TERCEIRO_AGUARDANDO_APROVACAO_CLIENTE"]),
      emManutencao: contarStatus_(entradas, ["MANUTENCAO", "EM_MANUTENCAO", "TERCEIRO_EM_REPARO"]),
      emTesteBancada: contarStatus_(entradas, ["TESTE_BANCADA", "EM_TESTE", "TESTE_CONCLUIDO", "TERCEIRO_EM_TESTE"]),
      enviadosTerceiro: contarStatus_(entradas, ["TERCEIROS", "AGUARDANDO_TERCEIRO", "ENVIADO_PARA_TERCEIRO", "TERCEIRO_ENVIADO", "TERCEIRO_RECEBIDO_PELA_EMPRESA"]),
      emLaboratorio: contarStatus_(entradas, ["LABORATORIO", "ENTRADA_LABORATORIO", "LAB_EM_PROCESSO", "LAB_AGUARDANDO_ENSAIO", "LAB_EM_ENSAIO", "LAB_AGUARDANDO_ANALISE", "LAB_AGUARDANDO_CERTIFICADO"]),
      prontosRetirada: contarStatus_(entradas, ["PRONTO_ENTREGA", "PRONTO_PARA_RETIRADA", "LAB_PRONTO_PARA_ENTREGA"]),
      entregues: contarStatus_(entradas, ["ENTREGUE"]),
      semMovimentacao: entradas.filter(function(e) { return aberto_(e) && diasSemMovimento_(e) >= 1; }).length,
      criticos: entradas.filter(function(e) { return SGO_UTILS.safeUpper(e.PRIORIDADE) === "CRITICA" || SGO_UTILS.safeUpper(e.BANDEIRA) === "VERMELHO"; }).length,
      taxaConclusao: percentual_(entradas.filter(concluido_).length, entradas.length),
      taxaAtraso: percentual_(entradas.filter(estaAtrasado_).length, entradas.length),
      tempoMedioPermanenciaHoras: mediaHoras_(entradas.filter(concluido_))
    };
  }

  function calcularIndicadoresPorCliente(entradas, dados) {
    return agruparGerencial_(entradas || [], function(e) { return e.CLIENTE_ID || e.CLIENTE_NOME || "SEM_CLIENTE"; }, function(e) { return e.CLIENTE_NOME || e.CLIENTE_PROVISORIO || "Sem cliente"; }).map(function(g) {
      const total = g.items.length;
      const concluidos = g.items.filter(concluido_).length;
      const atrasados = g.items.filter(estaAtrasado_).length;
      const conf = calcularConformidadeDocumental(g.items, dados);
      return {
        clienteId: g.id,
        cliente: g.nome,
        totalEquipamentos: total,
        entradasPeriodo: total,
        concluidos: concluidos,
        emAberto: g.items.filter(aberto_).length,
        atrasados: atrasados,
        emTerceiros: g.items.filter(emTerceiro_).length,
        emLaboratorio: g.items.filter(emLaboratorio_).length,
        aguardandoPecas: contarStatus_(g.items, ["AGUARDANDO_PECAS", "PECA_SOLICITADA", "PECA_EM_COTACAO"]),
        pendenciasDocumentais: conf.registrosIncompletos.length,
        percentualConclusao: percentual_(concluidos, total),
        percentualAtraso: percentual_(atrasados, total),
        tempoMedioPermanenciaHoras: mediaHoras_(g.items)
      };
    }).sort(function(a, b) { return b.totalEquipamentos - a.totalEquipamentos; });
  }

  function calcularIndicadoresPorTecnico(entradas) {
    return agruparGerencial_(entradas || [], function(e) { return e.TECNICO_ID || e.TECNICO_NOME || "SEM_TECNICO"; }, function(e) { return e.TECNICO_NOME || "Sem tecnico"; }).map(function(g) {
      const concluidos = g.items.filter(concluido_).length;
      const movimentos = movimentosPorEntradas_(g.items);
      const transferidos = movimentos.filter(function(m) { return SGO_UTILS.safeUpper(m.TIPO) === "TROCA_TECNICO"; }).length;
      return {
        tecnicoId: g.id,
        tecnico: g.nome,
        equipamentosAtribuidos: g.items.length,
        emAndamento: g.items.filter(aberto_).length,
        concluidos: concluidos,
        atrasados: g.items.filter(estaAtrasado_).length,
        tempoMedioDiagnosticoHoras: mediaEntreEventos_(g.items, S.AST_DIAGNOSTICOS, "DATA_DIAGNOSTICO"),
        tempoMedioManutencaoHoras: mediaEntreEventos_(g.items, sheet_("AST_EXECUCOES"), "DATA_EXECUCAO"),
        tempoMedioConclusaoHoras: mediaHoras_(g.items.filter(concluido_)),
        equipamentosTransferidos: transferidos,
        taxaRetrabalho: 0,
        backlog: g.items.filter(aberto_).length,
        produtividade: concluidos * 10 - g.items.filter(estaAtrasado_).length * 2
      };
    }).sort(function(a, b) { return b.produtividade - a.produtividade; }).map(function(t, idx) {
      t.ranking = idx + 1;
      return t;
    });
  }

  function calcularIndicadoresRotatividade(entradas, dados) {
    entradas = entradas || [];
    const saidas = entradas.filter(concluido_);
    const abertos = entradas.filter(aberto_);
    const tipos = rankingCampo_(entradas, "EQUIPAMENTO_NOME");
    const fabricantes = rankingFabricante_(entradas);
    const clientes = rankingCampo_(entradas, "CLIENTE_NOME");
    return {
      entradasPeriodo: entradas.length,
      saidasPeriodo: saidas.length,
      saldoAcumulado: abertos.length,
      tempoMedioPermanenciaHoras: mediaHoras_(entradas),
      mais7Dias: abertos.filter(function(e) { return diasDesde_(e.CRIADO_EM) > 7; }).length,
      mais15Dias: abertos.filter(function(e) { return diasDesde_(e.CRIADO_EM) > 15; }).length,
      mais30Dias: abertos.filter(function(e) { return diasDesde_(e.CRIADO_EM) > 30; }).length,
      mais60Dias: abertos.filter(function(e) { return diasDesde_(e.CRIADO_EM) > 60; }).length,
      tipoEquipamentoMaisRecorrente: tipos[0] || null,
      fabricanteMaisRecorrente: fabricantes[0] || null,
      clienteMaiorVolume: clientes[0] || null,
      motivoMaisComumAtraso: motivoAtrasoMaisComum_(entradas)
    };
  }

  function calcularIndicadoresGargalos(entradas, dados) {
    const docs = dados && dados.docsPorEntrada ? dados.docsPorEntrada : {};
    const lista = [
      ["Aguardando peca", function(e) { return statusContem_(e, ["PECA"]); }],
      ["Aguardando orcamento", function(e) { return statusContem_(e, ["ORCAMENTO"]); }],
      ["Aguardando aprovacao do cliente", function(e) { return statusContem_(e, ["APROVACAO"]); }],
      ["Aguardando diagnostico", function(e) { return statusContem_(e, ["ENTRADA", "TRIAGEM", "DIAGNOSTICO"]); }],
      ["Aguardando teste", function(e) { return statusContem_(e, ["TESTE"]); }],
      ["Aguardando terceiro", function(e) { return emTerceiro_(e); }],
      ["Aguardando laboratorio", function(e) { return emLaboratorio_(e); }],
      ["Aguardando comercial", function(e) { return statusContem_(e, ["COMERCIAL", "ORCAMENTO", "APROVACAO"]); }],
      ["Sem atualizacao tecnica", function(e) { return aberto_(e) && diasSemMovimento_(e) >= 1; }],
      ["Documento pendente", function(e) { return calcularConformidadeEntrada_(e, docs[e.ID] || {}).pendencias.length > 0; }]
    ];
    return lista.map(function(item) {
      const afetados = (entradas || []).filter(item[1]);
      return { gargalo: item[0], total: afetados.length, entradas: afetados.slice(0, 20).map(resumoEntradaGerencial_) };
    }).sort(function(a, b) { return b.total - a.total; });
  }

  function calcularConformidadeDocumental(entradas, dados) {
    const docs = dados && dados.docsPorEntrada ? dados.docsPorEntrada : indexarPorEntrada_(SGO_DATA.getAll(S.AST_DOCUMENTOS));
    const analisados = (entradas || []).map(function(e) { return calcularConformidadeEntrada_(e, docs[e.ID] || {}); });
    const total = analisados.length;
    const campo = function(nome) { return percentual_(analisados.filter(function(i) { return i[nome]; }).length, total); };
    return {
      totalAnalisado: total,
      percentualComFotos: campo("fotosEntrada"),
      percentualComAcessorios: campo("acessoriosRegistrados"),
      percentualComDiagnostico: campo("diagnosticoRegistrado"),
      percentualComPecasQuandoAplicavel: campo("pecasQuandoAplicavel"),
      percentualComTesteQuandoAplicavel: campo("testeQuandoAplicavel"),
      percentualComExecucao: campo("execucaoRegistrada"),
      percentualDocumentoEntrada: campo("documentoEntrada"),
      percentualRelatorioDiagnostico: campo("relatorioDiagnostico"),
      percentualRelatorioManutencao: campo("relatorioManutencao"),
      percentualTermoEntrega: campo("termoEntrega"),
      percentualQrToken: campo("qrTokenValido"),
      percentualMovimentacoes: campo("movimentacoesRegistradas"),
      indiceGeral: total ? Math.round(analisados.reduce(function(acc, i) { return acc + i.indice; }, 0) / total) : 0,
      registrosIncompletos: analisados.filter(function(i) { return i.pendencias.length; }).map(function(i) {
        return { entradaId: i.entradaId, protocolo: i.protocolo, cliente: i.cliente, pendencias: i.pendencias };
      })
    };
  }

  function listarAlertasCriticosGerenciais(entradas, dados) {
    const docs = dados && dados.docsPorEntrada ? dados.docsPorEntrada : {};
    const alertas = [];
    (entradas || []).forEach(function(e) {
      const base = resumoEntradaGerencial_(e);
      const add = function(tipo, gravidade, acao) {
        alertas.push(Object.assign({}, base, { tipo: tipo, gravidade: gravidade, proximaAcaoSugerida: acao || proximaAcaoGerencial_(e) }));
      };
      if (estaAtrasado_(e)) add("Equipamento atrasado", "CRITICA", "Replanejar prazo e comunicar cliente.");
      if (aberto_(e) && diasSemMovimento_(e) >= 1) add("Sem movimentacao", "ALTA", "Registrar andamento tecnico ou proxima etapa.");
      if (statusContem_(e, ["ENTRADA", "TRIAGEM"]) || (statusContem_(e, ["DIAGNOSTICO"]) && !diagnosticoAtual_(e.ID))) add("Sem diagnostico", "ALTA", "Priorizar diagnostico tecnico.");
      if (statusContem_(e, ["PECA"])) add("Aguardando pecas", "MEDIA", "Acionar compras/comercial sobre pecas.");
      if (emTerceiro_(e)) add("Aguardando terceiro", "MEDIA", "Cobrar retorno e atualizar acompanhamento.");
      if (emLaboratorio_(e)) add("Laboratorio pendente", "MEDIA", "Conferir ensaio, resultado ou certificado.");
      if (statusContem_(e, ["PRONTO"])) add("Pronto parado", "MEDIA", "Agendar retirada/entrega com cliente.");
      if (SGO_UTILS.safeUpper(e.PRIORIDADE) === "CRITICA" || SGO_UTILS.safeUpper(e.BANDEIRA) === "VERMELHO") add("Critico", "CRITICA", "Escalar responsavel e definir acao imediata.");
      if (calcularConformidadeEntrada_(e, docs[e.ID] || {}).pendencias.length) add("Documento pendente", "MEDIA", "Completar evidencias/documentos obrigatorios.");
      if (statusContem_(e, ["ORCAMENTO", "APROVACAO"])) add("Cliente aguardando retorno", "ALTA", "Enviar retorno comercial ao cliente.");
    });
    return alertas.sort(function(a, b) { return b.diasParado - a.diasParado; }).slice(0, 100);
  }

  function gerarRelatorioClienteAST(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "RELATORIOS");
    if (!perm.success) return perm;
    return gerarRelatorioGerencialAST_(sessao, "PRONTUARIO_CONFORMIDADE_MANUTENCAO_CLIENTE", filtros || {});
  }

  function gerarProntuarioEquipamentoAST(sessionId, entradaId) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "RELATORIOS");
    if (!perm.success) return perm;
    return gerarRelatorioGerencialAST_(sessao, "PRONTUARIO_TECNICO_EQUIPAMENTO", { ENTRADA_ID: entradaId });
  }

  function gerarRelatorioExecutivoAST(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "RELATORIOS");
    if (!perm.success) return perm;
    return gerarRelatorioGerencialAST_(sessao, "RELATORIO_EXECUTIVO_GERAL_ASSISTENCIA", filtros || {});
  }

  function gerarRelatorioProdutividadeTecnicosAST(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "RELATORIOS");
    if (!perm.success) return perm;
    return gerarRelatorioGerencialAST_(sessao, "RELATORIO_PRODUTIVIDADE_TECNICOS", filtros || {});
  }

  function gerarRelatorioAtrasadosAST(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "RELATORIOS");
    if (!perm.success) return perm;
    filtros = Object.assign({}, filtros || {}, { SOMENTE_ATRASADOS: "S" });
    return gerarRelatorioGerencialAST_(sessao, "RELATORIO_EQUIPAMENTOS_ATRASADOS", filtros);
  }

  function gerarRelatorioConformidadeDocumentalAST(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "RELATORIOS");
    if (!perm.success) return perm;
    return gerarRelatorioGerencialAST_(sessao, "RELATORIO_CONFORMIDADE_DOCUMENTAL_AST", filtros || {});
  }

  function obterResumoExecutivoAST(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "RELATORIOS");
    if (!perm.success) return perm.message;
    const dados = dadosGerenciais_(sessao, filtros || {});
    const ind = calcularIndicadoresAssistencia(dados.entradas, dados);
    const gargalos = calcularIndicadoresGargalos(dados.entradas, dados).filter(function(g) { return g.total > 0; }).slice(0, 3);
    const conf = calcularConformidadeDocumental(dados.entradas, dados);
    return [
      "Resumo executivo da Assistencia Tecnica",
      "Periodo: " + (dados.filtros.PERIODO_INICIAL || "--") + " a " + (dados.filtros.PERIODO_FINAL || "--"),
      "Foram analisados " + ind.totalAssistencia + " equipamento(s), com " + ind.emAberto + " em aberto, " + ind.atrasados + " atrasado(s) e " + ind.concluidosMes + " concluido(s) no mes.",
      "Conformidade documental geral: " + conf.indiceGeral + "%.",
      gargalos.length ? ("Principais gargalos: " + gargalos.map(function(g) { return g.gargalo + " (" + g.total + ")"; }).join(", ") + ".") : "Nao ha gargalos relevantes no filtro informado.",
      ind.criticos ? ("Existem " + ind.criticos + " item(ns) critico(s) que exigem acompanhamento gerencial.") : "Nao ha itens criticos no filtro informado."
    ].join("\n");
  }

  function gerarDocumentoEntrada(sessionId, entradaId) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "INTERNO", entrada);
    if (!perm.success) return perm;
    return gerarDocumentoEntrada_(sessao, entradaId);
  }

  function gerarEtiqueta(sessionId, entradaId, tamanho) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "INTERNO", entrada);
    if (!perm.success) return perm;
    const html = gerarEtiquetaHtml_(entradaId, tamanho || "MEDIA");
    registrarMov_(sessao, entradaId, "ETIQUETA_HTML", "", "", "", "", "", "Etiqueta HTML gerada para impressao.", "", "");
    SGO_DATA.log("AST_ETIQUETA_HTML", sessao.usuario, "Etiqueta HTML gerada entrada=" + entradaId, "ASSISTENCIA_TECNICA");
    return { success: true, html: html };
  }

  function gerarEtiquetaPdf(sessionId, entradaId, tamanho) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "INTERNO", entrada);
    if (!perm.success) return perm;
    const res = gerarEtiquetaPdf_(sessao, entradaId, tamanho || "MEDIA");
    if (res.success) {
      SGO_DATA.update(S.AST_ENTRADAS, entradaId, {
        ETIQUETA_PDF_ID: res.documentoId,
        ETIQUETA_PDF_LINK: res.pdfUrl,
        ETIQUETA_PDF_DOWNLOAD: res.downloadUrl,
        ATUALIZADO_POR: sessao.usuario,
        ATUALIZADO_EM: SGO_UTILS.nowIso()
      });
    }
    return res;
  }

  function registrarAcao(sessionId, entradaId, acao, detalhe) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "INTERNO", entrada);
    if (!perm.success) return perm;
    const tipo = SGO_UTILS.safeUpper(acao || "ACAO");
    registrarMov_(sessao, entradaId, tipo, entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, SGO_UTILS.safe(detalhe || "Acao registrada."), "", entrada.PROXIMA_ACAO);
    SGO_DATA.log("AST_" + tipo, sessao.usuario, SGO_UTILS.safe(detalhe || "Acao AST registrada.") + " entrada=" + entradaId, "ASSISTENCIA_TECNICA");
    return { success: true };
  }

  function obterWhatsapp(sessionId, entradaId) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return { success: false, message: "Entrada nao encontrada." };
    const perm = exigirAst_(sessao, "INTERNO", entrada);
    if (!perm.success) return perm;
    const item = enriquecerEntrada_(entrada);
    const docs = SGO_DATA.getManyByField(S.AST_DOCUMENTOS, "ENTRADA_ID", entradaId);
    const texto = montarWhatsapp_(item, docs);
    registrarMov_(sessao, entradaId, "WHATSAPP", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Mensagem de WhatsApp gerada.", "", entrada.PROXIMA_ACAO);
    return { success: true, texto: texto, url: "https://wa.me/?text=" + encodeURIComponent(texto) };
  }

  function consultarPublico(token) {
    setup();
    const entrada = SGO_DATA.getByField(S.AST_ENTRADAS, "QR_TOKEN", token) || SGO_DATA.getById(S.AST_ENTRADAS, token);
    if (!entrada) return { success: false, message: "Entrada nao localizada." };
    const id = entrada.ID;
    return {
      success: true,
      item: sanitizarEntradaPublica_(enriquecerEntrada_(entrada)),
      terceiro: sanitizarTerceiroPublico_(terceiroAtual_(id)),
      laboratorio: sanitizarLaboratorioPublico_(labAtual_(id)),
      movimentos: sanitizarMovimentosPublicos_(SGO_DATA.getManyByField(S.AST_MOVIMENTACOES, "ENTRADA_ID", id)),
      documentos: sanitizarDocumentosPublicos_(SGO_DATA.getManyByField(S.AST_DOCUMENTOS, "ENTRADA_ID", id)),
      fotos: SGO_DATA.getManyByField(S.AST_FOTOS, "ENTRADA_ID", id).filter(function(f) { return SGO_UTILS.safeUpper(f.VISIBILIDADE_PUBLICA) === "S"; })
    };
  }

  function dashboardInterno_(sessao) {
    let entradas = SGO_DATA.getAll(S.AST_ENTRADAS);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") entradas = entradas.filter(function(e) { return SGO_UTILS.safe(e.CLIENTE_ID) === SGO_UTILS.safe(sessao.clienteId); });
    const hoje = Utilities.formatDate(new Date(), SGO_CFG.SISTEMA.TIMEZONE, "yyyy-MM-dd");
    const mes = Utilities.formatDate(new Date(), SGO_CFG.SISTEMA.TIMEZONE, "yyyy-MM");
    const abertos = entradas.filter(function(e) { return ["ENTREGUE", "CANCELADO", "SEM_REPARO"].indexOf(SGO_UTILS.safeUpper(e.STATUS)) < 0; });
    const atrasados = entradas.filter(function(e) { return estaAtrasado_(e); });
    const semMov = entradas.filter(function(e) { return horasDesde_(e.ULTIMA_MOVIMENTACAO_EM || e.CRIADO_EM) >= 24 && abertos.some(function(a) { return a.ID === e.ID; }); });
    return {
      totalAssistencia: entradas.length,
      entradasDia: entradas.filter(function(e) { return SGO_UTILS.safe(e.CRIADO_EM).indexOf(hoje) === 0; }).length,
      entradasMes: entradas.filter(function(e) { return SGO_UTILS.safe(e.CRIADO_EM).indexOf(mes) === 0; }).length,
      concluidosMes: entradas.filter(function(e) { return ["ENTREGUE", "PRONTO_ENTREGA"].indexOf(SGO_UTILS.safeUpper(e.STATUS)) >= 0 && SGO_UTILS.safe(e.ATUALIZADO_EM).indexOf(mes) === 0; }).length,
      emAberto: abertos.length,
      atrasados: atrasados.length,
      aguardandoDiagnostico: contarStatus_(entradas, ["ENTRADA", "TRIAGEM", "DIAGNOSTICO"]),
      aguardandoPecas: contarStatus_(entradas, ["AGUARDANDO_PECAS"]),
      aguardandoOrcamento: contarStatus_(entradas, ["ORCAMENTO"]),
      aguardandoAprovacao: contarStatus_(entradas, ["AGUARDANDO_APROVACAO"]),
      emTerceiro: contarStatus_(entradas, ["TERCEIROS", "AGUARDANDO_TERCEIRO", "ENVIADO_PARA_TERCEIRO", "TERCEIRO_RECEBIDO_METROLABS", "TERCEIRO_INSPECAO_RETORNO", "TERCEIRO_ATRASADO"]),
      emLaboratorio: contarStatus_(entradas, ["LABORATORIO", "ENTRADA_LABORATORIO", "LAB_EM_PROCESSO", "LAB_ENTRADA_REGISTRADA", "LAB_AGUARDANDO_ENSAIO", "LAB_EM_ENSAIO", "LAB_AGUARDANDO_ANALISE", "LAB_AGUARDANDO_CERTIFICADO"]),
      labAguardandoEnsaio: contarStatus_(entradas, ["LAB_AGUARDANDO_ENSAIO", "LAB_ENTRADA_REGISTRADA"]),
      labEmEnsaio: contarStatus_(entradas, ["LAB_EM_ENSAIO", "LAB_EM_PROCESSO"]),
      labAguardandoCertificado: contarStatus_(entradas, ["LAB_AGUARDANDO_CERTIFICADO", "LAB_APROVADO", "LAB_APROVADO_COM_RESSALVA"]),
      labAprovados: contarStatus_(entradas, ["LAB_APROVADO", "LAB_APROVADO_COM_RESSALVA"]),
      labReprovados: contarStatus_(entradas, ["LAB_REPROVADO"]),
      prontosEntrega: contarStatus_(entradas, ["PRONTO_ENTREGA"]),
      semMovimentacao: semMov.length,
      criticos: entradas.filter(function(e) { return SGO_UTILS.safeUpper(e.PRIORIDADE) === "CRITICA" || SGO_UTILS.safeUpper(e.BANDEIRA) === "VERMELHO"; }).length,
      indicadores: calcularIndicadores_(entradas)
    };
  }

  function gerarDocumentoEntrada_(sessao, entradaId) {
    const dados = obterPublicoCompleto_(entradaId);
    if (!dados) return { success: false, message: "Entrada nao encontrada." };
    const entrada = dados.item;
    const token = gerarTokenDocumentoUnico_("DOC-AST");
    const validacaoUrl = montarUrlValidacao_(token);
    const qrCode = QR_API + encodeURIComponent(validacaoUrl);
    const html = documentoHtml_("Comprovante de Entrada de Equipamento", entrada, dados, token, validacaoUrl, qrCode);
    const nome = "AST_ENTRADA_" + entrada.PROTOCOLO + ".pdf";
    const blob = Utilities.newBlob(html, "text/html", nome.replace(".pdf", ".html")).getAs("application/pdf").setName(nome);
    const file = pastaAst_().createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const hash = sha256_(html);
    const doc = SGO_DATA.insert(S.AST_DOCUMENTOS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TIPO_DOCUMENTO: "COMPROVANTE_ENTRADA_EQUIPAMENTO",
      NUMERO_DOCUMENTO: entrada.PROTOCOLO,
      TITULO: "Comprovante de Entrada de Equipamento",
      FILE_ID: file.getId(),
      LINK_ARQUIVO: file.getUrl(),
      HASH_SHA256: hash,
      TOKEN_VALIDACAO: token,
      URL_VALIDACAO: validacaoUrl,
      QR_CODE_LINK: qrCode,
      DOWNLOAD_URL: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(file.getId()),
      STATUS: "VALIDO",
      CRIADO_POR: sessao.usuario
    }));
    registrarMov_(sessao, entradaId, "PROTOCOLO_PDF", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Protocolo de entrada PDF gerado.", "", entrada.PROXIMA_ACAO);
    SGO_DATA.log("AST_PROTOCOLO_PDF", sessao.usuario, "Protocolo PDF gerado entrada=" + entradaId, "ASSISTENCIA_TECNICA");
    return { success: true, documentoId: doc.ID, pdfUrl: file.getUrl(), fileId: file.getId(), downloadUrl: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(file.getId()), validacaoUrl: validacaoUrl, token: token, hash: hash };
  }

  function gerarRelatorioGerencialAST_(sessao, tipo, filtros) {
    setup();
    const dados = dadosGerenciais_(sessao, filtros || {});
    if (filtros && filtros.ENTRADA_ID && !dados.entradas.length) return { success: false, message: "Entrada nao encontrada para o prontuario." };
    const dashboard = {
      cards: calcularIndicadoresAssistencia(dados.entradas, dados),
      status: calcularIndicadoresStatus_(dados.entradas),
      clientes: calcularIndicadoresPorCliente(dados.entradas, dados),
      tecnicos: calcularIndicadoresPorTecnico(dados.entradas, dados),
      rotatividade: calcularIndicadoresRotatividade(dados.entradas, dados),
      gargalos: calcularIndicadoresGargalos(dados.entradas, dados),
      conformidade: calcularConformidadeDocumental(dados.entradas, dados),
      alertas: listarAlertasCriticosGerenciais(dados.entradas, dados)
    };
    const token = gerarTokenDocumentoUnico_(prefixoRelatorioGerencial_(tipo));
    const validacaoUrl = montarUrlValidacao_(token);
    const qrCode = QR_API + encodeURIComponent(validacaoUrl);
    const html = relatorioGerencialHtml_(tipo, dados, dashboard, token, validacaoUrl, qrCode);
    const nome = tipo + "_" + Utilities.formatDate(new Date(), SGO_CFG.SISTEMA.TIMEZONE, "yyyyMMdd_HHmmss") + ".pdf";
    const blob = Utilities.newBlob(html, "text/html", nome.replace(".pdf", ".html")).getAs("application/pdf").setName(nome);
    const file = pastaAst_().createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const hash = sha256_(html);
    const download = "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(file.getId());
    const entrada = dados.entradas[0] || {};
    const registro = SGO_DATA.insert(S.AST_RELATORIOS_GERADOS, SGO_DATA.gerarRegistroBase({
      TIPO_RELATORIO: tipo,
      CLIENTE_ID: dados.filtros.CLIENTE_ID || entrada.CLIENTE_ID || "",
      UNIDADE_ID: dados.filtros.UNIDADE_ID || entrada.UNIDADE_ID || "",
      ENTRADA_ID: dados.filtros.ENTRADA_ID || "",
      EQUIPAMENTO_ID: entrada.EQUIPAMENTO_ID || "",
      PERIODO_INICIAL: dados.filtros.PERIODO_INICIAL || "",
      PERIODO_FINAL: dados.filtros.PERIODO_FINAL || "",
      FILE_ID: file.getId(),
      LINK_ARQUIVO: file.getUrl(),
      DOWNLOAD_URL: download,
      TOKEN_VALIDACAO: token,
      URL_VALIDACAO: validacaoUrl,
      QR_CODE_LINK: qrCode,
      HASH_SHA256: hash,
      STATUS: "VALIDO",
      RESUMO: dashboard.cards.totalAssistencia + " registro(s); conformidade " + dashboard.conformidade.indiceGeral + "%.",
      CRIADO_POR: sessao.usuario
    }));
    SGO_DATA.insert(S.AST_DOCUMENTOS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entrada.ID || "",
      TIPO_DOCUMENTO: tipo,
      NUMERO_DOCUMENTO: entrada.PROTOCOLO || registro.ID,
      TITULO: tituloRelatorioGerencial_(tipo),
      FILE_ID: file.getId(),
      LINK_ARQUIVO: file.getUrl(),
      HASH_SHA256: hash,
      TOKEN_VALIDACAO: token,
      URL_VALIDACAO: validacaoUrl,
      QR_CODE_LINK: qrCode,
      DOWNLOAD_URL: download,
      STATUS: "VALIDO",
      CRIADO_POR: sessao.usuario
    }));
    if (dados.filtros.ENTRADA_ID && entrada.ID) {
      registrarMov_(sessao, entrada.ID, "PDF_GERENCIAL_GERADO", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Relatorio gerencial gerado: " + tipo, "", entrada.PROXIMA_ACAO);
    }
    SGO_DATA.log("AST_RELATORIO_GERENCIAL", sessao.usuario, tipo + " gerado file=" + file.getId(), "ASSISTENCIA_TECNICA");
    return { success: true, relatorioId: registro.ID, pdfUrl: file.getUrl(), fileId: file.getId(), downloadUrl: download, validacaoUrl: validacaoUrl, token: token, hash: hash };
  }

  function dadosGerenciais_(sessao, filtros) {
    filtros = normalizarFiltrosGerenciais_(filtros || {});
    let entradas = SGO_DATA.getAll(S.AST_ENTRADAS).map(enriquecerEntrada_);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") entradas = entradas.filter(function(e) { return SGO_UTILS.safe(e.CLIENTE_ID) === SGO_UTILS.safe(sessao.clienteId); });
    entradas = aplicarFiltrosGerenciais_(entradas, filtros);
    return {
      filtros: filtros,
      entradas: entradas,
      docsPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(S.AST_DOCUMENTOS)),
      fotosPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(S.AST_FOTOS)),
      diagnosticosPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(S.AST_DIAGNOSTICOS)),
      pecasPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(S.AST_PECAS)),
      testesPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(sheet_("AST_TESTES_BANCADA"))),
      execucoesPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(sheet_("AST_EXECUCOES"))),
      movimentosPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(S.AST_MOVIMENTACOES))
    };
  }

  function normalizarFiltrosGerenciais_(filtros) {
    return {
      PERIODO_INICIAL: SGO_UTILS.safe(filtros.PERIODO_INICIAL || filtros.DATA_INICIAL || filtros.inicio),
      PERIODO_FINAL: SGO_UTILS.safe(filtros.PERIODO_FINAL || filtros.DATA_FINAL || filtros.fim),
      CLIENTE_ID: SGO_UTILS.safe(filtros.CLIENTE_ID || filtros.clienteId),
      UNIDADE_ID: SGO_UTILS.safe(filtros.UNIDADE_ID || filtros.unidadeId),
      TECNICO_ID: SGO_UTILS.safe(filtros.TECNICO_ID || filtros.tecnicoId),
      STATUS: SGO_UTILS.safeUpper(filtros.STATUS || filtros.status),
      PRIORIDADE: SGO_UTILS.safeUpper(filtros.PRIORIDADE || filtros.prioridade),
      TIPO_FLUXO: SGO_UTILS.safeUpper(filtros.TIPO_FLUXO || filtros.tipoFluxo),
      SOMENTE_ATRASADOS: simNao_(filtros.SOMENTE_ATRASADOS),
      SOMENTE_CRITICOS: simNao_(filtros.SOMENTE_CRITICOS),
      SOMENTE_SEM_MOVIMENTACAO: simNao_(filtros.SOMENTE_SEM_MOVIMENTACAO),
      ENTRADA_ID: SGO_UTILS.safe(filtros.ENTRADA_ID || filtros.entradaId)
    };
  }

  function aplicarFiltrosGerenciais_(entradas, f) {
    let items = entradas || [];
    if (f.ENTRADA_ID) items = items.filter(function(e) { return SGO_UTILS.safe(e.ID) === f.ENTRADA_ID; });
    if (f.PERIODO_INICIAL) items = items.filter(function(e) { return dataDia_(e.CRIADO_EM) >= f.PERIODO_INICIAL; });
    if (f.PERIODO_FINAL) items = items.filter(function(e) { return dataDia_(e.CRIADO_EM) <= f.PERIODO_FINAL; });
    if (f.CLIENTE_ID) items = items.filter(function(e) { return SGO_UTILS.safe(e.CLIENTE_ID) === f.CLIENTE_ID; });
    if (f.UNIDADE_ID) items = items.filter(function(e) { return SGO_UTILS.safe(e.UNIDADE_ID) === f.UNIDADE_ID; });
    if (f.TECNICO_ID) items = items.filter(function(e) { return SGO_UTILS.safe(e.TECNICO_ID) === f.TECNICO_ID; });
    if (f.STATUS) items = items.filter(function(e) { return SGO_UTILS.safeUpper(e.STATUS) === f.STATUS; });
    if (f.PRIORIDADE) items = items.filter(function(e) { return SGO_UTILS.safeUpper(e.PRIORIDADE) === f.PRIORIDADE; });
    if (f.TIPO_FLUXO === "TERCEIRO") items = items.filter(emTerceiro_);
    if (f.TIPO_FLUXO === "LABORATORIO") items = items.filter(emLaboratorio_);
    if (f.TIPO_FLUXO === "OFICINA") items = items.filter(function(e) { return !emTerceiro_(e) && !emLaboratorio_(e); });
    if (f.SOMENTE_ATRASADOS === "S") items = items.filter(estaAtrasado_);
    if (f.SOMENTE_CRITICOS === "S") items = items.filter(function(e) { return SGO_UTILS.safeUpper(e.PRIORIDADE) === "CRITICA" || SGO_UTILS.safeUpper(e.BANDEIRA) === "VERMELHO"; });
    if (f.SOMENTE_SEM_MOVIMENTACAO === "S") items = items.filter(function(e) { return aberto_(e) && diasSemMovimento_(e) >= 1; });
    return items;
  }

  function calcularIndicadoresStatus_(entradas) {
    const grupos = [
      ["Entrada/triagem", ["ENTRADA", "TRIAGEM"]],
      ["Diagnostico", ["DIAGNOSTICO", "AGUARDANDO_DIAGNOSTICO_COMPLEMENTAR"]],
      ["Pecas", ["AGUARDANDO_PECAS", "PECA_SOLICITADA", "PECA_EM_COTACAO", "PECA_AGUARDANDO_APROVACAO"]],
      ["Comercial/cliente", ["ORCAMENTO", "AGUARDANDO_ORCAMENTO", "AGUARDANDO_APROVACAO", "AGUARDANDO_APROVACAO_CLIENTE"]],
      ["Manutencao", ["MANUTENCAO", "EM_MANUTENCAO"]],
      ["Teste", ["TESTE_BANCADA", "EM_TESTE", "TESTE_CONCLUIDO"]],
      ["Terceiros", ["TERCEIROS", "AGUARDANDO_TERCEIRO", "ENVIADO_PARA_TERCEIRO", "TERCEIRO_ENVIADO", "TERCEIRO_EM_REPARO", "TERCEIRO_ATRASADO"]],
      ["Laboratorio", ["LABORATORIO", "ENTRADA_LABORATORIO", "LAB_EM_PROCESSO", "LAB_AGUARDANDO_ENSAIO", "LAB_EM_ENSAIO", "LAB_AGUARDANDO_CERTIFICADO"]],
      ["Pronto/entregue", ["PRONTO_ENTREGA", "PRONTO_PARA_RETIRADA", "LAB_PRONTO_PARA_ENTREGA", "ENTREGUE"]],
      ["Bloqueado/cancelado/sem reparo", ["BLOQUEADO", "LAB_BLOQUEADO", "CANCELADO", "SEM_REPARO", "TERCEIRO_CANCELADO", "TERCEIRO_SEM_REPARO"]]
    ];
    return grupos.map(function(g) { return { grupo: g[0], total: contarStatus_(entradas || [], g[1]) }; });
  }

  function calcularConformidadeEntrada_(e, docs) {
    docs = docs || {};
    const temDoc = function(tipos) { return Object.keys(docs).some(function(id) { return tipos.indexOf(SGO_UTILS.safeUpper(docs[id].TIPO_DOCUMENTO)) >= 0; }); };
    const fotosEntrada = SGO_DATA.getManyByField(S.AST_FOTOS, "ENTRADA_ID", e.ID).length > 0;
    const acessorios = SGO_DATA.getManyByField(S.AST_ACESSORIOS, "ENTRADA_ID", e.ID).length > 0 || SGO_UTILS.safeUpper(e.ACESSORIOS_CONFERIDOS) === "S";
    const diagnostico = !!diagnosticoAtual_(e.ID);
    const pecas = SGO_DATA.getManyByField(S.AST_PECAS, "ENTRADA_ID", e.ID);
    const testes = SGO_DATA.getManyByField(sheet_("AST_TESTES_BANCADA"), "ENTRADA_ID", e.ID);
    const execucoes = SGO_DATA.getManyByField(sheet_("AST_EXECUCOES"), "ENTRADA_ID", e.ID);
    const movimentos = SGO_DATA.getManyByField(S.AST_MOVIMENTACOES, "ENTRADA_ID", e.ID);
    const exigePeca = statusContem_(e, ["PECA"]) || pecas.length > 0;
    const exigeTeste = statusContem_(e, ["TESTE"]) || testes.length > 0 || concluido_(e);
    const checks = {
      fotosEntrada: fotosEntrada,
      acessoriosRegistrados: acessorios,
      diagnosticoRegistrado: diagnostico,
      pecasQuandoAplicavel: !exigePeca || pecas.length > 0,
      testeQuandoAplicavel: !exigeTeste || testes.length > 0,
      execucaoRegistrada: execucoes.length > 0 || !concluido_(e),
      documentoEntrada: temDoc(["COMPROVANTE_ENTRADA_EQUIPAMENTO"]),
      relatorioDiagnostico: temDoc(["RELATORIO_DIAGNOSTICO_TECNICO"]),
      relatorioManutencao: temDoc(["RELATORIO_MANUTENCAO_AST"]),
      termoEntrega: temDoc(["TERMO_ENTREGA_AST", "TERMO_DE_ENTREGA", "TERMO_ENTREGA_EQUIPAMENTO"]) || !concluido_(e),
      qrTokenValido: !!(e.QR_TOKEN && e.URL_PUBLICA),
      movimentacoesRegistradas: movimentos.length > 0
    };
    const pendencias = Object.keys(checks).filter(function(k) { return !checks[k]; });
    checks.entradaId = e.ID;
    checks.protocolo = e.PROTOCOLO;
    checks.cliente = e.CLIENTE_NOME;
    checks.pendencias = pendencias;
    checks.indice = percentual_(Object.keys(checks).filter(function(k) { return checks[k] === true; }).length, 12);
    return checks;
  }

  function relatorioGerencialHtml_(tipo, dados, dashboard, token, validacaoUrl, qrCode) {
    const titulo = tituloRelatorioGerencial_(tipo);
    const cards = dashboard.cards || {};
    const linhasEquip = (dados.entradas || []).slice(0, 120).map(function(e) {
      return "<tr><td>" + esc_(e.PROTOCOLO) + "</td><td>" + esc_(e.CLIENTE_NOME) + "</td><td>" + esc_(e.UNIDADE_NOME) + "</td><td>" + esc_(e.EQUIPAMENTO_NOME) + "</td><td>" + esc_(e.STATUS) + "</td><td>" + esc_(e.TECNICO_NOME || "--") + "</td><td>" + esc_(diasDesde_(e.CRIADO_EM)) + "</td></tr>";
    }).join("") || "<tr><td colspan='7'>Sem registros no filtro informado.</td></tr>";
    const clientes = linhasRanking_(dashboard.clientes, ["cliente", "totalEquipamentos", "concluidos", "emAberto", "atrasados", "percentualConclusao"]);
    const tecnicos = linhasRanking_(dashboard.tecnicos, ["ranking", "tecnico", "equipamentosAtribuidos", "concluidos", "backlog", "atrasados"]);
    const gargalos = linhasRanking_(dashboard.gargalos, ["gargalo", "total"]);
    const alertas = (dashboard.alertas || []).slice(0, 60).map(function(a) {
      return "<tr><td>" + esc_(a.entrada) + "</td><td>" + esc_(a.cliente) + "</td><td>" + esc_(a.equipamento) + "</td><td>" + esc_(a.status) + "</td><td>" + esc_(a.diasParado) + "</td><td>" + esc_(a.responsavel) + "</td><td>" + esc_(a.proximaAcaoSugerida) + "</td></tr>";
    }).join("") || "<tr><td colspan='7'>Sem alertas criticos no filtro informado.</td></tr>";
    const conf = dashboard.conformidade || {};
    const conclusao = obterConclusaoGerencial_(tipo, dashboard);
    const extra = secaoExtraRelatorioGerencial_(tipo, dados, dashboard);
    return '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:13mm}body{font-family:Arial;color:#172033}.cover{border-bottom:4px solid #0b7a3e;padding-bottom:16px;margin-bottom:14px}.logo{max-width:220px}.title{font-size:24px;color:#0b3b78}.muted{color:#64748b}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.box{border:1px solid #d7dee8;border-radius:6px;padding:9px;margin:7px 0}.lab{font-size:9px;text-transform:uppercase;color:#64748b;font-weight:800}.val{font-size:18px;font-weight:900;color:#0f172a}table{width:100%;border-collapse:collapse;margin:8px 0 14px}td,th{border-bottom:1px solid #d7dee8;padding:6px;text-align:left;font-size:11px;vertical-align:top}th{font-size:9px;text-transform:uppercase;color:#64748b}.qr{width:115px}.footer{font-size:10px;color:#64748b;margin-top:16px}.page{break-before:page}</style></head><body><section class="cover"><img class="logo" src="' + esc_(SGO_CFG.LOGO_URL || "") + '"><h1 class="title">' + esc_(titulo) + '</h1><p class="muted">Periodo: ' + esc_(dados.filtros.PERIODO_INICIAL || "--") + ' a ' + esc_(dados.filtros.PERIODO_FINAL || "--") + ' - Metrolabs SGO+</p></section><div class="grid">' + cardPdf_("Recebidos", cards.totalAssistencia) + cardPdf_("Concluidos mes", cards.concluidosMes) + cardPdf_("Em aberto", cards.emAberto) + cardPdf_("Atrasados", cards.atrasados) + cardPdf_("Terceiros", cards.enviadosTerceiro) + cardPdf_("Laboratorio", cards.emLaboratorio) + cardPdf_("Sem movimento", cards.semMovimentacao) + cardPdf_("Criticos", cards.criticos) + '</div><h2>Conclusao executiva</h2><div class="box">' + esc_(conclusao).replace(/\n/g, "<br>") + '</div><h2>Conformidade documental</h2><div class="grid">' + cardPdf_("Indice geral", (conf.indiceGeral || 0) + "%") + cardPdf_("Fotos", (conf.percentualComFotos || 0) + "%") + cardPdf_("Diagnostico", (conf.percentualComDiagnostico || 0) + "%") + cardPdf_("QR/token", (conf.percentualQrToken || 0) + "%") + '</div><h2>Lista de equipamentos</h2><table><thead><tr><th>Entrada</th><th>Cliente</th><th>Unidade</th><th>Equipamento</th><th>Status</th><th>Responsavel</th><th>Dias</th></tr></thead><tbody>' + linhasEquip + '</tbody></table>' + extra + '<h2>Ranking por cliente</h2><table><tbody>' + clientes + '</tbody></table><h2>Produtividade dos tecnicos</h2><table><tbody>' + tecnicos + '</tbody></table><h2>Gargalos</h2><table><tbody>' + gargalos + '</tbody></table><h2>Alertas criticos</h2><table><thead><tr><th>Entrada</th><th>Cliente</th><th>Equipamento</th><th>Status</th><th>Dias parado</th><th>Responsavel</th><th>Proxima acao</th></tr></thead><tbody>' + alertas + '</tbody></table><h2>Validacao</h2><div class="grid"><div class="box"><img class="qr" src="' + esc_(qrCode) + '"></div><div class="box" style="grid-column:span 3"><div class="lab">Token</div><div>' + esc_(token) + '</div><div class="lab">Hash</div><div>' + esc_(sha256_(token + validacaoUrl + tipo)) + '</div><div class="lab">URL</div><div>' + esc_(validacaoUrl) + '</div></div></div><div class="footer">Documento gerencial emitido pela Metrolabs com QR Code, token, hash e validacao publica.</div></body></html>';
  }

  function obterPublicoCompleto_(entradaId) {
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return null;
    return {
      item: enriquecerEntrada_(entrada),
      acessorios: SGO_DATA.getManyByField(S.AST_ACESSORIOS, "ENTRADA_ID", entradaId),
      movimentos: SGO_DATA.getManyByField(S.AST_MOVIMENTACOES, "ENTRADA_ID", entradaId),
      documentos: SGO_DATA.getManyByField(S.AST_DOCUMENTOS, "ENTRADA_ID", entradaId),
      fotos: SGO_DATA.getManyByField(S.AST_FOTOS, "ENTRADA_ID", entradaId)
    };
  }

  function enriquecerEntrada_(e) {
    const cliente = e.CLIENTE_ID ? SGO_DATA.getById(S.CAD_CLIENTES, e.CLIENTE_ID) : null;
    const unidade = e.UNIDADE_ID ? SGO_DATA.getById(S.CAD_UNIDADES, e.UNIDADE_ID) : null;
    const eq = e.EQUIPAMENTO_ID ? SGO_DATA.getById(S.CAD_EQUIPAMENTOS, e.EQUIPAMENTO_ID) : null;
    return Object.assign({}, e, {
      CLIENTE_NOME: cliente ? (cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL) : e.CLIENTE_PROVISORIO,
      UNIDADE_NOME: unidade ? unidade.NOME_UNIDADE : e.UNIDADE_PROVISORIA,
      EQUIPAMENTO_NOME: eq ? [eq.TIPO, eq.TAG, eq.FABRICANTE, eq.MODELO].filter(Boolean).join(" - ") : e.EQUIPAMENTO_PROVISORIO,
      EQUIPAMENTO_SERIE: eq ? (eq.SERIE || eq.NUMERO_SERIE) : e.NUMERO_SERIE_INFORMADO,
      EQUIPAMENTO_PATRIMONIO: eq ? (eq.PATRIMONIO || eq.PATRIMONIO_ID || eq.TAG) : "",
      ENTRADA_DATA_BR: formatarDataBR_(e.CRIADO_EM),
      ULTIMA_MOVIMENTACAO_BR: formatarDataBR_(e.ULTIMA_MOVIMENTACAO_EM || e.CRIADO_EM),
      ATRASADO: estaAtrasado_(e) ? "S" : "N"
    });
  }

  function registrarMov_(sessao, entradaId, tipo, stAnt, stNovo, tecAnt, tecNovo, local, desc, motivo, prox) {
    SGO_DATA.insert(S.AST_MOVIMENTACOES, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TIPO: tipo,
      STATUS_ANTERIOR: stAnt,
      STATUS_NOVO: stNovo,
      TECNICO_ANTERIOR_ID: tecAnt,
      TECNICO_NOVO_ID: tecNovo,
      LOCALIZACAO: local,
      DESCRICAO: desc,
      MOTIVO: motivo,
      PROXIMA_ACAO: prox,
      CRIADO_POR: sessao.usuario
    }));
  }

  function gerarAlertasEntrada_(entradaId) {
    [
      ["SEM_TRIAGEM_1_DIA_UTIL", "AMARELO", "Sem triagem apos 1 dia util."],
      ["SEM_DIAGNOSTICO_2_DIAS_UTEIS", "AMARELO", "Sem diagnostico apos 2 dias uteis."],
      ["TECNICO_SEM_ATUALIZACAO_24H", "VERMELHO", "Tecnico sem atualizacao em 24 horas uteis."],
      ["DOCUMENTO_FINAL_NAO_GERADO", "AMARELO", "Documento final ainda nao gerado."],
      ["ENTREGUE_SEM_TERMO", "VERMELHO", "Equipamento entregue sem termo."]
    ].forEach(function(a) {
      SGO_DATA.insert(S.AST_ALERTAS, SGO_DATA.gerarRegistroBase({
        ENTRADA_ID: entradaId,
        TIPO_ALERTA: a[0],
        SEVERIDADE: a[1],
        MENSAGEM: a[2],
        STATUS: "ABERTO",
        GERADO_EM: SGO_UTILS.nowIso()
      }));
    });
  }

  function gerarEtiquetaHtml_(entradaId, tamanho) {
    const entrada = enriquecerEntrada_(SGO_DATA.getById(S.AST_ENTRADAS, entradaId));
    const tam = SGO_UTILS.safeUpper(tamanho || "MEDIA");
    const cls = tam === "PEQUENA" ? "small" : (tam === "A4" ? "a4" : "medium");
    const titulo = tam === "PEQUENA" ? "Etiqueta Pequena" : (tam === "A4" ? "Etiqueta A4" : "Etiqueta Media / Niimbot B21");
    return etiquetaHtml_(entrada, cls, titulo);
  }

  function documentoHtml_(titulo, entrada, dados, token, url, qr) {
    const acess = (dados.acessorios || []).map(function(a) {
      return "<tr><td>" + esc_(a.DESCRICAO) + "</td><td>" + esc_(a.QUANTIDADE) + "</td><td>" + esc_(a.ESTADO) + "</td><td>" + esc_(a.OBSERVACAO) + "</td></tr>";
    }).join("");
    const fotos = (dados.fotos || []).slice(0, 6).map(function(f) {
      const src = f.FILE_ID ? ("https://drive.google.com/thumbnail?id=" + encodeURIComponent(f.FILE_ID) + "&sz=w500") : f.LINK_DRIVE;
      return src ? '<div class="photo"><img src="' + esc_(src) + '"><div>' + esc_(f.TIPO_FOTO || "FOTO") + '</div></div>' : '';
    }).join("");
    return '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:14mm}body{font-family:Arial;color:#172033;margin:0}.cover{min-height:250px;border-bottom:5px solid #0b7a3e;padding:26px 0 18px}.logo{max-width:250px;max-height:90px}.title{font-size:26px;color:#0b3b78;margin:22px 0 6px}.sub{color:#64748b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.box{border:1px solid #d7dee8;border-radius:6px;padding:10px;margin:8px 0}.lab{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:800}.val{font-weight:700;line-height:1.35}table{width:100%;border-collapse:collapse;margin-top:6px}td,th{border-bottom:1px solid #d7dee8;padding:7px;text-align:left;font-size:12px}th{font-size:10px;text-transform:uppercase;color:#64748b}.qr{width:130px}.sign{height:72px;border-bottom:1px solid #111;margin-top:28px}.photos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.photo{border:1px solid #d7dee8;padding:6px;font-size:10px}.photo img{max-width:100%;height:90px;object-fit:cover}.footer{font-size:10px;color:#64748b;margin-top:20px}</style></head><body><section class="cover"><img class="logo" src="' + esc_(SGO_CFG.LOGO_URL || "") + '"><h1 class="title">' + esc_(titulo) + '</h1><p class="sub">Metrolabs SGO+ - protocolo ' + esc_(entrada.PROTOCOLO) + '</p><div class="grid"><div class="box"><div class="lab">Codigo do protocolo</div><div class="val">' + esc_(entrada.PROTOCOLO) + '</div></div><div class="box"><div class="lab">Data/hora da entrada</div><div class="val">' + esc_(entrada.ENTRADA_DATA_BR || entrada.CRIADO_EM) + '</div></div></div></section><h2>Dados da Metrolabs</h2><div class="grid"><div class="box"><div class="lab">Razao social</div><div class="val">' + esc_(SGO_CFG.EMPRESA_EMISSORA.RAZAO_SOCIAL) + '</div></div><div class="box"><div class="lab">CNPJ</div><div class="val">' + esc_(SGO_CFG.EMPRESA_EMISSORA.CNPJ) + '</div></div><div class="box"><div class="lab">Contato</div><div class="val">' + esc_(SGO_CFG.EMPRESA_EMISSORA.TELEFONE) + '</div></div><div class="box"><div class="lab">E-mail</div><div class="val">' + esc_(SGO_CFG.EMPRESA_EMISSORA.EMAIL) + '</div></div></div><h2>Cliente, unidade e equipamento</h2><div class="grid"><div class="box"><div class="lab">Cliente</div><div class="val">' + esc_(entrada.CLIENTE_NOME) + '</div></div><div class="box"><div class="lab">Unidade</div><div class="val">' + esc_(entrada.UNIDADE_NOME) + '</div></div><div class="box"><div class="lab">Equipamento</div><div class="val">' + esc_(entrada.EQUIPAMENTO_NOME) + '</div></div><div class="box"><div class="lab">Serie / patrimonio</div><div class="val">' + esc_(entrada.EQUIPAMENTO_SERIE) + ' / ' + esc_(entrada.EQUIPAMENTO_PATRIMONIO || "--") + '</div></div></div><div class="box"><div class="lab">Condicao de chegada</div><p>' + esc_(entrada.CONDICAO_FISICA) + '</p><div class="lab">Problema relatado</div><p>' + esc_(entrada.PROBLEMA_RELATADO) + '</p></div><div class="grid"><div class="box"><div class="lab">Prioridade</div><div class="val">' + esc_(entrada.PRIORIDADE) + '</div></div><div class="box"><div class="lab">Tecnico responsavel</div><div class="val">' + esc_(entrada.TECNICO_NOME || "--") + '</div></div><div class="box"><div class="lab">Recebido por</div><div class="val">' + esc_(entrada.CRIADO_POR || "--") + '</div></div><div class="box"><div class="lab">Status inicial</div><div class="val">' + esc_(entrada.STATUS) + '</div></div></div><h2>Acessorios recebidos</h2><table><thead><tr><th>Descricao</th><th>Qtd</th><th>Estado</th><th>Obs</th></tr></thead><tbody>' + acess + '</tbody></table>' + (fotos ? '<h2>Fotos de entrada</h2><div class="photos">' + fotos + '</div>' : '') + '<h2>Validacao e aceite</h2><div class="grid"><div class="box"><img class="qr" src="' + esc_(qr) + '"></div><div class="box"><div class="lab">Token</div><div class="val">' + esc_(token) + '</div><div class="lab">Hash SHA-256</div><div class="val">' + esc_(sha256_(token + url + entrada.PROTOCOLO)) + '</div><div class="lab">Link de validacao</div><div class="val">' + esc_(url) + '</div></div></div><div class="sign"></div><div class="lab">Assinatura/aceite do responsavel</div><div class="footer">Este documento foi emitido pelo Metrolabs SGO+ com token, hash e QR Code de validacao publica.</div></body></html>';
  }

  function etiquetaHtml_(entrada, classe, titulo) {
    const isA4 = classe === "a4";
    const sizeCss = classe === "small"
      ? ".label{width:50mm;height:30mm;padding:3mm}.qr{width:16mm;height:16mm}.logo{max-height:8mm}.brand{font-size:9px}.code{font-size:10px}.line{font-size:7px}"
      : (isA4
        ? ".sheet{width:190mm;margin:0 auto}.label{width:100%;min-height:120mm;padding:14mm}.qr{width:42mm;height:42mm}.logo{max-height:22mm}.brand{font-size:18px}.code{font-size:22px}.line{font-size:13px}"
        : ".label{width:60mm;height:40mm;padding:4mm}.qr{width:22mm;height:22mm}.logo{max-height:10mm}.brand{font-size:10px}.code{font-size:12px}.line{font-size:8px}");
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc_(titulo) + '</title><style>@page{margin:6mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#111;background:#fff}.sheet{padding:0}.label{border:1px solid #111;position:relative;overflow:hidden}.top{display:flex;justify-content:space-between;gap:3mm}.logo{max-width:34mm;object-fit:contain}.qr{object-fit:contain}.brand{font-weight:900;color:#0b3b78;text-transform:uppercase}.code{font-weight:900;margin:1.5mm 0;color:#0b7a3e}.line{margin:.8mm 0;line-height:1.18}.muted{color:#374151}.trace{position:absolute;left:3mm;bottom:2.2mm;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#0b3b78}' + sizeCss + '@media print{body{background:#fff}.label{break-inside:avoid}}</style></head><body><main class="sheet"><section class="label"><div class="top"><div><img class="logo" src="' + esc_(SGO_CFG.LOGO_URL || "") + '"><div class="brand">Metrolabs SGO+</div></div><img class="qr" src="' + esc_(entrada.QR_URL) + '"></div><div class="code">' + esc_(entrada.PROTOCOLO) + '</div><div class="line"><b>Cliente:</b> ' + esc_(entrada.CLIENTE_NOME) + '</div><div class="line"><b>Unidade:</b> ' + esc_(entrada.UNIDADE_NOME) + '</div><div class="line"><b>Equip.:</b> ' + esc_(entrada.EQUIPAMENTO_NOME) + '</div><div class="line"><b>Serie:</b> ' + esc_(entrada.EQUIPAMENTO_SERIE || "--") + ' <b>Pat.:</b> ' + esc_(entrada.EQUIPAMENTO_PATRIMONIO || "--") + '</div><div class="line"><b>Status:</b> ' + esc_(entrada.STATUS) + ' <b>Prior.:</b> ' + esc_(entrada.PRIORIDADE) + '</div><div class="line muted"><b>Entrada:</b> ' + esc_(entrada.ENTRADA_DATA_BR || entrada.CRIADO_EM) + '</div><div class="trace">Rastreabilidade SGO+</div></section></main></body></html>';
  }

  function gerarEtiquetaPdf_(sessao, entradaId, tamanho) {
    const entradaRaw = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entradaRaw) return { success: false, message: "Entrada nao encontrada." };
    const entrada = enriquecerEntrada_(entradaRaw);
    const tam = SGO_UTILS.safeUpper(tamanho || "MEDIA");
    const html = gerarEtiquetaHtml_(entradaId, tam);
    const nome = "AST_ETIQUETA_" + tam + "_" + entrada.PROTOCOLO + ".pdf";
    const blob = Utilities.newBlob(html, "text/html", nome.replace(".pdf", ".html")).getAs("application/pdf").setName(nome);
    const file = pastaAst_().createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const token = gerarTokenDocumentoUnico_("ETQ-AST");
    const validacaoUrl = montarUrlValidacao_(token);
    const hash = sha256_(html);
    const doc = SGO_DATA.insert(S.AST_DOCUMENTOS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TIPO_DOCUMENTO: "ETIQUETA_RASTREABILIDADE_AST",
      NUMERO_DOCUMENTO: entrada.PROTOCOLO,
      TITULO: "Etiqueta de Rastreabilidade SGO+",
      FILE_ID: file.getId(),
      LINK_ARQUIVO: file.getUrl(),
      HASH_SHA256: hash,
      TOKEN_VALIDACAO: token,
      URL_VALIDACAO: validacaoUrl,
      QR_CODE_LINK: QR_API + encodeURIComponent(validacaoUrl),
      DOWNLOAD_URL: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(file.getId()),
      TAMANHO_ETIQUETA: tam,
      STATUS: "VALIDO",
      CRIADO_POR: sessao.usuario
    }));
    registrarMov_(sessao, entradaId, "ETIQUETA_PDF", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Etiqueta PDF gerada: " + tam, "", entrada.PROXIMA_ACAO);
    SGO_DATA.log("AST_ETIQUETA_PDF", sessao.usuario, "Etiqueta PDF gerada entrada=" + entradaId + " tamanho=" + tam, "ASSISTENCIA_TECNICA");
    return {
      success: true,
      documentoId: doc.ID,
      pdfUrl: file.getUrl(),
      fileId: file.getId(),
      downloadUrl: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(file.getId()),
      token: token,
      hash: hash
    };
  }

  function montarWhatsapp_(entrada, docs) {
    const protocolo = (docs || []).find(function(d) { return SGO_UTILS.safeUpper(d.TIPO_DOCUMENTO) === "COMPROVANTE_ENTRADA_EQUIPAMENTO"; }) || {};
    return [
      "Metrolabs SGO+ - Assistencia Tecnica",
      "Cliente: " + SGO_UTILS.safe(entrada.CLIENTE_NOME),
      "Unidade: " + SGO_UTILS.safe(entrada.UNIDADE_NOME),
      "Equipamento: " + SGO_UTILS.safe(entrada.EQUIPAMENTO_NOME),
      "Serie: " + SGO_UTILS.safe(entrada.EQUIPAMENTO_SERIE || "--"),
      "Codigo da entrada: " + SGO_UTILS.safe(entrada.PROTOCOLO),
      "Status: " + SGO_UTILS.safe(entrada.STATUS),
      "Rastreabilidade: " + SGO_UTILS.safe(entrada.URL_PUBLICA),
      "PDF do protocolo: " + SGO_UTILS.safe(protocolo.LINK_ARQUIVO || entrada.DOCUMENTO_ENTRADA_LINK || "")
    ].join("\n");
  }

  function sanitizarEntradaPublica_(entrada) {
    return {
      ID: entrada.ID,
      PROTOCOLO: entrada.PROTOCOLO,
      CLIENTE_NOME: entrada.CLIENTE_NOME,
      UNIDADE_NOME: entrada.UNIDADE_NOME,
      EQUIPAMENTO_NOME: entrada.EQUIPAMENTO_NOME,
      EQUIPAMENTO_SERIE: entrada.EQUIPAMENTO_SERIE,
      STATUS: entrada.STATUS,
      PRIORIDADE: entrada.PRIORIDADE,
      LOCALIZACAO_ATUAL: entrada.LOCALIZACAO_ATUAL,
      CRIADO_EM: entrada.CRIADO_EM,
      ENTRADA_DATA_BR: entrada.ENTRADA_DATA_BR,
      ULTIMA_MOVIMENTACAO_EM: entrada.ULTIMA_MOVIMENTACAO_EM,
      ULTIMA_MOVIMENTACAO_BR: entrada.ULTIMA_MOVIMENTACAO_BR,
      PROXIMA_ACAO: entrada.PROXIMA_ACAO,
      URL_PUBLICA: entrada.URL_PUBLICA
    };
  }

  function sanitizarTerceiroPublico_(terceiro) {
    if (!terceiro) return null;
    return {
      EMPRESA_NOME: terceiro.EMPRESA_NOME,
      STATUS_TERCEIRO: terceiro.STATUS_TERCEIRO,
      ENVIADO_EM: terceiro.ENVIADO_EM,
      PRAZO_INFORMADO: terceiro.PRAZO_INFORMADO || terceiro.PRAZO_PROMETIDO,
      PROXIMA_ACAO: terceiro.PROXIMA_ACAO,
      ULTIMA_ATUALIZACAO: terceiro.ATUALIZADO_EM || terceiro.CRIADO_EM
    };
  }

  function sanitizarLaboratorioPublico_(lab) {
    if (!lab) return null;
    return {
      STATUS: lab.STATUS,
      TIPO_SERVICO: lab.TIPO_SERVICO,
      ENTRADA_EM: lab.ENTRADA_EM,
      RESULTADO_FINAL: lab.RESULTADO_FINAL,
      CONFORMIDADE: lab.CONFORMIDADE,
      VALIDADE_RESULTADO: lab.VALIDADE_RESULTADO,
      ATUALIZADO_EM: lab.ATUALIZADO_EM || lab.CRIADO_EM
    };
  }

  function sanitizarMovimentosPublicos_(movimentos) {
    return (movimentos || []).map(function(m) {
      return {
        TIPO: m.TIPO,
        STATUS_NOVO: m.STATUS_NOVO,
        LOCALIZACAO: m.LOCALIZACAO,
        DESCRICAO: descricaoPublicaMovimento_(m),
        PROXIMA_ACAO: proximaAcaoPublica_(m.STATUS_NOVO || m.TIPO),
        CRIADO_EM: m.CRIADO_EM
      };
    });
  }

  function descricaoPublicaMovimento_(m) {
    const tipo = SGO_UTILS.safeUpper(m && m.TIPO);
    if (tipo.indexOf("PDF") >= 0 || tipo.indexOf("DOCUMENTO") >= 0) return "Documento gerado para rastreabilidade.";
    if (tipo.indexOf("TERCEIRO") >= 0) return "Etapa com terceiro atualizada.";
    if (tipo.indexOf("LAB") >= 0) return "Etapa laboratorial atualizada.";
    if (tipo.indexOf("DIAGNOSTICO") >= 0) return "Diagnostico tecnico atualizado.";
    if (tipo.indexOf("TESTE") >= 0) return "Teste tecnico atualizado.";
    if (tipo.indexOf("CONCL") >= 0 || tipo.indexOf("MANUTENCAO") >= 0) return "Etapa tecnica atualizada.";
    return "Movimentacao registrada.";
  }

  function proximaAcaoPublica_(status) {
    const s = SGO_UTILS.safeUpper(status);
    if (s.indexOf("TERCEIRO") >= 0) return "Aguardar atualizacao do terceiro.";
    if (s.indexOf("LAB") >= 0 || s.indexOf("LABORATORIO") >= 0) return "Aguardar atualizacao laboratorial.";
    if (s.indexOf("PECA") >= 0) return "Aguardar disponibilidade de peca.";
    if (s.indexOf("ORCAMENTO") >= 0 || s.indexOf("APROVACAO") >= 0) return "Aguardar retorno comercial.";
    if (s.indexOf("PRONTO") >= 0) return "Aguardar retirada ou entrega.";
    if (s.indexOf("ENTREGUE") >= 0) return "Atendimento entregue.";
    return "Acompanhar proxima atualizacao.";
  }

  function sanitizarDocumentosPublicos_(documentos) {
    return (documentos || []).filter(function(d) {
      return SGO_UTILS.safeUpper(d.STATUS || "VALIDO") === "VALIDO";
    }).map(function(d) {
      return {
        TIPO_DOCUMENTO: d.TIPO_DOCUMENTO,
        TITULO: d.TITULO,
        STATUS: d.STATUS,
        URL_VALIDACAO: d.URL_VALIDACAO,
        CRIADO_EM: d.CRIADO_EM
      };
    });
  }

  function garantirAba_(ss, nome, cols, log) {
    let sh = ss.getSheetByName(nome);
    if (!sh) {
      sh = ss.insertSheet(nome);
      sh.appendRow(cols);
      sh.getRange(1, 1, 1, cols.length).setFontWeight("bold").setBackground("#f3f3f3");
      sh.setFrozenRows(1);
      log.push(nome + ": criada.");
      return;
    }
    const atuais = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(h) { return SGO_UTILS.safe(h); }) : [];
    const faltantes = cols.filter(function(c) { return atuais.indexOf(c) < 0; });
    if (faltantes.length) sh.getRange(1, atuais.length + 1, 1, faltantes.length).setValues([faltantes]);
    sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), cols.length)).setFontWeight("bold").setBackground("#f3f3f3");
    sh.setFrozenRows(1);
    log.push(nome + ": verificada.");
  }

  function pastaAst_() {
    const id = SGO_CFG.DRIVE.FOLDER_ASSISTENCIA_TECNICA;
    return id ? DriveApp.getFolderById(id) : DriveApp.getRootFolder();
  }

  function montarUrlPublica_(token) {
    return ScriptApp.getService().getUrl() + "?ast=" + encodeURIComponent(token);
  }
  function montarUrlValidacao_(token) {
    return ScriptApp.getService().getUrl() + "?validar=" + encodeURIComponent(token);
  }
  function gerarProtocolo_() {
    return "AST-" + Utilities.formatDate(new Date(), SGO_CFG.SISTEMA.TIMEZONE, "yyyyMMdd-HHmmss");
  }
  function gerarTokenEntradaUnico_() {
    let token = "";
    for (let i = 0; i < 5; i++) {
      token = "AST-" + SGO_UTILS.uuid();
      if (!SGO_DATA.getByField(S.AST_ENTRADAS, "QR_TOKEN", token)) return token;
    }
    return "AST-" + Date.now() + "-" + SGO_UTILS.uuid();
  }
  function gerarTokenDocumentoUnico_(prefixo) {
    let token = "";
    for (let i = 0; i < 5; i++) {
      token = prefixo + "-" + SGO_UTILS.uuid();
      if (!SGO_DATA.getByField(S.AST_DOCUMENTOS, "TOKEN_VALIDACAO", token)) return token;
    }
    return prefixo + "-" + Date.now() + "-" + SGO_UTILS.uuid();
  }
  function bandeira_(status, prioridade) {
    if (SGO_UTILS.safeUpper(prioridade) === "CRITICA") return "VERMELHO";
    if (["ENTREGUE", "PRONTO_ENTREGA", "LAB_APROVADO", "LAB_CERTIFICADO_GERADO", "LAB_RELATORIO_GERADO", "LAB_PRONTO_PARA_ENTREGA"].indexOf(status) >= 0) return "VERDE";
    if (["ENTRADA", "TRIAGEM"].indexOf(status) >= 0) return "AZUL_CINZA";
    if (["ATRASADO", "SEM_RESPONSAVEL", "TERCEIRO_ATRASADO", "TERCEIRO_EXTRAVIADO", "LAB_REPROVADO", "LAB_BLOQUEADO"].indexOf(status) >= 0) return "VERMELHO";
    return "AMARELO";
  }
  function localizacaoPorStatus_(status) {
    if (status === "TERCEIROS" || status === "AGUARDANDO_TERCEIRO" || status === "ENVIADO_PARA_TERCEIRO" || String(status || "").indexOf("TERCEIRO_") === 0) return "ASSISTENCIA_TERCEIRIZADA";
    if (status === "LABORATORIO" || status === "ENTRADA_LABORATORIO" || status === "LAB_EM_PROCESSO" || String(status || "").indexOf("LAB_") === 0) return "LABORATORIO_INTERNO";
    if (status === "ENTREGUE") return "CLIENTE";
    return "ASSISTENCIA_LOCAL";
  }
  function ativo_(status) {
    const s = SGO_UTILS.safeUpper(status);
    return !s || s === "ATIVO" || s === "QUALIFICADO";
  }
  function perfilAst_(sessao) {
    return SGO_UTILS.safeUpper(sessao && (sessao.perfil || sessao.PERFIL || sessao.role || sessao.ROLE));
  }
  function astPodePerfil_(sessao, acao) {
    const p = perfilAst_(sessao);
    if (p === "ADMIN" || p === "DIRETORIA") return true;
    if (acao === "INTERNO") return ["GESTOR", "TECNICO", "COMERCIAL", "METROLOGIA"].indexOf(p) >= 0;
    if (acao === "GESTAO" || acao === "GERENCIAR_ENTRADAS" || acao === "RELATORIOS" || acao === "TERCEIROS") return p === "GESTOR";
    if (acao === "TECNICO") return p === "GESTOR" || p === "TECNICO";
    if (acao === "PECAS") return ["GESTOR", "TECNICO", "COMERCIAL"].indexOf(p) >= 0;
    if (acao === "COMERCIAL") return ["GESTOR", "COMERCIAL"].indexOf(p) >= 0;
    if (acao === "LABORATORIO") return ["GESTOR", "METROLOGIA"].indexOf(p) >= 0;
    return false;
  }
  function tecnicoAutorizadoEntrada_(sessao, entrada) {
    if (perfilAst_(sessao) !== "TECNICO") return true;
    const atribuido = SGO_UTILS.safe(entrada && entrada.TECNICO_ID);
    if (!atribuido) return true;
    const possiveis = [
      sessao && sessao.tecnicoId,
      sessao && sessao.TECNICO_ID,
      sessao && sessao.userId,
      sessao && sessao.usuarioId,
      sessao && sessao.usuario,
      sessao && sessao.email
    ].map(function(v) { return SGO_UTILS.safe(v); }).filter(Boolean);
    return possiveis.indexOf(atribuido) >= 0 || SGO_UTILS.safe(entrada.TECNICO_NOME) === SGO_UTILS.safe(sessao && sessao.nome);
  }
  function exigirAst_(sessao, acao, entrada) {
    if (perfilAst_(sessao) === "CLIENTE") return { success: false, message: "Perfil cliente nao acessa a area interna da Assistencia Tecnica. Use a validacao publica por token." };
    if (!astPodePerfil_(sessao, acao)) return { success: false, message: "Perfil sem permissao para esta acao da Assistencia Tecnica." };
    if (entrada && entrada.CLIENTE_ID && !podeVerCliente_(sessao, entrada.CLIENTE_ID)) return { success: false, message: "Acesso negado." };
    if (acao === "TECNICO" && entrada && !tecnicoAutorizadoEntrada_(sessao, entrada)) return { success: false, message: "Tecnico sem autorizacao para atuar nesta entrada." };
    return { success: true };
  }
  function podeVerCliente_(sessao, clienteId) {
    return SGO_UTILS.safeUpper(sessao.perfil) !== "CLIENTE" || SGO_UTILS.safe(sessao.clienteId) === SGO_UTILS.safe(clienteId);
  }
  function filtrarClienteSessao_(items, sessao) {
    return SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE" ? items.filter(function(c) { return SGO_UTILS.safe(c.ID) === SGO_UTILS.safe(sessao.clienteId); }) : items.filter(function(c) { return ativo_(c.STATUS); });
  }
  function estaAtrasado_(e) {
    const prazo = SGO_UTILS.safe(e.PRAZO_PROMETIDO);
    if (!prazo || ["ENTREGUE", "CANCELADO", "SEM_REPARO"].indexOf(SGO_UTILS.safeUpper(e.STATUS)) >= 0) return false;
    return new Date(prazo + "T23:59:59").getTime() < Date.now();
  }
  function horasDesde_(iso) {
    const t = new Date(iso || 0).getTime();
    return t ? (Date.now() - t) / 3600000 : 9999;
  }
  function contarStatus_(items, lista) {
    return items.filter(function(e) { return lista.indexOf(SGO_UTILS.safeUpper(e.STATUS)) >= 0; }).length;
  }
  function calcularIndicadores_(entradas) {
    const concluidas = entradas.filter(function(e) { return ["ENTREGUE", "PRONTO_ENTREGA"].indexOf(SGO_UTILS.safeUpper(e.STATUS)) >= 0; });
    return {
      taxaConclusao: entradas.length ? Math.round((concluidas.length / entradas.length) * 100) : 0,
      taxaAtraso: entradas.length ? Math.round((entradas.filter(estaAtrasado_).length / entradas.length) * 100) : 0,
      taxaSemReparo: entradas.length ? Math.round((contarStatus_(entradas, ["SEM_REPARO"]) / entradas.length) * 100) : 0,
      tempoMedioAteEntregaHoras: mediaHoras_(concluidas)
    };
  }
  function mediaHoras_(items) {
    if (!items.length) return 0;
    const total = items.reduce(function(acc, e) {
      const ini = new Date(e.CRIADO_EM).getTime();
      const fim = new Date(e.ATUALIZADO_EM || e.CRIADO_EM).getTime();
      return acc + Math.max(0, fim - ini) / 3600000;
    }, 0);
    return Math.round(total / items.length);
  }
  function aberto_(e) {
    return ["ENTREGUE", "CANCELADO", "SEM_REPARO", "TERCEIRO_CANCELADO", "TERCEIRO_SEM_REPARO"].indexOf(SGO_UTILS.safeUpper(e.STATUS)) < 0;
  }
  function concluido_(e) {
    return ["ENTREGUE", "PRONTO_ENTREGA", "PRONTO_PARA_RETIRADA", "LAB_PRONTO_PARA_ENTREGA"].indexOf(SGO_UTILS.safeUpper(e.STATUS)) >= 0;
  }
  function emTerceiro_(e) {
    const s = SGO_UTILS.safeUpper(e.STATUS);
    return s === "TERCEIROS" || s === "AGUARDANDO_TERCEIRO" || s === "ENVIADO_PARA_TERCEIRO" || s.indexOf("TERCEIRO_") === 0;
  }
  function emLaboratorio_(e) {
    const s = SGO_UTILS.safeUpper(e.STATUS);
    return s === "LABORATORIO" || s === "ENTRADA_LABORATORIO" || s === "LAB_EM_PROCESSO" || s.indexOf("LAB_") === 0;
  }
  function statusContem_(e, termos) {
    const s = SGO_UTILS.safeUpper(e.STATUS);
    return (termos || []).some(function(t) { return s.indexOf(SGO_UTILS.safeUpper(t)) >= 0 || s === SGO_UTILS.safeUpper(t); });
  }
  function percentual_(parte, total) {
    return total ? Math.round((Number(parte || 0) / Number(total || 0)) * 100) : 0;
  }
  function diasDesde_(iso) {
    const t = new Date(iso || 0).getTime();
    return t ? Math.max(0, Math.floor((Date.now() - t) / 86400000)) : 0;
  }
  function diasSemMovimento_(e) {
    return diasDesde_(e.ULTIMA_MOVIMENTACAO_EM || e.ATUALIZADO_EM || e.CRIADO_EM);
  }
  function dataDia_(iso) {
    return SGO_UTILS.safe(iso).slice(0, 10);
  }
  function nomeArquivoAst_(nome) {
    const limpo = SGO_UTILS.safe(nome).replace(/[\\/:*?"<>|]+/g, "_").trim();
    return limpo || ("ast_anexo_" + Date.now());
  }
  function entradaIdPorVinculoAnexo_(vinculo, idRelacionado) {
    const id = SGO_UTILS.safe(idRelacionado);
    if (!id) return "";
    if (["ENTRADA", "DIAGNOSTICO", "EXECUCAO", "TESTE"].indexOf(vinculo) >= 0) {
      const entrada = SGO_DATA.getById(S.AST_ENTRADAS, id);
      if (entrada) return entrada.ID;
    }
    if (vinculo === "DIAGNOSTICO") {
      const diag = SGO_DATA.getById(S.AST_DIAGNOSTICOS, id);
      return diag ? diag.ENTRADA_ID : id;
    }
    if (vinculo === "EXECUCAO") {
      const exec = SGO_DATA.getById(sheet_("AST_EXECUCOES"), id);
      return exec ? exec.ENTRADA_ID : id;
    }
    if (vinculo === "TESTE") {
      const teste = SGO_DATA.getById(sheet_("AST_TESTES_BANCADA"), id);
      return teste ? teste.ENTRADA_ID : id;
    }
    if (vinculo === "TERCEIRO") {
      const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, id);
      return terceiro ? terceiro.ENTRADA_ID : "";
    }
    if (vinculo === "LABORATORIO") {
      const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, id);
      return lab ? lab.ENTRADA_ID : "";
    }
    return id;
  }
  function indexarPorEntrada_(items) {
    const idx = {};
    (items || []).forEach(function(item) {
      const id = SGO_UTILS.safe(item.ENTRADA_ID);
      if (!id) return;
      if (!idx[id]) idx[id] = {};
      idx[id][item.ID || SGO_UTILS.uuid()] = item;
    });
    return idx;
  }
  function agruparGerencial_(items, idFn, nomeFn) {
    const mapa = {};
    (items || []).forEach(function(e) {
      const id = SGO_UTILS.safe(idFn(e)) || "SEM_GRUPO";
      if (!mapa[id]) mapa[id] = { id: id, nome: nomeFn(e), items: [] };
      mapa[id].items.push(e);
    });
    return Object.keys(mapa).map(function(k) { return mapa[k]; });
  }
  function movimentosPorEntradas_(entradas) {
    let out = [];
    (entradas || []).forEach(function(e) {
      out = out.concat(SGO_DATA.getManyByField(S.AST_MOVIMENTACOES, "ENTRADA_ID", e.ID));
    });
    return out;
  }
  function mediaEntreEventos_(entradas, sheetName, campoFim) {
    const horas = [];
    (entradas || []).forEach(function(e) {
      const regs = SGO_DATA.getManyByField(sheetName, "ENTRADA_ID", e.ID);
      regs.forEach(function(r) {
        const ini = new Date(e.CRIADO_EM).getTime();
        const fim = new Date(r[campoFim] || r.CRIADO_EM || 0).getTime();
        if (ini && fim) horas.push(Math.max(0, fim - ini) / 3600000);
      });
    });
    if (!horas.length) return 0;
    return Math.round(horas.reduce(function(a, b) { return a + b; }, 0) / horas.length);
  }
  function rankingCampo_(entradas, campo) {
    const mapa = {};
    (entradas || []).forEach(function(e) {
      const valor = SGO_UTILS.safe(e[campo]) || "Nao informado";
      mapa[valor] = (mapa[valor] || 0) + 1;
    });
    return Object.keys(mapa).map(function(k) { return { nome: k, total: mapa[k] }; }).sort(function(a, b) { return b.total - a.total; });
  }
  function rankingFabricante_(entradas) {
    const mapa = {};
    (entradas || []).forEach(function(e) {
      const partes = SGO_UTILS.safe(e.EQUIPAMENTO_NOME).split(" - ");
      const fab = partes.length >= 3 ? partes[2] : "Nao informado";
      mapa[fab] = (mapa[fab] || 0) + 1;
    });
    return Object.keys(mapa).map(function(k) { return { nome: k, total: mapa[k] }; }).sort(function(a, b) { return b.total - a.total; });
  }
  function motivoAtrasoMaisComum_(entradas) {
    const atrasados = (entradas || []).filter(estaAtrasado_);
    if (!atrasados.length) return "";
    const motivos = atrasados.map(function(e) {
      if (statusContem_(e, ["PECA"])) return "Aguardando peca";
      if (statusContem_(e, ["ORCAMENTO"])) return "Aguardando orcamento";
      if (statusContem_(e, ["APROVACAO"])) return "Aguardando aprovacao";
      if (emTerceiro_(e)) return "Aguardando terceiro";
      if (emLaboratorio_(e)) return "Aguardando laboratorio";
      if (diasSemMovimento_(e) >= 1) return "Sem atualizacao tecnica";
      return "Prazo vencido";
    });
    return rankingCampo_(motivos.map(function(m) { return { MOTIVO: m }; }), "MOTIVO")[0];
  }
  function resumoEntradaGerencial_(e) {
    return {
      entradaId: e.ID,
      entrada: e.PROTOCOLO,
      cliente: e.CLIENTE_NOME,
      equipamento: e.EQUIPAMENTO_NOME,
      status: e.STATUS,
      diasParado: diasSemMovimento_(e),
      responsavel: e.TECNICO_NOME || "--",
      proximaAcaoSugerida: proximaAcaoGerencial_(e)
    };
  }
  function proximaAcaoGerencial_(e) {
    if (statusContem_(e, ["PECA"])) return "Acionar compras/comercial e atualizar previsao.";
    if (statusContem_(e, ["ORCAMENTO", "APROVACAO"])) return "Retornar ao cliente com status comercial.";
    if (emTerceiro_(e)) return "Cobrar retorno do terceiro e registrar acompanhamento.";
    if (emLaboratorio_(e)) return "Validar etapa laboratorial pendente.";
    if (statusContem_(e, ["ENTRADA", "TRIAGEM", "DIAGNOSTICO"])) return "Priorizar diagnostico tecnico.";
    if (statusContem_(e, ["PRONTO"])) return "Agendar retirada ou entrega.";
    return e.PROXIMA_ACAO || "Registrar proxima movimentacao.";
  }
  function prefixoRelatorioGerencial_(tipo) {
    const mapa = {
      PRONTUARIO_CONFORMIDADE_MANUTENCAO_CLIENTE: "CLI-AST",
      PRONTUARIO_TECNICO_EQUIPAMENTO: "PTE-AST",
      RELATORIO_EXECUTIVO_GERAL_ASSISTENCIA: "EXEC-AST",
      RELATORIO_PRODUTIVIDADE_TECNICOS: "PROD-AST",
      RELATORIO_EQUIPAMENTOS_ATRASADOS: "ATR-AST",
      RELATORIO_CONFORMIDADE_DOCUMENTAL_AST: "CONF-AST"
    };
    return mapa[tipo] || "GER-AST";
  }
  function tituloRelatorioGerencial_(tipo) {
    const mapa = {
      PRONTUARIO_CONFORMIDADE_MANUTENCAO_CLIENTE: "Prontuario de Conformidade de Manutencao por Cliente",
      PRONTUARIO_TECNICO_EQUIPAMENTO: "Prontuario Tecnico Individual do Equipamento",
      RELATORIO_EXECUTIVO_GERAL_ASSISTENCIA: "Relatorio Executivo Geral da Assistencia",
      RELATORIO_PRODUTIVIDADE_TECNICOS: "Relatorio de Produtividade dos Tecnicos",
      RELATORIO_EQUIPAMENTOS_ATRASADOS: "Relatorio de Equipamentos Atrasados",
      RELATORIO_CONFORMIDADE_DOCUMENTAL_AST: "Relatorio de Conformidade Documental AST"
    };
    return mapa[tipo] || tipo;
  }
  function cardPdf_(label, valor) {
    return '<div class="box"><div class="lab">' + esc_(label) + '</div><div class="val">' + esc_(valor === undefined ? 0 : valor) + '</div></div>';
  }
  function linhasRanking_(items, campos) {
    if (!items || !items.length) return "<tr><td>Sem dados.</td></tr>";
    const head = "<tr>" + campos.map(function(c) { return "<th>" + esc_(c) + "</th>"; }).join("") + "</tr>";
    const body = items.slice(0, 40).map(function(item) {
      return "<tr>" + campos.map(function(c) { return "<td>" + esc_(item[c]) + "</td>"; }).join("") + "</tr>";
    }).join("");
    return head + body;
  }
  function obterConclusaoGerencial_(tipo, dashboard) {
    const c = dashboard.cards || {};
    const conf = dashboard.conformidade || {};
    return [
      tituloRelatorioGerencial_(tipo),
      "A carteira filtrada possui " + (c.totalAssistencia || 0) + " equipamento(s), com " + (c.emAberto || 0) + " em aberto e " + (c.atrasados || 0) + " atrasado(s).",
      "O indice de conformidade documental esta em " + (conf.indiceGeral || 0) + "%, com " + ((conf.registrosIncompletos || []).length) + " registro(s) incompleto(s).",
      (c.criticos || 0) > 0 ? "Ha itens criticos que exigem acompanhamento imediato." : "Nao ha itens criticos no recorte informado."
    ].join("\n");
  }
  function secaoExtraRelatorioGerencial_(tipo, dados, dashboard) {
    if (tipo === "PRONTUARIO_TECNICO_EQUIPAMENTO") return secaoProntuarioEquipamento_(dados.entradas[0]);
    if (tipo === "PRONTUARIO_CONFORMIDADE_MANUTENCAO_CLIENTE") return secaoClienteConformidade_(dados, dashboard);
    if (tipo === "RELATORIO_PRODUTIVIDADE_TECNICOS") return "<h2>Observacoes gerenciais</h2><div class='box'>Ranking calculado por concluidos, backlog e atrasos no periodo filtrado. Transferencias sao apuradas por movimentacoes de troca de tecnico.</div>";
    if (tipo === "RELATORIO_EQUIPAMENTOS_ATRASADOS") return "<h2>Motivos provaveis e acoes</h2><div class='box'>Os motivos sao inferidos por status atual, prazo prometido, fluxo de terceiros/laboratorio e dias sem movimentacao.</div>";
    if (tipo === "RELATORIO_CONFORMIDADE_DOCUMENTAL_AST") return secaoRegistrosIncompletos_(dashboard.conformidade || {});
    return "";
  }
  function secaoProntuarioEquipamento_(entrada) {
    if (!entrada || !entrada.ID) return "";
    const ctx = montarContextoTecnico_(entrada.ID) || { entrada: entrada, pecas: [], testes: [], execucoes: [], fotos: [] };
    const docs = SGO_DATA.getManyByField(S.AST_DOCUMENTOS, "ENTRADA_ID", entrada.ID);
    const movs = SGO_DATA.getManyByField(S.AST_MOVIMENTACOES, "ENTRADA_ID", entrada.ID);
    const terceiros = montarTerceirosEntrada_(entrada.ID);
    const labs = montarLaboratorioEntrada_(entrada.ID);
    return "<h2>Prontuario tecnico individual</h2>" +
      tabelaChaveValor_([["Cliente", entrada.CLIENTE_NOME], ["Unidade", entrada.UNIDADE_NOME], ["Equipamento", entrada.EQUIPAMENTO_NOME], ["Serie", entrada.EQUIPAMENTO_SERIE], ["Status atual", entrada.STATUS], ["Token", entrada.QR_TOKEN], ["Validacao", entrada.URL_PUBLICA]]) +
      "<h2>Historico de diagnosticos</h2>" + tabelaObjetos_(SGO_DATA.getManyByField(S.AST_DIAGNOSTICOS, "ENTRADA_ID", entrada.ID), ["CRIADO_EM", "TECNICO_NOME", "DEFEITO_CONFIRMADO", "CAUSA_PROVAVEL", "RECOMENDACAO_TECNICA"]) +
      "<h2>Historico de pecas</h2>" + tabelaObjetos_(ctx.pecas || [], ["NOME_PECA", "QUANTIDADE", "STATUS", "JUSTIFICATIVA_TECNICA"]) +
      "<h2>Historico de testes</h2>" + tabelaObjetos_(ctx.testes || [], ["DATA_TESTE", "TECNICO_NOME", "TIPO_TESTE", "RESULTADO", "PROXIMA_ACAO"]) +
      "<h2>Historico de execucoes</h2>" + tabelaObjetos_(ctx.execucoes || [], ["DATA_EXECUCAO", "TECNICO_NOME", "SERVICO_REALIZADO", "RESULTADO_FINAL", "STATUS_FINAL"]) +
      "<h2>Terceiros</h2>" + tabelaObjetos_(terceiros || [], ["EMPRESA_NOME", "STATUS_TERCEIRO", "ENVIADO_EM", "RETORNADO_EM", "PROXIMA_ACAO"]) +
      "<h2>Laboratorio</h2>" + tabelaObjetos_(labs || [], ["TIPO_SERVICO", "STATUS", "RESPONSAVEL_NOME", "CONFORMIDADE", "RESULTADO_FINAL"]) +
      "<h2>Fotos/evidencias listadas</h2>" + tabelaObjetos_(ctx.fotos || [], ["TIPO_FOTO", "NOME_ARQUIVO", "LINK_DRIVE", "CRIADO_EM"]) +
      "<h2>Documentos gerados</h2>" + tabelaObjetos_(docs || [], ["TIPO_DOCUMENTO", "LINK_ARQUIVO", "TOKEN_VALIDACAO", "HASH_SHA256", "CRIADO_EM"]) +
      "<h2>Linha do tempo</h2>" + tabelaObjetos_(movs || [], ["CRIADO_EM", "TIPO", "STATUS_NOVO", "DESCRICAO", "PROXIMA_ACAO"]);
  }
  function secaoClienteConformidade_(dados, dashboard) {
    const incompletos = ((dashboard.conformidade || {}).registrosIncompletos || []).slice(0, 60);
    return "<h2>Condicoes de chegada e pendencias</h2>" + tabelaObjetos_((dados.entradas || []).slice(0, 80), ["PROTOCOLO", "CONDICAO_FISICA", "PROBLEMA_RELATADO", "STATUS", "ATRASADO"]) +
      "<h2>Motivos de pendencia documental</h2>" + tabelaObjetos_(incompletos, ["protocolo", "cliente", "pendencias"]);
  }
  function secaoRegistrosIncompletos_(conf) {
    return "<h2>Registros incompletos e acao recomendada</h2>" + tabelaObjetos_((conf.registrosIncompletos || []).slice(0, 120), ["protocolo", "cliente", "pendencias"]) +
      "<div class='box'>Acao recomendada: completar evidencias obrigatorias, documentos tecnicos, termo de entrega e movimentacoes antes do encerramento operacional.</div>";
  }
  function tabelaChaveValor_(pares) {
    return "<table><tbody>" + (pares || []).map(function(p) { return "<tr><th>" + esc_(p[0]) + "</th><td>" + esc_(p[1] || "--") + "</td></tr>"; }).join("") + "</tbody></table>";
  }
  function tabelaObjetos_(items, campos) {
    if (!items || !items.length) return "<table><tbody><tr><td>Sem registros.</td></tr></tbody></table>";
    return "<table><thead><tr>" + campos.map(function(c) { return "<th>" + esc_(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      items.map(function(item) {
        return "<tr>" + campos.map(function(c) {
          const valor = Array.isArray(item[c]) ? item[c].join(", ") : item[c];
          return "<td>" + esc_(valor || "--") + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table>";
  }
  function sha256_(texto) {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto)
      .map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, "0"); }).join("");
  }
  function formatarDataBR_(valor) {
    try {
      if (!valor) return "";
      return Utilities.formatDate(new Date(valor), SGO_CFG.SISTEMA.TIMEZONE || Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
    } catch (e) {
      return SGO_UTILS.safe(valor);
    }
  }
  function esc_(v) {
    return String(v === null || v === undefined ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  return {
    setup: setup,
    contexto: contexto,
    listarUnidades: listarUnidades,
    listarEquipamentos: listarEquipamentos,
    criarEntrada: criarEntrada,
    listarEntradas: listarEntradas,
    obterEntrada: obterEntrada,
    trocarTecnico: trocarTecnico,
    atualizarStatus: atualizarStatus,
    uploadFotoBase64: uploadFotoBase64,
    uploadAnexo: uploadAnexo,
    salvarDiagnostico: salvarDiagnostico,
    adicionarEvidencia: adicionarEvidencia,
    salvarPeca: salvarPeca,
    atualizarPeca: atualizarPeca,
    registrarTesteBancada: registrarTesteBancada,
    registrarExecucao: registrarExecucao,
    concluirTecnica: concluirTecnica,
    gerarRelatorioDiagnostico: gerarRelatorioDiagnostico,
    gerarRelatorioManutencao: gerarRelatorioManutencao,
    obterResumoComercial: obterResumoComercial,
    registrarEnvioTerceiro: registrarEnvioTerceiro,
    salvarAcessorioTerceiro: salvarAcessorioTerceiro,
    anexarDocumentoTerceiro: anexarDocumentoTerceiro,
    registrarAcompanhamentoTerceiro: registrarAcompanhamentoTerceiro,
    registrarRetornoTerceiro: registrarRetornoTerceiro,
    registrarInspecaoRetornoTerceiro: registrarInspecaoRetornoTerceiro,
    gerarDocumentoTerceiro: gerarDocumentoTerceiro,
    obterWhatsappTerceiro: obterWhatsappTerceiro,
    registrarEntradaLaboratorio: registrarEntradaLaboratorio,
    adicionarPadraoLaboratorio: adicionarPadraoLaboratorio,
    registrarEnsaioLaboratorio: registrarEnsaioLaboratorio,
    anexarEvidenciaLaboratorio: anexarEvidenciaLaboratorio,
    consolidarResultadoLaboratorio: consolidarResultadoLaboratorio,
    gerarDocumentoLaboratorio: gerarDocumentoLaboratorio,
    obterWhatsappLaboratorio: obterWhatsappLaboratorio,
    dashboard: dashboard,
    gerarDocumentoEntrada: gerarDocumentoEntrada,
    gerarEtiqueta: gerarEtiqueta,
    gerarEtiquetaPdf: gerarEtiquetaPdf,
    registrarAcao: registrarAcao,
    obterWhatsapp: obterWhatsapp,
    consultarPublico: consultarPublico,
    obterDashboardGerencial: obterDashboardGerencial,
    calcularIndicadoresAssistencia: calcularIndicadoresAssistencia,
    calcularIndicadoresPorCliente: calcularIndicadoresPorCliente,
    calcularIndicadoresPorTecnico: calcularIndicadoresPorTecnico,
    calcularIndicadoresRotatividade: calcularIndicadoresRotatividade,
    calcularIndicadoresGargalos: calcularIndicadoresGargalos,
    calcularConformidadeDocumental: calcularConformidadeDocumental,
    listarAlertasCriticosGerenciais: listarAlertasCriticosGerenciais,
    gerarRelatorioClienteAST: gerarRelatorioClienteAST,
    gerarProntuarioEquipamentoAST: gerarProntuarioEquipamentoAST,
    gerarRelatorioExecutivoAST: gerarRelatorioExecutivoAST,
    gerarRelatorioProdutividadeTecnicosAST: gerarRelatorioProdutividadeTecnicosAST,
    gerarRelatorioAtrasadosAST: gerarRelatorioAtrasadosAST,
    gerarRelatorioConformidadeDocumentalAST: gerarRelatorioConformidadeDocumentalAST,
    obterResumoExecutivoAST: obterResumoExecutivoAST
  };
})();

function setupAssistenciaTecnica() { return SGO_AST.setup(); }
function registrarEntradaAssistencia(sessionId, payload) { return SGO_AST.criarEntrada(sessionId, payload); }
function astContexto(sessionId) { return SGO_AST.contexto(sessionId); }
function astListarUnidades(sessionId, clienteId) { return SGO_AST.listarUnidades(sessionId, clienteId); }
function astListarEquipamentos(sessionId, clienteId, unidadeId) { return SGO_AST.listarEquipamentos(sessionId, clienteId, unidadeId); }
function astCriarEntrada(sessionId, payload) { return SGO_AST.criarEntrada(sessionId, payload); }
function astListarEntradas(sessionId, filtros) { return SGO_AST.listarEntradas(sessionId, filtros); }
function astObterEntrada(sessionId, id) { return SGO_AST.obterEntrada(sessionId, id); }
function astTrocarTecnico(sessionId, entradaId, tecnicoId, motivo) { return SGO_AST.trocarTecnico(sessionId, entradaId, tecnicoId, motivo); }
function astAtualizarStatus(sessionId, entradaId, status, descricao, proximaAcao) { return SGO_AST.atualizarStatus(sessionId, entradaId, status, descricao, proximaAcao); }
function astUploadFotoBase64(sessionId, entradaId, payload) { return SGO_AST.uploadFotoBase64(sessionId, entradaId, payload); }
function astUploadAnexo(sessionId, payload) { return SGO_AST.uploadAnexo(sessionId, payload); }
function astSalvarDiagnostico(sessionId, entradaId, payload) { return SGO_AST.salvarDiagnostico(sessionId, entradaId, payload); }
function astAdicionarEvidencia(sessionId, entradaId, payload) { return SGO_AST.adicionarEvidencia(sessionId, entradaId, payload); }
function astSalvarPeca(sessionId, entradaId, payload) { return SGO_AST.salvarPeca(sessionId, entradaId, payload); }
function astAtualizarPeca(sessionId, pecaId, payload) { return SGO_AST.atualizarPeca(sessionId, pecaId, payload); }
function astRegistrarTesteBancada(sessionId, entradaId, payload) { return SGO_AST.registrarTesteBancada(sessionId, entradaId, payload); }
function astRegistrarExecucao(sessionId, entradaId, payload) { return SGO_AST.registrarExecucao(sessionId, entradaId, payload); }
function astConcluirTecnica(sessionId, entradaId, payload) { return SGO_AST.concluirTecnica(sessionId, entradaId, payload); }
function astGerarRelatorioDiagnostico(sessionId, entradaId) { return SGO_AST.gerarRelatorioDiagnostico(sessionId, entradaId); }
function astGerarRelatorioManutencao(sessionId, entradaId) { return SGO_AST.gerarRelatorioManutencao(sessionId, entradaId); }
function astObterResumoComercial(sessionId, entradaId) { return SGO_AST.obterResumoComercial(sessionId, entradaId); }
function astRegistrarEnvioTerceiro(sessionId, entradaId, payload) { return SGO_AST.registrarEnvioTerceiro(sessionId, entradaId, payload); }
function astSalvarAcessorioTerceiro(sessionId, terceiroId, payload) { return SGO_AST.salvarAcessorioTerceiro(sessionId, terceiroId, payload); }
function astAnexarDocumentoTerceiro(sessionId, terceiroId, payload) { return SGO_AST.anexarDocumentoTerceiro(sessionId, terceiroId, payload); }
function astRegistrarAcompanhamentoTerceiro(sessionId, terceiroId, payload) { return SGO_AST.registrarAcompanhamentoTerceiro(sessionId, terceiroId, payload); }
function astRegistrarRetornoTerceiro(sessionId, terceiroId, payload) { return SGO_AST.registrarRetornoTerceiro(sessionId, terceiroId, payload); }
function astRegistrarInspecaoRetornoTerceiro(sessionId, terceiroId, payload) { return SGO_AST.registrarInspecaoRetornoTerceiro(sessionId, terceiroId, payload); }
function astGerarDocumentoTerceiro(sessionId, terceiroId, tipo) { return SGO_AST.gerarDocumentoTerceiro(sessionId, terceiroId, tipo); }
function astObterWhatsappTerceiro(sessionId, terceiroId, tipo) { return SGO_AST.obterWhatsappTerceiro(sessionId, terceiroId, tipo); }
function astRegistrarEntradaLaboratorio(sessionId, entradaId, payload) { return SGO_AST.registrarEntradaLaboratorio(sessionId, entradaId, payload); }
function astAdicionarPadraoLaboratorio(sessionId, labId, payload) { return SGO_AST.adicionarPadraoLaboratorio(sessionId, labId, payload); }
function astRegistrarEnsaioLaboratorio(sessionId, labId, payload) { return SGO_AST.registrarEnsaioLaboratorio(sessionId, labId, payload); }
function astAnexarEvidenciaLaboratorio(sessionId, labId, payload) { return SGO_AST.anexarEvidenciaLaboratorio(sessionId, labId, payload); }
function astConsolidarResultadoLaboratorio(sessionId, labId, payload) { return SGO_AST.consolidarResultadoLaboratorio(sessionId, labId, payload); }
function astGerarDocumentoLaboratorio(sessionId, labId, tipo) { return SGO_AST.gerarDocumentoLaboratorio(sessionId, labId, tipo); }
function astObterWhatsappLaboratorio(sessionId, labId, tipo) { return SGO_AST.obterWhatsappLaboratorio(sessionId, labId, tipo); }
function astDashboard(sessionId) { return SGO_AST.dashboard(sessionId); }
function astGerarDocumentoEntrada(sessionId, entradaId) { return SGO_AST.gerarDocumentoEntrada(sessionId, entradaId); }
function astGerarEtiqueta(sessionId, entradaId, tamanho) { return SGO_AST.gerarEtiqueta(sessionId, entradaId, tamanho); }
function astGerarEtiquetaPdf(sessionId, entradaId, tamanho) { return SGO_AST.gerarEtiquetaPdf(sessionId, entradaId, tamanho); }
function astRegistrarAcao(sessionId, entradaId, acao, detalhe) { return SGO_AST.registrarAcao(sessionId, entradaId, acao, detalhe); }
function astObterWhatsapp(sessionId, entradaId) { return SGO_AST.obterWhatsapp(sessionId, entradaId); }
function obterDashboardGerencial(sessionId, filtros) { return SGO_AST.obterDashboardGerencial(sessionId, filtros); }
function calcularIndicadoresAssistencia(sessionId, filtros) { return SGO_AST.obterDashboardGerencial(sessionId, filtros).cards; }
function calcularIndicadoresPorCliente(sessionId, filtros) { return SGO_AST.obterDashboardGerencial(sessionId, filtros).clientes; }
function calcularIndicadoresPorTecnico(sessionId, filtros) { return SGO_AST.obterDashboardGerencial(sessionId, filtros).tecnicos; }
function calcularIndicadoresRotatividade(sessionId, filtros) { return SGO_AST.obterDashboardGerencial(sessionId, filtros).rotatividade; }
function calcularIndicadoresGargalos(sessionId, filtros) { return SGO_AST.obterDashboardGerencial(sessionId, filtros).gargalos; }
function calcularConformidadeDocumental(sessionId, filtros) { return SGO_AST.obterDashboardGerencial(sessionId, filtros).conformidade; }
function listarAlertasCriticosGerenciais(sessionId, filtros) { return SGO_AST.obterDashboardGerencial(sessionId, filtros).alertas; }
function gerarRelatorioClienteAST(sessionId, filtros) { return SGO_AST.gerarRelatorioClienteAST(sessionId, filtros); }
function gerarProntuarioEquipamentoAST(sessionId, entradaId) { return SGO_AST.gerarProntuarioEquipamentoAST(sessionId, entradaId); }
function gerarRelatorioExecutivoAST(sessionId, filtros) { return SGO_AST.gerarRelatorioExecutivoAST(sessionId, filtros); }
function gerarRelatorioProdutividadeTecnicosAST(sessionId, filtros) { return SGO_AST.gerarRelatorioProdutividadeTecnicosAST(sessionId, filtros); }
function gerarRelatorioAtrasadosAST(sessionId, filtros) { return SGO_AST.gerarRelatorioAtrasadosAST(sessionId, filtros); }
function gerarRelatorioConformidadeDocumentalAST(sessionId, filtros) { return SGO_AST.gerarRelatorioConformidadeDocumentalAST(sessionId, filtros); }
function obterResumoExecutivoAST(sessionId, filtros) { return SGO_AST.obterResumoExecutivoAST(sessionId, filtros); }
function astObterDashboardGerencial(sessionId, filtros) { return SGO_AST.obterDashboardGerencial(sessionId, filtros); }
function astGerarRelatorioCliente(sessionId, filtros) { return SGO_AST.gerarRelatorioClienteAST(sessionId, filtros); }
function astGerarProntuarioEquipamento(sessionId, entradaId) { return SGO_AST.gerarProntuarioEquipamentoAST(sessionId, entradaId); }
function astGerarRelatorioExecutivo(sessionId, filtros) { return SGO_AST.gerarRelatorioExecutivoAST(sessionId, filtros); }
function astGerarRelatorioProdutividadeTecnicos(sessionId, filtros) { return SGO_AST.gerarRelatorioProdutividadeTecnicosAST(sessionId, filtros); }
function astGerarRelatorioAtrasados(sessionId, filtros) { return SGO_AST.gerarRelatorioAtrasadosAST(sessionId, filtros); }
function astGerarRelatorioConformidadeDocumental(sessionId, filtros) { return SGO_AST.gerarRelatorioConformidadeDocumentalAST(sessionId, filtros); }
function astObterResumoExecutivo(sessionId, filtros) { return SGO_AST.obterResumoExecutivoAST(sessionId, filtros); }
