# FIN_FLASH_V2.9 — UX Definitiva por Perfil, Mobile/Desktop e Manual de Uso

**Aprovado em:** 2026-06-26  
**Ambiente:** DEV exclusivo — produção e Flash antigo intocados.

## Objetivo

Redesign completo da UX do módulo FIN_FLASH_V2:
- Roteamento visual por perfil (COLABORADOR vs FINANCEIRO)
- Correção do bug "tela estreita que depois expande"
- Manual de uso integrado ao módulo
- Terminologia corrigida (Prestação de Contas, Conferência de Gastos)
- Ações financeiras inacessíveis para colaborador

## O que foi feito

### Backend — `SGO_Fin_FlashV2.js`

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_OBTER_ESTADO_TELA_DEV()` | Atualizado: `versaoUX:'V2.9'`, novos campos `portais`, `colaboradorSemDashboardFinanceiro`, `manualIncluido`, `carregamentoPorDemanda` etc. |
| `FIN_FLASH_V2_OBTER_CONTEXTO_USUARIO_DEV()` | Verifica perfil do usuário logado via `Session.getActiveUser().getEmail()`. Retorna `{ok, perfil:'COLABORADOR'\|'FINANCEIRO', cpf, nomeColaborador, email, isColaborador, isFinanceiro}`. Default: FINANCEIRO se e-mail não encontrado em CONTAS. |
| `FIN_FLASH_V2_OBTER_MANUAL_USO_DEV()` | Retorna manual estruturado: `manual.colaborador` (5 seções) + `manual.financeiro` (5 seções) + `manual.status` (9 status explicados). |
| `EXECUTAR_FIN_FLASH_V2_9_TESTE_UX_PERFIL_MANUAL_DEV()` | Orquestradora — valida 21 itens obrigatórios. |

### Frontend — `JS_Fin_FlashV2.html` (reescrito)

#### Correção tela estreita

`finFlashV2Html_()` retorna imediatamente estrutura full-width com skeleton animado:
- CSS: `.fin-flash-v2-dev-shell{padding:0!important;max-width:none!important;width:100%!important;}`
- Container `#ffv2-wrap` com `.ffv2-wrap{width:100%}` ocupa toda a largura antes de qualquer dado chegar
- Skeleton header + nav + 3 cards de loading — layout estável desde o primeiro frame

#### Portal Colaborador

Ativado quando `FIN_FLASH_V2_OBTER_CONTEXTO_USUARIO_DEV()` retorna `perfil:'COLABORADOR'`.

Header: "Prestacao de Contas Flash" + badge verde "Colaborador" + toggle DEV.

5 abas:

| Aba | Conteúdo |
|---|---|
| Registrar Gasto | Form com valor, data, categoria, justificativa e comprovante obrigatório |
| Minhas Prestações | Tabela das prestações do colaborador (lazy) |
| Pendências | Aviso se há pendências + tabela (lazy) |
| Termo de Uso | Card informativo + botões "Ver termo" e "Li e aceito" |
| Manual | Seções do manual do colaborador + tabela de status (lazy) |

**Colaborador NÃO vê:** dashboard financeiro, logs gerais, lista de todos colaboradores, ações financeiras, conferência de gastos, documentos/relatórios.

#### Portal Financeiro

Ativado quando perfil é `FINANCEIRO` ou `ADMIN` (incluindo admin DEV).

Header: "Painel Financeiro Flash" + badge azul "Financeiro" + KPI row (6 cards, lazy).

6 abas:

| Aba | Conteúdo |
|---|---|
| Dashboard | Resumo KPIs + tabela pendências críticas (lazy) |
| Conferência de Gastos | Tabela de conciliações + botão "Ações financeiras" |
| Pendências | Tabela de pendências + botão "Ações financeiras" |
| Documentos | Grid de relatórios + termo + tabela documentos registrados (lazy) |
| Auditoria | Tabela de logs (lazy) |
| Manual | Seções do manual financeiro (lazy) |

**Painel de ações financeiras:** `display:none` por padrão. Expandido via botão em Conferência ou Pendências. Contém todos os campos e ações do V2.5 (conferir, corrigir, manter, resolver, bloquear, desbloquear, preparar cobrança).

#### Funções principais

