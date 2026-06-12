# FIN Cartao Flash - Liberacao controlada

## Estado atual

- Modulo Flash validado em `/dev`.
- GitHub e Apps Script `/dev` atualizados ate o Pacote K.
- Importacao real existe no backend, mas permanece protegida.
- UI nao chama importacao real.
- Producao nao recebeu deploy nesta etapa.
- Setup/provisionamento nao foi executado.
- Baseline validado em `/dev`: 1 lote e 3 extratos.

## Fluxo aprovado

1. Gerar preview do XLSX Flash.
2. Pre-validar lote por dry-run.
3. Pre-confirmar lote em modo seguro.
4. Preparar payload em modo somente leitura.
5. Revisar checklist de liberacao controlada.
6. Auditar contagem antes/depois com funcoes `SEM_GRAVAR`.

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
- `auditarPreProducaoFlashV1_SEM_GRAVAR`

Confirmar sempre:

- `executado:false`
- `gravacaoReal:false`
- `nenhumaGravacao:true`, quando presente
- contagem antes/depois sem mudanca indevida

## O que falta para importacao real

- Decisao operacional para depositos/recargas.
- Decisao operacional para prestacoes pendentes.
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

## Producao

Producao nao foi alterada nesta etapa. Qualquer liberacao futura deve ser tratada como pacote separado, com decisao explicita, auditoria antes/depois e aprovacao operacional.
