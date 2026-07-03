# FIN_FLASH_V2.12.1 — Hotfix Crítico: Preview XLSX Lê Arquivo Real

**Data:** 2026-06-30  
**Ambiente:** DEV exclusivo — scriptId `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG`  
**Status:** ✅ CONCLUÍDO E VALIDADO

---

## Problema identificado

O usuário importou `extrato-do-colaborador-2026-06-08-ate-2026-06-24.xlsx` e a prévia retornou dados fictícios:

| Campo | Prévia falsa (antes) | Arquivo real (correto) |
|---|---|---|
| Total de linhas | 12 | 28 |
| Gastos | 8 | 26 |
| Recargas | 3 | 2 |
| Valor total gasto | R$ 2.340,50 | R$ 1.037,98 |
| Valor total recarregado | R$ 3.000,00 | R$ 950,00 |
| Colaboradores | 4 | 1 |
| Cartões | 6 | 2 |

**Causa raiz:** `FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV` usava valores fixos mock para XLSX/XLS. CSV usava estimativas baseadas em proporções (75% gasto, 25% recarga) em vez de ler os valores reais.

---

## Diagnóstico

| Comportamento | Tipo | Status antes |
|---|---|---|
| XLSX: `totalLinhas = 12` (hardcoded) | Mock | ❌ Removido |
| XLSX: `valorTotalGasto = 2340.50` (hardcoded) | Mock | ❌ Removido |
| XLSX: `colaboradoresEncontrados = 4` (hardcoded) | Mock | ❌ Removido |
| CSV: `totalGastos = Math.floor(total * 0.75)` | Estimativa falsa | ❌ Removido |
| CSV: `valorTotalGasto = totalGastos * 180.50` | Estimativa falsa | ❌ Removido |
| CSV: charset fallback silencioso | Fallback | ❌ Removido |
| CONFIRMAR: linhas mock hardcoded (POSTO TESTE DEV) | Mock | ❌ Removido |

---

## Correções aplicadas

### Backend — SGO_Fin_FlashV2.js

**3 novas funções helper adicionadas antes de PREVISUALIZAR:**

#### `FIN_FLASH_V2_splitCsvLinha_(linha, sep)`
Parser de linha CSV com suporte a campos entre aspas. Separador detectado por frequência na linha de cabeçalho (`,`, `;` ou `\t`).

#### `FIN_FLASH_V2_parsearLinhasExtrato_(values)`
Parser genérico para 2D array de valores (origem: CSV ou XLSX convertido).

Lógica de parsing:
- Cabeçalho na linha 0 — mapeia colunas Flash por nome (case-insensitive)
- `Valor` negativo → gasto; positivo → recarga/depósito
- `Pessoa` → nomes únicos de colaboradores
- `Pagamento`: extrai final do cartão via regex `Final \d{3,6}` ou `Conta final \d{3,6}`; exclui "Carteira Corporativa"
- `Prestação de contas` → contagem de status por valor exato
- Retorna: `{totalLinhas, totalGastos, totalRecargas, valorTotalGasto, valorTotalRecarregado, pessoasNomes[], cartoesFinais[], statusCount{}, linhasReais[], faltantes[]}`

#### `FIN_FLASH_V2_lerXlsxViaDrive_(b64, ext)`
Conversão XLSX/XLS → Google Sheets via Drive REST API:
1. `Utilities.base64Decode(b64)` → bytes
2. `Utilities.newBlob(bytes, mime)` → Blob
3. `DriveApp.createFile(blob)` → arquivo XLSX temporário no Drive
4. `UrlFetchApp.fetch(drive/v3/files/{id}/copy, {mimeType: Sheets})` → converte para Google Sheets
5. `SpreadsheetApp.openById(id)` → lê aba 1
6. `finally:` deleta arquivo XLSX temp + Sheets temp via `setTrashed(true)`

**Bloqueia se conversão falhar** (erro de Drive API, arquivo corrompido, etc.) com mensagem:
> "Não foi possível ler o arquivo real. A importação foi bloqueada para evitar dados incorretos."

**`FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV` — reescrita completa:**

| Antes | Depois |
|---|---|
| Valores fixos mock para XLSX | `FIN_FLASH_V2_lerXlsxViaDrive_()` → leitura real |
| Estimativas proporcionais para CSV | Parser completo, leitura real de colunas e valores |
| `fonteDados` ausente | `fonteDados: 'ARQUIVO_REAL'` |
| `aviso: 'Prévia DEV (AMBIENTE_TESTE=SIM)...'` | `aviso: 'Prévia calculada diretamente do arquivo enviado...'` |
| Sem `pessoasNomes`, `cartoes`, `status` | Retorna todos os campos reais |
| Sem `linhasReais` | Retorna `linhasReais[]` para uso no CONFIRMAR |

**`FIN_FLASH_V2_CONFIRMAR_IMPORTACAO_EXTRATO_FLASH_DEV` — mock removido:**

| Antes | Depois |
|---|---|
| `payload.linhas \|\| [{POSTO TESTE DEV}, {SUPERMERCADO DEV}]` | Bloqueia se `payload.linhas` vazio |
| `nr.CPF = l.cpf` (hardcoded `00000000000`) | Lookup por nome na aba CONTAS |
| `nr.CARTAO = l.cartao` (hardcoded `9999`) | Extrai via regex do campo `Pagamento` |
| Mapeamento fixo | Aceita campos `{data, movimentacao, valor, pessoa, pagamento, status}` |

