# FIN_FLASH_V2.13 — Validação Operacional Real DEV com Colaboradora Bruna

**Data:** 2026-06-30
**Ambiente:** DEV exclusivo — scriptId `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG`
**Status:** ✅ CONCLUÍDO E VALIDADO

---

## Objetivo

Validar o fluxo operacional completo do FIN_FLASH_V2 em DEV usando uma colaboradora sintética ("Bruna", CPF `05553116198`, cartão físico final `881`, cartão virtual final `0546`): importação de extrato real, vínculo correto ao CPF, conciliação, geração de relatório/documento A4, alertas, cobrança manual e isolamento dos portais colaborador/financeiro.

---

## Problemas identificados e corrigidos

### 1. Relatório do lote não mostrava a colaboradora real
O relatório A4 de conciliação por lote exibia `Colaborador: Lote`, `CPF: LOTE_...` e `Período: — a —` em vez dos dados reais. Causa: `FIN_FLASH_V2_PREVIEW_CONCILIACAO_LOTE_DEV` não resolvia o colaborador a partir dos extratos do lote.

### 2. PENDENCIAS gravava campo fora do schema
`FIN_FLASH_V2_CONCILIAR_LOTE_IMPORTADO_DEV` gravava `PENDENCIAS.CONCILIACAO_ID` (coluna inexistente) em vez de `PENDENCIAS.EXTRATO_ID`, deixando o vínculo de pendência sempre vazio.

### 3. Perda de zero inicial em CPF e final de cartão
Google Sheets converte strings numéricas em número ao gravar: `'05553116198'` → `5553116198`; `'0546'` → `546`. Isso quebrava comparações estritas em várias funções.

### 4. Causa raiz do bloqueio final — `cadastroCartoesPreservadosNoReset: false`
A aba `CARTOES` usa os cabeçalhos reais:
```
['ID','CONTA_ID','CPF','TIPO_CARTAO','FINAL_CARTAO','STATUS','AMBIENTE_TESTE','CRIADO_EM','ATUALIZADO_EM']
```
mas `FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV` gravava em `nr.TIPO` / `nr.FINAL`, propriedades que não correspondiam a nenhuma coluna real. Como a linha final é montada via `cartoes.headers.map(h => nr[h])`, qualquer valor escrito sob um nome de propriedade que não bate com o cabeçalho real é silenciosamente descartado. Resultado: todo cartão criado por essa função (não só os da Bruna) ficava com `TIPO_CARTAO`/`FINAL_CARTAO` vazios, mesmo a função reportando sucesso.

Diagnóstico feito via função de debug temporária (`FIN_FLASH_V2_DEBUG_CARTOES_BRUNA_DEV`), executada por `clasp run`, que confirmou `k.FINAL = undefined`, `k.TIPO = undefined` e expôs os cabeçalhos reais da aba.

---

## Correções aplicadas

### Backend — SGO_Fin_FlashV2.js

**Helpers de normalização e acesso por alias (novos):**

```javascript
function FIN_FLASH_V2_getCampoAlias_(obj, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    var k = aliases[i];
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== '' && obj[k] !== null && obj[k] !== undefined) {
      return obj[k];
    }
  }
  return '';
}
function FIN_FLASH_V2_normFinalCartao_(v) {
  var s = String(v || '').trim().replace(/\D/g, '');
  if (!s) return '';
  return s.replace(/^0+/, '') || '0';
}
function FIN_FLASH_V2_getCpfCartao_(k) {
  return FIN_FLASH_V2_normCpf_(FIN_FLASH_V2_getCampoAlias_(k, [
    'CPF', 'CPF_COLABORADOR', 'CPF_TITULAR', 'DOCUMENTO', 'CPF_RESPONSAVEL'
  ]));
}
function FIN_FLASH_V2_getFinalCartao_(k) {
  return FIN_FLASH_V2_normFinalCartao_(FIN_FLASH_V2_getCampoAlias_(k, [
    'FINAL', 'FINAL_CARTAO', 'CARTAO_FINAL', 'FINAIS_CARTAO',
    'FINAL_DO_CARTAO', 'NUMERO_FINAL', 'ULTIMOS_DIGITOS', 'FINAL_PAGAMENTO'
  ]));
}
function FIN_FLASH_V2_getTipoCartao_(k) {
  return String(FIN_FLASH_V2_getCampoAlias_(k, [
    'TIPO', 'TIPO_CARTAO', 'CARTAO_TIPO', 'MODALIDADE', 'TIPO_DO_CARTAO'
  ]) || '').trim().toUpperCase();
}
function FIN_FLASH_V2_getStatusCartao_(k) {
  return String(FIN_FLASH_V2_getCampoAlias_(k, [
    'STATUS', 'STATUS_CARTAO', 'SITUACAO', 'SITUACAO_CARTAO'
  ]) || '').trim().toUpperCase();
}
```