| Função | Descrição |
|---|---|
| `ffv2St_()` | Estado global `window.__ffv2` — perfil, contexto, aba ativa, acoes |
| `ffv2Css_()` | CSS embutido completo — inclui override `.fin-flash-v2-dev-shell` |
| `finFlashV2Html_()` | Retorna CSS + skeleton full-width imediato |
| `finFlashV2CarregarDesktop_()` | Entry point: chama `FIN_FLASH_V2_OBTER_CONTEXTO_USUARIO_DEV()` → roteia portal |
| `ffv2RenderPortalC_(ctx)` | Renderiza portal colaborador |
| `ffv2RenderPortalF_(ctx)` | Renderiza portal financeiro + dispara KPIs |
| `ffv2NavC_(aba)` / `ffv2NavF_(aba)` | Troca aba e carrega conteúdo lazy |
| `ffv2LoadC_(aba)` / `ffv2LoadF_(aba)` | Dispatcher de conteúdo por aba |
| `ffv2FetchManual_(perfil)` | Carrega manual lazy via `FIN_FLASH_V2_OBTER_MANUAL_USO_DEV()` |
| `ffv2ManualHtml_(manual, perfil)` | Renderiza seções do manual |
| `ffv2AcoesHtml_()` | Painel de ações financeiras (oculto por padrão) |
| `ffv2ShowAcoes_(show)` | Mostra/oculta painel de ações |
| `ffv2Acao_(acao)` | Executa ação financeira (7 ações) |
| `ffv2Skel_(n)` | Cards skeleton animados para loading |
| `ffv2Badge_(status)` | Badge colorido por status |
| `ffv2Tabela_(cols, rows, emptyMsg)` | Tabela responsiva |
| `ffv2DevParaC_()` / `ffv2DevParaF_()` | Toggles DEV para testar ambos os portais |

#### Funções preservadas (compatibilidade)

| Função | Status |
|---|---|
| `finFlashV2Html_()` | Mantida — agora retorna skeleton + CSS V2.9 |
| `finFlashV2CarregarDesktop_()` | Mantida — agora chama contexto async |
| `finFlashV2CarregarTermo_()` | Mantida — ID `finFlashV2TermoTexto` preservado |
| `finFlashV2AceitarTermo_()` | Mantida — ID `finFlashV2TermoResultado` preservado |
| `finFlashV2ArquivoParaBase64_()` | Mantida intacta |
| `finFlashV2Escape_()` | Mantida intacta |
| `finFlashV2FmtMoeda_()` | Mantida intacta |
| `finFlashV2Tabela_()` | Mantida como alias para `ffv2Tabela_()` |
| `finFlashV2AuditarEstrutura_()` | Mantida como legado |

## Resultado da orquestradora (clasp run) — 2026-06-26

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "uxPerfilCorrigida": true,
  "portalColaboradorOk": true,
  "portalFinanceiroOk": true,
  "colaboradorSemDashboardFinanceiro": true,
  "colaboradorSemLogsGerais": true,
  "colaboradorSemTodosColaboradores": true,
  "financeiroDashboardCompleto": true,
  "acoesFinanceirasOcultasParaColaborador": true,
  "acoesNaoAbertasPorPadrao": true,
  "layoutResponsivoPrevisto": true,
  "manualUsoOk": true,
  "manualColaboradorOk": true,
  "manualFinanceiroOk": true,
  "statusExplicados": true,
  "comprovanteObrigatorioExplicado": true,
  "documentosOrganizados": true,
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
- Parse `JS_Fin_FlashV2.html` (1 bloco `<script>`): **OK**.
- `git diff --check`: **OK** (avisos CRLF apenas em arquivos não relacionados).
- `prompt()` em SGO_Fin_FlashV2.js e JS_Fin_FlashV2.html: **AUSENTE**.
- `confirm()` em SGO_Fin_FlashV2.js e JS_Fin_FlashV2.html: **AUSENTE**.
- `clasp --user fin_flash_v2_dev push`: enviado sem `--force`.
- `EXECUTAR_FIN_FLASH_V2_9_TESTE_UX_PERFIL_MANUAL_DEV`: **APROVADO** — `success:true, ok:true, bloqueios:[]`, 21/21 itens `true`.

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