### Frontend — JS_Fin_FlashV2.html

**`ffv2PreviaExtrato_` success handler:**
- Armazena `linhasReais` em `window.__ffv2Extrato.linhasReais`
- Badge verde: "✅ Prévia calculada diretamente do arquivo enviado."
- Exibe nome(s) de colaboradores encontrados ao lado do número
- Exibe finais de cartão (ex: `Final 0546, Final 881`) ao lado do número
- Status breakdown em vez de lista simples: `Pendente: 19 | Finalizada: 7 | -: 2`

**`ffv2ConfirmarImportacao_`:**
- Lê `window.__ffv2Extrato.linhasReais`
- Bloqueia com erro se linhasReais estiver vazio
- Passa `linhas: linhasReais` no payload para o backend
- Remove re-leitura redundante do arquivo na confirmação

**Barra DEV:** `V2.12 Auditoria de Performance e Fluxo` → `V2.12.1 Hotfix Preview XLSX Real`

---

## Colunas obrigatórias Flash

| Coluna | Uso |
|---|---|
| `Data` | DATA no extrato |
| `Movimentação` | ESTABELECIMENTO |
| `Valor` | VALOR (negativo=gasto, positivo=recarga) |
| `Pessoa` | Nome do colaborador |
| `Pagamento` | Extração do final do cartão |
| `Prestação de contas` | Status da linha |

---

## Resultado esperado (arquivo real de teste)

Para `extrato-do-colaborador-2026-06-08-ate-2026-06-24.xlsx`:

```json
{
  "totalLinhas": 28,
  "gastosIdentificados": 26,
  "recargas": 2,
  "valorTotalGasto": 1037.98,
  "valorTotalRecarregado": 950.00,
  "colaboradoresEncontrados": 1,
  "pessoasNomes": ["BRUNA OLVEIRA DOS SANTOS"],
  "cartoesEncontrados": 2,
  "cartoes": ["0546", "881"],
  "status": {
    "Pendente": 19,
    "Finalizada": 7,
    "-": 2
  }
}
```

---

## Validações executadas (2026-06-30)

| # | Validação | Resultado |
|---|---|---|
| 1 | `node --check SGO_Fin_FlashV2.js` | ✅ OK |
| 2 | `node --check SGO_Fin_FlashV2_Setup.js` | ✅ OK |
| 3 | Parse JS `JS_Fin_FlashV2.html` | ✅ OK |
| 4 | `git diff --check` | ✅ exit 0 |
| 5 | Ausência de `prompt()` | ✅ Ausente |
| 6 | Ausência de `confirm()` | ✅ Ausente |
| 7 | Menu somente DEV | ✅ OK |
| 8 | Produção sem menu Flash V2 | ✅ OK |
| 9 | `clasp --user fin_flash_v2_dev push` | ✅ 6 arquivos |
| 10 | `EXECUTAR_FIN_FLASH_V2_12_1_TESTE_PREVIEW_XLSX_REAL_DEV` | ✅ `success:true` |
| 11 | Mock `2340.50` removido de PREVISUALIZAR_ARQUIVO | ✅ |
| 12 | Fallback DEV removido de PREVISUALIZAR_ARQUIVO | ✅ |
| 13 | Mock POSTO TESTE DEV removido de CONFIRMAR | ✅ |

---

## JSON completo da orquestradora

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "previewXlsxReal": true,
  "mockRemovido": true,
  "fallbackDevRemovido": true,
  "xlsxLeArquivoReal": true,
  "colunasFlashValidadas": true,
  "totalLinhasReal": 28,
  "gastosIdentificadosReal": 26,
  "recargasReal": 2,
  "valorTotalGastoReal": 1037.98,
  "valorTotalRecarregadoReal": 950,
  "colaboradoresEncontradosReal": 1,
  "cartoesEncontradosReal": 2,
  "cartoesFinais": ["881", "0546"],
  "statusPendente": 19,
  "statusFinalizada": 7,
  "statusDeposito": 2,
  "previaBloqueiaSeNaoLerArquivo": true,
  "confirmacaoBloqueadaSePreviaIncorreta": true,
  "menuDevLigado": true,
  "menuProducaoLigado": false,
  "webappDeployExecutado": false,
  "producaoAlterada": false,
  "flashAntigoAlterado": false,
  "forceUsado": false,
  "bloqueios": [],
  "avisos": []
}
```

---

## Regras respeitadas

| Regra | Status |
|---|---|
| Somente DEV | ✅ |
| PRODUCAO_V2 intocada | ✅ |
| Flash antigo intocado | ✅ |
| Sem `--force` | ✅ |
| Sem deploy webapp novo | ✅ |
| Sem mock/fallback na leitura de arquivo | ✅ Removido |
| Bloqueio se XLSX não puder ser lido | ✅ |
| Sem `prompt()` | ✅ |
| Sem `confirm()` | ✅ |
| Sem envio real e-mail/WhatsApp | ✅ |
| AMBIENTE_TESTE = SIM | ✅ |
| Menu somente DEV | ✅ |
| JSON completo da orquestradora | ✅ |
