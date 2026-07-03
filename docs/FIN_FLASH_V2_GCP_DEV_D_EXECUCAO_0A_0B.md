# FIN_FLASH_V2.GCP-DEV-D — Execução remota 0A e condição para 0B

Atualizado em: 2026-06-26 16:19:20 -03:00

## Objetivo

Executar a validação remota 0A do FIN_FLASH_V2 no Apps Script DEV via `clasp run` usando OAuth dedicado `fin_flash_v2_dev`. Executar 0B somente se 0A aprovasse com `ok:true` e `bloqueios:[]`.

## Escopo confirmado antes da execução

- `.clasp.json` aponta para o Apps Script DEV:
  - scriptId: `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG`
  - projectId: `sgo-fin-flash-v2-dev`
- OAuth dedicado confirmado:
  - conta: `thiagoflys@gmail.com`
  - OAuth client: `104035470061-0smt5esji2c0cabklep1g6b5alq2t6u9.apps.googleusercontent.com`
  - tipo: `user-provided`
- Manifest local contém:

```json
"executionApi": {
  "access": "MYSELF"
}
```

- Deployment API Executable DEV existente:
  - `AKfycbzG2dUwJpCKNyjOLYlSBghxHMm0j111TzMVWpjGUQ9dFfzgCQjmYGijb1dKTQ1jX40t8A @226 - FIN_FLASH_V2_DEV_API_EXECUTABLE_MYSELF_20260626`

## Execução 0A — tentativa 1

Comando:

```powershell
clasp --user fin_flash_v2_dev run EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR
```

Resultado bruto:

```text
Unable to run script function. Please make sure you have permission to run the script function.
```

## Execução 0A — tentativa 2, sintaxe solicitada

Comando:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR --user fin_flash_v2_dev
```

Resultado bruto:

```text
Unable to run script function. Please make sure you have permission to run the script function.
```

## Decisão de segurança

A 0A não retornou JSON e não aprovou. Portanto, pela regra obrigatória do pacote D, a 0B não foi executada.

## O que não foi executado

- 0B setup: não executado.
- Criação/validação de abas V2 por setup: não executada nesta rodada.
- Criação/validação de usuário fictício: não executada nesta rodada.
- Criação/validação de cartões teste: não executada nesta rodada.
- Importação real: não executada.
- Menu: não ligado.
- Deploy webapp: não executado.
- `--force`: não usado.
- Produção: não alterada.
- Flash antigo: não alterado.

## Diagnóstico atual

O OAuth dedicado foi aceito pelo `clasp`, mas a chamada `scripts.run` ainda retorna bloqueio de permissão. Isso indica que resta uma permissão/associação do lado do Apps Script/API Executable, não uma falha do código FIN_FLASH_V2 em si.

Possíveis próximos pontos de verificação, sem executar setup:

1. Confirmar no editor Apps Script DEV se o projeto está efetivamente associado ao projeto GCP `sgo-fin-flash-v2-dev` e não apenas configurado localmente no `.clasp.json`.
2. Confirmar que o deployment API Executable está com acesso compatível com a conta `thiagoflys@gmail.com`.
3. Confirmar se o Apps Script API está habilitado também nas configurações do usuário Google, além da API no GCP.
4. Se necessário, recriar apenas o deployment API Executable após associação real do projeto GCP, sem webapp e sem `--force`.

## JSON de status desta rodada

```json
{
  "success": false,
  "execucao0ARemotaOk": false,
  "setup0BExecutado": false,
  "abasV2CriadasOuValidadas": 0,
  "usuarioTesteCriadoOuValidado": false,
  "cartoesTesteCriadosOuValidados": false,
  "menuLigado": false,
  "importacaoRealExecutada": false,
  "webappDeployExecutado": false,
  "producaoAlterada": false,
  "flashAntigoAlterado": false,
  "forceUsado": false,
  "bloqueios": [
    "clasp run da 0A retornou: Unable to run script function. Please make sure you have permission to run the script function."
  ],
  "avisos": [
    "OAuth dedicado user-provided esta ativo para thiagoflys@gmail.com",
    "0B nao foi executada porque 0A nao aprovou"
  ]
}
```
