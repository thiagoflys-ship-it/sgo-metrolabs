# FIN — Mapa Final de Fechamento do Modulo Completo

> Referencia: commit e6767a1 — 2026-06-14.
> Versao atualizada apos Pacotes T/U/V aprovados.

---

## Tabela geral por submódulo

| # | Submódulo | Arquivos | Estado | Pode ir prod? | Precisa UI? | Precisa backend? | Precisa dados reais? | Pacote sugerido |
|---|-----------|---------|--------|:---:|:---:|:---:|:---:|---|
| 1 | Cartoes | SGO_Fin.js, JS_Fin_Cartoes.html | Homologado DEV | Sim | Nao | Nao | Sim (real) | Pacote W.Cartoes |
| 2 | Termo online | SGO_Fin_Termos.js, JS_Fin_Termo.html | Pronto/NAO testado prod | Sim | Nao | Nao | Sim | Pacote W.Termos |
| 3 | Recargas | SGO_Fin.js, JS_Fin_Cartoes.html | Homologado DEV | Sim | Nao | Nao | Sim | Pacote W.Recargas |
| 4 | Lancamentos / prestacao | SGO_Fin.js, JS_Fin_Cartoes.html | Homologado DEV | Sim | Nao | Nao | Sim | Pacote W.Lanc |
| 5 | Extratos Flash — importacao | SGO_Fin_Extratos.js, JS_Fin_Cartoes.html | **DEV HOMOLOGADO** | Sim* | Parcial** | Nao | XLSX real | **Pacote W** |
| 6 | Conciliacao Flash | SGO_Fin.js, JS_Fin_Cartoes.html | Parcial (preview ok, acao bloqueada) | Nao ainda | SIM (FIN.8C) | Parcial | Sim | **FIN.8** |
| 7 | Pendencias Flash | SGO_Fin.js, JS_Fin_Cartoes.html | Parcial (preview ok, gerar bloqueado) | Nao ainda | SIM (FIN.8B) | Parcial | Sim | **FIN.8** |
| 8 | Dashboard Flash | SGO_Fin.js, JS_Fin_Cartoes.html | Pronto (backend), UI ativa | Sim* | Nao | Nao | Sim | Pacote W |
| 9 | Relatorios Flash | SGO_Fin.js, JS_Fin_Cartoes.html | Pronto (backend), UI ativa | Sim* | Nao | Nao | Sim | Pacote W |
| 10 | Logs / auditoria | SGO_Fin.js, SGO_Fin_Setup.js | Estrutura pronta | Sim* | Nao | Nao | Sim | Pacote W |
| 11 | Alertas FIN | SGO_Fin.js | Nao mapeado em detalhe | Pendente | Pendente | Pendente | Sim | FIN.9 |
| 12 | Documentos FIN | (nao implementado) | Pendente | Nao | SIM | SIM | Sim | FIN.10 |
| 13 | Integracao OS/CUE | (nao implementado) | Nao definido | Nao | Pendente | SIM | Sim | FIN.11+ |
| 14 | Portal publico termo | JS_Fin_Termo.html, SGO_Fin_Termos.js | Pronto/NAO testado prod | Sim | Nao | Nao | Sim | Pacote W |
| 15 | Permissoes/checklist prod | SGO_Fin_Extratos.js | Pronto (funcoes SEM_GRAVAR) | Sim | Nao | Nao | Nao | — |
| 16 | Rotas WebApp | SGO_Main.js | Presumidamente ativas | Sim* | Nao | Nao | Nao | — |
| 17 | Setup / schema | SGO_Fin_Setup.js | Pronto (12 abas) | Sim (nao re-executar) | Nao | Nao | Nao | — |
| 18 | UI importacao Flash (botao) | JS_Fin_Cartoes.html | Parcial — botao disabled "FIN.11.4" | Nao | SIM (FIN.11.4) | Nao | Nao | FIN.11.4 |

*Requer deploy de producao.
**Botao de importacao definitiva e placeholder — a acao real e feita manualmente via editor /dev.

---

## Detalhe por submódulo crítico

### 5. Extratos Flash — importacao

**Estado:** DEV homologado. Backend pronto. UI parcial (botao de importacao definitiva desabilitado).

