# FIN Flash - B.3.9 - Auditoria Pos-importacao

Funcao: `AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR`

Objetivo: auditar lote e extratos Flash importados, somente leitura.

Execucao manual:

```text
AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR
```

JSON esperado: `executado:false`, `somenteLeitura:true`, contagem de lotes,
contagem de extratos, valor total, periodo, duplicidades de lote e duplicidades
de extrato.

Bloqueios:

- importacao ainda nao encontrada;
- duplicidade de lote;
- duplicidade de extrato;
- DB PROD invalido.

Proximo passo: se aprovado, executar `PREVIA_CONCILIACAO_FLASH_PRODUCAO_B310_SEM_GRAVAR`.

Proibido: gravar, conciliar, gerar pendencias ou fazer deploy.
