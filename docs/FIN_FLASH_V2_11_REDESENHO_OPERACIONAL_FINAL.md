# FIN_FLASH_V2.11 — Redesenho Operacional Final

**Aprovado em:** 2026-06-28
**Ambiente:** DEV exclusivo — produção e Flash antigo intocados.

## Objetivo

Redesenho operacional completo do módulo FIN_FLASH_V2 com foco no uso real diário:

1. Dashboard por colaborador (nome/CPF/última recarga/saldo/situação) — cards visuais, não tabela técnica
2. Colaboradores e Cartões — CRUD completo com soft delete e múltiplos cartões por CPF
3. Importar Extrato Flash — fluxo completo com prévia obrigatória → confirmar → conciliar
4. Conferência de Gastos — filtros por colaborador/CPF/período/cartão + comprovante clicável
5. Extrato por Colaborador — filtros + preview A4 + geração de documento
6. Pendências — resumo por colaborador primeiro, depois lista detalhada
7. Alertas e Cobranças — simulação bloqueada, histórico, configuração diária
8. Documentos e Relatórios — central organizada por tipo com preview A4 + imprimir
9. Termos de Uso — situação por colaborador com preview A4 do termo assinado
10. Auditoria — linha do tempo operacional (logs técnicos filtrados)
11. Manual de Uso — seções colaborador e financeiro com guia de status
12. Ortografia — acentuação corrigida em todo o módulo
13. Portal Colaborador — 5 abas redesenhadas (Minhas Pendências + Meus Comprovantes)

## Funções V2.11 (novas) em `SGO_Fin_FlashV2.js`

### Dashboard por Colaborador

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_OBTER_DASHBOARD_COLABORADORES_DEV(filtros)` | Cards por colaborador: nome, CPF, última recarga, saldo estimado, qtd pendências, situação |
| `FIN_FLASH_V2_CALCULAR_SITUACAO_COLABORADOR_DEV_(pendenciasCpf)` | Retorna JUSTIFICADO / BLOQUEADO_POR_PENDENCIA / VALOR_DIVERGENTE / PENDENTE_DE_COMPROVANTE / PENDENTE_DE_JUSTIFICATIVA |

### Gestão Avançada de Colaboradores

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_EDITAR_COLABORADOR_DEV(payload)` | Alias para ATUALIZAR_COLABORADOR_DEV |
| `FIN_FLASH_V2_INATIVAR_COLABORADOR_DEV(payload)` | Soft delete: STATUS=INATIVO + motivo |
| `FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV(payload)` | Vincula cartão FISICO ou VIRTUAL a um CPF. Valida duplicidade pelo final |
| `FIN_FLASH_V2_INATIVAR_CARTAO_COLABORADOR_DEV(payload)` | Soft delete de cartão: STATUS=INATIVO |
| `FIN_FLASH_V2_LISTAR_CARTOES_DO_COLABORADOR_DEV(payload)` | Lista todos os cartões de um CPF |
| `FIN_FLASH_V2_VALIDAR_CARTAO_VINCULADO_A_CPF_DEV_(cpf, finalCartao)` | Guard interno: impede duplicidade |

### Importação — Prévia de Conciliação

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_PREVIEW_CONCILIACAO_LOTE_DEV(payload)` | Prévia de conciliação sem gravar: retorna `{ok, itens[], totalLinhas, loteId}` |
| `FIN_FLASH_V2_GERAR_DOCUMENTO_CONCILIACAO_LOTE_DEV(payload)` | Gera documento A4 da conciliação de um lote |

### Conferência de Gastos — Aliases V2.11

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_OBTER_COMPROVANTE_PREVIEW_DEV(payload)` | Alias para OBTER_PREVIEW_COMPROVANTE_DEV |
| `FIN_FLASH_V2_REPROVAR_CONFERENCIA_DEV(payload)` | Alias para REPROVAR_COMPROVANTE_DEV |
| `FIN_FLASH_V2_SOLICITAR_CORRECAO_CONFERENCIA_DEV(payload)` | Alias para SOLICITAR_CORRECAO_COMPROVANTE_DEV |

### Extrato por Colaborador

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_BUSCAR_EXTRATO_COLABORADOR_DEV(payload)` | Alias para LISTAR_MOVIMENTACOES_CPF_DEV com padrões V2.11 |
| `FIN_FLASH_V2_PREVIEW_EXTRATO_COLABORADOR_DEV(payload)` | Preview A4 sem gravar |
| `FIN_FLASH_V2_GERAR_HTML_A4_EXTRATO_COLABORADOR_DEV(payload)` | Gera e salva extrato A4 em DOCUMENTOS |

### Pendências por Colaborador

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_RESUMIR_PENDENCIAS_POR_COLABORADOR_DEV(filtros)` | Agrupamento por CPF com situação, valor total, ação recomendada |
| `FIN_FLASH_V2_BUSCAR_PENDENCIAS_DEV(filtros)` | Busca com filtros: cpf, colaborador, periodoInicio, periodoFim |
| `FIN_FLASH_V2_OBTER_DETALHE_PENDENCIA_DEV(payload)` | Retorna pendência + extrato + prestação + alertas relacionados |
| `FIN_FLASH_V2_LISTAR_PENDENCIAS_COBRANCA_DEV(filtros)` | Lista pendências com status PENDENTE/ABERTO para cobrança |

