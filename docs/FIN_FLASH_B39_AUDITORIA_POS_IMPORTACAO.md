# FIN Flash - B.3.9 - Auditoria Pos-B38

Funcao: `AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR`

Objetivo: auditar, somente leitura, o que a rotina antiga
`IMPORTACAO_EXTRATO_FLASH_REAL_FIN1117` gravou em producao durante B38.

Proibido nesta etapa:

- executar nova importacao real;
- corrigir manualmente a planilha;
- apagar lotes ou extratos;
- seguir para conciliacao antes da decisao A/B/C/D.

Execucao manual:

```text
AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_SEM_GRAVAR
```

JSON esperado: `executado:false`, `somenteLeitura:true`, `incidente:"B38"` e
`rotinaAntigaAuditada:"IMPORTACAO_EXTRATO_FLASH_REAL_FIN1117"`.

A auditoria retorna:

- lotes FIN1117 encontrados em `FIN_LOTES_EXTRATO_FLASH`;
- extratos relacionados em `FIN_CARTOES_EXTRATOS`, agrupados por lote;
- chaves de lote, hash de arquivo e chaves de duplicidade;
- periodo gravado, valor total gravado e quantidade de linhas;
- duplicidades por `LOTE_ID`, `CHAVE_LOTE`/`ARQUIVO_HASH` e `CHAVE_DUPLICIDADE`;
- logs relacionados em `FIN_CARTOES_LOGS`, quando existirem;
- payload B36/B37 reconstruido a partir de `TMP_IMPORT_EXTRATO_FLASH`;
- divergencias entre payload aprovado B36/B37 e gravacao B38.

Bloqueios:

- importacao B38/FIN1117 nao encontrada;
- duplicidade de `LOTE_ID`;
- duplicidade de `CHAVE_LOTE` ou `ARQUIVO_HASH`;
- duplicidade de `CHAVE_DUPLICIDADE`;
- divergencia entre payload B36/B37 e gravacao B38;
- DB PROD invalido.

Proximo passo: decidir manualmente uma das opcoes:

- A) aproveitar lote gravado;
- B) bloquear lote e criar correcao controlada;
- C) reverter com rotina especifica;
- D) recriar importacao segura com rotina nova.

Nao executar B310 enquanto esta decisao nao estiver registrada.

## B39.2 - Auditoria complementar resumida sem gravacao

Funcao: `AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_2_RESUMO_SEM_GRAVAR`

Motivo: a B39 confirmou que a rotina antiga
`IMPORTACAO_EXTRATO_FLASH_REAL_FIN1117` gravou em producao 49 extratos no lote
`LOTE-FLASH-20260615-163548`, enquanto B36/B37 tinham aprovado 46 registros
validos e tratado 3 linhas como invalidas/aviso por cartao final com 3 digitos.

Resultado B39 resumido:

- DB FIN producao confirmado: `1A3rjluetfMYfSwwpcGbbnfpkPdgR7R9iiwDVWvyp4Zw`;
- lote gravado: `LOTE-FLASH-20260615-163548`;
- 1 lote FIN1117 e 49 extratos FIN1117;
- valor total gravado: `720.79`;
- sem duplicidade de lote, chave de lote ou chave de extrato;
- divergencia critica: `DIVERGENCIA_PAYLOAD_B36_B37_VS_GRAVACAO_B38`;
- datas gravadas/periodo do lote com sinais de corrupcao ou inversao.

A B39.2 le somente:

- `TMP_IMPORT_EXTRATO_FLASH`;
- `FIN_LOTES_EXTRATO_FLASH`;
- `FIN_CARTOES_EXTRATOS`;
- `FIN_CARTOES_LOGS`, apenas para contagem/resumo se existir.

A B39.2 nao faz:

- importacao;
- conciliacao;
- correcao;
- limpeza;
- reimportacao;
- alteracao de status;
- criacao de lote;
- criacao de log;
- alteracao de headers;
- qualquer gravacao em planilha, Drive ou Script Properties.

O que a B39.2 diagnostica:

- classificacao resumida das 49 linhas da TMP;
- totais de validas e invalidas;
- valor total da TMP, das validas e das invalidas;
- total e valor gravado no lote B38;
- quais linhas invalidas aparecem em `FIN_CARTOES_EXTRATOS`;
- datas da TMP, datas gravadas nos extratos e periodo bruto/normalizado do lote;
- divergencias criticas para orientar B40.

Execucao manual:

```text
AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_2_RESUMO_SEM_GRAVAR
```

Copiar do log:

- JSON completo retornado pela funcao;
- `resumo`;
- `loteB38`;
- `datas`;
- `invalidas`;
- `divergencias`;
- `decisaoSugerida`;
- `proximaEtapa`.

Como decidir B40:

- Se `invalidasEncontradasNosExtratos > 0`, preparar B40 como correcao
  controlada para isolar/reclassificar os extratos invalidos.
- Se a B39.2 indicar que a validacao B36/B37 estava errada, registrar a
  evidencia antes de qualquer correcao.
- Se houver periodo do lote ou datas de extratos corrompidos, B40 deve tratar
  datas como parte explicita da correcao controlada.
- Se `ok:false`, nao executar B310, conciliacao, limpeza ou nova importacao.

Checklist de execucao manual:

- Abrir Apps Script producao.
- Selecionar `AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_2_RESUMO_SEM_GRAVAR`.
- Executar.
- Confirmar autorizacao se necessario.
- Copiar JSON completo do log.
- Nao executar nenhuma funcao de importacao, conciliacao, limpeza ou correcao.
- Enviar resultado para decisao B40.
