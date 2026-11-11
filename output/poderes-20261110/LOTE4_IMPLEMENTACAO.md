# Acessos por caixas — Lote 4: Aprovação de relatório técnico (implementação)

Implementação de 11/11/2026, só no candidato local `output/poderes-20261110/base/legado`. **Nada foi publicado**, não houve acesso ao servidor (sem ssh) e não houve `git commit`. Cópia do legado antes da mudança: `output/poderes-20261110/lote4-antes-legado` (referência da equivalência e da suíte "antes").

Estado real: **preparado e testado localmente** (vm com o código real dos módulos de qualificação e as 23 contas reais). **Não publicado, não verificado em produção, sem ensaio no navegador** (ver Limites).

---

## 1. Poderes ligados

`SGO_PODERES_LIGADOS` (SGO_Poderes.js:31-36) ganhou **3 dos 4 poderes do lote 4** (total: 18 ligados):

`RELATORIO_TECNICO_APROVAR`, `RELATORIO_BAIXATEMP_APROVAR`, `RELATORIO_MODELO_ESCOLHER`.

**Não ligado (de propósito): `RELATORIO_INTERNO_SIMULADO`.** As 11 travas inventariadas dele são "só a senha do simulador (não confere perfil)", hoje reforçada pelo código por WhatsApp do dono (SGO_SimuladorCodigo.js). A regra padrão do catálogo (`ADMIN` ou a conta `bento`) **não é o espelho** dessa trava: ligá-la acrescentaria uma recusa por perfil que hoje não existe no servidor (mudança de comportamento, contra a regra "sem exceções, comportamento idêntico") e mexeria no caminho do simulador que alimenta a simulação didática, que acabou de ser publicada. A tela Acessos continua mostrando o aviso "passa a valer quando o módulo for ligado (lote 4)" para essa caixa. Decisão para o dono: se o relatório interno deve passar a exigir também a caixa (além da senha + código), é uma mudança de regra, não um espelho.

---

## 2. Motor do lote (SGO_QualifEmissao.js, CRLF preservado)

| Função | Linha | O quê |
|---|--:|---|
| `SGO_QE_caixaLigada_(sessao, codigo)` | 45 | a caixa está ligada, o motor (SGO_Poderes.js) carregado e a sessão traz a pessoa (`userId`) |
| `SGO_QE_podeCaixa_(sessao, perfis, codigo)` | 49 | `SGO_pode_` da caixa (padrão `RELATORIO_TECNICO_APROVAR`); sem motor ou sem pessoa na sessão, a lista de perfis de antes (`SGO_QE_ehAprovador_`, intacta: é a regra padrão do catálogo) |
| `SGO_QE_msgRecusa_(sessao, msgPadrao, acao, codigo)` | 54 | chamada só depois de uma recusa: pelo padrão do perfil devolve **a mensagem de antes**; por exceção NÃO, a mensagem da caixa (`SGO_poderRecusa_`: «nome», o que faz e "Administração > Acessos") |

Sessão sem `userId` (só em testes antigos): não há exceção possível, então vale a lista de perfis — idêntico ao padrão da caixa.

---

## 3. Travas trocadas (arquivo:linha no candidato)

### RELATORIO_TECNICO_APROVAR (Autoclave, Lavadora, Cadeia de frio, Estufa/Banho-maria/Secadora)

A decisão "é aprovador?" de cada módulo passou a perguntar a caixa; as ~59 travas inventariadas que usam essas funções (rascunho `podeAprovar`, listar/prever/aprovar/devolver, abrir para corrigir, gerar planilha de dados, `podeAprovarEmissao` dos pings, situação) seguem a caixa sem outra mudança.

