# FIN.8 — Conciliacao e Pendencias — Plano de Implementacao

> Data: 2026-06-14. Nenhum codigo alterado nesta rodada.
> Plano para implementacao futura, em etapas controladas.

---

## Estado atual (baseline para FIN.8)

### O que ja existe e funciona

| Funcao / Elemento | Local | Estado |
|-------------------|-------|--------|
| `finFlashPrevisualizarConciliacaoTela` | SGO_Fin.js:1235 | Pronto — le extratos e lancamentos, identifica pares candidatos |
| `finFlashPrevisualizarPendenciasTela` | SGO_Fin.js:1297 | Pronto — lista pendencias abertas |
| `finFlashResolverPendenciaTela` | SGO_Fin.js | Pronto — resolve pendencia individual com justificativa |
| `finFlashAuditarPendenciasTela` | SGO_Fin.js:2057 | Pronto — auditoria de pendencias |
| `finFlashConciliarSelecionadosTela` | SGO_Fin.js:2062 | Pronto no backend — bloqueado na UI |
| `finFlashGerarPendenciasTela` | SGO_Fin.js:2063 | Pronto no backend — bloqueado na UI |
| `finFlashListarConciliacoes` | SGO_Fin.js:2067 | Pronto |
| `finFlashListarPendencias` | SGO_Fin.js:2066 | Pronto |
| Botao "Ver previa conciliacao" | JS_Fin_Cartoes.html:480 | Ativo — chama google.script.run |
| Botao "Ver pendencias" | JS_Fin_Cartoes.html:481 | Ativo — chama google.script.run |
| Botao "Conciliar selecionados" | JS_Fin_Cartoes.html:484 | Bloqueado — finFlashAcaoRealNaoHabilitada_ |
| Botao "Gerar pendencias" | JS_Fin_Cartoes.html:485 | Bloqueado — finFlashAcaoRealNaoHabilitada_ |
| Resolucao individual de pendencia | JS_Fin_Cartoes.html:2664 | Ativo — `finFlashResolverPendencia_` chama google.script.run |
| Aba "Pendencias (FIN.8)" no nav | JS_Fin_Cartoes.html:263 | Placeholder disabled |
| Abas FIN_CARTOES_CONCILIACAO e FIN_CARTOES_PENDENCIAS | DB_FIN | Existem (12 abas do setup) |

### O que esta intencionalmente bloqueado

| Elemento | Mecanismo de bloqueio | Risco se desbloqueado |
|----------|----------------------|----------------------|
| "Conciliar selecionados" | `finFlashAcaoRealNaoHabilitada_` | Conciliar sem dados reais validados |
| "Gerar pendencias" | `finFlashAcaoRealNaoHabilitada_` | Gerar pendencias sobre dados de teste |
| Aba FIN.8 no nav | CSS `placeholder` | UI acessivel mas sem dados reais |

---

## Fluxo ideal FIN.8

### Fluxo A — Visualizacao de conciliacao (ja parcialmente implementado)

```
1. Usuario abre aba Flash
2. Clica "Ver previa conciliacao"
3. [google.script.run] finFlashPrevisualizarConciliacaoTela()
4. Retorna:
   - conciliaveis: pares extrato/lancamento por data proxima, mesmo cartao
   - semPrestacao: extratos sem lancamento correspondente
   - semExtrato: lancamentos sem extrato correspondente
5. UI exibe tabela de pares com checkbox de selecao
6. Usuario seleciona pares
7. Clica "Conciliar selecionados" (hoje bloqueado)
8. [FIN.8C] Confirmacao obrigatoria antes de executar
9. [google.script.run] finFlashConciliarSelecionadosTela(payload, confirmacao)
10. UI exibe resultado
```

### Fluxo B — Visualizacao e resolucao de pendencias (parcialmente implementado)

```
1. Usuario abre aba Flash
2. Clica "Ver pendencias"
3. [google.script.run] finFlashPrevisualizarPendenciasTela()
4. Retorna lista de pendencias com tipo, descricao, extrato vinculado
5. UI exibe lista com filtros por tipo/status
6. Usuario abre detalhe de pendencia
7. Clica "Resolver pendencia"
8. UI exibe campo de justificativa (hoje em JS_Fin_Cartoes.html:2660)
9. Usuario preenche justificativa e confirma
10. [google.script.run] finFlashResolverPendenciaTela(sessao, id, texto, confirmacao)
11. UI atualiza lista
```

### Fluxo C — Geracao de pendencias (hoje bloqueado)

```
1. Usuario clica "Gerar pendencias" (hoje: finFlashAcaoRealNaoHabilitada_)
2. [FIN.8D] Confirmacao tecnica antes de gerar
3. [google.script.run] finFlashGerarPendenciasTela(sessao, confirmacao)
4. Backend gera pendencias a partir de extratos sem conciliacao
5. UI exibe resumo de pendencias criadas
```

