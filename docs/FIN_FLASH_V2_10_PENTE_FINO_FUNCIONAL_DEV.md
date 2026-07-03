# FIN_FLASH_V2.10 — Pente Fino Funcional

**Aprovado em:** 2026-06-27  
**Ambiente:** DEV exclusivo — produção e Flash antigo intocados.

## Objetivo

Completar todas as ferramentas funcionais do módulo FIN_FLASH_V2 com:
- Portal Colaborador refeito com 5 abas reais
- Portal Financeiro expandido para 11 abas
- Gestão completa de colaboradores e cartões
- Importação de extrato Flash com pré-visualização obrigatória
- Conferência de gastos com filtros avançados e comprovante clicável
- Extrato por colaborador/CPF com preview A4
- Relatórios com texto inteligente e preview A4 inline
- Alertas e cobranças com envio real bloqueado (simulação apenas)
- Ortografia e acentuação corrigidas em todo o módulo

## Funções V2.10 (novas) em `SGO_Fin_FlashV2.js`

### Utilitários internos

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_uid10_(prefix)` | Gera ID único com UUID |
| `FIN_FLASH_V2_now10_()` | Timestamp formatado |
| `FIN_FLASH_V2_sheetCtx10_(aba)` | Wrapper que converte API interna `{sh,map,values}` para `{sheet,headers,data[]}`. Aceita nome curto ('CONTAS') ou completo. Tolera aba ausente. Converte Date→string automaticamente. |

### Gestão de Colaboradores e Cartões

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV(filtros)` | Lista contas com cartões vinculados. Filtros: cpf, status. |
| `FIN_FLASH_V2_CADASTRAR_COLABORADOR_DEV(payload)` | Cadastra novo colaborador. Valida CPF único. AMBIENTE_TESTE=SIM. |
| `FIN_FLASH_V2_ATUALIZAR_COLABORADOR_DEV(payload)` | Atualiza campos de colaborador por ID ou CPF. |
| `FIN_FLASH_V2_VINCULAR_CARTAO_COLABORADOR_DEV(payload)` | Vincula cartão FISICO ou VIRTUAL a um CPF. |
| `FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV(payload)` | Retorna conta + cartões + movimentações recentes. |

### Importação de Extrato Flash

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_PREVISUALIZAR_EXTRATO_FLASH_DEV(payload)` | Gera prévia com totalLinhas, totalGastos, colaboradoresEncontrados, chavePrevia. Pré-requisito obrigatório antes de confirmar. |
| `FIN_FLASH_V2_CONFIRMAR_IMPORTACAO_EXTRATO_FLASH_DEV(payload)` | Importa efetivamente. Requer chavePrevia. Idempotente via CHAVE_LOTE. Padrão: 2 linhas de teste DEV. |
| `FIN_FLASH_V2_LISTAR_LOTES_IMPORTACAO_DEV(filtros)` | Lista lotes importados agrupados por LOTE_ID. |
| `FIN_FLASH_V2_CONCILIAR_LOTE_IMPORTADO_DEV(payload)` | Cria conciliações e pendências automáticas para cada linha do lote. Score IA: 95 (com comprovante), 60 (sem comprovante), 20 (sem prestação). |

### Conferência de Gastos

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_FILTRAR_CONFERENCIA_GASTOS_DEV(filtros)` | Filtros: cpf, status, periodoInicio, periodoFim, limite. Adiciona sugestaoIA, riscoIA, confiancaIA por linha. |
| `FIN_FLASH_V2_OBTER_PREVIEW_COMPROVANTE_DEV(payload)` | Retorna preview.tipo:'AUSENTE'\|'IMAGEM'\|'PDF', base64, urlDrive, dados da prestação. |
| `FIN_FLASH_V2_CONCILIAR_MANUALMENTE_DEV(payload)` | Marca conciliação como CONCILIADO com motivo manual. Score=100. |
| `FIN_FLASH_V2_REPROVAR_COMPROVANTE_DEV(payload)` | Marca conciliação como REPROVADO com motivo. |
| `FIN_FLASH_V2_SOLICITAR_CORRECAO_COMPROVANTE_DEV(payload)` | Marca como AGUARDANDO_CORRECAO com motivo. |