Regra de comparação: o final normalizado **sem zero à esquerda** (`881`, `546`) é usado para comparação; a formatação original (`881`, `0546`) é preservada para exibição.

**Funções corrigidas para usar os getters de alias:**
- `FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV` — passa a gravar simultaneamente em `TIPO`/`TIPO_CARTAO` e `FINAL`/`FINAL_CARTAO`, compatível com os dois esquemas de cabeçalho; checagem de duplicidade usa `getCpfCartao_`/`getTipoCartao_`/`getStatusCartao_`.
- `FIN_FLASH_V2_INATIVAR_CARTAO_COLABORADOR_DEV` — matching por final/CPF via `getFinalCartao_`/`normFinalCartao_`/`getCpfCartao_`.
- `FIN_FLASH_V2_LISTAR_COLABORADORES_PARA_IMPORTACAO_DEV` — lista de cartões usa os getters.
- `FIN_FLASH_V2_PREPARAR_BRUNA_VALIDACAO_DEV` — remove cartões corrompidos pré-existentes da Bruna (final vazio, `AMBIENTE_TESTE=SIM`) antes de checar/criar os cartões 881/0546; checagem usa os getters.
- `FIN_FLASH_V2_CRIAR_MASSA_VALIDACAO_BRUNA_DEV` — lookup de cartões via getters.
- `EXECUTAR_FIN_FLASH_V2_13_VALIDACAO_OPERACIONAL_BRUNA_DEV` — passo de verificação `c881ok`/`c0546ok` via getters (correção que resolveu o bloqueio final).

**Funções de conciliação e relatório:**
- `FIN_FLASH_V2_CONCILIAR_LOTE_IMPORTADO_DEV` — `PENDENCIAS.EXTRATO_ID = ext.ID` (campo correto do schema).
- `FIN_FLASH_V2_PREVIEW_CONCILIACAO_LOTE_DEV` — resolve colaborador real (nome/CPF) a partir dos extratos do lote.
- `FIN_FLASH_V2_GERAR_DOCUMENTO_CONCILIACAO_LOTE_DEV` — usa `prev.colaborador.nome`/`prev.colaborador.cpf` no relatório A4.
- `FIN_FLASH_V2_CONFIRMAR_IMPORTACAO_EXTRATO_FLASH_DEV` — aceita `payload.cpfColaborador` vindo da nova Etapa 0 do frontend.

**Funções de validação operacional (novas, exclusivas DEV):**
- `FIN_FLASH_V2_PREPARAR_BRUNA_VALIDACAO_DEV`
- `FIN_FLASH_V2_RESETAR_HISTORICO_BRUNA_VALIDACAO_DEV` — apaga somente `EXTRATOS`/`RECARGAS`/`PRESTACOES`/`CONCILIACOES`/`PENDENCIAS`/`ALERTAS` de teste da Bruna; preserva cadastro e cartões.
- `FIN_FLASH_V2_CRIAR_MASSA_VALIDACAO_BRUNA_DEV` — 9 cenários de extrato (A–I) + 5 prestações + 2 recargas.
- `FIN_FLASH_V2_VALIDAR_PORTAL_COLABORADOR_BRUNA_DEV`
- `FIN_FLASH_V2_VALIDAR_PORTAL_FINANCEIRO_BRUNA_DEV`
- `EXECUTAR_FIN_FLASH_V2_13_VALIDACAO_OPERACIONAL_BRUNA_DEV` — orquestradora de 13 passos.

