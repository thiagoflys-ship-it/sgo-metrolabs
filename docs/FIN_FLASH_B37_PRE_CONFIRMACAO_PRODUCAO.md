# FIN Flash - B.3.7 - Pre-confirmacao Producao

Funcao: `PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR`

Objetivo: consolidar a confirmacao final do lote Flash antes da importacao real,
sem gravar nada.

Pre-requisitos:

- Dry-run B.3.6 aprovado.
- `DB_FIN_ID` PROD validado.
- Entrada Flash segura configurada.

Execucao manual:

```text
PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR
```

JSON esperado: `success:true`, `ok:true`, `executado:false`,
`somenteLeitura:true`, `lote.chaveLote` preenchido, periodo e totais conferidos,
`impactoPrevisto.linhasLote:1`, `impactoPrevisto.linhasExtratos` igual ao total
validado, `duplicidade.jaExisteLote:false`, `bloqueios:[]`.

Bloqueios:

- entrada ausente;
- lote duplicado;
- total de transacoes zero;
- DB_FIN_ID diferente do PROD esperado.

Proximo passo: se aprovado manualmente, executar `IMPORTAR_FLASH_PRODUCAO_B38_AUTORIZADO`.

Proibido nesta etapa: qualquer gravacao, importacao real, conciliacao, pendencias e deploy.
