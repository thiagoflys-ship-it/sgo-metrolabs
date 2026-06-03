# Inventário do Módulo Assistência Técnica — SGO+
**Atualizado em:** 2026-06-03
**Fase:** V2 — Produção @194. C.14.6A/C.14.6B publicadas: finalização da O.S V2, status FINALIZADO e ações nos previews premium. Próxima frente: a definir.
**Arquivos ativos:** `SGO_AssistenciaTecnica.js` · `JS_AssistenciaTecnica.html`

---

## Situação dos Backups

| Arquivo | Data | Observação |
|---------|------|------------|
| `SGO_AssistenciaTecnica_LEGADO_20260512.js.bak` | 12/05/2026 | Estado exato no início do rebuild V2 |
| `JS_AssistenciaTecnica_LEGADO_20260512.html.bak` | 12/05/2026 | Estado exato no início do rebuild V2 |
| `SGO_AssistenciaTecnica_BACKUP_ANTES_REBUILD.js.bak` | 11/05/2026 | Backup anterior (202.5 KB — não usar como referência) |
| `JS_AssistenciaTecnica_BACKUP_ANTES_REBUILD.html.bak` | 11/05/2026 | Backup anterior (90.4 KB — não usar como referência) |

---

## Histórico de Commits

| Hash | Descrição |
|------|-----------|
| `047637b` | feat(AT): rebuild completo módulo Assistência Técnica V2 (base) |
| `67f4a63` | feat(ORC): adicionar schema inicial de Orcamentos Mini CRM |
| `e0c3bf2` | feat(AT): adicionar solicitações de peças no fluxo V2 (C.5 + C.5B) |
| `e46f58c` | feat(AT): listar documentos emitidos no frontend V2 |
| `3740b81` | chore(AT): remover botão temporário do visualizador HTML |
| `8bda9ac` | feat(AT): adicionar preview HTML do relatório técnico V2 |
| `5552ff5` | feat(AT): adicionar preview HTML no frontend V2 |
| `b1d270d` | feat(AT): adicionar preview HTML do protocolo de saída V2 |
| `b639ad8` | feat(AT): adicionar preview HTML do protocolo no frontend V2 |
| `3f2cc1e` | style(AT): aprimorar layout PDF do relatório técnico V2 |
| `fc971f3` | style(AT): aprimorar layout PDF do protocolo de saída V2 |
| `b9dc63c` | feat(AT): verificar documento existente V2 |
| `9bc98f5` | feat(AT): adicionar anti-duplicidade documental V2 |
| `457e5e1` | feat(AT): aprimorar preview A4 com impressao e WhatsApp |
| `22db9af` | style(AT): reorganizar aba Documentos em 4 blocos premium |
| `2134d8e` | feat(AT): adicionar frontend de orcamento V2 |
| `c8ed48f` | feat(AT): adicionar assinatura opcional na entrega V2 |
| `d681f40` | ux(AT): esclarecer autorizacao do cliente no orcamento V2 |
| `6949c76` | fix(AT): corrigir retornos de fluxo pos-execucao V2 |
| `84bc4c2` | fix(AT): permitir finalizacao da OS V2 |
| `6089df0` | feat(AT): adicionar acoes aos previews premium V2 |

---

## Ponto de Entrada

| Item | Valor |
|------|-------|
| Botão de menu | `menu-btn-assistencia_tecnica` |
| Módulo | `assistencia_tecnica` |
| Include HTML | `<?!= include('JS_AssistenciaTecnica'); ?>` |
| Função de render | `renderAssistenciaTecnicaModulo_()` — linha 238 |
| Roteamento | `JS_Core.html` → `abrir("assistencia_tecnica")` |
| Flag V2 | `AST_STATE.usarEntradaV2 === true` ativa o caminho V2 |

---

## Perfis com Acesso

| Perfil | Acesso Visual | Permissão mínima backend |
|--------|--------------|--------------------------|
| ADMIN | Sim | Todas |
| GESTOR | Sim | Todas |
| DIRETORIA | Sim | Todas |
| TECNICO | Sim | TECNICO |
| METROLOGIA | Sim | TECNICO + LABORATORIO + RELATORIOS |
| COMERCIAL | Não (área interna) | RELATORIOS + COMERCIAL |
| CLIENTE | Não | Apenas consulta pública por token |

---

## Estados Globais do Frontend

```javascript
AST_STATE = {
  clientes: [],         unidades: [],       equipamentos: [],
  tecnicos: [],         fornecedores: [],   entradas: [],
  dashboard: {},        dashboardGerencial: {},
  selecionada: null,    detalhe: null,
  tab: "entrada",       acessorios: [],     filtros: {},
  usarEntradaV2: true   // ativa renderização V2
}
```

---

## Funções do Frontend — V2 Implementadas (JS_AssistenciaTecnica.html)

### Renderização / Estrutura V2

| Função | Linha | O que faz |
|--------|-------|-----------|
| `renderAssistenciaTecnicaModulo_()` | 238 | Raiz do módulo — detecta V2 e renderiza Home V2 |
| `astHomeV2Html_()` | 266 | HTML da Home V2 com KPIs e acesso rápido |
| `astHomeV2FallbackHtml_(err)` | 304 | Fallback de erro na Home V2 |
| `astCarregarTudo_()` | 344 | Carrega contexto (clientes, técnicos, equipamentos) |
| `astListaShellHtml_()` | 397 | Shell da listagem com filtros e container |
| `astEsteiraOperacionalHtml_()` | 474 | Barra de etapas/esteira operacional |
| `astMostrarLista_()` | 539 | Abre tela de listagem V2 |
| `astPesquisar_()` | 545 | Filtra atendimentos e re-renderiza lista |
| `astEnviarListagemBackend_()` | 576 | Dispatcher backend (V2/legado) para listagem |
| `astNormalizarListaAtendimentos_()` | 589 | Normaliza retorno do backend para renderização |
| `astRenderEntradas_()` | 598 | Renderiza cards/tabela de atendimentos |

