# FIN.8 — Prototipo UI — Conciliacao e Pendencias

> Prototipo em Markdown. Nenhum HTML foi alterado.
> Referencia para implementacao futura da aba FIN.8 na tela Financeiro.

---

## Layout proposto — aba FIN.8 Pendencias / Conciliacao

```
╔══════════════════════════════════════════════════════════╗
║  FIN.8 — Conciliacao e Pendencias Flash                  ║
╠══════════════════════════════════════════════════════════╣
║  KPIs rápidos                                            ║
║  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     ║
║  │ Pendentes    │ │ Conciliados  │ │ Nao conciliad│     ║
║  │     5        │ │      2       │ │       5      │     ║
║  └──────────────┘ └──────────────┘ └──────────────┘     ║
╠══════════════════════════════════════════════════════════╣
║  Filtros                                                 ║
║  Tipo: [Todos ▼]  Status: [Aberto ▼]  Cartao: [Todos ▼] ║
║  Data: [01/06 → 30/06]   [Atualizar]                    ║
╠══════════════════════════════════════════════════════════╣
║  Painel duplo                                            ║
║  ┌─────────────────────┐ ┌─────────────────────────┐    ║
║  │ PENDENCIAS (5)      │ │ CONCILIACAO PREVIA       │    ║
║  │                     │ │                          │    ║
║  │ #001 — Padaria      │ │ Extrato ↔ Lancamento     │    ║
║  │ Valor: -R$ 5,04     │ │ -5,04 ↔ Padaria 05/06   │    ║
║  │ Status: Aberto      │ │ [Selecionar] [Ignorar]   │    ║
║  │ [Ver detalhe]       │ │                          │    ║
║  │                     │ │ -19,00 ↔ Estacionamento  │    ║
║  │ #002 — Estacion.    │ │ [Selecionar] [Ignorar]   │    ║
║  │ Valor: -R$ 19,00    │ │                          │    ║
║  │ Status: Aberto      │ │ -33,30 ↔ Sem prestacao   │    ║
║  │ [Ver detalhe]       │ │ (aguardando lancamento)  │    ║
║  │                     │ │                          │    ║
║  └─────────────────────┘ └─────────────────────────┘    ║
╠══════════════════════════════════════════════════════════╣
║  Acoes                                                   ║
║  [Conciliar selecionados]  [Gerar pendencias]            ║
║  (requer confirmacao tecnica)  (requer confirmacao)      ║
╚══════════════════════════════════════════════════════════╝
```

---

## Componente: Detalhe de pendencia

```
╔═══════════════════════════════════════════════════════╗
║  Pendencia #001 — SIMULACAO PADARIA FIN NO            ║
╠═══════════════════════════════════════════════════════╣
║  Tipo: PRESTACAO_PENDENTE                             ║
║  Status: ABERTO                                       ║
║  Extrato ID: EXT-001                                  ║
║  Data transacao: 11/06/2026                           ║
║  Valor: R$ 5,04                                       ║
║  Cartao: *777                                         ║
║  Portador: USUARIO TESTE FLASH                        ║
╠═══════════════════════════════════════════════════════╣
║  Justificativa (obrigatoria):                         ║
║  ┌───────────────────────────────────────────────┐   ║
║  │ Ex: Comprovante fiscal recebido e conferido   │   ║
║  └───────────────────────────────────────────────┘   ║
╠═══════════════════════════════════════════════════════╣
║  [Resolver pendencia]    [Cancelar]                   ║
║  (confirmacao obrigatoria antes de gravar)            ║
╚═══════════════════════════════════════════════════════╝
```

---

## Componente: Confirmacao tecnica antes de acao real

```
╔═══════════════════════════════════════════════════════╗
║  ⚠ Confirmacao obrigatoria                           ║
╠═══════════════════════════════════════════════════════╣
║  Voce esta prestes a resolver 1 pendencia.            ║
║  Esta acao grava no banco FIN.                        ║
║                                                       ║
║  Justificativa informada:                             ║
║  "Comprovante fiscal recebido e conferido"            ║
║                                                       ║
║  Para confirmar, digite:                              ║
║  CONFIRMAR_RESOLUCAO_PENDENCIA                        ║
║  ┌───────────────────────────────────────────────┐   ║
║  │                                               │   ║
║  └───────────────────────────────────────────────┘   ║
╠═══════════════════════════════════════════════════════╣
║  [Confirmar resolucao]   [Cancelar]                   ║
╚═══════════════════════════════════════════════════════╝
```

