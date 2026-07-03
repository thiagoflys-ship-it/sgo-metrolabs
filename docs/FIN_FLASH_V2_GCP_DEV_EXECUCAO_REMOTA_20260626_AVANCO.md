# FIN_FLASH_V2.GCP-DEV — Execução remota segura DEV — avanço 2026-06-26

Atualizado em: 2026-06-26 15:18:27 -03:00

## Resultado desta rodada

- `.clasp.json` confirmado apontando para o Apps Script DEV:
  - scriptId: `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG`
  - projectId local configurado: `sgo-fin-flash-v2-dev`
- Projeto GCP DEV dedicado criado:
  - projectId: `sgo-fin-flash-v2-dev`
  - nome: `SGO FIN Flash V2 DEV`
  - projectNumber: `104035470061`
  - lifecycleState: `ACTIVE`
- API habilitada somente no projeto DEV dedicado:
  - `script.googleapis.com` — Apps Script API
- Manifest DEV atualizado com:
  - `executionApi.access = MYSELF`
- `clasp push` normal executado para DEV:
  - sem `--force`
  - confirmação interativa do manifest respondida por Codex
  - 84 arquivos enviados às 15:15:00
- Deployment API Executable DEV criado:
  - deploymentId: `AKfycbzG2dUwJpCKNyjOLYlSBghxHMm0j111TzMVWpjGUQ9dFfzgCQjmYGijb1dKTQ1jX40t8A`
  - versão: `226`
  - descrição: `FIN_FLASH_V2_DEV_API_EXECUTABLE_MYSELF_20260626`

## Testes executados

- `node --check SGO_Fin_FlashV2.js`: OK
- `node --check SGO_Fin_FlashV2_Setup.js`: OK
- `git diff --check`: OK, apenas avisos LF/CRLF
- `rg "prompt\(|confirm\(" ...`: nenhum resultado

## Execução remota 0A

Comando:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR
```

Resultado:

```text
Unable to run script function. Please make sure you have permission to run the script function.
```

Interpretação: o `clasp` ainda está autenticado com OAuth client `google-provided`, não com Desktop OAuth Client do projeto dedicado `sgo-fin-flash-v2-dev`.

Comando:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR --nondev
```

Resultado:

```text
Script function not found. Please make sure script is deployed as API executable.
```

Interpretação: modo nondev ainda não ficou utilizável para a função 0A. O próximo ajuste seguro é concluir OAuth Desktop Client dedicado e relogar o `clasp` com `--creds`/escopos adequados.

## Página correta aberta pelo clasp

```powershell
clasp open-credentials-setup
```

Retorno:

```text
https://console.developers.google.com/apis/credentials?project=sgo-fin-flash-v2-dev
```

## Produção e setup

- PRODUCAO_V2: não alterada.
- PROD antigo: não alterado.
- Flash antigo: não alterado nesta rodada.
- Setup FIN_FLASH_V2.0B: não executado.
- Abas FIN_FLASH_V2_*: não criadas nesta rodada.
- Usuário/cartões de teste: não criados nesta rodada.
- Importação real: não executada.
- Menu: não ligado.
- Webapp deploy: não executado.
- `--force`: não usado.

## Bloqueio atual

Para finalizar a execução remota automática via `clasp run`, falta criar/baixar um OAuth Desktop Client do projeto GCP dedicado `sgo-fin-flash-v2-dev` e autenticar o `clasp` com essa credencial.

Próximo comando operacional planejado, após existir o arquivo `client_secret.json` do OAuth Desktop Client DEV:

```powershell
clasp login --creds client_secret.json --user fin_flash_v2_dev --use-project-scopes --include-clasp-scopes
```

Depois disso:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR
```

Somente se 0A aprovar:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_0B_SETUP_AUTOMATICO_DEV
```

## JSON de status desta rodada

```json
{
  "success": false,
  "gcpProjetoCriado": true,
  "gcpProjetoId": "sgo-fin-flash-v2-dev",
  "gcpProjectNumber": "104035470061",
  "appsScriptDevConfiguradoLocalmente": true,
  "appsScriptPushDevExecutado": true,
  "apiExecutableDeploymentCriado": true,
  "execucao0ARemotaOk": false,
  "bloqueioAtual": "OAuth Desktop Client dedicado ainda nao configurado no clasp",
  "setupExecutado": false,
  "abasCriadas": false,
  "usuarioTesteCriado": false,
  "importacaoRealExecutada": false,
  "menuLigado": false,
  "webappDeployExecutado": false,
  "producaoAlterada": false,
  "flashAntigoAlterado": false,
  "forceUsado": false
}
```
