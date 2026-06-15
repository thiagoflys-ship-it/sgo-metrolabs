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

## Funcao a Executar

Executar pelo seletor do Apps Script:

```text
provisionarAmbienteFinanceiroV2_MANUAL_AUTORIZADO
```

Esse wrapper chama internamente:

```javascript
provisionarAmbienteFinanceiroV2_AUTORIZADO({
  executar: true,
  confirmacao: "CRIAR_AMBIENTE_FINANCEIRO_SGO_2026",
  webAppUrl: ""
});
```

O wrapper registra `Logger.log(JSON.stringify(resultado, null, 2))` e retorna o JSON.

## Resultado Esperado

O Logger deve trazer um JSON com:

- `success: true`;
- `executado: true`;
- `planilhaCriada: true` ou `planilhaReutilizada: true`;
- `pastaCriada: true` ou `pastaReutilizada: true`;
- `DB_FIN_ID` preenchido;
- `FOLDER_FINANCEIRO` preenchido;
- `bloqueios: []`;
- aviso esperado sobre `webAppUrl` vazio, caso nenhuma URL publica tenha sido configurada.

Copiar o JSON completo do Logger, incluindo:

- `success`;
- `executado`;
- `DB_FIN_ID`;
- `FOLDER_FINANCEIRO`;
- `SGO_WEBAPP_URL`;
- `bloqueios`;
- `avisos`;
- `proximaEtapa`.

## O Que a Funcao Faz

- Valida `executar: true`.
- Valida a confirmacao textual `CRIAR_AMBIENTE_FINANCEIRO_SGO_2026`.
- Obtem lock de script.
- Reutiliza `DB_FIN_ID` existente se estiver configurado e acessivel.
- Caso nao exista `DB_FIN_ID`, procura uma planilha com nome `SGO_FIN_CARTAO_FLASH_DB`.
- Se houver exatamente uma planilha com esse nome, reutiliza.
- Se nao houver planilha, cria uma nova via `SpreadsheetApp.create`.
- Reutiliza `FOLDER_FINANCEIRO` existente se estiver configurado e acessivel.
- Caso nao exista `FOLDER_FINANCEIRO`, procura uma pasta com nome `SGO_FINANCEIRO_DOCUMENTOS`.
- Se houver exatamente uma pasta com esse nome, reutiliza.
- Se nao houver pasta, cria uma nova via `DriveApp.createFolder`.
- Grava `DB_FIN_ID` e `FOLDER_FINANCEIRO` em `PropertiesService`.

## O Que a Funcao Nao Faz

- Nao executa `setupFinanceiroV2`.
- Nao cria as abas FIN.
- Nao cria dados de teste.
- Nao executa `finImportarLoteExtratoFlashV1`.
- Nao importa XLSX.
- Nao cria deploy.
- Nao mexe no projeto DEV.

## Bloqueadores

- Erro OAuth: autorizar no fluxo do Apps Script e executar novamente apenas a mesma funcao.
- `DB_FIN_ID` ja preenchido apontando para base antiga ou DEV: parar e revisar antes de seguir.
- Mais de uma planilha `SGO_FIN_CARTAO_FLASH_DB` encontrada no Drive: parar e revisar duplicidade.
- Mais de uma pasta `SGO_FINANCEIRO_DOCUMENTOS` encontrada no Drive: parar e revisar duplicidade.
- Funcao nao aparece no seletor: confirmar que o codigo enviado ao projeto de producao esta atualizado.
- Erro de permissao em Drive ou Sheets: parar e copiar o JSON/erro completo.

## Proximos Passos Apos B.3.4

Somente depois do JSON de provisionamento ser conferido:

1. Executar `setupFinanceiroV2` no editor do projeto de producao.
2. Executar `auditarSetupFinanceiroV2`.
3. Executar `AUDITAR_AMBIENTE_DB_FIN_SEM_GRAVAR`.
4. Executar `TESTE_FLASH_CONTAGEM_SEM_GRAVAR` para baseline 0/0.
5. Avancar para cadastro Rafael/908 somente em rodada autorizada separada.