**O que ja funciona:**
- Preview XLSX (via upload na UI)
- Dry-run na UI
- Pre-confirmacao na UI
- Preparacao de payload na UI
- Geracao de pacote de autorizacao
- Geracao de payload limpo copiavel
- Auditoria final antes da execucao
- Checklist pos-execucao

**O que nao funciona ainda:**
- Botao de importacao definitiva na UI (desabilitado — placeholder "FIN.11.4")
- Execucao real em producao (requer Pacote W + deploy)

**Funcoes principais (SGO_Fin_Extratos.js):**
- `finImportarLoteExtratoFlashV1` — real, linha 491
- `EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE` — DEV, linha 3987
- Todas as SEM_GRAVAR — linhas 52 a 4300+

---

### 6. Conciliacao Flash

**Estado:** Parcial. Preview funcional. Acao de conciliar bloqueada intencionalmente.

**O que ja funciona:**
- `finFlashPrevisualizarConciliacaoTela` (SGO_Fin.js:1235) — lista extratos + lancamentos candidatos a conciliacao
- Botao "Ver previa conciliacao" na UI chama `google.script.run.finFlashPrevisualizarConciliacaoTela` (JS_Fin_Cartoes.html:2522)
- `finFlashConciliarSelecionadosTela` existe no backend (SGO_Fin.js)
- Listagem de conciliacoes: `finFlashListarConciliacoes` (SGO_Fin.js:2067)

**O que esta bloqueado:**
- Botao "Conciliar selecionados" chama `finFlashAcaoRealNaoHabilitada_('Conciliar selecionados')` — intencional
- Nenhum checkout de conciliacao real pode ser feito pela UI atual

**Falta:**
- Ativar botao de conciliar selecionados com trava de confirmacao
- UI de selecao de pares extrato/lancamento
- Feedback visual de conciliacao realizada
- Rollback/desfazer conciliacao

---

### 7. Pendencias Flash

**Estado:** Parcial. Preview funcional. Geracao e resolucao parcialmente implementadas.

**O que ja funciona:**
- `finFlashPrevisualizarPendenciasTela` (SGO_Fin.js:1297) — lista pendencias
- Botao "Ver pendencias" na UI chama `google.script.run.finFlashPrevisualizarPendenciasTela` (JS_Fin_Cartoes.html:2553)
- `finFlashResolverPendenciaTela` existe e e chamada pela UI quando usuario abre detalhe de pendencia
- `finFlashAuditarPendenciasTela` existe para auditoria

**O que esta bloqueado:**
- Botao "Gerar pendencias" chama `finFlashAcaoRealNaoHabilitada_('Gerar pendencias')` — intencional
- Geracao automatica de pendencias (FIN.8B) nao esta ativa

**Falta:**
- Ativar geracao de pendencias com confirmacao
- UI de filtros de pendencias por tipo/status
- Notificacoes/alertas de pendencias

---

### 8. Dashboard Flash

**Estado:** Pronto no backend. UI ativa com botoes funcionais.

**O que ja funciona:**
- `finFlashObterDashboardGerencial` — dashboard gerencial
- `finFlashGerarRelatorioSintetico` — relatorio sintetico
- `finFlashObterResumoTela` — resumo para tela
- KPIs na UI: lotes, extratos, conciliados, nao conciliados, pendencias, debitos, creditos, saldo, % conciliado
- Botoes "Atualizar dashboard" e "Gerar relatorio sintetico" na UI

**Falta:**
- Dados reais em producao para validar KPIs
- Grafico de tipo de transacao, status de conciliacao, tipo de pendencia, maiores valores (divs presentes mas precisam de dados reais)

---

## Resumo de prioridades para producao Flash

| Prioridade | Item | Dependencia |
|-----------|------|------------|
| 1 | Deploy de producao | Nova autorizacao |
| 2 | Pacote W — importacao real producao | XLSX real + deploy |
| 3 | Validacao visual producao | Apos Pacote W |
| 4 | FIN.8 — Ativar conciliacao e pendencias | Apos dados reais em prod |
| 5 | FIN.11.4 — Botao de importacao na UI | Apos validacao completa |
| 6 | FIN.10 — Documentos FIN | Baixa prioridade |

---

## O que NENHUMA funcao faz no momento

- Gerar pendencias automaticamente (bloqueado)
- Conciliar automaticamente (bloqueado)
- Importar extrato pela UI (botao disabled)
- Notificar por email sobre pendencias (nao implementado)
- Integracao com OS (nao implementado)
