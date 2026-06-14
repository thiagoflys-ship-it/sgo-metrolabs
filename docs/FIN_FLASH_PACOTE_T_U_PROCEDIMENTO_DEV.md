# FIN Flash — Pacote T/U — Procedimento de execucao real controlada em /dev

## Contexto

Este documento descreve o procedimento completo para executar a importacao real do
lote Flash no ambiente /dev (Pacote T) e auditar o resultado pos-importacao (Pacote U).

Toda execucao e manual, no editor Apps Script /dev. Nenhuma funcao e chamada por
terminal, por clasp run, ou por Claude. O responsavel pela execucao e Thiago Gonzales.

## Estado antes da execucao

| Parametro          | Valor esperado                    |
|--------------------|-----------------------------------|
| totalLotesLidos    | 1                                 |
| totalExtratosLidos | 3                                 |
| loteId             | LOTE-FLASH-PREVIEW-34ABC763       |
| arquivoHash        | LOGICO-971C06CE                   |
| totalLancamentos   | 4                                 |
| somaDebitos        | -57.34                            |
| somaCreditos       | 1000.00                           |
| ambiente           | DEV                               |
| fraseAutorizacao   | AUTORIZO IMPORTACAO REAL FLASH    |

## Estado esperado apos execucao (Pacote T)

| Parametro          | Valor esperado |
|--------------------|----------------|
| totalLotesLidos    | 2              |
| totalExtratosLidos | 7              |
| deltaLotes         | +1             |
| deltaExtratos      | +4             |

## Pacote T — Procedimento de execucao

### Pre-requisitos

1. Confirmar HEAD local == origin/master (`git log -1`).
2. Confirmar que nenhum outro job esta rodando no Apps Script /dev.
3. Ter este documento aberto para referencia durante a execucao.

### Passo a passo

1. Abrir o editor Apps Script do projeto /dev no navegador.
2. Localizar a funcao `EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE`.
3. Verificar que a funcao esta presente e que o comentario de cabecalho esta intacto:
   ```
   // FIN.T — Execucao real controlada Flash em /dev — GRAVA DADOS REAIS NO DB_FIN /dev
   ```
4. Clicar em "Executar" com a funcao selecionada.
5. Aguardar conclusao — NÃO cancelar durante execucao.
6. Abrir o Registro de execucao (Logbook) e copiar o JSON completo de retorno.
7. Confirmar no retorno:
   - `resultadoImportacao.success == true`
   - `depois.totalLotesLidos == 2`
   - `depois.totalExtratosLidos == 7`
   - `validacaoDepois.quantidadeOk == true`
   - `validacaoDepois.naoDuplicou == true` (se campo presente)
8. Salvar o log completo como evidencia.

### O que a funcao faz internamente

1. Verifica baseline antes — bloqueia se nao for 1/3.
2. Gera payload fresco via `gerarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR()`.
3. Preenche `usuarioResponsavel = "Thiago Gonzales"` e `timestampAutorizacao`.
4. Valida 7 campos criticos (loteId, arquivoHash, totais, frase, ambiente).
5. Chama `finImportarLoteExtratoFlashV1(payload)` — UNICA chamada de escrita.
6. Verifica baseline depois — espera 2/7.
7. Retorna objeto completo com `{antes, resultadoImportacao, depois, validacaoDepois}`.

### Se a funcao bloquear

| Motivo do bloqueio              | Acao                                        |
|---------------------------------|---------------------------------------------|
| Baseline nao e 1/3              | Nao executar. Investigar estado do DB_FIN.  |
| loteId divergente               | Nao executar. Verificar payload gerado.     |
| fraseAutorizacao incorreta      | Nao executar. Verificar payload.            |
| totalLancamentos != 4           | Nao executar. Verificar payload inline.     |
| Apos execucao: nao virou 2/7   | Auditoria urgente. Ver Pacote U.            |

## Pacote U — Auditoria pos-importacao

### Quando executar

Somente APOS `EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE()` retornar
`success: true`.

### Passo a passo

1. No mesmo editor Apps Script /dev.
2. Localizar a funcao `AUDITAR_POS_IMPORTACAO_FLASH_DEV_PACOTE_U_SEM_GRAVAR`.
3. Executar a funcao.
4. Verificar no log:
   - `ok: true`
   - `validacao.importacaoOcorreu: true`
   - `validacao.quantidadeEsperadaOk: true`
   - `validacao.naoDuplicou: true`
   - `validacao.prontoParaFechamentoDev: true`
   - `bloqueios: []`
