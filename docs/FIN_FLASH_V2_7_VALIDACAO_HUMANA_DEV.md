# FIN_FLASH_V2.7 — Validação Humana Controlada no DEV

**Aprovado em:** 2026-06-27  
**Ambiente:** DEV exclusivo — produção e Flash antigo intocados.

## Objetivo

Ligar o FIN_FLASH_V2 ao menu do webapp **somente no DEV**, para validação humana controlada das telas desktop e mobile, sem deploy webapp novo, sem mexer em produção e sem alterar o Flash antigo.

## O que foi feito

### Backend — `SGO_Fin_FlashV2.js`

| Função | Descrição |
|---|---|
| `FIN_FLASH_V2_VERIFICAR_ACESSO_DEV()` | Guard de ambiente: retorna `{ok:true}` somente no DEV (scriptId). Retorna `{ok:false, motivo:'FIN_FLASH_V2_BLOQUEADO_FORA_DEV...'}` em qualquer outro ambiente. |
| `EXECUTAR_FIN_FLASH_V2_7_VALIDACAO_HUMANA_DEV()` | Orquestradora automática de validação humana. |

### Frontend — `Index.html`

- Adicionada seção DEV na sidebar (`id="menu-secao-dev-fin-flash-v2"`), **`display:none` por padrão**.
- Botão `FIN Flash V2 — DEV` com borda vermelha (`id="menu-btn-fin_flash_v2_dev"`), também oculto por padrão.
- Adicionado `<template id="tplFinFlashV2DevModulo">` com `<?!= include('JS_Fin_FlashV2'); ?>` ao final da página.

### Frontend — `JS_Core.html`

| Mudança | Detalhe |
|---|---|
| `abrir('fin_flash_v2_dev')` | Rota adicionada na função `abrir()`, chama `renderFinFlashV2DevModulo_()`. |
| `inicializarMenuDevFinFlashV2_()` | Chamada no callback de `carregarPermissoesAuth5_()`: chama `FIN_FLASH_V2_VERIFICAR_ACESSO_DEV()` e mostra a seção DEV somente se `ok:true`. |
| `renderFinFlashV2DevModulo_()` | Verifica DEV via backend → carrega scripts do template → chama `finFlashV2Html_()` → renderiza todo o módulo no `#conteudo`. Se não for DEV: exibe `FIN_FLASH_V2_BLOQUEADO_FORA_DEV`. |
| Badge map e nomes | `fin_flash_v2_dev` adicionado ao mapa de badges e ao dict de nomes do `atualizarBadgeModulo_()`. |

## Comportamento por ambiente

| Ambiente | Sidebar | Clique no botão |
|---|---|---|
| **DEV** | Seção aparece após login (após `carregarPermissoesAuth5_()` confirmar `ok:true`) | Renderiza `finFlashV2Html_()` completo com dashboard automático |
| **PRODUCAO_V2** | Seção permanece oculta (`ok:false` em PRODUCAO_V2) | N/A (botão nunca aparece) |
| **Qualquer outro** | Seção permanece oculta | N/A |

## Resultado da orquestradora (clasp run) — 2026-06-27

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "menuDevLigado": true,
  "menuProducaoLigado": false,
  "desktopDisponivel": true,
  "mobileDisponivel": true,
  "mobileTermoDisponivel": true,
  "termoVigenteDisponivel": true,
  "dashboardCarregavel": true,
  "pendenciasCarregaveis": true,
  "conciliacoesCarregaveis": true,
  "documentosCarregaveis": true,
  "logsCarregaveis": true,
  "bloqueioForaDevPrevisto": true,
  "todosDadosTesteComAmbienteTeste": true,
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
- Parse `JS_Fin_FlashV2.html`, `JS_Core.html`, `Index.html`: **OK** (todos os blocos `<script>`).
- `git diff --check`: **OK** (sem conflitos; avisos CRLF apenas em arquivos não relacionados).
- `prompt()` em todos os arquivos FIN_FLASH_V2: **AUSENTE**.
- `confirm()` em todos os arquivos FIN_FLASH_V2: **AUSENTE** (o `confirm()` em `Index.html` linha 270 é função pré-existente `executarAtualizacaoDados`, não adicionado nesta etapa).
- Trava de ambiente: `FIN_FLASH_V2_VERIFICAR_ACESSO_DEV()` usa `ScriptApp.getScriptId() === DEV_ID` — confirmada.
- Produção não recebeu item de menu: confirmado (`inicializarMenuDevFinFlashV2_()` só mostra a seção se `ok:true`).
- `clasp --user fin_flash_v2_dev push`: **84 arquivos** enviados às 22:10:26, sem `--force`.
- `EXECUTAR_FIN_FLASH_V2_7_VALIDACAO_HUMANA_DEV`: **APROVADO** — `success:true, ok:true, bloqueios:[]`.

## O que a validação humana pode testar

Ao acessar o DEV webapp e fazer login com perfil autorizado:

1. **Sidebar**: seção "DEV EXCLUSIVO" aparece com botão vermelho "FIN Flash V2 — DEV".
2. **Desktop**: clicar no botão abre a tela completa com abas (Dashboard, Conciliações, Pendências, Relatórios, Logs etc.) e carrega o dashboard automaticamente.
3. **Mobile**: a seção `FIN_FLASH_V2_MOBILE()` permite registrar prestação com comprovante obrigatório.
4. **Termo**: a seção `FIN_FLASH_V2_MOBILE_TERMO()` permite ler e aceitar o termo `FIN-FLASH-V2-TERMO-001`.
5. **Ações financeiras**: botões de conferência, solicitação de correção, bloqueio de recargas etc.
6. **Relatórios/documentos**: gerar relatórios positivo, negativo e por colaborador; gerar/ver termo.

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
