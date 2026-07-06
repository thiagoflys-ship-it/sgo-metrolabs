# FIN Flash V2 — V2.19 — Plano de Piloto Controlado em PRODUCAO_V2

> Documento de planejamento. Nenhuma ação de produção foi executada até este ponto.
> Nenhum deploy foi realizado. Nenhum código de produção foi alterado.

---

## 1. Decisão de coexistência

FIN_FLASH_V2 entra em PRODUCAO_V2 como **módulo novo e adicional**, não como substituto.

- **FIN_CARTOES (Flash V1)** — já liberado no piloto AUTH.10O, arquitetura separada (B.3), permanece **intocado**.
- **FIN_FLASH_V2** — módulo isolado, reconstruído do zero (V2.0–V2.18A), entra como item de menu novo, sem reaproveitar nada do Flash V1.
- Nenhuma migração de dados entre os dois módulos. Nenhuma desativação do antigo.

## 2. Ambientes envolvidos

| Ambiente | Script ID | Papel |
|---|---|---|
| DEV FIN_FLASH_V2 | `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG` | Onde todo o módulo foi construído e validado (V2.0–V2.18A). Nunca alterar `.clasp.json`. |
| PRODUCAO_V2 | `1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y` | Produção real do SGO+, já em piloto (AUTH.10O), já hospeda FIN_CARTOES. Destino do piloto FIN_FLASH_V2. |

## 3. Bloqueadores técnicos obrigatórios (resolver antes de qualquer deploy)

### B1 — `FIN_FLASH_V2_dev_()` só reconhece o scriptId do DEV

```js
function FIN_FLASH_V2_dev_() {
  return ScriptApp.getScriptId() === '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
}
```

Toda função do módulo (leitura, escrita, todas as auditorias) começa com
`if (!FIN_FLASH_V2_dev_()) return {bloqueios:['BLOQUEADO_FORA_DEV']}`. Se o código
for copiado para PRODUCAO_V2 sem alteração, o módulo inteiro fica mudo — cada
chamada retorna bloqueio. Precisa virar uma allowlist (DEV + PRODUCAO_V2), sem
enganar quem lê o nome da função.

### B2 — Banco de dados dedicado e limpo

`DB_FIN_ID` é lido via `PropertiesService.getScriptProperties()` — por-scriptId,
não por-deployment. Como PRODUCAO_V2 já é um script separado do DEV FIN (mesmo
padrão de isolamento adotado no Flash V1 via decisão B.3), não há risco de
contaminação cruzada por script. Falta apenas:

- Criar planilha nova e vazia (ex.: `SGO_FIN_FLASH_V2_DB_PROD`)
- Configurar `DB_FIN_ID` nas Script Properties de PRODUCAO_V2
- Rodar `SETUP_FIN_FLASH_V2_MANUAL_AUTORIZADO` lá para criar as 12 abas já com
  o schema atual (incluindo `SCORE`/`MOTIVO_DECISAO`/`ATUALIZADO_POR`/`ATUALIZADO_EM`
  desde o dia 1, sem repetir a migração da V2.17)

### B3 — `AMBIENTE_TESTE` hardcoded como `'SIM'`

Cerca de 47 pontos no backend (e o frontend, em chamadas como
`FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV({...,ambienteTeste:'SIM'})`) fixam
esse valor. Em produção real, dado do piloto nasceria marcado como teste.
Resolvido tecnicamente na V2.19A (helper dinâmico + backend como autoridade final).

## 4. Checklist de publicação controlada

### Fase 1 — Código (V2.19A, feita só no DEV)
- [ ] Resolver B1: allowlist DEV + PRODUCAO_V2 (`FIN_FLASH_V2_permitido_()`)
- [ ] Resolver B3: `AMBIENTE_TESTE` dinâmico por ambiente, backend como autoridade
- [ ] Rodar toda a bateria de auditorias existentes (V2.16H/I/J/K, V2.17B/C, V2.18/18A)
- [ ] `node --check` em todos os arquivos alterados

