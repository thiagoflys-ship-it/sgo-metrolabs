# FIN_FLASH_V2.3 — Conciliação automática entre extrato e prestação mobile

Atualizado em: 2026-06-26 17:37:04 -03:00

## Objetivo

Criar conciliação automática do FIN_FLASH_V2 cruzando gastos importados do extrato Flash com prestações mobile, validando CPF/conta, valor, data, justificativa e comprovante obrigatório.

## Escopo preservado

- Somente DEV.
- PRODUCAO_V2 não alterada.
- PROD antigo não alterado.
- Flash antigo não alterado.
- Menu principal não ligado.
- Deploy webapp não executado.
- `--force` não usado.
- Importação real em produção não executada.
- IA não aprova dinheiro da empresa sozinha.

## Arquivo alterado

- `SGO_Fin_FlashV2.js`

## Funções criadas

- `FIN_FLASH_V2_CONCILIAR_AUTOMATICAMENTE_DEV(opcoes)`
- `FIN_FLASH_V2_CLASSIFICAR_CONCILIACAO_(extrato, prestacao)`
- `FIN_FLASH_V2_CALCULAR_SCORE_CONCILIACAO_(extrato, prestacao)`
- `EXECUTAR_FIN_FLASH_V2_3_TESTE_CONCILIACAO_AUTOMATICA_DEV()`

Funções auxiliares criadas/ajustadas:

- `FIN_FLASH_V2_cpfNorm_(v)`
- `FIN_FLASH_V2_msDia_(d)`
- `FIN_FLASH_V2_asDate_(v)`
- `FIN_FLASH_V2_num_(v)`
- `FIN_FLASH_V2_rowsObj_(aba)`
- `FIN_FLASH_V2_appendConciliacao_(extrato, prestacao, cls, ambienteTeste)`
- `FIN_FLASH_V2_appendPendenciaConciliacao_(extrato, prestacao, cls, ambienteTeste)`
- `FIN_FLASH_V2_addPrestacaoTeste_(tag, conta, valor, data, finalidade, justificativa, comprovante)`

## Regras implementadas

- Extrato Flash é a verdade financeira.
- Prestação mobile é justificativa operacional.
- Não concilia gasto sem comprovante.
- Não concilia automaticamente valor divergente.
- Não concilia CPF divergente.
- CPF é normalizado para evitar problema do Sheets transformar `00000000000` em `0`.
- Score considera:
  - CPF igual
  - valor igual
  - data igual/próxima
  - comprovante existente
  - categoria compatível
  - justificativa preenchida
- IA aparece apenas como análise auxiliar (`iaAprovaSozinha:false`).
- Resultados gravados em `FIN_FLASH_V2_CONCILIACOES`.
- Pendências gravadas/atualizadas em `FIN_FLASH_V2_PENDENCIAS`.
- Logs gravados em `FIN_FLASH_V2_LOGS`.
- Todos os testes com `AMBIENTE_TESTE = SIM`.

## Status validados

- `CONCILIADO_AUTOMATICO`
- `PENDENTE_SEM_PRESTACAO`
- `PENDENTE_SEM_COMPROVANTE`
- `PENDENTE_VALOR_DIVERGENTE`
- `AGUARDANDO_EXTRATO`
- `PENDENTE_JUSTIFICATIVA_INSUFICIENTE`

## Validações locais

- `node --check SGO_Fin_FlashV2.js`: OK
- `node --check SGO_Fin_FlashV2_Setup.js`: OK
- `git diff --check`: OK, apenas avisos LF/CRLF
- `rg "prompt\(|confirm\(" SGO_Fin_FlashV2.js SGO_Fin_FlashV2_Setup.js JS_Fin_FlashV2.html`: sem ocorrências

## Publicação DEV

Foram feitos pushes normais para DEV durante ajustes da V2.3, todos sem `--force`.

Último push aprovado:

```text
Pushed 84 files at 17:33:59.
```

## Teste automático

