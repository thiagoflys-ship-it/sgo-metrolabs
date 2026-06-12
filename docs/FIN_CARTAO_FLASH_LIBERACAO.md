# FIN Cartao Flash - Liberacao controlada

## Estado atual

- Modulo Flash validado em `/dev`.
- GitHub e Apps Script `/dev` atualizados ate o Pacote N/O.
- Pacote P/Q preparado localmente para autorizacao tecnica de teste real controlado.
- Importacao real existe no backend, mas permanece protegida.
- UI nao chama importacao real.
- Producao nao recebeu deploy nesta etapa.
- Setup/provisionamento nao foi executado.
- Baseline validado em `/dev`: 1 lote e 3 extratos.
- Decisoes operacionais padrao foram definidas para o teste real controlado em `/dev`.

## Fluxo aprovado

1. Gerar preview do XLSX Flash.
2. Pre-validar lote por dry-run.
3. Pre-confirmar lote em modo seguro.
4. Preparar payload em modo somente leitura.
5. Aplicar decisoes operacionais padrao.
6. Revisar checklist de liberacao controlada.
7. Auditar contagem antes/depois com funcoes `SEM_GRAVAR`.
8. Gerar pacote de autorizacao manual em `/dev`.
9. Conferir payload, hash, lote, totais, frase obrigatoria e baseline.
10. Gerar checklist pos-execucao antes de qualquer acao real autorizada.

## Decisoes operacionais padrao

### Depositos/recargas

Decisao: `IMPORTAR_CREDITO_COMO_EXTRATO`

Motivo: manter o extrato fiel ao Flash e nao criar recarga separada nesta etapa.

### Prestacao pendente

Decisao: `IMPORTAR_COM_STATUS_PENDENTE`

Motivo: o extrato deve entrar, mas permanece pendente para conciliacao/prestacao posterior.

### Categoria nao inferida

Decisao: `IMPORTAR_COM_CATEGORIA_OUTROS`

Motivo: nao perder lancamento; classificar como `OUTROS_REVISAR` para revisao posterior.

## O que esta bloqueado

- Importacao real pela UI.
- Confirmacao real sem autorizacao tecnica.
- Deploy para producao.
- Setup ou alteracao de schema real.
- Execucao de funcoes antigas de importacao real sem validacao atual.

## Validacao segura em /dev

Executar manualmente no Apps Script Editor somente funcoes `SEM_GRAVAR`:

- `auditarContagemExtratoFlashV1_SEM_GRAVAR`
- `auditarModuloFlashCompletoV1_SEM_GRAVAR`
- `gerarChecklistLiberacaoFlashV1_SEM_GRAVAR`
- `simularFluxoCompletoFlashInlineV1_SEM_GRAVAR`
- `simularFluxoCompletoFlashComDecisoesV1_SEM_GRAVAR`
- `auditarDecisoesOperacionaisFlashV1_SEM_GRAVAR`
- `auditarPreProducaoFlashV1_SEM_GRAVAR`
- `gerarPacoteAutorizacaoImportacaoFlashV1_SEM_GRAVAR`
- `auditarPacoteAutorizacaoFlashV1_SEM_GRAVAR`
- `gerarChecklistPosImportacaoFlashV1_SEM_GRAVAR`
- `auditarProntoParaImportacaoRealDevFlashV1_SEM_GRAVAR`

Confirmar sempre:

- `executado:false`
- `gravacaoReal:false`
- `nenhumaGravacao:true`, quando presente
- contagem antes/depois sem mudanca indevida
- decisoes operacionais aplicadas
- pacote de autorizacao com `executado:false`
- `gravacaoReal:false`
- `prontoParaDeployDevParaProd:false`

## Pacote P/Q - autorizacao manual para teste real controlado

O Pacote P/Q prepara a autorizacao tecnica para uma futura importacao real controlada em `/dev`, mas nao executa a importacao real.

### Gerador de pacote de autorizacao

Funcao segura:

- `gerarPacoteAutorizacaoImportacaoFlashV1_SEM_GRAVAR`

Ela executa apenas fluxo em memoria:

1. Auditoria de contagem antes.
2. Dry-run.
3. Pre-confirmacao.
4. Preparacao de payload com decisoes operacionais padrao.
5. Simulacao de importacao real sem gravar.
6. Auditoria de prontidao.

Retorna:

- baseline antes;
- esperado depois;
- diferenca esperada;
- lote esperado;
- decisoes operacionais aplicadas;
- payload de autorizacao sugerido;
- frase obrigatoria `AUTORIZO IMPORTACAO REAL FLASH`;
- checklist antes;
- checklist depois;
- bloqueios e avisos.

