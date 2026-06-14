# FIN Flash — Pacote W — Plano de Producao (modo planejamento)

> **ATENCAO:** Este documento e apenas um plano. Nenhuma acao de producao deve ser executada
> sem nova sessao, novo payload real, nova autorizacao explicita e verificacao de todos os
> pre-requisitos abaixo. O payload DEV nao pode ser reutilizado.

---

## A. Pre-requisitos para producao

Todos os itens abaixo devem estar verificados antes de qualquer acao em producao:

| # | Pre-requisito | Status atual |
|---|---------------|-------------|
| 1 | /dev aprovado visualmente (Pacote V) | Pendente |
| 2 | Arquivo Flash real identificado (XLSX real, nao simulado) | Pendente |
| 3 | Hash real calculado pelo sistema a partir do XLSX real | Pendente |
| 4 | Baseline de producao contado e documentado | Pendente |
| 5 | Print/backup das abas FIN_LOTES_EXTRATO_FLASH e FIN_CARTOES_EXTRATOS em producao | Pendente |
| 6 | Responsavel de producao definido (pode ser diferente do responsavel /dev) | Pendente |
| 7 | Janela de execucao definida (horario, dia, ambiente seguro) | Pendente |
| 8 | Autorizacao de producao explicita, em sessao separada, diferente da autorizacao DEV | Pendente |
| 9 | Deploy de producao autorizado separadamente | Pendente |
| 10 | Conciliacao posterior planejada (o que fazer apos importar o lote real) | Pendente |

---

## B. Dados que NAO podem ser reutilizados de DEV

Os dados usados no /dev sao dados de TESTE SIMULADO. Nunca reutilizar em producao:

| Campo DEV (simulado) | Por que nao reutilizar |
|---------------------|----------------------|
| `loteId: LOTE-FLASH-PREVIEW-34ABC763` | ID gerado para teste, nao e de arquivo real |
| `arquivoHash: LOGICO-971C06CE` | Hash calculado sobre dados simulados |
| `fraseAutorizacao: AUTORIZO IMPORTACAO REAL FLASH` | Pode ser a mesma frase, mas deve ser gerada em novo payload de producao |
| `usuarioResponsavel: Thiago Gonzales` | Confirmar quem sera o responsavel em producao |
| `cartao final 777` | Numero de cartao simulado |
| `pessoa: USUARIO TESTE FLASH` | Portador simulado |
| `totalLancamentos: 4` | Numero de lancamentos do arquivo simulado |
| `somaDebitos: -57.34` | Soma dos debitos simulados |
| `somaCreditos: 1000.00` | Credito simulado |
| `periodo: 2026-06-11` | Data simulada |
| `extratos simulados (padaria, estacionamento, servico)` | Lancamentos fabricados para teste |

### O que producao exige (novo payload a ser gerado)

- Arquivo Flash real (XLSX do banco/operadora, periodo real)
- Hash real: gerado automaticamente por `finExtratoFlashHashLogico_` sobre os dados reais
- LoteId real: gerado automaticamente no payload
- Total de lancamentos reais
- Soma de debitos reais
- Soma de creditos reais (se houver)
- Periodo real (data dos lancamentos)
- Responsavel de producao confirmado
- Cartao e portador reais
- Baseline de producao antes (N lotes, M extratos)

---

## C. Funcoes seguras para uso em producao

### Seguras para rodar antes da importacao real (SEM_GRAVAR)

