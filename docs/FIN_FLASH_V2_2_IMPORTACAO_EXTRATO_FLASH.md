# FIN_FLASH_V2.2 — Importação segura do extrato Flash em DEV

Atualizado em: 2026-06-26 17:09:43 -03:00

## Objetivo

Criar importação segura do extrato Flash para o FIN_FLASH_V2, usando o modelo analisado:

- Data
- Movimentação
- Valor
- Pessoa
- Pagamento
- Prestação de contas

A importação foi implementada e testada somente no DEV com massa simulada baseada no extrato real. Não houve importação real em produção.

## Escopo preservado

- Somente DEV.
- PRODUCAO_V2 não alterada.
- PROD antigo não alterado.
- Flash antigo não alterado.
- Menu principal não ligado.
- Deploy webapp não executado.
- `--force` não usado.
- Extrato real de produção não importado.
- IA não aprova gasto financeiro sozinha.

## Arquivo alterado

- `SGO_Fin_FlashV2.js`

## Funções criadas

- `FIN_FLASH_V2_MAPEAR_EXTRATO_FLASH_DEV_SEM_GRAVAR(entrada)`
- `FIN_FLASH_V2_IMPORTAR_EXTRATO_FLASH_DEV(entrada, opcoes)`
- `FIN_FLASH_V2_GERAR_CHAVE_EXTRATO_(item)`
- `EXECUTAR_FIN_FLASH_V2_2_TESTE_IMPORTACAO_EXTRATO_AUTOMATICO_DEV()`

Funções auxiliares:

- `FIN_FLASH_V2_norm_(v)`
- `FIN_FLASH_V2_hash_(txt)`
- `FIN_FLASH_V2_linhasExtrato_(entrada)`
- `FIN_FLASH_V2_valorExtrato_(valor)`
- `FIN_FLASH_V2_dataExtrato_(valor)`
- `FIN_FLASH_V2_isoData_(data)`
- `FIN_FLASH_V2_categoriaMovimentacao_(mov)`
- `FIN_FLASH_V2_finalCartao_(pagamento)`
- `FIN_FLASH_V2_contaPorPessoa_(pessoa)`
- `FIN_FLASH_V2_cartaoPorFinal_(cpf, finalCartao)`
- `FIN_FLASH_V2_rowExtrato_(row, headers, mapa)`
- `FIN_FLASH_V2_idsExistentes_(sh, coluna)`

## Regras implementadas

- Validação das colunas obrigatórias antes de gravar.
- Mapeamento sem gravação.
- Normalização de data/hora.
- Normalização de valor em formato brasileiro ou numérico.
- Valor negativo classificado como `GASTO`.
- Valor positivo classificado como `RECARGA`.
- Valor zero considerado inválido.
- CPF/conta do colaborador permanece entidade principal.
- Pessoa do extrato é usada para localizar a conta/CPF quando possível.
- Pagamento/cartão/final é extraído quando possível, mas cartão não vira conta principal.
- Categoria inferida da movimentação quando possível.
- Chave idempotente gerada por data + pessoa + valor + movimentação + pagamento.
- Duplicidade bloqueada antes de gravar nova linha de extrato.
- Extratos gravados em `FIN_FLASH_V2_EXTRATOS`.
- Recargas positivas também gravadas em `FIN_FLASH_V2_RECARGAS`.
- Gastos negativos geram pendência em `FIN_FLASH_V2_PENDENCIAS` com status de conciliação inicial.
- Logs gravados em `FIN_FLASH_V2_LOGS`.
- Dados de teste marcados com `AMBIENTE_TESTE = SIM`.

## Status usados

- `GASTO_IMPORTADO_AGUARDANDO_PRESTACAO`
- `RECARGA_IMPORTADA`
- `EXTRATO_DUPLICADO_IGNORADO`
- `EXTRATO_INVALIDO`
- `AGUARDANDO_CONCILIACAO`

## Validações locais

- `node --check SGO_Fin_FlashV2.js`: OK
- `node --check SGO_Fin_FlashV2_Setup.js`: OK
- `git diff --check`: OK, apenas avisos LF/CRLF
- `rg "prompt\(|confirm\(" SGO_Fin_FlashV2.js SGO_Fin_FlashV2_Setup.js JS_Fin_FlashV2.html`: sem ocorrências

## Publicação DEV

Primeiro push:

```powershell
clasp --user fin_flash_v2_dev push
```

Resultado:

```text
Pushed 84 files at 17:04:44.
```

Depois foi ajustada a orquestradora para usar massa única por execução, mantendo o teste de duplicidade dentro da própria rodada. Segundo push:

```text
Pushed 84 files at 17:06:39.
```

Sem `--force`.

## Teste automático

