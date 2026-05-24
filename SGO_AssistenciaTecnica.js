const SGO_AST = (() => {
  const DB = "PRINCIPAL";
  const S = SGO_CFG.SHEETS;
  const QR_API = "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=";

  const STATUS = {
    ENTRADA: "ENTRADA",
    TRIAGEM: "TRIAGEM",
    DIAGNOSTICO: "DIAGNOSTICO",
    AGUARDANDO_DECISAO: "AGUARDANDO_DECISAO",
    AGUARDANDO_PECAS: "AGUARDANDO_PECAS",
    PECA_SOLICITADA: "PECA_SOLICITADA",
    PECA_EM_COTACAO: "PECA_EM_COTACAO",
    PECA_AGUARDANDO_APROVACAO: "PECA_AGUARDANDO_APROVACAO",
    PECA_COMPRADA: "PECA_COMPRADA",
    PECA_RECEBIDA: "PECA_RECEBIDA",
    PECA_INSTALADA: "PECA_INSTALADA",
    ENVIADO_PARA_TERCEIRO: "ENVIADO_PARA_TERCEIRO",
    AGUARDANDO_TERCEIRO: "AGUARDANDO_TERCEIRO",
    TERCEIRO_RECEBIDO_METROLABS: "TERCEIRO_RECEBIDO_METROLABS",
    TERCEIRO_INSPECAO_RETORNO: "TERCEIRO_INSPECAO_RETORNO",
    LABORATORIO: "LABORATORIO",
    LAB_EM_ENSAIO: "LAB_EM_ENSAIO",
    MANUTENCAO: "MANUTENCAO",
    TESTE_VALIDACAO: "TESTE_VALIDACAO",
    CONCLUSAO_TECNICA: "CONCLUSAO_TECNICA",
    PRONTO_ENTREGA: "PRONTO_ENTREGA",
    ENTREGUE: "ENTREGUE",
    FINALIZADO: "FINALIZADO",
    SEM_REPARO: "SEM_REPARO",
    CANCELADO: "CANCELADO",
    ATRASADO: "ATRASADO"
  };

  const STATUS_ALIAS = {
    ORCAMENTO: STATUS.AGUARDANDO_DECISAO,
    AGUARDANDO_APROVACAO: STATUS.AGUARDANDO_DECISAO,
    DIAGNOSTICO_CONCLUIDO: STATUS.AGUARDANDO_DECISAO,
    EM_MANUTENCAO: STATUS.MANUTENCAO,
    TESTE: STATUS.TESTE_VALIDACAO,
    TESTE_BANCADA: STATUS.TESTE_VALIDACAO,
    TESTE_CONCLUIDO: STATUS.TESTE_VALIDACAO,
    EM_TESTE: STATUS.TESTE_VALIDACAO,
    PRONTO_PARA_RETIRADA: STATUS.PRONTO_ENTREGA,
    REPARO_CONCLUIDO: STATUS.CONCLUSAO_TECNICA,
    LAB_EM_PROCESSO: STATUS.LAB_EM_ENSAIO,
    ENTRADA_LABORATORIO: STATUS.LABORATORIO,
    LAB_ENTRADA_REGISTRADA: STATUS.LABORATORIO,
    LAB_AGUARDANDO_ENSAIO: STATUS.LABORATORIO,
    LAB_AGUARDANDO_ANALISE: STATUS.LAB_EM_ENSAIO,
    LAB_ANALISE_CONCLUIDA: STATUS.CONCLUSAO_TECNICA,
    LAB_AGUARDANDO_CERTIFICADO: STATUS.CONCLUSAO_TECNICA,
    LAB_CERTIFICADO_GERADO: STATUS.PRONTO_ENTREGA,
    LAB_RELATORIO_GERADO: STATUS.PRONTO_ENTREGA,
    LAB_APROVADO: STATUS.PRONTO_ENTREGA,
    LAB_APROVADO_COM_RESSALVA: STATUS.PRONTO_ENTREGA,
    LAB_REPROVADO: STATUS.MANUTENCAO,
    LAB_BLOQUEADO: STATUS.AGUARDANDO_DECISAO,
    LAB_PRONTO_PARA_ENTREGA: STATUS.PRONTO_ENTREGA,
    LAB_ENTREGUE: STATUS.ENTREGUE,
    TERCEIROS: STATUS.AGUARDANDO_TERCEIRO,
    TERCEIRO_ENVIADO: STATUS.ENVIADO_PARA_TERCEIRO,
    TERCEIRO_RECEBIDO_PELA_EMPRESA: STATUS.ENVIADO_PARA_TERCEIRO,
    TERCEIRO_AGUARDANDO_DIAGNOSTICO: STATUS.ENVIADO_PARA_TERCEIRO,
    TERCEIRO_EM_DIAGNOSTICO: STATUS.ENVIADO_PARA_TERCEIRO,
    TERCEIRO_DIAGNOSTICO_RECEBIDO: STATUS.AGUARDANDO_DECISAO,
    TERCEIRO_AGUARDANDO_ORCAMENTO: STATUS.AGUARDANDO_DECISAO,
    TERCEIRO_ORCAMENTO_RECEBIDO: STATUS.AGUARDANDO_DECISAO,
    TERCEIRO_AGUARDANDO_APROVACAO_CLIENTE: STATUS.AGUARDANDO_DECISAO,
    TERCEIRO_APROVADO: STATUS.AGUARDANDO_TERCEIRO,
    TERCEIRO_EM_REPARO: STATUS.ENVIADO_PARA_TERCEIRO,
    TERCEIRO_AGUARDANDO_PECA: STATUS.AGUARDANDO_TERCEIRO,
    TERCEIRO_REPARO_CONCLUIDO: STATUS.TERCEIRO_RECEBIDO_METROLABS,
    TERCEIRO_EM_TESTE: STATUS.ENVIADO_PARA_TERCEIRO,
    TERCEIRO_LIBERADO_PARA_RETIRADA: STATUS.TERCEIRO_RECEBIDO_METROLABS,
    TERCEIRO_EM_RETORNO: STATUS.TERCEIRO_RECEBIDO_METROLABS,
    TERCEIRO_FINALIZADO: STATUS.CONCLUSAO_TECNICA,
    TERCEIRO_CANCELADO: STATUS.CANCELADO,
    TERCEIRO_SEM_REPARO: STATUS.SEM_REPARO,
    TERCEIRO_ATRASADO: STATUS.ATRASADO,
    TERCEIRO_EXTRAVIADO: STATUS.ATRASADO
  };

  const STATUS_PECA_PENDENTE = [
    STATUS.PECA_SOLICITADA,
    STATUS.PECA_EM_COTACAO,
    STATUS.PECA_AGUARDANDO_APROVACAO,
    STATUS.PECA_COMPRADA,
    "PECA_INDISPONIVEL"
  ];

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
    Object.keys(COLUNAS).forEach(function(key) {
      garantirAba_(ss, S[key] || key, COLUNAS[key], log);
    });
    if (SGO_DATA.clearCache) SGO_DATA.clearCache();
    return { success: true, message: "Estrutura da Assistencia Tecnica verificada.", log: log };
  }

  function contexto(sessionId) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    setup();
    return {
      success: true,
      status: STATUS,
      prioridades: ["BAIXA", "NORMAL", "ALTA", "CRITICA"],
      tiposFoto: (SGO_CFG.ASSISTENCIA_TECNICA && SGO_CFG.ASSISTENCIA_TECNICA.TIPOS_FOTO) || [],
      clientes: filtrarClienteSessao_(SGO_DATA.getAll(S.CAD_CLIENTES), sessao),
      tecnicos: listarTecnicos_(),
      fornecedores: listarFornecedoresTerceiro_(),
      dashboard: dashboardInterno_(sessao)
    };
  }

  function listarUnidades(sessionId, clienteId) {
    const sessao = exigirSessao(sessionId);
    if (!podeVerCliente_(sessao, clienteId)) return erro_("Acesso negado.");
    const items = SGO_DATA.getManyByField(S.CAD_UNIDADES, "CLIENTE_ID", clienteId).filter(function(u) {
      return ativo_(u.STATUS);
    });
    return { success: true, items: items };
  }

  function listarEquipamentos(sessionId, clienteId, unidadeId) {
    const sessao = exigirSessao(sessionId);
    if (!podeVerCliente_(sessao, clienteId)) return erro_("Acesso negado.");
    let items = SGO_DATA.getManyByField(S.CAD_EQUIPAMENTOS, "CLIENTE_ID", clienteId);
    if (unidadeId) items = items.filter(function(e) { return safe_(e.UNIDADE_ID) === safe_(unidadeId); });
    return { success: true, items: items.filter(function(e) { return ativo_(e.STATUS); }) };
  }

  function criarEntrada(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    setup();
    payload = payload || {};
    const perm = exigirAst_(sessao, "GERENCIAR_ENTRADAS");
    if (!perm.success) return perm;
    const acessorios = Array.isArray(payload.ACESSORIOS) ? payload.ACESSORIOS : [];
    const provis = simNao_(payload.CADASTRO_PROVISORIO) === "S";
    if (simNao_(payload.ACESSORIOS_CONFERIDOS) !== "S") return erro_("Confirme a conferencia dos acessorios.");
    if (!acessorios.length) return erro_("Registre ao menos um item de acessorio, mesmo que seja 'sem acessorios'.");
    if (!provis && (!payload.CLIENTE_ID || !payload.UNIDADE_ID || !payload.EQUIPAMENTO_ID)) return erro_("Selecione cliente, unidade e equipamento ou marque cadastro provisorio.");
    if (provis && (!payload.CLIENTE_PROVISORIO || !payload.UNIDADE_PROVISORIA || !payload.EQUIPAMENTO_PROVISORIO)) return erro_("Cadastro provisorio exige cliente, unidade e equipamento provisorios.");
    if (!payload.CONDICAO_FISICA || !payload.PROBLEMA_RELATADO) return erro_("Informe condicao fisica e problema relatado.");

    const tecnico = payload.TECNICO_ID ? SGO_DATA.getById(S.CAD_TECNICOS, payload.TECNICO_ID) : null;
    const protocolo = gerarProtocolo_();
    const token = gerarTokenEntradaUnico_();
    const urlPublica = montarUrlPublica_(token);
    const qrUrl = QR_API + encodeURIComponent(urlPublica);
    const status = STATUS.ENTRADA;
    const entrada = SGO_DATA.insert(S.AST_ENTRADAS, SGO_DATA.gerarRegistroBase({
      PROTOCOLO: protocolo,
      CLIENTE_ID: safe_(payload.CLIENTE_ID),
      UNIDADE_ID: safe_(payload.UNIDADE_ID),
      EQUIPAMENTO_ID: safe_(payload.EQUIPAMENTO_ID),
      CADASTRO_PROVISORIO: provis ? "S" : "N",
      CLIENTE_PROVISORIO: safe_(payload.CLIENTE_PROVISORIO),
      UNIDADE_PROVISORIA: safe_(payload.UNIDADE_PROVISORIA),
      EQUIPAMENTO_PROVISORIO: safe_(payload.EQUIPAMENTO_PROVISORIO),
      NUMERO_SERIE_INFORMADO: safe_(payload.NUMERO_SERIE_INFORMADO),
      CONDICAO_FISICA: safe_(payload.CONDICAO_FISICA),
      PROBLEMA_RELATADO: safe_(payload.PROBLEMA_RELATADO),
      PRIORIDADE: upper_(payload.PRIORIDADE || "NORMAL"),
      PRAZO_PROMETIDO: safe_(payload.PRAZO_PROMETIDO),
      TECNICO_ID: safe_(payload.TECNICO_ID),
      TECNICO_NOME: tecnico ? nomePessoa_(tecnico) : safe_(payload.TECNICO_NOME),
      STATUS: status,
      BANDEIRA: bandeira_(status, payload.PRIORIDADE),
      LOCALIZACAO_ATUAL: localizacaoPorStatus_(status),
      QR_TOKEN: token,
      QR_URL: qrUrl,
      URL_PUBLICA: urlPublica,
      ACESSORIOS_CONFERIDOS: "S",
      ULTIMA_MOVIMENTACAO_EM: now_(),
      PROXIMA_ACAO: "Realizar triagem tecnica",
      CRIADO_POR: sessao.usuario
    }));

    acessorios.forEach(function(a) {
      SGO_DATA.insert(S.AST_ACESSORIOS, SGO_DATA.gerarRegistroBase({
        ENTRADA_ID: entrada.ID,
        DESCRICAO: safe_(a.DESCRICAO || a.descricao || "Sem acessorios"),
        QUANTIDADE: safe_(a.QUANTIDADE || a.quantidade || "1"),
        ESTADO: safe_(a.ESTADO || a.estado || "Conferido"),
        FOTO_LINK: safe_(a.FOTO_LINK || a.fotoLink),
        FILE_ID: safe_(a.FILE_ID || a.fileId),
        OBSERVACAO: safe_(a.OBSERVACAO || a.observacao),
        CONFERIDO: "S",
        CRIADO_POR: sessao.usuario
      }));
    });

    registrarMov_(sessao, entrada.ID, "ENTRADA", "", status, "", entrada.TECNICO_ID, localizacaoPorStatus_(status), "Entrada de equipamento registrada.", "", "Realizar triagem tecnica");
    const doc = gerarDocumentoEntrada_(sessao, entrada.ID);
    if (doc && doc.success) {
      SGO_DATA.update(S.AST_ENTRADAS, entrada.ID, {
        DOCUMENTO_ENTRADA_ID: doc.documentoId,
        DOCUMENTO_ENTRADA_LINK: doc.pdfUrl,
        DOCUMENTO_ENTRADA_DOWNLOAD: doc.downloadUrl,
        ETIQUETA_HTML: gerarEtiquetaHtml_(entrada.ID, "MEDIA"),
        ATUALIZADO_POR: sessao.usuario,
        ATUALIZADO_EM: now_()
      });
    }
    criarAlerta_(entrada.ID, "TRIAGEM_PENDENTE", "AMARELO", "Entrada registrada e aguardando triagem tecnica.");
    log_("AST_ENTRADA_CRIAR", sessao.usuario, "Entrada " + protocolo + " criada.");
    return { success: true, message: "Entrada registrada.", id: entrada.ID, protocolo: protocolo, qrUrl: qrUrl, documento: doc };
  }

  function listarEntradas(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    filtros = filtros || {};
    let items = SGO_DATA.getAll(S.AST_ENTRADAS).map(enriquecerEntrada_);
    if (perfilAst_(sessao) === "CLIENTE") items = items.filter(function(e) { return safe_(e.CLIENTE_ID) === safe_(sessao.clienteId); });
    if (filtros.STATUS) items = items.filter(function(e) { return statusNormalizado_(e.STATUS) === statusNormalizado_(filtros.STATUS) || upper_(e.STATUS) === upper_(filtros.STATUS); });
    if (filtros.CLIENTE_ID) items = items.filter(function(e) { return safe_(e.CLIENTE_ID) === safe_(filtros.CLIENTE_ID); });
    if (filtros.UNIDADE_ID) items = items.filter(function(e) { return safe_(e.UNIDADE_ID) === safe_(filtros.UNIDADE_ID); });
    const texto = safe_(filtros.TEXTO || filtros.q).toLowerCase();
    if (texto) {
      items = items.filter(function(e) {
        return [e.PROTOCOLO, e.CLIENTE_NOME, e.UNIDADE_NOME, e.EQUIPAMENTO_NOME, e.PROBLEMA_RELATADO, e.TECNICO_NOME, e.STATUS].join(" ").toLowerCase().indexOf(texto) >= 0;
      });
    }
    items.sort(function(a, b) { return safe_(b.CRIADO_EM).localeCompare(safe_(a.CRIADO_EM)); });
    return { success: true, items: items, total: items.length };
  }

  function obterEntrada(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, id);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "INTERNO", entrada);
    if (!perm.success) return perm;
    return obterEntradaCompleta_(entrada);
  }

  function salvarDiagnostico(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    if (!payload.DEFEITO_CONFIRMADO || !payload.CAUSA_PROVAVEL || !payload.RECOMENDACAO_TECNICA) return erro_("Diagnostico exige defeito confirmado, causa provavel e recomendacao tecnica.");
    const tecnico = payload.TECNICO_ID ? SGO_DATA.getById(S.CAD_TECNICOS, payload.TECNICO_ID) : null;
    const dados = {
      ENTRADA_ID: entradaId,
      TECNICO_ID: safe_(payload.TECNICO_ID || entrada.TECNICO_ID),
      TECNICO_NOME: tecnico ? nomePessoa_(tecnico) : safe_(payload.TECNICO_NOME || entrada.TECNICO_NOME),
      DATA_DIAGNOSTICO: safe_(payload.DATA_DIAGNOSTICO || dataHoje_()),
      DEFEITO_RELATADO_CLIENTE: safe_(payload.DEFEITO_RELATADO_CLIENTE || entrada.PROBLEMA_RELATADO),
      DEFEITO_CONFIRMADO: safe_(payload.DEFEITO_CONFIRMADO),
      DEFEITO_INTERMITENTE: simNao_(payload.DEFEITO_INTERMITENTE),
      EQUIPAMENTO_LIGA: safe_(payload.EQUIPAMENTO_LIGA),
      INSPECAO_VISUAL_OK: safe_(payload.INSPECAO_VISUAL_OK),
      TESTE_ELETRICO_BASICO: safe_(payload.TESTE_ELETRICO_BASICO),
      NECESSITA_LIMPEZA: simNao_(payload.NECESSITA_LIMPEZA),
      NECESSITA_PECA: simNao_(payload.NECESSITA_PECA),
      NECESSITA_TERCEIRO: simNao_(payload.NECESSITA_TERCEIRO),
      RISCO_USO: upper_(payload.RISCO_USO || "BAIXO"),
      TESTES_REALIZADOS: safe_(payload.TESTES_REALIZADOS),
      EVIDENCIAS_ENCONTRADAS: safe_(payload.EVIDENCIAS_ENCONTRADAS),
      CAUSA_PROVAVEL: safe_(payload.CAUSA_PROVAVEL),
      RECOMENDACAO_TECNICA: safe_(payload.RECOMENDACAO_TECNICA),
      CONCLUSAO_PRELIMINAR: safe_(payload.CONCLUSAO_PRELIMINAR),
      STATUS_APOS_DIAGNOSTICO: statusAposDiagnostico_(payload),
      STATUS: "VALIDO",
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: now_()
    };
    const existente = diagnosticoAtual_(entradaId);
    let diag;
    if (existente) {
      SGO_DATA.update(S.AST_DIAGNOSTICOS, existente.ID, dados);
      diag = Object.assign({}, existente, dados);
    } else {
      diag = SGO_DATA.insert(S.AST_DIAGNOSTICOS, SGO_DATA.gerarRegistroBase(Object.assign({}, dados, { CRIADO_POR: sessao.usuario })));
    }
    if (dados.NECESSITA_PECA === "S" && (payload.NOME_PECA || payload.DESCRICAO_PECA)) salvarPeca_(sessao, entradaId, diag.ID, payload);
    const novoStatus = dados.STATUS_APOS_DIAGNOSTICO;
    atualizarEntradaStatus_(sessao, entrada, novoStatus, "Diagnostico tecnico registrado.", proximaAcaoPorStatus_(novoStatus));
    registrarMov_(sessao, entradaId, "DIAGNOSTICO", entrada.STATUS, novoStatus, entrada.TECNICO_ID, dados.TECNICO_ID, localizacaoPorStatus_(novoStatus), "Diagnostico tecnico registrado.", "", proximaAcaoPorStatus_(novoStatus));
    if (dados.RISCO_USO === "CRITICO") criarAlerta_(entradaId, "RISCO_CRITICO", "VERMELHO", "Diagnostico classificou risco de uso como critico.");
    return { success: true, message: "Diagnostico tecnico salvo.", id: diag.ID, status: novoStatus };
  }

  function salvarPeca(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "PECAS", entrada);
    if (!perm.success) return perm;
    const item = salvarPeca_(sessao, entradaId, safe_(payload && payload.DIAGNOSTICO_ID), payload || {});
    atualizarEntradaStatus_(sessao, entrada, STATUS.AGUARDANDO_PECAS, "Peca solicitada.", "Acompanhar compras/cotacao de peca");
    registrarMov_(sessao, entradaId, "PECA_SOLICITADA", entrada.STATUS, STATUS.AGUARDANDO_PECAS, entrada.TECNICO_ID, entrada.TECNICO_ID, localizacaoPorStatus_(STATUS.AGUARDANDO_PECAS), "Peca solicitada.", "", "Acompanhar compras/cotacao de peca");
    criarAlerta_(entradaId, "PECA_PENDENTE", "AMARELO", "Peca pendente para continuidade do reparo.");
    return { success: true, message: "Peca solicitada.", item: item };
  }

  function atualizarPeca(sessionId, pecaId, payload) {
    const sessao = exigirSessao(sessionId);
    const peca = SGO_DATA.getById(S.AST_PECAS, pecaId);
    if (!peca) return erro_("Peca nao encontrada.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, peca.ENTRADA_ID);
    const perm = exigirAst_(sessao, "PECAS", entrada || {});
    if (!perm.success) return perm;
    const st = upper_(payload && payload.STATUS || peca.STATUS);
    const dados = { STATUS: st, OBSERVACAO: safe_(payload && payload.OBSERVACAO || peca.OBSERVACAO), ATUALIZADO_POR: sessao.usuario, ATUALIZADO_EM: now_() };
    if (st === STATUS.PECA_COMPRADA) dados.COMPRADA_EM = now_();
    if (st === STATUS.PECA_RECEBIDA) dados.RECEBIDA_EM = now_();
    if (st === STATUS.PECA_INSTALADA) dados.INSTALADA_EM = now_();
    SGO_DATA.update(S.AST_PECAS, pecaId, dados);
    if (entrada) {
      const novoStatus = st === STATUS.PECA_INSTALADA ? STATUS.MANUTENCAO : STATUS.AGUARDANDO_PECAS;
      atualizarEntradaStatus_(sessao, entrada, novoStatus, "Status da peca atualizado para " + st + ".", proximaAcaoPorStatus_(novoStatus));
      registrarMov_(sessao, entrada.ID, "PECA_ATUALIZADA", entrada.STATUS, novoStatus, entrada.TECNICO_ID, entrada.TECNICO_ID, localizacaoPorStatus_(novoStatus), "Status da peca atualizado para " + st + ".", "", proximaAcaoPorStatus_(novoStatus));
    }
    return { success: true, message: "Peca atualizada." };
  }

  function registrarTesteBancada(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    if (!payload.TIPO_TESTE || !payload.PROCEDIMENTO_REALIZADO || !payload.RESULTADO) return erro_("Teste exige tipo, procedimento realizado e resultado.");
    const tecnico = payload.TECNICO_ID ? SGO_DATA.getById(S.CAD_TECNICOS, payload.TECNICO_ID) : null;
    const item = SGO_DATA.insert(S.AST_TESTES_BANCADA, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TECNICO_ID: safe_(payload.TECNICO_ID || entrada.TECNICO_ID),
      TECNICO_NOME: tecnico ? nomePessoa_(tecnico) : safe_(payload.TECNICO_NOME || entrada.TECNICO_NOME),
      DATA_TESTE: safe_(payload.DATA_TESTE || dataHoje_()),
      TIPO_TESTE: safe_(payload.TIPO_TESTE),
      CONDICAO_INICIAL: safe_(payload.CONDICAO_INICIAL),
      PROCEDIMENTO_REALIZADO: safe_(payload.PROCEDIMENTO_REALIZADO),
      RESULTADO: upper_(payload.RESULTADO),
      PARAMETROS_OBSERVADOS: safe_(payload.PARAMETROS_OBSERVADOS),
      EVIDENCIAS: safe_(payload.EVIDENCIAS),
      OBSERVACOES: safe_(payload.OBSERVACOES),
      PROXIMA_ACAO: safe_(payload.PROXIMA_ACAO || "Concluir tecnica ou retornar para manutencao"),
      CRIADO_POR: sessao.usuario
    }));
    const resultado = upper_(payload.RESULTADO);
    const novoStatus = resultado === "REPROVADO" || resultado === "TESTE_INCONCLUSIVO" ? STATUS.MANUTENCAO : STATUS.CONCLUSAO_TECNICA;
    atualizarEntradaStatus_(sessao, entrada, novoStatus, "Teste/validacao registrado: " + resultado + ".", proximaAcaoPorStatus_(novoStatus));
    registrarMov_(sessao, entradaId, "TESTE_VALIDACAO", entrada.STATUS, novoStatus, entrada.TECNICO_ID, item.TECNICO_ID, localizacaoPorStatus_(novoStatus), "Teste/validacao registrado: " + resultado + ".", "", proximaAcaoPorStatus_(novoStatus));
    if (resultado === "REPROVADO") criarAlerta_(entradaId, "TESTE_REPROVADO", "VERMELHO", "Teste de validacao reprovado.");
    return { success: true, message: "Teste de bancada registrado.", item: item, status: novoStatus };
  }

  function registrarExecucao(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    if (!payload.SERVICO_REALIZADO || !payload.RESULTADO_FINAL) return erro_("Execucao exige servico realizado e resultado final.");
    const item = criarExecucao_(sessao, entrada, payload, STATUS.TESTE_VALIDACAO);
    atualizarEntradaStatus_(sessao, entrada, STATUS.TESTE_VALIDACAO, "Execucao/manutencao registrada.", "Realizar teste/validacao");
    registrarMov_(sessao, entradaId, "EXECUCAO_MANUTENCAO", entrada.STATUS, STATUS.TESTE_VALIDACAO, entrada.TECNICO_ID, item.TECNICO_ID, localizacaoPorStatus_(STATUS.TESTE_VALIDACAO), "Execucao/manutencao registrada.", "", "Realizar teste/validacao");
    return { success: true, message: "Execucao registrada.", item: item };
  }

  function concluirTecnica(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    if (!diagnosticoAtual_(entradaId)) return erro_("Nao e permitido concluir sem diagnostico.");
    if (pecasPendentes_(entradaId).length) return erro_("Nao e permitido concluir com peca pendente.");
    if (emTerceiro_(entrada)) return erro_("Nao e permitido concluir enquanto aguarda terceiro.");
    if (simNao_(payload.TESTE_OBRIGATORIO) === "S" && !testeAprovado_(entradaId)) return erro_("Teste de bancada obrigatorio pendente ou nao aprovado.");
    if (!payload.CONCLUSAO_TECNICA || !payload.RESULTADO_FINAL) return erro_("Informe conclusao tecnica e resultado final.");
    const statusFinal = statusNormalizado_(payload.STATUS_FINAL || STATUS.PRONTO_ENTREGA);
    const exec = criarExecucao_(sessao, entrada, Object.assign({}, payload, { STATUS_FINAL: statusFinal }), statusFinal);
    atualizarEntradaStatus_(sessao, entrada, statusFinal, "Conclusao tecnica registrada.", proximaAcaoPorStatus_(statusFinal));
    registrarMov_(sessao, entradaId, "CONCLUSAO_TECNICA", entrada.STATUS, statusFinal, entrada.TECNICO_ID, exec.TECNICO_ID, localizacaoPorStatus_(statusFinal), "Conclusao tecnica registrada.", "", proximaAcaoPorStatus_(statusFinal));
    criarAlerta_(entradaId, "PRONTO_ENTREGA", "VERDE", "Equipamento pronto para retirada/entrega.");
    return { success: true, message: "Conclusao tecnica registrada.", execucao: exec, status: statusFinal };
  }

  function adicionarEvidencia(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    payload = payload || {};
    const link = safe_(payload.LINK_DRIVE || payload.URL || payload.LINK_ARQUIVO);
    const fileId = safe_(payload.FILE_ID);
    if (!link && !fileId) return erro_("Informe URL/anexo ou File ID da evidencia.");
    const item = SGO_DATA.insert(S.AST_FOTOS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TERCEIRO_ID: safe_(payload.TERCEIRO_ID),
      ETAPA: safe_(payload.ETAPA || "TECNICA"),
      TIPO_FOTO: safe_(payload.TIPO_FOTO || payload.TIPO_EVIDENCIA || "EVIDENCIA_TECNICA"),
      NOME_ARQUIVO: safe_(payload.NOME_ARQUIVO || "Evidencia tecnica"),
      LINK_DRIVE: link,
      FILE_ID: fileId,
      MIME_TYPE: safe_(payload.MIME_TYPE),
      OBSERVACAO: safe_(payload.OBSERVACAO),
      VISIBILIDADE_PUBLICA: simNao_(payload.VISIBILIDADE_PUBLICA || "S"),
      STATUS: "ATIVO",
      UPLOAD_POR: sessao.usuario,
      UPLOAD_EM: now_()
    }));
    registrarMov_(sessao, entradaId, "EVIDENCIA_TECNICA", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Evidencia tecnica adicionada.", "", entrada.PROXIMA_ACAO);
    return { success: true, message: "Evidencia registrada.", item: item };
  }

  function registrarEnvioTerceiro(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "TERCEIROS", entrada);
    if (!perm.success) return perm;
    if (simNao_(payload.ACESSORIOS_CONFIRMADOS) !== "S") return erro_("Confirme formalmente os acessorios enviados ao terceiro.");
    const acessorios = Array.isArray(payload.ACESSORIOS) ? payload.ACESSORIOS : [];
    if (simNao_(payload.SEM_ACESSORIOS) !== "S" && !acessorios.length) return erro_("Registre os acessorios enviados ou marque que nao ha acessorios.");
    if (!payload.MOTIVO_ENVIO || !payload.EMPRESA_NOME) return erro_("Informe empresa terceira e motivo do envio.");
    const fornecedor = payload.FORNECEDOR_ID ? obterFornecedorSeguro_(payload.FORNECEDOR_ID) : null;
    const stFornecedor = statusFornecedorTerceiro_(payload, fornecedor);
    if (["BLOQUEADO", "REPROVADO"].indexOf(stFornecedor) >= 0 && !liberacaoGestor_(sessao, payload.LIBERACAO_GESTOR)) return erro_("Empresa bloqueada/reprovada exige liberacao de gestor.");
    const terceiro = SGO_DATA.insert(S.AST_TERCEIROS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      CLIENTE_ID: entrada.CLIENTE_ID,
      UNIDADE_ID: entrada.UNIDADE_ID,
      EQUIPAMENTO_ID: entrada.EQUIPAMENTO_ID,
      FORNECEDOR_ID: safe_(payload.FORNECEDOR_ID),
      EMPRESA_NOME: safe_(payload.EMPRESA_NOME),
      EMPRESA_CNPJ: safe_(payload.EMPRESA_CNPJ || (fornecedor && fornecedor.CNPJ)),
      TIPO_EMPRESA: safe_(payload.TIPO_EMPRESA || "ASSISTENCIA_TECNICA"),
      RESPONSAVEL_EMPRESA: safe_(payload.RESPONSAVEL_EMPRESA || (fornecedor && fornecedor.CONTATO)),
      TELEFONE_WHATSAPP: safe_(payload.TELEFONE_WHATSAPP || (fornecedor && fornecedor.TELEFONE)),
      EMAIL: safe_(payload.EMAIL || (fornecedor && fornecedor.EMAIL)),
      CIDADE_UF: safe_(payload.CIDADE_UF),
      ESPECIALIDADE: safe_(payload.ESPECIALIDADE),
      STATUS_FORNECEDOR: stFornecedor,
      MOTIVO_ENVIO: safe_(payload.MOTIVO_ENVIO),
      FORMA_ENVIO: safe_(payload.FORMA_ENVIO),
      CODIGO_RASTREIO: safe_(payload.CODIGO_RASTREIO),
      PRAZO_PROMETIDO: safe_(payload.PRAZO_PROMETIDO),
      VALOR_ESTIMADO: safe_(payload.VALOR_ESTIMADO),
      CLIENTE_INFORMADO: simNao_(payload.CLIENTE_INFORMADO),
      NECESSITA_APROVACAO_CLIENTE: simNao_(payload.NECESSITA_APROVACAO_CLIENTE),
      OBSERVACOES: safe_(payload.OBSERVACOES),
      STATUS_TERCEIRO: "TERCEIRO_ENVIADO",
      PRAZO_INFORMADO: safe_(payload.PRAZO_INFORMADO || payload.PRAZO_PROMETIDO),
      PROXIMA_ACAO: safe_(payload.PROXIMA_ACAO || "Acompanhar retorno do terceiro"),
      ACESSORIOS_CONFIRMADOS: "S",
      SEM_ACESSORIOS: simNao_(payload.SEM_ACESSORIOS),
      LIBERACAO_GESTOR: safe_(payload.LIBERACAO_GESTOR),
      ENVIADO_POR: sessao.usuario,
      ENVIADO_EM: now_(),
      CRIADO_POR: sessao.usuario
    }));
    acessorios.forEach(function(a) { salvarAcessorioTerceiro_(sessao, terceiro.ID, entradaId, a); });
    atualizarEntradaStatus_(sessao, entrada, STATUS.ENVIADO_PARA_TERCEIRO, "Equipamento enviado para assistencia terceirizada.", terceiro.PROXIMA_ACAO);
    registrarMov_(sessao, entradaId, "ENVIO_TERCEIRO", entrada.STATUS, STATUS.ENVIADO_PARA_TERCEIRO, entrada.TECNICO_ID, entrada.TECNICO_ID, localizacaoPorStatus_(STATUS.ENVIADO_PARA_TERCEIRO), "Equipamento enviado para terceiro: " + terceiro.EMPRESA_NOME, terceiro.MOTIVO_ENVIO, terceiro.PROXIMA_ACAO);
    return { success: true, message: "Envio para terceiro registrado.", item: terceiro };
  }

  function salvarAcessorioTerceiro(sessionId, terceiroId, payload) {
    const sessao = exigirSessao(sessionId);
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return erro_("Registro de terceiro nao encontrado.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    const perm = exigirAst_(sessao, "TERCEIROS", entrada || {});
    if (!perm.success) return perm;
    const item = salvarAcessorioTerceiro_(sessao, terceiroId, terceiro.ENTRADA_ID, payload || {});
    registrarMovTerceiro_(sessao, terceiro, "TERCEIRO_ACESSORIO", "Acessorio enviado ao terceiro registrado.");
    return { success: true, message: "Acessorio de terceiro registrado.", item: item };
  }

  function anexarDocumentoTerceiro(sessionId, terceiroId, payload) {
    const sessao = exigirSessao(sessionId);
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return erro_("Registro de terceiro nao encontrado.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    const perm = exigirAst_(sessao, "TERCEIROS", entrada || {});
    if (!perm.success) return perm;
    const item = SGO_DATA.insert(S.AST_TERCEIROS_ANEXOS, SGO_DATA.gerarRegistroBase({
      TERCEIRO_ID: terceiroId,
      ENTRADA_ID: terceiro.ENTRADA_ID,
      TIPO_ANEXO: safe_(payload && payload.TIPO_ANEXO || "DOCUMENTO_TERCEIRO"),
      NOME_ARQUIVO: safe_(payload && payload.NOME_ARQUIVO || "Documento terceiro"),
      FILE_ID: safe_(payload && payload.FILE_ID),
      LINK_ARQUIVO: safe_(payload && (payload.LINK_ARQUIVO || payload.URL)),
      OBSERVACAO: safe_(payload && payload.OBSERVACAO),
      CRIADO_POR: sessao.usuario
    }));
    registrarMovTerceiro_(sessao, terceiro, "TERCEIRO_ANEXO", "Anexo externo registrado.");
    return { success: true, message: "Anexo de terceiro registrado.", item: item };
  }

  function registrarAcompanhamentoTerceiro(sessionId, terceiroId, payload) {
    const sessao = exigirSessao(sessionId);
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return erro_("Registro de terceiro nao encontrado.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    const perm = exigirAst_(sessao, "TERCEIROS", entrada || {});
    if (!perm.success) return perm;
    payload = payload || {};
    const statusTer = upper_(payload.STATUS_INFORMADO || terceiro.STATUS_TERCEIRO || "TERCEIRO_ENVIADO");
    const item = SGO_DATA.insert(S.AST_TERCEIROS_ACOMPANHAMENTOS, SGO_DATA.gerarRegistroBase({
      TERCEIRO_ID: terceiroId,
      ENTRADA_ID: terceiro.ENTRADA_ID,
      CANAL: upper_(payload.CANAL || "WHATSAPP"),
      STATUS_INFORMADO: statusTer,
      PRAZO_INFORMADO: safe_(payload.PRAZO_INFORMADO),
      PROXIMA_ACAO: safe_(payload.PROXIMA_ACAO || terceiro.PROXIMA_ACAO),
      INFORMACAO_RECEBIDA: safe_(payload.INFORMACAO_RECEBIDA),
      ANEXO_LINK: safe_(payload.ANEXO_LINK),
      CRIADO_POR: sessao.usuario
    }));
    SGO_DATA.update(S.AST_TERCEIROS, terceiroId, {
      STATUS_TERCEIRO: statusTer,
      PRAZO_INFORMADO: item.PRAZO_INFORMADO || terceiro.PRAZO_INFORMADO,
      PROXIMA_ACAO: item.PROXIMA_ACAO,
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: now_()
    });
    const novoStatus = statusEntradaPorTerceiro_(statusTer);
    if (entrada) atualizarEntradaStatus_(sessao, entrada, novoStatus, "Acompanhamento de terceiro registrado.", item.PROXIMA_ACAO);
    registrarMovTerceiro_(sessao, Object.assign({}, terceiro, { STATUS_TERCEIRO: statusTer }), "ACOMPANHAMENTO_TERCEIRO", "Acompanhamento de terceiro registrado.");
    return { success: true, message: "Acompanhamento registrado.", item: item };
  }

  function registrarRetornoTerceiro(sessionId, terceiroId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return erro_("Registro de terceiro nao encontrado.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "TERCEIROS", entrada);
    if (!perm.success) return perm;
    if (!payload.CONDICAO_RETORNO || !payload.CONCLUSAO_RETORNO) return erro_("Informe condicao e conclusao do retorno.");
    SGO_DATA.update(S.AST_TERCEIROS, terceiroId, {
      STATUS_TERCEIRO: STATUS.TERCEIRO_RECEBIDO_METROLABS,
      RETORNADO_EM: now_(),
      RETORNO_RECEBIDO_POR: sessao.usuario,
      CONDICAO_RETORNO: safe_(payload.CONDICAO_RETORNO),
      SERVICO_TERCEIRO: safe_(payload.SERVICO_TERCEIRO),
      PECAS_SUBSTITUIDAS_TERCEIRO: safe_(payload.PECAS_SUBSTITUIDAS_TERCEIRO),
      GARANTIA_TERCEIRO: safe_(payload.GARANTIA_TERCEIRO),
      PENDENCIAS_RETORNO: safe_(payload.PENDENCIAS_RETORNO),
      PRECISA_TESTE_INTERNO: simNao_(payload.PRECISA_TESTE_INTERNO),
      PRECISA_EXECUCAO_INTERNA: simNao_(payload.PRECISA_EXECUCAO_INTERNA),
      CONCLUSAO_RETORNO: safe_(payload.CONCLUSAO_RETORNO),
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: now_()
    });
    atualizarEntradaStatus_(sessao, entrada, STATUS.TERCEIRO_RECEBIDO_METROLABS, "Retorno de terceiro registrado.", "Realizar inspecao pos-retorno");
    registrarMov_(sessao, entrada.ID, "RETORNO_TERCEIRO", entrada.STATUS, STATUS.TERCEIRO_RECEBIDO_METROLABS, entrada.TECNICO_ID, entrada.TECNICO_ID, localizacaoPorStatus_(STATUS.TERCEIRO_RECEBIDO_METROLABS), "Equipamento recebido de terceiro.", "", "Realizar inspecao pos-retorno");
    return { success: true, message: "Retorno de terceiro registrado." };
  }

  function registrarInspecaoRetornoTerceiro(sessionId, terceiroId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return erro_("Registro de terceiro nao encontrado.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "TERCEIROS", entrada);
    if (!perm.success) return perm;
    if (!payload.INSPECAO_RESULTADO) return erro_("Informe o resultado da inspecao pos-retorno.");
    const resultado = upper_(payload.INSPECAO_RESULTADO);
    const novoStatus = resultado === "REPROVADO" ? STATUS.MANUTENCAO : (resultado === "INCONCLUSIVO" ? STATUS.TERCEIRO_INSPECAO_RETORNO : STATUS.TESTE_VALIDACAO);
    SGO_DATA.update(S.AST_TERCEIROS, terceiroId, {
      INSPECAO_TECNICO: safe_(payload.INSPECAO_TECNICO || entrada.TECNICO_NOME),
      INSPECAO_CONDICAO: safe_(payload.INSPECAO_CONDICAO),
      INSPECAO_ACESSORIOS: safe_(payload.INSPECAO_ACESSORIOS),
      INSPECAO_VISUAL: safe_(payload.INSPECAO_VISUAL),
      INSPECAO_FUNCIONAL: safe_(payload.INSPECAO_FUNCIONAL),
      INSPECAO_RESULTADO: resultado,
      INSPECAO_OBSERVACOES: safe_(payload.INSPECAO_OBSERVACOES),
      INSPECAO_PROXIMA_ACAO: safe_(payload.INSPECAO_PROXIMA_ACAO || proximaAcaoPorStatus_(novoStatus)),
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: now_()
    });
    atualizarEntradaStatus_(sessao, entrada, novoStatus, "Inspecao pos-retorno registrada.", proximaAcaoPorStatus_(novoStatus));
    registrarMov_(sessao, entrada.ID, "INSPECAO_POS_RETORNO", entrada.STATUS, novoStatus, entrada.TECNICO_ID, entrada.TECNICO_ID, localizacaoPorStatus_(novoStatus), "Inspecao pos-retorno registrada: " + resultado, "", proximaAcaoPorStatus_(novoStatus));
    return { success: true, message: "Inspecao pos-retorno registrada.", status: novoStatus };
  }

  function registrarEntradaLaboratorio(sessionId, entradaId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "LABORATORIO", entrada);
    if (!perm.success) return perm;
    if (!payload.TIPO_SERVICO || !payload.PROCEDIMENTO || !payload.CRITERIO_ACEITACAO) return erro_("Informe tipo de servico, procedimento e criterio de aceitacao.");
    const responsavel = payload.RESPONSAVEL_ID ? SGO_DATA.getById(S.CAD_TECNICOS, payload.RESPONSAVEL_ID) : null;
    const existente = labAtual_(entradaId);
    const dados = {
      ENTRADA_ID: entradaId,
      CLIENTE_ID: entrada.CLIENTE_ID,
      UNIDADE_ID: entrada.UNIDADE_ID,
      EQUIPAMENTO_ID: entrada.EQUIPAMENTO_ID,
      TIPO_SERVICO: safe_(payload.TIPO_SERVICO),
      AREA_RESPONSAVEL: safe_(payload.AREA_RESPONSAVEL || "LABORATORIO_INTERNO"),
      PROCEDIMENTO: safe_(payload.PROCEDIMENTO),
      NORMA: safe_(payload.NORMA),
      CRITERIO_ACEITACAO: safe_(payload.CRITERIO_ACEITACAO),
      PRIORIDADE: upper_(payload.PRIORIDADE || entrada.PRIORIDADE || "NORMAL"),
      PRAZO_PROMETIDO: safe_(payload.PRAZO_PROMETIDO),
      RESPONSAVEL_ID: safe_(payload.RESPONSAVEL_ID || entrada.TECNICO_ID),
      RESPONSAVEL_NOME: responsavel ? nomePessoa_(responsavel) : safe_(payload.RESPONSAVEL_NOME || entrada.TECNICO_NOME),
      OBSERVACOES: safe_(payload.OBSERVACOES),
      STATUS: STATUS.LABORATORIO,
      ENTRADA_EM: now_(),
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: now_()
    };
    let lab;
    if (existente) {
      SGO_DATA.update(S.AST_LAB_ENTRADAS, existente.ID, dados);
      lab = Object.assign({}, existente, dados);
    } else {
      lab = SGO_DATA.insert(S.AST_LAB_ENTRADAS, SGO_DATA.gerarRegistroBase(Object.assign({}, dados, { CRIADO_POR: sessao.usuario })));
    }
    atualizarEntradaStatus_(sessao, entrada, STATUS.LABORATORIO, "Entrada em laboratorio registrada.", "Aguardar ensaio laboratorial");
    registrarMov_(sessao, entradaId, "LABORATORIO", entrada.STATUS, STATUS.LABORATORIO, entrada.TECNICO_ID, dados.RESPONSAVEL_ID, localizacaoPorStatus_(STATUS.LABORATORIO), "Entrada em laboratorio registrada.", "", "Aguardar ensaio laboratorial");
    return { success: true, message: "Entrada de laboratorio registrada.", item: lab };
  }

  function adicionarPadraoLaboratorio(sessionId, labId, payload) {
    const sessao = exigirSessao(sessionId);
    const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, labId);
    if (!lab) return erro_("Entrada de laboratorio nao encontrada.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID);
    const perm = exigirAst_(sessao, "LABORATORIO", entrada || {});
    if (!perm.success) return perm;
    payload = payload || {};
    if (!payload.NOME_PADRAO) return erro_("Informe o padrao utilizado.");
    const situacao = situacaoPadrao_(payload);
    if (["VENCIDO", "BLOQUEADO"].indexOf(situacao) >= 0 && !liberacaoGestor_(sessao, payload.LIBERACAO_GESTOR)) return erro_("Liberacao de padrao vencido/bloqueado exige ADMIN ou GESTOR.");
    const item = SGO_DATA.insert(S.AST_LAB_PADROES, SGO_DATA.gerarRegistroBase({
      LAB_ENTRADA_ID: labId,
      ENTRADA_ID: lab.ENTRADA_ID,
      NOME_PADRAO: safe_(payload.NOME_PADRAO),
      CODIGO_INTERNO: safe_(payload.CODIGO_INTERNO),
      NUMERO_SERIE: safe_(payload.NUMERO_SERIE),
      CERTIFICADO_PADRAO: safe_(payload.CERTIFICADO_PADRAO),
      VALIDADE_CERTIFICADO: safe_(payload.VALIDADE_CERTIFICADO),
      INCERTEZA: safe_(payload.INCERTEZA),
      RASTREABILIDADE: safe_(payload.RASTREABILIDADE),
      SITUACAO: situacao,
      OBSERVACAO: safe_(payload.OBSERVACAO),
      LIBERACAO_GESTOR: safe_(payload.LIBERACAO_GESTOR),
      FILE_ID: safe_(payload.FILE_ID),
      LINK_CERTIFICADO: safe_(payload.LINK_CERTIFICADO),
      CRIADO_POR: sessao.usuario
    }));
    if (entrada) registrarMov_(sessao, entrada.ID, "LAB_PADRAO", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, lab.RESPONSAVEL_ID, localizacaoPorStatus_(entrada.STATUS), "Padrao laboratorial registrado.", "", entrada.PROXIMA_ACAO);
    return { success: true, message: "Padrao laboratorial registrado.", item: item };
  }

  function registrarEnsaioLaboratorio(sessionId, labId, payload) {
    const sessao = exigirSessao(sessionId);
    const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, labId);
    if (!lab) return erro_("Entrada de laboratorio nao encontrada.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID);
    const perm = exigirAst_(sessao, "LABORATORIO", entrada || {});
    if (!perm.success) return perm;
    payload = payload || {};
    if (!payload.TIPO_ENSAIO || !payload.PROCEDIMENTO_EXECUTADO) return erro_("Informe tipo de ensaio e procedimento executado.");
    const item = SGO_DATA.insert(S.AST_LAB_ENSAIOS, SGO_DATA.gerarRegistroBase({
      LAB_ENTRADA_ID: labId,
      ENTRADA_ID: lab.ENTRADA_ID,
      TIPO_ENSAIO: safe_(payload.TIPO_ENSAIO),
      INICIO_EM: safe_(payload.INICIO_EM || now_()),
      FIM_EM: safe_(payload.FIM_EM),
      TECNICO_ID: safe_(payload.TECNICO_ID || lab.RESPONSAVEL_ID),
      TECNICO_NOME: safe_(payload.TECNICO_NOME || lab.RESPONSAVEL_NOME),
      TEMPERATURA: safe_(payload.TEMPERATURA),
      UMIDADE: safe_(payload.UMIDADE),
      PRESSAO: safe_(payload.PRESSAO),
      OBS_AMBIENTAIS: safe_(payload.OBS_AMBIENTAIS),
      PROCEDIMENTO_EXECUTADO: safe_(payload.PROCEDIMENTO_EXECUTADO),
      PONTOS_AVALIADOS: safe_(payload.PONTOS_AVALIADOS),
      RESULTADO_BRUTO: safe_(payload.RESULTADO_BRUTO),
      RESULTADO_TRATADO: safe_(payload.RESULTADO_TRATADO),
      CRITERIO_ACEITACAO: safe_(payload.CRITERIO_ACEITACAO || lab.CRITERIO_ACEITACAO),
      DESVIO_ENCONTRADO: safe_(payload.DESVIO_ENCONTRADO),
      INCERTEZA: safe_(payload.INCERTEZA),
      CONFORMIDADE: upper_(payload.CONFORMIDADE || "EM_ANALISE"),
      OBSERVACOES: safe_(payload.OBSERVACOES),
      EVIDENCIAS: safe_(payload.EVIDENCIAS),
      CRIADO_POR: sessao.usuario
    }));
    atualizarLabStatus_(sessao, lab, STATUS.LAB_EM_ENSAIO);
    if (entrada) atualizarEntradaStatus_(sessao, entrada, STATUS.LAB_EM_ENSAIO, "Ensaio laboratorial registrado.", "Consolidar resultado laboratorial");
    if (entrada) registrarMov_(sessao, entrada.ID, "LAB_ENSAIO", entrada.STATUS, STATUS.LAB_EM_ENSAIO, entrada.TECNICO_ID, item.TECNICO_ID, localizacaoPorStatus_(STATUS.LAB_EM_ENSAIO), "Ensaio laboratorial registrado.", "", "Consolidar resultado laboratorial");
    return { success: true, message: "Ensaio laboratorial registrado.", item: item };
  }

  function anexarEvidenciaLaboratorio(sessionId, labId, payload) {
    const sessao = exigirSessao(sessionId);
    const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, labId);
    if (!lab) return erro_("Entrada de laboratorio nao encontrada.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID);
    const perm = exigirAst_(sessao, "LABORATORIO", entrada || {});
    if (!perm.success) return perm;
    payload = payload || {};
    const link = safe_(payload.LINK_ARQUIVO || payload.URL);
    if (!link && !payload.FILE_ID) return erro_("Informe link/URL ou File ID da evidencia.");
    const item = SGO_DATA.insert(S.AST_LAB_EVIDENCIAS, SGO_DATA.gerarRegistroBase({
      LAB_ENTRADA_ID: labId,
      ENTRADA_ID: lab.ENTRADA_ID,
      TIPO_EVIDENCIA: safe_(payload.TIPO_EVIDENCIA || "EVIDENCIA_LABORATORIAL"),
      NOME: safe_(payload.NOME || "Evidencia laboratorial"),
      LINK_ARQUIVO: link,
      FILE_ID: safe_(payload.FILE_ID),
      OBSERVACAO: safe_(payload.OBSERVACAO),
      CRIADO_POR: sessao.usuario
    }));
    return { success: true, message: "Evidencia laboratorial anexada.", item: item };
  }

  function consolidarResultadoLaboratorio(sessionId, labId, payload) {
    const sessao = exigirSessao(sessionId);
    const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, labId);
    if (!lab) return erro_("Entrada de laboratorio nao encontrada.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID);
    const perm = exigirAst_(sessao, "LABORATORIO", entrada || {});
    if (!perm.success) return perm;
    payload = payload || {};
    if (!payload.RESULTADO_FINAL || !payload.CONFORMIDADE) return erro_("Informe resultado final e conformidade.");
    const bloqueantes = padroesBloqueantes_(labId);
    if (bloqueantes.length && !liberacaoGestor_(sessao, payload.APROVACAO_GESTOR)) return erro_("Existe padrao vencido/bloqueado. Informe liberacao de gestor para concluir.");
    const conformidade = upper_(payload.CONFORMIDADE);
    const novoStatus = conformidade === "REPROVADO" ? STATUS.MANUTENCAO : STATUS.CONCLUSAO_TECNICA;
    const item = SGO_DATA.insert(S.AST_LAB_RESULTADOS, SGO_DATA.gerarRegistroBase({
      LAB_ENTRADA_ID: labId,
      ENTRADA_ID: lab.ENTRADA_ID,
      RESULTADO_FINAL: safe_(payload.RESULTADO_FINAL),
      CONFORMIDADE: conformidade,
      RESUMO_TECNICO: safe_(payload.RESUMO_TECNICO),
      RESTRICOES: safe_(payload.RESTRICOES),
      RECOMENDACOES: safe_(payload.RECOMENDACOES),
      NECESSITA_MANUTENCAO: simNao_(payload.NECESSITA_MANUTENCAO),
      NECESSITA_NOVA_CALIBRACAO: simNao_(payload.NECESSITA_NOVA_CALIBRACAO),
      NECESSITA_QUALIFICACAO_COMPLEMENTAR: simNao_(payload.NECESSITA_QUALIFICACAO_COMPLEMENTAR),
      VALIDADE_RESULTADO: safe_(payload.VALIDADE_RESULTADO),
      PROXIMA_CALIBRACAO_SUGERIDA: safe_(payload.PROXIMA_CALIBRACAO_SUGERIDA),
      RESPONSAVEL_ID: safe_(payload.RESPONSAVEL_ID || lab.RESPONSAVEL_ID),
      RESPONSAVEL_NOME: safe_(payload.RESPONSAVEL_NOME || lab.RESPONSAVEL_NOME),
      APROVACAO_GESTOR: safe_(payload.APROVACAO_GESTOR),
      CRIADO_POR: sessao.usuario
    }));
    SGO_DATA.update(S.AST_LAB_ENTRADAS, labId, {
      STATUS: novoStatus,
      RESULTADO_FINAL: item.RESULTADO_FINAL,
      CONFORMIDADE: item.CONFORMIDADE,
      RESUMO_TECNICO: item.RESUMO_TECNICO,
      RESTRICOES: item.RESTRICOES,
      RECOMENDACOES: item.RECOMENDACOES,
      NECESSITA_MANUTENCAO: item.NECESSITA_MANUTENCAO,
      NECESSITA_NOVA_CALIBRACAO: item.NECESSITA_NOVA_CALIBRACAO,
      NECESSITA_QUALIFICACAO_COMPLEMENTAR: item.NECESSITA_QUALIFICACAO_COMPLEMENTAR,
      VALIDADE_RESULTADO: item.VALIDADE_RESULTADO,
      PROXIMA_CALIBRACAO_SUGERIDA: item.PROXIMA_CALIBRACAO_SUGERIDA,
      APROVACAO_GESTOR: item.APROVACAO_GESTOR,
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: now_()
    });
    if (entrada) atualizarEntradaStatus_(sessao, entrada, novoStatus, "Resultado laboratorial consolidado.", proximaAcaoPorStatus_(novoStatus));
    if (entrada) registrarMov_(sessao, entrada.ID, "LAB_RESULTADO", entrada.STATUS, novoStatus, entrada.TECNICO_ID, item.RESPONSAVEL_ID, localizacaoPorStatus_(novoStatus), "Resultado laboratorial consolidado: " + conformidade, "", proximaAcaoPorStatus_(novoStatus));
    return { success: true, message: "Resultado laboratorial consolidado.", item: item, status: novoStatus };
  }

  function trocarTecnico(sessionId, entradaId, tecnicoId, motivo) {
    const sessao = exigirSessao(sessionId);
    if (!motivo) return erro_("Informe o motivo da troca de tecnico.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "GESTAO", entrada);
    if (!perm.success) return perm;
    const tecnico = tecnicoId ? SGO_DATA.getById(S.CAD_TECNICOS, tecnicoId) : null;
    SGO_DATA.update(S.AST_ENTRADAS, entradaId, {
      TECNICO_ID: safe_(tecnicoId),
      TECNICO_NOME: tecnico ? nomePessoa_(tecnico) : "",
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: now_()
    });
    registrarMov_(sessao, entradaId, "TROCA_TECNICO", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, tecnicoId, entrada.LOCALIZACAO_ATUAL, "Tecnico responsavel alterado.", motivo, entrada.PROXIMA_ACAO);
    return { success: true, message: "Tecnico alterado com historico preservado." };
  }

  function atualizarStatus(sessionId, entradaId, status, descricao, proximaAcao) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "GESTAO", entrada);
    if (!perm.success) return perm;
    const novoStatus = statusNormalizado_(status || entrada.STATUS);
    atualizarEntradaStatus_(sessao, entrada, novoStatus, descricao || "Status atualizado.", proximaAcao || proximaAcaoPorStatus_(novoStatus));
    registrarMov_(sessao, entradaId, "STATUS_MANUAL", entrada.STATUS, novoStatus, entrada.TECNICO_ID, entrada.TECNICO_ID, localizacaoPorStatus_(novoStatus), descricao || "Status atualizado.", "", proximaAcao || proximaAcaoPorStatus_(novoStatus));
    return { success: true, message: "Status atualizado." };
  }

  function uploadFotoBase64(sessionId, entradaId, payload) {
    return uploadAnexo(sessionId, Object.assign({}, payload || {}, { VINCULO: "FOTO_ENTRADA", ID_RELACIONADO: entradaId }));
  }

  function uploadAnexo(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const vinculo = upper_(payload.VINCULO || "ENTRADA");
    const idRelacionado = safe_(payload.ID_RELACIONADO || payload.ENTRADA_ID);
    if (!idRelacionado) return erro_("Informe o ID relacionado ao anexo.");
    const entradaId = entradaIdPorVinculoAnexo_(vinculo, idRelacionado);
    const entrada = entradaId ? SGO_DATA.getById(S.AST_ENTRADAS, entradaId) : null;
    if (!entrada) return erro_("Entrada relacionada nao encontrada.");
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    const base64 = limparBase64_(payload.BASE64 || payload.base64);
    if (!base64) return erro_("Dados do arquivo nao informados.");
    const nome = nomeArquivoAst_(payload.NOME_ARQUIVO || payload.nome || "anexo_ast");
    const mime = safe_(payload.MIME_TYPE || payload.mimeType || "application/octet-stream");
    const bytes = Utilities.base64Decode(base64);
    const file = pastaAst_().createFile(Utilities.newBlob(bytes, mime, nome));
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const link = file.getUrl();
    let item;
    if (vinculo.indexOf("LAB") >= 0) {
      const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, idRelacionado);
      item = SGO_DATA.insert(S.AST_LAB_EVIDENCIAS, SGO_DATA.gerarRegistroBase({
        LAB_ENTRADA_ID: lab ? lab.ID : "",
        ENTRADA_ID: entrada.ID,
        TIPO_EVIDENCIA: safe_(payload.TIPO_EVIDENCIA || payload.TIPO_FOTO || "ANEXO_LABORATORIAL"),
        NOME: nome,
        LINK_ARQUIVO: link,
        FILE_ID: file.getId(),
        OBSERVACAO: safe_(payload.OBSERVACAO),
        CRIADO_POR: sessao.usuario
      }));
    } else {
      item = SGO_DATA.insert(S.AST_FOTOS, SGO_DATA.gerarRegistroBase({
        ENTRADA_ID: entrada.ID,
        TERCEIRO_ID: vinculo.indexOf("TERCEIRO") >= 0 ? idRelacionado : "",
        ETAPA: vinculo,
        TIPO_FOTO: safe_(payload.TIPO_FOTO || payload.TIPO_EVIDENCIA || "ANEXO"),
        NOME_ARQUIVO: nome,
        LINK_DRIVE: link,
        FILE_ID: file.getId(),
        MIME_TYPE: mime,
        OBSERVACAO: safe_(payload.OBSERVACAO),
        VISIBILIDADE_PUBLICA: simNao_(payload.VISIBILIDADE_PUBLICA || "S"),
        STATUS: "ATIVO",
        UPLOAD_POR: sessao.usuario,
        UPLOAD_EM: now_()
      }));
    }
    registrarMov_(sessao, entrada.ID, "UPLOAD_ANEXO", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Anexo enviado: " + nome, "", entrada.PROXIMA_ACAO);
    return { success: true, message: "Anexo enviado.", item: item, fileId: file.getId(), linkArquivo: link, downloadUrl: downloadUrl_(file.getId()) };
  }

  function dashboard(sessionId) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    return { success: true, dashboard: dashboardInterno_(sessao) };
  }

  function obterDashboardGerencial(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "RELATORIOS");
    if (!perm.success) return perm;
    const dados = dadosGerenciais_(sessao, filtros || {});
    return {
      success: true,
      filtros: dados.filtros,
      cards: calcularIndicadoresAssistencia(dados.entradas, dados),
      status: calcularIndicadoresStatus_(dados.entradas),
      clientes: calcularIndicadoresPorCliente(dados.entradas, dados),
      tecnicos: calcularIndicadoresPorTecnico(dados.entradas),
      rotatividade: calcularIndicadoresRotatividade(dados.entradas, dados),
      gargalos: calcularIndicadoresGargalos(dados.entradas, dados),
      conformidade: calcularConformidadeDocumental(dados.entradas, dados),
      alertas: listarAlertasCriticosGerenciais(dados.entradas, dados),
      resumoExecutivo: obterResumoExecutivoAST(sessionId, filtros)
    };
  }

  function gerarRelatorioDiagnostico(sessionId, entradaId) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    return gerarRelatorioTecnico_(sessao, entradaId, "RELATORIO_DIAGNOSTICO_TECNICO");
  }

  function gerarRelatorioManutencao(sessionId, entradaId) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "TECNICO", entrada);
    if (!perm.success) return perm;
    return gerarRelatorioTecnico_(sessao, entradaId, "RELATORIO_MANUTENCAO_AST");
  }

  function gerarDocumentoEntrada(sessionId, entradaId) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "INTERNO", entrada);
    if (!perm.success) return perm;
    return gerarDocumentoEntrada_(sessao, entradaId);
  }

  function gerarEtiqueta(sessionId, entradaId, tamanho) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "INTERNO", entrada);
    if (!perm.success) return perm;
    return { success: true, html: gerarEtiquetaHtml_(entradaId, tamanho || "MEDIA") };
  }

  function gerarEtiquetaPdf(sessionId, entradaId, tamanho) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "INTERNO", entrada);
    if (!perm.success) return perm;
    return gerarEtiquetaPdf_(sessao, entradaId, tamanho || "MEDIA");
  }

  function obterResumoComercial(sessionId, entradaId) {
    const sessao = exigirSessao(sessionId);
    const dados = obterPublicoCompleto_(entradaId);
    if (!dados) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "COMERCIAL", dados.item);
    if (!perm.success) return perm;
    const e = dados.item;
    const diag = diagnosticoAtual_(entradaId) || {};
    const pecas = SGO_DATA.getManyByField(S.AST_PECAS, "ENTRADA_ID", entradaId);
    const texto = [
      "Resumo tecnico para orcamento",
      "Protocolo: " + safe_(e.PROTOCOLO),
      "Cliente: " + safe_(e.CLIENTE_NOME),
      "Equipamento: " + safe_(e.EQUIPAMENTO_NOME),
      "Problema relatado: " + safe_(e.PROBLEMA_RELATADO),
      "Diagnostico: " + safe_(diag.DEFEITO_CONFIRMADO || "--"),
      "Causa provavel: " + safe_(diag.CAUSA_PROVAVEL || "--"),
      "Recomendacao: " + safe_(diag.RECOMENDACAO_TECNICA || "--"),
      pecas.length ? ("Pecas: " + pecas.map(function(p) { return safe_(p.NOME_PECA || p.DESCRICAO) + " x" + safe_(p.QUANTIDADE || "1"); }).join("; ")) : "Pecas: sem pecas registradas",
      "Acompanhamento: " + safe_(e.URL_PUBLICA)
    ].join("\n");
    registrarMov_(sessao, entradaId, "RESUMO_ORCAMENTO", e.STATUS, e.STATUS, e.TECNICO_ID, e.TECNICO_ID, e.LOCALIZACAO_ATUAL, "Resumo tecnico para orcamento gerado.", "", e.PROXIMA_ACAO);
    return { success: true, texto: texto, url: "https://wa.me/?text=" + encodeURIComponent(texto) };
  }

  function registrarAcao(sessionId, entradaId, acao, detalhe) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "INTERNO", entrada);
    if (!perm.success) return perm;
    registrarMov_(sessao, entradaId, upper_(acao || "ACAO"), entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, safe_(detalhe || "Acao AST registrada."), "", entrada.PROXIMA_ACAO);
    log_("AST_" + upper_(acao || "ACAO"), sessao.usuario, safe_(detalhe || "Acao AST registrada.") + " entrada=" + entradaId);
    return { success: true };
  }

  function obterWhatsapp(sessionId, entradaId) {
    const sessao = exigirSessao(sessionId);
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return erro_("Entrada nao encontrada.");
    const perm = exigirAst_(sessao, "INTERNO", entrada);
    if (!perm.success) return perm;
    const texto = montarWhatsapp_(enriquecerEntrada_(entrada), SGO_DATA.getManyByField(S.AST_DOCUMENTOS, "ENTRADA_ID", entradaId));
    registrarMov_(sessao, entradaId, "WHATSAPP", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Mensagem de WhatsApp gerada.", "", entrada.PROXIMA_ACAO);
    return { success: true, texto: texto, url: "https://wa.me/?text=" + encodeURIComponent(texto) };
  }

  function consultarPublico(token) {
    const busca = safe_(token);
    const entrada = SGO_DATA.getByField(S.AST_ENTRADAS, "QR_TOKEN", busca) || SGO_DATA.getById(S.AST_ENTRADAS, busca);
    if (!entrada) return erro_("Entrada nao localizada.");
    const id = entrada.ID;
    return {
      success: true,
      item: sanitizarEntradaPublica_(enriquecerEntrada_(entrada)),
      movimentos: sanitizarMovimentosPublicos_(SGO_DATA.getManyByField(S.AST_MOVIMENTACOES, "ENTRADA_ID", id)),
      documentos: sanitizarDocumentosPublicos_(SGO_DATA.getManyByField(S.AST_DOCUMENTOS, "ENTRADA_ID", id)),
      fotos: SGO_DATA.getManyByField(S.AST_FOTOS, "ENTRADA_ID", id).filter(function(f) { return simNao_(f.VISIBILIDADE_PUBLICA) === "S"; }),
      terceiro: sanitizarTerceiroPublico_(terceiroAtual_(id)),
      laboratorio: sanitizarLaboratorioPublico_(labAtual_(id))
    };
  }

  function gerarDocumentoTerceiro(sessionId, terceiroId, tipo) {
    const sessao = exigirSessao(sessionId);
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return erro_("Registro de terceiro nao encontrado.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    const perm = exigirAst_(sessao, "TERCEIROS", entrada || {});
    if (!perm.success) return perm;
    return gerarDocumentoTerceiro_(sessao, terceiroId, tipo || "TERMO_ENVIO_TERCEIRO");
  }

  function obterWhatsappTerceiro(sessionId, terceiroId, tipo) {
    const sessao = exigirSessao(sessionId);
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return erro_("Registro de terceiro nao encontrado.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    const perm = exigirAst_(sessao, "TERCEIROS", entrada || {});
    if (!perm.success) return perm;
    const texto = montarWhatsappTerceiro_(montarContextoTerceiro_(terceiroId), tipo || "ACOMPANHAMENTO");
    return { success: true, texto: texto, url: "https://wa.me/?text=" + encodeURIComponent(texto) };
  }

  function gerarDocumentoLaboratorio(sessionId, labId, tipo) {
    const sessao = exigirSessao(sessionId);
    const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, labId);
    if (!lab) return erro_("Entrada de laboratorio nao encontrada.");
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID);
    const perm = exigirAst_(sessao, "LABORATORIO", entrada || {});
    if (!perm.success) return perm;
    return gerarDocumentoLaboratorio_(sessao, labId, tipo || "PROTOCOLO_ENTRADA_LABORATORIO");
  }

  function obterWhatsappLaboratorio(sessionId, labId, tipo) {
    const sessao = exigirSessao(sessionId);
    const ctx = montarContextoLaboratorio_(labId);
    if (!ctx) return erro_("Entrada de laboratorio nao encontrada.");
    const perm = exigirAst_(sessao, "LABORATORIO", ctx.entrada);
    if (!perm.success) return perm;
    const texto = montarWhatsappLaboratorio_(ctx, tipo || "RESULTADO");
    return { success: true, texto: texto, url: "https://wa.me/?text=" + encodeURIComponent(texto) };
  }

  function calcularIndicadoresAssistencia(entradas, dados) {
    entradas = entradas || [];
    dados = dados || {};
    const hoje = dataHoje_();
    const mes = hoje.slice(0, 7);
    const abertos = entradas.filter(aberto_);
    return {
      totalAssistencia: entradas.length,
      entradasHoje: entradas.filter(function(e) { return safe_(e.CRIADO_EM).indexOf(hoje) === 0; }).length,
      entradasDia: entradas.filter(function(e) { return safe_(e.CRIADO_EM).indexOf(hoje) === 0; }).length,
      entradasMes: entradas.filter(function(e) { return safe_(e.CRIADO_EM).indexOf(mes) === 0; }).length,
      concluidosMes: entradas.filter(function(e) { return concluido_(e) && safe_(e.ATUALIZADO_EM || e.CRIADO_EM).indexOf(mes) === 0; }).length,
      emAberto: abertos.length,
      atrasados: entradas.filter(estaAtrasado_).length,
      aguardandoDiagnostico: contarStatus_(entradas, [STATUS.ENTRADA, STATUS.TRIAGEM, STATUS.DIAGNOSTICO]),
      aguardandoPecas: contarStatus_(entradas, [STATUS.AGUARDANDO_PECAS, STATUS.PECA_SOLICITADA, STATUS.PECA_EM_COTACAO, STATUS.PECA_AGUARDANDO_APROVACAO, STATUS.PECA_COMPRADA]),
      aguardandoOrcamento: contarStatus_(entradas, [STATUS.AGUARDANDO_DECISAO]),
      aguardandoAprovacaoCliente: contarStatus_(entradas, [STATUS.AGUARDANDO_DECISAO]),
      emManutencao: contarStatus_(entradas, [STATUS.MANUTENCAO]),
      emTesteBancada: contarStatus_(entradas, [STATUS.TESTE_VALIDACAO]),
      enviadosTerceiro: contarStatus_(entradas, [STATUS.ENVIADO_PARA_TERCEIRO, STATUS.AGUARDANDO_TERCEIRO, STATUS.TERCEIRO_RECEBIDO_METROLABS, STATUS.TERCEIRO_INSPECAO_RETORNO]),
      emTerceiro: contarStatus_(entradas, [STATUS.ENVIADO_PARA_TERCEIRO, STATUS.AGUARDANDO_TERCEIRO]),
      emLaboratorio: contarStatus_(entradas, [STATUS.LABORATORIO, STATUS.LAB_EM_ENSAIO]),
      prontosRetirada: contarStatus_(entradas, [STATUS.PRONTO_ENTREGA]),
      prontosEntrega: contarStatus_(entradas, [STATUS.PRONTO_ENTREGA]),
      entregues: contarStatus_(entradas, [STATUS.ENTREGUE, STATUS.FINALIZADO]),
      semMovimentacao: entradas.filter(function(e) { return aberto_(e) && diasSemMovimento_(e) >= 1; }).length,
      criticos: entradas.filter(function(e) { return upper_(e.PRIORIDADE) === "CRITICA" || upper_(e.BANDEIRA) === "VERMELHO"; }).length,
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
      const conf = calcularConformidadeDocumental(g.items, dados || {});
      return { clienteId: g.id, cliente: g.nome, totalEquipamentos: total, total: total, concluidos: concluidos, emAberto: total - concluidos, atrasados: atrasados, percentualConclusao: percentual_(concluidos, total), conformidade: conf.indiceGeral };
    }).sort(function(a, b) { return b.total - a.total; });
  }

  function calcularIndicadoresPorTecnico(entradas) {
    return agruparGerencial_(entradas || [], function(e) { return e.TECNICO_ID || e.TECNICO_NOME || "SEM_TECNICO"; }, function(e) { return e.TECNICO_NOME || "Sem tecnico"; }).map(function(g, idx) {
      return {
        ranking: idx + 1,
        tecnicoId: g.id,
        tecnico: g.nome,
        equipamentosAtribuidos: g.items.length,
        concluidos: g.items.filter(concluido_).length,
        backlog: g.items.filter(aberto_).length,
        atrasados: g.items.filter(estaAtrasado_).length
      };
    }).sort(function(a, b) { return b.equipamentosAtribuidos - a.equipamentosAtribuidos; });
  }

  function calcularIndicadoresRotatividade(entradas, dados) {
    entradas = entradas || [];
    return {
      entradasPeriodo: entradas.length,
      saidasPeriodo: entradas.filter(concluido_).length,
      saldoAcumulado: entradas.filter(aberto_).length,
      mais7Dias: entradas.filter(function(e) { return aberto_(e) && diasDesde_(e.CRIADO_EM) > 7; }).length,
      mais15Dias: entradas.filter(function(e) { return aberto_(e) && diasDesde_(e.CRIADO_EM) > 15; }).length,
      mais30Dias: entradas.filter(function(e) { return aberto_(e) && diasDesde_(e.CRIADO_EM) > 30; }).length,
      mais60Dias: entradas.filter(function(e) { return aberto_(e) && diasDesde_(e.CRIADO_EM) > 60; }).length,
      tempoMedioPermanenciaHoras: mediaHoras_(entradas.filter(concluido_))
    };
  }

  function calcularIndicadoresGargalos(entradas, dados) {
    const mapa = [
      ["Sem diagnostico", function(e) { return aberto_(e) && !diagnosticoAtual_(e.ID) && [STATUS.ENTRADA, STATUS.TRIAGEM, STATUS.DIAGNOSTICO].indexOf(statusNormalizado_(e.STATUS)) >= 0; }],
      ["Aguardando pecas", function(e) { return statusNormalizado_(e.STATUS) === STATUS.AGUARDANDO_PECAS || pecasPendentes_(e.ID).length > 0; }],
      ["Em terceiro", function(e) { return emTerceiro_(e); }],
      ["Em laboratorio", function(e) { return emLaboratorio_(e); }],
      ["Sem atualizacao tecnica", function(e) { return aberto_(e) && diasSemMovimento_(e) >= 1; }],
      ["Atrasados", estaAtrasado_]
    ];
    return mapa.map(function(item) {
      const afetados = (entradas || []).filter(item[1]);
      return { gargalo: item[0], total: afetados.length, entradas: afetados.slice(0, 20).map(resumoEntradaGerencial_) };
    });
  }

  function calcularConformidadeDocumental(entradas, dados) {
    entradas = entradas || [];
    dados = dados || {};
    const docsPorEntrada = dados.docsPorEntrada || indexarPorEntrada_(SGO_DATA.getAll(S.AST_DOCUMENTOS));
    const checks = entradas.map(function(e) { return calcularConformidadeEntrada_(e, docsPorEntrada[e.ID] || []); });
    const total = checks.length;
    const soma = checks.reduce(function(acc, c) { return acc + c.indice; }, 0);
    return {
      totalAnalisado: total,
      indiceGeral: total ? Math.round(soma / total) : 100,
      percentualComFotos: percentual_(checks.filter(function(c) { return c.fotos; }).length, total),
      percentualComDiagnostico: percentual_(checks.filter(function(c) { return c.diagnostico; }).length, total),
      percentualDocumentoEntrada: percentual_(checks.filter(function(c) { return c.documentoEntrada; }).length, total),
      percentualQrToken: percentual_(checks.filter(function(c) { return c.qrTokenValido; }).length, total),
      percentualComExecucao: percentual_(checks.filter(function(c) { return c.execucao; }).length, total),
      registrosIncompletos: checks.filter(function(c) { return c.indice < 100; }).slice(0, 50).map(function(c) { return { entradaId: c.entradaId, protocolo: c.protocolo, cliente: c.cliente, pendencias: c.pendencias }; })
    };
  }

  function listarAlertasCriticosGerenciais(entradas, dados) {
    const out = [];
    (entradas || []).forEach(function(e) {
      function add(tipo, severidade, acao) {
        out.push({ entrada: e.PROTOCOLO || e.ID, cliente: e.CLIENTE_NOME || "--", equipamento: e.EQUIPAMENTO_NOME || "--", status: e.STATUS, diasParado: diasSemMovimento_(e), responsavel: e.TECNICO_NOME || "--", tipo: tipo, severidade: severidade, proximaAcaoSugerida: acao });
      }
      if (estaAtrasado_(e)) add("Atrasado", "ALTA", "Revisar prazo e comunicar cliente.");
      if (!diagnosticoAtual_(e.ID) && aberto_(e)) add("Sem diagnostico", "ALTA", "Priorizar diagnostico tecnico.");
      if (pecasPendentes_(e.ID).length) add("Peca pendente", "MEDIA", "Acompanhar compras/cotacao.");
      if (diasSemMovimento_(e) >= 1 && aberto_(e)) add("Sem atualizacao", "MEDIA", "Atualizar linha do tempo tecnica.");
    });
    return out.slice(0, 100);
  }

  function gerarRelatorioClienteAST(sessionId, filtros) { return gerarRelatorioGerencialComPermissao_(sessionId, "PRONTUARIO_CONFORMIDADE_MANUTENCAO_CLIENTE", filtros || {}); }
  function gerarProntuarioEquipamentoAST(sessionId, entradaId) { return gerarRelatorioGerencialComPermissao_(sessionId, "PRONTUARIO_TECNICO_EQUIPAMENTO", { ENTRADA_ID: entradaId }); }
  function gerarRelatorioExecutivoAST(sessionId, filtros) { return gerarRelatorioGerencialComPermissao_(sessionId, "RELATORIO_EXECUTIVO_GERAL_ASSISTENCIA", filtros || {}); }
  function gerarRelatorioProdutividadeTecnicosAST(sessionId, filtros) { return gerarRelatorioGerencialComPermissao_(sessionId, "RELATORIO_PRODUTIVIDADE_TECNICOS", filtros || {}); }
  function gerarRelatorioAtrasadosAST(sessionId, filtros) { return gerarRelatorioGerencialComPermissao_(sessionId, "RELATORIO_EQUIPAMENTOS_ATRASADOS", Object.assign({}, filtros || {}, { SOMENTE_ATRASADOS: "S" })); }
  function gerarRelatorioConformidadeDocumentalAST(sessionId, filtros) { return gerarRelatorioGerencialComPermissao_(sessionId, "RELATORIO_CONFORMIDADE_DOCUMENTAL_AST", filtros || {}); }

  function obterResumoExecutivoAST(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "RELATORIOS");
    if (!perm.success) return perm.message;
    const dados = dadosGerenciais_(sessao, filtros || {});
    const ind = calcularIndicadoresAssistencia(dados.entradas, dados);
    const conf = calcularConformidadeDocumental(dados.entradas, dados);
    const gargalos = calcularIndicadoresGargalos(dados.entradas, dados).filter(function(g) { return g.total > 0; }).slice(0, 3);
    return [
      "Resumo executivo da Assistencia Tecnica",
      "Periodo: " + (dados.filtros.PERIODO_INICIAL || "--") + " a " + (dados.filtros.PERIODO_FINAL || "--"),
      "Foram analisados " + ind.totalAssistencia + " equipamento(s), com " + ind.emAberto + " em aberto, " + ind.atrasados + " atrasado(s) e " + ind.concluidosMes + " concluido(s) no mes.",
      "Conformidade documental geral: " + conf.indiceGeral + "%.",
      gargalos.length ? ("Principais gargalos: " + gargalos.map(function(g) { return g.gargalo + " (" + g.total + ")"; }).join(", ") + ".") : "Nao ha gargalos relevantes no filtro informado.",
      ind.criticos ? ("Existem " + ind.criticos + " item(ns) critico(s) que exigem acompanhamento gerencial.") : "Nao ha itens criticos no filtro informado."
    ].join("\n");
  }

  function gerarRelatorioGerencialComPermissao_(sessionId, tipo, filtros) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "RELATORIOS");
    if (!perm.success) return perm;
    return gerarRelatorioGerencialAST_(sessao, tipo, filtros || {});
  }

  function gerarRelatorioTecnico_(sessao, entradaId, tipo) {
    const ctx = montarContextoTecnico_(entradaId);
    if (!ctx) return erro_("Entrada nao encontrada.");
    if (tipo === "RELATORIO_DIAGNOSTICO_TECNICO" && !ctx.diagnostico) return erro_("Nao existe diagnostico para gerar relatorio.");
    const token = gerarTokenDocumentoUnico_("AST-TEC");
    const validacaoUrl = montarUrlValidacao_(token);
    const qrCode = QR_API + encodeURIComponent(validacaoUrl);
    const html = relatorioTecnicoHtml_(tipo, ctx, token, validacaoUrl, qrCode);
    const nome = nomeArquivoAst_(tipo + "_" + ctx.entrada.PROTOCOLO + ".pdf");
    const file = criarPdfAst_(html, nome);
    const hash = sha256_(html);
    const doc = registrarDocumentoAst_(sessao, ctx.entrada.ID, tipo, ctx.entrada.PROTOCOLO, tituloDocumentoAst_(tipo), file, token, validacaoUrl, qrCode, hash);
    registrarMov_(sessao, ctx.entrada.ID, "PDF_TECNICO", ctx.entrada.STATUS, ctx.entrada.STATUS, ctx.entrada.TECNICO_ID, ctx.entrada.TECNICO_ID, ctx.entrada.LOCALIZACAO_ATUAL, "Relatorio tecnico gerado: " + tipo, "", ctx.entrada.PROXIMA_ACAO);
    return { success: true, documentoId: doc.ID, pdfUrl: file.getUrl(), downloadUrl: doc.DOWNLOAD_URL, token: token, hash: hash };
  }

  function gerarDocumentoEntrada_(sessao, entradaId) {
    const dados = obterPublicoCompleto_(entradaId);
    if (!dados) return erro_("Entrada nao encontrada.");
    const entrada = dados.item;
    const token = gerarTokenDocumentoUnico_("DOC-AST");
    const validacaoUrl = montarUrlValidacao_(token);
    const qrCode = QR_API + encodeURIComponent(validacaoUrl);
    const html = documentoEntradaHtml_(entrada, dados, token, validacaoUrl, qrCode);
    const nome = nomeArquivoAst_("AST_ENTRADA_" + entrada.PROTOCOLO + ".pdf");
    const file = criarPdfAst_(html, nome);
    const hash = sha256_(html);
    const doc = registrarDocumentoAst_(sessao, entradaId, "COMPROVANTE_ENTRADA_EQUIPAMENTO", entrada.PROTOCOLO, "Comprovante de Entrada de Equipamento", file, token, validacaoUrl, qrCode, hash);
    registrarMov_(sessao, entradaId, "PROTOCOLO_PDF", entrada.STATUS, entrada.STATUS, entrada.TECNICO_ID, entrada.TECNICO_ID, entrada.LOCALIZACAO_ATUAL, "Protocolo de entrada PDF gerado.", "", entrada.PROXIMA_ACAO);
    return { success: true, documentoId: doc.ID, pdfUrl: file.getUrl(), fileId: file.getId(), downloadUrl: doc.DOWNLOAD_URL, validacaoUrl: validacaoUrl, token: token, hash: hash };
  }

  function gerarDocumentoLaboratorio_(sessao, labId, tipo) {
    const ctx = montarContextoLaboratorio_(labId);
    if (!ctx) return erro_("Entrada de laboratorio nao encontrada.");
    const token = gerarTokenDocumentoUnico_("LAB-AST");
    const validacaoUrl = montarUrlValidacao_(token);
    const qrCode = QR_API + encodeURIComponent(validacaoUrl);
    const html = documentoLaboratorioHtml_(ctx, tipo, token, validacaoUrl, qrCode);
    const file = criarPdfAst_(html, nomeArquivoAst_(tipo + "_" + ctx.entrada.PROTOCOLO + ".pdf"));
    const hash = sha256_(html);
    const comum = docComum_(sessao, ctx.entrada.ID, tipo, ctx.entrada.PROTOCOLO, tituloDocumentoLab_(tipo), file, token, validacaoUrl, qrCode, hash);
    const docAst = SGO_DATA.insert(S.AST_DOCUMENTOS, SGO_DATA.gerarRegistroBase(comum));
    const docLab = SGO_DATA.insert(S.AST_LAB_DOCUMENTOS, SGO_DATA.gerarRegistroBase(Object.assign({}, comum, { LAB_ENTRADA_ID: labId })));
    registrarMov_(sessao, ctx.entrada.ID, "PDF_LAB", ctx.entrada.STATUS, ctx.entrada.STATUS, ctx.entrada.TECNICO_ID, ctx.lab.RESPONSAVEL_ID, localizacaoPorStatus_(ctx.entrada.STATUS), "Documento laboratorial gerado: " + tipo, "", ctx.entrada.PROXIMA_ACAO);
    return { success: true, documentoId: docAst.ID, labDocumentoId: docLab.ID, pdfUrl: file.getUrl(), downloadUrl: comum.DOWNLOAD_URL, token: token, hash: hash };
  }

  function gerarDocumentoTerceiro_(sessao, terceiroId, tipo) {
    const ctx = montarContextoTerceiro_(terceiroId);
    if (!ctx) return erro_("Registro de terceiro nao encontrado.");
    const token = gerarTokenDocumentoUnico_("TER-AST");
    const validacaoUrl = montarUrlValidacao_(token);
    const qrCode = QR_API + encodeURIComponent(validacaoUrl);
    const html = documentoTerceiroHtml_(ctx, tipo, token, validacaoUrl, qrCode);
    const file = criarPdfAst_(html, nomeArquivoAst_(tipo + "_" + ctx.entrada.PROTOCOLO + ".pdf"));
    const hash = sha256_(html);
    const comum = docComum_(sessao, ctx.entrada.ID, tipo, ctx.entrada.PROTOCOLO, tituloDocumentoTerceiro_(tipo), file, token, validacaoUrl, qrCode, hash);
    const docAst = SGO_DATA.insert(S.AST_DOCUMENTOS, SGO_DATA.gerarRegistroBase(comum));
    const docTer = SGO_DATA.insert(S.AST_TERCEIROS_DOCUMENTOS, SGO_DATA.gerarRegistroBase(Object.assign({}, comum, { TERCEIRO_ID: terceiroId })));
    registrarMov_(sessao, ctx.entrada.ID, "PDF_TERCEIRO", ctx.entrada.STATUS, ctx.entrada.STATUS, ctx.entrada.TECNICO_ID, ctx.entrada.TECNICO_ID, ctx.entrada.LOCALIZACAO_ATUAL, "Documento de terceiro gerado: " + tipo, "", ctx.entrada.PROXIMA_ACAO);
    return { success: true, documentoId: docAst.ID, terceiroDocumentoId: docTer.ID, pdfUrl: file.getUrl(), downloadUrl: comum.DOWNLOAD_URL, token: token, hash: hash };
  }

  function gerarRelatorioGerencialAST_(sessao, tipo, filtros) {
    const dados = dadosGerenciais_(sessao, filtros || {});
    if (filtros && filtros.ENTRADA_ID && !dados.entradas.length) return erro_("Entrada nao encontrada para o prontuario.");
    const dashboardData = obterDashboardGerencialPorDados_(dados);
    const token = gerarTokenDocumentoUnico_("REL-AST");
    const validacaoUrl = montarUrlValidacao_(token);
    const qrCode = QR_API + encodeURIComponent(validacaoUrl);
    const html = relatorioGerencialHtml_(tipo, dados, dashboardData, token, validacaoUrl, qrCode);
    const file = criarPdfAst_(html, nomeArquivoAst_(tipo + "_" + Utilities.formatDate(new Date(), SGO_CFG.SISTEMA.TIMEZONE, "yyyyMMdd_HHmmss") + ".pdf"));
    const hash = sha256_(html);
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
      DOWNLOAD_URL: downloadUrl_(file.getId()),
      TOKEN_VALIDACAO: token,
      URL_VALIDACAO: validacaoUrl,
      QR_CODE_LINK: qrCode,
      HASH_SHA256: hash,
      STATUS: "VALIDO",
      RESUMO: dashboardData.cards.totalAssistencia + " registro(s); conformidade " + dashboardData.conformidade.indiceGeral + "%.",
      CRIADO_POR: sessao.usuario
    }));
    const doc = docComum_(sessao, entrada.ID || "", tipo, entrada.PROTOCOLO || registro.ID, tituloRelatorioGerencial_(tipo), file, token, validacaoUrl, qrCode, hash);
    SGO_DATA.insert(S.AST_DOCUMENTOS, SGO_DATA.gerarRegistroBase(doc));
    return { success: true, relatorioId: registro.ID, pdfUrl: file.getUrl(), fileId: file.getId(), downloadUrl: downloadUrl_(file.getId()), validacaoUrl: validacaoUrl, token: token, hash: hash };
  }

  function dadosGerenciais_(sessao, filtros) {
    filtros = normalizarFiltrosGerenciais_(filtros || {});
    let entradas = SGO_DATA.getAll(S.AST_ENTRADAS).map(enriquecerEntrada_);
    if (perfilAst_(sessao) === "CLIENTE") entradas = entradas.filter(function(e) { return safe_(e.CLIENTE_ID) === safe_(sessao.clienteId); });
    entradas = aplicarFiltrosGerenciais_(entradas, filtros);
    return {
      filtros: filtros,
      entradas: entradas,
      docsPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(S.AST_DOCUMENTOS)),
      fotosPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(S.AST_FOTOS)),
      diagnosticosPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(S.AST_DIAGNOSTICOS)),
      pecasPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(S.AST_PECAS)),
      testesPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(S.AST_TESTES_BANCADA)),
      execucoesPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(S.AST_EXECUCOES)),
      movimentosPorEntrada: indexarPorEntrada_(SGO_DATA.getAll(S.AST_MOVIMENTACOES))
    };
  }

  function normalizarFiltrosGerenciais_(filtros) {
    return {
      CLIENTE_ID: safe_(filtros.CLIENTE_ID || filtros.clienteId),
      UNIDADE_ID: safe_(filtros.UNIDADE_ID || filtros.unidadeId),
      TECNICO_ID: safe_(filtros.TECNICO_ID || filtros.tecnicoId),
      STATUS: safe_(filtros.STATUS || filtros.status),
      PERIODO_INICIAL: safe_(filtros.PERIODO_INICIAL || filtros.dataInicial),
      PERIODO_FINAL: safe_(filtros.PERIODO_FINAL || filtros.dataFinal),
      TIPO_FLUXO: safe_(filtros.TIPO_FLUXO || filtros.tipoFluxo),
      SOMENTE_ATRASADOS: simNao_(filtros.SOMENTE_ATRASADOS),
      SOMENTE_CRITICOS: simNao_(filtros.SOMENTE_CRITICOS),
      SOMENTE_SEM_MOVIMENTACAO: simNao_(filtros.SOMENTE_SEM_MOVIMENTACAO),
      ENTRADA_ID: safe_(filtros.ENTRADA_ID || filtros.entradaId)
    };
  }

  function aplicarFiltrosGerenciais_(items, f) {
    if (f.ENTRADA_ID) items = items.filter(function(e) { return safe_(e.ID) === f.ENTRADA_ID; });
    if (f.CLIENTE_ID) items = items.filter(function(e) { return safe_(e.CLIENTE_ID) === f.CLIENTE_ID; });
    if (f.UNIDADE_ID) items = items.filter(function(e) { return safe_(e.UNIDADE_ID) === f.UNIDADE_ID; });
    if (f.TECNICO_ID) items = items.filter(function(e) { return safe_(e.TECNICO_ID) === f.TECNICO_ID; });
    if (f.STATUS) items = items.filter(function(e) { return statusNormalizado_(e.STATUS) === statusNormalizado_(f.STATUS) || upper_(e.STATUS) === upper_(f.STATUS); });
    if (f.PERIODO_INICIAL) items = items.filter(function(e) { return safe_(e.CRIADO_EM).slice(0, 10) >= f.PERIODO_INICIAL; });
    if (f.PERIODO_FINAL) items = items.filter(function(e) { return safe_(e.CRIADO_EM).slice(0, 10) <= f.PERIODO_FINAL; });
    if (f.SOMENTE_ATRASADOS === "S") items = items.filter(estaAtrasado_);
    if (f.SOMENTE_CRITICOS === "S") items = items.filter(function(e) { return upper_(e.PRIORIDADE) === "CRITICA" || upper_(e.BANDEIRA) === "VERMELHO"; });
    if (f.SOMENTE_SEM_MOVIMENTACAO === "S") items = items.filter(function(e) { return aberto_(e) && diasSemMovimento_(e) >= 1; });
    return items;
  }

  function obterDashboardGerencialPorDados_(dados) {
    return {
      cards: calcularIndicadoresAssistencia(dados.entradas, dados),
      status: calcularIndicadoresStatus_(dados.entradas),
      clientes: calcularIndicadoresPorCliente(dados.entradas, dados),
      tecnicos: calcularIndicadoresPorTecnico(dados.entradas),
      rotatividade: calcularIndicadoresRotatividade(dados.entradas, dados),
      gargalos: calcularIndicadoresGargalos(dados.entradas, dados),
      conformidade: calcularConformidadeDocumental(dados.entradas, dados),
      alertas: listarAlertasCriticosGerenciais(dados.entradas, dados)
    };
  }

  function calcularIndicadoresStatus_(entradas) {
    const grupos = [
      ["Entrada/triagem", [STATUS.ENTRADA, STATUS.TRIAGEM]],
      ["Diagnostico/decisao", [STATUS.DIAGNOSTICO, STATUS.AGUARDANDO_DECISAO]],
      ["Pecas", [STATUS.AGUARDANDO_PECAS, STATUS.PECA_SOLICITADA, STATUS.PECA_EM_COTACAO, STATUS.PECA_AGUARDANDO_APROVACAO, STATUS.PECA_COMPRADA, STATUS.PECA_RECEBIDA, STATUS.PECA_INSTALADA]],
      ["Terceiros", [STATUS.ENVIADO_PARA_TERCEIRO, STATUS.AGUARDANDO_TERCEIRO, STATUS.TERCEIRO_RECEBIDO_METROLABS, STATUS.TERCEIRO_INSPECAO_RETORNO]],
      ["Laboratorio", [STATUS.LABORATORIO, STATUS.LAB_EM_ENSAIO]],
      ["Execucao/teste", [STATUS.MANUTENCAO, STATUS.TESTE_VALIDACAO, STATUS.CONCLUSAO_TECNICA]],
      ["Pronto/entregue", [STATUS.PRONTO_ENTREGA, STATUS.ENTREGUE, STATUS.FINALIZADO]],
      ["Bloqueado/cancelado", [STATUS.SEM_REPARO, STATUS.CANCELADO, STATUS.ATRASADO]]
    ];
    return grupos.map(function(g) { return { grupo: g[0], total: contarStatus_(entradas || [], g[1]) }; });
  }

  function dashboardInterno_(sessao) {
    let entradas = SGO_DATA.getAll(S.AST_ENTRADAS).map(enriquecerEntrada_);
    if (perfilAst_(sessao) === "CLIENTE") entradas = entradas.filter(function(e) { return safe_(e.CLIENTE_ID) === safe_(sessao.clienteId); });
    const ind = calcularIndicadoresAssistencia(entradas, {});
    return Object.assign({}, ind, {
      prontosEntrega: ind.prontosEntrega,
      emTerceiro: ind.emTerceiro,
      emLaboratorio: ind.emLaboratorio
    });
  }

  function obterEntradaCompleta_(entrada) {
    const id = entrada.ID;
    return {
      success: true,
      item: enriquecerEntrada_(entrada),
      acessorios: SGO_DATA.getManyByField(S.AST_ACESSORIOS, "ENTRADA_ID", id),
      fotos: SGO_DATA.getManyByField(S.AST_FOTOS, "ENTRADA_ID", id),
      movimentos: SGO_DATA.getManyByField(S.AST_MOVIMENTACOES, "ENTRADA_ID", id),
      documentos: SGO_DATA.getManyByField(S.AST_DOCUMENTOS, "ENTRADA_ID", id),
      diagnosticos: SGO_DATA.getManyByField(S.AST_DIAGNOSTICOS, "ENTRADA_ID", id),
      pecas: SGO_DATA.getManyByField(S.AST_PECAS, "ENTRADA_ID", id),
      testes: SGO_DATA.getManyByField(S.AST_TESTES_BANCADA, "ENTRADA_ID", id),
      execucoes: SGO_DATA.getManyByField(S.AST_EXECUCOES, "ENTRADA_ID", id),
      terceiros: montarTerceirosEntrada_(id),
      laboratorio: montarLaboratorioEntrada_(id),
      whatsapp: montarWhatsapp_(enriquecerEntrada_(entrada), SGO_DATA.getManyByField(S.AST_DOCUMENTOS, "ENTRADA_ID", id)),
      alertas: SGO_DATA.getManyByField(S.AST_ALERTAS, "ENTRADA_ID", id)
    };
  }

  function montarContextoTecnico_(entradaId) {
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, entradaId);
    if (!entrada) return null;
    return {
      entrada: enriquecerEntrada_(entrada),
      acessorios: SGO_DATA.getManyByField(S.AST_ACESSORIOS, "ENTRADA_ID", entradaId),
      fotos: SGO_DATA.getManyByField(S.AST_FOTOS, "ENTRADA_ID", entradaId),
      diagnostico: diagnosticoAtual_(entradaId),
      pecas: SGO_DATA.getManyByField(S.AST_PECAS, "ENTRADA_ID", entradaId),
      teste: ultimoPorCriacao_(SGO_DATA.getManyByField(S.AST_TESTES_BANCADA, "ENTRADA_ID", entradaId)),
      execucao: ultimoPorCriacao_(SGO_DATA.getManyByField(S.AST_EXECUCOES, "ENTRADA_ID", entradaId)),
      movimentos: SGO_DATA.getManyByField(S.AST_MOVIMENTACOES, "ENTRADA_ID", entradaId)
    };
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
    e = e || {};
    const cliente = e.CLIENTE_ID ? SGO_DATA.getById(S.CAD_CLIENTES, e.CLIENTE_ID) : null;
    const unidade = e.UNIDADE_ID ? SGO_DATA.getById(S.CAD_UNIDADES, e.UNIDADE_ID) : null;
    const equipamento = e.EQUIPAMENTO_ID ? SGO_DATA.getById(S.CAD_EQUIPAMENTOS, e.EQUIPAMENTO_ID) : null;
    const status = statusNormalizado_(e.STATUS);
    return Object.assign({}, e, {
      STATUS_NORMALIZADO: status,
      CLIENTE_NOME: cliente ? (cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL || cliente.NOME) : (e.CLIENTE_PROVISORIO || e.CLIENTE_NOME || ""),
      UNIDADE_NOME: unidade ? (unidade.NOME || unidade.NOME_UNIDADE) : (e.UNIDADE_PROVISORIA || e.UNIDADE_NOME || ""),
      EQUIPAMENTO_NOME: equipamento ? ([equipamento.TAG, equipamento.TIPO, equipamento.MODELO].filter(Boolean).join(" - ")) : (e.EQUIPAMENTO_PROVISORIO || e.EQUIPAMENTO_NOME || ""),
      EQUIPAMENTO_SERIE: equipamento ? (equipamento.SERIE || equipamento.NUMERO_SERIE || e.NUMERO_SERIE_INFORMADO) : (e.NUMERO_SERIE_INFORMADO || e.EQUIPAMENTO_SERIE || ""),
      EQUIPAMENTO_PATRIMONIO: equipamento ? (equipamento.PATRIMONIO || "") : "",
      BANDEIRA: e.BANDEIRA || bandeira_(status, e.PRIORIDADE),
      ULTIMA_MOVIMENTACAO_BR: formatarDataBR_(e.ULTIMA_MOVIMENTACAO_EM || e.ATUALIZADO_EM || e.CRIADO_EM),
      ENTRADA_DATA_BR: formatarDataBR_(e.CRIADO_EM)
    });
  }

  function salvarPeca_(sessao, entradaId, diagnosticoId, payload) {
    payload = payload || {};
    return SGO_DATA.insert(S.AST_PECAS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      DIAGNOSTICO_ID: safe_(diagnosticoId),
      PECA_ID: safe_(payload.PECA_ID),
      NOME_PECA: safe_(payload.NOME_PECA || payload.DESCRICAO_PECA || payload.DESCRICAO || "Peca solicitada"),
      CODIGO_INTERNO: safe_(payload.CODIGO_INTERNO),
      CODIGO_FABRICANTE: safe_(payload.CODIGO_FABRICANTE),
      DESCRICAO: safe_(payload.DESCRICAO || payload.DESCRICAO_PECA),
      QUANTIDADE: safe_(payload.QUANTIDADE || "1"),
      URGENCIA: upper_(payload.URGENCIA || "NORMAL"),
      JUSTIFICATIVA_TECNICA: safe_(payload.JUSTIFICATIVA_TECNICA || payload.JUSTIFICATIVA),
      TEM_ESTOQUE: simNao_(payload.TEM_ESTOQUE),
      FORNECEDOR_SUGERIDO: safe_(payload.FORNECEDOR_SUGERIDO),
      VALOR_ESTIMADO: safe_(payload.VALOR_ESTIMADO),
      STATUS: upper_(payload.STATUS || STATUS.PECA_SOLICITADA),
      SOLICITADA_EM: now_(),
      OBSERVACAO: safe_(payload.OBSERVACAO),
      CRIADO_POR: sessao.usuario
    }));
  }

  function criarExecucao_(sessao, entrada, payload, statusFinal) {
    const tecnico = payload.TECNICO_ID ? SGO_DATA.getById(S.CAD_TECNICOS, payload.TECNICO_ID) : null;
    return SGO_DATA.insert(S.AST_EXECUCOES, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entrada.ID,
      TECNICO_ID: safe_(payload.TECNICO_ID || entrada.TECNICO_ID),
      TECNICO_NOME: tecnico ? nomePessoa_(tecnico) : safe_(payload.TECNICO_NOME || entrada.TECNICO_NOME),
      DATA_EXECUCAO: safe_(payload.DATA_EXECUCAO || dataHoje_()),
      SERVICO_REALIZADO: safe_(payload.SERVICO_REALIZADO || payload.CONCLUSAO_TECNICA),
      PECAS_APLICADAS: safe_(payload.PECAS_APLICADAS),
      AJUSTES_REALIZADOS: safe_(payload.AJUSTES_REALIZADOS),
      LIMPEZA_REALIZADA: safe_(payload.LIMPEZA_REALIZADA),
      COMPONENTES_SUBSTITUIDOS: safe_(payload.COMPONENTES_SUBSTITUIDOS),
      TESTES_APOS_REPARO: safe_(payload.TESTES_APOS_REPARO),
      RESULTADO_FINAL: safe_(payload.RESULTADO_FINAL),
      RECOMENDACAO_CLIENTE: safe_(payload.RECOMENDACAO_CLIENTE),
      GARANTIA_SERVICO: safe_(payload.GARANTIA_SERVICO),
      CONCLUSAO_TECNICA: safe_(payload.CONCLUSAO_TECNICA),
      STATUS_FINAL: statusNormalizado_(statusFinal || payload.STATUS_FINAL || STATUS.TESTE_VALIDACAO),
      CRIADO_POR: sessao.usuario
    }));
  }

  function diagnosticoAtual_(entradaId) { return ultimoPorCriacao_(SGO_DATA.getManyByField(S.AST_DIAGNOSTICOS, "ENTRADA_ID", entradaId)); }
  function labAtual_(entradaId) { return ultimoPorCriacao_(SGO_DATA.getManyByField(S.AST_LAB_ENTRADAS, "ENTRADA_ID", entradaId)); }
  function terceiroAtual_(entradaId) { return ultimoPorCriacao_(SGO_DATA.getManyByField(S.AST_TERCEIROS, "ENTRADA_ID", entradaId)); }
  function pecasPendentes_(entradaId) { return SGO_DATA.getManyByField(S.AST_PECAS, "ENTRADA_ID", entradaId).filter(function(p) { return STATUS_PECA_PENDENTE.indexOf(upper_(p.STATUS)) >= 0; }); }
  function testeAprovado_(entradaId) {
    return SGO_DATA.getManyByField(S.AST_TESTES_BANCADA, "ENTRADA_ID", entradaId).some(function(t) {
      return ["APROVADO", "APROVADO_COM_RESSALVA"].indexOf(upper_(t.RESULTADO)) >= 0;
    });
  }

  function statusAposDiagnostico_(dados) {
    if (simNao_(dados.NECESSITA_TERCEIRO) === "S") return STATUS.AGUARDANDO_TERCEIRO;
    if (simNao_(dados.NECESSITA_PECA) === "S") return STATUS.AGUARDANDO_PECAS;
    return statusNormalizado_(dados.STATUS_APOS_DIAGNOSTICO || STATUS.AGUARDANDO_DECISAO);
  }

  function atualizarEntradaStatus_(sessao, entrada, status, descricao, proximaAcao) {
    const novoStatus = statusNormalizado_(status);
    SGO_DATA.update(S.AST_ENTRADAS, entrada.ID, {
      STATUS: novoStatus,
      BANDEIRA: bandeira_(novoStatus, entrada.PRIORIDADE),
      LOCALIZACAO_ATUAL: localizacaoPorStatus_(novoStatus),
      PROXIMA_ACAO: safe_(proximaAcao || proximaAcaoPorStatus_(novoStatus)),
      ULTIMA_MOVIMENTACAO_EM: now_(),
      ATUALIZADO_POR: sessao.usuario,
      ATUALIZADO_EM: now_()
    });
    return novoStatus;
  }

  function registrarMov_(sessao, entradaId, tipo, stAnt, stNovo, tecAnt, tecNovo, local, desc, motivo, prox) {
    SGO_DATA.insert(S.AST_MOVIMENTACOES, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TIPO: upper_(tipo || "MOVIMENTACAO"),
      STATUS_ANTERIOR: safe_(stAnt),
      STATUS_NOVO: safe_(stNovo),
      TECNICO_ANTERIOR_ID: safe_(tecAnt),
      TECNICO_NOVO_ID: safe_(tecNovo),
      LOCALIZACAO: safe_(local),
      DESCRICAO: safe_(desc),
      MOTIVO: safe_(motivo),
      PROXIMA_ACAO: safe_(prox),
      CRIADO_POR: sessao.usuario
    }));
  }

  function criarAlerta_(entradaId, tipo, severidade, mensagem) {
    SGO_DATA.insert(S.AST_ALERTAS, SGO_DATA.gerarRegistroBase({
      ENTRADA_ID: entradaId,
      TIPO_ALERTA: safe_(tipo),
      SEVERIDADE: safe_(severidade),
      MENSAGEM: safe_(mensagem),
      STATUS: "ABERTO",
      GERADO_EM: now_()
    }));
  }

  function montarTerceirosEntrada_(entradaId) {
    return SGO_DATA.getManyByField(S.AST_TERCEIROS, "ENTRADA_ID", entradaId).map(function(t) {
      return Object.assign({}, t, {
        ACESSORIOS: SGO_DATA.getManyByField(S.AST_TERCEIROS_ACESSORIOS, "TERCEIRO_ID", t.ID),
        ANEXOS: SGO_DATA.getManyByField(S.AST_TERCEIROS_ANEXOS, "TERCEIRO_ID", t.ID),
        ACOMPANHAMENTOS: SGO_DATA.getManyByField(S.AST_TERCEIROS_ACOMPANHAMENTOS, "TERCEIRO_ID", t.ID),
        DOCUMENTOS: SGO_DATA.getManyByField(S.AST_TERCEIROS_DOCUMENTOS, "TERCEIRO_ID", t.ID)
      });
    });
  }

  function montarLaboratorioEntrada_(entradaId) {
    return SGO_DATA.getManyByField(S.AST_LAB_ENTRADAS, "ENTRADA_ID", entradaId).map(function(l) {
      return Object.assign({}, l, {
        PADROES: SGO_DATA.getManyByField(S.AST_LAB_PADROES, "LAB_ENTRADA_ID", l.ID),
        ENSAIOS: SGO_DATA.getManyByField(S.AST_LAB_ENSAIOS, "LAB_ENTRADA_ID", l.ID),
        RESULTADOS: SGO_DATA.getManyByField(S.AST_LAB_RESULTADOS, "LAB_ENTRADA_ID", l.ID),
        EVIDENCIAS: SGO_DATA.getManyByField(S.AST_LAB_EVIDENCIAS, "LAB_ENTRADA_ID", l.ID),
        DOCUMENTOS: SGO_DATA.getManyByField(S.AST_LAB_DOCUMENTOS, "LAB_ENTRADA_ID", l.ID)
      });
    });
  }

  function salvarAcessorioTerceiro_(sessao, terceiroId, entradaId, payload) {
    payload = payload || {};
    return SGO_DATA.insert(S.AST_TERCEIROS_ACESSORIOS, SGO_DATA.gerarRegistroBase({
      TERCEIRO_ID: terceiroId,
      ENTRADA_ID: entradaId,
      DESCRICAO: safe_(payload.DESCRICAO || payload.descricao),
      QUANTIDADE: safe_(payload.QUANTIDADE || payload.quantidade || "1"),
      ESTADO: safe_(payload.ESTADO || payload.estado || "Conferido"),
      FOTO_LINK: safe_(payload.FOTO_LINK),
      FILE_ID: safe_(payload.FILE_ID),
      OBSERVACAO: safe_(payload.OBSERVACAO),
      CRIADO_POR: sessao.usuario
    }));
  }

  function registrarMovTerceiro_(sessao, terceiro, tipo, descricao) {
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    if (!entrada) return;
    const novoStatus = statusEntradaPorTerceiro_(terceiro.STATUS_TERCEIRO || STATUS.ENVIADO_PARA_TERCEIRO);
    registrarMov_(sessao, entrada.ID, tipo, entrada.STATUS, novoStatus, entrada.TECNICO_ID, entrada.TECNICO_ID, localizacaoPorStatus_(novoStatus), descricao, "", terceiro.PROXIMA_ACAO || entrada.PROXIMA_ACAO);
  }

  function statusEntradaPorTerceiro_(status) {
    const s = upper_(status);
    if (s === STATUS.TERCEIRO_RECEBIDO_METROLABS || s === STATUS.TERCEIRO_INSPECAO_RETORNO) return s;
    if (s.indexOf("ATRASADO") >= 0) return STATUS.ATRASADO;
    return STATUS_ALIAS[s] || STATUS.ENVIADO_PARA_TERCEIRO;
  }

  function statusFornecedorTerceiro_(payload, fornecedor) {
    return upper_(payload.STATUS_FORNECEDOR || (fornecedor && (fornecedor.STATUS_QUALIFICACAO || fornecedor.STATUS)) || "NAO_AVALIADO");
  }

  function atualizarLabStatus_(sessao, lab, status) {
    SGO_DATA.update(S.AST_LAB_ENTRADAS, lab.ID, { STATUS: statusNormalizado_(status), ATUALIZADO_POR: sessao.usuario, ATUALIZADO_EM: now_() });
  }

  function situacaoPadrao_(payload) {
    const st = upper_(payload.SITUACAO);
    if (st) return st;
    const validade = safe_(payload.VALIDADE_CERTIFICADO);
    if (validade && validade < dataHoje_()) return "VENCIDO";
    return "VALIDO";
  }

  function padroesBloqueantes_(labId) {
    return SGO_DATA.getManyByField(S.AST_LAB_PADROES, "LAB_ENTRADA_ID", labId).filter(function(p) {
      return ["VENCIDO", "BLOQUEADO"].indexOf(upper_(p.SITUACAO)) >= 0 && !p.LIBERACAO_GESTOR;
    });
  }

  function montarContextoLaboratorio_(labId) {
    const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, labId);
    if (!lab) return null;
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, lab.ENTRADA_ID);
    if (!entrada) return null;
    return {
      lab: lab,
      entrada: enriquecerEntrada_(entrada),
      padroes: SGO_DATA.getManyByField(S.AST_LAB_PADROES, "LAB_ENTRADA_ID", labId),
      ensaios: SGO_DATA.getManyByField(S.AST_LAB_ENSAIOS, "LAB_ENTRADA_ID", labId),
      resultados: SGO_DATA.getManyByField(S.AST_LAB_RESULTADOS, "LAB_ENTRADA_ID", labId),
      evidencias: SGO_DATA.getManyByField(S.AST_LAB_EVIDENCIAS, "LAB_ENTRADA_ID", labId),
      documentos: SGO_DATA.getManyByField(S.AST_LAB_DOCUMENTOS, "LAB_ENTRADA_ID", labId)
    };
  }

  function montarContextoTerceiro_(terceiroId) {
    const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, terceiroId);
    if (!terceiro) return null;
    const entrada = SGO_DATA.getById(S.AST_ENTRADAS, terceiro.ENTRADA_ID);
    if (!entrada) return null;
    return {
      terceiro: terceiro,
      entrada: enriquecerEntrada_(entrada),
      acessorios: SGO_DATA.getManyByField(S.AST_TERCEIROS_ACESSORIOS, "TERCEIRO_ID", terceiroId),
      anexos: SGO_DATA.getManyByField(S.AST_TERCEIROS_ANEXOS, "TERCEIRO_ID", terceiroId),
      acompanhamentos: SGO_DATA.getManyByField(S.AST_TERCEIROS_ACOMPANHAMENTOS, "TERCEIRO_ID", terceiroId),
      documentos: SGO_DATA.getManyByField(S.AST_TERCEIROS_DOCUMENTOS, "TERCEIRO_ID", terceiroId),
      fotos: SGO_DATA.getManyByField(S.AST_FOTOS, "TERCEIRO_ID", terceiroId)
    };
  }

  function entradaIdPorVinculoAnexo_(vinculo, idRelacionado) {
    if (vinculo.indexOf("TERCEIRO") >= 0) {
      const terceiro = SGO_DATA.getById(S.AST_TERCEIROS, idRelacionado);
      return terceiro && terceiro.ENTRADA_ID;
    }
    if (vinculo.indexOf("LAB") >= 0) {
      const lab = SGO_DATA.getById(S.AST_LAB_ENTRADAS, idRelacionado);
      return lab && lab.ENTRADA_ID;
    }
    return idRelacionado;
  }

  function relatorioTecnicoHtml_(tipo, ctx, token, validacaoUrl, qrCode) {
    const e = ctx.entrada;
    const d = ctx.diagnostico || {};
    const t = ctx.teste || {};
    const x = ctx.execucao || {};
    return documentoBaseHtml_(tituloDocumentoAst_(tipo), token, validacaoUrl, qrCode,
      secaoGrid_("Identificacao", [
        ["Protocolo", e.PROTOCOLO], ["Cliente", e.CLIENTE_NOME], ["Unidade", e.UNIDADE_NOME], ["Equipamento", e.EQUIPAMENTO_NOME],
        ["Serie", e.EQUIPAMENTO_SERIE], ["Status", e.STATUS], ["Tecnico", e.TECNICO_NOME], ["Prioridade", e.PRIORIDADE]
      ]) +
      secaoTexto_("Problema relatado", e.PROBLEMA_RELATADO) +
      secaoGrid_("Diagnostico", [["Defeito confirmado", d.DEFEITO_CONFIRMADO], ["Causa provavel", d.CAUSA_PROVAVEL], ["Risco", d.RISCO_USO], ["Recomendacao", d.RECOMENDACAO_TECNICA]]) +
      secaoTabela_("Pecas", ["Peca", "Qtd", "Status"], ctx.pecas.map(function(p) { return [p.NOME_PECA || p.DESCRICAO, p.QUANTIDADE, p.STATUS]; })) +
      secaoGrid_("Teste e execucao", [["Teste", t.RESULTADO], ["Procedimento", t.PROCEDIMENTO_REALIZADO], ["Servico", x.SERVICO_REALIZADO], ["Resultado", x.RESULTADO_FINAL]]) +
      secaoTexto_("Conclusao tecnica", x.CONCLUSAO_TECNICA || d.CONCLUSAO_PRELIMINAR || "--")
    );
  }

  function documentoEntradaHtml_(entrada, dados, token, url, qr) {
    return documentoBaseHtml_("Comprovante de Entrada de Equipamento", token, url, qr,
      secaoGrid_("Entrada", [["Protocolo", entrada.PROTOCOLO], ["Data/hora", entrada.CRIADO_EM], ["Cliente", entrada.CLIENTE_NOME], ["Unidade", entrada.UNIDADE_NOME], ["Equipamento", entrada.EQUIPAMENTO_NOME], ["Serie", entrada.EQUIPAMENTO_SERIE], ["Status", entrada.STATUS], ["Prioridade", entrada.PRIORIDADE]]) +
      secaoTexto_("Condicao fisica", entrada.CONDICAO_FISICA) +
      secaoTexto_("Problema relatado", entrada.PROBLEMA_RELATADO) +
      secaoTabela_("Acessorios recebidos", ["Descricao", "Qtd", "Estado", "Obs"], (dados.acessorios || []).map(function(a) { return [a.DESCRICAO, a.QUANTIDADE, a.ESTADO, a.OBSERVACAO]; }))
    );
  }

  function documentoLaboratorioHtml_(ctx, tipo, token, url, qr) {
    const l = ctx.lab;
    return documentoBaseHtml_(tituloDocumentoLab_(tipo), token, url, qr,
      secaoGrid_("Identificacao", [["Protocolo", ctx.entrada.PROTOCOLO], ["Cliente", ctx.entrada.CLIENTE_NOME], ["Equipamento", ctx.entrada.EQUIPAMENTO_NOME], ["Status", l.STATUS]]) +
      secaoGrid_("Laboratorio", [["Tipo", l.TIPO_SERVICO], ["Procedimento", l.PROCEDIMENTO], ["Norma", l.NORMA], ["Criterio", l.CRITERIO_ACEITACAO]]) +
      secaoTabela_("Padroes", ["Padrao", "Codigo", "Validade", "Situacao"], ctx.padroes.map(function(p) { return [p.NOME_PADRAO, p.CODIGO_INTERNO, p.VALIDADE_CERTIFICADO, p.SITUACAO]; })) +
      secaoTabela_("Ensaios", ["Tipo", "Resultado", "Conformidade"], ctx.ensaios.map(function(e) { return [e.TIPO_ENSAIO, e.RESULTADO_TRATADO || e.RESULTADO_BRUTO, e.CONFORMIDADE]; }))
    );
  }

  function documentoTerceiroHtml_(ctx, tipo, token, url, qr) {
    const t = ctx.terceiro;
    return documentoBaseHtml_(tituloDocumentoTerceiro_(tipo), token, url, qr,
      secaoGrid_("Equipamento", [["Protocolo", ctx.entrada.PROTOCOLO], ["Cliente", ctx.entrada.CLIENTE_NOME], ["Equipamento", ctx.entrada.EQUIPAMENTO_NOME], ["Status", ctx.entrada.STATUS]]) +
      secaoGrid_("Terceiro", [["Empresa", t.EMPRESA_NOME], ["Contato", t.RESPONSAVEL_EMPRESA], ["Telefone", t.TELEFONE_WHATSAPP], ["Prazo", t.PRAZO_INFORMADO || t.PRAZO_PROMETIDO]]) +
      secaoTexto_("Motivo do envio", t.MOTIVO_ENVIO) +
      secaoTabela_("Acompanhamentos", ["Data", "Canal", "Status", "Info"], ctx.acompanhamentos.map(function(a) { return [a.CRIADO_EM, a.CANAL, a.STATUS_INFORMADO, a.INFORMACAO_RECEBIDA]; }))
    );
  }

  function relatorioGerencialHtml_(tipo, dados, dashboardData, token, validacaoUrl, qrCode) {
    const cards = dashboardData.cards || {};
    return documentoBaseHtml_(tituloRelatorioGerencial_(tipo), token, validacaoUrl, qrCode,
      secaoGrid_("Resumo", [["Total", cards.totalAssistencia], ["Em aberto", cards.emAberto], ["Atrasados", cards.atrasados], ["Concluidos mes", cards.concluidosMes], ["Terceiros", cards.emTerceiro], ["Laboratorio", cards.emLaboratorio], ["Prontos", cards.prontosEntrega], ["Criticos", cards.criticos]]) +
      secaoTabela_("Equipamentos", ["Protocolo", "Cliente", "Equipamento", "Status", "Tecnico", "Dias"], dados.entradas.slice(0, 200).map(function(e) { return [e.PROTOCOLO, e.CLIENTE_NOME, e.EQUIPAMENTO_NOME, e.STATUS, e.TECNICO_NOME || "--", diasDesde_(e.CRIADO_EM)]; })) +
      secaoTexto_("Conclusao executiva", obterConclusaoGerencial_(tipo, dashboardData))
    );
  }

  function documentoBaseHtml_(titulo, token, validacaoUrl, qrCode, corpo) {
    return '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:13mm}body{font-family:Arial,Helvetica,sans-serif;color:#172033;margin:0;font-size:11px}.head{display:grid;grid-template-columns:1fr 120px;gap:18px;border-bottom:4px solid #0b7a3e;padding-bottom:14px;margin-bottom:16px}.logo{max-width:220px;max-height:80px}.brand{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:800}.title{font-size:24px;color:#0b3b78;margin:10px 0 4px}.qr{width:110px;height:110px}.section-title{font-size:9px;text-transform:uppercase;color:#0b3b78;font-weight:900;border-left:4px solid #0b7a3e;padding-left:7px;margin:15px 0 7px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.box{border:1px solid #dfe6ee;border-radius:6px;background:#f8fafc;padding:8px}.lab{font-size:8px;text-transform:uppercase;color:#64748b;font-weight:900}.val{font-weight:800;word-break:break-word}.note{border:1px solid #dfe6ee;border-radius:6px;padding:10px;white-space:pre-line}.table{width:100%;border-collapse:collapse}.table th{background:#0b3b78;color:#fff;text-align:left;padding:6px;font-size:8px;text-transform:uppercase}.table td{border-bottom:1px solid #dfe6ee;padding:6px;vertical-align:top}.footer{border-top:1px solid #dfe6ee;margin-top:18px;padding-top:9px;color:#64748b;font-size:9px;line-height:1.45}.mono{font-family:Consolas,monospace;word-break:break-all}</style></head><body><header class="head"><div><img class="logo" src="' + esc_(SGO_CFG.LOGO_URL || "") + '"><div class="brand">Metrolabs SGO+ Assistencia Tecnica</div><h1 class="title">' + esc_(titulo) + '</h1></div><div><img class="qr" src="' + esc_(qrCode) + '"></div></header>' + corpo + '<footer class="footer">Documento emitido com token, hash e QR Code de validacao publica.<br>Token: <span class="mono">' + esc_(token) + '</span><br>Validacao: <span class="mono">' + esc_(validacaoUrl) + '</span></footer></body></html>';
  }

  function secaoGrid_(titulo, pares) {
    return '<div class="section-title">' + esc_(titulo) + '</div><div class="grid">' + (pares || []).map(function(p) { return '<div class="box"><div class="lab">' + esc_(p[0]) + '</div><div class="val">' + esc_(p[1] || "--") + '</div></div>'; }).join("") + '</div>';
  }
  function secaoTexto_(titulo, texto) { return '<div class="section-title">' + esc_(titulo) + '</div><div class="note">' + esc_(texto || "--") + '</div>'; }
  function secaoTabela_(titulo, cols, rows) {
    rows = rows || [];
    return '<div class="section-title">' + esc_(titulo) + '</div><table class="table"><thead><tr>' + cols.map(function(c) { return '<th>' + esc_(c) + '</th>'; }).join("") + '</tr></thead><tbody>' + (rows.length ? rows.map(function(r) { return '<tr>' + r.map(function(v) { return '<td>' + esc_(v || "--") + '</td>'; }).join("") + '</tr>'; }).join("") : '<tr><td colspan="' + cols.length + '">Sem registros.</td></tr>') + '</tbody></table>';
  }

  function gerarEtiquetaHtml_(entradaId, tamanho) {
    const entrada = enriquecerEntrada_(SGO_DATA.getById(S.AST_ENTRADAS, entradaId));
    const classe = upper_(tamanho || "MEDIA");
    return '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial;margin:0}.label{border:1px solid #111;padding:8px;width:' + (classe === "PEQUENA" ? "70mm" : "100mm") + ';min-height:' + (classe === "PEQUENA" ? "35mm" : "50mm") + '} .code{font-size:18px;font-weight:900;color:#0b7a3e}.muted{font-size:10px;color:#374151}.qr{width:72px;height:72px;float:right}</style></head><body><div class="label"><img class="qr" src="' + esc_(entrada.QR_URL) + '"><div class="code">' + esc_(entrada.PROTOCOLO) + '</div><div><b>Cliente:</b> ' + esc_(entrada.CLIENTE_NOME) + '</div><div><b>Equip.:</b> ' + esc_(entrada.EQUIPAMENTO_NOME) + '</div><div><b>Status:</b> ' + esc_(entrada.STATUS) + '</div><div class="muted">Rastreabilidade SGO+</div></div></body></html>';
  }

  function gerarEtiquetaPdf_(sessao, entradaId, tamanho) {
    const entrada = enriquecerEntrada_(SGO_DATA.getById(S.AST_ENTRADAS, entradaId));
    if (!entrada || !entrada.ID) return erro_("Entrada nao encontrada.");
    const html = gerarEtiquetaHtml_(entradaId, tamanho || "MEDIA");
    const file = criarPdfAst_(html, nomeArquivoAst_("AST_ETIQUETA_" + entrada.PROTOCOLO + ".pdf"));
    const token = gerarTokenDocumentoUnico_("ETQ-AST");
    const validacaoUrl = montarUrlValidacao_(token);
    const qr = QR_API + encodeURIComponent(validacaoUrl);
    const hash = sha256_(html);
    const doc = registrarDocumentoAst_(sessao, entradaId, "ETIQUETA_AST", entrada.PROTOCOLO, "Etiqueta de Assistencia Tecnica", file, token, validacaoUrl, qr, hash, tamanho || "MEDIA");
    SGO_DATA.update(S.AST_ENTRADAS, entradaId, { ETIQUETA_PDF_ID: file.getId(), ETIQUETA_PDF_LINK: file.getUrl(), ETIQUETA_PDF_DOWNLOAD: doc.DOWNLOAD_URL, ATUALIZADO_POR: sessao.usuario, ATUALIZADO_EM: now_() });
    return { success: true, documentoId: doc.ID, pdfUrl: file.getUrl(), downloadUrl: doc.DOWNLOAD_URL, token: token, hash: hash };
  }

  function criarPdfAst_(html, nome) {
    const blob = Utilities.newBlob(html, "text/html", nome.replace(/\.pdf$/i, ".html")).getAs("application/pdf").setName(nome);
    const file = pastaAst_().createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    return file;
  }

  function registrarDocumentoAst_(sessao, entradaId, tipo, numero, titulo, file, token, validacaoUrl, qrCode, hash, tamanho) {
    return SGO_DATA.insert(S.AST_DOCUMENTOS, SGO_DATA.gerarRegistroBase(docComum_(sessao, entradaId, tipo, numero, titulo, file, token, validacaoUrl, qrCode, hash, tamanho)));
  }

  function docComum_(sessao, entradaId, tipo, numero, titulo, file, token, validacaoUrl, qrCode, hash, tamanho) {
    return {
      ENTRADA_ID: safe_(entradaId),
      TIPO_DOCUMENTO: safe_(tipo),
      NUMERO_DOCUMENTO: safe_(numero),
      TITULO: safe_(titulo),
      FILE_ID: file.getId(),
      LINK_ARQUIVO: file.getUrl(),
      HASH_SHA256: hash,
      TOKEN_VALIDACAO: token,
      URL_VALIDACAO: validacaoUrl,
      QR_CODE_LINK: qrCode,
      DOWNLOAD_URL: downloadUrl_(file.getId()),
      TAMANHO_ETIQUETA: safe_(tamanho),
      STATUS: "VALIDO",
      CRIADO_POR: sessao.usuario
    };
  }

  function montarWhatsapp_(entrada, docs) {
    const doc = (docs || [])[0] || {};
    return [
      "Metrolabs SGO+ - Assistencia Tecnica",
      "Protocolo: " + safe_(entrada.PROTOCOLO),
      "Cliente: " + safe_(entrada.CLIENTE_NOME),
      "Equipamento: " + safe_(entrada.EQUIPAMENTO_NOME),
      "Status: " + safe_(entrada.STATUS),
      "Proxima acao: " + safe_(entrada.PROXIMA_ACAO),
      "Acompanhamento: " + safe_(entrada.URL_PUBLICA),
      doc.DOWNLOAD_URL ? ("Documento: " + doc.DOWNLOAD_URL) : ""
    ].filter(Boolean).join("\n");
  }

  function montarWhatsappTerceiro_(ctx, tipo) {
    if (!ctx) return "";
    return ["Assistencia terceirizada - " + safe_(ctx.entrada.PROTOCOLO), "Empresa: " + safe_(ctx.terceiro.EMPRESA_NOME), "Status: " + safe_(ctx.terceiro.STATUS_TERCEIRO), "Proxima acao: " + safe_(ctx.terceiro.PROXIMA_ACAO), "Acompanhamento: " + safe_(ctx.entrada.URL_PUBLICA)].join("\n");
  }

  function montarWhatsappLaboratorio_(ctx, tipo) {
    if (!ctx) return "";
    return ["Laboratorio AST - " + safe_(ctx.entrada.PROTOCOLO), "Servico: " + safe_(ctx.lab.TIPO_SERVICO), "Status: " + safe_(ctx.lab.STATUS), "Resultado: " + safe_(ctx.lab.RESULTADO_FINAL || "--"), "Acompanhamento: " + safe_(ctx.entrada.URL_PUBLICA)].join("\n");
  }

  function sanitizarEntradaPublica_(entrada) {
    return { ID: entrada.ID, PROTOCOLO: entrada.PROTOCOLO, CLIENTE_NOME: entrada.CLIENTE_NOME, UNIDADE_NOME: entrada.UNIDADE_NOME, EQUIPAMENTO_NOME: entrada.EQUIPAMENTO_NOME, STATUS: entrada.STATUS, BANDEIRA: entrada.BANDEIRA, PROXIMA_ACAO: proximaAcaoPublica_(entrada.STATUS), URL_PUBLICA: entrada.URL_PUBLICA, QR_URL: entrada.QR_URL, CRIADO_EM: entrada.CRIADO_EM, ULTIMA_MOVIMENTACAO_EM: entrada.ULTIMA_MOVIMENTACAO_EM };
  }
  function sanitizarTerceiroPublico_(terceiro) { return terceiro ? { STATUS_TERCEIRO: terceiro.STATUS_TERCEIRO, PRAZO_INFORMADO: terceiro.PRAZO_INFORMADO, PROXIMA_ACAO: terceiro.PROXIMA_ACAO, RETORNADO_EM: terceiro.RETORNADO_EM } : null; }
  function sanitizarLaboratorioPublico_(lab) { return lab ? { TIPO_SERVICO: lab.TIPO_SERVICO, STATUS: lab.STATUS, RESULTADO_FINAL: lab.RESULTADO_FINAL, CONFORMIDADE: lab.CONFORMIDADE } : null; }
  function sanitizarMovimentosPublicos_(movimentos) {
    return (movimentos || []).map(function(m) { return { TIPO: m.TIPO, STATUS_NOVO: m.STATUS_NOVO, DESCRICAO: descricaoPublicaMovimento_(m), PROXIMA_ACAO: m.PROXIMA_ACAO, CRIADO_EM: m.CRIADO_EM }; });
  }
  function sanitizarDocumentosPublicos_(documentos) {
    return (documentos || []).filter(function(d) { return upper_(d.STATUS || "VALIDO") === "VALIDO"; }).map(function(d) { return { TIPO_DOCUMENTO: d.TIPO_DOCUMENTO, TITULO: d.TITULO, DOWNLOAD_URL: d.DOWNLOAD_URL, URL_VALIDACAO: d.URL_VALIDACAO, TOKEN_VALIDACAO: d.TOKEN_VALIDACAO, HASH_SHA256: d.HASH_SHA256 }; });
  }
  function descricaoPublicaMovimento_(m) { return safe_(m.DESCRICAO || "Etapa tecnica atualizada."); }
  function proximaAcaoPublica_(status) { return proximaAcaoPorStatus_(status); }

  function statusNormalizado_(status) {
    const s = upper_(status || STATUS.ENTRADA);
    return STATUS[s] || STATUS_ALIAS[s] || s;
  }
  function bandeira_(status, prioridade) {
    const s = statusNormalizado_(status);
    if (upper_(prioridade) === "CRITICA" && [STATUS.PRONTO_ENTREGA, STATUS.ENTREGUE, STATUS.FINALIZADO].indexOf(s) < 0) return "VERMELHO";
    if ([STATUS.PRONTO_ENTREGA, STATUS.ENTREGUE, STATUS.FINALIZADO, STATUS.PECA_RECEBIDA, STATUS.PECA_INSTALADA].indexOf(s) >= 0) return "VERDE";
    if ([STATUS.ATRASADO, STATUS.CANCELADO, STATUS.SEM_REPARO].indexOf(s) >= 0) return "VERMELHO";
    if ([STATUS.ENTRADA, STATUS.TRIAGEM].indexOf(s) >= 0) return "AZUL_CINZA";
    return "AMARELO";
  }
  function localizacaoPorStatus_(status) {
    const s = statusNormalizado_(status);
    if ([STATUS.ENVIADO_PARA_TERCEIRO, STATUS.AGUARDANDO_TERCEIRO].indexOf(s) >= 0) return "ASSISTENCIA_TERCEIRIZADA";
    if ([STATUS.LABORATORIO, STATUS.LAB_EM_ENSAIO].indexOf(s) >= 0) return "LABORATORIO_INTERNO";
    if ([STATUS.PRONTO_ENTREGA].indexOf(s) >= 0) return "EXPEDICAO";
    if ([STATUS.ENTREGUE, STATUS.FINALIZADO].indexOf(s) >= 0) return "CLIENTE";
    return "ASSISTENCIA_LOCAL";
  }
  function proximaAcaoPorStatus_(status) {
    const s = statusNormalizado_(status);
    const mapa = {};
    mapa[STATUS.ENTRADA] = "Realizar triagem tecnica";
    mapa[STATUS.TRIAGEM] = "Registrar diagnostico";
    mapa[STATUS.DIAGNOSTICO] = "Concluir diagnostico";
    mapa[STATUS.AGUARDANDO_DECISAO] = "Definir decisao tecnica";
    mapa[STATUS.AGUARDANDO_PECAS] = "Acompanhar pecas";
    mapa[STATUS.ENVIADO_PARA_TERCEIRO] = "Acompanhar terceiro";
    mapa[STATUS.AGUARDANDO_TERCEIRO] = "Aguardar retorno do terceiro";
    mapa[STATUS.TERCEIRO_RECEBIDO_METROLABS] = "Inspecionar retorno do terceiro";
    mapa[STATUS.LABORATORIO] = "Registrar ensaio laboratorial";
    mapa[STATUS.LAB_EM_ENSAIO] = "Consolidar resultado laboratorial";
    mapa[STATUS.MANUTENCAO] = "Executar manutencao";
    mapa[STATUS.TESTE_VALIDACAO] = "Realizar teste/validacao";
    mapa[STATUS.CONCLUSAO_TECNICA] = "Registrar conclusao tecnica";
    mapa[STATUS.PRONTO_ENTREGA] = "Entregar ao cliente";
    return mapa[s] || "Atualizar acompanhamento tecnico";
  }

  function perfilAst_(sessao) { return upper_(sessao && sessao.perfil); }
  function astPodePerfil_(sessao, acao) {
    const p = perfilAst_(sessao);
    if (p === "CLIENTE") return false;
    if (["ADMIN", "GESTOR", "DIRETORIA"].indexOf(p) >= 0) return true;
    if (p === "TECNICO") return ["INTERNO", "TECNICO", "GERENCIAR_ENTRADAS", "PECAS"].indexOf(acao) >= 0;
    if (p === "METROLOGIA") return ["INTERNO", "TECNICO", "GERENCIAR_ENTRADAS", "PECAS", "LABORATORIO", "RELATORIOS"].indexOf(acao) >= 0;
    if (p === "COMERCIAL") return ["INTERNO", "COMERCIAL", "RELATORIOS"].indexOf(acao) >= 0;
    return ["INTERNO", "RELATORIOS"].indexOf(acao) >= 0;
  }
  function tecnicoAutorizadoEntrada_(sessao, entrada) {
    if (perfilAst_(sessao) !== "TECNICO") return true;
    const uid = safe_(sessao.tecnicoId || sessao.usuarioId || sessao.userId);
    return !entrada.TECNICO_ID || !uid || safe_(entrada.TECNICO_ID) === uid || safe_(entrada.TECNICO_NOME).toLowerCase() === safe_(sessao.nome || sessao.usuario).toLowerCase();
  }
  function exigirAst_(sessao, acao, entrada) {
    if (perfilAst_(sessao) === "CLIENTE") return erro_("Perfil cliente nao acessa a area interna da Assistencia Tecnica. Use a validacao publica por token.");
    if (!astPodePerfil_(sessao, acao)) return erro_("Perfil sem permissao para esta acao da Assistencia Tecnica.");
    if (entrada && entrada.CLIENTE_ID && !podeVerCliente_(sessao, entrada.CLIENTE_ID)) return erro_("Acesso negado.");
    if (acao === "TECNICO" && entrada && !tecnicoAutorizadoEntrada_(sessao, entrada)) return erro_("Tecnico sem autorizacao para atuar nesta entrada.");
    return { success: true };
  }
  function podeVerCliente_(sessao, clienteId) { return perfilAst_(sessao) !== "CLIENTE" || safe_(sessao.clienteId) === safe_(clienteId); }
  function filtrarClienteSessao_(items, sessao) { return perfilAst_(sessao) === "CLIENTE" ? (items || []).filter(function(c) { return safe_(c.ID) === safe_(sessao.clienteId); }) : (items || []).filter(function(c) { return ativo_(c.STATUS); }); }

  function garantirAba_(ss, nome, cols, log) {
    let sheet = ss.getSheetByName(nome);
    if (!sheet) {
      sheet = ss.insertSheet(nome);
      sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
      log.push("Criada: " + nome);
      return;
    }
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const atuais = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return safe_(h); }).filter(Boolean);
    const faltantes = cols.filter(function(c) { return atuais.indexOf(c) < 0; });
    if (sheet.getLastRow() === 0 || !atuais.length) {
      sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
      log.push("Cabecalho criado: " + nome);
    } else if (faltantes.length) {
      sheet.getRange(1, atuais.length + 1, 1, faltantes.length).setValues([faltantes]);
      log.push("Colunas adicionadas em " + nome + ": " + faltantes.join(", "));
    } else {
      log.push("OK: " + nome);
    }
  }

  function pastaAst_() {
    const id = SGO_CFG.DRIVE && SGO_CFG.DRIVE.FOLDER_ASSISTENCIA_TECNICA;
    if (id) {
      try { return DriveApp.getFolderById(id); } catch (e) {}
    }
    return DriveApp.getRootFolder();
  }
  function montarUrlPublica_(token) { return ScriptApp.getService().getUrl() + "?ast=" + encodeURIComponent(token); }
  function montarUrlValidacao_(token) { return ScriptApp.getService().getUrl() + "?validar=" + encodeURIComponent(token); }
  function gerarProtocolo_() { return "AST-" + Utilities.formatDate(new Date(), SGO_CFG.SISTEMA.TIMEZONE, "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 900 + 100); }
  function gerarTokenEntradaUnico_() {
    for (let i = 0; i < 10; i++) {
      const token = "AST-" + Utilities.getUuid().replace(/-/g, "").slice(0, 18).toUpperCase();
      if (!SGO_DATA.getByField(S.AST_ENTRADAS, "QR_TOKEN", token)) return token;
    }
    return "AST-" + Utilities.getUuid().replace(/-/g, "").toUpperCase();
  }
  function gerarTokenDocumentoUnico_(prefixo) {
    for (let i = 0; i < 10; i++) {
      const token = safe_(prefixo || "DOC-AST") + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 16).toUpperCase();
      if (!SGO_DATA.getByField(S.AST_DOCUMENTOS, "TOKEN_VALIDACAO", token)) return token;
    }
    return safe_(prefixo || "DOC-AST") + "-" + Utilities.getUuid().replace(/-/g, "").toUpperCase();
  }

  function calcularConformidadeEntrada_(e, docs) {
    const fotos = SGO_DATA.getManyByField(S.AST_FOTOS, "ENTRADA_ID", e.ID).length > 0;
    const diagnostico = !!diagnosticoAtual_(e.ID);
    const execucao = SGO_DATA.getManyByField(S.AST_EXECUCOES, "ENTRADA_ID", e.ID).length > 0;
    const documentoEntrada = (docs || []).some(function(d) { return d.TIPO_DOCUMENTO === "COMPROVANTE_ENTRADA_EQUIPAMENTO"; });
    const qrTokenValido = !!e.QR_TOKEN;
    const checks = { fotos: fotos, diagnostico: diagnostico, execucao: execucao, documentoEntrada: documentoEntrada, qrTokenValido: qrTokenValido };
    const pend = Object.keys(checks).filter(function(k) { return !checks[k]; });
    return Object.assign({}, checks, { entradaId: e.ID, protocolo: e.PROTOCOLO, cliente: e.CLIENTE_NOME, indice: percentual_(Object.keys(checks).length - pend.length, Object.keys(checks).length), pendencias: pend });
  }

  function prefixoDocumentoLab_(tipo) { return "LAB-AST"; }
  function tituloDocumentoLab_(tipo) {
    const mapa = { PROTOCOLO_ENTRADA_LABORATORIO: "Protocolo de Entrada Laboratorial", FICHA_ENSAIO_LABORATORIAL: "Ficha de Ensaio Laboratorial", CERTIFICADO_RELATORIO_CALIBRACAO: "Certificado / Relatorio de Calibracao", RELATORIO_QUALIFICACAO: "Relatorio de Qualificacao", RELATORIO_CONFORMIDADE_LABORATORIAL: "Relatorio de Conformidade Laboratorial" };
    return mapa[tipo] || "Documento Laboratorial";
  }
  function tituloDocumentoTerceiro_(tipo) {
    const mapa = { TERMO_ENVIO_TERCEIRO: "Termo de Envio para Assistencia Terceirizada", PROTOCOLO_ACOMPANHAMENTO_TERCEIRO: "Protocolo de Acompanhamento de Terceiro", RELATORIO_RETORNO_TERCEIRO: "Relatorio de Retorno de Terceiro", RELATORIO_FINAL_CONSOLIDADO_TERCEIRO: "Relatorio Final Consolidado" };
    return mapa[tipo] || "Documento de Assistencia Terceirizada";
  }
  function tituloDocumentoAst_(tipo) {
    const mapa = { RELATORIO_DIAGNOSTICO_TECNICO: "Relatorio de Diagnostico Tecnico", RELATORIO_MANUTENCAO_AST: "Relatorio Final de Manutencao" };
    return mapa[tipo] || "Documento de Assistencia Tecnica";
  }
  function tituloRelatorioGerencial_(tipo) {
    const mapa = { PRONTUARIO_CONFORMIDADE_MANUTENCAO_CLIENTE: "Relatorio por Cliente", PRONTUARIO_TECNICO_EQUIPAMENTO: "Relatorio por Equipamento", RELATORIO_EXECUTIVO_GERAL_ASSISTENCIA: "Relatorio Mensal Geral", RELATORIO_PRODUTIVIDADE_TECNICOS: "Produtividade dos Tecnicos", RELATORIO_EQUIPAMENTOS_ATRASADOS: "Equipamentos Atrasados", RELATORIO_CONFORMIDADE_DOCUMENTAL_AST: "Conformidade Documental AST" };
    return mapa[tipo] || "Relatorio de Assistencia Tecnica";
  }
  function obterConclusaoGerencial_(tipo, dashboardData) {
    const c = dashboardData.cards || {};
    return "A carteira possui " + (c.totalAssistencia || 0) + " equipamento(s), com " + (c.emAberto || 0) + " em aberto, " + (c.atrasados || 0) + " atrasado(s) e " + (c.prontosEntrega || 0) + " pronto(s) para entrega.";
  }

  function listarTecnicos_() { return S.CAD_TECNICOS ? SGO_DATA.getAll(S.CAD_TECNICOS).filter(function(t) { return ativo_(t.STATUS); }) : []; }
  function listarFornecedoresTerceiro_() {
    if (!S.CAD_FORNECEDORES) return [];
    try {
      return SGO_DATA.getAll(S.CAD_FORNECEDORES, "ESTOQUE").filter(function(f) { return ativo_(f.STATUS); });
    } catch (e) {
      try {
        log_("AST_FORNECEDORES_AVISO", "SISTEMA", "Fornecedores indisponiveis no contexto AST: " + e.message);
      } catch (logErr) {}
      return [];
    }
  }

  function obterFornecedorSeguro_(fornecedorId) {
    if (!fornecedorId || !S.CAD_FORNECEDORES) return null;
    try {
      return SGO_DATA.getById(S.CAD_FORNECEDORES, fornecedorId, "ESTOQUE");
    } catch (e) {
      try {
        log_("AST_FORNECEDOR_AVISO", "SISTEMA", "Fornecedor nao carregado no AST: " + e.message);
      } catch (logErr) {}
      return null;
    }
  }
  function ativo_(status) { return ["", "ATIVO", "SIM", "S", "VALIDO"].indexOf(upper_(status || "ATIVO")) >= 0; }
  function aberto_(e) { return [STATUS.ENTREGUE, STATUS.FINALIZADO, STATUS.CANCELADO, STATUS.SEM_REPARO].indexOf(statusNormalizado_(e.STATUS)) < 0; }
  function concluido_(e) { return [STATUS.PRONTO_ENTREGA, STATUS.ENTREGUE, STATUS.FINALIZADO, STATUS.SEM_REPARO].indexOf(statusNormalizado_(e.STATUS)) >= 0; }
  function emTerceiro_(e) { return [STATUS.ENVIADO_PARA_TERCEIRO, STATUS.AGUARDANDO_TERCEIRO].indexOf(statusNormalizado_(e.STATUS)) >= 0; }
  function emLaboratorio_(e) { return [STATUS.LABORATORIO, STATUS.LAB_EM_ENSAIO].indexOf(statusNormalizado_(e.STATUS)) >= 0; }
  function estaAtrasado_(e) {
    if (!aberto_(e)) return false;
    const prazo = safe_(e.PRAZO_PROMETIDO);
    return prazo ? prazo < dataHoje_() : diasDesde_(e.CRIADO_EM) > 7;
  }
  function diasSemMovimento_(e) { return diasDesde_(e.ULTIMA_MOVIMENTACAO_EM || e.ATUALIZADO_EM || e.CRIADO_EM); }
  function diasDesde_(iso) { const d = new Date(iso || new Date()); return Math.max(0, Math.floor((new Date().getTime() - d.getTime()) / 86400000)); }
  function mediaHoras_(items) { if (!items || !items.length) return 0; const total = items.reduce(function(acc, e) { return acc + Math.max(0, horasDesde_(e.CRIADO_EM)); }, 0); return Math.round((total / items.length) * 10) / 10; }
  function horasDesde_(iso) { const d = new Date(iso || new Date()); return Math.max(0, (new Date().getTime() - d.getTime()) / 3600000); }
  function contarStatus_(items, lista) { const norm = (lista || []).map(statusNormalizado_); return (items || []).filter(function(e) { return norm.indexOf(statusNormalizado_(e.STATUS)) >= 0 || lista.indexOf(upper_(e.STATUS)) >= 0; }).length; }
  function percentual_(parte, total) { return total ? Math.round((parte / total) * 100) : 0; }
  function ultimoPorCriacao_(items) { return (items || []).slice().sort(function(a, b) { return safe_(b.CRIADO_EM || b.ATUALIZADO_EM).localeCompare(safe_(a.CRIADO_EM || a.ATUALIZADO_EM)); })[0] || null; }
  function agruparGerencial_(items, idFn, nomeFn) {
    const mapa = {};
    (items || []).forEach(function(i) { const id = idFn(i); if (!mapa[id]) mapa[id] = { id: id, nome: nomeFn(i), items: [] }; mapa[id].items.push(i); });
    return Object.keys(mapa).map(function(k) { return mapa[k]; });
  }
  function indexarPorEntrada_(items) {
    const out = {};
    (items || []).forEach(function(i) { const id = i.ENTRADA_ID || i.ID; if (!out[id]) out[id] = []; out[id].push(i); });
    return out;
  }
  function resumoEntradaGerencial_(e) { return { id: e.ID, protocolo: e.PROTOCOLO, cliente: e.CLIENTE_NOME, equipamento: e.EQUIPAMENTO_NOME, status: e.STATUS, tecnico: e.TECNICO_NOME, dias: diasDesde_(e.CRIADO_EM) }; }
  function liberacaoGestor_(sessao, valor) { return !!valor || ["ADMIN", "GESTOR", "DIRETORIA"].indexOf(perfilAst_(sessao)) >= 0; }
  function nomePessoa_(p) { return safe_(p.NOME || p.NOME_COMPLETO || p.TECNICO_NOME || p.EMAIL || p.ID); }
  function safe_(v) { return SGO_UTILS && SGO_UTILS.safe ? SGO_UTILS.safe(v) : String(v === null || v === undefined ? "" : v).trim(); }
  function upper_(v) { return safe_(v).toUpperCase(); }
  function simNao_(v) { const s = upper_(v); return ["S", "SIM", "TRUE", "1", "YES"].indexOf(s) >= 0 ? "S" : "N"; }
  function now_() { return SGO_UTILS && SGO_UTILS.nowIso ? SGO_UTILS.nowIso() : new Date().toISOString(); }
  function dataHoje_() { return Utilities.formatDate(new Date(), SGO_CFG.SISTEMA.TIMEZONE, "yyyy-MM-dd"); }
  function formatarDataBR_(valor) { if (!valor) return ""; try { return Utilities.formatDate(new Date(valor), SGO_CFG.SISTEMA.TIMEZONE, "dd/MM/yyyy HH:mm"); } catch (e) { return safe_(valor); } }
  function nomeArquivoAst_(nome) { return safe_(nome || "arquivo_ast.pdf").replace(/[\\/:*?"<>|]+/g, "_"); }
  function downloadUrl_(fileId) { return "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(fileId); }
  function limparBase64_(base64) { return safe_(base64).replace(/^data:[^;]+;base64,/, ""); }
  function sha256_(texto) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8).map(function(b) { return ("0" + ((b < 0 ? b + 256 : b).toString(16))).slice(-2); }).join(""); }
  function esc_(v) { return String(v === null || v === undefined ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function erro_(msg) { return { success: false, message: msg }; }
  function log_(acao, usuario, detalhe) { if (SGO_DATA.log) SGO_DATA.log(acao, usuario, detalhe, "ASSISTENCIA_TECNICA"); }

  const entrada = { criar: criarEntrada, listar: listarEntradas, obter: obterEntrada };
  const triagem = { atualizarStatus: atualizarStatus };
  const diagnostico = { salvar: salvarDiagnostico };
  const pecas = { salvar: salvarPeca, atualizar: atualizarPeca };
  const terceiros = { registrarEnvio: registrarEnvioTerceiro, acompanhar: registrarAcompanhamentoTerceiro, retorno: registrarRetornoTerceiro, inspecao: registrarInspecaoRetornoTerceiro };
  const laboratorio = { registrarEntrada: registrarEntradaLaboratorio, registrarEnsaio: registrarEnsaioLaboratorio, consolidar: consolidarResultadoLaboratorio };
  const execucao = { registrar: registrarExecucao };
  const testes = { registrar: registrarTesteBancada };
  const conclusao = { concluir: concluirTecnica };
  const entrega = { atualizarStatus: atualizarStatus };
  const timeline = { registrarAcao: registrarAcao };
  const documentos = { gerarEntrada: gerarDocumentoEntrada, gerarEtiqueta: gerarEtiqueta, gerarEtiquetaPdf: gerarEtiquetaPdf, gerarRelatorioDiagnostico: gerarRelatorioDiagnostico, gerarRelatorioManutencao: gerarRelatorioManutencao };
  const publico = { consultar: consultarPublico };
  const ai = { lapidarTexto: function(sessionId, texto) { return { success: true, texto: safe_(texto) }; } };

  // ============================================================
  // V2 â€” NÃšCLEO RECONSTRUÃDO DA ASSISTÃŠNCIA TÃ‰CNICA
  // Banco zerado. AST_ENTRADAS congelada como AST_ENTRADAS_LEGADO.
  // Terceiros e LaboratÃ³rio fora do escopo desta fase.
  // ============================================================

  const STATUS_V2 = {
    ENTRADA_REGISTRADA:          "ENTRADA_REGISTRADA",
    AGUARDANDO_DIAGNOSTICO:      "AGUARDANDO_DIAGNOSTICO",
    EM_BANCADA:                  "EM_BANCADA",
    DIAGNOSTICO_EM_ANDAMENTO:    "DIAGNOSTICO_EM_ANDAMENTO",
    DIAGNOSTICO_CONCLUIDO:       "DIAGNOSTICO_CONCLUIDO",
    AGUARDANDO_ORCAMENTO:        "AGUARDANDO_ORCAMENTO",
    ORCAMENTO_ENVIADO:           "ORCAMENTO_ENVIADO",
    AGUARDANDO_APROVACAO_CLIENTE:"AGUARDANDO_APROVACAO_CLIENTE",
    ORCAMENTO_APROVADO:          "ORCAMENTO_APROVADO",
    ORCAMENTO_RECUSADO:          "ORCAMENTO_RECUSADO",
    AGUARDANDO_PECA:             "AGUARDANDO_PECA",
    AGUARDANDO_TERCEIRO:         "AGUARDANDO_TERCEIRO",
    LIBERADO_PARA_EXECUCAO:      "LIBERADO_PARA_EXECUCAO",
    EXECUCAO_EM_ANDAMENTO:       "EXECUCAO_EM_ANDAMENTO",
    EXECUCAO_CONCLUIDA:          "EXECUCAO_CONCLUIDA",
    AGUARDANDO_CALIBRACAO:       "AGUARDANDO_CALIBRACAO",
    CONCLUIDO_TECNICAMENTE:      "CONCLUIDO_TECNICAMENTE",
    AGUARDANDO_ENTREGA:          "AGUARDANDO_ENTREGA",
    ENTREGUE:                    "ENTREGUE",
    CANCELADO:                   "CANCELADO",
    NAO_REPARADO:                "NAO_REPARADO"
  };

  const BANDEIRA_V2 = {
    ENTRADA_REGISTRADA:          "AZUL_CINZA",
    AGUARDANDO_DIAGNOSTICO:      "AMARELO",
    EM_BANCADA:                  "AMARELO",
    DIAGNOSTICO_EM_ANDAMENTO:    "AMARELO",
    DIAGNOSTICO_CONCLUIDO:       "AMARELO",
    AGUARDANDO_ORCAMENTO:        "AMARELO",
    ORCAMENTO_ENVIADO:           "AMARELO",
    AGUARDANDO_APROVACAO_CLIENTE:"AMARELO",
    ORCAMENTO_APROVADO:          "AMARELO",
    ORCAMENTO_RECUSADO:          "VERMELHO",
    AGUARDANDO_PECA:             "AMARELO",
    AGUARDANDO_TERCEIRO:         "AMARELO",
    LIBERADO_PARA_EXECUCAO:      "AMARELO",
    EXECUCAO_EM_ANDAMENTO:       "AMARELO",
    EXECUCAO_CONCLUIDA:          "VERDE",
    AGUARDANDO_CALIBRACAO:       "AMARELO",
    CONCLUIDO_TECNICAMENTE:      "VERDE",
    AGUARDANDO_ENTREGA:          "VERDE",
    ENTREGUE:                    "VERDE",
    CANCELADO:                   "VERMELHO",
    NAO_REPARADO:                "VERMELHO"
  };

  const PROXIMA_ACAO_V2 = {
    ENTRADA_REGISTRADA:          "Aguardando tecnico iniciar avaliacao",
    AGUARDANDO_DIAGNOSTICO:      "Tecnico deve iniciar avaliacao do equipamento",
    EM_BANCADA:                  "Tecnico em avaliacao inicial",
    DIAGNOSTICO_EM_ANDAMENTO:    "Concluir diagnostico tecnico",
    DIAGNOSTICO_CONCLUIDO:       "Definir proximo passo: orcamento, execucao ou encerramento",
    AGUARDANDO_ORCAMENTO:        "Elaborar e enviar orcamento ao cliente",
    ORCAMENTO_ENVIADO:           "Aguardar aprovacao do cliente",
    AGUARDANDO_APROVACAO_CLIENTE:"Aguardar retorno do cliente",
    ORCAMENTO_APROVADO:          "Providenciar pecas ou liberar para execucao",
    ORCAMENTO_RECUSADO:          "Encerrar atendimento ou renegociar com cliente",
    AGUARDANDO_PECA:             "Aguardar chegada da peca solicitada",
    AGUARDANDO_TERCEIRO:         "Aguardar retorno do servico terceirizado",
    LIBERADO_PARA_EXECUCAO:      "Iniciar execucao do reparo",
    EXECUCAO_EM_ANDAMENTO:       "Concluir execucao do reparo",
    EXECUCAO_CONCLUIDA:          "Realizar conclusao tecnica e liberar para entrega",
    AGUARDANDO_CALIBRACAO:       "Encaminhar para calibracao",
    CONCLUIDO_TECNICAMENTE:      "Agendar entrega ao cliente",
    AGUARDANDO_ENTREGA:          "Realizar entrega com assinatura do cliente",
    ENTREGUE:                    "Atendimento encerrado",
    CANCELADO:                   "Atendimento cancelado â€” nenhuma acao necessaria",
    NAO_REPARADO:                "Informar cliente sobre impossibilidade de reparo"
  };

  const COLUNAS_V2 = {
    // Tabela principal dos atendimentos
    AST_ATENDIMENTOS: [
      "ID", "PROTOCOLO",
      "CLIENTE_ID", "CLIENTE_NOME", "UNIDADE_ID", "UNIDADE_NOME",
      "EQUIPAMENTO_ID", "EQUIPAMENTO_NOME", "EQUIPAMENTO_MODELO", "EQUIPAMENTO_MARCA", "NUMERO_SERIE",
      "CADASTRO_PROVISORIO", "CLIENTE_PROVISORIO", "UNIDADE_PROVISORIA", "EQUIPAMENTO_PROVISORIO",
      "CONDICAO_FISICA", "PROBLEMA_RELATADO", "PRIORIDADE", "PRAZO_PROMETIDO",
      "TECNICO_ID", "TECNICO_NOME",
      "STATUS", "BANDEIRA", "LOCALIZACAO_ATUAL",
      "QR_TOKEN_ACOMPANHAMENTO", "QR_URL_ACOMPANHAMENTO", "URL_PUBLICA",
      "DOCUMENTO_ENTRADA_ID", "ETIQUETA_ID", "DOCUMENTO_FINAL_ID",
      "MISSAO_ID",
      "RECEBIDO_POR_NOME", "RECEBIDO_POR_DOC", "RECEBIDO_POR_MATRICULA",
      "DEIXOU_NOME", "DEIXOU_DOC",
      "ACESSORIOS_CONFERIDOS",
      "ULTIMA_MOVIMENTACAO_EM", "PROXIMA_ACAO", "OBSERVACOES",
      "CRIADO_POR", "CRIADO_EM", "ATUALIZADO_POR", "ATUALIZADO_EM"
    ],

    // Trilha de auditoria / histÃ³rico de movimentaÃ§Ãµes
    AST_HISTORICO: [
      "ID", "ATENDIMENTO_ID", "TIPO", "STATUS_ANTERIOR", "STATUS_NOVO",
      "DESCRICAO", "OBSERVACAO", "PROXIMA_ACAO",
      "TECNICO_ANTERIOR_ID", "TECNICO_NOVO_ID",
      "EXECUTADO_POR", "EXECUTADO_EM", "CRIADO_EM"
    ],

    // Fotos com descriÃ§Ã£o individual por foto
    AST_FOTOS: [
      "ID", "ATENDIMENTO_ID", "ETAPA", "TIPO_FOTO", "NOME_ARQUIVO",
      "LINK_DRIVE", "FILE_ID", "MIME_TYPE", "DESCRICAO_FOTO",
      "VISIBILIDADE_PUBLICA", "STATUS", "UPLOAD_POR", "UPLOAD_EM", "CRIADO_EM"
    ],

    // AcessÃ³rios com rastreamento de devoluÃ§Ã£o
    AST_ACESSORIOS: [
      "ID", "ATENDIMENTO_ID", "DESCRICAO", "QUANTIDADE", "ESTADO",
      "OBSERVACAO", "CONFERIDO", "DEVOLVIDO", "DEVOLVIDO_EM",
      "CRIADO_POR", "CRIADO_EM"
    ],

    // Assinaturas digitais (recebimento e entrega)
    AST_ASSINATURAS: [
      "ID", "ATENDIMENTO_ID", "TIPO_ASSINATURA", "ETAPA",
      "SIGNATARIO_NOME", "SIGNATARIO_DOC", "SIGNATARIO_PAPEL",
      "ASSINATURA_BASE64", "IP", "DATA_HORA", "HASH_VALIDACAO",
      "CRIADO_EM"
    ],

    // SolicitaÃ§Ãµes comerciais: peÃ§as, serviÃ§os, terceiro (unifica AST_PECAS)
    // Campos TERCEIRO_ID e LAB_ID preparados para integraÃ§Ã£o futura
    AST_SOLICITACOES: [
      "ID", "ATENDIMENTO_ID", "TIPO", "CATEGORIA",
      "DESCRICAO", "QUANTIDADE", "URGENCIA",
      "JUSTIFICATIVA_TECNICA", "OBSERVACAO",
      "FORNECEDOR_ID", "FORNECEDOR_NOME",
      "VALOR_ESTIMADO", "VALOR_APROVADO",
      "STATUS",
      "SOLICITADO_POR", "SOLICITADO_EM",
      "APROVADO_POR", "APROVADO_EM",
      "RECUSADO_MOTIVO", "RECUSADO_EM",
      "COMPRADO_EM", "RECEBIDO_EM", "INSTALADO_EM",
      "TERCEIRO_ID", "LAB_ID",
      "CRIADO_POR", "CRIADO_EM", "ATUALIZADO_POR", "ATUALIZADO_EM"
    ],

    // Documentos com separaÃ§Ã£o obrigatÃ³ria dos dois QR Codes
    AST_DOCUMENTOS: [
      "ID", "ATENDIMENTO_ID", "TIPO_DOCUMENTO", "NUMERO_DOCUMENTO", "TITULO",
      "FILE_ID", "LINK_ARQUIVO", "DOWNLOAD_URL",
      "HASH_SHA256", "TOKEN_VALIDACAO", "URL_VALIDACAO",
      "QR_CODE_VALIDACAO_LINK", "QR_CODE_ACOMPANHAMENTO_LINK",
      "STATUS", "GERADO_EM", "GERADO_POR", "CRIADO_EM"
    ],

    // Alertas com rastreamento de leitura e resoluÃ§Ã£o
    AST_ALERTAS: [
      "ID", "ATENDIMENTO_ID", "TIPO_ALERTA", "SEVERIDADE",
      "MENSAGEM", "STATUS",
      "DESTINATARIO_ID", "DESTINATARIO_PERFIL",
      "GERADO_EM", "LIDO_EM", "LIDO_POR",
      "RESOLVIDO_EM", "RESOLVIDO_POR",
      "CRIADO_EM"
    ]
  };

  function setupV2() {
    const ss = SGO_DATA.getDB(DB);
    const log = [];
    const SV2 = SGO_CFG.SHEETS;

    // Congela AST_ENTRADAS como AST_ENTRADAS_LEGADO (apenas renomeia, sem apagar)
    const sheetEntradas = ss.getSheetByName("AST_ENTRADAS");
    const sheetLegado   = ss.getSheetByName("AST_ENTRADAS_LEGADO");
    if (sheetEntradas && !sheetLegado) {
      sheetEntradas.setName("AST_ENTRADAS_LEGADO");
      log.push("Renomeada: AST_ENTRADAS â†’ AST_ENTRADAS_LEGADO (congelada)");
    } else if (!sheetEntradas && !sheetLegado) {
      log.push("AST_ENTRADAS nao encontrada â€” nenhuma renomeacao necessaria");
    } else {
      log.push("OK legado: AST_ENTRADAS_LEGADO ja existe");
    }

    // Cria/verifica as 8 tabelas do nÃºcleo V2
    Object.keys(COLUNAS_V2).forEach(function(key) {
      garantirAba_(ss, SV2[key] || key, COLUNAS_V2[key], log);
    });

    if (SGO_DATA.clearCache) SGO_DATA.clearCache();
    return { success: true, message: "Estrutura V2 da Assistencia Tecnica verificada.", log: log };
  }

  // ============================================================
  // ETAPA 2 â€” BACKEND CORE V2
  // ============================================================

  const TRANSICOES_V2 = {
    ENTRADA_REGISTRADA:           ["AGUARDANDO_DIAGNOSTICO", "EM_BANCADA", "CANCELADO"],
    AGUARDANDO_DIAGNOSTICO:       ["EM_BANCADA", "CANCELADO"],
    EM_BANCADA:                   ["DIAGNOSTICO_EM_ANDAMENTO", "DIAGNOSTICO_CONCLUIDO", "CANCELADO"],
    DIAGNOSTICO_EM_ANDAMENTO:     ["DIAGNOSTICO_CONCLUIDO", "CANCELADO"],
    DIAGNOSTICO_CONCLUIDO:        ["AGUARDANDO_ORCAMENTO", "LIBERADO_PARA_EXECUCAO", "CANCELADO"],
    AGUARDANDO_ORCAMENTO:         ["ORCAMENTO_ENVIADO", "CANCELADO"],
    ORCAMENTO_ENVIADO:            ["AGUARDANDO_APROVACAO_CLIENTE", "ORCAMENTO_APROVADO", "CANCELADO"],
    AGUARDANDO_APROVACAO_CLIENTE: ["ORCAMENTO_APROVADO", "ORCAMENTO_RECUSADO", "CANCELADO"],
    ORCAMENTO_APROVADO:           ["AGUARDANDO_PECA", "AGUARDANDO_TERCEIRO", "LIBERADO_PARA_EXECUCAO", "CANCELADO"],
    ORCAMENTO_RECUSADO:           ["NAO_REPARADO", "AGUARDANDO_ENTREGA", "CANCELADO"],
    AGUARDANDO_PECA:              ["LIBERADO_PARA_EXECUCAO", "CANCELADO"],
    AGUARDANDO_TERCEIRO:          ["LIBERADO_PARA_EXECUCAO", "CANCELADO"],
    LIBERADO_PARA_EXECUCAO:       ["EXECUCAO_EM_ANDAMENTO", "CANCELADO"],
    EXECUCAO_EM_ANDAMENTO:        ["EXECUCAO_CONCLUIDA", "CANCELADO"],
    EXECUCAO_CONCLUIDA:           ["AGUARDANDO_CALIBRACAO", "CONCLUIDO_TECNICAMENTE", "CANCELADO"],
    AGUARDANDO_CALIBRACAO:        ["CONCLUIDO_TECNICAMENTE", "CANCELADO"],
    CONCLUIDO_TECNICAMENTE:       ["AGUARDANDO_ENTREGA", "CANCELADO"],
    AGUARDANDO_ENTREGA:           ["ENTREGUE", "CANCELADO"],
    ENTREGUE:                     [],
    CANCELADO:                    [],
    NAO_REPARADO:                 ["AGUARDANDO_ENTREGA", "CANCELADO"]
  };

  function v2Protocolo_() {
    const d = new Date();
    const data = Utilities.formatDate(d, "America/Sao_Paulo", "yyyyMMdd");
    return "AT-" + data + "-" + String(Date.now()).slice(-4);
  }

  function v2Token_() {
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5,
      String(Date.now()) + String(Math.random())
    );
    return bytes.map(function(b) { return ("0" + (b & 0xff).toString(16)).slice(-2); })
      .join("").substring(0, 16).toUpperCase();
  }

  function v2Bandeira_(status) { return BANDEIRA_V2[status] || "AZUL_CINZA"; }

  function v2ProximaAcao_(status) { return PROXIMA_ACAO_V2[status] || ""; }

  function v2StatusValido_(statusAtual, statusNovo) {
    return (TRANSICOES_V2[statusAtual] || []).indexOf(statusNovo) !== -1;
  }

  function v2SolicitacaoDescricao_(solicitacao) {
    return safe_(solicitacao && (solicitacao.DESCRICAO || solicitacao.OBSERVACAO)) || "Solicitacao";
  }

  function v2SolicitacaoAtiva_(solicitacao) {
    return ["CANCELADO", "RECUSADO", "RECEBIDO", "INSTALADO"].indexOf(upper_(solicitacao.STATUS)) === -1;
  }

  function v2RegistrarHistorico_(atendimentoId, statusAnterior, statusNovo, descricao, autorId, autorNome, tipoEvento, payload) {
    SGO_DATA.insert(S.AST_HISTORICO, SGO_DATA.gerarRegistroBase({
      ATENDIMENTO_ID: atendimentoId || "",
      TIPO: tipoEvento || "STATUS",
      STATUS_ANTERIOR: statusAnterior || "",
      STATUS_NOVO: statusNovo || "",
      DESCRICAO: descricao || "",
      OBSERVACAO: payload ? JSON.stringify(payload) : "",
      PROXIMA_ACAO: statusNovo ? v2ProximaAcao_(statusNovo) : "",
      TECNICO_ANTERIOR_ID: "",
      TECNICO_NOVO_ID: "",
      EXECUTADO_POR: autorId || autorNome || "",
      EXECUTADO_EM: now_()
    }), DB);
  }

  function v2AtualizarStatus_(atendimentoId, statusNovo, descricao, autorId, autorNome) {
    const atual = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atual) throw new Error("Atendimento nao encontrado: " + atendimentoId);
    if (!v2StatusValido_(atual.STATUS, statusNovo)) {
      throw new Error("Transicao invalida: " + atual.STATUS + " -> " + statusNovo);
    }
    SGO_DATA.update(S.AST_ATENDIMENTOS, atendimentoId, {
      STATUS: statusNovo,
      BANDEIRA: v2Bandeira_(statusNovo),
      PROXIMA_ACAO: v2ProximaAcao_(statusNovo),
      ULTIMA_MOVIMENTACAO_EM: now_(),
      ATUALIZADO_POR: autorId || "",
      ATUALIZADO_EM: now_()
    }, DB);
    v2RegistrarHistorico_(atendimentoId, atual.STATUS, statusNovo, descricao, autorId, autorNome, "STATUS");
  }

  function v2CriarAlerta_(tipo, atendimentoId, titulo, descricao, destinatarioId, prioridade) {
    try {
      const alertas = SGO_DATA.getManyByField(S.AST_ALERTAS, "ATENDIMENTO_ID", atendimentoId || "", DB) || [];
      const existente = alertas.some(function(al) {
        const aberto = ["ABERTO", "PENDENTE"].indexOf(upper_(al.STATUS)) !== -1;
        return aberto &&
          safe_(al.TIPO_ALERTA) === safe_(tipo || "GERAL") &&
          safe_(al.DESTINATARIO_ID) === safe_(destinatarioId || "");
      });
      if (existente) return null;
      SGO_DATA.insert(S.AST_ALERTAS, SGO_DATA.gerarRegistroBase({
        ATENDIMENTO_ID: atendimentoId || "",
        TIPO_ALERTA: tipo || "GERAL",
        SEVERIDADE: prioridade || "NORMAL",
        MENSAGEM: [titulo || "", descricao || ""].filter(Boolean).join(" - "),
        STATUS: "PENDENTE",
        DESTINATARIO_ID: destinatarioId || "",
        DESTINATARIO_PERFIL: "",
        GERADO_EM: now_(),
        LIDO_EM: "", LIDO_POR: "", RESOLVIDO_EM: "", RESOLVIDO_POR: ""
      }), DB);
    } catch (e) { log_("v2CriarAlerta_: " + e.message); }
  }

  function v2EnriquecerAtendimento_(atendimento) {
    if (!atendimento) return null;
    const r = JSON.parse(JSON.stringify(atendimento));
    r._bandeira = v2Bandeira_(r.STATUS);
    r._proxima_acao = v2ProximaAcao_(r.STATUS);
    r._url_publico = r.URL_PUBLICA || (r.QR_TOKEN_ACOMPANHAMENTO ? montarUrlPublica_(r.QR_TOKEN_ACOMPANHAMENTO) : "");
    if (!r.CLIENTE_NOME && r.CLIENTE_ID) {
      try { var c_ = SGO_DATA.getById(S.CAD_CLIENTES, r.CLIENTE_ID); if (c_) r.CLIENTE_NOME = safe_(c_.NOME_FANTASIA || c_.RAZAO_SOCIAL || c_.NOME); } catch (e_) {}
    }
    if (!r.UNIDADE_NOME && r.UNIDADE_ID) {
      try { var u_ = SGO_DATA.getById(S.CAD_UNIDADES, r.UNIDADE_ID); if (u_) r.UNIDADE_NOME = safe_(u_.NOME || u_.NOME_UNIDADE || u_.DESCRICAO); } catch (e_) {}
    }
    if (!r.EQUIPAMENTO_NOME && r.EQUIPAMENTO_ID) {
      try { var eq_ = SGO_DATA.getById(S.CAD_EQUIPAMENTOS, r.EQUIPAMENTO_ID); if (eq_) r.EQUIPAMENTO_NOME = safe_([eq_.TAG, eq_.TIPO, eq_.MODELO].filter(Boolean).join(" - ") || eq_.NOME || eq_.DESCRICAO); } catch (e_) {}
    }
    if (!r.TECNICO_NOME && r.TECNICO_ID) {
      try { var t_ = SGO_DATA.getById(S.CAD_TECNICOS, r.TECNICO_ID); if (t_) r.TECNICO_NOME = safe_(nomePessoa_(t_)); } catch (e_) {}
    }
    return r;
  }

  function v2MissaoStub_(atendimentoId, tecnicoId, titulo) {
    try {
      const missao = SGO_DATA.insert(S.AGD_MISSOES, SGO_DATA.gerarRegistroBase({
        TIPO: "ASSISTENCIA_TECNICA",
        STATUS: "PENDENTE",
        TECNICO_ID: tecnicoId || "",
        TITULO: titulo || "Atendimento AST",
        ATENDIMENTO_AST_ID: atendimentoId || "",
        OS_ID: ""
      }), "OS");
      return missao && missao.ID ? missao.ID : "";
    } catch (e) { log_("v2MissaoStub_: nao criada (nao bloqueante) â€” " + e.message); }
    log_("v2MissaoStub_", "SISTEMA", "Missao nao criada para atendimentoId=" + safe_(atendimentoId) + " tecnicoId=" + safe_(tecnicoId) + " (nao bloqueante).");
    return "";
  }

  function v2ResolverContextoEntrada_(sessao, p) {
    const provis = simNao_(p.CADASTRO_PROVISORIO) === "S";
    const cliente = p.CLIENTE_ID ? SGO_DATA.getById(S.CAD_CLIENTES, p.CLIENTE_ID) : null;
    const unidade = p.UNIDADE_ID ? SGO_DATA.getById(S.CAD_UNIDADES, p.UNIDADE_ID) : null;
    const equipamento = p.EQUIPAMENTO_ID ? SGO_DATA.getById(S.CAD_EQUIPAMENTOS, p.EQUIPAMENTO_ID) : null;
    const tecnico = p.TECNICO_ID ? SGO_DATA.getById(S.CAD_TECNICOS, p.TECNICO_ID) : null;
    return {
      provis: provis,
      cliente: cliente,
      unidade: unidade,
      equipamento: equipamento,
      tecnico: tecnico,
      clienteNome: provis ? safe_(p.CLIENTE_PROVISORIO) : safe_(p.CLIENTE_NOME || (cliente && (cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL || cliente.NOME))),
      unidadeNome: provis ? safe_(p.UNIDADE_PROVISORIA) : safe_(p.UNIDADE_NOME || (unidade && (unidade.NOME || unidade.UNIDADE || unidade.DESCRICAO))),
      equipamentoNome: provis ? safe_(p.EQUIPAMENTO_PROVISORIO || p.EQUIPAMENTO_DESCRICAO || p.EQUIPAMENTO_NOME) : safe_(p.EQUIPAMENTO_NOME || p.EQUIPAMENTO_DESCRICAO || (equipamento && (equipamento.NOME || equipamento.DESCRICAO || equipamento.TAG || equipamento.PATRIMONIO))),
      equipamentoModelo: safe_(p.EQUIPAMENTO_MODELO || (equipamento && equipamento.MODELO)),
      equipamentoMarca: safe_(p.EQUIPAMENTO_MARCA || (equipamento && equipamento.MARCA)),
      numeroSerie: safe_(p.NUMERO_SERIE || p.EQUIPAMENTO_NS || p.NUMERO_SERIE_INFORMADO || (equipamento && (equipamento.NUMERO_SERIE || equipamento.SERIE))),
      tecnicoNome: safe_(p.TECNICO_NOME || (tecnico && nomePessoa_(tecnico)))
    };
  }

  function v2ValidarPayloadEntrada_(sessao, p, ctx) {
    const erros = [];
    const acessorios = Array.isArray(p.ACESSORIOS) ? p.ACESSORIOS : [];
    if (ctx.provis) {
      if (!p.CLIENTE_PROVISORIO) erros.push("CLIENTE_PROVISORIO obrigatorio em cadastro provisorio");
      if (!p.UNIDADE_PROVISORIA) erros.push("UNIDADE_PROVISORIA obrigatoria em cadastro provisorio");
      if (!p.EQUIPAMENTO_PROVISORIO && !p.EQUIPAMENTO_DESCRICAO && !p.EQUIPAMENTO_NOME) erros.push("EQUIPAMENTO_PROVISORIO obrigatorio em cadastro provisorio");
    } else {
      if (!p.CLIENTE_ID) erros.push("CLIENTE_ID obrigatorio");
      if (!p.UNIDADE_ID) erros.push("UNIDADE_ID obrigatorio");
      if (!p.EQUIPAMENTO_ID && !p.EQUIPAMENTO_DESCRICAO && !p.EQUIPAMENTO_NOME) erros.push("EQUIPAMENTO_ID ou EQUIPAMENTO_DESCRICAO obrigatorio");
      if (p.CLIENTE_ID && !ctx.cliente) erros.push("CLIENTE_ID nao encontrado");
      if (p.UNIDADE_ID && !ctx.unidade) erros.push("UNIDADE_ID nao encontrada");
      if (p.EQUIPAMENTO_ID && !ctx.equipamento) erros.push("EQUIPAMENTO_ID nao encontrado");
      if (ctx.cliente && !podeVerCliente_(sessao, p.CLIENTE_ID)) erros.push("Acesso negado ao cliente informado");
      if (ctx.unidade && p.CLIENTE_ID && safe_(ctx.unidade.CLIENTE_ID) && safe_(ctx.unidade.CLIENTE_ID) !== safe_(p.CLIENTE_ID)) erros.push("UNIDADE_ID nao pertence ao CLIENTE_ID informado");
      if (ctx.equipamento && p.CLIENTE_ID && safe_(ctx.equipamento.CLIENTE_ID) && safe_(ctx.equipamento.CLIENTE_ID) !== safe_(p.CLIENTE_ID)) erros.push("EQUIPAMENTO_ID nao pertence ao CLIENTE_ID informado");
      if (ctx.equipamento && p.UNIDADE_ID && safe_(ctx.equipamento.UNIDADE_ID) && safe_(ctx.equipamento.UNIDADE_ID) !== safe_(p.UNIDADE_ID)) erros.push("EQUIPAMENTO_ID nao pertence a UNIDADE_ID informada");
    }
    if (!p.PROBLEMA_RELATADO) erros.push("PROBLEMA_RELATADO obrigatorio");
    if (!p.CONDICAO_FISICA) erros.push("CONDICAO_FISICA obrigatoria");
    if (!p.TECNICO_ID) erros.push("TECNICO_ID obrigatorio");
    if (p.TECNICO_ID && !ctx.tecnico) erros.push("TECNICO_ID nao encontrado");
    if (ctx.tecnico && !ativo_(ctx.tecnico.STATUS)) erros.push("TECNICO_ID inativo");
    if (simNao_(p.ACESSORIOS_CONFERIDOS) !== "S") erros.push("ACESSORIOS_CONFERIDOS deve ser S");
    if (!acessorios.length && simNao_(p.SEM_ACESSORIOS) !== "S") erros.push("Informe acessorios recebidos ou marque SEM_ACESSORIOS = S");
    return erros;
  }

  function v2AcessoriosEntrada_(p) {
    const itens = Array.isArray(p.ACESSORIOS) ? p.ACESSORIOS.slice() : [];
    if (!itens.length && simNao_(p.SEM_ACESSORIOS) === "S") {
      itens.push({ DESCRICAO: "Sem acessorios", QUANTIDADE: 0, ESTADO: "NAO_APLICAVEL", OBSERVACAO: safe_(p.OBSERVACOES_ACESSORIOS) });
    }
    return itens;
  }

  function v2SalvarAcessoriosEntrada_(sessao, atendimentoId, acessorios) {
    return (acessorios || []).map(function(a) {
      return SGO_DATA.insert(S.AST_ACESSORIOS, SGO_DATA.gerarRegistroBase({
        ATENDIMENTO_ID: atendimentoId,
        DESCRICAO: safe_(a.DESCRICAO || a.descricao || "Sem descricao"),
        QUANTIDADE: a.QUANTIDADE !== undefined ? a.QUANTIDADE : (a.quantidade !== undefined ? a.quantidade : 1),
        ESTADO: upper_(a.ESTADO || a.estado || "RECEBIDO"),
        OBSERVACAO: safe_(a.OBSERVACAO || a.observacao),
        CONFERIDO: "S",
        DEVOLVIDO: "N",
        DEVOLVIDO_EM: "",
        CRIADO_POR: safe_(sessao.userId || sessao.usuario)
      }), DB);
    });
  }

  function v2FotosEntrada_(p) {
    let fotos = [];
    ["FOTOS", "EVIDENCIAS", "FOTOS_ENTRADA"].forEach(function(campo) {
      if (Array.isArray(p[campo])) fotos = fotos.concat(p[campo]);
    });
    if (p.FOTO_URL || p.FOTO_LINK || p.FILE_ID || p.BASE64_FOTO) {
      fotos.push({
        URL: p.FOTO_URL || p.FOTO_LINK,
        FILE_ID: p.FILE_ID,
        BASE64: p.BASE64_FOTO,
        MIME_TYPE: p.MIME_TYPE_FOTO,
        TIPO_FOTO: "CONDICAO_INICIAL",
        DESCRICAO: p.DESCRICAO_FOTO || "Condicao visual inicial"
      });
    }
    return fotos;
  }

  function v2SalvarFotoEntradaInicial_(sessao, atendimento, foto) {
    const f = foto || {};
    let link = safe_(f.URL || f.LINK_DRIVE || f.FOTO_LINK || f.link || f.url);
    let fileId = safe_(f.FILE_ID || f.fileId);
    const nomeArquivo = safe_(f.NOME_ARQUIVO || f.nomeArquivo || ("ast_entrada_" + atendimento.ID + "_" + Date.now() + ".jpg"));
    const mime = safe_(f.MIME_TYPE || f.mimeType || "image/jpeg");
    if (f.BASE64) {
      try {
        const blob = Utilities.newBlob(Utilities.base64Decode(limparBase64_(f.BASE64)), mime, nomeArquivo);
        const file = pastaAst_().createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileId = file.getId();
        link = file.getUrl();
      } catch (e) {
        log_("AST_V2_FOTO_ENTRADA_UPLOAD_ERRO", safe_(sessao.userId || sessao.usuario), e.message);
      }
    }
    if (!link && !fileId) return null;
    return SGO_DATA.insert(S.AST_FOTOS, SGO_DATA.gerarRegistroBase({
      ATENDIMENTO_ID: atendimento.ID,
      ETAPA: STATUS_V2.ENTRADA_REGISTRADA,
      TIPO_FOTO: upper_(f.TIPO_FOTO || f.tipo || "CONDICAO_INICIAL"),
      NOME_ARQUIVO: nomeArquivo,
      LINK_DRIVE: link,
      FILE_ID: fileId,
      MIME_TYPE: mime,
      DESCRICAO_FOTO: safe_(f.DESCRICAO || f.descricao || "Evidencia inicial da entrada"),
      VISIBILIDADE_PUBLICA: simNao_(f.VISIBILIDADE_PUBLICA),
      STATUS: "ATIVA",
      UPLOAD_POR: safe_(sessao.userId || sessao.usuario),
      UPLOAD_EM: now_()
    }), DB);
  }

  function v2SalvarFotosEntrada_(sessao, atendimento, fotos) {
    const salvas = [];
    (fotos || []).forEach(function(f) {
      const reg = v2SalvarFotoEntradaInicial_(sessao, atendimento, f);
      if (reg) salvas.push(reg);
    });
    return salvas;
  }

  function v2SalvarAssinaturaRecebimento_(sessao, atendimento, p) {
    if (!p.ASSINATURA_RECEBIMENTO_BASE64 && !p.ASSINATURA_BASE64) return null;
    return SGO_DATA.insert(S.AST_ASSINATURAS, SGO_DATA.gerarRegistroBase({
      ATENDIMENTO_ID: atendimento.ID,
      TIPO_ASSINATURA: "RECEBIMENTO",
      ETAPA: STATUS_V2.ENTRADA_REGISTRADA,
      SIGNATARIO_NOME: safe_(p.RECEBIDO_POR_NOME || p.DEIXOU_NOME || sessao.nome),
      SIGNATARIO_DOC: safe_(p.RECEBIDO_POR_DOC || p.DEIXOU_DOC),
      SIGNATARIO_PAPEL: "RECEBIMENTO_EQUIPAMENTO",
      ASSINATURA_BASE64: safe_(p.ASSINATURA_RECEBIMENTO_BASE64 || p.ASSINATURA_BASE64),
      IP: safe_(p.IP),
      DATA_HORA: now_(),
      HASH_VALIDACAO: sha256_(safe_(p.ASSINATURA_RECEBIMENTO_BASE64 || p.ASSINATURA_BASE64) + atendimento.ID + now_())
    }), DB);
  }

  function v2PacoteAtendimento_(atendimentoId) {
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    return {
      atendimento: v2EnriquecerAtendimento_(atendimento),
      historico: SGO_DATA.getManyByField(S.AST_HISTORICO, "ATENDIMENTO_ID", atendimentoId, DB) || [],
      acessorios: SGO_DATA.getManyByField(S.AST_ACESSORIOS, "ATENDIMENTO_ID", atendimentoId, DB) || [],
      fotos: SGO_DATA.getManyByField(S.AST_FOTOS, "ATENDIMENTO_ID", atendimentoId, DB) || [],
      alertas: SGO_DATA.getManyByField(S.AST_ALERTAS, "ATENDIMENTO_ID", atendimentoId, DB) || [],
      assinaturas: SGO_DATA.getManyByField(S.AST_ASSINATURAS, "ATENDIMENTO_ID", atendimentoId, DB) || []
    };
  }

  function criarEntradaV2(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "GERENCIAR_ENTRADAS");
    if (!perm.success) return perm;
    const p = payload || {};
    const ctx = v2ResolverContextoEntrada_(sessao, p);
    const erros = v2ValidarPayloadEntrada_(sessao, p, ctx);
    if (erros.length) return erro_("Dados invalidos: " + erros.join("; "));
    const acessoriosEntrada = v2AcessoriosEntrada_(p);
    const fotosEntrada = v2FotosEntrada_(p);
    const protocolo = v2Protocolo_();
    const tokenAcompanhamento = v2Token_();
    const urlPublica = montarUrlPublica_(tokenAcompanhamento);
    const qrAcompanhamento = QR_API + encodeURIComponent(urlPublica);
    const tecnicoId = safe_(p.TECNICO_ID);
    const usuario = safe_(sessao.userId || sessao.usuario);
    const reg = SGO_DATA.insert(S.AST_ATENDIMENTOS, SGO_DATA.gerarRegistroBase({
      PROTOCOLO:               protocolo,
      CLIENTE_ID:              safe_(p.CLIENTE_ID),
      CLIENTE_NOME:            ctx.clienteNome,
      UNIDADE_ID:              safe_(p.UNIDADE_ID),
      UNIDADE_NOME:            ctx.unidadeNome,
      EQUIPAMENTO_ID:          safe_(p.EQUIPAMENTO_ID),
      EQUIPAMENTO_NOME:        ctx.equipamentoNome,
      EQUIPAMENTO_MODELO:      ctx.equipamentoModelo,
      EQUIPAMENTO_MARCA:       ctx.equipamentoMarca,
      NUMERO_SERIE:            ctx.numeroSerie,
      CADASTRO_PROVISORIO:     ctx.provis ? "S" : "N",
      CLIENTE_PROVISORIO:      safe_(p.CLIENTE_PROVISORIO),
      UNIDADE_PROVISORIA:      safe_(p.UNIDADE_PROVISORIA),
      EQUIPAMENTO_PROVISORIO:  safe_(p.EQUIPAMENTO_PROVISORIO),
      CONDICAO_FISICA:         safe_(p.CONDICAO_FISICA),
      PROBLEMA_RELATADO:       safe_(p.PROBLEMA_RELATADO),
      PRIORIDADE:              upper_(p.PRIORIDADE || "NORMAL"),
      PRAZO_PROMETIDO:         safe_(p.PRAZO_PROMETIDO || p.PRAZO_ESTIMADO),
      TECNICO_ID:              tecnicoId,
      TECNICO_NOME:            ctx.tecnicoNome,
      STATUS:                  STATUS_V2.ENTRADA_REGISTRADA,
      BANDEIRA:                v2Bandeira_(STATUS_V2.ENTRADA_REGISTRADA),
      LOCALIZACAO_ATUAL:       "ASSISTENCIA_TECNICA",
      QR_TOKEN_ACOMPANHAMENTO: tokenAcompanhamento,
      QR_URL_ACOMPANHAMENTO:   qrAcompanhamento,
      URL_PUBLICA:             urlPublica,
      DOCUMENTO_ENTRADA_ID:    "",
      ETIQUETA_ID:             "",
      DOCUMENTO_FINAL_ID:      "",
      MISSAO_ID:               "",
      RECEBIDO_POR_NOME:       safe_(p.RECEBIDO_POR_NOME || sessao.nome),
      RECEBIDO_POR_DOC:        safe_(p.RECEBIDO_POR_DOC),
      RECEBIDO_POR_MATRICULA:  safe_(p.RECEBIDO_POR_MATRICULA),
      DEIXOU_NOME:             safe_(p.DEIXOU_NOME),
      DEIXOU_DOC:              safe_(p.DEIXOU_DOC),
      ACESSORIOS_CONFERIDOS:   "S",
      ULTIMA_MOVIMENTACAO_EM:  now_(),
      PROXIMA_ACAO:            v2ProximaAcao_(STATUS_V2.ENTRADA_REGISTRADA),
      OBSERVACOES:             safe_(p.OBSERVACOES || p.OBSERVACOES_ENTRADA || p.ACESSORIOS_TEXTO),
      CRIADO_POR:              usuario,
      ATUALIZADO_POR:          usuario,
      ATUALIZADO_EM:           now_()
    }), DB);
    const acessoriosSalvos = v2SalvarAcessoriosEntrada_(sessao, reg.ID, acessoriosEntrada);
    const fotosSalvas = v2SalvarFotosEntrada_(sessao, reg, fotosEntrada);
    const assinaturaRecebimento = v2SalvarAssinaturaRecebimento_(sessao, reg, p);
    v2RegistrarHistorico_(reg.ID, "", STATUS_V2.ENTRADA_REGISTRADA,
      "Entrada registrada via sistema", sessao.userId, sessao.nome, "ENTRADA", {
        protocolo: protocolo,
        clienteId: safe_(p.CLIENTE_ID),
        unidadeId: safe_(p.UNIDADE_ID),
        equipamentoId: safe_(p.EQUIPAMENTO_ID),
        acessorios: acessoriosSalvos.length,
        fotos: fotosSalvas.length,
        assinaturaRecebimento: assinaturaRecebimento ? "S" : "N"
      });
    if (acessoriosSalvos.length) {
      v2RegistrarHistorico_(reg.ID, STATUS_V2.ENTRADA_REGISTRADA, STATUS_V2.ENTRADA_REGISTRADA,
        "Acessorios registrados na entrada: " + acessoriosSalvos.length,
        sessao.userId, sessao.nome, "ACESSORIOS_REGISTRADOS", {
          quantidade: acessoriosSalvos.length,
          ids: acessoriosSalvos.map(function(a) { return a.ID; })
        });
    }
    if (fotosSalvas.length) {
      v2RegistrarHistorico_(reg.ID, STATUS_V2.ENTRADA_REGISTRADA, STATUS_V2.ENTRADA_REGISTRADA,
        "Evidencias iniciais registradas: " + fotosSalvas.length,
        sessao.userId, sessao.nome, "EVIDENCIAS_INICIAIS_REGISTRADAS", {
          quantidade: fotosSalvas.length,
          ids: fotosSalvas.map(function(f) { return f.ID; })
        });
    }
    if (assinaturaRecebimento) {
      v2RegistrarHistorico_(reg.ID, STATUS_V2.ENTRADA_REGISTRADA, STATUS_V2.ENTRADA_REGISTRADA,
        "Assinatura de recebimento registrada",
        sessao.userId, sessao.nome, "ASSINATURA_RECEBIMENTO_REGISTRADA", {
          assinaturaId: assinaturaRecebimento.ID
        });
    }
    const missaoId = v2MissaoStub_(reg.ID, tecnicoId, "Atendimento AST " + protocolo);
    if (missaoId) {
      SGO_DATA.update(S.AST_ATENDIMENTOS, reg.ID, {
        MISSAO_ID: missaoId,
        ATUALIZADO_POR: usuario,
        ATUALIZADO_EM: now_()
      }, DB);
      v2RegistrarHistorico_(reg.ID, STATUS_V2.ENTRADA_REGISTRADA, STATUS_V2.ENTRADA_REGISTRADA,
        "Missao tecnica vinculada ao atendimento", sessao.userId, sessao.nome, "MISSAO", { missaoId: missaoId });
    } else {
      v2RegistrarHistorico_(reg.ID, STATUS_V2.ENTRADA_REGISTRADA, STATUS_V2.ENTRADA_REGISTRADA,
        "Missao tecnica pendente de criacao automatica", sessao.userId, sessao.nome, "MISSAO", { tecnicoId: tecnicoId });
    }
    v2CriarAlerta_("NOVA_ENTRADA", reg.ID,
      "Nova entrada registrada", "Protocolo " + protocolo + " aguarda diagnostico",
      tecnicoId, upper_(p.PRIORIDADE) === "CRITICA" ? "ALTA" : "NORMAL");
    if (upper_(p.PRIORIDADE) === "CRITICA") {
      v2CriarAlerta_("ENTRADA_CRITICA", reg.ID,
        "Entrada critica registrada", "Protocolo " + protocolo + " exige acompanhamento prioritario",
        tecnicoId, "ALTA");
    }
    log_("AST_V2_ENTRADA_CRIAR", usuario, "Entrada V2 " + protocolo + " criada para atendimento " + reg.ID);
    const pacote = v2PacoteAtendimento_(reg.ID);
    return {
      success: true,
      message: "Entrada V2 registrada.",
      id: reg.ID,
      protocolo: protocolo,
      missaoId: missaoId,
      data: pacote.atendimento,
      atendimento: pacote.atendimento,
      acessorios: pacote.acessorios,
      fotos: pacote.fotos,
      historico: pacote.historico,
      alertas: pacote.alertas,
      assinaturas: pacote.assinaturas,
      acompanhamento: {
        token: tokenAcompanhamento,
        url: urlPublica,
        qrUrl: qrAcompanhamento
      }
    };
  }

  function listarAtendimentosV2(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    const f = filtros || {};
    let todos = SGO_DATA.getAll(S.AST_ATENDIMENTOS, DB) || [];
    if (perfilAst_(sessao) === "TECNICO") {
      todos = todos.filter(function(a) { return safe_(a.TECNICO_ID) === safe_(sessao.userId); });
    }
    if (f.STATUS)     todos = todos.filter(function(a) { return a.STATUS === f.STATUS; });
    if (f.TECNICO_ID) todos = todos.filter(function(a) { return safe_(a.TECNICO_ID) === safe_(f.TECNICO_ID); });
    if (f.CLIENTE_ID) todos = todos.filter(function(a) { return safe_(a.CLIENTE_ID) === safe_(f.CLIENTE_ID); });
    if (f.BANDEIRA)   todos = todos.filter(function(a) { return a.BANDEIRA === f.BANDEIRA; });
    return { success: true, data: todos.map(v2EnriquecerAtendimento_) };
  }

  function obterAtendimentoV2(sessionId, atendimentoId) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    return {
      success: true,
      data:         v2EnriquecerAtendimento_(atendimento),
      historico:    SGO_DATA.getManyByField(S.AST_HISTORICO,    "ATENDIMENTO_ID", atendimentoId, DB) || [],
      fotos:        SGO_DATA.getManyByField(S.AST_FOTOS,        "ATENDIMENTO_ID", atendimentoId, DB) || [],
      acessorios:   SGO_DATA.getManyByField(S.AST_ACESSORIOS,   "ATENDIMENTO_ID", atendimentoId, DB) || [],
      solicitacoes: SGO_DATA.getManyByField(S.AST_SOLICITACOES, "ATENDIMENTO_ID", atendimentoId, DB) || [],
      alertas:      SGO_DATA.getManyByField(S.AST_ALERTAS,      "ATENDIMENTO_ID", atendimentoId, DB) || []
    };
  }

  function iniciarAvaliacaoV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    const p = payload || {};
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    if (atendimento.STATUS === STATUS_V2.ENTRADA_REGISTRADA) {
      SGO_DATA.update(S.AST_ATENDIMENTOS, atendimentoId, {
        STATUS: STATUS_V2.AGUARDANDO_DIAGNOSTICO,
        BANDEIRA: v2Bandeira_(STATUS_V2.AGUARDANDO_DIAGNOSTICO),
        PROXIMA_ACAO: v2ProximaAcao_(STATUS_V2.AGUARDANDO_DIAGNOSTICO),
        ULTIMA_MOVIMENTACAO_EM: now_(),
        ATUALIZADO_POR: safe_(sessao.userId || sessao.usuario),
        ATUALIZADO_EM: now_()
      }, DB);
      v2RegistrarHistorico_(atendimentoId, STATUS_V2.ENTRADA_REGISTRADA, STATUS_V2.AGUARDANDO_DIAGNOSTICO,
        "Equipamento recebido para avaliacao", sessao.userId, sessao.nome, "STATUS");
    }
    v2AtualizarStatus_(atendimentoId, STATUS_V2.EM_BANCADA,
      safe_(p.observacoes) || "Equipamento em bancada para avaliacao tecnica",
      sessao.userId, sessao.nome);
    return { success: true, data: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)) };
  }

  function registrarEvidenciaV2(sessionId, atendimentoId, payload) {
    var sessao = exigirSessao(sessionId);
    var perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    var p = payload || {};
    var descricao = safe_(p.DESCRICAO || p.descricao || "");
    if (!descricao) return erro_("Descricao da evidencia obrigatoria");
    var tipoEvidencia = safe_(p.TIPO_FOTO || p.TIPO || "EVIDENCIA_TECNICA");
    var visibilidade = safe_(p.VISIBILIDADE_PUBLICA || "N");
    var obs = ["Tipo: " + tipoEvidencia, "Visibilidade: " + (visibilidade === "S" ? "Publica" : "Interna")].join(" | ");
    SGO_DATA.insert(S.AST_HISTORICO, SGO_DATA.gerarRegistroBase({
      ATENDIMENTO_ID: atendimentoId || "",
      TIPO: "EVIDENCIA",
      STATUS_ANTERIOR: "",
      STATUS_NOVO: "",
      DESCRICAO: descricao,
      OBSERVACAO: obs,
      PROXIMA_ACAO: "",
      TECNICO_ANTERIOR_ID: "",
      TECNICO_NOVO_ID: "",
      EXECUTADO_POR: safe_(sessao.userId || sessao.nome || ""),
      EXECUTADO_EM: now_()
    }), DB);
    return { success: true };
  }

  function atualizarStatusV2(sessionId, atendimentoId, payload) {
    var sessao = exigirSessao(sessionId);
    var perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    var p = payload || {};
    var statusNovo = safe_(p.STATUS || p.status || "");
    var descricao = safe_(p.DESCRICAO || p.descricao || "Atualizacao de status");
    if (!statusNovo) return erro_("STATUS nao informado");
    try {
      v2AtualizarStatus_(atendimentoId, statusNovo, descricao, sessao.userId, sessao.nome);
      return { success: true, data: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)) };
    } catch (e) {
      return erro_(e.message);
    }
  }

  function salvarDiagnosticoV2(sessionId, atendimentoId, payload) {
    var sessao = exigirSessao(sessionId);
    var perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    var p = payload || {};
    var atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    var statusAtual = atendimento.STATUS;

    // Resumo textual para AST_HISTORICO.DESCRICAO (max 250 chars)
    var partes = [];
    if (p.DEFEITO_CONFIRMADO) partes.push("Defeito: " + safe_(p.DEFEITO_CONFIRMADO).substring(0, 100));
    if (p.CAUSA_PROVAVEL)     partes.push("Causa: "   + safe_(p.CAUSA_PROVAVEL).substring(0, 100));
    if (p.RECOMENDACAO_TECNICA) partes.push("Rec: "   + safe_(p.RECOMENDACAO_TECNICA).substring(0, 80));
    var flags = [];
    if (p.NECESSITA_PECA        === "S") flags.push("Peca");
    if (p.NECESSITA_TERCEIRO    === "S") flags.push("Terceiro");
    if (p.NECESSITA_LABORATORIO === "S") flags.push("Lab");
    if (p.RISCO_CRITICO         === "S") flags.push("RISCO_CRITICO");
    if (flags.length) partes.push("Flags: " + flags.join(", "));
    if (!partes.length) partes.push("Diagnostico tecnico registrado");
    var resumo = partes.join(" | ").substring(0, 250);

    // Payload completo para AST_HISTORICO.OBSERVACAO (serializado por v2RegistrarHistorico_)
    var obsPayload = {
      defeito:              safe_(p.DEFEITO_CONFIRMADO),
      causa:                safe_(p.CAUSA_PROVAVEL),
      recomendacao:         safe_(p.RECOMENDACAO_TECNICA),
      necessita_peca:       p.NECESSITA_PECA        || "N",
      necessita_terceiro:   p.NECESSITA_TERCEIRO    || "N",
      necessita_laboratorio:p.NECESSITA_LABORATORIO || "N",
      risco_critico:        p.RISCO_CRITICO         || "N",
      observacoes:          safe_(p.OBSERVACOES)
    };

    // Determinar status alvo
    var statusNovo = safe_(p.STATUS_APOS_DIAGNOSTICO || "");
    if (!statusNovo) {
      if (statusAtual === STATUS_V2.EM_BANCADA || statusAtual === STATUS_V2.AGUARDANDO_DIAGNOSTICO) {
        statusNovo = STATUS_V2.DIAGNOSTICO_EM_ANDAMENTO;
      } else if (statusAtual === STATUS_V2.DIAGNOSTICO_EM_ANDAMENTO) {
        statusNovo = STATUS_V2.DIAGNOSTICO_CONCLUIDO;
      }
    }
    if (statusNovo && !v2StatusValido_(statusAtual, statusNovo)) statusNovo = "";

    // Registrar diagnostico na timeline
    v2RegistrarHistorico_(atendimentoId, statusAtual, statusNovo || statusAtual,
      resumo, sessao.userId, sessao.nome, "DIAGNOSTICO", obsPayload);

    // Atualizar AST_ATENDIMENTOS com campos disponiveis no schema
    var upd = {
      PROXIMA_ACAO:           safe_(p.PROXIMA_ACAO) || (statusNovo ? v2ProximaAcao_(statusNovo) : atendimento.PROXIMA_ACAO || ""),
      ULTIMA_MOVIMENTACAO_EM: now_(),
      ATUALIZADO_POR:         safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_EM:          now_()
    };
    if (p.OBSERVACOES) upd.OBSERVACOES = safe_(p.OBSERVACOES);
    if (statusNovo) {
      upd.STATUS  = statusNovo;
      upd.BANDEIRA = v2Bandeira_(statusNovo);
    }
    SGO_DATA.update(S.AST_ATENDIMENTOS, atendimentoId, upd, DB);

    // Registrar mudanca de STATUS separadamente se houve transicao
    if (statusNovo && statusNovo !== statusAtual) {
      v2RegistrarHistorico_(atendimentoId, statusAtual, statusNovo,
        "Status atualizado apos diagnostico", sessao.userId, sessao.nome, "STATUS", null);
    }

    return {
      success: true,
      data:     v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)),
      historico: SGO_DATA.getManyByField(S.AST_HISTORICO, "ATENDIMENTO_ID", atendimentoId, DB) || []
    };
  }

  function salvarSolicitacaoV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    const p = payload || {};
    if (!p.TIPO) return erro_("TIPO obrigatorio");
    if (!p.DESCRICAO) return erro_("DESCRICAO obrigatoria");
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    const descricao = safe_(p.DESCRICAO);
    const reg = SGO_DATA.insert(S.AST_SOLICITACOES, SGO_DATA.gerarRegistroBase({
      ATENDIMENTO_ID:       atendimentoId,
      TIPO:                 upper_(p.TIPO),
      CATEGORIA:            upper_(p.CATEGORIA || "GERAL"),
      DESCRICAO:            descricao,
      QUANTIDADE:           p.QUANTIDADE || 1,
      URGENCIA:             upper_(p.URGENCIA || "NORMAL"),
      JUSTIFICATIVA_TECNICA:safe_(p.JUSTIFICATIVA_TECNICA),
      OBSERVACAO:           safe_(p.OBSERVACAO || p.OBSERVACOES),
      FORNECEDOR_ID:        safe_(p.FORNECEDOR_ID),
      FORNECEDOR_NOME:      safe_(p.FORNECEDOR_NOME),
      VALOR_ESTIMADO:       p.VALOR_ESTIMADO || 0,
      VALOR_APROVADO:       0,
      STATUS:               "ABERTA",
      SOLICITADO_POR:       safe_(sessao.userId || sessao.usuario),
      SOLICITADO_EM:        now_(),
      APROVADO_POR: "", APROVADO_EM: "", RECUSADO_MOTIVO: "", RECUSADO_EM: "",
      COMPRADO_EM: "", RECEBIDO_EM: "", INSTALADO_EM: "",
      TERCEIRO_ID: "", LAB_ID: "",
      CRIADO_POR:           safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_POR:       safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_EM:        now_()
    }), DB);
    v2RegistrarHistorico_(atendimentoId, atendimento.STATUS, atendimento.STATUS,
      "Solicitacao criada: " + descricao,
      sessao.userId, sessao.nome, "SOLICITACAO", { solicitacaoId: reg.ID });
    return { success: true, data: reg };
  }

  function atualizarSolicitacaoV2(sessionId, solicitacaoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    const p = payload || {};
    const solicitacao = SGO_DATA.getById(S.AST_SOLICITACOES, solicitacaoId, DB);
    if (!solicitacao) return erro_("Solicitacao nao encontrada: " + solicitacaoId);
    const atendimentoId = safe_(solicitacao.ATENDIMENTO_ID);
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento vinculado a solicitacao nao encontrado: " + atendimentoId);
    const camposPermitidos = [
      "TIPO", "CATEGORIA", "DESCRICAO", "QUANTIDADE", "URGENCIA",
      "JUSTIFICATIVA_TECNICA", "OBSERVACAO", "FORNECEDOR_ID", "FORNECEDOR_NOME",
      "VALOR_ESTIMADO", "VALOR_APROVADO", "STATUS", "APROVADO_POR",
      "APROVADO_EM", "RECUSADO_MOTIVO", "RECUSADO_EM", "COMPRADO_EM",
      "RECEBIDO_EM", "INSTALADO_EM", "TERCEIRO_ID", "LAB_ID"
    ];
    const patch = { ATUALIZADO_POR: safe_(sessao.userId || sessao.usuario), ATUALIZADO_EM: now_() };
    camposPermitidos.forEach(function(c) { if (p[c] !== undefined) patch[c] = p[c]; });
    SGO_DATA.update(S.AST_SOLICITACOES, solicitacaoId, patch, DB);
    v2RegistrarHistorico_(atendimentoId, atendimento.STATUS, atendimento.STATUS,
      "Solicitacao atualizada: " + safe_(p.STATUS || solicitacao.STATUS),
      sessao.userId, sessao.nome, "SOLICITACAO");
    return { success: true, data: SGO_DATA.getById(S.AST_SOLICITACOES, solicitacaoId, DB) };
  }

  function atualizarSolicitacaoPecaV2(sessionId, solicitacaoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    const p = payload || {};
    if (!p.STATUS) return erro_("STATUS obrigatorio");
    const solicitacao = SGO_DATA.getById(S.AST_SOLICITACOES, solicitacaoId, DB);
    if (!solicitacao) return erro_("Solicitacao nao encontrada: " + solicitacaoId);
    if (upper_(solicitacao.TIPO) !== "PECA") return erro_("Solicitacao nao e do tipo PECA");
    const atendimentoId = safe_(solicitacao.ATENDIMENTO_ID);
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    const statusAnterior = safe_(solicitacao.STATUS);
    const statusNovo = upper_(safe_(p.STATUS));
    const patch = {
      STATUS:         statusNovo,
      OBSERVACAO:     safe_(p.OBSERVACAO || solicitacao.OBSERVACAO),
      ATUALIZADO_POR: safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_EM:  now_()
    };
    if (p.FORNECEDOR_FINAL) patch.FORNECEDOR_NOME = safe_(p.FORNECEDOR_FINAL);
    if (p.VALOR_FINAL !== undefined && p.VALOR_FINAL !== "") patch.VALOR_APROVADO = Number(p.VALOR_FINAL) || 0;
    if (statusNovo === "COMPRADO")  patch.COMPRADO_EM  = now_();
    if (statusNovo === "RECEBIDO")  patch.RECEBIDO_EM  = now_();
    if (statusNovo === "INSTALADO") patch.INSTALADO_EM = now_();
    SGO_DATA.update(S.AST_SOLICITACOES, solicitacaoId, patch, DB);
    const descPeca = v2SolicitacaoDescricao_(solicitacao);
    v2RegistrarHistorico_(atendimentoId, atendimento.STATUS, atendimento.STATUS,
      "Peca " + statusNovo.toLowerCase() + ": " + descPeca,
      sessao.userId, sessao.nome, "STATUS_PECA",
      { solicitacaoId: solicitacaoId, statusAnterior: statusAnterior, statusNovo: statusNovo });
    if (statusNovo === "INSTALADO") {
      if (v2StatusValido_(atendimento.STATUS, STATUS_V2.LIBERADO_PARA_EXECUCAO)) {
        try {
          v2AtualizarStatus_(atendimentoId, STATUS_V2.LIBERADO_PARA_EXECUCAO,
            "Peca instalada. Liberado para execucao.", sessao.userId, sessao.nome);
        } catch (e) {}
      } else {
        SGO_DATA.update(S.AST_ATENDIMENTOS, atendimentoId, {
          PROXIMA_ACAO:   "Peca instalada. Prosseguir para teste e validacao.",
          ATUALIZADO_POR: safe_(sessao.userId || sessao.usuario),
          ATUALIZADO_EM:  now_()
        }, DB);
      }
    }
    return {
      success:     true,
      data:        v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)),
      solicitacao: SGO_DATA.getById(S.AST_SOLICITACOES, solicitacaoId, DB),
      historico:   SGO_DATA.getManyByField(S.AST_HISTORICO, "ATENDIMENTO_ID", atendimentoId, DB) || []
    };
  }

  function salvarExecucaoV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    const p = payload || {};
    if (!p.SERVICO_EXECUTADO) return erro_("SERVICO_EXECUTADO obrigatorio");
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    const execStates = [STATUS_V2.LIBERADO_PARA_EXECUCAO, STATUS_V2.EXECUCAO_EM_ANDAMENTO];
    if (execStates.indexOf(atendimento.STATUS) === -1) {
      return erro_("Status atual nao permite registro de execucao: " + atendimento.STATUS +
        ". Requer: LIBERADO_PARA_EXECUCAO ou EXECUCAO_EM_ANDAMENTO.");
    }
    if (atendimento.STATUS === STATUS_V2.LIBERADO_PARA_EXECUCAO) {
      v2AtualizarStatus_(atendimentoId, STATUS_V2.EXECUCAO_EM_ANDAMENTO,
        "Execucao iniciada", sessao.userId, sessao.nome);
    }
    v2RegistrarHistorico_(atendimentoId, STATUS_V2.EXECUCAO_EM_ANDAMENTO, STATUS_V2.EXECUCAO_EM_ANDAMENTO,
      "Execucao registrada: " + safe_(p.SERVICO_EXECUTADO).substring(0, 100),
      sessao.userId, sessao.nome, "EXECUCAO", {
        servico: safe_(p.SERVICO_EXECUTADO),
        resultado: safe_(p.RESULTADO_EXECUCAO)
      });
    v2AtualizarStatus_(atendimentoId, STATUS_V2.EXECUCAO_CONCLUIDA,
      "Execucao concluida: " + safe_(p.SERVICO_EXECUTADO).substring(0, 100),
      sessao.userId, sessao.nome);
    return { success: true, data: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)) };
  }

  function salvarConclusaoV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    const p = payload || {};
    if (!p.RESULTADO_CONCLUSAO) return erro_("RESULTADO_CONCLUSAO obrigatorio");
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    const precisaCalibrar = upper_(p.CALIBRACAO_NECESSARIA) === "SIM";
    const proximo = precisaCalibrar ? STATUS_V2.AGUARDANDO_CALIBRACAO : STATUS_V2.CONCLUIDO_TECNICAMENTE;
    v2RegistrarHistorico_(atendimentoId, atendimento.STATUS, atendimento.STATUS,
      "Conclusao registrada: " + safe_(p.RESULTADO_CONCLUSAO).substring(0, 100),
      sessao.userId, sessao.nome, "CONCLUSAO", {
        resultado: safe_(p.RESULTADO_CONCLUSAO),
        calibracaoNecessaria: precisaCalibrar ? "SIM" : "NAO"
      });
    const execDoneStates = [STATUS_V2.EXECUCAO_CONCLUIDA, STATUS_V2.AGUARDANDO_CALIBRACAO];
    if (execDoneStates.indexOf(atendimento.STATUS) !== -1) {
      v2AtualizarStatus_(atendimentoId, proximo,
        "Conclusao tecnica: " + safe_(p.RESULTADO_CONCLUSAO).substring(0, 100),
        sessao.userId, sessao.nome);
    } else {
      v2RegistrarHistorico_(atendimentoId, atendimento.STATUS, atendimento.STATUS,
        "Conclusao atualizada", sessao.userId, sessao.nome, "EDICAO");
    }
    return { success: true, data: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)) };
  }

  function confirmarEntregaV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "GERENCIAR_ENTRADAS");
    if (!perm.success) return perm;
    const p = payload || {};
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    const entregaOk = [STATUS_V2.CONCLUIDO_TECNICAMENTE, STATUS_V2.AGUARDANDO_ENTREGA, STATUS_V2.NAO_REPARADO];
    if (entregaOk.indexOf(atendimento.STATUS) === -1) {
      return erro_("Status atual nao permite entrega: " + atendimento.STATUS);
    }
    if (atendimento.STATUS !== STATUS_V2.AGUARDANDO_ENTREGA) {
      v2AtualizarStatus_(atendimentoId, STATUS_V2.AGUARDANDO_ENTREGA,
        "Equipamento pronto para retirada", sessao.userId, sessao.nome);
    }
    let assinaturaId = "";
    if (p.ASSINATURA_BASE64) {
      const regAss = SGO_DATA.insert(S.AST_ASSINATURAS, SGO_DATA.gerarRegistroBase({
        ATENDIMENTO_ID:      atendimentoId,
        TIPO_ASSINATURA:     "ENTREGA_CLIENTE",
        ETAPA:               atendimento.STATUS,
        ASSINATURA_BASE64:   p.ASSINATURA_BASE64,
        SIGNATARIO_NOME:     safe_(p.SIGNATARIO_NOME),
        SIGNATARIO_DOC:      safe_(p.SIGNATARIO_DOC || p.SIGNATARIO_CPF),
        SIGNATARIO_PAPEL:    safe_(p.SIGNATARIO_PAPEL || p.SIGNATARIO_FUNCAO || "CLIENTE"),
        IP:                  "",
        DATA_HORA:           now_(),
        HASH_VALIDACAO:      ""
      }), DB);
      assinaturaId = regAss.ID;
    }
    v2AtualizarStatus_(atendimentoId, STATUS_V2.ENTREGUE,
      "Equipamento entregue ao cliente" + (p.SIGNATARIO_NOME ? " â€” ass.: " + safe_(p.SIGNATARIO_NOME) : ""),
      sessao.userId, sessao.nome);
    if (assinaturaId) {
      v2RegistrarHistorico_(atendimentoId, STATUS_V2.AGUARDANDO_ENTREGA, STATUS_V2.ENTREGUE,
        "Assinatura de entrega registrada", sessao.userId, sessao.nome, "ASSINATURA",
        { assinaturaId: assinaturaId });
    }
    return { success: true, data: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)) };
  }

  function dashboardV2(sessionId) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    const todos = SGO_DATA.getAll(S.AST_ATENDIMENTOS, DB) || [];
    const porStatus = {};
    Object.keys(STATUS_V2).forEach(function(s) { porStatus[s] = 0; });
    const porBandeira = { AZUL_CINZA: 0, AMARELO: 0, VERDE: 0, VERMELHO: 0 };
    const agora = new Date();
    const fechados = [STATUS_V2.ENTREGUE, STATUS_V2.CANCELADO, STATUS_V2.NAO_REPARADO];
    let atrasados = 0;
    todos.forEach(function(a) {
      if (porStatus[a.STATUS] !== undefined) porStatus[a.STATUS]++;
      if (porBandeira[a.BANDEIRA] !== undefined) porBandeira[a.BANDEIRA]++;
      if (a.PRAZO_ESTIMADO && fechados.indexOf(a.STATUS) === -1 && new Date(a.PRAZO_ESTIMADO) < agora) atrasados++;
    });
    const alertasPendentes = (SGO_DATA.getAll(S.AST_ALERTAS, DB) || [])
      .filter(function(al) { return al.STATUS === "PENDENTE"; }).length;
    return {
      success: true,
      data: { total: todos.length, por_status: porStatus, por_bandeira: porBandeira,
              atrasados: atrasados, alertas_pendentes: alertasPendentes }
    };
  }

  function listarAlertasV2(sessionId) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    let alertas = SGO_DATA.getAll(S.AST_ALERTAS, DB) || [];
    if (perfilAst_(sessao) === "TECNICO") {
      alertas = alertas.filter(function(al) { return safe_(al.DESTINATARIO_ID) === safe_(sessao.userId); });
    }
    const ordem = { CRITICA: 0, ALTA: 1, NORMAL: 2, BAIXA: 3 };
    alertas.sort(function(a, b) {
      return (ordem[a.SEVERIDADE] !== undefined ? ordem[a.SEVERIDADE] : 99) -
             (ordem[b.SEVERIDADE] !== undefined ? ordem[b.SEVERIDADE] : 99);
    });
    return { success: true, data: alertas };
  }

  function uploadFotoV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    const p = payload || {};
    if (!p.BASE64 && !p.URL && !p.LINK_DRIVE && !p.FILE_ID) return erro_("BASE64, URL ou FILE_ID da foto obrigatorio");
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    let urlArquivo = safe_(p.URL || p.LINK_DRIVE);
    let fileId = safe_(p.FILE_ID);
    if (p.BASE64) {
      try {
        const b64 = p.BASE64.replace(/^data:[^;]+;base64,/, "");
        const blob = Utilities.newBlob(
          Utilities.base64Decode(b64),
          safe_(p.MIME_TYPE) || "image/jpeg",
          "ast_" + atendimentoId + "_" + Date.now() + ".jpg"
        );
        const file = DriveApp.getRootFolder().createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileId = file.getId();
        urlArquivo = file.getDownloadUrl();
      } catch (e) { log_("uploadFotoV2: Drive upload falhou â€” " + e.message); }
    }
    if (!urlArquivo && !fileId) {
      log_("AST_V2_UPLOAD_FOTO_FALHA", safe_(sessao.userId || sessao.usuario), "Foto nao registrada para atendimentoId=" + safe_(atendimentoId) + ": upload falhou e nao ha URL ou FILE_ID valido.");
      return erro_("Nao foi possivel registrar a foto: upload falhou e nao ha URL ou FILE_ID valido.");
    }
    const reg = SGO_DATA.insert(S.AST_FOTOS, SGO_DATA.gerarRegistroBase({
      ATENDIMENTO_ID:   atendimentoId,
      ETAPA:            atendimento.STATUS,
      TIPO_FOTO:        upper_(p.TIPO_FOTO || "GERAL"),
      NOME_ARQUIVO:     safe_(p.NOME_ARQUIVO || ("ast_" + atendimentoId)),
      LINK_DRIVE:       urlArquivo,
      FILE_ID:          fileId,
      MIME_TYPE:        safe_(p.MIME_TYPE) || "image/jpeg",
      DESCRICAO_FOTO:   safe_(p.DESCRICAO),
      VISIBILIDADE_PUBLICA: simNao_(p.VISIBILIDADE_PUBLICA),
      STATUS:           "ATIVA",
      UPLOAD_POR:       safe_(sessao.userId || sessao.usuario),
      UPLOAD_EM:        now_()
    }), DB);
    v2RegistrarHistorico_(atendimentoId, atendimento.STATUS, atendimento.STATUS,
      "Foto adicionada: " + upper_(p.TIPO_FOTO || "GERAL"),
      sessao.userId, sessao.nome, "FOTO", { fotoId: reg.ID });
    return { success: true, data: reg };
  }

  function trocarTecnicoV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "GERENCIAR_ENTRADAS");
    if (!perm.success) return perm;
    const p = payload || {};
    if (!p.TECNICO_ID) return erro_("TECNICO_ID obrigatorio");
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    const nomeAnterior = safe_(atendimento.TECNICO_NOME || atendimento.TECNICO_ID);
    SGO_DATA.update(S.AST_ATENDIMENTOS, atendimentoId, {
      TECNICO_ID:    safe_(p.TECNICO_ID),
      TECNICO_NOME:  safe_(p.TECNICO_NOME),
      ATUALIZADO_POR: safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_EM: now_()
    }, DB);
    v2RegistrarHistorico_(atendimentoId, atendimento.STATUS, atendimento.STATUS,
      "Tecnico alterado: " + nomeAnterior + " -> " + safe_(p.TECNICO_NOME || p.TECNICO_ID) +
        (p.MOTIVO ? ". Motivo: " + safe_(p.MOTIVO) : ""),
      sessao.userId, sessao.nome, "TROCA_TECNICO");
    v2CriarAlerta_("NOVO_ATENDIMENTO", atendimentoId,
      "Novo atendimento atribuido",
      "Protocolo " + safe_(atendimento.PROTOCOLO) + " foi atribuido a voce",
      p.TECNICO_ID, "NORMAL");
    return { success: true, data: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)) };
  }

  // ============================================================
  // ETAPA 3 â€” FLUXO COMERCIAL V2
  // ============================================================

  function enviarOrcamentoV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    const p = payload || {};
    if (!p.TITULO) return erro_("TITULO obrigatorio");
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    const permitidos = [STATUS_V2.DIAGNOSTICO_CONCLUIDO, STATUS_V2.AGUARDANDO_ORCAMENTO];
    if (permitidos.indexOf(atendimento.STATUS) === -1) {
      return erro_("Status atual nao permite envio de orcamento: " + atendimento.STATUS);
    }
    if (atendimento.STATUS === STATUS_V2.DIAGNOSTICO_CONCLUIDO) {
      v2AtualizarStatus_(atendimentoId, STATUS_V2.AGUARDANDO_ORCAMENTO,
        "Preparando orcamento", sessao.userId, sessao.nome);
    }
    const solicitacao = SGO_DATA.insert(S.AST_SOLICITACOES, SGO_DATA.gerarRegistroBase({
      ATENDIMENTO_ID:      atendimentoId,
      TIPO:                "SERVICO",
      CATEGORIA:           "ORCAMENTO",
      DESCRICAO:           safe_(p.DESCRICAO || p.TITULO),
      QUANTIDADE:          1,
      URGENCIA:            upper_(p.URGENCIA || "NORMAL"),
      JUSTIFICATIVA_TECNICA: safe_(p.JUSTIFICATIVA_TECNICA),
      OBSERVACAO:          safe_(p.OBSERVACAO || p.OBSERVACOES || p.TITULO),
      FORNECEDOR_ID:       "",
      FORNECEDOR_NOME:     "",
      VALOR_ESTIMADO:      p.VALOR || p.VALOR_ESTIMADO || 0,
      VALOR_APROVADO:      0,
      STATUS:              "ENVIADO",
      SOLICITADO_POR:      safe_(sessao.userId || sessao.usuario),
      SOLICITADO_EM:       now_(),
      APROVADO_POR: "", APROVADO_EM: "", RECUSADO_MOTIVO: "", RECUSADO_EM: "",
      COMPRADO_EM: "", RECEBIDO_EM: "", INSTALADO_EM: "",
      TERCEIRO_ID: "", LAB_ID: "",
      CRIADO_POR:          safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_POR:      safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_EM:       now_()
    }), DB);
    v2AtualizarStatus_(atendimentoId, STATUS_V2.ORCAMENTO_ENVIADO,
      "Orcamento enviado: " + safe_(p.TITULO).substring(0, 80),
      sessao.userId, sessao.nome);
    return { success: true, data: {
      atendimento: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)),
      solicitacao: solicitacao
    }};
  }

  function registrarAprovacaoClienteV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    const p = payload || {};
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    const permitidos = [STATUS_V2.ORCAMENTO_ENVIADO, STATUS_V2.AGUARDANDO_APROVACAO_CLIENTE];
    if (permitidos.indexOf(atendimento.STATUS) === -1) {
      return erro_("Status atual nao permite aprovacao de orcamento: " + atendimento.STATUS);
    }
    if (atendimento.STATUS === STATUS_V2.ORCAMENTO_ENVIADO) {
      v2AtualizarStatus_(atendimentoId, STATUS_V2.AGUARDANDO_APROVACAO_CLIENTE,
        "Aguardando confirmacao formal do cliente", sessao.userId, sessao.nome);
    }
    const solicitacoes = SGO_DATA.getManyByField(S.AST_SOLICITACOES, "ATENDIMENTO_ID", atendimentoId, DB) || [];
    const ultOrcamento = solicitacoes.filter(function(s) { return s.CATEGORIA === "ORCAMENTO"; }).pop();
    if (ultOrcamento) {
      SGO_DATA.update(S.AST_SOLICITACOES, ultOrcamento.ID, {
        STATUS:             "APROVADO",
        VALOR_APROVADO:     p.VALOR_APROVADO || ultOrcamento.VALOR_ESTIMADO || 0,
        APROVADO_POR:       safe_(p.APROVADOR_ID || p.APROVADO_POR || sessao.userId || sessao.usuario),
        APROVADO_EM:        now_(),
        ATUALIZADO_POR:     safe_(sessao.userId || sessao.usuario),
        ATUALIZADO_EM:      now_()
      }, DB);
    }
    v2AtualizarStatus_(atendimentoId, STATUS_V2.ORCAMENTO_APROVADO,
      "Orcamento aprovado pelo cliente" + (p.APROVADO_POR ? " â€” por: " + safe_(p.APROVADO_POR) : ""),
      sessao.userId, sessao.nome);
    return { success: true, data: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)) };
  }

  function registrarRecusaClienteV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "INTERNO");
    if (!perm.success) return perm;
    const p = payload || {};
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    const permitidos = [STATUS_V2.ORCAMENTO_ENVIADO, STATUS_V2.AGUARDANDO_APROVACAO_CLIENTE];
    if (permitidos.indexOf(atendimento.STATUS) === -1) {
      return erro_("Status atual nao permite registro de recusa: " + atendimento.STATUS);
    }
    if (atendimento.STATUS === STATUS_V2.ORCAMENTO_ENVIADO) {
      v2AtualizarStatus_(atendimentoId, STATUS_V2.AGUARDANDO_APROVACAO_CLIENTE,
        "Registrando recusa do cliente", sessao.userId, sessao.nome);
    }
    const solicitacoes = SGO_DATA.getManyByField(S.AST_SOLICITACOES, "ATENDIMENTO_ID", atendimentoId, DB) || [];
    const ultOrcamento = solicitacoes.filter(function(s) { return s.CATEGORIA === "ORCAMENTO"; }).pop();
    if (ultOrcamento) {
      SGO_DATA.update(S.AST_SOLICITACOES, ultOrcamento.ID, {
        STATUS:             "RECUSADO",
        RECUSADO_MOTIVO:    safe_(p.MOTIVO_RECUSA || p.OBSERVACAO || ultOrcamento.OBSERVACAO),
        RECUSADO_EM:        now_(),
        ATUALIZADO_POR:     safe_(sessao.userId || sessao.usuario),
        ATUALIZADO_EM:      now_()
      }, DB);
    }
    v2AtualizarStatus_(atendimentoId, STATUS_V2.ORCAMENTO_RECUSADO,
      "Orcamento recusado pelo cliente" + (p.MOTIVO_RECUSA ? " â€” motivo: " + safe_(p.MOTIVO_RECUSA) : ""),
      sessao.userId, sessao.nome);
    v2CriarAlerta_("ORCAMENTO_RECUSADO", atendimentoId,
      "Orcamento recusado",
      "Protocolo " + safe_(atendimento.PROTOCOLO) + ": cliente recusou orcamento" +
        (p.MOTIVO_RECUSA ? " â€” " + safe_(p.MOTIVO_RECUSA) : ""),
      sessao.userId, "ALTA");
    return { success: true, data: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)) };
  }

  function solicitarPecaV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    const p = payload || {};
    if (!p.TITULO && !p.DESCRICAO_PECA) return erro_("TITULO ou DESCRICAO_PECA obrigatorio");
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    const bloqueados = [STATUS_V2.CANCELADO, STATUS_V2.ENTREGUE, STATUS_V2.ORCAMENTO_RECUSADO, STATUS_V2.NAO_REPARADO];
    if (bloqueados.indexOf(atendimento.STATUS) !== -1) {
      return erro_("Status atual nao permite solicitacao de peca: " + atendimento.STATUS);
    }
    const operacionais = [
      STATUS_V2.EM_BANCADA, STATUS_V2.DIAGNOSTICO_EM_ANDAMENTO,
      STATUS_V2.DIAGNOSTICO_CONCLUIDO, STATUS_V2.AGUARDANDO_ORCAMENTO,
      STATUS_V2.ORCAMENTO_ENVIADO, STATUS_V2.AGUARDANDO_APROVACAO_CLIENTE,
      STATUS_V2.ORCAMENTO_APROVADO, STATUS_V2.AGUARDANDO_PECA,
      STATUS_V2.AGUARDANDO_TERCEIRO, STATUS_V2.LIBERADO_PARA_EXECUCAO,
      STATUS_V2.EXECUCAO_EM_ANDAMENTO
    ];
    if (operacionais.indexOf(atendimento.STATUS) === -1) {
      return erro_("Status operacional nao permite solicitacao de peca: " + atendimento.STATUS);
    }
    const titulo = safe_(p.TITULO || p.DESCRICAO_PECA);
    const solicitacao = SGO_DATA.insert(S.AST_SOLICITACOES, SGO_DATA.gerarRegistroBase({
      ATENDIMENTO_ID:      atendimentoId,
      TIPO:                "PECA",
      CATEGORIA:           "PECA",
      DESCRICAO:           safe_(p.DESCRICAO || titulo),
      QUANTIDADE:          p.QUANTIDADE || 1,
      URGENCIA:            upper_(p.URGENCIA || "NORMAL"),
      JUSTIFICATIVA_TECNICA: safe_(p.JUSTIFICATIVA_TECNICA),
      OBSERVACAO:          safe_(p.OBSERVACAO || p.OBSERVACOES || titulo),
      FORNECEDOR_ID:       safe_(p.FORNECEDOR_ID),
      FORNECEDOR_NOME:     safe_(p.FORNECEDOR_NOME || p.FORNECEDOR),
      VALOR_ESTIMADO:      p.VALOR_ESTIMADO || 0,
      VALOR_APROVADO:      0,
      STATUS:              "PENDENTE",
      SOLICITADO_POR:      safe_(sessao.userId || sessao.usuario),
      SOLICITADO_EM:       now_(),
      APROVADO_POR: "", APROVADO_EM: "", RECUSADO_MOTIVO: "", RECUSADO_EM: "",
      COMPRADO_EM: "", RECEBIDO_EM: "", INSTALADO_EM: "",
      TERCEIRO_ID: "", LAB_ID: "",
      CRIADO_POR:          safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_POR:      safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_EM:       now_()
    }), DB);
    if (atendimento.STATUS === STATUS_V2.ORCAMENTO_APROVADO) {
      v2AtualizarStatus_(atendimentoId, STATUS_V2.AGUARDANDO_PECA,
        "Peca solicitada: " + titulo.substring(0, 80), sessao.userId, sessao.nome);
    } else {
      v2RegistrarHistorico_(atendimentoId, atendimento.STATUS, atendimento.STATUS,
        "Peca solicitada: " + titulo.substring(0, 80),
        sessao.userId, sessao.nome, "SOLICITACAO", { solicitacaoId: solicitacao.ID });
    }
    return { success: true, data: {
      solicitacao: solicitacao,
      atendimento: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB))
    }};
  }

  function registrarCompraPecaV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    const p = payload || {};
    if (!p.SOLICITACAO_ID) return erro_("SOLICITACAO_ID obrigatorio");
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    const solicitacao = SGO_DATA.getById(S.AST_SOLICITACOES, p.SOLICITACAO_ID, DB);
    if (!solicitacao) return erro_("Solicitacao nao encontrada: " + p.SOLICITACAO_ID);
    if (safe_(solicitacao.ATENDIMENTO_ID) !== safe_(atendimentoId)) return erro_("Solicitacao nao pertence ao atendimento informado.");
    if (solicitacao.TIPO !== "PECA") return erro_("Solicitacao nao e do tipo PECA");
    if (!v2SolicitacaoAtiva_(solicitacao) || ["PENDENTE", "APROVADO", "ABERTA"].indexOf(upper_(solicitacao.STATUS)) === -1) {
      return erro_("Status da solicitacao nao permite compra: " + solicitacao.STATUS);
    }
    SGO_DATA.update(S.AST_SOLICITACOES, p.SOLICITACAO_ID, {
      STATUS:              "COMPRADO",
      VALOR_APROVADO:      p.VALOR_COMPRA || solicitacao.VALOR_ESTIMADO || 0,
      FORNECEDOR_NOME:     safe_(p.FORNECEDOR || solicitacao.FORNECEDOR_NOME),
      OBSERVACAO:          safe_(p.OBSERVACAO || p.NF_NUMERO || solicitacao.OBSERVACAO),
      COMPRADO_EM:         safe_(p.DATA_COMPRA) || now_(),
      ATUALIZADO_POR:      safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_EM:       now_()
    }, DB);
    v2RegistrarHistorico_(atendimentoId, atendimento.STATUS, atendimento.STATUS,
      "Peca comprada: " + v2SolicitacaoDescricao_(solicitacao) + (p.NF_NUMERO ? " - NF: " + safe_(p.NF_NUMERO) : ""),
      sessao.userId, sessao.nome, "SOLICITACAO", { solicitacaoId: p.SOLICITACAO_ID });
    return { success: true, data: SGO_DATA.getById(S.AST_SOLICITACOES, p.SOLICITACAO_ID, DB) };
  }

  function registrarRecebimentoPecaV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "TECNICO");
    if (!perm.success) return perm;
    const p = payload || {};
    if (!p.SOLICITACAO_ID) return erro_("SOLICITACAO_ID obrigatorio");
    const solicitacao = SGO_DATA.getById(S.AST_SOLICITACOES, p.SOLICITACAO_ID, DB);
    if (!solicitacao) return erro_("Solicitacao nao encontrada: " + p.SOLICITACAO_ID);
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    if (safe_(solicitacao.ATENDIMENTO_ID) !== safe_(atendimentoId)) return erro_("Solicitacao nao pertence ao atendimento informado.");
    if (solicitacao.TIPO !== "PECA") return erro_("Solicitacao nao e do tipo PECA");
    SGO_DATA.update(S.AST_SOLICITACOES, p.SOLICITACAO_ID, {
      STATUS:             "RECEBIDO",
      RECEBIDO_EM:        safe_(p.DATA_RECEBIMENTO) || now_(),
      OBSERVACAO:         safe_(p.OBSERVACAO || p.OBSERVACOES || solicitacao.OBSERVACAO),
      ATUALIZADO_POR:     safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_EM:      now_()
    }, DB);
    v2RegistrarHistorico_(atendimentoId, atendimento.STATUS, atendimento.STATUS,
      "Peca recebida: " + v2SolicitacaoDescricao_(solicitacao),
      sessao.userId, sessao.nome, "SOLICITACAO", { solicitacaoId: p.SOLICITACAO_ID });
    const tecnicoId = safe_(atendimento.TECNICO_ID);
    if (tecnicoId) {
      const descricaoPecaRecebida = v2SolicitacaoDescricao_(solicitacao);
      v2CriarAlerta_("PECA_RECEBIDA", atendimentoId,
        "Peca recebida â€” pronta para execucao",
        "Protocolo " + safe_(atendimento.PROTOCOLO) + ": peca recebida - " + descricaoPecaRecebida,
        tecnicoId, "ALTA");
    }
    return { success: true, data: SGO_DATA.getById(S.AST_SOLICITACOES, p.SOLICITACAO_ID, DB) };
  }

  function liberarExecucaoV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "GERENCIAR_ENTRADAS");
    if (!perm.success) return perm;
    const p = payload || {};
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    const permitidos = [
      STATUS_V2.DIAGNOSTICO_CONCLUIDO, STATUS_V2.ORCAMENTO_APROVADO,
      STATUS_V2.AGUARDANDO_PECA,       STATUS_V2.AGUARDANDO_TERCEIRO
    ];
    if (permitidos.indexOf(atendimento.STATUS) === -1) {
      return erro_("Status atual nao permite liberacao para execucao: " + atendimento.STATUS);
    }
    v2AtualizarStatus_(atendimentoId, STATUS_V2.LIBERADO_PARA_EXECUCAO,
      "Liberado para execucao" + (p.OBSERVACAO ? ": " + safe_(p.OBSERVACAO) : ""),
      sessao.userId, sessao.nome);
    const tecnicoId = safe_(p.TECNICO_ID || atendimento.TECNICO_ID);
    if (tecnicoId) {
      v2CriarAlerta_("LIBERADO_EXECUCAO", atendimentoId,
        "Atendimento liberado para execucao",
        "Protocolo " + safe_(atendimento.PROTOCOLO) + " esta liberado para execucao tecnica",
        tecnicoId, "ALTA");
    }
    return { success: true, data: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)) };
  }

  function encaminharTerceiroStatusV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "GERENCIAR_ENTRADAS");
    if (!perm.success) return perm;
    const p = payload || {};
    if (!p.TERCEIRO_NOME) return erro_("TERCEIRO_NOME obrigatorio");
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    if (atendimento.STATUS !== STATUS_V2.ORCAMENTO_APROVADO) {
      return erro_("Status atual nao permite encaminhamento a terceiro: " + atendimento.STATUS +
        ". Requer: ORCAMENTO_APROVADO.");
    }
    const solicitacao = SGO_DATA.insert(S.AST_SOLICITACOES, SGO_DATA.gerarRegistroBase({
      ATENDIMENTO_ID:      atendimentoId,
      TIPO:                "TERCEIRO",
      CATEGORIA:           "TERCEIRO",
      DESCRICAO:           safe_(p.SERVICO_SOLICITADO),
      QUANTIDADE:          1,
      URGENCIA:            upper_(p.URGENCIA || "NORMAL"),
      JUSTIFICATIVA_TECNICA: safe_(p.JUSTIFICATIVA_TECNICA),
      OBSERVACAO:          safe_(p.OBSERVACAO || p.OBSERVACOES || p.TERCEIRO_CONTATO),
      FORNECEDOR_ID:       safe_(p.TERCEIRO_ID),
      FORNECEDOR_NOME:     safe_(p.TERCEIRO_NOME),
      VALOR_ESTIMADO:      p.VALOR_ESTIMADO || 0,
      VALOR_APROVADO:      0,
      STATUS:              "ENVIADO",
      SOLICITADO_POR:      safe_(sessao.userId || sessao.usuario),
      SOLICITADO_EM:       now_(),
      APROVADO_POR: "", APROVADO_EM: "", RECUSADO_MOTIVO: "", RECUSADO_EM: "",
      COMPRADO_EM: "", RECEBIDO_EM: "", INSTALADO_EM: "",
      TERCEIRO_ID:         safe_(p.TERCEIRO_ID),
      LAB_ID: "",
      CRIADO_POR:          safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_POR:      safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_EM:       now_()
    }), DB);
    v2AtualizarStatus_(atendimentoId, STATUS_V2.AGUARDANDO_TERCEIRO,
      "Encaminhado a terceiro: " + safe_(p.TERCEIRO_NOME),
      sessao.userId, sessao.nome);
    return { success: true, data: {
      atendimento: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)),
      solicitacao: solicitacao
    }};
  }

  function encaminharLaboratorioStatusV2(sessionId, atendimentoId, payload) {
    const sessao = exigirSessao(sessionId);
    const perm = exigirAst_(sessao, "GERENCIAR_ENTRADAS");
    if (!perm.success) return perm;
    const p = payload || {};
    if (!p.LABORATORIO_NOME) return erro_("LABORATORIO_NOME obrigatorio");
    const atendimento = SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB);
    if (!atendimento) return erro_("Atendimento nao encontrado: " + atendimentoId);
    if (atendimento.STATUS !== STATUS_V2.EXECUCAO_CONCLUIDA) {
      return erro_("Status atual nao permite encaminhamento a laboratorio: " + atendimento.STATUS +
        ". Requer: EXECUCAO_CONCLUIDA.");
    }
    const solicitacao = SGO_DATA.insert(S.AST_SOLICITACOES, SGO_DATA.gerarRegistroBase({
      ATENDIMENTO_ID:      atendimentoId,
      TIPO:                "SERVICO",
      CATEGORIA:           "CALIBRACAO",
      DESCRICAO:           safe_(p.SERVICO_CALIBRACAO),
      QUANTIDADE:          1,
      URGENCIA:            upper_(p.URGENCIA || "NORMAL"),
      JUSTIFICATIVA_TECNICA: safe_(p.JUSTIFICATIVA_TECNICA),
      OBSERVACAO:          safe_(p.OBSERVACAO || p.OBSERVACOES || p.LABORATORIO_CONTATO),
      FORNECEDOR_ID:       safe_(p.LABORATORIO_ID),
      FORNECEDOR_NOME:     safe_(p.LABORATORIO_NOME),
      VALOR_ESTIMADO:      p.VALOR_ESTIMADO || 0,
      VALOR_APROVADO:      0,
      STATUS:              "ENVIADO",
      SOLICITADO_POR:      safe_(sessao.userId || sessao.usuario),
      SOLICITADO_EM:       now_(),
      APROVADO_POR: "", APROVADO_EM: "", RECUSADO_MOTIVO: "", RECUSADO_EM: "",
      COMPRADO_EM: "", RECEBIDO_EM: "", INSTALADO_EM: "",
      TERCEIRO_ID: "",
      LAB_ID:              safe_(p.LABORATORIO_ID),
      CRIADO_POR:          safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_POR:      safe_(sessao.userId || sessao.usuario),
      ATUALIZADO_EM:       now_()
    }), DB);
    v2AtualizarStatus_(atendimentoId, STATUS_V2.AGUARDANDO_CALIBRACAO,
      "Encaminhado para calibracao: " + safe_(p.LABORATORIO_NOME),
      sessao.userId, sessao.nome);
    return { success: true, data: {
      atendimento: v2EnriquecerAtendimento_(SGO_DATA.getById(S.AST_ATENDIMENTOS, atendimentoId, DB)),
      solicitacao: solicitacao
    }};
  }

  // ============================================================
  // FIM DO BLOCO V2
  // ============================================================

  return {
    setup: setup,
    setupV2: setupV2,
    criarEntradaV2: criarEntradaV2,
    listarAtendimentosV2: listarAtendimentosV2,
    obterAtendimentoV2: obterAtendimentoV2,
    iniciarAvaliacaoV2: iniciarAvaliacaoV2,
    salvarDiagnosticoV2: salvarDiagnosticoV2,
    salvarSolicitacaoV2: salvarSolicitacaoV2,
    atualizarSolicitacaoV2: atualizarSolicitacaoV2,
    atualizarSolicitacaoPecaV2: atualizarSolicitacaoPecaV2,
    salvarExecucaoV2: salvarExecucaoV2,
    salvarConclusaoV2: salvarConclusaoV2,
    confirmarEntregaV2: confirmarEntregaV2,
    dashboardV2: dashboardV2,
    listarAlertasV2: listarAlertasV2,
    uploadFotoV2: uploadFotoV2,
    trocarTecnicoV2: trocarTecnicoV2,
    enviarOrcamentoV2: enviarOrcamentoV2,
    registrarAprovacaoClienteV2: registrarAprovacaoClienteV2,
    registrarRecusaClienteV2: registrarRecusaClienteV2,
    solicitarPecaV2: solicitarPecaV2,
    registrarCompraPecaV2: registrarCompraPecaV2,
    registrarRecebimentoPecaV2: registrarRecebimentoPecaV2,
    liberarExecucaoV2: liberarExecucaoV2,
    encaminharTerceiroStatusV2: encaminharTerceiroStatusV2,
    encaminharLaboratorioStatusV2: encaminharLaboratorioStatusV2,
    contexto: contexto,
    entrada: entrada,
    triagem: triagem,
    diagnostico: diagnostico,
    pecas: pecas,
    terceiros: terceiros,
    laboratorio: laboratorio,
    execucao: execucao,
    testes: testes,
    conclusao: conclusao,
    entrega: entrega,
    timeline: timeline,
    documentos: documentos,
    dashboard: dashboard,
    publico: publico,
    ai: ai,
    listarUnidades: listarUnidades,
    listarEquipamentos: listarEquipamentos,
    criarEntrada: criarEntrada,
    listarEntradas: listarEntradas,
    obterEntrada: obterEntrada,
    trocarTecnico: trocarTecnico,
    atualizarStatus: atualizarStatus,
    atualizarStatusV2: atualizarStatusV2,
    registrarEvidenciaV2: registrarEvidenciaV2,
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
function setupAssistenciaTecnicaV2() { return SGO_AST.setupV2(); }

// Compatibilidade direta para google.script.run quando o frontend procurar criarEntradaV2 sem prefixo astV2.
function criarEntradaV2(sessionId, payload) { return SGO_AST.criarEntradaV2(sessionId, payload); }
function listarAtendimentosV2(sessionId, filtros) { return SGO_AST.listarAtendimentosV2(sessionId, filtros); }
function obterAtendimentoV2(sessionId, atendimentoId) { return SGO_AST.obterAtendimentoV2(sessionId, atendimentoId); }
function astV2CriarEntrada(sessionId, payload) { return SGO_AST.criarEntradaV2(sessionId, payload); }
function astV2ListarAtendimentos(sessionId, filtros) { return SGO_AST.listarAtendimentosV2(sessionId, filtros); }
function astV2ObterAtendimento(sessionId, atendimentoId) { return SGO_AST.obterAtendimentoV2(sessionId, atendimentoId); }
function astV2IniciarAvaliacao(sessionId, atendimentoId, payload) { return SGO_AST.iniciarAvaliacaoV2(sessionId, atendimentoId, payload); }
function astV2AtualizarStatus(sessionId, atendimentoId, payload) { return SGO_AST.atualizarStatusV2(sessionId, atendimentoId, payload); }
function astV2RegistrarEvidencia(sessionId, atendimentoId, payload) { return SGO_AST.registrarEvidenciaV2(sessionId, atendimentoId, payload); }
function astV2SalvarDiagnostico(sessionId, atendimentoId, payload) { return SGO_AST.salvarDiagnosticoV2(sessionId, atendimentoId, payload); }
function astV2SalvarSolicitacao(sessionId, atendimentoId, payload) { return SGO_AST.salvarSolicitacaoV2(sessionId, atendimentoId, payload); }
function astV2AtualizarSolicitacao(sessionId, solicitacaoId, payload) { return SGO_AST.atualizarSolicitacaoV2(sessionId, solicitacaoId, payload); }
function astV2AtualizarSolicitacaoPeca(sessionId, solicitacaoId, payload) { return SGO_AST.atualizarSolicitacaoPecaV2(sessionId, solicitacaoId, payload); }
function astV2SalvarExecucao(sessionId, atendimentoId, payload) { return SGO_AST.salvarExecucaoV2(sessionId, atendimentoId, payload); }
function astV2SalvarConclusao(sessionId, atendimentoId, payload) { return SGO_AST.salvarConclusaoV2(sessionId, atendimentoId, payload); }
function astV2ConfirmarEntrega(sessionId, atendimentoId, payload) { return SGO_AST.confirmarEntregaV2(sessionId, atendimentoId, payload); }
function astV2Dashboard(sessionId) { return SGO_AST.dashboardV2(sessionId); }
function astV2ListarAlertas(sessionId) { return SGO_AST.listarAlertasV2(sessionId); }
function astV2UploadFoto(sessionId, atendimentoId, payload) { return SGO_AST.uploadFotoV2(sessionId, atendimentoId, payload); }
function astV2TrocarTecnico(sessionId, atendimentoId, payload) { return SGO_AST.trocarTecnicoV2(sessionId, atendimentoId, payload); }
function astV2EnviarOrcamento(sessionId, atendimentoId, payload) { return SGO_AST.enviarOrcamentoV2(sessionId, atendimentoId, payload); }
function astV2RegistrarAprovacaoCliente(sessionId, atendimentoId, payload) { return SGO_AST.registrarAprovacaoClienteV2(sessionId, atendimentoId, payload); }
function astV2RegistrarRecusaCliente(sessionId, atendimentoId, payload) { return SGO_AST.registrarRecusaClienteV2(sessionId, atendimentoId, payload); }
function astV2SolicitarPeca(sessionId, atendimentoId, payload) { return SGO_AST.solicitarPecaV2(sessionId, atendimentoId, payload); }
function astV2RegistrarCompraPeca(sessionId, atendimentoId, payload) { return SGO_AST.registrarCompraPecaV2(sessionId, atendimentoId, payload); }
function astV2RegistrarRecebimentoPeca(sessionId, atendimentoId, payload) { return SGO_AST.registrarRecebimentoPecaV2(sessionId, atendimentoId, payload); }
function astV2LiberarExecucao(sessionId, atendimentoId, payload) { return SGO_AST.liberarExecucaoV2(sessionId, atendimentoId, payload); }
function astV2EncaminharTerceiroStatus(sessionId, atendimentoId, payload) { return SGO_AST.encaminharTerceiroStatusV2(sessionId, atendimentoId, payload); }
function astV2EncaminharLaboratorioStatus(sessionId, atendimentoId, payload) { return SGO_AST.encaminharLaboratorioStatusV2(sessionId, atendimentoId, payload); }
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
