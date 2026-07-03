# FIN_FLASH_V2.5 — Ações de conferência financeira e bloqueio por pendência

Data: 2026-06-26
Ambiente: DEV

## Objetivo

Adicionar ações operacionais para o financeiro atuar sobre conciliações e pendências do FIN_FLASH_V2, sempre com auditoria, sem aprovação automática por IA e sem tocar produção.

## Regras mantidas

- Somente DEV.
- Produção V2, PROD antigo e Flash antigo não foram alterados.
- Nenhum deploy webapp.
- Nenhum `--force`.
- Menu principal continua desligado.
- Nenhuma importação real em produção.
- IA não aprova gasto financeiro sozinha.
- Gasto sem comprovante não pode ser marcado como conferido.
- Gasto com divergência crítica não pode ser marcado como conferido.
- Toda ação financeira gera log/auditoria.
- Alertas são criados quando aplicável.
- Mensagem de cobrança é apenas preparada; não é enviada automaticamente.
- Testes usam `AMBIENTE_TESTE = SIM`.
- Sem `prompt()` e sem `confirm()`.

## Backend criado

Arquivo: `SGO_Fin_FlashV2.js`

Funções públicas DEV:

- `FIN_FLASH_V2_MARCAR_CONCILIACAO_CONFERIDA_DEV(payload)`
- `FIN_FLASH_V2_SOLICITAR_CORRECAO_COLABORADOR_DEV(payload)`
- `FIN_FLASH_V2_MANTER_PENDENCIA_DEV(payload)`
- `FIN_FLASH_V2_MARCAR_PENDENCIA_RESOLVIDA_DEV(payload)`
- `FIN_FLASH_V2_BLOQUEAR_RECARGAS_POR_PENDENCIA_DEV(payload)`
- `FIN_FLASH_V2_DESBLOQUEAR_RECARGAS_DEV(payload)`
- `FIN_FLASH_V2_PREPARAR_MENSAGEM_COBRANCA_PENDENCIA_DEV(payload)`
- `EXECUTAR_FIN_FLASH_V2_5_TESTE_ACOES_FINANCEIRAS_DEV()`

Helpers internos adicionados:

- `FIN_FLASH_V2_sheetCtx_()`
- `FIN_FLASH_V2_findRowById_()`
- `FIN_FLASH_V2_setByHeaders_()`
- `FIN_FLASH_V2_registrarLogAcao_()`
- `FIN_FLASH_V2_registrarAlerta_()`
- `FIN_FLASH_V2_contextoConciliacao_()`
- `FIN_FLASH_V2_contextoPendencia_()`
- `FIN_FLASH_V2_validarMotivo_()`
- `FIN_FLASH_V2_contaHitPorCpf_()`

## Tela desktop isolada

Arquivo: `JS_Fin_FlashV2.html`

Adicionado painel:

- `FIN_FLASH_V2_ACOES_FINANCEIRAS()`

Ações disponíveis na tela isolada:

- Marcar conferido.
- Solicitar correção.
- Manter pendência.
- Marcar resolvido.
- Bloquear recargas.
- Desbloquear recargas.
- Preparar mensagem de cobrança.

A tela usa campos internos controlados para ID da conciliação, ID da pendência, CPF, motivo, severidade e prazo. Não usa `prompt()` nem `confirm()`.

## Orquestradora automática

`EXECUTAR_FIN_FLASH_V2_5_TESTE_ACOES_FINANCEIRAS_DEV()` valida:

- Marcar conferido em caso válido.
- Bloquear conferência sem comprovante.
- Solicitar correção ao colaborador.
- Manter pendência.
- Resolver pendência com justificativa.
- Bloquear recargas por pendência crítica operacionalmente no SGO+.
- Desbloquear recargas com motivo.
- Preparar mensagem de cobrança sem envio automático.
- Logs para todas as ações.
- Alertas quando aplicável.
- Dados de teste com `AMBIENTE_TESTE = SIM`.
- Menu desligado, produção intocada, Flash antigo intocado, sem deploy webapp e sem `--force`.