### Fase 2 — Infraestrutura (ação manual, fora do alcance do clasp)
- [ ] Criar planilha nova e vazia para produção
- [ ] Configurar `DB_FIN_ID` nas Script Properties de PRODUCAO_V2
- [ ] Confirmar escopos OAuth necessários em PRODUCAO_V2 (reautorizar se pedir)

### Fase 3 — Push do código (sem deploy de webapp ainda)
- [ ] `clasp push` de `SGO_Fin_FlashV2.js`, `SGO_Fin_FlashV2_Setup.js`,
      `JS_Fin_FlashV2.html` para o projeto PRODUCAO_V2 (perfil/`.clasp` distinto
      do DEV — nunca o `.clasp.json` que aponta pro DEV)
- [ ] Rodar `SETUP_FIN_FLASH_V2_MANUAL_AUTORIZADO` manualmente no editor do
      PRODUCAO_V2 (token de confirmação exigido pela própria função)
- [ ] Rodar `AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR` e confirmar `ok:true`,
      0 linhas de dado (planilha realmente vazia)

### Fase 4 — Wiring de menu/permissão (coexistência)
- [ ] Item de menu novo, não reaproveitar o menu do FIN_CARTOES
- [ ] Visível só para o(s) perfil(is) do piloto
- [ ] Confirmar que abrir o módulo não interfere em nada do FIN_CARTOES
- [ ] Sem toggle "[DEV] Financeiro/Colaborador" em produção — perfil vem do
      contexto real do usuário logado

### Fase 5 — Piloto com 1 colaborador real
- [ ] Cadastrar 1 colaborador real (não a Bruna de teste) + 1 cartão real
- [ ] Ciclo completo manual: importar extrato → conciliar → conferência com
      motivo/score → extrato por colaborador → relatório A4 → documento
- [ ] Só então expandir para mais colaboradores

## 5. Validação pós-publicação

Reaproveitar as auditorias já existentes, rodando-as em PRODUCAO_V2 (passam a
funcionar lá assim que B1 for resolvido):

- `AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR` — schema ok
- `AUDITAR_FIN_FLASH_V218A_RISCOS_MEDIOS_SEM_GRAVAR` — atenção: os campos de
  regressão que usam o CPF de teste da Bruna não se aplicam em produção (ela
  não existe lá); avaliar substituir pelo colaborador piloto real ou aceitar
  como inconclusivo nessa parte específica
- Validação humana manual do ciclo completo (Fase 5) é o que prova que funciona
- Proposta futura: `AUDITAR_FIN_FLASH_V219_PILOTO_PRODUCAO_SEM_GRAVAR()` —
  confirma ambiente correto (scriptId é PRODUCAO_V2), `DB_FIN_ID` aponta pra
  planilha nova, FIN_CARTOES não foi tocado, contagens batem com o piloto manual

## 6. Plano de rollback lógico

Como é um módulo novo e aditivo (não substitui nada):

1. **Ocultar o menu** — módulo para de aparecer, zero impacto em qualquer outra
   parte do sistema, inclusive FIN_CARTOES.
2. **Não precisa reverter deploy** — se o deploy de produção for o mesmo WebApp
   existente (não uma versão nova), esconder o menu já é suficiente.
3. **Dado não é apagado** — a planilha nova fica preservada para investigação,
   mesma regra de "nunca apagar" seguida no módulo inteiro.
4. **Reversão de código**, se necessário: `git revert` dos commits específicos
   + novo `clasp push` — por ser aditivo, reverter não quebra nada preexistente.

## 7. Critério de aprovação do piloto (1 colaborador real)

O piloto está pronto para expandir além do primeiro colaborador quando:

- Extrato, conciliação, conferência (motivo/score/responsável/data) e relatório
  A4 desse colaborador funcionarem de ponta a ponta sem erro
- Nenhuma escrita acidental em FIN_CARTOES ou em qualquer outro módulo de PRODUCAO_V2
- `AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR` (ou equivalente V2.19) continuar `ok:true`
- Validação humana explícita, mesmo padrão usado em todo o ciclo V2.14–V2.18A
