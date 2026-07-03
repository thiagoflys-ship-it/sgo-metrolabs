# FIN Flash V2 — GCP DEV para execução remota

**Data:** 2026-06-26  
**Escopo:** planejamento e auditoria somente leitura. Nenhuma associação, API,
credencial, deployment, setup ou alteração de produção foi executada.

## Situação atual

| Verificação | Resultado |
|---|---|
| `.clasp.json` | aponta para o DEV `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG` |
| `projectId` no `.clasp.json` | ausente |
| Projeto gcloud selecionado localmente | `gen-lang-client-0667185572` |
| Conta gcloud configurada | `thiagoflys@gmail.com` |
| Listagem de projetos/APIs | não concluída: o gcloud aguardou acesso às credenciais; processo interrompido sem mudança |
| API Executable DEV | não configurada |

## Bloqueio técnico

`clasp run` exige um Apps Script DEV associado a projeto GCP padrão, OAuth Client
Desktop autorizado, `executionApi` declarada no manifesto e deployment do tipo
**API Executable**. O deployment atual do WebApp não supre esse requisito.

## Riscos

- Reutilizar `gen-lang-client-0667185572` sem revisão pode misturar o financeiro
  com um projeto genérico de IA.
- Criar OAuth Client em projeto errado expõe escopos de planilha/Drive.
- Usar acesso amplo para `executionApi` é desnecessário para automação interna.
- Associar o GCP errado ao Apps Script DEV é uma alteração difícil de desfazer.

## Opções seguras

1. **Recomendada:** criar projeto dedicado `sgo-fin-flash-v2-dev` e associá-lo
   somente ao Apps Script DEV.
2. Reutilizar um projeto SGO+ DEV existente apenas após confirmar propriedade,
   APIs e ausência de vínculo com produção.
3. Não reutilizar o projeto genérico de IA até auditoria explícita.

## Projeto GCP recomendado

Nome sugerido: `SGO+ FIN Flash V2 DEV`  
ID sugerido: `sgo-fin-flash-v2-dev` (sujeito à disponibilidade)  
Conta/ambiente: somente DEV, sem qualquer relação com PRODUCAO_V2 ou PROD.

## APIs e credenciais necessárias

- Apps Script API: `script.googleapis.com`.
- Google Cloud Resource Manager API para administração/listagem, se aplicável.
- OAuth Client do tipo **Desktop application**, restrito à conta autorizada de
  desenvolvimento; arquivo de segredo não deve ser versionado.

No manifesto DEV, a configuração a revisar é:

```json
"executionApi": { "access": "MYSELF" }
```

`MYSELF` é a opção inicial recomendada para executar as auditorias via a conta
autorizada, sem abrir acesso amplo.

## Passos para habilitar API Executable

1. Confirmar/criar o projeto GCP DEV dedicado.
2. Associar o número desse projeto ao Apps Script DEV em Project Settings.
3. Habilitar Apps Script API no projeto GCP DEV.
4. Criar OAuth Desktop Client e autorizar o `clasp` com escopos do manifesto.
5. Adicionar `projectId` ao `.clasp.json` DEV e `executionApi` ao manifesto DEV.
6. Fazer push normal para DEV, sem `--force`.
7. Criar deployment **API Executable** — não WebApp.
8. Executar somente `EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR()`.
9. Auditar o retorno antes de executar qualquer setup 0B.

## Comandos planejados (não executados)

```powershell
gcloud projects create sgo-fin-flash-v2-dev --name "SGO+ FIN Flash V2 DEV"
gcloud services enable script.googleapis.com --project sgo-fin-flash-v2-dev
clasp login --creds client_secret.json --user fin_flash_v2_dev --use-project-scopes --include-clasp-scopes
clasp push
clasp run EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR
```

O vínculo Apps Script ↔ projeto GCP e o deployment API Executable deverão ser
feitos somente após confirmação do projeto/número GCP escolhido.

## Produção

PRODUCAO_V2 e PROD antigo permanecem intocados. Nenhum setup, aba, usuário de
teste, extrato, menu, webapp ou produção foi alterado nesta auditoria.

## Próxima autorização necessária

Autorizar explicitamente uma das opções:

- `AUTORIZO CRIAR E ASSOCIAR O PROJETO GCP DEV DEDICADO sgo-fin-flash-v2-dev`; ou
- informar o `projectId` e o `projectNumber` de um GCP DEV SGO+ já aprovado.
