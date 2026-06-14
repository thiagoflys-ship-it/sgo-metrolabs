# FIN Flash — Pacote W — Roteiro de Execucao em Producao (controlado)

> **ATENCAO:** Este documento e um roteiro operacional.
> Nenhuma acao de producao deve ser executada sem nova sessao, arquivo real,
> nova autorizacao explicita e verificacao de todos os pre-requisitos.
> O payload DEV nunca pode ser reutilizado.

---

## Restricao critica: o que NAO pode ser reutilizado do DEV

| Campo DEV (simulado) | Motivo |
|---------------------|--------|
| `loteId: LOTE-FLASH-PREVIEW-34ABC763` | Gerado para teste, invalido em producao |
| `arquivoHash: LOGICO-971C06CE` | Hash de dados simulados, nao de arquivo real |
| `totalLancamentos: 4` | Numero de lancamentos simulados |
| `somaDebitos: -57.34` | Soma de debitos simulados |
| `somaCreditos: 1000.00` | Credito simulado |
| `cartaoFinal: 777` | Cartao simulado |
| `pessoa: USUARIO TESTE FLASH` | Portador simulado |
| `periodo: 2026-06-11` | Data simulada |
| Lancamentos individuais (padaria, estacionamento, servico) | Fabricados para teste |

---

## Pre-requisitos — todos devem ser verificados antes de qualquer acao

| # | Pre-requisito | Como verificar |
|---|--------------|----------------|
| 1 | Arquivo XLSX Flash real obtido da operadora | Arquivo disponivel localmente |
| 2 | Periodo identificado (mes/ano de competencia) | Conferir cabecalho do arquivo |
| 3 | Cartao e portador corretos identificados | Conferir no arquivo, bater com DB_FIN producao |
| 4 | Baseline de producao contado e salvo | Rodar TESTE_FLASH_CONTAGEM_SEM_GRAVAR em producao |
| 5 | Print/backup das abas FIN_LOTES_EXTRATO_FLASH e FIN_CARTOES_EXTRATOS em producao | Exportar abas antes |
| 6 | Headers das abas em producao conferem com /dev | Rodar auditarSchemaRealLoteExtratoFlashV1_SEM_GRAVAR |
| 7 | Deploy de producao autorizado e executado | clasp deploy (nova autorizacao) |
| 8 | Responsavel de producao definido | Confirmar nome antes da sessao |
| 9 | Janela de execucao definida (horario com baixo uso) | Definir antes |
| 10 | Plano de rollback documentado | Este documento + procedimento manual |
| 11 | Autorizacao explicita registrada (nova sessao, nao DEV) | Confirmacao escrita |

---

## Sequencia SEM_GRAVAR (tudo antes de executar qualquer acao real)

```
ETAPA W.1 — Contagem baseline antes
  funcao: TESTE_FLASH_CONTAGEM_SEM_GRAVAR() no editor /prod
  esperado: N lotes / M extratos (salvar esse numero antes de qualquer acao)

ETAPA W.2 — Preview do arquivo real
  funcao: finPreviewExtratoFlashXlsxV1(payloadComXlsxReal) via UI ou script
  conferir:
    - cartao e portador corretos
    - periodo correto
    - total de lancamentos
    - soma de debitos
    - soma de creditos (se houver)
    - nenhuma linha vazia ou invalida
    - encoding correto

ETAPA W.3 — Dry-run do arquivo real
  funcao: finDryRunLoteExtratoFlashV1(payloadComXlsxReal)
  conferir:
    - hash calculado (anotar para comparar)
    - loteId proposto (nunca reutilizar DEV)
    - totalLancamentos
    - somaDebitos
    - somaCreditos
    - duplicidades: zero
    - bloqueios: []
    - avisos: revisar e aceitar ou bloquear

ETAPA W.4 — Pre-confirmacao
  funcao: finPreConfirmarLoteExtratoFlashV1(payload)
  conferir:
    - checklist de pre-confirmacao todo ok
    - nenhum bloqueio
    - lote proposto nao duplica lote existente

ETAPA W.5 — Preparacao de payload com decisoes operacionais
  funcao: finPrepararPayloadImportacaoFlashV1(payload) com decisoes:
    - depositosRecargas: IMPORTAR_CREDITO_COMO_EXTRATO (ou redefinir)
    - prestacaoPendente: IMPORTAR_COM_STATUS_PENDENTE (ou redefinir)
    - categoriaNaoInferida: IMPORTAR_COM_CATEGORIA_OUTROS (ou redefinir)
  conferir:
    - payload preparado sem bloqueios
    - lote + extratos montados corretamente
    - pendencias operacionais identificadas

ETAPA W.6 — Geracao de pacote de autorizacao
  funcao: gerarPacoteAutorizacaoImportacaoFlashV1_SEM_GRAVAR()
  conferir:
    - fraseObrigatoria presente
    - hash bate com dry-run
    - totais batem com arquivo

ETAPA W.7 — Auditoria final antes
  funcao: auditarFinalAntesImportacaoRealFlashDevV1_SEM_GRAVAR()
  conferir:
    - prontoParaExecucaoManualDev: true (ou equivalente para prod)
    - bloqueios: []
    - uiChamaImportacaoReal: false

ETAPA W.8 — Checklist GO/NO-GO (manual, humano)
  Ver secao GO/NO-GO abaixo.
  Se GO: prosseguir para W.9.
  Se NO-GO: parar e investigar.
```

