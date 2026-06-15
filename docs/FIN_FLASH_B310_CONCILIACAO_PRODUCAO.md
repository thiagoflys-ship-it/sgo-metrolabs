# FIN Flash - B.3.10/B.3.12 - Conciliacao Producao

Funcoes:

- `PREVIA_CONCILIACAO_FLASH_PRODUCAO_B310_SEM_GRAVAR`
- `CONCILIAR_FLASH_PRODUCAO_B311_AUTORIZADO`
- `AUDITAR_CONCILIACAO_FLASH_PRODUCAO_B312_SEM_GRAVAR`

## B.3.10 - Previa

Somente leitura. Calcula extratos lidos, lancamentos lidos, matches provaveis,
sem prestacao e divergencias.

Execucao:

```text
PREVIA_CONCILIACAO_FLASH_PRODUCAO_B310_SEM_GRAVAR
```

## B.3.11 - Conciliacao Real

Wrapper real autorizado, mas bloqueado enquanto rotina de producao nao estiver
homologada. Nao executar sem nova aprovacao manual.

Execucao futura:

```text
CONCILIAR_FLASH_PRODUCAO_B311_AUTORIZADO
```

Bloqueio atual esperado se ainda nao homologado:

- `ROTINA_CONCILIACAO_REAL_PRODUCAO_NAO_HOMOLOGADA`

## B.3.12 - Auditoria

Somente leitura. Conta conciliacoes, extratos, lancamentos e nao conciliados.

Execucao:

```text
AUDITAR_CONCILIACAO_FLASH_PRODUCAO_B312_SEM_GRAVAR
```

Proibido: deploy, pendencias reais e alteracao DEV.