## Validações locais realizadas antes do push

- `node --check SGO_Fin_FlashV2.js`: OK.
- `node --check SGO_Fin_FlashV2_Setup.js`: OK.
- Parse do `<script>` em `JS_Fin_FlashV2.html`: OK.
- Busca por `prompt()` e `confirm()`: OK, ausentes.

## Próximo passo operacional

1. Rodar `git diff --check`.
2. Confirmar que `JS_Fin_FlashV2.html` segue sem ligação no menu principal.
3. Publicar no DEV com `clasp --user fin_flash_v2_dev push` sem `--force`.
4. Executar `EXECUTAR_FIN_FLASH_V2_5_TESTE_ACOES_FINANCEIRAS_DEV` via `clasp run`.
5. Registrar JSON completo aqui e no inventário.

## Resultado da execução remota DEV

Executado via:

```powershell
clasp run EXECUTAR_FIN_FLASH_V2_5_TESTE_ACOES_FINANCEIRAS_DEV --user fin_flash_v2_dev
```

Também capturado via Apps Script API para obter JSON completo.

Resultado aprovado:

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "marcarConferidoOk": true,
  "bloqueioConferidoSemComprovante": true,
  "solicitarCorrecaoOk": true,
  "manterPendenciaOk": true,
  "pendenciaResolvidaOk": true,
  "bloqueioRecargaOk": true,
  "desbloqueioRecargaOk": true,
  "mensagemCobrancaPreparada": true,
  "logsCriados": true,
  "alertasCriados": true,
  "todosDadosTesteComAmbienteTeste": true,
  "menuLigado": false,
  "importacaoRealExecutada": false,
  "webappDeployExecutado": false,
  "producaoAlterada": false,
  "flashAntigoAlterado": false,
  "forceUsado": false,
  "bloqueios": [],
  "avisos": [],
  "detalhes": {
    "seedV23": {
      "ok": true,
      "bloqueios": []
    },
    "acoes": {
      "marcarConferido": {
        "success": true,
        "ok": true,
        "ambiente": "DEV",
        "conferida": true,
        "logCriado": true
      },
      "bloqueioSemComprovante": {
        "success": false,
        "ok": false,
        "ambiente": "DEV",
        "conferida": false,
        "logCriado": false,
        "bloqueios": [
          "Nao e permitido conferir gasto sem comprovante."
        ]
      },
      "solicitarCorrecao": {
        "success": true,
        "ok": true,
        "ambiente": "DEV",
        "correcaoSolicitada": true,
        "alertaCriado": true,
        "logCriado": true,
        "mensagem": "Pendencia Flash V2: favor corrigir a prestacao. Motivo: Corrigir dados divergentes teste V2.5. CPF conta: 00000000000."
      },
      "manterPendencia": {
        "success": true,
        "ok": true,
        "ambiente": "DEV",
        "pendenciaMantida": true,
        "logCriado": true
      },
      "resolverPendencia": {
        "success": true,
        "ok": true,
        "ambiente": "DEV",
        "pendenciaResolvida": true,
        "logCriado": true
      },
      "bloquearRecarga": {
        "success": true,
        "ok": true,
        "ambiente": "DEV",
        "recargasBloqueadas": true,
        "bloqueioOperacional": true,
        "bloqueioCartaoFlash": false,
        "logCriado": true
      },
      "desbloquearRecarga": {
        "success": true,
        "ok": true,
        "ambiente": "DEV",
        "recargasDesbloqueadas": true,
        "logCriado": true
      },
      "mensagemCobranca": {
        "success": true,
        "ok": true,
        "ambiente": "DEV",
        "mensagemPreparada": true,
        "enviada": false,
        "alertaCriado": true,
        "logCriado": true
      }
    }
  }
}
```

## Publicação DEV

- `clasp --user fin_flash_v2_dev push` normal executado em DEV às 21:13:08.
- Nenhum `--force` usado.
- Nenhum deploy webapp executado.
- Menu principal não foi ligado.
