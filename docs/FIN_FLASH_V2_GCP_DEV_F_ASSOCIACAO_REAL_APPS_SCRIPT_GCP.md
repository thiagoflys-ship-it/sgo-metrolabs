# FIN_FLASH_V2.GCP-DEV-F — Associação real Apps Script DEV ao GCP e execução 0A/0B

Atualizado em: 2026-06-26 16:51:19 -03:00

## Objetivo

Confirmar/corrigir a associação real do Apps Script DEV ao projeto GCP dedicado `sgo-fin-flash-v2-dev`, Project Number `104035470061`, e executar o fluxo remoto seguro:

1. Ping Execution API.
2. 0A validação automática sem gravação.
3. 0B setup DEV somente se ping e 0A aprovarem.

## Escopo preservado

- Somente DEV.
- PRODUCAO_V2 não alterada.
- PROD antigo não alterado.
- Menu não ligado.
- Importação real não executada.
- Deploy webapp não executado.
- `--force` não usado.

## Confirmações iniciais

`.clasp.json`:

```json
{
  "scriptId": "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG",
  "projectId": "sgo-fin-flash-v2-dev"
}
```

OAuth dedicado:

```text
You are logged in as thiagoflys@gmail.com.
OAuth client ID: 104035470061-0smt5esji2c0cabklep1g6b5alq2t6u9.apps.googleusercontent.com (user-provided).
```

GCP DEV dedicado:

```text
projectId: sgo-fin-flash-v2-dev
projectNumber: 104035470061
lifecycleState: ACTIVE
```

## Resultado do ping