| Arquivo:linha | Função | Antes | Agora |
|---|---|---|---|
| SGO_AutoRel_CertificadoRelatorio.js:521 | `AutoRel_acEhAprovador_` | `SGO_QE_ehAprovador_(perfisAprovadores)` | `SGO_QE_podeCaixa_` |
| SGO_AutoRel_CertificadoRelatorio.js:614 | `AutoRel_apiMontarCertificadoFinal` (emissão direta) | mensagem fixa | `SGO_QE_msgRecusa_` (o desvio `modoRelatorioSimulado` continua antes, igual) |
| SGO_AutoRel_CertificadoRelatorio.js:645 | `AutoRel_acExigirAprovador_` | mensagem fixa | `SGO_QE_msgRecusa_` |
| SGO_AutoRel_ModeloOficialNovo.js:70 / 75 | `AutoOficial_ehAprovador_` / `AutoOficial_exigirAprovador_` | perfis | caixa / mensagem da caixa |
| SGO_LavRel_CertificadoRelatorio.js:420 / 513 / 543 | `LavRel_lvEhAprovador_` / emissão direta / `LavRel_lvExigirAprovador_` | perfis | caixa |
| SGO_LavRel_ModeloOficialNovo.js:68 / 73 | `LavOficial_ehAprovador_` / `LavOficial_exigirAprovador_` | perfis | caixa |
| SGO_CadeiaFrioRel_Emissao.js:33 / 36 / 233 | `CadeiaFrioRel_ehAprovador_` / `CadeiaFrioRel_exigirAprovador_` / `CadeiaFrioRel_apiEmitirRelatorio` | perfis | caixa (`CadeiaFrioOficial_ehAprovador_` delega a ela) |
| SGO_CadeiaFrioRel_ModeloOficial.js:54 | `CadeiaFrioOficial_exigirAprovador_` | mensagem fixa | mensagem da caixa |
| SGO_EstufaBanhoRel_Qualif.js:121 / 1033 / 1061 | `EstufaQ_ehAprovador_` / `EstufaQ_apiEmitir` / `EstufaQ_exigirAprovador_` | perfis | caixa (o desvio `SIMULADO_ADMIN` continua antes, igual) |
| SGO_EstufaBanhoRel_ModeloOficialNovo.js:49 | `EstufaOficial_exigirAprovador_` | mensagem fixa | mensagem da caixa |
| SGO_QualifEquipamento.js:575-590, 614 | `SGO_QEQ_nomesDosPerfis_` (+ `SGO_QEQ_temCaixa_`) no diagnóstico "o que falta" | nomes de quem tem o perfil | **nomes de quem tem a caixa** (padrão + exceções SIM, sem as NÃO); texto igual ("responsável técnico (nomes), perfis …") |

Usos que seguem a caixa sem edição (chamam as funções acima): SGO_AutoRel_Main.js:110, SGO_LavRel_Main.js:105, SGO_CadeiaFrioRel_Main.js:148 (`podeAprovarEmissao`); SGO_AutoRel_PlanilhaDados.js:1272, SGO_LavRel_PlanilhaDados.js:619, SGO_CadeiaFrioRel_PlanilhaDados.js:474, SGO_EstufaBanhoRel_PlanilhaDados.js:203; AutoOficial/LavOficial/EstufaOficial/CadeiaFrioOficial `apiSituacao`, `apiEquipamento`, `apiGerarRascunho`, `apiListarAprovacoes`, `apiAbrir`; SGO_EstufaBanhoRel_Qualif.js:994/1008/1065.

### RELATORIO_BAIXATEMP_APROVAR (SGO_BaixaTemp_Main.js, finais de linha mistos preservados)

| Linha | Função | Antes | Agora |
|--:|---|---|---|
| 162 | `BaixaTemp_apiPing.podeAprovar` | `PERFIS_APROVADORES.indexOf(perfil)` | `BaixaTemp_podeAprovar_(sessao)` |
| 495-502 | `BaixaTemp_podeAprovar_`, `BaixaTemp_msgRecusaAprovar_` (novas) | — | caixa; sem o motor, a lista de antes |
| 503-506 | `BaixaTemp_exigirAprovador_` (aprovar 511, devolver 528) | perfis | caixa; **"quem elaborou não aprova" mantido como proteção fixa** |

### RELATORIO_MODELO_ESCOLHER