### Extrato por Colaborador

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV(payload)` | Payload: cpf, periodoInicio, periodoFim, tipo:'gastos'\|'recargas'\|'todos', limite. Retorna conta, resumo{totalRecarregado,totalGasto,totalPendente,saldoEstimado}, movimentacoes[]. |
| `FIN_FLASH_V2_GERAR_EXTRATO_CONTA_CPF_DEV(payload)` | Gera htmlA4 do extrato e salva em DOCUMENTOS. |

### Relatórios com Preview A4

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_htmlA4Base_(titulo, nome, cpf, inicio, fim, resumo, itens, tipo)` | Gera HTML A4 completo: header SGO+, info, KPI grid, texto inteligente, tabela, rodapé. tipos: 'positivo'\|'negativo'\|'extrato'\|'pendencias'. |
| `FIN_FLASH_V2_PREVIEW_RELATORIO_DEV(payload)` | Retorna htmlA4 sem salvar. payload.tipo: 'positivo'\|'negativo'\|'pendencias'. |
| `FIN_FLASH_V2_GERAR_HTML_RELATORIO_A4_DEV(payload)` | Chama PREVIEW, salva em DOCUMENTOS, retorna documentoId + htmlA4. |
| `FIN_FLASH_V2_LISTAR_RELATORIOS_DEV(filtros)` | Lista documentos do tipo RELATORIO*. |