### Nova Entrada V2

| Função | Linha | O que faz |
|--------|-------|-----------|
| `astAbrirEntrada_()` | 815 | Wizard de nova entrada V2 (etapas) |
| `astSalvarEntrada_()` | 907 | Valida e envia nova entrada |
| `astEnviarEntradaBackend_()` | 960 | Dispatcher V2/legado para criação |
| `astPayloadEntradaV2_()` | 984 | Monta payload V2 a partir do formulário |
| `astEvidenciasEntradaPreview_()` | 1014 | Preview de fotos antes de enviar |

### Detalhe V2

| Função | Linha | O que faz |
|--------|-------|-----------|
| `astAbrirDetalhe_(id, opcoes)` | 1051 | Abre detalhe; `{ preservar: true }` mantém tela |
| `astRenderDetalhe_()` | 1100 | Dispatcher V2/legado de renderização do detalhe |
| `astRenderDetalheV2_(res)` | 1165 | Renderiza layout completo do detalhe V2 |
| `astDetalheV2HeroHtml_(e)` | 1190 | Header do detalhe (protocolo, status, próxima ação) |
| `astEsteiraDetalheV2Html_(e)` | 1228 | Barra de progresso de etapas no detalhe |
| `astV2UltimoDiagnostico_(res)` | 1269 | Extrai último diagnóstico do histórico |
| `astResumoTecnicoV2Html_(e, ...)` | 1287 | Seção Resumo Técnico (problema, condição, diagnóstico, acessórios, fotos) |
| `astSolicitacoesPecaV2Html_(sol)` | 1335 | Seção Peças Solicitadas com botão de atualizar status |
| `astDiagnosticoResumoHtml_(diag)` | 1458 | Bloco de diagnóstico técnico dentro do Resumo |
| `astTimelineV2Html_(historico)` | 1499 | Timeline de movimentações |
| `astAcoesEtapaV2Html_(e)` | 1541 | Painel de ações da etapa atual (botões contextuais) |
| `astDocumentosV2Html_(e)` | 1577 | Ações de documentos (protocolo, etiqueta, WhatsApp) |
| `astRastreabilidadeV2Html_(e)` | 1592 | QR Token + botões de QR e acompanhamento |

### Ações Inline V2 (cards)

| Função | Linha | O que faz |
|--------|-------|-----------|
| `astV2IniciarAvaliacao_(id)` | 1613 | Chama backend iniciarAvaliacaoV2 |
| `astV2MostrarStatusCard_(id, status)` | 1650 | Abre card de atualização de status do atendimento |
| `astV2ConfirmarStatus_(id)` | 1683 | Submete atualização de status do atendimento |
| `astV2RegistrarEvidencia_(id)` | 1702 | Abre card de evidência textual |
| `astV2ConfirmarEvidencia_(id)` | 1736 | Submete evidência |
| `astV2MostrarDiagnosticoCard_(id, st)` | 1758 | Abre card de diagnóstico técnico |
| `astV2ConfirmarDiagnostico_(id)` | 1814 | Submete diagnóstico |
| `astV2MostrarSolicitacaoPecaCard_(id)` | 1851 | Abre card de solicitação de peça (C.5) |
| `astV2ConfirmarSolicitacaoPeca_(id)` | 1899 | Submete solicitação de peça (C.5) |
| `astV2MostrarStatusPecaCard_(solId)` | 1398 | Abre card de atualização de status da peça (C.6) |
| `astV2ConfirmarStatusPeca_(solId)` | 1432 | Submete atualização de status da peça (C.6) |

### Containers de Cards no DOM

| ID do container | Gerenciado por |
|----------------|----------------|
| `astV2DiagCardContainer` | `astV2MostrarDiagnosticoCard_` |
| `astV2StatusCardContainer` | `astV2MostrarStatusCard_` |
| `astV2EvidCardContainer` | `astV2RegistrarEvidencia_` |
| `astV2PecaCardContainer` | `astV2MostrarSolicitacaoPecaCard_` |
| `astV2StatusPecaCardContainer` | `astV2MostrarStatusPecaCard_` |

> Regra: ao abrir qualquer card, os outros são limpos. Cada função de "Mostrar" reseta os containers concorrentes.

---

## Funções do Frontend — Legado Preservado