A funcao nao chama `finImportarLoteExtratoFlashV1` e nao grava planilha.

### Auditoria do pacote

Funcao segura:

- `auditarPacoteAutorizacaoFlashV1_SEM_GRAVAR`

Ela confirma:

- baseline esperado de `/dev`: 1 lote e 3 extratos, com aviso se divergir;
- diferenca esperada coerente;
- payload de autorizacao completo;
- decisoes operacionais presentes;
- frase obrigatoria presente;
- ambiente marcado como `DEV`;
- pronto apenas para autorizacao manual em `/dev`;
- `prontoParaProducao:false`.

### Checklist pos-execucao

Funcao segura:

- `gerarChecklistPosImportacaoFlashV1_SEM_GRAVAR`

Roteiro depois de uma futura execucao real autorizada em `/dev`:

1. Rodar `TESTE_FLASH_CONTAGEM_SEM_GRAVAR`.
2. Confirmar lotes antes + 1.
3. Confirmar extratos antes + N.
4. Validar loteId e arquivoHash.
5. Validar duplicidade.
6. Validar dashboard, pendencias e conciliacao visual.
7. Validar UI.
8. Registrar evidencia.
9. Somente depois discutir producao.

### Auditoria consolidada pre-real

Funcao segura:

- `auditarProntoParaImportacaoRealDevFlashV1_SEM_GRAVAR`

Ela consolida:

- `auditarDecisoesOperacionaisFlashV1_SEM_GRAVAR`
- `auditarPreProducaoFlashV1_SEM_GRAVAR`
- `auditarPacoteAutorizacaoFlashV1_SEM_GRAVAR`

Retorna `prontoParaImportacaoRealDev:true` somente se todas as auditorias seguras estiverem ok. Producao permanece bloqueada.

## UI do Pacote P/Q

A tela do Cartao Flash passa a exibir:

- painel "Autorizacao manual para teste real controlado em /dev";
- botao "Gerar pacote de autorizacao";
- baseline antes;
- esperado depois;
- total que seria gravado;
- decisoes aplicadas;
- frase obrigatoria;
- payload sugerido em bloco somente leitura;
- aviso forte de que a tela nao executa a importacao real;
- painel "Checklist pos-execucao";
- botao "Gerar checklist pos-execucao".

A tela nao chama `finImportarLoteExtratoFlashV1`, nao cria botao de importacao real e nao usa `prompt()` ou `confirm()`.

## Checklist do teste real controlado em /dev

Antes de qualquer execucao real autorizada:

1. Rodar `TESTE_FLASH_CONTAGEM_SEM_GRAVAR`.
2. Confirmar baseline atual: 1 lote e 3 extratos.
3. Gerar preview do arquivo real.
4. Pre-validar lote por dry-run.
5. Pre-confirmar lote.
6. Preparar payload com decisoes operacionais padrao.
7. Confirmar status `APTO_TECNICAMENTE_BLOQUEADO_POR_CHAVE`.
8. Confirmar duplicidade real zerada para o lote escolhido.
9. Gerar pacote de autorizacao.
10. Conferir hash, lote, totais, contagem esperada e frase obrigatoria.
11. Registrar responsavel e autorizacao tecnica.
12. Executar importacao real somente em `/dev`, manualmente e com autorizacao explicita.
13. Rodar `TESTE_FLASH_CONTAGEM_SEM_GRAVAR` depois.
14. Comparar contagem antes/depois.

## O que falta para importacao real

- Duplicidade real zerada para o lote escolhido.
- Responsavel identificado.
- Autorizacao tecnica forte preenchida.
- Auditoria antes registrada.
- Auditoria depois obrigatoria.
- Plano de rollback ou cancelamento definido.
- Backup/evidencia antes do teste real controlado.
- Pacote de autorizacao sem bloqueios.

## Nunca executar sem autorizacao

- `finImportarLoteExtratoFlashV1`
- Qualquer funcao de importacao real antiga.
- Setup financeiro.
- Deploy de producao.
- Alteracao manual de schema.
- Execucao se baseline divergir sem decisao explicita.
- Execucao se payload tiver bloqueios.
- Execucao em producao antes do teste real controlado aprovado em `/dev`.

## Producao ainda bloqueada

- Nao houve deploy de producao.
- Producao nao esta pronta antes do teste real controlado em `/dev`.
- Qualquer promocao para producao deve ser um pacote separado.
- `prontoParaDeployDevParaProd` deve permanecer `false` ate validacao real controlada e autorizacao.

## Producao

Producao nao foi alterada nesta etapa. Qualquer liberacao futura deve ser tratada como pacote separado, com decisao explicita, auditoria antes/depois e aprovacao operacional.