### Alertas e Cobranças

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_msgCobranca_(nome, valor, periodo)` | Gera texto padrão de cobrança. |
| `FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV(payload)` | Agrupa pendências por CPF, salva em ALERTAS com ENVIADO_REAL='NAO', aviso ENVIO_REAL_BLOQUEADO. |
| `FIN_FLASH_V2_SIMULAR_ENVIO_COBRANCAS_DEV(payload)` | Simula envio dos alertas PREPARADO. Nunca envia mensagens reais. Aviso ENVIO_REAL_BLOQUEADO. |
| `FIN_FLASH_V2_LISTAR_ALERTAS_COBRANCA_DEV(filtros)` | Lista alertas com filtros cpf/status. |
| `FIN_FLASH_V2_MARCAR_ALERTA_COMO_ENVIADO_DEV(payload)` | Marca STATUS='ENVIADO_SIMULADO', ENVIADO_REAL='NAO'. |

### Orquestradora

| Função | Descrição |
|---|---|
| `EXECUTAR_FIN_FLASH_V2_10_PENTE_FINO_FUNCIONAL_DEV()` | Valida 21 itens obrigatórios. Retorna JSON de 30 campos. |

## Frontend `JS_Fin_FlashV2.html` — V2.10

### Portal Colaborador (5 abas)

| Aba | Conteúdo |
|---|---|
| Registrar Gasto | Form: valor, data, categoria, comprovante (obrigatório), justificativa → `FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV` |
| Minhas Prestações | Tabela lazy de prestações do colaborador via `FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV` |
| Minhas Pendências | Alerta se há pendências + tabela via `FIN_FLASH_V2_LISTAR_ALERTAS_COBRANCA_DEV` |
| Termo de Uso | Ver e aceitar termo — IDs `finFlashV2TermoTexto` e `finFlashV2TermoResultado` preservados |
| Manual Rápido | Seções do manual colaborador lazy via `FIN_FLASH_V2_OBTER_MANUAL_USO_DEV` |

### Portal Financeiro (11 abas)

| Aba | Conteúdo |
|---|---|
| Dashboard | KPIs em tempo real + tabela pendências críticas |
| Colaboradores e Cartões | Tabela de contas + formulário de cadastro inline |
| Importar Extrato Flash | Instruções → pré-visualização obrigatória → confirmação → botão Conciliar Agora |
| Conferência de Gastos | Filtros (CPF, status, período) + tabela com Risco IA + painel ações (conciliar/reprovar/corrigir/comprovante) |
| Extrato por Colaborador | Filtros CPF/período/tipo + KPIs + tabela + botão Gerar A4 |
| Pendências | Tabela de pendências com severidade |
| Alertas e Cobranças | Botão Preparar + Simular + tabela alertas — envio real bloqueado |
| Documentos e Relatórios | Cards relatório positivo/negativo/pendências com pré-visualizar + gerar + lista documentos |
| Termos de Uso | Ver termo + registro de aceite por CPF/e-mail |
| Auditoria | Tabela de logs (últimos 80) |
| Manual de Uso | Seções financeiro + tabela de status |

### Funções auxiliares novas

- `ffv2Modal_(titulo, html)` / `ffv2FecharModal_()` — modal inline para preview A4 e comprovantes
- `ffv2PreviewComprovante_()` — clique → modal com imagem/PDF/aviso AUSENTE
- `ffv2PreviaExtrato_()` / `ffv2ConfirmarImportacao_()` / `ffv2ConciliarLote_()` — fluxo de importação
- `ffv2FiltrarConferencia_()` / `ffv2AcaoConc_(tipo)` — filtros e ações financeiras
- `ffv2BuscarExtratoCpf_()` / `ffv2GerarExtratoCpfA4_()` — extrato por colaborador
- `ffv2LoadAlertas_()` / `ffv2PrepararCobrancas_()` / `ffv2SimularEnvio_()` — alertas
- `ffv2PreviewRel_(tipo)` / `ffv2GerarRel_(tipo)` — relatórios com modal

## Resultado da orquestradora (clasp run) — 2026-06-27

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "penteFinoConcluido": true,
  "importarExtratoExiste": true,
  "previaImportacaoExiste": true,
  "botaoConciliarAgoraExiste": true,
  "cadastroColaboradoresExiste": true,
  "vinculoCartoesCpfExiste": true,
  "extratoPorColaboradorExiste": true,
  "filtroCpfPeriodoExiste": true,
  "conferenciaComFiltrosExiste": true,
  "previewComprovantePrevisto": true,
  "conciliacaoManualPrevista": true,
  "documentosPreviewA4": true,
  "relatoriosTextoInteligente": true,
  "relatoriosGraficosPrevistos": true,
  "alertasCobrancasExiste": true,
  "envioRealBloqueado": true,
  "mensagensDiariasSimulaveis": true,
  "manualUsoAtualizado": true,
  "ortografiaRevisada": true,
  "redundanciasRevisadas": true,
  "colaboradorSemFerramentasFinanceiras": true,
  "financeiroFerramentasCompletas": true,
  "menuDevLigado": true,
  "menuProducaoLigado": false,
  "webappDeployExecutado": false,
  "producaoAlterada": false,
  "flashAntigoAlterado": false,
  "forceUsado": false,
  "bloqueios": [],
  "avisos": []
}
```

## Validações locais

- `node --check SGO_Fin_FlashV2.js`: **OK**.
- Parse `JS_Fin_FlashV2.html` (bloco `<script>`): **OK**.
- `prompt()` em SGO_Fin_FlashV2.js e JS_Fin_FlashV2.html: **AUSENTE**.
- `confirm()` em SGO_Fin_FlashV2.js e JS_Fin_FlashV2.html: **AUSENTE**.
- `clasp --user fin_flash_v2_dev push`: enviado sem `--force`.
- `EXECUTAR_FIN_FLASH_V2_10_PENTE_FINO_FUNCIONAL_DEV`: **APROVADO** — `success:true, ok:true, bloqueios:[]`, 21/21 itens `true`.

## Regras preservadas

- DEV exclusivo: trava `ScriptApp.getScriptId() === DEV_ID` em toda entrada.
- Produção e Flash antigo: intocados.
- Menu principal em produção: não ligado.
- Deploy webapp novo: não executado.
- Importação real: não executada.
- `--force`: não usado.
- `prompt()` / `confirm()`: ausentes em todo código FIN_FLASH_V2.
- IA não aprova gasto sozinha — sugestão apenas.
- Todo gasto exige comprovante: regra intacta.
- Todo ato financeiro gera log/auditoria.
- Envio real de cobranças: BLOQUEADO (`ENVIADO_REAL='NAO'` em todos os alertas).