| Função | Linha | Status |
|--------|-------|--------|
| `astAtualizarStatus_(id)` | 1933 | Legado — usa `prompt()` — não usar com V2 ativo |
| `astTrocarTecnico_(id)` | 1944 | Legado — usa `prompt()` |
| `astSalvarDiagnostico_(id)` | 1954 | Legado |
| `astSalvarPeca_(id)` | 1979 | Legado |
| `astSalvarTeste_(id)` | 1995 | Legado |
| `astSalvarExecucao_(id)` | 2010 | Legado |
| `astConcluirTecnica_(id)` | 2027 | Legado |
| `astAdicionarEvidencia_(id)` | 2042 | Legado |
| `astEnviarTerceiro_(entradaId)` | 2080 | Legado ativo (Terceiros não rebuild) |
| `astRegistrarLab_(entradaId)` | 2098 | Legado ativo (Lab não rebuild) |
| `astMostrarGerencial_()` | 2114 | Dashboard gerencial |
| `astAtualizarDashboardGerencial_()` | 2157 | Atualiza gerencial |
| `astGerarPdfGerencial_(tipo)` | 2170 | PDF gerencial |
| `astTriagemHtml_(e)` | 2238 | LEGADO — remover futuramente |
| `astAtualizarStatusTriagem_(id)` | 2534 | LEGADO — remover futuramente |

---

## Funções do Backend V2 — SGO_AssistenciaTecnica.js

### Infraestrutura V2 (privadas — dentro do IIFE)

| Função | Linha | O que faz |
|--------|-------|-----------|
| `setupV2()` | 2346 | Cria/verifica abas V2, renomeia AST_ENTRADAS → LEGADO |
| `v2Protocolo_()` | 2400 | Gera protocolo único `AST-AAAAMMDD-HHmmss-NNN` |
| `v2Token_()` | 2406 | Gera token UUID para acompanhamento |
| `v2Bandeira_(status)` | 2415 | Status → bandeira (AZUL_CINZA / AMARELO / VERDE / VERMELHO) |
| `v2ProximaAcao_(status)` | 2417 | Status → texto de próxima ação |
| `v2StatusValido_(atual, novo)` | 2419 | Valida transição pela matriz TRANSICOES_V2 |
| `v2SolicitacaoDescricao_(sol)` | 2423 | Extrai descrição legível da solicitação |
| `v2SolicitacaoAtiva_(sol)` | 2427 | Retorna true se solicitação não está em estado terminal |
| `v2RegistrarHistorico_(...)` | 2431 | Insere linha em AST_HISTORICO |
| `v2AtualizarStatus_(...)` | 2447 | Atualiza STATUS + BANDEIRA + PROXIMA_ACAO + registra histórico |
| `v2CriarAlerta_(...)` | 2464 | Insere alerta em AST_ALERTAS (com deduplicação) |
| `v2EnriquecerAtendimento_(at)` | 2488 | Adiciona `_bandeira`, `_proxima_acao`, `_label` ao objeto |
| `v2ResolverContextoEntrada_(...)` | 2525 | Resolve cliente/unidade/equipamento para nova entrada |
| `v2ValidarPayloadEntrada_(...)` | 2547 | Valida campos obrigatórios da entrada |

### Funções V2 Públicas (expostas via objeto SGO_AST + wrappers)

| Função interna | Wrapper global | Linha aprox. | O que faz |
|----------------|---------------|--------------|-----------|
| `criarEntradaV2` | `astV2CriarEntrada` | 2689 | Cria novo atendimento V2 |
| `listarAtendimentosV2` | `astV2ListarAtendimentos` | 2829 | Lista atendimentos com filtros |
| `obterAtendimentoV2` | `astV2ObterAtendimento` | 2845 | Retorna atendimento + historico + fotos + acessorios + solicitacoes + alertas |
| `iniciarAvaliacaoV2` | `astV2IniciarAvaliacao` | 2862 | Avança para EM_BANCADA / DIAGNOSTICO_EM_ANDAMENTO |
| `registrarEvidenciaV2` | `astV2RegistrarEvidencia` | 2887 | Registra evidência textual em AST_HISTORICO |
| `atualizarStatusV2` | `astV2AtualizarStatus` | 2913 | Atualização manual de status com validação de transição |
| `salvarDiagnosticoV2` | `astV2SalvarDiagnostico` | 2929 | Salva diagnóstico técnico em AST_HISTORICO |
| `salvarSolicitacaoV2` | `astV2SalvarSolicitacao` | 3006 | Cria solicitação genérica em AST_SOLICITACOES |
| `atualizarSolicitacaoV2` | `astV2AtualizarSolicitacao` | 3045 | Atualiza solicitação genérica |
| `atualizarSolicitacaoPecaV2` | `astV2AtualizarSolicitacaoPeca` | ~3071 | Atualiza status da peça + timestamps + historico STATUS_PECA; se INSTALADO tenta avançar para LIBERADO_PARA_EXECUCAO (C.6) |
| `salvarExecucaoV2` | `astV2SalvarExecucao` | ~3120 | Registra execução técnica |
| `salvarConclusaoV2` | `astV2SalvarConclusao` | ~3150 | Registra conclusão técnica |
| `confirmarEntregaV2` | `astV2ConfirmarEntrega` | ~3180 | Confirma entrega com assinatura |
| `dashboardV2` | `astV2Dashboard` | ~3220 | KPIs operacionais V2 |
| `listarAlertasV2` | `astV2ListarAlertas` | ~3250 | Lista alertas ativos do usuário |
| `uploadFotoV2` | `astV2UploadFoto` | ~3265 | Upload de foto em AST_FOTOS |
| `trocarTecnicoV2` | `astV2TrocarTecnico` | ~3310 | Troca técnico responsável + histórico |
| `enviarOrcamentoV2` | `astV2EnviarOrcamento` | ~3340 | Cria solicitação ORCAMENTO + avança status |
| `registrarAprovacaoClienteV2` | `astV2RegistrarAprovacaoCliente` | ~3390 | Aprovação do orçamento pelo cliente |
| `registrarRecusaClienteV2` | `astV2RegistrarRecusaCliente` | ~3420 | Recusa do orçamento pelo cliente |
| `solicitarPecaV2` | `astV2SolicitarPeca` | ~3460 | Cria solicitação PECA em AST_SOLICITACOES + histórico (C.5) |
| `registrarCompraPecaV2` | `astV2RegistrarCompraPeca` | ~3520 | Marca peça como COMPRADO |
| `registrarRecebimentoPecaV2` | `astV2RegistrarRecebimentoPeca` | ~3550 | Marca peça como RECEBIDO + alerta técnico |
| `liberarExecucaoV2` | `astV2LiberarExecucao` | ~3585 | Libera para execução após verificações |
| `encaminharTerceiroStatusV2` | `astV2EncaminharTerceiroStatus` | ~3610 | Encaminha para terceiro |
| `encaminharLaboratorioStatusV2` | `astV2EncaminharLaboratorioStatus` | ~3665 | Encaminha para laboratório |

