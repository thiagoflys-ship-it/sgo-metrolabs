# FIN Flash - B.3.4 - Execucao do Provisionamento em Producao

> Projeto alvo: novo Apps Script `SGO_PLUS_PRODUCAO`.
> ScriptId: `1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY`.
> Nenhuma importacao real deve ser executada nesta etapa.

## Contexto

O codigo completo do SGO+ ja foi enviado ao Apps Script de producao, mas o ambiente financeiro ainda esta limpo:

- sem deploy criado;
- sem funcao executada;
- sem planilha DB_FIN criada;
- sem `DB_FIN_ID` no `PropertiesService` do projeto de producao.

B.3.4 cria ou reutiliza somente os recursos basicos do modulo FIN:

- planilha Google Sheets `SGO_FIN_CARTAO_FLASH_DB`;
- pasta Drive `SGO_FINANCEIRO_DOCUMENTOS`;
- propriedades `DB_FIN_ID` e `FOLDER_FINANCEIRO`;
- propriedades `SGO_WEBAPP_URL` e `WEBAPP_URL` somente se uma URL for informada.

## Pre-requisitos

- Estar no editor do novo projeto Apps Script de producao, nao no DEV.
- Confirmar visualmente o scriptId `1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY`.
- Nao executar `setupFinanceiroV2` antes do provisionamento.
- Nao executar importacao Flash real.
- Nao alterar `PropertiesService` manualmente.
- Nao criar planilha ou pasta manualmente.

## B.3.4C - Correcao: provisionamento anterior reutilizou DB_FIN DEV

O primeiro provisionamento manual executado no `SGO_PLUS_PRODUCAO` retornou:

```json
{
  "success": true,
  "executado": true,
  "planilhaCriada": false,
  "planilhaReutilizada": true,
  "pastaCriada": false,
  "pastaReutilizada": true,
  "DB_FIN_ID": "1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0",
  "FOLDER_FINANCEIRO": "1Gt4MBCEy-O0100h-VKn-z9gp0_l4ZD6g",
  "bloqueios": []
}
```

Esse resultado esta bloqueado: `1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0` e o DB_FIN DEV/homologacao. A causa foi a reutilizacao por nome no Drive (`SGO_FIN_CARTAO_FLASH_DB` e `SGO_FINANCEIRO_DOCUMENTOS`) dentro da funcao antiga.

Nao executar `setupFinanceiroV2` enquanto o `DB_FIN_ID` estiver apontando para esse ID.

## Funcao a Executar

Executar pelo seletor do Apps Script:

```text
PROVISIONAR_AMBIENTE_FINANCEIRO_PRODUCAO_LIMPA_B34_AUTORIZADO
```

Esse wrapper chama internamente uma rotina especifica de producao limpa. Ela nao usa a busca por nome antiga e cria uma planilha com nome de producao:

- `SGO_FIN_CARTAO_FLASH_DB_PROD`;
- ou `SGO_FIN_CARTAO_FLASH_DB_PROD_YYYYMMDD_HHMMSS`, se o nome base ja existir.

Para a pasta, usa somente nome de producao:

- `SGO_FINANCEIRO_DOCUMENTOS_PROD`;
- ou `SGO_FINANCEIRO_DOCUMENTOS_PROD_YYYYMMDD_HHMMSS`, se houver duplicidade.

O wrapper registra `Logger.log(JSON.stringify(resultado, null, 2))` e retorna o JSON.

## Resultado Esperado

O Logger deve trazer um JSON com:

- `success: true`;
- `ok: true`;
- `executado: true`;
- `planilhaCriada: true`;
- `planilhaReutilizada: false`;
- `pastaCriada: true` ou `pastaReutilizada: true`;
- `DB_FIN_ID` preenchido;
- `DB_FIN_URL` preenchido;
- `FOLDER_FINANCEIRO` preenchido;
- `dbFinIdDiferenteDev: true`;
- `bloqueios: []`;
- aviso esperado sobre `WEBAPP_URL` nao configurada, porque ainda nao ha deploy de producao.

Copiar o JSON completo do Logger, incluindo:

- `success`;
- `executado`;
- `DB_FIN_ID`;
- `DB_FIN_URL`;
- `FOLDER_FINANCEIRO`;
- `dbFinIdDevBloqueado`;
- `dbFinIdDiferenteDev`;
- `SGO_WEBAPP_URL`;
- `bloqueios`;
- `avisos`;
- `proximaEtapa`.

## O Que a Funcao Faz

- Valida `executar: true`.
- Valida a confirmacao textual `CRIAR_AMBIENTE_FINANCEIRO_SGO_2026`.
- Obtem lock de script.
- Ignora o `DB_FIN_ID` DEV anterior para fins de reutilizacao.
- Cria nova planilha de producao via `SpreadsheetApp.create`.
- Reutiliza apenas pasta com nome `SGO_FINANCEIRO_DOCUMENTOS_PROD`, se existir exatamente uma.
- Se nao houver pasta PROD, cria uma nova via `DriveApp.createFolder`.
- Grava `DB_FIN_ID`, `DB_FIN_URL` e `FOLDER_FINANCEIRO` em `PropertiesService`.
- Bloqueia se o `DB_FIN_ID` final for igual ao ID DEV/homologacao.

## O Que a Funcao Nao Faz

- Nao executa `setupFinanceiroV2`.
- Nao cria as abas FIN.
- Nao cria dados de teste.
- Nao executa `finImportarLoteExtratoFlashV1`.
- Nao importa XLSX.
- Nao cria deploy.
- Nao mexe no projeto DEV.
- Nao reutiliza `SGO_FIN_CARTAO_FLASH_DB` DEV/homologacao.

## Bloqueadores

- Erro OAuth: autorizar no fluxo do Apps Script e executar novamente apenas a mesma funcao.
- `DB_FIN_ID` retornado igual a `1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0`: parar, bloqueado.
- `dbFinIdDiferenteDev: false`: parar, bloqueado.
- Mais de uma pasta `SGO_FINANCEIRO_DOCUMENTOS_PROD` encontrada no Drive: a funcao cria nome com timestamp; conferir o JSON antes de seguir.
- Funcao nao aparece no seletor: confirmar que o codigo enviado ao projeto de producao esta atualizado.
- Erro de permissao em Drive ou Sheets: parar e copiar o JSON/erro completo.

## Proximos Passos Apos B.3.4

Somente depois do JSON de provisionamento ser conferido:

1. Executar `setupFinanceiroV2` no editor do projeto de producao.
2. Executar `auditarSetupFinanceiroV2`.
3. Executar `AUDITAR_AMBIENTE_DB_FIN_SEM_GRAVAR`.
4. Executar `TESTE_FLASH_CONTAGEM_SEM_GRAVAR` para baseline 0/0.
5. Avancar para cadastro Rafael/908 somente em rodada autorizada separada.
