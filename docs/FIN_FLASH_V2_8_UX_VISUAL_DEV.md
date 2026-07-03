# FIN_FLASH_V2.8 — Correção Visual e UX no DEV

**Aprovado em:** 2026-06-27  
**Ambiente:** DEV exclusivo — produção e Flash antigo intocados.

## Objetivo

Transformar o FIN_FLASH_V2 de uma tela única empilhada em um módulo navegável com 4 visões separadas, layout limpo por perfil e ações financeiras ocultas por padrão.

## O que foi feito

### Backend — `SGO_Fin_FlashV2.js`

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_OBTER_ESTADO_TELA_DEV()` | Retorna estrutura da tela V2.8 (visões, sub-abas, versão UX) + status de todos os endpoints de dados. |
| `EXECUTAR_FIN_FLASH_V2_8_TESTE_UX_VISUAL_DEV()` | Orquestradora automática de validação UX. Verifica container, 4 visões, ações ocultas, dashboard, versão UX. |

### Frontend — `JS_Fin_FlashV2.html` (reescrito)

#### Estrutura anterior (removida)

- `finFlashV2Html_()` retornava bloco de auditoria + `FIN_FLASH_V2_MOBILE()` + `FIN_FLASH_V2_MOBILE_TERMO()` + `FIN_FLASH_V2_DESKTOP()` todos empilhados na mesma tela.
- `FIN_FLASH_V2_ACOES_FINANCEIRAS()` sempre visível.

#### Estrutura nova

Container principal `.ffv2-shell` com CSS premium embutido no `finFlashV2Html_()`.

**4 Visões principais** (nav por abas no topo):

| Visão | Conteúdo |
|---|---|
| **Colaborador** | Formulário de prestação com comprovante obrigatório + card do Termo (ler/aceitar) + tabela de pendências do colaborador |
| **Financeiro** | 8 KPI cards + 6 sub-abas: Dashboard, Prestações, Extratos, Conciliações, Pendências, Contas/Cartões |
| **Documentos e Termo** | Botões de relatórios (positivo, negativo, por colaborador, gerar/ver termo) + tabela de documentos registrados |
| **Auditoria** | Tabela de logs de auditoria |

**Painel de ações financeiras:** `display:none` por padrão. Expandido via botão "Ações financeiras" dentro da Visão Financeiro. Contém todos os campos e botões do V2.5.

#### Funções novas

| Função | Descrição |
|---|---|
| `ffv2St_()` | Estado global (`window.__ffv2`): visão atual, aba interna, dados carregados, painel aberto |
| `ffv2Css_()` | CSS premium embutido (cards, tabelas, badges, KPI cards, paleta SGO+) |
| `ffv2AbrirVisao_(visao)` | Troca entre Colaborador / Financeiro / Documentos / Auditoria |
| `ffv2EnviarPrestacao_()` | Envia prestação com comprovante obrigatório via `FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV` |
| `ffv2CarregarColaborador_()` | Carrega pendências do colaborador |
| `ffv2CarregarFinanceiro_()` | Carrega dashboard (KPIs) e dispara `ffv2CarregarTodasAbas_()` |
| `ffv2CarregarTodasAbas_()` | Carrega pendências, conciliações, prestações e extratos em sequência |
| `ffv2TrocarAbaFin_(aba)` | Troca sub-aba interna da Visão Financeiro |
| `ffv2RenderAbaFin_()` | Renderiza conteúdo da sub-aba ativa |
| `ffv2MostrarAcoes_(show)` | Mostra/oculta painel de ações financeiras |
| `ffv2GerarDoc_(acao)` | Dispara geração de relatório ou termo |
| `ffv2CarregarDocumentosTabela_()` | Carrega tabela de documentos registrados |
| `ffv2CarregarAuditoria_()` | Carrega tabela de logs |
| `ffv2ExecutarAcao_(acao)` | Executa ação financeira (conferir, corrigir, resolver, bloquear etc.) |
| `ffv2KpiCard_(titulo, valor)` | Gera card de KPI |
| `ffv2Badge_(status)` | Gera badge colorido por status |
| `ffv2TabelaSimples_(cols, rows, emptyMsg)` | Gera tabela responsiva |

#### Funções preservadas (inalteradas ou adaptadas)

| Função | Status |
|---|---|
| `finFlashV2Html_()` | Mantida — retorna o HTML completo incluindo o CSS |
| `finFlashV2CarregarDesktop_()` | Mantida — agora chama `ffv2AbrirVisao_('colaborador')` |
| `finFlashV2CarregarTermo_()` | Mantida — usa IDs `finFlashV2TermoTexto` (compatibilidade) |
| `finFlashV2AceitarTermo_()` | Mantida — usa ID `finFlashV2TermoResultado` (compatibilidade) |
| `finFlashV2ArquivoParaBase64_()` | Mantida intacta |
| `finFlashV2Escape_()` | Mantida intacta |
| `finFlashV2FmtMoeda_()` | Mantida intacta |
| `finFlashV2AuditarEstrutura_()` | Mantida como legado |
| `finFlashV2Tabela_()` | Mantida como alias para `ffv2TabelaSimples_()` |

## Carregamento por demanda

- Visão Colaborador: carrega pendências ao abrir.
- Visão Financeiro: carrega KPIs ao abrir, depois carrega todas as sub-abas em sequência (pendências → conciliações → prestações → extratos).
- Visão Documentos: carrega tabela de documentos ao abrir.
- Visão Auditoria: carrega logs ao abrir.
- Nenhum endpoint é chamado antes de o usuário navegar para a visão correspondente.

## Resultado da orquestradora (clasp run) — 2026-06-27

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "uxCorrigida": true,
  "containerPrincipalOk": true,
  "abasPrincipaisOk": true,
  "visaoColaboradorSeparada": true,
  "visaoFinanceiroSeparada": true,
  "documentosTermoSeparados": true,
  "auditoriaSeparada": true,
  "acoesOcultasPorPadrao": true,
  "dashboardCarregavel": true,
  "semHtmlCru": true,
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
- Parse `JS_Fin_FlashV2.html` (todos os blocos `<script>`): **OK**.
- `git diff --check`: **OK**.
- `prompt()` em SGO_Fin_FlashV2.js e JS_Fin_FlashV2.html: **AUSENTE**.
- `confirm()` em SGO_Fin_FlashV2.js e JS_Fin_FlashV2.html: **AUSENTE**.
- `clasp --user fin_flash_v2_dev push`: **84 arquivos** enviados às 22:43:17, sem `--force`.
- `EXECUTAR_FIN_FLASH_V2_8_TESTE_UX_VISUAL_DEV`: **APROVADO** — `success:true, ok:true, bloqueios:[]`.

## Regras preservadas

- DEV exclusivo: trava `ScriptApp.getScriptId() === DEV_ID` em toda entrada.
- Produção e Flash antigo: intocados.
- Menu principal em produção: não ligado.
- Deploy webapp novo: não executado.
- Importação real: não executada.
- `--force`: não usado.
- `prompt()` / `confirm()`: ausentes em todo código FIN_FLASH_V2.
- IA não aprova gasto sozinha: `iaAprovaSozinha:false` preservado.
- Todo gasto exige comprovante: regra intacta.
- Todo ato financeiro gera log/auditoria.