---

## Wrappers google.script.run (Seção Global — fim do arquivo)

```javascript
// Setup
setupAssistenciaTecnicaV2()          → SGO_AST.setupV2()

// V2 — compatibilidade sem prefixo
criarEntradaV2(SESSION, payload)
listarAtendimentosV2(SESSION, filtros)
obterAtendimentoV2(SESSION, id)

// V2 — prefixo astV2
astV2CriarEntrada(SESSION, payload)
astV2ListarAtendimentos(SESSION, filtros)
astV2ObterAtendimento(SESSION, id)
astV2IniciarAvaliacao(SESSION, atId, payload)
astV2AtualizarStatus(SESSION, atId, payload)
astV2RegistrarEvidencia(SESSION, atId, payload)
astV2SalvarDiagnostico(SESSION, atId, payload)
astV2SalvarSolicitacao(SESSION, atId, payload)
astV2AtualizarSolicitacao(SESSION, solId, payload)
astV2AtualizarSolicitacaoPeca(SESSION, solId, payload)   ← C.6
astV2SalvarExecucao(SESSION, atId, payload)
astV2SalvarConclusao(SESSION, atId, payload)
astV2ConfirmarEntrega(SESSION, atId, payload)
astV2Dashboard(SESSION)
astV2ListarAlertas(SESSION)
astV2UploadFoto(SESSION, atId, payload)
astV2TrocarTecnico(SESSION, atId, payload)
astV2EnviarOrcamento(SESSION, atId, payload)
astV2RegistrarAprovacaoCliente(SESSION, atId, payload)
astV2RegistrarRecusaCliente(SESSION, atId, payload)
astV2SolicitarPeca(SESSION, atId, payload)               ← C.5
astV2RegistrarCompraPeca(SESSION, atId, payload)
astV2RegistrarRecebimentoPeca(SESSION, atId, payload)
astV2LiberarExecucao(SESSION, atId, payload)
astV2EncaminharTerceiroStatus(SESSION, atId, payload)
astV2EncaminharLaboratorioStatus(SESSION, atId, payload)

// Legado (ainda ativos)
astContexto / astListarUnidades / astListarEquipamentos
astCriarEntrada / astObterEntrada / astListarEntradas
astTrocarTecnico / astAtualizarStatus
astSalvarDiagnostico / astSalvarPeca / astAtualizarPeca
astRegistrarExecucao / astConcluirTecnica / astAdicionarEvidencia
astGerarDocumentoEntrada / astGerarEtiqueta / astGerarEtiquetaPdf
astObterResumoComercial / astObterWhatsapp / astRegistrarAcao
astObterDashboardGerencial
-- Terceiros/Lab (legado ativo):
astRegistrarEnvioTerceiro / astSalvarAcessorioTerceiro / astAnexarDocumentoTerceiro
astRegistrarAcompanhamentoTerceiro / astRegistrarRetornoTerceiro
astRegistrarInspecaoRetornoTerceiro / astGerarDocumentoTerceiro
astRegistrarEntradaLaboratorio / astAdicionarPadraoLaboratorio
astRegistrarEnsaioLaboratorio / astAnexarEvidenciaLaboratorio
astConsolidarResultadoLaboratorio / astGerarDocumentoLaboratorio
```

---

## Banco de Dados V2

### Tabelas Ativas (criadas pelo setupV2)