| Funcao | Arquivo | Linha | Proposito |
|--------|---------|-------|-----------|
| `finPreviewExtratoFlashXlsxV1` | SGO_Fin_Extratos.js | 13 | Preview do arquivo real |
| `finDryRunLoteExtratoFlashV1` | SGO_Fin_Extratos.js | 245 | Dry-run do lote real |
| `finPreConfirmarLoteExtratoFlashV1` | SGO_Fin_Extratos.js | 311 | Pre-confirmacao |
| `finPrepararPayloadImportacaoFlashV1` | SGO_Fin_Extratos.js | 383 | Preparar payload |
| `auditarContagemExtratoFlashV1_SEM_GRAVAR` | SGO_Fin_Extratos.js | 201 | Baseline antes |
| `auditarModuloFlashCompletoV1_SEM_GRAVAR` | SGO_Fin_Extratos.js | 699 | Auditoria completa |
| `auditarFinalAntesImportacaoRealFlashDevV1_SEM_GRAVAR` | SGO_Fin_Extratos.js | 3725 | Auditoria final pre-real |
| `gerarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR` | SGO_Fin_Extratos.js | 3472 | Gerar payload (nome sugere /dev, mas logica e reutilizavel) |
| `auditarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR` | SGO_Fin_Extratos.js | 3558 | Validar payload |
| `AUDITAR_POS_IMPORTACAO_FLASH_DEV_PACOTE_U_SEM_GRAVAR` | SGO_Fin_Extratos.js | 4160 | Auditoria pos (nome /dev, mas logica e reutilizavel) |

### Funcao real de importacao (apenas com autorizacao e payload real)

| Funcao | Arquivo | Linha | Observacao |
|--------|---------|-------|-----------|
| `finImportarLoteExtratoFlashV1` | SGO_Fin_Extratos.js | 491 | Unica funcao que grava. Nao chamar diretamente. |

### Funcao de execucao controlada (apenas em /dev, nao reutilizar em producao como esta)

| Funcao | Arquivo | Linha | Observacao |
|--------|---------|-------|-----------|
| `EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE` | SGO_Fin_Extratos.js | 3987 | Hardcoded para /dev. Producao precisa de versao equivalente com payload real. |

### Funcoes bloqueadas (nunca chamar)

| Funcao | Arquivo | Linha | Observacao |
|--------|---------|-------|-----------|
| `finImportarLoteExtratoFlashV1_BLOQUEADA` | SGO_Fin_Extratos.js | 461 | Stub, retorna false |
| `finConfirmarLoteExtratoFlashV1_BLOQUEADA` | SGO_Fin_Extratos.js | 361 | Stub, retorna false |

---

## D. Sequencia proposta para producao (10 etapas)

```
1. [SEM_GRAVAR] TESTE_FLASH_CONTAGEM_SEM_GRAVAR()
   — Registrar baseline de producao (N lotes / M extratos)

2. [SEM_GRAVAR] finPreviewExtratoFlashXlsxV1(payloadComArquivoReal)
   — Preview do XLSX real: conferir cartao, portador, periodo, lancamentos

3. [SEM_GRAVAR] finDryRunLoteExtratoFlashV1(payloadComArquivoReal)
   — Dry-run: hash, totais, duplicidades, decisoes operacionais

4. [SEM_GRAVAR] finPreConfirmarLoteExtratoFlashV1(payloadComArquivoReal)
   — Pre-confirmacao: verificar se lote proposto esta apto

5. [SEM_GRAVAR] finPrepararPayloadImportacaoFlashV1(payloadComArquivoReal)
   — Preparar payload final: lote + extratos + pendencias + decisoes

6. [HUMANO] Revisao manual do payload preparado
   — Conferir: loteId, hash, totalLancamentos, somaDebitos, somaCreditos,
     periodo, portador, cartao, decisoes operacionais, frase de autorizacao

7. [SEM_GRAVAR] auditarFinalAntesImportacaoRealFlashDevV1_SEM_GRAVAR()
   — Auditoria final antes: confirmar que tudo esta pronto

8. [REAL — com autorizacao] EXECUTAR_IMPORTACAO_FLASH_PRODUCAO_AUTORIZADA_MANUALMENTE()
   — Funcao equivalente ao Pacote T, mas para producao e com payload real
   — CRIAR EM SESSAO SEPARADA com nova autorizacao
   — Bloquear se baseline nao for o esperado
   — Bloquear se payload nao bater com arquivo real

9. [SEM_GRAVAR] AUDITAR_POS_IMPORTACAO_FLASH_PRODUCAO_SEM_GRAVAR()
   — Equivalente ao Pacote U, mas para producao
   — Confirmar N+1 lotes / M+K extratos

10. [VISUAL] Validacao no WebApp producao
    — Ver extratos importados, status, pendencias geradas
    — Registrar evidencias (prints, logs)
```

---

## E. Matriz GO/NO-GO producao

