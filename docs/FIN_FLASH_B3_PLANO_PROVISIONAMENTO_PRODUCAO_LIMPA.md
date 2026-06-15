# FIN Flash — B.3.4–B.3.7 — Plano de Provisionamento Producao Limpa

> Nenhuma acao executada neste documento. Apenas roteiro futuro.
> Executar somente apos B.3.1 (novo scriptId) e B.3.3 (clasp push) concluidos.

---

## Pre-requisitos obrigatorios (todos devem estar OK antes de comecar)

| # | Pre-requisito | Como verificar |
|---|--------------|----------------|
| 1 | B.3.0 commitado | git log mostra commit feat(FIN): preparar producao Flash em ambiente separado |
| 2 | Novo scriptId criado manualmente | Anotado e informado ao Claude |
| 3 | .clasp-prod.json configurado localmente | Arquivo existe com scriptId correto |
| 4 | clasp push executado para o novo projeto | Sem erros, todos os arquivos enviados |
| 5 | OAuth autorizado no novo projeto | Executar qualquer funcao no editor e aceitar OAuth |
| 6 | Nenhuma funcao executada ainda no novo projeto | Confirmar com git log e historico |

---

## Sequencia de provisionamento (B.3.4–B.3.7)

### B.3.4 — Provisionar ambiente financeiro

**Onde:** Editor do NOVO projeto Apps Script producao

**Funcao:**
```
PROVISIONAR_AMBIENTE_FINANCEIRO_PRODUCAO_LIMPA_B34_AUTORIZADO
```

**Observacao B.3.4C:** nao usar `provisionarAmbienteFinanceiroV2_MANUAL_AUTORIZADO`.
Ela reutilizou o DB_FIN DEV/homologacao por nome no Drive. A funcao nova cria DB_FIN
com nome de producao e bloqueia o ID DEV conhecido.

**Resultado esperado:**
```json
{
  "success": true,
  "ok": true,
  "executado": true,
  "planilhaCriada": true,
  "planilhaReutilizada": false,
  "pastaCriada": true,
  "DB_FIN_ID": "<novo ID da planilha criada>",
  "DB_FIN_URL": "<URL da nova planilha>",
  "FOLDER_FINANCEIRO": "<ID da nova pasta>",
  "dbFinIdDiferenteDev": true,
  "bloqueios": []
}
```

**Anotar obrigatoriamente:**
- Novo DB_FIN_ID (ID da planilha criada)
- DB_FIN_URL
- FOLDER_FINANCEIRO (ID da pasta criada)
- Confirmar que DB_FIN_ID != 1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0

**Bloqueadores:**
- DB_FIN_ID retornado igual ao ID DEV/homologacao conhecido
- dbFinIdDiferenteDev false
- Funcao antiga `provisionarAmbienteFinanceiroV2_MANUAL_AUTORIZADO` executada por engano

---

### B.3.5 — Setup das 12 abas FIN

**Onde:** Editor do NOVO projeto Apps Script producao

**Funcao:**
```
setupFinanceiroV2
```

**Resultado esperado:**
```json
{
  "success": true,
  "abasCriadas": 12,
  "bloqueios": []
}
```

**Verificar:**
- 12 abas criadas na nova planilha
- Nenhum erro de headers
- Nenhum dado pre-existente (planilha deve estar vazia apos setup)

---

### B.3.6 — Auditoria de ambiente: confirmar base limpa

**Onde:** Editor do NOVO projeto Apps Script producao

**Funcao:**
```
AUDITAR_AMBIENTE_DB_FIN_SEM_GRAVAR
```

**Resultado esperado:**
```json
{
  "success": true,
  "ok": true,
  "executado": false,
  "nenhumaGravacao": true,
  "ambienteInferido": "BASE_LIMPA",
  "totalCartoesLidos": 0,
  "totalLotesLidos": 0,
  "totalExtratosLidos": 0,
  "deteccaoDev": {
    "testeFinCartao": false,
    "testeFinFuncionario": false,
    "usuarioTesteFlash": false,
    "simulacaoPadaria": false,
    "lotePreviewDev": false,
    "hashLogicoDev": false
  },
  "bloqueios": []
}
```

**PARAR se:**
- `ambienteInferido` != `BASE_LIMPA`
- Qualquer `deteccaoDev.*` = `true`
- `bloqueios` nao vazio
- `totalLotesLidos` > 0 ou `totalExtratosLidos` > 0

---

### B.3.7 — Baseline real de producao

**Onde:** Editor do NOVO projeto Apps Script producao

**Funcao:**
```
TESTE_FLASH_CONTAGEM_SEM_GRAVAR
```

**Resultado esperado:**
```json
{
  "success": true,
  "ok": true,
  "executado": false,
  "nenhumaGravacao": true,
  "totalLotesLidos": 0,
  "totalExtratosLidos": 0,
  "bloqueios": []
}
```

**Anotar obrigatoriamente:**
```
W.1 BASELINE PRODUCAO REAL
Data/hora: ___________
Responsavel: ___________
totalLotesLidos: 0
totalExtratosLidos: 0
Resultado: OK
```

---

## Bloqueadores gerais

| Situacao | Acao |
|----------|------|
| ambienteInferido = BASE_TESTE_DEV | PARAR — base errada, investigar |
| totalLotesLidos > 0 antes de importacao | PARAR — baseline invalido |
| Erro de permissao ao abrir planilha | Verificar OAuth do novo projeto |
| Aba FIN_CARTOES nao encontrada | Rodar setupFinanceiroV2 primeiro |
| DB_FIN_ID nao configurado | Rodar provisionarAmbienteFinanceiroV2_AUTORIZADO |
| DB_FIN_ID aponta para base homologacao | Alerta de aviso (nao bloqueio) — confirmar novo ID |

---

## Criterio de liberacao para B.3.8 (XLSX real)

Todos os itens abaixo devem ser true:

- [ ] ambienteInferido = BASE_LIMPA (B.3.6)
- [ ] totalCartoesLidos >= 1 (Rafael/908 cadastrado — B.3.8)
- [ ] totalLotesLidos = 0 (B.3.7)
- [ ] totalExtratosLidos = 0 (B.3.7)
- [ ] nenhuma deteccaoDev.* = true
- [ ] bloqueios = []
- [ ] Baseline registrado por escrito