| Tabela | Schema resumido | Observação |
|--------|-----------------|------------|
| `AST_ATENDIMENTOS` | ID, PROTOCOLO, STATUS, BANDEIRA, PROXIMA_ACAO, CLIENTE_ID/NOME, UNIDADE_ID/NOME, EQUIPAMENTO_ID/NOME, TECNICO_ID/NOME, PROBLEMA_RELATADO, CONDICAO_FISICA, PRIORIDADE, PRAZO_PROMETIDO, QR_TOKEN_ACOMPANHAMENTO, QR_URL_ACOMPANHAMENTO, CRIADO_EM... | Tabela principal V2 |
| `AST_HISTORICO` | ID, ATENDIMENTO_ID, TIPO, STATUS_ANTERIOR, STATUS_NOVO, DESCRICAO, OBSERVACAO (JSON), PROXIMA_ACAO, EXECUTADO_POR, EXECUTADO_EM | Trilha de auditoria. TIPO: STATUS, SOLICITACAO, STATUS_PECA, EVIDENCIA_TECNICA, DIAGNOSTICO... |
| `AST_SOLICITACOES` | ID, ATENDIMENTO_ID, TIPO (PECA/ORCAMENTO/TERCEIRO/LAB), CATEGORIA, DESCRICAO, QUANTIDADE, URGENCIA, JUSTIFICATIVA_TECNICA, OBSERVACAO, FORNECEDOR_ID, FORNECEDOR_NOME, VALOR_ESTIMADO, VALOR_APROVADO, STATUS, SOLICITADO_POR, SOLICITADO_EM, APROVADO_POR, APROVADO_EM, COMPRADO_EM, RECEBIDO_EM, INSTALADO_EM, TERCEIRO_ID, LAB_ID | Escopo ampliado vs AST_PECAS legado |
| `AST_FOTOS` | ID, ATENDIMENTO_ID, TIPO_FOTO, LINK_DRIVE, DESCRICAO_FOTO, UPLOAD_POR, UPLOAD_EM, VISIBILIDADE_PUBLICA | |
| `AST_ACESSORIOS` | ID, ATENDIMENTO_ID, DESCRICAO, ITEM, QUANTIDADE, ESTADO, OBSERVACAO | |
| `AST_ASSINATURAS` | ID, ATENDIMENTO_ID, TIPO_ASSINATURA, ETAPA, SIGNATARIO_DOC, SIGNATARIO_PAPEL, DATA_HORA, HASH_VALIDACAO | Nova — inédita |
| `AST_DOCUMENTOS` | ID, ATENDIMENTO_ID, TIPO_DOCUMENTO, NUMERO_DOCUMENTO, TITULO, FILE_ID, LINK_ARQUIVO, TOKEN_VALIDACAO, URL_VALIDACAO, QR_CODE_VALIDACAO_LINK, QR_CODE_ACOMPANHAMENTO_LINK, STATUS, GERADO_EM | 2 QR separados |
| `AST_ALERTAS` | ID, ATENDIMENTO_ID, TIPO_ALERTA, SEVERIDADE, MENSAGEM, STATUS, DESTINATARIO_ID, DESTINATARIO_PERFIL, GERADO_EM, LIDO_EM, RESOLVIDO_EM | Com deduplicação |

### Tabela Legado Congelada

| Tabela | Status |
|--------|--------|
| `AST_ENTRADAS_LEGADO` | Renomeada de AST_ENTRADAS pelo setupV2 — congelada, somente leitura |

### Tabelas Legado Ativas (Terceiros/Lab — fora do escopo V2)

```
AST_TERCEIROS, AST_TERCEIROS_ACESSORIOS, AST_TERCEIROS_ANEXOS,
AST_TERCEIROS_ACOMPANHAMENTOS, AST_TERCEIROS_DOCUMENTOS,
AST_LAB_ENTRADAS, AST_LAB_ENSAIOS, AST_LAB_PADROES,
AST_LAB_RESULTADOS, AST_LAB_DOCUMENTOS, AST_LAB_EVIDENCIAS,
AST_INDICADORES_DIARIOS, AST_PRODUTIVIDADE_TECNICOS,
AST_CONFORMIDADE, AST_RELATORIOS_GERADOS, AST_DIAGNOSTICOS,
AST_TESTES_BANCADA, AST_PECAS, AST_MOVIMENTACOES
```

---

## Status V2 do Atendimento (21 estados)

| Status | Bandeira | Próxima ação padrão |
|--------|----------|---------------------|
| ENTRADA_REGISTRADA | AZUL_CINZA | Aguardar avaliacao tecnica |
| AGUARDANDO_DIAGNOSTICO | AMARELO | Iniciar avaliacao e diagnostico |
| EM_BANCADA | AMARELO | Realizar diagnostico tecnico |
| DIAGNOSTICO_EM_ANDAMENTO | AMARELO | Concluir diagnostico |
| DIAGNOSTICO_CONCLUIDO | AMARELO | Definir proximos passos |
| AGUARDANDO_ORCAMENTO | AMARELO | Elaborar e enviar orcamento |
| ORCAMENTO_ENVIADO | AMARELO | Aguardar resposta do cliente |
| AGUARDANDO_APROVACAO_CLIENTE | AMARELO | Aguardar aprovacao/recusa |
| ORCAMENTO_APROVADO | AMARELO | Solicitar/adquirir pecas ou liberar execucao |
| ORCAMENTO_RECUSADO | VERMELHO | Encerrar ou renegociar |
| AGUARDANDO_PECA | AMARELO | Aguardar chegada da peca solicitada |
| AGUARDANDO_TERCEIRO | AMARELO | Acompanhar servico externo |
| LIBERADO_PARA_EXECUCAO | AMARELO | Iniciar execucao tecnica |
| EXECUCAO_EM_ANDAMENTO | AMARELO | Concluir reparo/manutencao |
| EXECUCAO_CONCLUIDA | VERDE | Registrar conclusao tecnica |
| AGUARDANDO_CALIBRACAO | AMARELO | Realizar calibracao |
| CONCLUIDO_TECNICAMENTE | VERDE | Agendar entrega |
| AGUARDANDO_ENTREGA | VERDE | Entregar ao cliente |
| ENTREGUE | VERDE | — (terminal) |
| CANCELADO | VERMELHO | — (terminal) |
| NAO_REPARADO | VERMELHO | Encaminhar para devolucao |

## Status V2 da Solicitação de Peça (AST_SOLICITACOES.STATUS)

