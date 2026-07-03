# FIN_FLASH_V2.GCP-DEV-E — Diagnóstico Execution API / permissão invisível

Atualizado em: 2026-06-26 16:29:32 -03:00

## Objetivo

Diagnosticar por que `clasp run` ainda retorna `Unable to run script function` mesmo com OAuth dedicado, `.clasp.json` com `projectId`, `executionApi.access = MYSELF` e deployment API Executable criado.

## Regras preservadas

- Somente DEV.
- 0B não executada.
- Abas não criadas.
- Usuário teste não criado.
- Extrato real não importado.
- Menu não ligado.
- Produção V2 não alterada.
- PROD antigo não alterado.
- `--force` não usado.
- Credenciais não alteradas nesta etapa.
- Deployment existente não apagado.

## Diagnósticos realizados

### 1. `.clasp.json`

Confirmado:

```json
{
  "scriptId": "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG",
  "projectId": "sgo-fin-flash-v2-dev"
}
```

### 2. Login clasp

O comando solicitado `clasp login --status --user fin_flash_v2_dev` não é suportado pela versão instalada do clasp:

```text
error: unknown option '--status'
```

Comando equivalente executado:

```powershell
clasp --user fin_flash_v2_dev show-authorized-user
```

Resultado:

```text
You are logged in as thiagoflys@gmail.com.
OAuth client ID: 104035470061-0smt5esji2c0cabklep1g6b5alq2t6u9.apps.googleusercontent.com (user-provided).
```

### 3. Permissão no projeto GCP dedicado

Comando:

```powershell
gcloud projects get-iam-policy sgo-fin-flash-v2-dev --flatten="bindings[].members" --filter="bindings.members:thiagoflys@gmail.com" --format="table(bindings.role,bindings.members)"
```

Resultado:

```text
ROLE: roles/owner
MEMBERS: user:thiagoflys@gmail.com
```

### 4. GCloud ativo

```text
[core]
account = thiagoflys@gmail.com
project = gen-lang-client-0667185572
```

Observação: o projeto ativo global do `gcloud` segue sendo `gen-lang-client-0667185572`, mas os comandos sensíveis foram executados explicitamente com o projeto `sgo-fin-flash-v2-dev` quando necessário. Não foi reutilizado o projeto genérico.

### 5. Apps Script DEV — proprietário/criador

Consulta via Apps Script API:

```http
GET /v1/projects/12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG
```

Resultado relevante:

```json
{
  "scriptId": "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG",
  "title": "SGO+ DEV",
  "creator": {
    "email": "thiagoflys@gmail.com"
  },
  "lastModifyUser": {
    "email": "thiagoflys@gmail.com"
  }
}
```

Conclusão: a conta consegue ler o projeto Apps Script DEV e aparece como criadora/modificadora.

### 6. Manifest / Execution API

Manifest local e clonado da versão 227 contém:

```json
"executionApi": {
  "access": "MYSELF"
}
```

### 7. Deployments

`clasp deployments` confirmou versões relevantes:

```text
AKfycbzG2dUwJpCKNyjOLYlSBghxHMm0j111TzMVWpjGUQ9dFfzgCQjmYGijb1dKTQ1jX40t8A @226 - FIN_FLASH_V2_DEV_API_EXECUTABLE_MYSELF_20260626
AKfycbw418p8BQN0xwrv8SEZoG-lEjCOyYH1l_zRVyzjeejOokvWJdJp_2ucTgiKnHUjBUKXWA @227 - FIN_FLASH_V2_DEV_E_PING_EXECUTION_API_20260626
```

Consulta via Apps Script API confirmou que o deployment `@227` possui entry point:

```json
{
  "entryPointType": "EXECUTION_API",
  "executionApi": {
    "entryPointConfig": {
      "access": "MYSELF"
    }
  }
}
```

A mesma resposta também mostra entry point `WEB_APP` porque o manifest do projeto já possui seção `webapp`. Não houve deploy webapp separado nem alteração de produção; porém o `clasp deploy` do Apps Script materializa os entry points do manifest em conjunto.

### 8. Versão 226 contém 0A

Clone read-only da versão 226 em `C:\tmp\fin_flash_v2_clone_226` confirmou:

```text
SGO_Fin_FlashV2.js:function EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR() {
```

### 9. Função ping read-only criada

Como não existia função mínima, foi criada em `SGO_Fin_FlashV2.js`:

```javascript
function EXECUTAR_FIN_FLASH_V2_PING_EXECUTION_API_SEM_GRAVAR() {
  var esperadoDev = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var ambiente = ScriptApp.getScriptId() === esperadoDev ? 'DEV' : 'DESCONHECIDO';
  return {
    success: ambiente === 'DEV',
    ping: true,
    somenteLeitura: true,
    executado: false,
    ambiente: ambiente
  };
}
```

A função não grava dados.

### 10. Validações locais

- `node --check SGO_Fin_FlashV2.js`: OK
- `node --check SGO_Fin_FlashV2_Setup.js`: OK
- `rg "prompt\(|confirm\(" ...`: nenhum resultado
- `git diff --check`: OK, apenas avisos LF/CRLF

### 11. Publicação DEV

Executado:

```powershell
clasp --user fin_flash_v2_dev push
```

Resultado:

```text
Pushed 84 files at 16:24:33.
```

Sem `--force`.

### 12. Novo deployment API Executable

Criado para diagnosticar o ping:

```powershell
clasp --user fin_flash_v2_dev deploy -d "FIN_FLASH_V2_DEV_E_PING_EXECUTION_API_20260626"
```

Resultado:

```text
Deployed AKfycbw418p8BQN0xwrv8SEZoG-lEjCOyYH1l_zRVyzjeejOokvWJdJp_2ucTgiKnHUjBUKXWA @227
```

### 13. Versão 227 contém ping e 0A

Clone read-only da versão 227 em `C:\tmp\fin_flash_v2_clone_227` confirmou:

```text
appsscript.json:  "executionApi": {
appsscript.json:    "access": "MYSELF"
SGO_Fin_FlashV2.js:function EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR() {
SGO_Fin_FlashV2.js:function EXECUTAR_FIN_FLASH_V2_PING_EXECUTION_API_SEM_GRAVAR() {
```

### 14. Teste ping via clasp run

Comando:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_PING_EXECUTION_API_SEM_GRAVAR --user fin_flash_v2_dev
```

Resultado:

```text
Unable to run script function. Please make sure you have permission to run the script function.
```

### 15. Teste ping via clasp run --nondev

Comando:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_PING_EXECUTION_API_SEM_GRAVAR --user fin_flash_v2_dev --nondev
```

Resultado:

```text
Script function not found. Please make sure script is deployed as API executable.
```

### 16. Teste direto via Apps Script Execution API

Chamada REST com token do OAuth dedicado, sem expor token.

Com `devMode:true`:

```json
{
  "error": {
    "code": 403,
    "message": "The caller does not have permission",
    "status": "PERMISSION_DENIED"
  }
}
```

Com `devMode:false`:

```json
{
  "error": {
    "code": 404,
    "message": "Requested entity was not found.",
    "status": "NOT_FOUND"
  }
}
```

### 17. Escopos reais do token OAuth dedicado

Consulta `tokeninfo` confirmou:

```json
{
  "email": "thiagoflys@gmail.com",
  "aud": "104035470061-0smt5esji2c0cabklep1g6b5alq2t6u9.apps.googleusercontent.com",
  "scope": "... https://www.googleapis.com/auth/script.deployments https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/script.scriptapp ..."
}
```

Conclusão: token, client e escopos estão corretos.

### 18. Editor Apps Script DEV

Foi aberta a URL de configurações do Apps Script DEV para conferência manual:

```text
https://script.google.com/home/projects/12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG/settings
```

Ponto a confirmar na UI:

```text
Configurações do projeto > Projeto Google Cloud Platform
```

Esperado:

```text
104035470061
sgo-fin-flash-v2-dev
```

A Apps Script API não retornou esse campo diretamente nos metadados do projeto.

## Diagnóstico consolidado

O código está publicado, o deployment `@227` contém ping e 0A, o manifest contém `executionApi.access = MYSELF`, a conta é criadora/modificadora do script, a conta é owner do projeto GCP dedicado, e o token OAuth dedicado possui os escopos necessários.

Mesmo assim, a chamada `scripts.run` falha antes de executar qualquer função com:

```text
PERMISSION_DENIED: The caller does not have permission
```

O ponto mais provável é que o Apps Script DEV ainda não esteja efetivamente associado, no editor do Apps Script, ao projeto GCP padrão `sgo-fin-flash-v2-dev / 104035470061`. O `.clasp.json` com `projectId` orienta o CLI/OAuth, mas não prova sozinho que o projeto Apps Script foi migrado/associado ao GCP padrão dentro das configurações do Apps Script.

## 0A e 0B

- Ping Execution API: falhou.
- 0A não foi reexecutada após o ping, pois a regra do pacote E mandava testar 0A apenas se o ping funcionasse.
- 0B não executada.

## JSON de status

```json
{
  "success": false,
  "diagnosticoConcluido": true,
  "associacaoGcpConfirmada": false,
  "permissaoUsuarioConfirmada": true,
  "pingExecutionApiOk": false,
  "execucao0ARemotaOk": false,
  "setup0BExecutado": false,
  "abasCriadas": false,
  "usuarioTesteCriado": false,
  "producaoAlterada": false,
  "flashAntigoAlterado": false,
  "forceUsado": false,
  "bloqueios": [
    "Execution API retorna 403 PERMISSION_DENIED antes de executar ping read-only",
    "Associacao real do Apps Script DEV ao projeto GCP 104035470061 precisa ser confirmada na UI do editor Apps Script"
  ],
  "avisos": [
    "clasp login --status nao existe nesta versao; usado show-authorized-user",
    "OAuth dedicado user-provided esta ativo e com escopos corretos",
    "Conta thiagoflys@gmail.com e owner do projeto GCP dedicado e criadora/modificadora do Apps Script DEV",
    "Novo deployment @227 foi criado para diagnostico do ping",
    "O deployment mostra entry point WEB_APP porque o manifest ja contem webapp; nao houve deploy de producao nem ligacao de menu"
  ]
}
```

## Próximo passo recomendado

Na tela aberta do Apps Script DEV, confirmar/ajustar:

```text
Configurações do projeto > Projeto Google Cloud Platform > Alterar projeto
```

Informar o número:

```text
104035470061
```

Depois disso, sem executar 0B:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_PING_EXECUTION_API_SEM_GRAVAR --user fin_flash_v2_dev
```

Se o ping aprovar:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR --user fin_flash_v2_dev
```