| Arquivo:linha | Função | Antes | Agora |
|---|---|---|---|
| SGO_AutoRel_ModeloOficialNovo.js:555 / 563 | `apiSituacao.podeAlterarModelo` / `AutoOficial_apiDefinirModelo` | `perfil === 'ADMIN'` | caixa / recusa com mensagem de antes ou da caixa |
| SGO_LavRel_ModeloOficialNovo.js:551 / 559 | idem Lavadora | idem | idem |
| SGO_EstufaBanhoRel_Qualif.js:994 / 1000 | `EstufaQ_apiSituacao` / `EstufaQ_apiDefinirModelo` | idem | idem |
| SGO_CadeiaFrioRel_Emissao.js:322 | `CadeiaFrioRel_apiDefinirModelos` | idem | idem |

### Tela

Sem mudança de HTML: as telas já decidiam pelos sinais do servidor (`podeAprovar`, `podeAprovarEmissao`, `podeAlterarModelo`) — JS_TemplateAutoclave.html, JS_TemplateLavadora.html, SGO_*_ConteudoModulo.js (Autoclave, Lavadora, Cadeia de frio, Estufa) e SGO_BaixaTemp_Tela.js. Esses sinais agora vêm da caixa; a recusa continua sempre no servidor. A tela Acessos mostra as 3 caixas como ligadas ("18 de 150").

---

## 4. Ajuda

- `SGO_Ajuda_Administracao.js` › **Acessos**: implantação por etapas (lote 4 ligado; relatório interno de fora), "O que muda para a equipe", parágrafo "Lote 4" em "Implantação por lotes".
- `SGO_Ajuda_Qualificacao.js`: problema "Você não tem a permissão «Aprovar relatório técnico de qualificação»" nas seções Autoclave, Lavadora, Estufa e Cadeia de frio.
- `SGO_Ajuda_BaixaTemp.js`: problema "Você não tem a permissão «Aprovar ensaio de baixa temperatura»" (quem elaborou nunca aprova).

---

## 5. Testes e placares

**`tests/poderes-lote4.test.cjs`** (novo, 5 testes) — `FASE=candidato`: **5/5**.

1. **Equivalência:** 23 contas reais × 65 ações (7 funções "é aprovador", 8 "exigir aprovador", 46 APIs de emitir/listar/prever/aprovar/devolver/abrir/situação/definir modelo nos 4 módulos, baixa temperatura ×3 incluindo "quem elaborou", diagnóstico "quem aprova"), na mesma ordem contra `lote4-antes-legado` e o candidato: **1.495 comparações, 1.226 recusas no legado, 0 funções ausentes, 0 divergências** de resultado e de mensagem (`lote4-equivalencia.txt`).
2. **Exceção NÃO:** Elisa (gestora de RH) sem `RELATORIO_TECNICO_APROVAR`/`RELATORIO_BAIXATEMP_APROVAR`: as 7 funções dizem não; 8 "exigir" + 14 APIs recusam no servidor com «Aprovar relatório técnico de qualificação» e "Administração > Acessos"; baixa temperatura com «Aprovar ensaio de baixa temperatura»; telas recebem `podeAprovar=false`; o diagnóstico deixa de citá-la; as outras caixas dela e Beatriz continuam iguais.
3. **Exceção SIM:** técnico (joaopedro) passa a aprovar nos 4 módulos e na baixa temperatura, mas nunca o ensaio que ele elaborou; aparece no diagnóstico; não ganha "escolher modelo"; Diretoria com SIM em `RELATORIO_MODELO_ESCOLHER` passa a escolher; dono com tudo; conta de fora nunca aprova.
4. **Simulação didática:** `SGO_QualifSimulacao.js` e `SGO_SimuladorCodigo.js` idênticos aos de antes e sem consulta à caixa; desvios `modoRelatorioSimulado`/`SIMULADO_ADMIN` continuam antes da trava; todas as linhas que separam simulado de oficial (`SGO_QSIM_`, `simDidatica`, `simulacaoDidatica`, `ctx.simulado`) idênticas nos 8 arquivos tocados; exceção NÃO não interfere na simulação.
5. **Tela:** 3 caixas ligadas e `RELATORIO_INTERNO_SIMULADO` não; telas usam os sinais do servidor; a página completa inclui JS_TemplateAutoclave, JS_TemplateLavadora e JS_BaixaTemp; em 8 casos (com e sem exceção) o sinal das 3 telas = a recusa do servidor; ajuda atualizada.

