# FIN_FLASH_V2.10.1 — Hotfix Tela Travada no Skeleton / Carregamento

**Aprovado em:** 2026-06-27  
**Ambiente:** DEV exclusivo — produção e Flash antigo intocados.

## Problema

Após V2.10, ao abrir "DEV EXCLUSIVO > FIN Flash V2 — DEV":
- Header "Painel Financeiro — Cartão Flash" e badge Financeiro apareciam
- Nav permanecia com skeleton (áreas cinzas animadas)
- Pane permanecia com skeleton
- Abas e ferramentas não apareciam
- Usuário ficava sem ação — sem botão de retry, sem mensagem de erro

## Diagnóstico

### Causa raiz 1 — Skeleton como placeholder do nav

`finFlashV2Html_()` inicializava `#ffv2-nav-box` com `ffv2Skel_(1)` (um bloco cinza animado).
`ffv2RenderPortalF_` deveria substituir esse skeleton pelos 11 botões de abas — mas qualquer exceção **silenciosa** dentro do `withSuccessHandler` de `google.script.run` impedia essa substituição.

Resultado: header atualizava (primeira linha de `ffv2RenderPortalF_`), mas o nav ficava como skeleton para sempre.

### Causa raiz 2 — Funções backend inexistentes

O frontend V2.10 chamava três funções que não existiam no backend:

| Chamada no frontend | Função no backend | Situação |
|---|---|---|
| `FIN_FLASH_V2_OBTER_DASHBOARD_DEV()` | `FIN_FLASH_V2_OBTER_DASHBOARD_FINANCEIRO_DEV()` | Nome diferente |
| `FIN_FLASH_V2_OBTER_PENDENCIAS_DEV()` | `FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV()` | Nome diferente + mapeamento de campos |
| `FIN_FLASH_V2_OBTER_LOGS_DEV()` | `FIN_FLASH_V2_LISTAR_LOGS_DEV()` | Nome diferente + mapeamento de campos |

Essas falhas disparavam `withFailureHandler` que escrevia no `#ffv2-pane` — mas a `ffv2CarregarKpis_()` tentava atualizar `#ffv2-kpis` que poderia não existir se o fluxo travasse antes.

### Causa raiz 3 — Ausência de timeout/fallback

Sem timeout, um skeleton que ficasse visível por qualquer razão era permanente. O usuário não tinha nenhuma indicação de erro nem botão de retry.

### Causa raiz 4 — Exceções silenciosas no withSuccessHandler

`ffv2RenderPortalF_` e `ffv2RenderPortalC_` não tinham try/catch. Uma exceção JavaScript dentro do `withSuccessHandler` de `google.script.run` é silenciosa — não aparece no console e não tem fallback.

## Correções aplicadas

### Frontend (`JS_Fin_FlashV2.html`)

#### 1. `finFlashV2Html_()` — Shell estático imediato

- **Antes:** nav renderizava `ffv2Skel_(1)` (skeleton cinza) + pane renderizava `ffv2Skel_(3)`
- **Depois:** nav renderiza os **11 botões de abas Financeiro IMEDIATAMENTE**, sem depender de backend
- Pane renderiza mensagem "Carregando dados…" (não skeleton)
- `setTimeout(ffv2TimeoutFallback_, 8000)` agendado automaticamente ao renderizar

#### 2. Nova função `ffv2TimeoutFallback_()`

- Chamada automaticamente após 8 segundos
- Se `ffv2St_().portalCarregado === false`, exibe card de erro com botão "Tentar novamente"
- Não dispara se o portal já carregou com sucesso

#### 3. Nova função `ffv2ErroRender_(msg)`

- Exibe erro visível no header (fundo vermelho) + no pane (card vermelho com detalhe técnico)
- Exibe botão "Tentar novamente" que chama `finFlashV2CarregarDesktop_()`
- Chamada por `ffv2RotearPortal_` e `finFlashV2CarregarDesktop_` em caso de exceção

#### 4. `finFlashV2CarregarDesktop_()` — Failure handler robusto

- **Antes:** failure handler só atualizava `#ffv2-pane` (nav ficava como skeleton)
- **Depois:** failure handler chama `ffv2ErroRender_()` (atualiza header + pane + retry button)
- Success handler envolto em try/catch → exceções viram `ffv2ErroRender_`

#### 5. `ffv2RotearPortal_()` — try/catch + flag de carregamento

- `ffv2St_().portalCarregado = true` definido logo no início (cancela o timeout)
- Corpo envolto em try/catch → exceções viram `ffv2ErroRender_`

#### 6. `ffv2RenderPortalF_()` — Defensivo, sem reconstruir nav

- **Antes:** reconstruía `#ffv2-nav-box` innerHTML (redundante + ponto de falha)
- **Depois:** nav já existe do `finFlashV2Html_()` — só atualiza header e KPIs
- `kpiBox` verificado antes de usar (`if (kpiBox) { ... }`)
- Envolto em try/catch → exceções viram `ffv2ErroRender_`