### Frontend — JS_Fin_FlashV2.html

Nova **Etapa 0 — Selecionar Colaborador** antes da Etapa 1 (Período):
- `ffv2LoadImportarColaboradores_()` — carrega lista via `FIN_FLASH_V2_LISTAR_COLABORADORES_PARA_IMPORTACAO_DEV`.
- `ffv2OnColabSelecionado_(sel)` — fixa o CPF selecionado para as etapas seguintes.
- `ffv2PreviaExtrato_()` / `ffv2ConfirmarImportacao_()` — bloqueiam se nenhum colaborador estiver selecionado; passam `cpfColaborador` ao backend.

Barra DEV atualizada para `V2.13 Validação Operacional Real — Bruna`.

---

## Cenários de validação (A–I)

| Cenário | Descrição |
|---|---|
| A | Gasto com prestação de contas correta |
| B | Gasto sem prestação de contas |
| C | Gasto com prestação mas sem comprovante anexado |
| D | Gasto com valor divergente entre extrato e prestação |
| E | Gasto com justificativa insuficiente |
| F | Gasto em cartão não cadastrado para a colaboradora |
| G | Pendência vencida (prazo de prestação expirado) |
| H | Pendência regularizada posteriormente |
| I | Recarga (não gera pendência de prestação) |

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
| 9 | Envio real de e-mail/WhatsApp bloqueado | ✅ OK |
| 10 | `clasp --user fin_flash_v2_dev push` (sem `--force`) | ✅ 84 arquivos |
| 11 | `EXECUTAR_FIN_FLASH_V2_13_VALIDACAO_OPERACIONAL_BRUNA_DEV` (1ª execução) | ✅ `success:true` |
| 12 | `EXECUTAR_FIN_FLASH_V2_13_VALIDACAO_OPERACIONAL_BRUNA_DEV` (2ª execução, idempotência) | ✅ `success:true` |

---

## JSON completo da orquestradora (execução final)

```json
{
  "success": true,
  "ok": true,
  "ambiente": "DEV",
  "cpfBrunaNormalizado": true,
  "cpfBrunaTexto": true,
  "zeroInicialCpfPreservado": true,
  "brunaCadastrada": true,
  "cartaoFisico881": true,
  "cartaoVirtual0546": true,
  "extratoVinculadoAoCpf": true,
  "loteNaoUsadoComoColaborador": true,
  "chaveLoteNaoUsadaComoCpf": true,
  "relatorioMostraBruna": true,
  "relatorioMostraCpfBruna": true,
  "relatorioMostraPeriodo": true,
  "relatorioMostraCartoes": true,
  "todosCenariosValidados": true,
  "envioRealBloqueado": true,
  "resetHistoricoTesteDisponivel": true,
  "cadastroCartoesPreservadosNoReset": true,
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
| Sem `prompt()` | ✅ |
| Sem `confirm()` | ✅ |
| Sem envio real e-mail/WhatsApp | ✅ |
| AMBIENTE_TESTE = SIM em todos os registros de teste | ✅ |
| Limpeza de dados exclusiva DEV e só de registros de validação | ✅ |
| Menu somente DEV | ✅ |
| JSON completo da orquestradora | ✅ |

---

## Bug latente documentado (fora de escopo desta validação)

Outras funções pré-existentes (listagem de colaboradores no portal, dashboard, relatórios) ainda leem `k.FINAL`/`k.TIPO` diretamente em vez de usar os getters de alias, e portanto continuam suscetíveis ao mesmo problema de nome de cabeçalho em outros pontos do módulo fora do escopo da V2.13. Não corrigidas nesta entrega por decisão explícita de escopo ("não refazer frontend inteiro", "não recomeçar a V2.13"). Recomenda-se migração gradual para os getters de alias em uma próxima entrega.