| Status | Significado | Timestamp gravado |
|--------|-------------|-------------------|
| PENDENTE | Recém-criada | — |
| EM_COTACAO | Em processo de cotação | — |
| AGUARDANDO_APROVACAO | Aguardando aprovação interna | — |
| APROVADO | Aprovada para compra | APROVADO_EM |
| COMPRADO | Compra efetuada | COMPRADO_EM |
| RECEBIDO | Peça recebida fisicamente | RECEBIDO_EM |
| INSTALADO | Peça instalada no equipamento | INSTALADO_EM |
| CANCELADO | Cancelada | — |
| RECUSADO | Recusada pela gestão | RECUSADO_EM |

> Estados terminais (botão "Atualizar Status" oculto): CANCELADO, RECUSADO, INSTALADO

---

## Matriz de Transições V2 do Atendimento

```
ENTRADA_REGISTRADA        → AGUARDANDO_DIAGNOSTICO, EM_BANCADA, CANCELADO
AGUARDANDO_DIAGNOSTICO    → EM_BANCADA, CANCELADO
EM_BANCADA                → DIAGNOSTICO_EM_ANDAMENTO, DIAGNOSTICO_CONCLUIDO, CANCELADO
DIAGNOSTICO_EM_ANDAMENTO  → DIAGNOSTICO_CONCLUIDO, CANCELADO
DIAGNOSTICO_CONCLUIDO     → AGUARDANDO_ORCAMENTO, LIBERADO_PARA_EXECUCAO, CANCELADO
AGUARDANDO_ORCAMENTO      → ORCAMENTO_ENVIADO, CANCELADO
ORCAMENTO_ENVIADO         → AGUARDANDO_APROVACAO_CLIENTE, ORCAMENTO_APROVADO, CANCELADO
AGUARDANDO_APROVACAO_CLIENTE → ORCAMENTO_APROVADO, ORCAMENTO_RECUSADO, CANCELADO
ORCAMENTO_APROVADO        → AGUARDANDO_PECA, AGUARDANDO_TERCEIRO, LIBERADO_PARA_EXECUCAO, CANCELADO
ORCAMENTO_RECUSADO        → NAO_REPARADO, AGUARDANDO_ENTREGA, CANCELADO
AGUARDANDO_PECA           → LIBERADO_PARA_EXECUCAO, CANCELADO
AGUARDANDO_TERCEIRO       → LIBERADO_PARA_EXECUCAO, CANCELADO
LIBERADO_PARA_EXECUCAO    → EXECUCAO_EM_ANDAMENTO, CANCELADO
EXECUCAO_EM_ANDAMENTO     → EXECUCAO_CONCLUIDA, CANCELADO
EXECUCAO_CONCLUIDA        → EXECUCAO_EM_ANDAMENTO, AGUARDANDO_CALIBRACAO, CONCLUIDO_TECNICAMENTE, NAO_REPARADO, CANCELADO
AGUARDANDO_CALIBRACAO     → CONCLUIDO_TECNICAMENTE, NAO_REPARADO, CANCELADO
CONCLUIDO_TECNICAMENTE    → AGUARDANDO_ENTREGA, NAO_REPARADO, CANCELADO
AGUARDANDO_ENTREGA        → ENTREGUE, CANCELADO
ENTREGUE                  → (terminal)
CANCELADO                 → (terminal)
NAO_REPARADO              → AGUARDANDO_ENTREGA, CANCELADO
```

---

## Tipos de Evento em AST_HISTORICO

| TIPO | Gerado por |
|------|-----------|
| `STATUS` | `v2AtualizarStatus_`, `atualizarStatusV2` |
| `SOLICITACAO` | `salvarSolicitacaoV2`, `solicitarPecaV2`, `registrarCompraPecaV2`, etc. |
| `STATUS_PECA` | `atualizarSolicitacaoPecaV2` (C.6) |
| `EVIDENCIA_TECNICA` | `registrarEvidenciaV2` |
| `DIAGNOSTICO` | `salvarDiagnosticoV2` |
| `FOTO` | `uploadFotoV2` |
| `TECNICO` | `trocarTecnicoV2` |

---

## Botões do Painel de Ações por Status (astAcoesEtapaV2Html_)

| Status | Botões disponíveis |
|--------|--------------------|
| ENTRADA_REGISTRADA, AGUARDANDO_DIAGNOSTICO | Iniciar Avaliacao |
| EM_BANCADA, DIAGNOSTICO_EM_ANDAMENTO, DIAGNOSTICO_CONCLUIDO | Registrar Diagnostico · Solicitar Peca |
| AGUARDANDO_PECA | Solicitar Peca (adicional) |
| DIAGNOSTICO_CONCLUIDO, AGUARDANDO_ORCAMENTO | Enviar Orçamento V2 |
| ORCAMENTO_ENVIADO, AGUARDANDO_APROVACAO_CLIENTE | Registrar Resposta do Cliente |
| LIBERADO_PARA_EXECUCAO, EXECUCAO_EM_ANDAMENTO, EXECUCAO_CONCLUIDA | Registrar Execução V2 |
| EXECUCAO_CONCLUIDA, EXECUCAO_EM_ANDAMENTO | Registrar Teste / Validação V2 |
| EXECUCAO_CONCLUIDA, AGUARDANDO_CALIBRACAO, CONCLUIDO_TECNICAMENTE | Registrar Conclusão Técnica V2 |
| CONCLUIDO_TECNICAMENTE, AGUARDANDO_ENTREGA, NAO_REPARADO | Registrar Entrega V2 |
| Todos (exceto terminais) | Registrar Evidência · Atualizar Status |