5. Salvar log como segunda evidencia.

### Interpretacao dos resultados

| Campo `ok`  | Cenario                                   | Acao recomendada                         |
|-------------|-------------------------------------------|------------------------------------------|
| `true`      | Importacao OK, 2/7, sem duplicacao        | Prosseguir para Pacotes V/W              |
| `false`     | Nao importou (ainda 1/3)                  | Executar Pacote T primeiro               |
| `false`     | Duplicacao detectada (>2 lotes ou >7 ext) | Auditoria manual urgente do DB_FIN /dev  |
| `false`     | Baseline inesperado                       | Investigar manualmente                   |

### Verificacao manual complementar (recomendada)

Mesmo com `ok: true`, verificar manualmente no DB_FIN /dev:

1. Aba `FIN_LOTES_EXTRATO_FLASH`:
   - Deve ter 2 linhas (1 anterior + 1 nova).
   - Nova linha: `LOTE_ID = LOTE-FLASH-PREVIEW-34ABC763`, `ARQUIVO_HASH = LOGICO-971C06CE`.
2. Aba `FIN_CARTOES_EXTRATOS`:
   - Deve ter 7 linhas (3 anteriores + 4 novas).
   - As 4 novas linhas devem ter `LOTE_ID = LOTE-FLASH-PREVIEW-34ABC763`.

## Pacote V — Evidencias e fechamento /dev

Apos Pacote U com `ok: true`:

1. Exportar logs de Pacote T e Pacote U como evidencias (copiar JSON do Logbook).
2. Registrar em `_evidencias/` ou equivalente local (nao commitar dados reais).
3. Fazer commit local dos arquivos de codigo (funcoes S/T/U) com nova autorizacao explicita.
4. Nao fazer push sem nova autorizacao.

## Pacote W — Decisao sobre producao

Pacote W e uma sessao separada, com nova autorizacao explicita. Nao confundir com /dev.

Requisitos minimos para discussao do Pacote W:
- Pacote T e U concluidos com evidencias em /dev.
- Commit dos pacotes S/T/U em master local.
- Revisao do payload de producao (diferente do payload /dev).
- Nova frase de autorizacao e novo responsavel confirmados.
- Deploy de producao discutido e autorizado separadamente.

## Proibicoes absolutas durante todo o fluxo T/U/V/W

- Nao executar `clasp deploy`.
- Nao executar `EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE` via terminal.
- Nao executar nenhuma funcao em producao sem autorizacao separada explicita.
- Nao usar `--force` em nenhum comando clasp ou git.
- Nao modificar `SGO_Main.js`, HTML files, modulo ORC, modulo AT.
- Nao commitar sem autorizacao explicita.
- Nao fazer push do Pacote U sem nova autorizacao de push.

## Funcoes envolvidas

| Funcao                                              | Linha  | Grava? | Pacote |
|-----------------------------------------------------|--------|--------|--------|
| `TESTE_FLASH_CONTAGEM_SEM_GRAVAR`                   | 241    | Nao    | pre/pos|
| `gerarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR`      | 3472   | Nao    | pre    |
| `auditarFinalAntesImportacaoRealFlashDevV1_SEM_GRAVAR` | 3725 | Nao  | pre    |
| `EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE` | ~3987 | SIM | T      |
| `finImportarLoteExtratoFlashV1` (chamada interna)   | 491    | SIM    | T      |
| `gerarChecklistPosImportacaoFlashV1_SEM_GRAVAR`     | 1292   | Nao    | U      |
| `auditarModuloFlashCompletoV1_SEM_GRAVAR`           | 699    | Nao    | U      |
| `AUDITAR_POS_IMPORTACAO_FLASH_DEV_PACOTE_U_SEM_GRAVAR` | ~4157 | Nao | U     |

## Historico de pacotes anteriores

- Pacotes H–R: validacoes, payload, autorizacao, template, auditoria pre-real. Concluidos.
- Pacote S: funcoes de auditoria pre-real unificadas + extrator de template em chunks. Concluido.
- Pacote T: funcao de execucao real controlada em /dev. Push feito. Aguardando execucao manual.
- Pacote U: esta auditoria pos-importacao. Push pendente de nova autorizacao.
- Pacotes V/W: fechamento /dev e decisao sobre producao. Pendentes.
