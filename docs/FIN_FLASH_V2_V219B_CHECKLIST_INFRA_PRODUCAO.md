# FIN Flash V2 — V2.19B — Checklist Operacional: Infraestrutura de Dados da PRODUCAO_V2

> Documento de checklist operacional. **Nada foi executado até este ponto.**
> Nenhuma ação real (criar planilha, configurar propriedade, push de código,
> rodar setup) foi feita em PRODUCAO_V2. Cada passo marcado como "ação real"
> exige confirmação explícita antes de ser executado — nenhum passo é
> disparado automaticamente pela existência deste documento.

---

## Achado que define a ordem rígida deste checklist

`SETUP_FIN_FLASH_V2_MANUAL_AUTORIZADO` e `AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR`
(em `SGO_Fin_FlashV2_Setup.js`) **não têm nenhum guard de ambiente** — não usam
`FIN_FLASH_V2_permitido_()` nem qualquer verificação de scriptId. Elas confiam
inteiramente em `DB_FIN_ID` (lido via `FIN_FLASH_V2_db_()`, que lança erro se a
propriedade não estiver configurada: `'DB_FIN_ID nao configurado.'`).

**Consequência prática: `DB_FIN_ID` é a principal trava de segurança deste setup.**
Não existe uma segunda barreira de código verificando "estou no ambiente certo"
para essas duas funções. Por isso a ordem abaixo é rígida — configurar
`DB_FIN_ID` corretamente sempre vem antes de rodar qualquer setup, e nunca se
roda o setup sem antes confirmar visualmente para onde `DB_FIN_ID` aponta.

## Passo 0 — Pré-requisito de ordem (dependência com o plano geral V2.19)

Rodar o setup exige que o **código já esteja em PRODUCAO_V2**. O push de código
(`SGO_Fin_FlashV2.js`, `SGO_Fin_FlashV2_Setup.js`, `JS_Fin_FlashV2.html`) é uma
ação já prevista na Fase 3 do plano geral (`FIN_FLASH_V2_V219_PLANO_PILOTO_PRODUCAO.md`)
e também exige confirmação explícita própria, no momento em que for executada.

## Passo 1 — Criar a planilha nova (ação manual, no Google Drive)

- [ ] Criar uma Planilha Google **vazia** na conta que administra PRODUCAO_V2
- [ ] Nome: `SGO_FIN_FLASH_V2_DB_PROD`
- [ ] Guardar o ID da planilha (parte da URL entre `/d/` e `/edit`)
- [ ] **Nunca reutilizar a planilha DEV** (a que hoje tem `DB_FIN_ID` do DEV, com
      dados de teste da Bruna e demais fixtures)
- [ ] **Nunca reutilizar a planilha do FIN_CARTOES V1** (`SGO_FIN_CARTAO_FLASH_DB`
      ou equivalente de produção) — são módulos e bases completamente separados

## Passo 2 — Configurar `DB_FIN_ID` no Script Properties de PRODUCAO_V2 (ação real)

- [ ] Abrir o editor Apps Script do projeto PRODUCAO_V2
      (scriptId `1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y`)
- [ ] Configurações do Projeto → Script Properties → adicionar `DB_FIN_ID` =
      ID da planilha criada no Passo 1
- [ ] **Conferir visualmente** o valor colado antes de salvar — não confundir
      com o `DB_ID` do SGO+ principal (`1i6xyfu9Pv9EWFLfuHyKjDZvSpgG_oM53xhjTzBAlu5U`)
      nem com o `DB_FIN_ID` do Flash V1
- [ ] Este passo deve estar concluído e conferido **antes** do Passo 4 (rodar o
      setup) — é a trava de segurança principal citada acima

## Passo 3 — Push do código FIN_FLASH_V2 para PRODUCAO_V2 (ação real)

- [ ] `clasp push` de `SGO_Fin_FlashV2.js`, `SGO_Fin_FlashV2_Setup.js`,
      `JS_Fin_FlashV2.html` usando um `.clasp` que aponte para PRODUCAO_V2
- [ ] **Nunca** usar o `.clasp.json` atual do repositório (esse aponta para o
      DEV FIN_FLASH_V2, `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG`,
      e nunca deve ser alterado)
- [ ] Confirmar visualmente no editor do PRODUCAO_V2 que os 3 arquivos chegaram

## Passo 4 — Rodar o setup (ação real que grava dado — precisa confirmação explícita)

- [ ] No editor do PRODUCAO_V2, rodar manualmente:
      `SETUP_FIN_FLASH_V2_MANUAL_AUTORIZADO('AUTORIZO_SETUP_FIN_FLASH_V2')`
      (o token exato é exigido pelo próprio código; sem ele a função só
      retorna bloqueio, não grava nada)
- [ ] Isso cria as 12 abas `FIN_FLASH_V2_*` na planilha nova, já com o schema
      atual — incluindo `SCORE`/`MOTIVO_DECISAO`/`ATUALIZADO_POR`/`ATUALIZADO_EM`
      desde o dia 1 (sem repetir a migração da V2.17)
- [ ] Se a função retornar `bloqueios` (ex.: aba já existe com schema
      diferente), **parar e investigar** antes de qualquer nova tentativa —
      nunca insistir com `--force` ou repetição às cegas

## Passo 5 — Auditorias pós-setup (somente leitura, sem risco de gravação)

- [ ] Rodar `AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR()` — confirmar `ok:true`,
      as 12 abas existem, headers batem com o schema declarado
- [ ] Rodar `AUDITAR_FIN_FLASH_V219A_AMBIENTE_PRODUCAO_SEM_GRAVAR()` — confirmar
      `ambiente.ambienteAtual === 'PRODUCAO_V2'` (prova real de que o código do
      B1 reconhece o ambiente, não só em teoria) e
      `ambienteTeste.producaoV2RetornaNAO === true`
- [ ] Confirmar manualmente, olhando a planilha, que todas as 12 abas têm
      **0 linhas de dado** — nenhum resquício de teste antes do piloto real

## Passo 6 — Critério de aprovação desta etapa

Só avançar para o piloto com 1 colaborador real quando, todos simultaneamente:

- [ ] `DB_FIN_ID` de PRODUCAO_V2 confirmado apontando para a planilha nova
      (não DEV, não Flash V1)
- [ ] As 2 auditorias do Passo 5 retornaram `ok:true`
- [ ] Planilha nova confirmada com **0 linhas de dado** em todas as 12 abas
- [ ] FIN_CARTOES (Flash V1) confirmado **intocado** — mesma planilha, mesmas
      abas, nenhuma alteração

## Passo 7 — Rollback específico desta infraestrutura

Se algo sair errado antes do piloto com colaborador real (nenhum dado real
ainda existe neste ponto, então o rollback é simples):

1. Apagar a propriedade `DB_FIN_ID` de PRODUCAO_V2 — o módulo volta a lançar
   `'DB_FIN_ID nao configurado.'` em qualquer chamada, efetivamente desligado
   sem precisar remover código.
2. Apagar a planilha nova (`SGO_FIN_FLASH_V2_DB_PROD`), se necessário — ainda
   sem dado real, nada a perder.
3. Nenhuma dessas ações toca FIN_CARTOES, o banco principal do SGO+, ou
   qualquer outro módulo de PRODUCAO_V2 — isolamento total por construção
   (script separado, propriedade separada, planilha separada).

---

**Status desta etapa: nada executado.** Produção (PRODUCAO_V2) segue intocada.
Nenhum deploy foi realizado.
