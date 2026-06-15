# FIN Flash B40 - Correcao controlada pos-B38

## Contexto

A B38 executou a rotina antiga `IMPORTACAO_EXTRATO_FLASH_REAL_FIN1117` e gravou
o lote `LOTE-FLASH-20260615-163548` em producao.

A auditoria B39.4 confirmou:

- 49 linhas na TMP e 49 extratos gravados;
- 46 despesas validas;
- 46 despesas validas com aviso nao bloqueante de cartao final com 3 digitos;
- 3 depositos/creditos positivos gravados indevidamente como parte do extrato;
- saldo liquido preservado em `720.79`;
- ausencia de duplicidades;
- datas da TMP corretas;
- datas e periodo gravados pela B38 corrompidos.

## Por que B40 existe

A B40 corrige o que foi gravado de forma inconsistente pela B38, sem apagar,
reimportar, conciliar ou isolar despesas validas.

## O que B40 corrige

- Periodo do lote `LOTE-FLASH-20260615-163548`:
  - inicio: `2026-05-11 07:23:00`;
  - fim: `2026-06-09 07:08:00`.
- Datas e horas dos 49 extratos, usando `TMP_IMPORT_EXTRATO_FLASH` como fonte.
- Classificacao dos 3 depositos/creditos como `CREDITO_DEPOSITO_FLASH`.
- Status dos 3 depositos/creditos como `NAO_CONCILIAVEL_COM_DESPESA`.
- Observacoes rastreaveis nos extratos e no lote.
- Um log resumido em `FIN_CARTOES_LOGS`, se o schema estiver compativel.

## O que B40 nao faz

- Nao apaga lote.
- Nao apaga extratos.
- Nao reimporta arquivo.
- Nao cria novos extratos.
- Nao concilia.
- Nao isola as 46 despesas validas.
- Nao transforma credito/deposito em despesa.
- Nao cria colunas automaticamente.

## Funcoes criadas

1. `PREVIEW_CORRIGIR_IMPORTACAO_FLASH_PRODUCAO_B40_SEM_GRAVAR`
2. `CORRIGIR_IMPORTACAO_FLASH_PRODUCAO_B40_AUTORIZADO`
3. `AUDITAR_CORRECAO_FLASH_PRODUCAO_B40_POS_SEM_GRAVAR`

## Ordem segura de execucao

1. Executar `PREVIEW_CORRIGIR_IMPORTACAO_FLASH_PRODUCAO_B40_SEM_GRAVAR`.
2. Revisar o JSON completo.
3. Se aprovado, executar:

```text
CORRIGIR_IMPORTACAO_FLASH_PRODUCAO_B40_AUTORIZADO("CONFIRMO_CORRECAO_B40_FLASH_PRODUCAO")
```

4. Executar `AUDITAR_CORRECAO_FLASH_PRODUCAO_B40_POS_SEM_GRAVAR`.
5. Somente liberar B41 se a auditoria pos-B40 retornar `ok:true`.

## Checklist manual

- Confirmar `DB_FIN_ID` de producao:
  `1A3rjluetfMYfSwwpcGbbnfpkPdgR7R9iiwDVWvyp4Zw`.
- Confirmar que o preview retorna `podeExecutarReal:true`.
- Confirmar que as validacoes criticas estao todas `true`.
- Confirmar que `alteracoesPlanejadas.extratosDatasCorrigir` e igual a `49`.
- Confirmar que `creditosDepositosClassificar` e igual a `3`.
- Confirmar que `despesasValidasPreservar` e igual a `46`.
- Confirmar que a funcao real foi chamada com o token exato.
- Confirmar que a auditoria pos-B40 retorna `ok:true`.

## Criterios para liberar B41

- Lote continua existindo.
- 49 extratos continuam existindo.
- 46 despesas validas preservadas.
- 3 depositos/creditos classificados.
- Datas dos 49 extratos batem com a TMP.
- Periodo do lote corrigido para `2026-05-11 07:23:00` ate
  `2026-06-09 07:08:00`.
- Saldo liquido continua `720.79`.
- Duplicidades continuam `0`.
- Nenhuma conciliacao foi executada.
