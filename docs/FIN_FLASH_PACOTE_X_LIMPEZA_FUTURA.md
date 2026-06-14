# FIN Flash — Pacote X — Plano de Limpeza Futura

> **ATENCAO:** Nenhuma funcao deve ser removida nesta fase.
> Este documento e apenas planejamento. Execucao requer sessao separada e autorizacao explicita.

---

## Regra geral

Antes de remover qualquer funcao:
1. Confirmar que nenhuma outra funcao a chama.
2. Confirmar que a producao ja foi validada sem ela.
3. Criar commit de documentacao antes de qualquer remocao.
4. Nunca remover em lote — sempre funcao a funcao, com commit separado.
5. Nunca remover auditorias uteis antes do primeiro ciclo real completo.

---

## Classificacao das funcoes temporarias

### Grupo A — Funcoes de pacote de teste (temporarias, manter ate producao aprovada)

| Funcao | Linha | Por que temporaria | Quando pode remover |
|--------|-------|--------------------|-------------------|
| `SETUP_PACOTE_S_FLASH_PRE_REAL_SEM_GRAVAR` | 3814 | Orquestrador das 3 auditorias pre-real. Util para dev, nao necessaria em prod. | Apos producao aprovada |
| `SETUP_PACOTE_S_TEMPLATE_COMPACTO_SEM_GRAVAR` | 3961 | Extrator compacto do template. Util para debug do template. | Apos producao aprovada |
| `SETUP_PACOTE_S_TEMPLATE_CHUNKS_SEM_GRAVAR` | 4112 | Extrator do template em chunks. Criado para contornar truncamento do Logger. | Apos producao aprovada |
| `AUDITAR_PAYLOAD_FLASH_DEV_ATUAL_SEM_GRAVAR` | 3461 | Auditoria do payload inline DEV. Nome contem DEV. | Apos producao aprovada |
| `gerarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR` | 3472 | Gera payload com dados inline DEV. | Apos producao aprovada / refatorar para suportar payload real |
| `gerarTemplateExecucaoRealFlashDevV1_SEM_GRAVAR` | 3646 | Gera string do codigo do Pacote T. Util para inspecao. | Apos producao aprovada |
| `EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE` | 3987 | Funcao real DEV com dados hardcoded de teste. NAO usar em producao. | Substituir por versao PRODUCAO, manter DEV por historico |
| `AUDITAR_POS_IMPORTACAO_FLASH_DEV_PACOTE_U_SEM_GRAVAR` | 4160 | Auditoria pos-importacao DEV. Nome contem DEV. | Refatorar ou criar equivalente PRODUCAO |

### Grupo B — Funcoes de auditoria permanente (manter indefinidamente)

| Funcao | Linha | Por que manter |
|--------|-------|---------------|
| `TESTE_FLASH_CONTAGEM_SEM_GRAVAR` | 241 | Alias de auditoria de baseline. Util em qualquer fase. |
| `auditarContagemExtratoFlashV1_SEM_GRAVAR` | 201 | Contagem real do banco. Util permanentemente. |
| `auditarModuloFlashCompletoV1_SEM_GRAVAR` | 699 | Auditoria modular completa. Util para monitoramento. |
| `gerarChecklistLiberacaoFlashV1_SEM_GRAVAR` | 795 | Checklist de liberacao. Util para qualquer ciclo. |
| `gerarChecklistPosImportacaoFlashV1_SEM_GRAVAR` | 1292 | Checklist pos-importacao. Util para qualquer ciclo. |
| `auditarProntidaoImportacaoFlashV1_SEM_GRAVAR` | 644 | Auditoria de prontidao. Util antes de qualquer real. |
| `auditarPreProducaoFlashV1_SEM_GRAVAR` | 1049 | Auditoria pre-producao. Util em producao tambem. |
| `auditarProntoParaImportacaoRealDevFlashV1_SEM_GRAVAR` | 1327 | Consolida prontidao. Util como quick-check. |
| `auditarFinalAntesImportacaoRealFlashDevV1_SEM_GRAVAR` | 3725 | Auditoria final pre-real. Manter mesmo em producao. |
| `simularImportacaoRealFlashV1_SEM_GRAVAR` | 584 | Simulacao completa sem gravar. Util para treino. |
| `finDryRunLoteExtratoFlashV1` | 245 | Dry-run essencial do fluxo. Manter permanentemente. |
| `finPreviewExtratoFlashXlsxV1` | 13 | Preview do XLSX. Parte do fluxo normal da UI. |
| `finPreConfirmarLoteExtratoFlashV1` | 311 | Pre-confirmacao. Parte do fluxo normal. |
| `finPrepararPayloadImportacaoFlashV1` | 383 | Preparacao de payload. Central no fluxo. |

