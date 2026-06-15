# FIN Flash - B.3.8 - Importacao Real Producao

Funcao: `IMPORTAR_FLASH_PRODUCAO_B38_AUTORIZADO`

Objetivo: disponibilizar o wrapper real de importacao Flash producao, com travas de
DB PROD, duplicidade, entrada valida e lock.

Esta funcao grava dados quando executada manualmente e aprovada pelas validacoes.
Ela nao deve ser executada antes dos JSONs B.3.6 e B.3.7 estarem aprovados.

Pre-requisitos:

- B.3.6 aprovado.
- B.3.7 aprovado.
- Entrada `TMP_IMPORT_EXTRATO_FLASH` revisada.
- Sem duplicidade de lote.
- `DB_FIN_ID` igual ao PROD esperado.

Execucao manual futura:

```text
IMPORTAR_FLASH_PRODUCAO_B38_AUTORIZADO
```

JSON esperado apos execucao futura: `executado:true`, `gravacao.loteCriado:true`,
`gravacao.linhasLoteCriadas:1`, `gravacao.extratosCriados` maior que zero,
`bloqueios:[]`.

Bloqueios:

- `ENTRADA_FLASH_AUSENTE`;
- `LOTE_FLASH_DUPLICADO`;
- `TOTAL_REGISTROS_VALIDOS_ZERO`;
- `LOCK_IMPORTACAO_FLASH_NAO_OBTIDO`;
- DB DEV detectado.

Proximo passo: executar `AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR`.

Proibido agora: executar sem autorizacao manual explicita, deploy, conciliacao e pendencias.