### Alertas e Cobranças — Gestão Completa

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_BLOQUEAR_ENVIO_REAL_COBRANCA_DEV_()` | Guard: `{bloqueado:true, motivo:'ENVIO_REAL_BLOQUEADO_DEV'}` |
| `FIN_FLASH_V2_CONFIGURAR_COBRANCA_DIARIA_DEV(payload)` | Configura hora e severidade mínima em CONFIG |
| `FIN_FLASH_V2_SIMULAR_COBRANCAS_DIARIAS_DEV(payload)` | Simula cobranças diárias com base na config salva |
| `FIN_FLASH_V2_PREPARAR_COBRANCA_MANUAL_DEV(payload)` | Prepara cobrança manual para um CPF específico |
| `FIN_FLASH_V2_LISTAR_HISTORICO_COBRANCAS_DEV(filtros)` | Lista alertas com texto da mensagem incluso |

### Documentos Organizados

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_LISTAR_DOCUMENTOS_ORGANIZADOS_DEV(filtros)` | Retorna `grupos{}` por tipo: RELATORIO_POSITIVO, RELATORIO_NEGATIVO, RELATORIO_PENDENCIAS, EXTRATO_COLABORADOR_A4, TERMO, COMPROVANTE, OUTROS |
| `FIN_FLASH_V2_PREVIEW_DOCUMENTO_A4_DEV(payload)` | Preview A4 unificado: positivo/negativo/extrato/termo por tipo+id |
| `FIN_FLASH_V2_GERAR_GRAFICOS_RELATORIO_DEV_(dados)` | Gera barras de progresso SVG para relatórios |

### Termos de Uso por Colaborador

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_LISTAR_TERMOS_COLABORADORES_DEV(filtros)` | Retorna `{termoPendentes[], termoAceitaram[], totalPendente}` |
| `FIN_FLASH_V2_GERAR_HTML_A4_TERMO_ASSINADO_DEV(payload)` | Gera HTML A4 do termo assinado para um CPF/aceiteId |
| `FIN_FLASH_V2_PREVIEW_TERMO_ASSINADO_DEV(payload)` | Preview sem gravar |

### Auditoria Operacional

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_LISTAR_AUDITORIA_OPERACIONAL_DEV(filtros)` | Filtra logs técnicos (SETUP, SCHEMA, CONCILIACAO_AUTOMATICA). Retorna linha do tempo operacional |
| `FIN_FLASH_V2_OBTER_DETALHE_AUDITORIA_DEV(payload)` | Detalhe completo de uma entrada de auditoria por ID |

### Orquestradora

| Função | Descrição |
|---|---|
| `EXECUTAR_FIN_FLASH_V2_11_TESTE_OPERACIONAL_FINAL_DEV()` | Valida 23 itens obrigatórios. Retorna JSON de 33 campos. |

## Frontend `JS_Fin_FlashV2.html` — V2.11

### Portal Colaborador (5 abas redesenhadas)

| Aba | ID | Conteúdo |
|---|---|---|
| Registrar Gasto | `registrar` | Form: valor, data, categoria, comprovante (obrigatório), justificativa |
| Minhas Pendências | `pendencias` | Tabela de pendências filtrada pelo CPF do colaborador via `FIN_FLASH_V2_BUSCAR_PENDENCIAS_DEV` |
| Meus Comprovantes | `comprovantes` | Tabela de prestações enviadas com status do comprovante via `FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV` |
| Termo de Uso | `termo` | Ver e aceitar o termo vigente |
| Manual Rápido | `manual` | Seções do manual do colaborador |

### Portal Financeiro (11 abas — todas com V2.11)

| Aba | Mudança V2.11 |
|---|---|
| Dashboard | Cards visuais por colaborador (nome/CPF/recarga/saldo/situação) via `OBTER_DASHBOARD_COLABORADORES_DEV` |
| Colaboradores e Cartões | Botões Inativar e Gerenciar Cartões por linha; painel de gestão de múltiplos cartões por CPF |
| Importar Extrato Flash | Sem mudança (já funcionava em V2.10) |
| Conferência de Gastos | Sem mudança (já funcionava em V2.10) |
| Extrato por Colaborador | Sem mudança (já funcionava em V2.10) |
| Pendências | Resumo por colaborador em cards com situação codificada por cor; lista detalhada abaixo |
| Alertas e Cobranças | + Botão Configurar Cobrança Diária (horaEnvio, severidadeMin); + seção Histórico; envio real sempre bloqueado |
| Documentos e Relatórios | Organizado por tipo com grupo header; botão Preview A4 por documento; botão Imprimir no modal |
| Termos de Uso | + Lista de colaboradores com status (Pendente/Aceito); botão Preview A4 do termo assinado por colaborador |
| Auditoria | Usa `LISTAR_AUDITORIA_OPERACIONAL_DEV` (sem logs técnicos); mostra linha do tempo operacional |
| Manual de Uso | Sem mudança |