### Grupo C — Funcoes bloqueadas/stubs (manter como travas de seguranca)

| Funcao | Linha | Descricao | Quando remover |
|--------|-------|-----------|---------------|
| `finImportarLoteExtratoFlashV1_BLOQUEADA` | 461 | Stub retorna false. Trava de seguranca. | Nunca — ou refatorar para deprecated |
| `finConfirmarLoteExtratoFlashV1_BLOQUEADA` | 361 | Stub retorna false. Trava de seguranca. | Nunca — ou refatorar para deprecated |

### Grupo D — Funcao real (proteger, nao expor, manter sob controle)

| Funcao | Linha | Observacao |
|--------|-------|-----------|
| `finImportarLoteExtratoFlashV1` | 491 | Unica funcao que grava. Nunca chamar da UI. Chamar apenas por EXECUTAR_* autorizado. |

---

## Plano de fases de limpeza

### Fase X.1 — Apenas documentacao (agora)

- Documentar o estado atual de cada funcao (este arquivo).
- Nenhuma alteracao de codigo.
- Nenhuma remocao.

### Fase X.2 — Renomear/marcar funcoes DEV (apos producao aprovada)

- Renomear `EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE` para
  `EXECUTAR_IMPORTACAO_FLASH_DEV_HISTORICO_V1` (manter como historico).
- Criar `EXECUTAR_IMPORTACAO_FLASH_PRODUCAO_AUTORIZADA_MANUALMENTE` como funcao de producao.
- Adicionar comentario claro em cada funcao do Grupo A indicando que e temporaria.

### Fase X.3 — Remover funcoes de setup/teste (apos ciclo completo producao)

Candidatas para remocao apos producao estavel:
- `SETUP_PACOTE_S_FLASH_PRE_REAL_SEM_GRAVAR`
- `SETUP_PACOTE_S_TEMPLATE_COMPACTO_SEM_GRAVAR`
- `SETUP_PACOTE_S_TEMPLATE_CHUNKS_SEM_GRAVAR`
- `gerarTemplateExecucaoRealFlashDevV1_SEM_GRAVAR` (se template nao for mais necessario)

### Fase X.4 — Compactar documentacao (apos producao + primeiro ciclo completo)

- Consolidar docs de pacotes em um unico `FIN_FLASH_REFERENCIA.md`.
- Arquivar `FIN_FLASH_PACOTE_T_U_PROCEDIMENTO_DEV.md` (ja historico).
- Manter `FIN_FLASH_PACOTE_W_PLANO_PRODUCAO.md` como referencia viva.

### Fase X.5 — Auditoria final de limpeza

- Verificar que nenhuma funcao temporaria esta sendo chamada por producao.
- Verificar que `finImportarLoteExtratoFlashV1` ainda nao esta exposta na UI.
- Verificar contagem de funcoes antes vs depois.
- Criar commit com mensagem `chore(FIN): limpeza pos-producao Flash`.

---

## Regras de seguranca para todas as fases

1. Nunca remover uma funcao sem verificar `grep -rn "nomeDaFuncao"` primeiro.
2. Nunca remover em lote — sempre uma por vez, com commit separado.
3. Nunca remover antes de producao aprovada.
4. Nunca remover auditoria `_SEM_GRAVAR` que ainda seja util como monitor.
5. Sempre rodar `node --check` apos qualquer remocao.
6. Sempre rodar `git diff --stat` antes de commitar limpeza.