### GO — todos os itens devem ser true

- [ ] Sem bloqueios no payload preparado
- [ ] Hash confere com arquivo real
- [ ] Baseline de producao salvo antes
- [ ] Total de lancamentos confere com arquivo
- [ ] Soma de debitos confere com arquivo
- [ ] Soma de creditos confere (ou zero)
- [ ] Portador e cartao corretos
- [ ] Periodo correto
- [ ] Responsavel confirmado
- [ ] Duplicidade zero (lote ainda nao existe)
- [ ] UI nao expoe botao de importacao real
- [ ] Janela de execucao definida e segura
- [ ] Autorizacao registrada

### NO-GO — qualquer um desses bloqueia

- [ ] Duplicidade detectada (lote ja existe)
- [ ] Hash divergente do arquivo real
- [ ] Soma divergente
- [ ] Portador ou cartao errado
- [ ] Baseline instavel (producao em uso)
- [ ] Periodo errado
- [ ] Frase de autorizacao incorreta
- [ ] Qualquer bloqueio no payload
- [ ] Header da aba divergente
- [ ] Erro de permissao no Apps Script
- [ ] UI expondo botao de importacao real
- [ ] Producao recebeu deploy sem autorizacao

---

## F. Rollback logico (nao automatico)

A funcao `finImportarLoteExtratoFlashV1` usa `setValues` — nao ha rollback automatico.

Procedimento de reversao se algo der errado apos importar em producao:

1. **Nao apagar dados** — registrar o problema primeiro.
2. Identificar o `LOTE_ID` do lote incorreto.
3. Se houver coluna `STATUS` na aba `FIN_LOTES_EXTRATO_FLASH`: marcar como `CANCELADO` ou `INATIVO` manualmente.
4. Se houver coluna `STATUS` na aba `FIN_CARTOES_EXTRATOS`: marcar os extratos do lote como `CANCELADO` manualmente.
5. Registrar o incidente com timestamp, responsavel, motivo.
6. Nao apagar as linhas sem backup completo da aba.
7. Criar commit de documentacao do incidente antes de qualquer acao corretiva.
8. Nunca usar `clear()` ou `delete` sem backup confirmado.

---

## G. Riscos identificados

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Duplicacao de lote (mesmo arquivo importado duas vezes) | Media | Alto | Verificar duplicidade no dry-run e no payload |
| Arquivo errado (periodo errado, pessoa errada) | Baixa | Alto | Conferir preview antes de qualquer acao |
| Hash errado (arquivo modificado apos preview) | Baixa | Alto | Nunca reutilizar payload antigo |
| Extrato com creditos nao esperados | Baixa | Medio | Decisao operacional IMPORTAR_CREDITO_COMO_EXTRATO ja definida |
| Categorias nao inferidas | Alta | Baixo | Decisao IMPORTAR_COM_CATEGORIA_OUTROS ja definida |
| Prestacoes pendentes | Media | Medio | Decisao IMPORTAR_COM_STATUS_PENDENTE ja definida |
| Conciliacao posterior nao planejada | Alta | Medio | Planejar conciliacao antes de importar |
| Permissao Apps Script negada | Baixa | Bloqueante | Testar permissoes em /dev antes |
| Usuario errado executando | Baixa | Alto | Confirmar responsavel antes |
| Baseline instavel (outro import simultaneo) | Muito baixa | Alto | LockService ativo na funcao real |

---

## H. Pendencias de codigo antes de producao

| Item | Descricao | Prioridade |
|------|-----------|-----------|
| 1 | Criar `EXECUTAR_IMPORTACAO_FLASH_PRODUCAO_AUTORIZADA_MANUALMENTE()` | Alta |
| 2 | Criar `AUDITAR_POS_IMPORTACAO_FLASH_PRODUCAO_SEM_GRAVAR()` | Alta |
| 3 | Renomear/adaptar funcoes que tem "DEV" no nome mas sao usadas em producao | Media |
| 4 | Verificar que as abas de producao tem os mesmos headers que /dev | Alta |
| 5 | Confirmar que deploy de producao foi autorizado | Alta |
| 6 | Confirmar que conciliacao pos-importacao esta planejada | Media |
