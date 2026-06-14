# FIN Flash — Pacote W.1 — Baseline Producao SEM_GRAVAR

> ETAPA W.1 — Executar antes de qualquer outra acao do Pacote W.
> Nao executar em /dev. Somente em /prod, no editor do Apps Script producao.
> Nao grava nada. Somente leitura.

---

## Objetivo

Registrar o estado atual do banco de producao ANTES de qualquer importacao real.
Este numero e o ponto de referencia para verificar que a importacao funcionou corretamente.

**Se W.1 nao for executado e registrado, W.13 fica bloqueado.**

---

## Funcao a executar no editor Apps Script /prod

```
TESTE_FLASH_CONTAGEM_SEM_GRAVAR()
```

**Onde executar:** Apps Script editor → selecionar `/prod` → selecionar funcao `TESTE_FLASH_CONTAGEM_SEM_GRAVAR` → Executar.

**Nao executar pelo terminal.**
**Nao executar via Claude.**
**Nao executar em /dev (ja tem 2 lotes / 7 extratos de teste).**

---

## O que copiar e salvar do log

Apos a execucao, copiar o log completo e salvar. Campos obrigatorios:

```json
{
  "totalLotesLidos": <N>,
  "totalExtratosLidos": <M>,
  "success": true,
  "ok": true,
  "nenhumaGravacao": true,
  "bloqueios": []
}
```

| Campo | O que verificar |
|-------|----------------|
| `success` | Deve ser `true` |
| `ok` | Deve ser `true` |
| `nenhumaGravacao` | Deve ser `true` |
| `totalLotesLidos` | Anotar valor — este e N (lotes antes) |
| `totalExtratosLidos` | Anotar valor — este e M (extratos antes) |
| `bloqueios` | Deve ser `[]` — se nao vazio, parar |

---

## Como calcular o esperado depois (apos W.13)

Apos a importacao real (W.13), rodar `AUDITAR_POS_IMPORTACAO_FLASH_PRODUCAO_SEM_GRAVAR()`.
O resultado deve mostrar:

```
lotesDepois    = N + 1
extratosDepois = M + 49
```

O `+ 49` vem do total de lancamentos do XLSX real (extrato-do-colaborador-2026-05-10-ate-2026-06-10.xlsx).

---

## Bloqueadores — parar se qualquer um ocorrer

| Bloqueador | O que fazer |
|-----------|-------------|
| Funcao nao encontrada em /prod | clasp deploy ainda nao executado — parar, executar deploy primeiro |
| Erro de permissao | Verificar permissoes do Apps Script em /prod |
| `success: false` ou `ok: false` | Investigar antes de continuar |
| `bloqueios: [...]` nao vazio | Resolver bloqueio antes de qualquer acao |
| `totalLotesLidos` nao e numero | Banco /prod pode estar vazio ou com problema de schema |
| `totalExtratosLidos` nao e numero | Idem |
| `nenhumaGravacao` nao e `true` | Nao deveria acontecer — parar e investigar |

---

## Evidencia obrigatoria

| Item | Obrigatorio? |
|------|-------------|
| Log completo copiado | SIM |
| `totalLotesLidos` anotado | SIM |
| `totalExtratosLidos` anotado | SIM |
| Horario da execucao | SIM |
| Nome do responsavel | SIM |
| Print da tela (recomendado) | RECOMENDADO |

Nao prosseguir para W.2 sem registrar estes dados.

---

## Contrato da funcao

`TESTE_FLASH_CONTAGEM_SEM_GRAVAR()` retorna:

```
nenhumaGravacao: true   — confirmando que nao gravou nada
gravacaoReal: false      — alias aceito pelo contrato (Pacote U.1 fix)
```

O contrato aceita QUALQUER UM dos dois campos para confirmar seguranca.
Qualquer outro comportamento e anomalia — relatar antes de continuar.

---

## Sequencia antes de W.1

Antes de executar W.1, confirmar:

- [ ] Deploy de producao autorizado e executado (clasp deploy /prod)
- [ ] Responsavel identificado
- [ ] Janela de execucao definida (horario de baixo uso)
- [ ] Rafael FAY MARQUES / final 908 confirmado em FIN_CARTOES producao
- [ ] Nenhuma outra importacao em andamento no banco

---

## Apos W.1 OK

Registrar:

```
W.1 BASELINE PRODUCAO
Data/hora: ___________
Responsavel: ___________
totalLotesLidos: ___________
totalExtratosLidos: ___________
Resultado: OK / BLOQUEADO
```

E so entao autorizar W.2 (preview do XLSX real).