Comando:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_2_TESTE_IMPORTACAO_EXTRATO_AUTOMATICO_DEV --user fin_flash_v2_dev
```

Resultado aprovado.

Como o `clasp run` compacta objetos aninhados como `[Object]`, o JSON completo foi capturado também via Apps Script Execution API REST no DEV.

## JSON completo final

```json
{
  "ambiente": "DEV",
  "menuLigado": false,
  "mapeamentoExtratoOk": true,
  "bloqueios": [],
  "flashAntigoAlterado": false,
  "todosDadosTesteComAmbienteTeste": true,
  "duplicidadeBloqueada": true,
  "avisos": [],
  "success": true,
  "importacaoTesteExecutada": true,
  "forceUsado": false,
  "recargaPositivaImportada": true,
  "gastoNegativoImportado": true,
  "ok": true,
  "detalhes": {
    "mapeamentoInvalido": {
      "colunasObrigatorias": ["Data", "Movimentação", "Valor", "Pessoa", "Pagamento", "Prestação de contas"],
      "headersRecebidos": ["Data", "Valor"],
      "bloqueios": [
        "Coluna obrigatoria ausente: Movimentação.",
        "Coluna obrigatoria ausente: Pessoa.",
        "Coluna obrigatoria ausente: Pagamento.",
        "Coluna obrigatoria ausente: Prestação de contas."
      ],
      "gravacaoReal": false,
      "ok": false,
      "somenteLeitura": true
    },
    "mapeamento": {
      "colunasObrigatorias": ["Data", "Movimentação", "Valor", "Pessoa", "Pagamento", "Prestação de contas"],
      "headersRecebidos": ["Data", "Movimentação", "Valor", "Pessoa", "Pagamento", "Prestação de contas"],
      "bloqueios": [],
      "gravacaoReal": false,
      "ok": true,
      "somenteLeitura": true
    },
    "validacaoGravacao": {
      "pendenciasTeste": 3,
      "recargasTeste": 3,
      "logsTeste": 6,
      "extratosLote": 2
    },
    "importacaoDuplicada": {
      "invalidos": 0,
      "recargasImportadas": 0,
      "idsImportados": [],
      "bloqueios": [],
      "gastosImportados": 0,
      "avisos": [
        {"id": "FIN_FLASH_V2_EXTRATO_kIs6wtsYV8vesXJCHwZg566gHZ1NzCd7", "status": "EXTRATO_DUPLICADO_IGNORADO"},
        {"id": "FIN_FLASH_V2_EXTRATO_c9LvPO2V5_1ctRgKuH7CKrdFJfqwyMwi", "status": "EXTRATO_DUPLICADO_IGNORADO"}
      ],
      "success": true,
      "totalRecebido": 2,
      "extratosImportados": 0,
      "ok": true,
      "duplicadosIgnorados": 2,
      "producaoAlterada": false,
      "importacaoExecutada": true
    },
    "importacao1": {
      "invalidos": 0,
      "recargasImportadas": 1,
      "idsImportados": [
        "FIN_FLASH_V2_EXTRATO_kIs6wtsYV8vesXJCHwZg566gHZ1NzCd7",
        "FIN_FLASH_V2_EXTRATO_c9LvPO2V5_1ctRgKuH7CKrdFJfqwyMwi"
      ],
      "bloqueios": [],
      "gastosImportados": 1,
      "avisos": [],
      "success": true,
      "totalRecebido": 2,
      "extratosImportados": 2,
      "ok": true,
      "producaoAlterada": false,
      "importacaoExecutada": true,
      "duplicadosIgnorados": 0
    }
  },
  "producaoAlterada": false
}
```

## Resultado consolidado

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "mapeamentoExtratoOk": true,
  "importacaoTesteExecutada": true,
  "gastoNegativoImportado": true,
  "recargaPositivaImportada": true,
  "duplicidadeBloqueada": true,
  "todosDadosTesteComAmbienteTeste": true,
  "menuLigado": false,
  "producaoAlterada": false,
  "flashAntigoAlterado": false,
  "forceUsado": false,
  "bloqueios": [],
  "avisos": []
}
```

## Observações

- A importação executada foi teste DEV com massa simulada, não importação real em produção.
- A massa de teste agora é única por execução para manter a orquestradora repetível.
- A duplicidade é testada dentro da mesma rodada: primeira chamada importa, segunda chamada ignora as mesmas linhas.
- O extrato Flash continua sendo tratado como verdade financeira; prestação mobile é justificativa operacional.

## Próximos passos sugeridos

1. Criar conciliação automática V2.3 entre `FIN_FLASH_V2_EXTRATOS` e `FIN_FLASH_V2_PRESTACOES`.
2. Criar regras de pendência por valor divergente, comprovante ausente/divergente e justificativa insuficiente.
3. Só depois preparar importação real controlada, ainda em DEV, com confirmação explícita.
