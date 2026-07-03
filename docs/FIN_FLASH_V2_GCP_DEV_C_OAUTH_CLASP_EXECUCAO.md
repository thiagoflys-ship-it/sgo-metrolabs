# FIN_FLASH_V2.GCP-DEV-C — OAuth Desktop Client dedicado do clasp

Atualizado em: 2026-06-26 15:50:31 -03:00

## Objetivo

Configurar o OAuth Desktop Client dedicado do projeto GCP DEV `sgo-fin-flash-v2-dev` para permitir `clasp run` das funções orquestradoras FIN_FLASH_V2.

## Escopo confirmado

- Apps Script DEV: `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG`
- Projeto GCP DEV dedicado: `sgo-fin-flash-v2-dev`
- Project Number: `104035470061`
- API Executable DEV existente: `AKfycbzG2dUwJpCKNyjOLYlSBghxHMm0j111TzMVWpjGUQ9dFfzgCQjmYGijb1dKTQ1jX40t8A`

## Proteção de segredo

- `.gitignore` atualizado para ignorar:
  - `client_secret*.json`
  - `*_client_secret*.json`
  - `.oauth-local/`
  - `.oauth-local/**`
- Arquivo OAuth localizado fora do repositório:
  - pasta: `C:\tmp\fin_flash_v2_oauth`
  - arquivo: `client_secret_104035470061-rf1s56mfvdhf6djoi1t77jo8jpd9er88.apps.googleusercontent.com.json`
- Conteúdo do arquivo não foi lido nem documentado.
- `git check-ignore -v client_secret_test.json`: OK, protegido por `.gitignore`.

## Login dedicado do clasp

Comando iniciado:

```powershell
clasp login --creds C:\tmp\fin_flash_v2_oauth\client_secret_104035470061-rf1s56mfvdhf6djoi1t77jo8jpd9er88.apps.googleusercontent.com.json --user fin_flash_v2_dev --use-project-scopes --include-clasp-scopes
```

Resultado parcial:

- URL OAuth gerada com client ID do projeto `104035470061`.
- Navegador aberto para autorização.
- A autorização não retornou ao terminal dentro da janela de espera desta rodada.
- O login dedicado ainda não foi confirmado.

## Estado atual do clasp

Antes da conclusão do OAuth dedicado, o estado confirmado era:

```text
You are logged in as thiagoflys@gmail.com.
OAuth client ID: 1072944905499-vm2v2i5dvn0a0d2o4ca36i1vge8cvbn0.apps.googleusercontent.com (google-provided).
```

Portanto, ainda falta confirmar o login com o OAuth Desktop Client dedicado.

## Execuções FIN_FLASH_V2

- 0A remota: não executada nesta rodada, pois o login dedicado não concluiu.
- 0B setup: não executado.
- Abas V2: não criadas nesta rodada.
- Usuário/cartões de teste: não criados nesta rodada.
- Importação real: não executada.
- Menu: não ligado.
- Webapp deploy: não executado.
- `--force`: não usado.
- Produção: não alterada.
- Flash antigo: não alterado.

## Próximo passo exato

Concluir a autorização no navegador com a conta `thiagoflys@gmail.com` ou relançar:

```powershell
clasp login --creds C:\tmp\fin_flash_v2_oauth\client_secret_104035470061-rf1s56mfvdhf6djoi1t77jo8jpd9er88.apps.googleusercontent.com.json --user fin_flash_v2_dev --use-project-scopes --include-clasp-scopes
```

Após login confirmado:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR
```

Somente se 0A aprovar:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_0B_SETUP_AUTOMATICO_DEV
```

## JSON de status

```json
{
  "success": false,
  "oauthDesktopClientConfigurado": true,
  "clientSecretLocalSeguro": true,
  "clientSecretConteudoExposto": false,
  "claspLoginDedicadoOk": false,
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
    "Autorizacao OAuth no navegador nao retornou ao terminal nesta rodada"
  ],
  "avisos": [
    "client_secret.json esta fora do repositorio e protegido por .gitignore",
    "Conteudo sensivel nao foi exibido nem documentado"
  ]
}
```

## 2026-06-26 16:16:17 -03:00 — Login OAuth dedicado concluído

- Login dedicado do `clasp` reaberto e concluído com sucesso.
- Conta autorizada confirmada: `thiagoflys@gmail.com`.
- OAuth Client confirmado pelo `clasp`: `104035470061-0smt5esji2c0cabklep1g6b5alq2t6u9.apps.googleusercontent.com` (`user-provided`).
- Arquivo de credencial usado permanece fora do repositório em `C:\tmp\fin_flash_v2_oauth`.
- Conteúdo do `client_secret` não foi lido, exibido ou documentado.
- 0A não executada nesta etapa, conforme solicitação.
- 0B não executada nesta etapa, conforme solicitação.
- Produção não alterada; sem deploy; sem `--force`.