---

## Sequencia real (apenas com GO confirmado em W.8)

```
ETAPA W.9 — Criar funcao de execucao real de producao
  Claude cria em nova sessao:
  EXECUTAR_IMPORTACAO_FLASH_PRODUCAO_AUTORIZADA_MANUALMENTE()
  - equivalente ao Pacote T, mas para producao
  - payload real com arquivo real
  - novo loteId, novo hash, totais reais
  - sem dados hardcoded DEV
  - validacoes identicas ao Pacote T

ETAPA W.10 — Criar funcao de auditoria pos-producao
  Claude cria em nova sessao:
  AUDITAR_POS_IMPORTACAO_FLASH_PRODUCAO_SEM_GRAVAR()
  - equivalente ao Pacote U.1, mas para producao
  - verifica N+1 lotes / M+K extratos

ETAPA W.11 — clasp push (autorizado separadamente)

ETAPA W.12 — clasp deploy para producao (autorizado separadamente)

ETAPA W.13 — Execucao manual no editor Apps Script /prod
  funcao: EXECUTAR_IMPORTACAO_FLASH_PRODUCAO_AUTORIZADA_MANUALMENTE()
  - nao executar por terminal
  - nao executar pelo Claude
  - nao executar em /dev (ja foi)

ETAPA W.14 — Auditoria pos-producao
  funcao: AUDITAR_POS_IMPORTACAO_FLASH_PRODUCAO_SEM_GRAVAR()
  esperado: N+1 lotes / M+K extratos, bloqueios:[]

ETAPA W.15 — Validacao visual producao
  Equivalente ao Pacote V, mas em producao.
  Confirmar:
    - lote real aparece
    - extratos reais aparecem
    - valores corretos
    - nenhum dado de teste misturado

ETAPA W.16 — Documentacao e commit
  git add (somente funcoes reais e docs)
  git commit -m "feat(FIN): importar extrato Flash real em producao"
  git push

ETAPA W.17 — Monitoramento
  Primeiros dias: verificar dashboard, pendencias e conciliacao
  Registrar qualquer anomalia imediatamente
```

---

## Matriz GO/NO-GO producao

### GO — todos os itens devem ser verdadeiros

- [ ] `bloqueios: []` em todos os passos W.1–W.7
- [ ] Hash do arquivo calculado e anotado
- [ ] Nenhum lote duplicado (lote novo nao existe em producao)
- [ ] Total de lancamentos confere com arquivo
- [ ] Soma de debitos confere com arquivo
- [ ] Soma de creditos confere (ou zero)
- [ ] Cartao e portador corretos
- [ ] Periodo correto
- [ ] Headers das abas producao conferem
- [ ] Baseline de producao salvo antes
- [ ] Deploy de producao autorizado e executado
- [ ] Responsavel confirmado
- [ ] Janela de execucao definida
- [ ] Autorizacao registrada em sessao separada
- [ ] UI nao expoe botao de importacao real

### NO-GO — qualquer um destes para tudo

- [ ] Arquivo XLSX errado ou de periodo diferente
- [ ] Hash divergente do calculado no dry-run
- [ ] Lote ja existe em producao (duplicidade)
- [ ] Headers das abas divergentes entre /dev e producao
- [ ] Total ou soma divergente
- [ ] Portador ou cartao errado
- [ ] Bloqueios em qualquer etapa W.1–W.7
- [ ] UI expondo botao de importacao real
- [ ] Deploy de producao sem autorizacao
- [ ] Baseline instavel (producao em uso intenso)
- [ ] Qualquer erro de permissao no Apps Script producao

---

## Rollback logico de producao

A funcao de importacao usa `setValues` — nao ha rollback automatico.

**Procedimento se algo der errado apos importar em producao:**

1. Nao apagar dados imediatamente — registrar o problema com timestamp.
2. Identificar o `LOTE_ID` do lote incorreto.
3. Abrir a aba `FIN_LOTES_EXTRATO_FLASH` em producao.
4. Se houver coluna `STATUS`: marcar lote como `CANCELADO` manualmente.
5. Abrir a aba `FIN_CARTOES_EXTRATOS` em producao.
6. Se houver coluna `STATUS`: marcar extratos do lote como `CANCELADO` manualmente.
7. Registrar incidente com: timestamp, responsavel, motivo, acoes tomadas.
8. Nao apagar linhas sem backup completo confirmado.
9. Nunca usar `clear()`, `delete` ou `remove` sem backup.
10. Criar commit de documentacao do incidente antes de qualquer acao corretiva.
11. Comunicar equipe sobre o incidente.

---

## Relatorio final esperado de producao

Ao final do Pacote W, registrar:

```json
{
  "ambiente": "PRODUCAO",
  "responsavel": "...",
  "timestampExecucao": "...",
  "loteId": "...",
  "arquivoHash": "...",
  "totalLancamentosGravados": N,
  "somaDebitos": -X.XX,
  "somaCreditos": Y.YY,
  "baselines": {
    "antes": { "lotes": N, "extratos": M },
    "depois": { "lotes": N+1, "extratos": M+K }
  },
  "validacaoPos": {
    "ok": true,
    "prontoParaFechamentoProd": true,
    "bloqueios": []
  },
  "evidencias": ["print_tela_prod.png", "log_pacote_w.json"]
}
```