---

## Dois QR Codes — Separação Obrigatória

| Tipo | Campo | Usado em | Gerado por |
|------|-------|----------|-----------|
| QR de Acompanhamento | `QR_TOKEN_ACOMPANHAMENTO`, `QR_URL_ACOMPANHAMENTO` | Etiqueta, consulta pública | `criarEntradaV2()` |
| QR de Validação Documental | `TOKEN_VALIDACAO`, `URL_VALIDACAO`, `HASH_SHA256` | Documentos PDF oficiais | `SGO_DocumentFactory` + `SGO_Validacao` |

> **Regra crítica:** nunca cruzar os dois QRs.

---

## Dependências com Outros Módulos

| Módulo | Integração | Status |
|--------|-----------|--------|
| `SGO_DATA` | getAll, getById, insert, update, getManyByField | Ativo |
| `SGO_CFG` | SHEETS (S), STATUS, PRIORIDADES, LOGO_URL | Ativo |
| `SGO_Missoes.js` | `v2MissaoStub_` — stub ativo, integração real pendente | Stub |
| `SGO_DocumentFactory.js` | Templates PDF (protocolo, etiqueta, relatório) | Ativo legado / pendente V2 |
| `SGO_QRCode.js` | Geração de QR | Ativo |
| `SGO_Validacao.js` | Token/hash para documentos | Ativo |
| `SGO_IA.js` | Botão IA para lapidar texto (pendente front) | Pendente |
| `SGO_Main.js` | Rota pública `consultarPublico(token)` | Ativo legado |
| `JS_Core.html` | Roteamento — sem alteração | Intacto |

---

## O que Está Implementado (V2)

| Etapa | Funcionalidade | Status |
|-------|---------------|--------|
| A | Home V2 (KPIs, acesso rápido) | ✅ |
| B | Nova Entrada V2 (wizard completo) | ✅ |
| C.1 | Listagem V2 (filtros, cards) | ✅ |
| C.2 | Detalhe V2 (hero, esteira, resumo, timeline) | ✅ |
| C.2.1 | Atualizar Status V2 | ✅ |
| C.2.2 | Registrar Evidência V2 | ✅ |
| C.2.3 | Registrar Diagnóstico V2 | ✅ |
| C.2.4 | Diagnóstico aparece no Resumo Técnico | ✅ |
| C.5 | Solicitar Peça V2 (card inline + backend) | ✅ push 13:31 |
| C.5B | Peças Solicitadas no Detalhe V2 | ✅ push 13:47 |
| C.6 | Atualizar Status da Peça (card + backend) | ✅ commit 9bc98f5 |
| E.1 | Listar Documentos Emitidos (frontend V2) | ✅ commit e46f58c |
| E.2 | Preview HTML Relatório Técnico | ✅ commit 8bda9ac |
| E.3 | Preview HTML Protocolo de Saída | ✅ commit b1d270d |
| E.4 | Layout PDF Relatório Técnico | ✅ commit 3f2cc1e |
| E.5 | Layout PDF Protocolo de Saída | ✅ commit fc971f3 |
| E.6 | Verificar Documento Existente V2 | ✅ commit b9dc63c |
| E.7 | Anti-duplicidade Documental V2 | ✅ commit 9bc98f5 |
| E.8.3 | Validação completa (cancelar / abrir existente / gerar nova versão / sem registro em preview) | ✅ **2026-06-01** |
| E.8.4 | Pente fino final — auditoria estática + node --check + 0 backticks + 0 novos prompt() + protegidos íntegros | ✅ **2026-06-01** |
| E.9 | Preview A4 premium — botão Imprimir (iframe.print) + WhatsApp seguro via PDF oficial | ✅ commit 457e5e1 · deploy @177 |
| E.10 | Aba Documentos reorganizada em 4 blocos (Pré-visualização / Emissão Oficial / Emitidos / Orientações) | ✅ commit 22db9af · deploy @178 |
| **E.11** | **Teste pós-deploy em produção @178 — fechamento da etapa documental AT V2** | ✅ **2026-06-01** |
| C.3 | Registrar Execução V2 — auditado e funcional (backend c99077b + frontend existente) | ✅ auditado 2026-06-01 |
| C.4 (fluxo) | Fluxo pós-execução V2 auditado: Teste/Validação, Conclusão Técnica, Entrega — todos funcionais | ✅ auditado 2026-06-01 |
| C.5.1 | Enviar Orçamento V2 frontend (cards + resumo + resposta do cliente) | ✅ commit 2134d8e · deploy @180 |
| **C.5.2** | **Teste pós-deploy C.5.1 em produção @180 — C.5 Enviar Orçamento V2 fechado** | ✅ **2026-06-01** |
| C.9.1 | Assinatura opcional na entrega V2 | ✅ commit c8ed48f · deploy @182 |
| C.5.3 | UX do orçamento aguardando autorização do cliente | ✅ commit d681f40 · deploy @182 |
| **Deploy @182** | **C.9.1 assinatura opcional + C.5.3 UX orçamento — deployment `AKfycbyNnXLa3Bc4U2BkCnO7F_pScoJrLthlyDQ9oRKi6s1kk9oKOqPmDsuibRMO1iCDTTT4dQ`; sem setup; sem setupOrcamentosV2; ORC intocado; sem --force** | ✅ **2026-06-01** |
| C.10.1 | Fluxo pós-execução V2: teste reprovado retorna para EXECUCAO_EM_ANDAMENTO; Registrar Execução aparece em EXECUCAO_CONCLUIDA; conclusão SEM_REPARO/REPROVADO avança para NAO_REPARADO; entrega com FINALIZAR_ATENDIMENTO=N não encerra como ENTREGUE | ✅ commit 6949c76 · deploy @183 |
| **Deploy @183** | **C.10.1 fluxo pós-execução V2 — deployment `AKfycbyNnXLa3Bc4U2BkCnO7F_pScoJrLthlyDQ9oRKi6s1kk9oKOqPmDsuibRMO1iCDTTT4dQ`; sem setup; sem setupOrcamentosV2; ORC intocado; sem --force** | ✅ **2026-06-01** |
| C.14.6A | Finalização da O.S / atendimento V2: botão/card "Finalizar O.S", backend `finalizarAtendimentoV2`, wrapper `astV2FinalizarAtendimento`, wrapper frontend `astV2FinalizarAtendimento_`, status FINALIZADO e preview exibindo "O.S Finalizada" | ✅ commit 84bc4c2 · deploy @194 |
| C.14.6B | Ações nos previews premium V2: Voltar, Imprimir, Gerar PDF Oficial, Baixar PDF, Enviar WhatsApp e Copiar Link; Baixar/WhatsApp/Copiar usam documento oficial existente; Voltar/Imprimir não gravam documento, histórico ou status; geração oficial mantém anti-duplicidade | ✅ commit 6089df0 · deploy @194 |
| **Deploy @194** | **Produção atual — C.14.6A finalização da O.S + C.14.6B ações nos previews premium — deployment `AKfycbyNnXLa3Bc4U2BkCnO7F_pScoJrLthlyDQ9oRKi6s1kk9oKOqPmDsuibRMO1iCDTTT4dQ`; sem setup; sem setupOrcamentosV2; ORC intocado; sem --force; nenhum arquivo funcional alterado durante o deploy** | ✅ **2026-06-03** |

