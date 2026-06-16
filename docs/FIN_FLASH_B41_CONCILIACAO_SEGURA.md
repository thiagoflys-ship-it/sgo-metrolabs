# FIN Flash B41 - Conciliacao segura pos-B40

## Contexto

A B40 corrigiu o incidente B38 no lote `LOTE-FLASH-20260615-163548`.

Estado validado antes da B41:

- 49 extratos preservados;
- 46 despesas validas candidatas a conciliacao;
- 3 creditos/depositos classificados como `CREDITO_DEPOSITO_FLASH`;
- periodo do lote corrigido para `2026-05-11 07:23:00` ate
  `2026-06-09 07:08:00`;
- saldo liquido mantido em `720.79`;
- sem duplicidades;
- sem conciliacao previa do lote.

## O que B41 faz

- Le `FIN_CARTOES_EXTRATOS`, `FIN_LOTES_EXTRATO_FLASH`,
  `FIN_CARTOES_LANCAMENTOS`, `FIN_CARTOES_CONCILIACAO`,
  `FIN_CARTOES_PENDENCIAS` e `FIN_CARTOES_LOGS`, quando disponiveis.
- Separa os 49 extratos em 46 despesas e 3 creditos/depositos.
- Calcula matches entre despesas Flash e lancamentos/prestacoes.
- Concilia automaticamente apenas matches seguros.
- Gera pendencias para itens sem match seguro, se o schema estiver compativel.
- Registra log resumido da B41, se o schema estiver compativel.

## O que B41 nao faz

- Nao concilia creditos/depositos como despesa.
- Nao cria pendencia de prestacao para credito/deposito.
- Nao apaga lote, extratos, lancamentos ou pendencias.
- Nao reimporta arquivo.
- Nao altera o lote B40 para 46 linhas.
- Nao cria abas ou colunas em producao.
- Nao executa conciliacao real sem preview aprovado e token explicito.

## Criterios de match

- `MATCH_EXATO`: mesmo colaborador, valor compativel e mesma data.
- `MATCH_FORTE`: mesmo colaborador, valor compativel, data ate 1 dia e
  descricao/categoria compativel.
- `MATCH_POSSIVEL`: mesmo colaborador e valor compativel, mas data/descricao
  fracas.
- `AMBIGUO`: mais de um candidato forte ou possivel.
- `SEM_PRESTACAO`: nenhum lancamento/prestacao encontrado.
- `NAO_CONCILIAVEL_CREDITO_DEPOSITO`: creditos/depositos B40.

A execucao real automatica usa somente `MATCH_EXATO` e `MATCH_FORTE` sem
ambiguidade.

## Funcoes

1. `PREVIEW_CONCILIAR_FLASH_PRODUCAO_B41_SEM_GRAVAR`
2. `CONCILIAR_FLASH_PRODUCAO_B41_AUTORIZADO`
3. `EXECUTAR_CONCILIACAO_FLASH_B41_PRODUCAO_TOKEN_CONFIRMADO`
4. `AUDITAR_CONCILIACAO_FLASH_PRODUCAO_B41_POS_SEM_GRAVAR`
5. `RELATORIO_PENDENCIAS_FLASH_PRODUCAO_B41_SEM_GRAVAR`
6. `CHECKLIST_FINAL_FLASH_PRODUCAO_B41_SEM_GRAVAR`

Token da real:

```text
CONFIRMO_CONCILIACAO_B41_FLASH_PRODUCAO
```

## Ordem segura de execucao

1. `PREVIEW_CONCILIAR_FLASH_PRODUCAO_B41_SEM_GRAVAR`
2. Revisar JSON completo.
3. Se aprovado:

```text
EXECUTAR_CONCILIACAO_FLASH_B41_PRODUCAO_TOKEN_CONFIRMADO
```

4. `AUDITAR_CONCILIACAO_FLASH_PRODUCAO_B41_POS_SEM_GRAVAR`
5. `RELATORIO_PENDENCIAS_FLASH_PRODUCAO_B41_SEM_GRAVAR`
6. `CHECKLIST_FINAL_FLASH_PRODUCAO_B41_SEM_GRAVAR`

## Checklist manual

- Confirmar `podeExecutarReal:true` no preview.
- Confirmar que os 3 creditos/depositos aparecem como ignorados.
- Confirmar que `conciliacaoAutomaticaPlanejada` contem apenas matches exatos
  ou fortes.
- Confirmar que `MATCH_POSSIVEL`, `AMBIGUO` e `SEM_PRESTACAO` viram
  pendencias.
- Confirmar que a real foi executada somente pelo wrapper com token.
- Confirmar auditoria pos-B41 antes de qualquer publicacao final.

## B41.1 - Correcao do preview apos leitura zerada

O primeiro preview B41 retornou `extratosTotal:0`, mesmo apos a auditoria
pos-B40 confirmar 49 extratos no lote. A execucao foi somente leitura e nao
gravou nada.

Causa encontrada:

- o resolvedor de aliases da B41 aceitava correspondencia parcial nos dois
  sentidos;
- ao procurar `LOTE_ID`, podia selecionar a coluna `ID`, porque `LOTE ID`
  contem `ID`;
- com isso, o filtro por lote comparava o ID do extrato com
  `LOTE-FLASH-20260615-163548` e encontrava 0 linhas.

Ajuste feito:

- o resolvedor B41 agora tenta primeiro correspondencia normalizada exata;
- so depois usa a busca flexivel antiga;
- a B41 passa a encontrar `LOTE_ID` antes de qualquer alias parcial;
- a validacao de B40 aplicada nao depende da existencia de prestacoes.

Funcao de diagnostico criada:

```text
DIAGNOSTICAR_B41_LEITURA_EXTRATOS_FLASH_SEM_GRAVAR
```

Comportamento correto quando nao houver prestacoes:

- `extratosTotal:49`;
- `despesasCandidatas:46`;
- `creditosDepositosIgnorados:3`;
- `b40Aplicada:true`;
- `podeExecutarReal:false`;
- bloqueio principal: `SEM_PRESTACOES_PARA_CONCILIAR`;
- nao retornar `B41_SEM_ITENS_PROCESSAVEIS` se ha 46 despesas candidatas.

Proxima execucao manual:

1. `DIAGNOSTICAR_B41_LEITURA_EXTRATOS_FLASH_SEM_GRAVAR`
2. `PREVIEW_CONCILIAR_FLASH_PRODUCAO_B41_SEM_GRAVAR`

## Publicacao final

So avancar para publicacao/encerramento depois de:

- auditoria pos-B41 sem bloqueios criticos;
- pendencias revisadas;
- creditos/depositos nao conciliados indevidamente;
- logs e documentacao atualizados;
- nenhuma reimportacao, limpeza ou alteracao manual na planilha.