**`tests/poderes-lote0.test.cjs`**: 13/13 — ajustado só a lista esperada de ligados (lote 1 + lote 4). **`tests/poderes-lote1.test.cjs`**: 5/5 sem mudança.

**Suítes do lote** (candidato, antes → depois): autoclave-lavadora-pasta-uploads 2/2 → 2/2; autoclave-planilha-dados 8/8 → 8/8; autoclave-qualificacao 17/17 → 17/17; autoclave-simulado 7/7 → 7/7; lavadora-qualificacao 19/19 → 19/19; cadeiafrio-abas-horarios 9/9 → 9/9; cadeiafrio-bordas-registradores 4/4 → 4/4; cadeiafrio-emissao 9/9 → 9/9; cadeiafrio-motor 14 ok + 1 falha → igual (falha antiga); cadeiafrio-oficial 3/3 → 3/3; cadeiafrio-xlsx-hora-24h 5/5 → 5/5; estufa-oficial 2/2 → 2/2; estufa-qualificacao 20/20 → 20/20; estufa-simulado 7 ok + 14 falhas → igual (falhas antigas); baixatemp-cadastro-opcionais 2/2, baixatemp-ia-documento 6/6, baixatemp-motor 9/9, baixatemp-parser 11/11 → iguais; qualif-diagnostico-ensaios 7/7, qualif-simulacao-didatica 9/9, qualif-simulador-codigo 7/7, qualificacao-integrada 14/14, relatorios-qualificacao-cadastro 3/3 → iguais; poderes-lote0 13/13, poderes-lote1 5/5 → iguais.

**Suíte inteira** (`rodar-suite.cjs`; o "antes" rodou com as fontes apontadas para `lote4-antes-legado`):

| Fase (candidato) | Arquivos | Arquivos com falha | Testes que passaram | Testes que falharam |
|---|--:|--:|--:|--:|
| Antes do lote 4 (`lote4-antes.txt`) | 196 | 30 | 1.770 | 92 |
| Depois do lote 4 (`lote4-depois.txt`) | 197 | 30 | 1.775 | 92 |

**Nenhuma falha nova** (comparação teste a teste: 0 falhas novas, 0 sumidas). A diferença é só o arquivo novo `poderes-lote4.test.cjs` (5/5). As 92 falhas são as mesmas de antes (mesmo placar do `lote1-depois.txt`), em módulos fora deste lote (inclusive estufa-simulado e cadeiafrio-motor, que já falhavam).

`node --check` sem erro nos 15 `.js` alterados; finais de linha preservados (CRLF nos CRLF, LF em SGO_Poderes.js e SGO_Ajuda_Administracao.js, misto em SGO_BaixaTemp_Main.js); 6 nomes globais novos, nenhum repetido no legado.

---

## 6. Limites e pendências

- **Não publicado, não verificado em produção.** Testes em vm com o código real; **sem ensaio no Chromium** neste lote (as telas não mudaram de HTML; o teste confere os sinais do servidor e a inclusão na página completa).
- **`RELATORIO_INTERNO_SIMULADO` não ligado** (seção 1): exige decisão do dono, porque ligar muda a regra (hoje: senha + código do WhatsApp, sem perfil).
- **Perfil RH na casca:** exceção SIM de aprovação para alguém do perfil RH não abre as telas de qualificação se a casca RH não as listar (mesma limitação do lote 0/1).
- **Ajuda "quem pode"** continua descrevendo o padrão por perfil (ADMIN, DIRETORIA, GESTOR, METROLOGIA); a exceção por pessoa está explicada nos problemas e em Acessos.
- **Texto do diagnóstico**: os nomes vêm da caixa; o trecho "perfis …" continua mostrando a lista padrão de perfis (mesmo texto de antes).
- Os pings `AutoRel_apiPing`/`LavRel_apiPing`/`CadeiaFrioRel_apiPing` não foram executados no teste (dependem do módulo inteiro); usam as mesmas funções "é aprovador" cobertas pela equivalência.