---

## Campos da tabela de pendencias (UX)

| Campo | Tipo | Origem |
|-------|------|--------|
| ID | texto | PENDENCIA_ID |
| Tipo | badge | TIPO_PENDENCIA |
| Status | badge colorido | STATUS_PENDENCIA |
| Data transacao | data | vinculado ao EXTRATO_ID |
| Valor | moeda | vinculado ao EXTRATO_ID |
| Cartao | texto curto | CARTAO_FINAL |
| Portador | texto | via CARTAO_ID |
| Descricao | texto | DESCRICAO_PENDENCIA |
| Extrato ID | link interno | EXTRATO_ID |
| Data criacao pendencia | data | DATA_CRIACAO_PENDENCIA |
| Responsavel resolucao | texto | preenchido ao resolver |

---

## Campos da tabela de conciliacao previa (UX)

| Campo | Tipo | Origem |
|-------|------|--------|
| Extrato ID | texto | extratoId |
| Lancamento ID | texto | lancamentoId |
| Data extrato | data | dataExtrato |
| Data lancamento | data | dataLancamento |
| Descricao extrato | texto | descricaoExtrato |
| Descricao lancamento | texto | descricaoLancamento |
| Valor | moeda | valor |
| Cartao | texto | cartaoFinal |
| Match score | indicador visual | por data proxima + cartao |

---

## Status de pendencia — badges de cores sugeridas

| Status | Cor | Significado |
|--------|-----|-------------|
| ABERTO | Amarelo | Pendente de acao |
| EM_REVISAO | Azul | Em analise |
| RESOLVIDO | Verde | Resolvido com justificativa |
| CANCELADO | Cinza | Cancelado sem acao |
| DIVERGENTE | Vermelho | Valor ou data divergente |

---

## Status de conciliacao — badges

| Status | Cor | Significado |
|--------|-----|-------------|
| CONCILIADO | Verde | Extrato vinculado a lancamento |
| NAO_CONCILIADO | Amarelo | Extrato sem lancamento |
| SEM_EXTRATO | Cinza | Lancamento sem extrato |
| DIVERGENTE | Vermelho | Match tentado mas com divergencia |

---

## Comportamento mobile

- Painel duplo colapsa em abas verticais: "Pendencias" e "Conciliacao".
- Detalhe de pendencia abre em modal fullscreen.
- Confirmacao tecnica em modal com campo de texto grande.
- Botoes de acao com label completo (sem icone sozinho).

---

## Travas de seguranca obrigatorias na UI FIN.8

| Acao | Trava |
|------|-------|
| Resolver pendencia | Justificativa obrigatoria + confirmacao textual |
| Conciliar selecionados | Selecao minima de 1 par + confirmacao |
| Gerar pendencias | Confirmacao de que dados sao reais (nao de teste) |
| Qualquer acao real | Verificar `dadosTeste` no resumo — se true, bloquear com aviso |

---

## Dependencias tecnicas para FIN.8B (leitura)

- `finFlashPrevisualizarConciliacaoTela` — ja existe (SGO_Fin.js:1235)
- `finFlashPrevisualizarPendenciasTela` — ja existe (SGO_Fin.js:1297)
- `finFlashListarPendencias` — ja existe (SGO_Fin.js:2066)
- `finFlashListarConciliacoes` — ja existe (SGO_Fin.js:2067)
- JS_Fin_Cartoes.html: ativar aba e criar conteudo

## Dependencias tecnicas para FIN.8C (resolucao)

- `finFlashResolverPendenciaTela` — ja existe (SGO_Fin.js:2056)
- `finFlashConciliarSelecionadosTela` — ja existe (SGO_Fin.js:2062)
- JS_Fin_Cartoes.html: desbloquear `finFlashAcaoRealNaoHabilitada_` para acao concreta
- Adicionar campo de justificativa e confirmacao obrigatoria
