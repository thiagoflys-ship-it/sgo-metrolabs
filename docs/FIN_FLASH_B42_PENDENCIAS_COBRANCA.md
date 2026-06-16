# FIN Flash B42 - Pendencias e cobranca

Nota de homologacao: B42 e ferramenta futura de registro/cobranca de
pendencias. No momento atual, o lote Rafael e massa modelo/homologacao e nao
deve ser usado para cobranca real nem registro de pendencia real, salvo
autorizacao expressa futura.

## Contexto

A B40 corrigiu o incidente B38 no lote `LOTE-FLASH-20260615-163548`.
A B41 confirmou que a conciliacao segura esta tecnicamente pronta, mas nao ha
prestacoes/lancamentos cadastrados para conciliar.

Resultado consolidado da B41:

- 49 extratos preservados;
- 46 despesas Flash sem prestacao;
- 3 creditos/depositos ignorados corretamente;
- total pendente: `2079.21`;
- colaborador principal: `RAFAEL FAY MARQUES`;
- nenhuma conciliacao executada.

## Motivo da B42

A B42 transforma o diagnostico B41 em pendencias formais e cobranca operacional,
sem conciliar nada.

## O que B42 faz

- Registra pendencias em `FIN_CARTOES_PENDENCIAS`, se o schema estiver
  compativel.
- Vincula cada pendencia ao respectivo extrato Flash.
- Gera relatorio de cobranca para Rafael Fay Marques.
- Audita o registro das pendencias.
- Mantem o modulo operacional com pendencias abertas.

## O que B42 nao faz

- Nao concilia.
- Nao chama B41 real.
- Nao altera `FIN_CARTOES_CONCILIACAO`.
- Nao mexe nos 3 creditos/depositos.
- Nao apaga lote, extratos ou lancamentos.
- Nao reimporta.
- Nao cria abas ou colunas.
- Nao envia mensagem automaticamente.

## Funcoes

1. `PREVIEW_REGISTRAR_PENDENCIAS_FLASH_B42_SEM_GRAVAR`
2. `REGISTRAR_PENDENCIAS_FLASH_B42_AUTORIZADO`
3. `EXECUTAR_REGISTRO_PENDENCIAS_FLASH_B42_TOKEN_CONFIRMADO`
4. `AUDITAR_PENDENCIAS_FLASH_B42_POS_SEM_GRAVAR`
5. `RELATORIO_COBRANCA_FLASH_B42_SEM_GRAVAR`
6. `CHECKLIST_OPERACIONAL_FLASH_B42_SEM_GRAVAR`

Token da real:

```text
CONFIRMO_REGISTRO_PENDENCIAS_B42_FLASH_PRODUCAO
```

## Ordem segura

1. `PREVIEW_REGISTRAR_PENDENCIAS_FLASH_B42_SEM_GRAVAR`
2. Revisar JSON completo.
3. Se aprovado:

```text
EXECUTAR_REGISTRO_PENDENCIAS_FLASH_B42_TOKEN_CONFIRMADO
```

4. `AUDITAR_PENDENCIAS_FLASH_B42_POS_SEM_GRAVAR`
5. `RELATORIO_COBRANCA_FLASH_B42_SEM_GRAVAR`
6. `CHECKLIST_OPERACIONAL_FLASH_B42_SEM_GRAVAR`

## Schema de pendencias

Campos usados quando existirem:

- `ID`;
- `PENDENCIA_ID`;
- `TIPO_PENDENCIA`;
- `EXTRATO_ID`;
- `FUNCIONARIO_NOME`;
- `DESCRICAO_PENDENCIA`;
- `VALOR_ENVOLVIDO`;
- `STATUS`;
- `CRIADO_EM`;
- `CRIADO_POR`;
- `ATUALIZADO_EM`;
- `ATUALIZADO_POR`.

Se `LOTE_ID` ou `ORIGEM` nao existirem no schema, a rastreabilidade fica em
`DESCRICAO_PENDENCIA`.

## Mensagem de cobranca

A B42 prepara mensagem para cobranca interna, mas nao envia nada:

```text
Rafael, foram identificadas 46 despesas no cartao Flash no periodo de 11/05/2026
a 09/06/2026, totalizando R$ 2.079,21, ainda sem prestacao/comprovante
cadastrado no sistema. Preciso que regularize enviando os comprovantes e a
finalidade/OS de cada despesa para fechamento financeiro. Os depositos/creditos
do cartao ja foram identificados separadamente e nao entram como despesa.
```

## Proxima etapa

Depois da B42:

- cobrar Rafael Fay Marques;
- registrar prestacoes/comprovantes;
- reexecutar preview B41;
- conciliar somente quando houver prestacao.