Comando:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_PING_EXECUTION_API_SEM_GRAVAR --user fin_flash_v2_dev
```

Resultado:

```json
{
  "executado": false,
  "ping": true,
  "success": true,
  "ambiente": "DEV",
  "somenteLeitura": true
}
```

Conclusão: a Execution API passou a executar no DEV. A associação real Apps Script/GCP foi confirmada por execução remota bem-sucedida.

## Resultado da 0A

A 0A aprovou com `success:true`, `ok:true`, `bloqueios:[]`, `somenteLeitura:true`, `nenhumaGravacaoExecutada:true`.

## Primeira execução 0B

A primeira execução da 0B criou/validou as 12 abas, mas a auditoria final não encontrou usuário/cartões de teste:

```json
{
  "success": false,
  "ok": false,
  "setupExecutado": true,
  "abasCriadasOuValidadas": 12,
  "bloqueios": [
    "Conta de teste ausente ou nao marcada AMBIENTE_TESTE=SIM.",
    "Cartoes de teste 9999/8888 ausentes."
  ]
}
```

Diagnóstico: CPF `00000000000` e final de cartão precisavam ser preservados como texto na planilha; caso contrário, o Google Sheets pode converter/ler valores como número e perder zeros à esquerda.

## Correção aplicada

Arquivo alterado:

- `SGO_Fin_FlashV2_Setup.js`

Correções:

- `CRIAR_FIN_FLASH_V2_USUARIO_TESTE_MANUAL_AUTORIZADO()` agora grava CPF e final do cartão com `setNumberFormat('@')` e `setValue()` como texto.
- A função identifica/atualiza registros de teste por CPF, e-mail ou nome do colaborador fictício, evitando duplicação desnecessária.
- `AUDITAR_FIN_FLASH_V2_USUARIO_TESTE_SEM_GRAVAR()` agora usa índices de cabeçalho, valida CPF exato, `AMBIENTE_TESTE=SIM`, status, e confirma cartões `9999/FISICO` e `8888/VIRTUAL`.

Validações locais:

- `node --check SGO_Fin_FlashV2_Setup.js`: OK
- `node --check SGO_Fin_FlashV2.js`: OK
- `rg "prompt\(|confirm\(" ...`: nenhum resultado
- `git diff --check`: OK, apenas avisos LF/CRLF

Publicação:

```powershell
clasp --user fin_flash_v2_dev push
```

Resultado:

```text
Pushed 84 files at 16:44:02.
```

Sem `--force`.

## Segunda execução 0B — aprovada

A 0B foi reexecutada após correção e aprovou.

## JSONs completos capturados via Execution API

```json
{
  "ping": {
    "executado": false,
    "ambiente": "DEV",
    "ping": true,
    "success": true,
    "somenteLeitura": true
  },
  "validacao0A": {
    "iaAprovaSozinha": false,
    "executado": false,
    "menuLigado": false,
    "ambiente": "DEV",
    "funcoesPrincipais": {
      "SETUP_FIN_FLASH_V2_MANUAL_AUTORIZADO": true,
      "AUDITAR_FIN_FLASH_V2_PRONTO_PARA_IMPORTACAO_SEM_GRAVAR": true,
      "CRIAR_FIN_FLASH_V2_USUARIO_TESTE_MANUAL_AUTORIZADO": true,
      "AUDITAR_FIN_FLASH_V2_USUARIO_TESTE_SEM_GRAVAR": true,
      "MAPEAR_EXTRATO_FLASH_V2_SEM_GRAVAR": true,
      "LIMPAR_FIN_FLASH_V2_TESTES_ANTES_GO_LIVE_MANUAL_AUTORIZADO": true,
      "AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR": true
    },
    "verificacoesLocaisPendentes": [
      ".clasp.json e presenca de arquivos/docs sao auditados localmente pelo pipeline, nao pelo runtime Apps Script."
    ],
    "bloqueios": [],
    "usuarioTesteCriado": false,
    "nenhumaAbaCriada": true,
    "flashAntigoAlterado": false,
    "schemaValido": true,
    "schemaDeclarado": [
      "FIN_FLASH_V2_CONTAS",
      "FIN_FLASH_V2_CARTOES",
      "FIN_FLASH_V2_RECARGAS",
      "FIN_FLASH_V2_PRESTACOES",
      "FIN_FLASH_V2_EXTRATOS",
      "FIN_FLASH_V2_CONCILIACOES",
      "FIN_FLASH_V2_PENDENCIAS",
      "FIN_FLASH_V2_DOCUMENTOS",
      "FIN_FLASH_V2_TERMOS",
      "FIN_FLASH_V2_ALERTAS",
      "FIN_FLASH_V2_LOGS",
      "FIN_FLASH_V2_CONFIG"
    ],
    "importacaoRealExecutada": false,
    "nenhumaGravacaoExecutada": true,
    "avisos": [],
    "success": true,
    "setupExecutado": false,
    "ok": true,
    "somenteLeitura": true,
    "producaoAlterada": false
  },
  "setup0B": {
    "usuarioTesteCriadoOuValidado": true,
    "executado": true,
    "ambiente": "DEV",
    "menuLigado": false,
    "bloqueios": [],
    "abasCriadasOuValidadas": 12,
    "flashAntigoAlterado": false,
    "todosDadosTesteComAmbienteTeste": true,
    "importacaoRealExecutada": false,
    "cartoesTesteCriadosOuValidados": true,
    "avisos": [],
    "success": true,
    "auditoriaFinal": {
      "estrutura": {
        "avisos": [],
        "success": true,
        "bloqueios": [],
        "gravacaoReal": false,
        "ok": true,
        "modulo": "FIN_FLASH_V2",
        "somenteLeitura": true,
        "abas": {
          "FIN_FLASH_V2_RECARGAS": { "existe": true, "headersOk": true },
          "FIN_FLASH_V2_CONTAS": { "existe": true, "headersOk": true },
          "FIN_FLASH_V2_PRESTACOES": { "existe": true, "headersOk": true },
          "FIN_FLASH_V2_DOCUMENTOS": { "existe": true, "headersOk": true },
          "FIN_FLASH_V2_EXTRATOS": { "existe": true, "headersOk": true },
          "FIN_FLASH_V2_LOGS": { "existe": true, "headersOk": true },
          "FIN_FLASH_V2_ALERTAS": { "existe": true, "headersOk": true },
          "FIN_FLASH_V2_CARTOES": { "existe": true, "headersOk": true },
          "FIN_FLASH_V2_CONFIG": { "existe": true, "headersOk": true },
          "FIN_FLASH_V2_CONCILIACOES": { "existe": true, "headersOk": true },
          "FIN_FLASH_V2_PENDENCIAS": { "existe": true, "headersOk": true },
          "FIN_FLASH_V2_TERMOS": { "existe": true, "headersOk": true }
        }
      },
      "usuarioTeste": {
        "success": true,
        "bloqueios": [],
        "gravacaoReal": false,
        "ok": true,
        "somenteLeitura": true,
        "detalhes": {
          "cartaoFisico9999": true,
          "cartaoVirtual8888": true,
          "contaTesteEncontrada": true
        }
      }
    },
    "setupExecutado": true,
    "ok": true,
    "producaoAlterada": false
  }
}
```

## Resultado consolidado

```json
{
  "success": true,
  "associacaoGcpConfirmada": true,
  "pingExecutionApiOk": true,
  "execucao0ARemotaOk": true,
  "setup0BExecutado": true,
  "abasV2CriadasOuValidadas": 12,
  "usuarioTesteCriadoOuValidado": true,
  "cartoesTesteCriadosOuValidados": true,
  "menuLigado": false,
  "importacaoRealExecutada": false,
  "webappDeployExecutado": false,
  "producaoAlterada": false,
  "flashAntigoAlterado": false,
  "forceUsado": false,
  "bloqueios": [],
  "avisos": [
    "0B foi reexecutada apos correcao de CPF/final de cartao como texto",
    "A captura final via REST executou 0B uma vez adicional para obter JSON completo; registros principais sao idempotentes e dados/logs sao de teste no DEV"
  ]
}
```
