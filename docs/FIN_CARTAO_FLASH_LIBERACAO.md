# FIN Cartao Flash - Liberacao controlada

## Estado atual

- Modulo Flash validado em `/dev`.
- GitHub e Apps Script `/dev` atualizados ate o Pacote L/M.
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

Confirmar sempre:

- `executado:false`
- `gravacaoReal:false`
- `nenhumaGravacao:true`, quando presente
- contagem antes/depois sem mudanca indevida
- decisoes operacionais aplicadas
- `prontoParaDeployDevParaProd:false`

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
9. Registrar responsavel e autorizacao tecnica.
10. Executar importacao real somente em `/dev`, manualmente e com autorizacao explicita.
11. Rodar `TESTE_FLASH_CONTAGEM_SEM_GRAVAR` depois.
12. Comparar contagem antes/depois.

## O que falta para importacao real

- Duplicidade real zerada para o lote escolhido.
- Responsavel identificado.
- Autorizacao tecnica forte preenchida.
- Auditoria antes registrada.
- Auditoria depois obrigatoria.
- Plano de rollback ou cancelamento definido.

## Nunca executar sem autorizacao

- `finImportarLoteExtratoFlashV1`
- Qualquer funcao de importacao real antiga.
- Setup financeiro.
- Deploy de producao.
- Alteracao manual de schema.

## Producao ainda bloqueada

- Nao houve deploy de producao.
- Producao nao esta pronta antes do teste real controlado em `/dev`.
- Qualquer promocao para producao deve ser um pacote separado.
- `prontoParaDeployDevParaProd` deve permanecer `false` ate validacao real controlada e autorizacao.

## Producao

Producao nao foi alterada nesta etapa. Qualquer liberacao futura deve ser tratada como pacote separado, com decisao explicita, auditoria antes/depois e aprovacao operacional.
