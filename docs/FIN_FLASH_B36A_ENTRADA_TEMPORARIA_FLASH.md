# FIN Flash - B.3.6A - Entrada Temporaria Flash Producao

## Objetivo

Preparar e auditar a aba temporaria `TMP_IMPORT_EXTRATO_FLASH` antes de repetir o
dry-run Flash de producao.

Essa aba e uma area temporaria de entrada. Ela nao e uma aba oficial FIN e nao
representa importacao real.

## Funcoes

```text
AUDITAR_ENTRADA_FLASH_PRODUCAO_B36A_SEM_GRAVAR
PREPARAR_ENTRADA_FLASH_PRODUCAO_B36A_AUTORIZADO
```

## Formato Esperado

A linha 1 da aba `TMP_IMPORT_EXTRATO_FLASH` deve conter:

```text
DATA | DESCRICAO | VALOR | TIPO | PESSOA | CARTAO_FINAL
```

Os dados reais revisados do extrato Flash devem ser colados a partir da linha 2.

Observacoes:

- `VALOR` e obrigatorio para o dry-run.
- `DATA`, `DESCRICAO`, `PESSOA` e `CARTAO_FINAL` melhoram periodo, duplicidade e auditoria.
- `TIPO` pode ajudar a diferenciar debito e credito.
- Nao colar totais soltos, formulas, linhas intermediarias em branco ou dados fora do periodo aprovado.

## Preparacao Autorizada

`PREPARAR_ENTRADA_FLASH_PRODUCAO_B36A_AUTORIZADO` pode:

- validar DB FIN PROD;
- bloquear DB DEV;
- criar somente a aba `TMP_IMPORT_EXTRATO_FLASH`, se ausente;
- escrever somente os headers esperados, se a aba estiver vazia;
- retornar `FONTE_FLASH_NAO_CONFIGURADA` quando nao houver fonte/payload XLSX aprovado.

Ela nao limpa dados existentes automaticamente e nao grava em:

- `FIN_LOTES_EXTRATO_FLASH`;
- `FIN_CARTOES_EXTRATOS`;
- `FIN_CARTOES_CONCILIACAO`;
- `FIN_CARTOES_PENDENCIAS`.

## Auditoria Sem Gravar

`AUDITAR_ENTRADA_FLASH_PRODUCAO_B36A_SEM_GRAVAR` apenas valida:

- existencia da aba temporaria;
- headers;
- quantidade de linhas de dados;
- instrucao de colagem manual segura.

## Proxima Etapa

Depois de preparar a aba e colar os dados reais revisados, executar novamente:

```text
DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR
```

Continua proibido:

- importacao real;
- conciliacao real;
- geracao real de pendencias;
- deploy WebApp;
- alteracao em DEV.
