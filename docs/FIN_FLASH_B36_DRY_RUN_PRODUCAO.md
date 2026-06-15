# FIN Flash - B.3.6 - Dry-run Producao

Funcao: `DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR`

Objetivo: validar a entrada Flash em producao sem gravar lote, extratos, arquivos,
conciliacoes ou pendencias.

Pre-requisitos:

- `DB_FIN_ID` deve ser `1A3rjluetfMYfSwwpcGbbnfpkPdgR7R9iiwDVWvyp4Zw`.
- `FOLDER_FINANCEIRO` deve estar configurado.
- A base FIN producao limpa deve estar aprovada.
- A entrada Flash deve estar configurada de forma segura em `TMP_IMPORT_EXTRATO_FLASH`.

Execucao manual:

```text
DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR
```

JSON esperado: `success:true`, `ok:true`, `executado:false`,
`somenteLeitura:true`, `seguranca.gravou:false`, `linhasCriadas:0`,
`arquivosCriados:0`, `bloqueios:[]`.

Bloqueios esperados se a entrada ainda nao existir:

- `ENTRADA_FLASH_AUSENTE`
- `CAMPO_VALOR_FLASH_AUSENTE`

Proximo passo: se aprovado, executar `PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR`.

Proibido nesta etapa: importacao real, conciliacao real, geracao real de pendencias,
deploy WebApp e alteracao no DEV.