#### 7. `ffv2RenderPortalC_()` — Defensivo

- Envolto em try/catch
- Todas as buscas por elemento com null-check (`if (hdrBox)`, `if (kpiBox)`)
- Entidades HTML usadas para acentos em strings literais

#### 8. IIFE removida

O IIFE final `(function(){ if (el) finFlashV2CarregarDesktop_(); })()` foi removido. Era redundante — `renderFinFlashV2DevModulo_()` em JS_Core.html já chama `finFlashV2CarregarDesktop_()` explicitamente. O IIFE criava risco de double-call se houvesse race condition.

### Backend (`SGO_Fin_FlashV2.js`) — 4 novas funções

#### `FIN_FLASH_V2_OBTER_DASHBOARD_DEV()`
Wrapper sobre `FIN_FLASH_V2_OBTER_DASHBOARD_FINANCEIRO_DEV()` com mapeamento de campos:
- `kpis.totalPendente` → `dados.totalPendencias`
- `kpis.totalRecarregado` → `dados.totalRecargas`
- `resumos.pendencias` → `pendencias[]`

#### `FIN_FLASH_V2_OBTER_PENDENCIAS_DEV(filtros)`
Wrapper sobre `FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV()` com remapeamento:
- `colaborador` → `nomeColaborador`
- `valor` → `VALOR`
- `severidade.toUpperCase()` → `SEVERIDADE`
- `prazo` → `PRAZO`

#### `FIN_FLASH_V2_OBTER_LOGS_DEV(filtros)`
Wrapper sobre `FIN_FLASH_V2_LISTAR_LOGS_DEV()` com remapeamento:
- Retorna `r.logs[]` (não `r.itens[]`) com campos UPPERCASE:
  `CRIADO_EM`, `DATA`, `ACAO`, `MODULO`, `REGISTRO_ID`, `USUARIO`, `DETALHE`

#### `EXECUTAR_FIN_FLASH_V2_10_1_TESTE_HOTFIX_RENDER_DEV()`
Orquestradora que valida 10 itens obrigatórios:
- Aliases de dashboard, pendências e logs funcionando
- Flags de segurança: produção intocada, sem force, sem deploy

## Resultado da orquestradora (clasp run) — 2026-06-27 validação final

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "hotfixRenderAplicado": true,
  "shellRenderizavel": true,
  "abasRenderizaveis": true,
  "abasPrimeiroFrame": true,
  "skeletonNaoPermanente": true,
  "failureHandlersPrevistos": true,
  "fallbackErroPrevisto": true,
  "botaoTentarNovamentePrevisto": true,
  "dashboardNaoBloqueiaRender": true,
  "portalFinanceiroRenderizaSemDados": true,
  "portalColaboradorRenderizaSemDados": true,
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

## Comportamento pós-fix

| Evento | Antes (travado) | Depois (corrigido) |
|---|---|---|
| Abrir módulo | Header + skeleton infinito | Header loading + 11 abas imediatas |
| Backend responde OK | Travado | Header atualizado + KPIs + dashboard |
| Backend falha (erro de permissão) | Travado | Card vermelho + "Tentar novamente" |
| Backend demora >8s | Travado infinito | Fallback automático + botão retry |
| Exceção JS no render | Tela branca/skeleton silenciosa | Card vermelho + detalhe técnico |
| Perfil COLABORADOR | Travado | 5 abas colaborador + header correto |

## Validações

- `node --check SGO_Fin_FlashV2.js`: **OK**
- Parse `JS_Fin_FlashV2.html` (1 bloco script): **OK**
- `prompt()` e `confirm()`: **AUSENTES**
- `git diff --check`: **OK** (avisos CRLF apenas em arquivos não relacionados)
- `clasp --user fin_flash_v2_dev push`: **84 arquivos enviados sem `--force`**
- `node --check SGO_Fin_FlashV2_Setup.js`: **OK**
- Menu DEV em `Index.html`: **presente** (2 ocorrências: `menu-secao-dev-fin-flash-v2` + `menu-btn-fin_flash_v2_dev`)
- Menu PRODUCAO Flash V2 em `SGO_Fin.js`: **ausente** (0 ocorrências)
- `clasp --user fin_flash_v2_dev push` (validação final): **84 arquivos enviados sem `--force`**
- `EXECUTAR_FIN_FLASH_V2_10_1_TESTE_HOTFIX_RENDER_DEV`: **APROVADO** — 11/11 itens true (inclui `abasPrimeiroFrame`)

## Regras preservadas

- DEV exclusivo: `ScriptApp.getScriptId() === DEV_ID` em toda entrada de função
- Produção e Flash antigo: intocados
- Menu principal em produção: não ligado
- Deploy webapp novo: não executado
- `--force`: não usado
- `prompt()` / `confirm()`: ausentes
- IA não aprova gasto sozinha
- Envio real de cobranças: BLOQUEADO
