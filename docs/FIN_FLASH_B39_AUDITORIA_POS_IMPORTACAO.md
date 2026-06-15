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

## B39.3 - Auditoria da regra B36/B37 sem gravacao

Funcao: `AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_3_REGRA_B36_B37_SEM_GRAVAR`

Motivo: a B39.2 executou corretamente em modo somente leitura, mas classificou
`0/49` linhas como validas e `49/49` como invalidas por `CARTAO_FINAL` com 3
digitos (`908`). Isso conflita com a memoria operacional de B36/B37, que
aprovou 46 registros validos e tratou 3 registros como invalidos/avisos.

Conclusao antes da B39.3:

- nao isolar 49 extratos;
- nao corrigir datas ainda;
- nao alterar lote;
- nao apagar nada;
- nao executar conciliacao;
- nao executar nova importacao.

A B39.3 existe para localizar e reproduzir a regra real usada por B36/B37. No
codigo atual, as referencias principais sao:

- `DRY_RUN_FLASH_PRODUCAO_B36_SEM_GRAVAR`;
- `PRE_CONFIRMAR_FLASH_PRODUCAO_B37_SEM_GRAVAR`;
- `dryRun_`;
- `lerEntradaFlash_`;
- `cartaoFlash_`;
- `normalizarDataFlash_`.

A regra atual encontrada no codigo considera `CARTAO_FINAL` com 3 digitos como
cartao valido com aviso `CARTAO_FINAL_COM_3_DIGITOS`, nao como bloqueio
automatico. A B39.3 retorna se essa regra atual reproduz ou nao o esperado
`46/3`.

A B39.3 le somente:

- `TMP_IMPORT_EXTRATO_FLASH`;
- `FIN_LOTES_EXTRATO_FLASH`;
- `FIN_CARTOES_EXTRATOS`;
- tabelas auxiliares apenas se a regra rastreada passar a depender delas;
- logs somente se necessario e em resumo.

A B39.3 nao faz:

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

Execucao manual:

```text
AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_3_REGRA_B36_B37_SEM_GRAVAR
```

Copiar do log:

- JSON completo retornado pela funcao;
- `regraB36B37`;
- `reclassificacaoB36B37`;
- `comparacaoComEsperado`;
- `grupos`;
- `extratosGravados`;
- `conclusao`;
- `bloqueios`;
- `proximaEtapa`.

Criterios para avancar para B40:

- Se `comparacaoComEsperado.bateComB36B37:true`, criar B40 de correcao
  controlada conforme `conclusao.tipoB40Sugerido`.
- Se a regra atual tambem nao reproduzir `46/3`, nao criar correcao ainda;
  rastrear logs/evidencias da execucao B36/B37 que gerou o numero original.
- Se `REGRA_B36_B37_NAO_ENCONTRADA` ou
  `REGRA_B36_B37_ATUAL_NAO_REPRODUZ_MEMORIA_46_3`, manter B40 bloqueada.

Checklist de execucao manual:

- Abrir Apps Script producao.
- Selecionar `AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_3_REGRA_B36_B37_SEM_GRAVAR`.
- Executar.
- Confirmar autorizacao se necessario.
- Copiar JSON completo do log.
- Nao executar nenhuma funcao de importacao, conciliacao, limpeza ou correcao.
- Enviar resultado para decisao B40.

## B39.4 - Evidencia final para decisao B40

Funcao: `AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_4_EVIDENCIA_FINAL_SEM_GRAVAR`

Motivo: a B39.3 localizou a regra B36/B37 e confirmou que `CARTAO_FINAL` com 3
digitos e aviso nao bloqueante. Portanto, as 46 despesas com aviso
`CARTAO_FINAL_COM_3_DIGITOS` nao devem ser tratadas como 46 invalidas e nao
devem ser isoladas.

Resultado B39.3 resumido:

- `tmpTotal: 49`;
- `validas: 46`;
- `avisos: 46`;
- `invalidas: 3`;
- `valorValidas: -2079.21`;
- `valorInvalidas: 2800`;
- `valorTotal: 720.79`;
- aviso: `CARTAO_FINAL_COM_3_DIGITOS`;
- bloqueio operacional: regra atual nao reproduziu sozinha a memoria 46/3 sem
  registrar a diferenca entre aviso e invalidez real.

Interpretacao operacional:

- as 46 linhas negativas sao despesas validas com aviso;
- cartao final com 3 digitos e aviso nao bloqueante conforme `cartaoFlash_`;
- as 3 invalidas reais sao depositos/creditos positivos;
- B38 gravou tambem os 3 creditos/depositos;
- B38 gravou datas/metadados corrompidos;
- B40 devera corrigir datas/metadados e tratar os 3 creditos/depositos;
- nao isolar as 46 despesas validas.

A B39.4 le somente:

- `TMP_IMPORT_EXTRATO_FLASH`;
- `FIN_LOTES_EXTRATO_FLASH`;
- `FIN_CARTOES_EXTRATOS`;
- tabelas auxiliares somente se a regra B36/B37 passar a depender delas.

A B39.4 nao faz:

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

Execucao manual:

```text
AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_4_EVIDENCIA_FINAL_SEM_GRAVAR
```

Copiar do log:

- JSON completo retornado pela funcao;
- `resumoFinal`;
- `evidenciaInvalidasReais`;
- `evidenciaValidasComAviso`;
- `loteB38`;
- `decisao`;
- `bloqueios`;
- `avisos`;
- `proximaEtapa`.

Criterios para liberar desenho da B40:

- confirmar 46 despesas validas;
- confirmar 46 despesas validas com aviso de cartao final 3 digitos;
- confirmar 3 depositos/creditos;
- confirmar que os 3 foram gravados pela B38;
- confirmar ausencia de duplicidade;
- confirmar datas TMP corretas;
- confirmar datas/metadados B38 corrompidos.

Checklist de execucao manual:

- Abrir Apps Script producao.
- Selecionar `AUDITAR_IMPORTACAO_FLASH_PRODUCAO_B39_4_EVIDENCIA_FINAL_SEM_GRAVAR`.
- Executar.
- Confirmar autorizacao se necessario.
- Copiar JSON completo do log.
- Nao executar B40 ainda.
- Nao executar importacao, conciliacao, limpeza ou correcao.
- Enviar resultado para desenho da B40 controlada.