---

## Plano de implementacao em etapas

### FIN.8A — Diagnostico (sem codigo, ja feito)

- Mapear o que existe.
- Identificar bloqueios intencionais.
- Confirmar que preview ja funciona.
- Confirmar que resolucao individual existe.
- Documentar fluxo ideal.
- **Status: CONCLUIDO nesta sessao.**

### FIN.8B — UI de leitura (ativar preview completo)

**Escopo:**
- Ativar aba "Pendencias (FIN.8)" no nav (remover `placeholder`, tornar clicavel).
- Criar conteudo da aba: lista de pendencias com filtros.
- Reutilizar `finFlashPrevisualizarPendenciasTela` ja existente.
- Adicionar filtros: tipo, status, cartao, data.
- Botao de atualizar.
- Sem acoes reais nesta etapa.

**Arquivos alterados:**
- `JS_Fin_Cartoes.html` — aba ativada, painel FIN.8B criado

**Restricoes aplicadas:**
- Nenhuma acao real habilitada.
- Preview apenas.
- Todos os botoes reais com `disabled`.

**Status: CONCLUIDO e HOMOLOGADO.**

#### FIN.8B — Homologacao visual /dev

- Commit: `b1b9cdb`
- clasp push /dev: 2026-06-14 as 19:25:41, 75 arquivos, sem --force, sem deploy
- Resultado: **APROVADO**
- KPIs /dev observados: Total 2 | Abertas 0 | Resolvidas 2 | Tipos 2
- Previa conciliacao /dev: Extratos pendentes 1 | Lancamentos pendentes 1 | Conciliaveis 0
- Acoes reais confirmadas blocked: Conciliar selecionados, Gerar pendencias, Resolver (massa e individual)
- Producao intocada
- Documento completo: `docs/FIN8B_HOMOLOGACAO_VISUAL_DEV.md`

### FIN.8C — Resolucao controlada de pendencias

**Escopo:**
- Ativar "Resolver pendencia" com confirmacao obrigatoria na UI.
- Adicionar campo de justificativa com validacao minima.
- Exibir feedback visual apos resolucao.
- Log de auditoria visivel na UI.
- Rollback visual (desfazer resolucao, se coluna STATUS suportar).

**Arquivos a alterar:**
- `JS_Fin_Cartoes.html` — melhorar UI de resolucao ja existente
- `SGO_Fin.js` — verificar se `finFlashResolverPendenciaTela` tem log adequado

**Restricoes:**
- Resolucao so com justificativa preenchida.
- Confirmacao tecnica obrigatoria.
- Requer autorizacao separada.

**Estimativa:** 1 sessao de implementacao.

### FIN.8D — Auditoria de pendencias

**Escopo:**
- Criar funcao SEM_GRAVAR de auditoria de pendencias pos-acao.
- Verificar contagem de pendencias abertas/resolvidas.
- Exibir no dashboard Flash.

**Arquivos a alterar:**
- `SGO_Fin_Extratos.js` — nova funcao SEM_GRAVAR (ou reutilizar `finFlashAuditarPendenciasTela`)

**Estimativa:** 0.5 sessao.

### FIN.8E — Validacao /dev do FIN.8 completo

- Executar FIN.8B+C+D no /dev.
- Validar visualmente.
- Auditoria SEM_GRAVAR depois.
- Equivalente ao Pacote V, mas para FIN.8.

### FIN.8F — Commit/push/deploy separado

- Commit exclusivo dos arquivos FIN.8.
- Push ao GitHub.
- Deploy de producao autorizado separadamente.
- Validacao visual producao.

---

## Riscos do FIN.8

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|-------------|---------|-----------|
| Conciliar dados de teste como se fossem reais | Media | Alto | So habilitar apos dados reais em prod |
| Gerar pendencias sobre extratos de teste | Media | Medio | Verificar `dadosTeste` no resumo operacional |
| Resolucao de pendencia sem justificativa | Baixa | Medio | Validar campo obrigatorio na UI |
| Rollback de conciliacao nao implementado | Alta | Medio | Planejar reversao antes de ativar acao real |
| Aba FIN.8 ativa sem dados reais | Baixa | Baixo | Exibir aviso de dados de teste |

---

## Decisao recomendada sobre FIN.8

**Ordem recomendada:**
1. Primeiro: concluir Pacote W (importacao real em producao).
2. Depois: ativar FIN.8B (preview completo na UI) — seguro, sem acao real.
3. Depois: com dados reais em producao, ativar FIN.8C (resolucao controlada).
4. So entao: ativar conciliacao automatica e geracao de pendencias (FIN.8D+).

**FIN.8B pode comecar antes do Pacote W** se quisermos a UI de pendencias visivel,
mas a resolucao real (FIN.8C) so faz sentido com dados reais.