---

## O que Está Pendente (próximas etapas)

| Etapa | Funcionalidade |
|-------|---------------|
| C.4 (ORC) | Integração ORC/Mini-CRM com orçamentos AT (requer setupOrcamentosV2 — planejamento separado) |
| C.7 | Integração real com SGO_Missoes (remover stub) |
| C.8 | Alertas automáticos (reimplementar `gerarAlertasEntrada_`) |
| C.14.6C.1 | Microcorreção visual futura: label `AT_PROTOCOLO_ENTRADA_V2` pode aparecer bruto em documentos emitidos; pendência visual não bloqueante |

---

## Alertas a Reimplementar (C.8)

```
ENTRADA_REGISTRADA_SEM_TECNICO
AGUARDANDO_DIAGNOSTICO_ATRASADO
DIAGNOSTICO_PENDENTE
ORCAMENTO_PENDENTE
APROVACAO_PENDENTE
PECA_PENDENTE
TERCEIRO_PENDENTE
EXECUCAO_PARADA
EQUIPAMENTO_AGUARDANDO_ENTREGA
ENTREGA_SEM_DOCUMENTO_FINAL
ATENDIMENTO_SEM_FOTOS
ATENDIMENTO_SEM_CONCLUSAO_TECNICA
```

---

## Riscos Ativos

| Risco | Severidade | Situação |
|-------|-----------|----------|
| C.5/C.5B/C.6/E.8/E.9/E.10 publicados — deployment @178 ativo | — | RESOLVIDO |
| C.9.1/C.5.3 publicados — deployment @182 ativo | — | RESOLVIDO |
| C.10.1 fluxo pós-execução publicado — deployment @183 ativo | — | RESOLVIDO |
| C.14.6A/C.14.6B publicados — deployment @194 ativo | — | RESOLVIDO |
| Label `AT_PROTOCOLO_ENTRADA_V2` pode aparecer bruto em documentos emitidos | BAIXO | Pendência visual não bloqueante para microcorreção futura |
| `DATA_PREVISTA` de peça não persiste no schema (coletada no form, salva só no historico) | BAIXO | Decisão consciente — C.6 |
| Status `AGUARDANDO_PECAS` (legado) não exibe botão "Solicitar Peça" no V2 | BAIXO | Só afeta atendimentos migrados |
| Terceiros/Lab ainda em caminho legado — transições podem conflitar com V2 | MÉDIO | Escopo fora do rebuild |
| Sem testes automatizados — quebras são silenciosas | ALTO | Validação manual por etapa |
| `consultarPublico()` exposta via `SGO_Main.js` — URL pública não pode quebrar | ALTO | Wrapper legado mantido |
| `astTriagemHtml_` e `astAtualizarStatusTriagem_` ainda no código (linhas 2238, 2534) | BAIXO | Remover após V2 estabilizar |

---

## Regras de Trabalho no Módulo

- Não alterar: `ORC`, `SGO_Config.js`, `SGO_Data.js`, `SGO_Setup_v2.js`, `JS_Core.html`, `SGO_DocumentFactory.js`, Mobile
- Arquivos permitidos: `SGO_AssistenciaTecnica.js` e `JS_AssistenciaTecnica.html`
- Proibido: `prompt()` em funções V2, backticks/template strings em HTML, schema novo sem setup
- Sequência obrigatória: implementar → validar (`node --check` + grep backticks + grep prompt) → push → commit
- Nunca fazer push `--force` nem deploy sem autorização explícita