Comando final:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_3_TESTE_CONCILIACAO_AUTOMATICA_DEV --user fin_flash_v2_dev
```

Resultado aprovado.

JSON completo capturado via Apps Script Execution API REST:

```json
{
  "iaAprovaSozinha": false,
  "ambiente": "DEV",
  "menuLigado": false,
  "justificativaInsuficiente": true,
  "pendenteSemPrestacao": true,
  "pendenteSemComprovante": true,
  "bloqueios": [],
  "flashAntigoAlterado": false,
  "pendenteValorDivergente": true,
  "todosDadosTesteComAmbienteTeste": true,
  "conciliacaoExecutada": true,
  "logsCriados": true,
  "importacaoRealExecutada": false,
  "aguardandoExtrato": true,
  "avisos": [],
  "success": true,
  "pendenciasAtualizadas": true,
  "conciliadoAutomatico": true,
  "forceUsado": false,
  "ok": true,
  "detalhes": {
    "conciliacao": {
      "iaAprovaSozinha": false,
      "menuLigado": false,
      "ambiente": "DEV",
      "bloqueios": [],
      "flashAntigoAlterado": false,
      "conciliacoesCriadas": 6,
      "conciliacaoExecutada": true,
      "logsCriados": 6,
      "importacaoRealExecutada": false,
      "totalPrestacoes": 5,
      "avisos": [],
      "pendenciasAtualizadas": 5,
      "success": true,
      "ok": true,
      "producaoAlterada": false,
      "status": {
        "CONCILIADO_AUTOMATICO": true,
        "AGUARDANDO_EXTRATO": true,
        "PENDENTE_SEM_COMPROVANTE": true,
        "PENDENTE_SEM_PRESTACAO": true,
        "PENDENTE_JUSTIFICATIVA_INSUFICIENTE": true,
        "PENDENTE_VALOR_DIVERGENTE": true
      },
      "totalExtratosGasto": 5
    },
    "importacao": {
      "invalidos": 0,
      "recargasImportadas": 0,
      "ambiente": "DEV",
      "menuLigado": false,
      "idsImportados": [
        "FIN_FLASH_V2_EXTRATO_O9Kg0nEvJoNRKqesyrYqde7rs4uFYws_",
        "FIN_FLASH_V2_EXTRATO_OrsH0PRJgkdcfyaZcAcvvn35p2Cb2n2m",
        "FIN_FLASH_V2_EXTRATO_f8HmupVxOuy-Cis5tR7yTAJ6Lfk92aXj",
        "FIN_FLASH_V2_EXTRATO_8mJRAeQbcifWk5sw9CqkcqMMgTzuyyS7",
        "FIN_FLASH_V2_EXTRATO_riwTWu1OpkZ1B5noeAF6EOXH3-Ca14V_"
      ],
      "bloqueios": [],
      "flashAntigoAlterado": false,
      "gastosImportados": 5,
      "avisos": [],
      "success": true,
      "totalRecebido": 5,
      "extratosImportados": 5,
      "ok": true,
      "duplicadosIgnorados": 0,
      "producaoAlterada": false,
      "importacaoExecutada": true
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
  "conciliacaoExecutada": true,
  "conciliadoAutomatico": true,
  "pendenteSemPrestacao": true,
  "pendenteSemComprovante": true,
  "pendenteValorDivergente": true,
  "aguardandoExtrato": true,
  "justificativaInsuficiente": true,
  "pendenciasAtualizadas": true,
  "logsCriados": true,
  "iaAprovaSozinha": false,
  "todosDadosTesteComAmbienteTeste": true,
  "menuLigado": false,
  "importacaoRealExecutada": false,
  "producaoAlterada": false,
  "flashAntigoAlterado": false,
  "forceUsado": false,
  "bloqueios": [],
  "avisos": []
}
```

## Correções feitas durante a etapa

- Normalização de CPF para comparar `00000000000` mesmo quando Sheets retorna `0`.
- Filtro de massa por `OS_NUMERO` ajustado para aceitar sufixos da tag de teste.
- Pareamento evita casar prestações muito fracas apenas por CPF.
- Fallback explícito para prestação com justificativa insuficiente e extrato correspondente.

## Próximos passos sugeridos

1. Criar painel DEV de conferência de conciliações/pendências, ainda sem menu principal.
2. Criar workflow de resolução manual de pendências.
3. Preparar importação real controlada em DEV apenas com nova autorização explícita.
