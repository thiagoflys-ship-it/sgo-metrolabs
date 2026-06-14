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
provisionarAmbienteFinanceiroV2_AUTORIZADO
```

**Payload obrigatorio:**
```javascript
{
  executar: true,
  confirmacao: "CRIAR_AMBIENTE_FINANCEIRO_SGO_2026",
  webAppUrl: ""  // deixar vazio por enquanto, preencher apos B.3.11
}
```

**Resultado esperado:**
```json
{
  "success": true,
  "executado": true,
  "planilhaCriada": true,
  "pastaCriada": true,
  "DB_FIN_ID": "<novo ID da planilha criada>",
  "FOLDER_FINANCEIRO": "<ID da nova pasta>",
  "bloqueios": []
}
```

**Anotar obrigatoriamente:**
- Novo DB_FIN_ID (ID da planilha criada)
- FOLDER_FINANCEIRO (ID da pasta criada)

**Bloqueadores:**
- Ja existe DB_FIN_ID configurado: o provisionamento vai reutilizar — confirmar se e o certo
- Mais de uma planilha com nome SGO_FIN_CARTAO_FLASH_DB no Drive: precisa remover duplicidade

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