### Novas funções frontend

- `ffv2InativarColaborador_(idOuCpf)` — inline confirm card sem prompt/confirm nativos
- `ffv2ConfirmarInativar_(idOuCpf)` — executa inativação após confirmação
- `ffv2AbrirGerenciarCartoes_(cpf)` — painel de cartões por CPF
- `ffv2CarregarCartoesCpf_(cpf)` — lista cartões via `LISTAR_CARTOES_DO_COLABORADOR_DEV`
- `ffv2SalvarCartao_()` — cadastra cartão via `CADASTRAR_CARTAO_COLABORADOR_DEV`
- `ffv2InativarCartao_(cartaoId, cpf)` — inativa cartão via `INATIVAR_CARTAO_COLABORADOR_DEV`
- `ffv2AbrirConfigCobranca_()` / `ffv2SalvarConfigCobranca_()` — configuração de cobrança diária
- `ffv2CarregarHistoricoCobrancas_()` — histórico via `LISTAR_HISTORICO_COBRANCAS_DEV`
- `ffv2PreviewDocA4_(tipo, id)` — preview A4 unificado de documentos
- `ffv2CarregarTermosColaboradores_()` — situação de termos por colaborador
- `ffv2PreviewTermoColaborador_(cpf, aceiteId)` — preview A4 do termo assinado
- `ffv2LoadMeusComprovantes_()` — movimentações com status de comprovante (Portal Colaborador)

### CSS V2.11 adicionado

- `.ffv2-sit-card` — card visual por colaborador (bordas coloridas por situação)
- `.ffv2-colaboradores-grid` — grid responsivo `repeat(auto-fill, minmax(200px,1fr))`
- `@media print` — oculta tudo exceto conteúdo do modal (para imprimir A4)

### Modal V2.11

- Botão **Imprimir** (azul) adicionado ao cabeçalho — chama `window.print()`
- `@media print` direciona impressão apenas para o conteúdo do modal

## Resultado da orquestradora (clasp run) — 2026-06-28

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "redesenhoOperacionalConcluido": true,
  "dashboardPorColaborador": true,
  "dashboardNomeCpfUltimaRecargaSaldoSituacao": true,
  "cadastroEditarInativar": true,
  "multiplosCartoesPorCpf": true,
  "importacaoArquivoPreviaConfirmarConciliar": true,
  "previaConciliacaoExiste": true,
  "conferenciaFiltrosColaboradorPeriodo": true,
  "comprovanteClicavel": true,
  "conciliacaoManualExiste": true,
  "extratoColaboradorPreviewA4": true,
  "pendenciasPorColaborador": true,
  "alertasCobrancasFinalizado": true,
  "envioRealBloqueado": true,
  "documentosOrganizados": true,
  "relatorioPreviewA4Impressao": true,
  "relatorioTextoInteligente": true,
  "termoAssinadoPreviewA4": true,
  "auditoriaFuncional": true,
  "manualAtualizado": true,
  "ortografiaRevisada": true,
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
- `node --check SGO_Fin_FlashV2_Setup.js`: **OK**.
- Parse `JS_Fin_FlashV2.html` (1 bloco `<script>`): **OK**.
- `prompt()` em SGO_Fin_FlashV2.js e JS_Fin_FlashV2.html: **AUSENTE**.
- `confirm()` em SGO_Fin_FlashV2.js e JS_Fin_FlashV2.html: **AUSENTE**.
- Menu DEV (`inicializarMenuDevFinFlashV2_`) em JS_Core.html: **PRESENTE**.
- Menu produção: **NÃO LIGADO** (`menuProducaoLigado:false`).
- Envio real de cobranças: **BLOQUEADO** (`ENVIO_REAL_BLOQUEADO_DEV`).
- `git diff --check`: **OK** (avisos CRLF apenas em arquivos não relacionados).
- `clasp --user fin_flash_v2_dev push`: enviado sem `--force`.
- `EXECUTAR_FIN_FLASH_V2_11_TESTE_OPERACIONAL_FINAL_DEV`: **APROVADO** — `success:true, ok:true, bloqueios:[]`, 23/23 itens obrigatórios `true`.

## Regras preservadas

- DEV exclusivo: trava `ScriptApp.getScriptId() === DEV_ID` em toda entrada.
- PRODUCAO_V2 e Flash antigo: intocados.
- Menu principal em produção: não ligado.
- Deploy webapp novo: não executado.
- Importação real: não executada.
- `--force`: não usado.
- `prompt()` / `confirm()`: ausentes em todo código FIN_FLASH_V2.
- IA não aprova gasto sozinha — sugestão apenas.
- Todo gasto exige comprovante: regra intacta.
- Todo ato financeiro gera log/auditoria.
- Envio real de cobranças: BLOQUEADO (`ENVIADO_REAL='NAO'` em todos os alertas).
