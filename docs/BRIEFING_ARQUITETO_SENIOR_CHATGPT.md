# Briefing completo — Projeto METROLABS SGO+ (para assumir como Engenheiro/Arquiteto Sênior)

Documento gerado em 2026-07-07 para dar contexto completo a um novo colaborador de IA (ChatGPT) que vai assumir papel de engenheiro sênior e arquiteto sênior deste projeto a partir de agora, em conjunto com outras ferramentas de IA (Claude Code, Codex) que também atuam neste repositório.

**Aviso importante sobre este documento:** ele é uma fotografia do estado do projeto na data acima, compilada a partir de memória de sessões anteriores e verificação pontual do código/repositório. Antes de agir sobre qualquer afirmação específica (nome de função, número de linha, status de um pacote), **confirme no código atual** — o projeto muda rápido e este briefing pode ficar desatualizado em dias.

---

## 1. Seu papel a partir de agora

Você (ChatGPT) vai atuar como **engenheiro sênior e arquiteto sênior** deste projeto, em conjunto com Claude Code e o Codex, que também têm acesso ao mesmo repositório local. Isso significa:

- Pensar em arquitetura e consequências de longo prazo, não só resolver o pedido pontual.
- Ajudar o usuário (Thiago) a decidir prioridades e sequenciamento — ele é o dono do produto, mas conta com você para trade-offs técnicos.
- Manter e atualizar o registro de decisões (este tipo de documento) conforme o projeto evolui — não deixar conhecimento só na cabeça do usuário ou perdido em conversas antigas.
- Ser conservador com o que já está em produção: o sistema está **em piloto operacional real**, com usuários de verdade. Erros aqui têm custo real.
- Quando outra ferramenta de IA (Codex) estiver em processo e for interrompida, o procedimento é: ler os documentos de log/checklist que ela deixou, não redigitar o trabalho do zero. Você deve seguir essa mesma disciplina — documentar o que faz, em lotes pequenos, para que qualquer IA (inclusive você mesmo em outra sessão) consiga retomar.

---

## 2. O que é o projeto

**METROLABS SGO+** — Sistema de Gestão Operacional integrado, 100% em **Google Apps Script** (backend `.js` executado no runtime V8 do Apps Script, frontend `.html` servido via `HtmlService`, banco de dados em **Google Sheets**, arquivos em **Google Drive**).

Não é uma stack web convencional: não há Node/Express real em produção, não há banco relacional, não há build step. `node` só é usado localmente para `--check` de sintaxe antes de subir código (não roda o app).

Domínio de negócio: gestão de **clientes, unidades, equipamentos, documentos técnicos (calibração/manutenção/inspeção)**, com módulos derivados de **Assistência Técnica**, **Frota**, **Financeiro (cartão corporativo "Flash")**, **Ordens de Serviço**, **Dashboard BI**, autenticação e controle de perfis.

Ferramenta de deploy: **`clasp`** (CLI oficial do Google para Apps Script). `clasp push` envia o projeto inteiro (não é seletivo por arquivo) — isso é uma restrição estrutural importante, ver seção 6.

---

## 3. Ambientes — a regra mais importante do projeto

Existem **três ambientes com scriptId diferentes**, e confundir um com o outro é o erro mais caro possível neste projeto:

| Ambiente | scriptId | Estado |
|---|---|---|
| **DEV** | `12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG` | Ativo. `.clasp.json` da raiz aponta para cá. Onde quase todo o desenvolvimento novo acontece. |
| **PRODUCAO_V2** | `1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y` | **Piloto operacional real em produção**, go-live em 2026-06-20 (AUTH.10O). URL pública ativa, usuários reais. |
| **PROD antigo** | `1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY` | **CONGELADO.** Não alterar, não apagar. Serve de fallback histórico. |

Cada ambiente tem seu **próprio banco de dados** (planilhas diferentes, `DB_ID` diferente por ScriptProperties). Não existe ambiente de staging automático — a promoção DEV → PRODUCAO_V2 é manual, arquivo por arquivo, com auditorias `_SEM_GRAVAR` antes de qualquer escrita real.

**Regras permanentes do piloto em PRODUCAO_V2** (não violar sem autorização explícita do usuário):
- Não liberar módulos ainda bloqueados sem etapa própria autorizada
- Não migrar dados em massa sem nova autorização
- Não apagar o PROD antigo
- Não rodar setup geral em PRODUCAO_V2
- Nunca usar `clasp push --force`
- Nunca fazer deploy de novo webapp sem pedido explícito

Módulos **liberados** no piloto PRODUCAO_V2: `DASHBOARD, OS, ASSISTENCIA_TECNICA, CLIENTES, EQUIPAMENTOS, DOCUMENTOS, REGISTROS, TECNICOS, MISSOES, CONTRATOS, RELATORIOS, FIN_CARTOES, ADMIN`.

Módulos **bloqueados** (piloto v1): `PECAS, SUBCONJUNTOS, ESTOQUE, RASTREABILIDADE, FORNECEDORES, FROTA` — controlados por `MODULOS_BLOQUEADOS_PILOTO_V1` (JS_Core.html) + `pilotoGuardBloqueado_()` (SGO_Config.js).

---

## 4. Arquitetura de arquivos

### Backend (`.js`, raiz do projeto)

Cerca de 60 arquivos. Os mais estruturais:

| Arquivo | Papel |
|---|---|
| `SGO_Main.js` | Ponto de entrada `doGet()`, config pública, totais do dashboard |
| `SGO_Auth.js` / `SGO_Auth_V2.js` | Autenticação e sessão (V2 é a versão usada no piloto atual) |
| `SGO_Config.js` | Objeto central `SGO_CFG`: identidade, banco, Drive, perfis, motores, status, guard de módulos bloqueados |
| `SGO_Data.js` | CRUD genérico sobre Google Sheets (`getAll`, `insert`, `update`, `remove`, `findMany`) |
| `SGO_Setup.js` / `SGO_Setup_v2.js` | Setup idempotente de abas + **centenas de funções de auditoria `_SEM_GRAVAR`** (ver seção 6) |
| `SGO_AssistenciaTecnica.js` | Módulo de Assistência Técnica V2 (rebuild completo, ~5000+ linhas) |
| `SGO_Frota.js`, `SGO_DashboardBI.js`, `SGO_Fornecedores.js` | Módulos operacionais menores |
| `SGO_Fin.js`, `SGO_Fin_Extratos.js`, `SGO_Fin_Setup.js`, `SGO_Fin_Termos.js`, `SGO_Fin_Provisionamento.js` | Módulo Financeiro "Cartão Flash" **legado/v1** — em produção |
| `SGO_Fin_FlashV2.js`, `SGO_Fin_FlashV2_Setup.js` | Módulo Financeiro **V2** — reconstrução isolada, **só em DEV**, não promovida a produção ainda |
| `SGO_DocumentFactory.js`, `SGO_Documentos.js`, `SGO_QRCode.js`, `SGO_Validacao.js` | **Zona documental protegida** — geração de PDF, QR code, validação pública de documentos. Mudanças aqui exigem cuidado extra (ver seção 7). |
| `SGO_IA.js` | Camada de integração com IA (ex.: categorização de gastos no Flash) |

### Frontend (`.html`)

`Index.html` é o template principal (shell, login, topbar, sidebar). Cada módulo tem seu próprio `JS_*.html` (ex.: `JS_AssistenciaTecnica.html`, `JS_Fin_FlashV2.html`, `JS_Frota.html`). `UI_Estilos.html` é o design system global (variáveis CSS, componentes) — atualmente em processo de migração visual (ver seção 8). `Validacao_Documento.html` é a única página pública sem login (validação de QR/token de documento).

### Banco de dados (Google Sheets)

Não há um banco único — há **múltiplas planilhas por domínio**, cada uma com seu próprio ID configurado via `ScriptProperties`:
- Banco principal (cadastros, equipamentos, documentos, usuários)
- `DB_FIN_ID` — banco do módulo Financeiro legado
- Banco próprio do FIN_FLASH_V2 (12 abas `FIN_FLASH_V2_*`, isolado)
- `DB_OS_ID`, `DB_FROTA_ID`, `DB_ESTOQUE_ID`, etc.

Convenção de campos: `ID` (UUID), `CRIADO_EM` (ISO), `STATUS` (ATIVO/INATIVO/PENDENTE/BLOQUEADO). Cuidado: nomes de campo de data não são uniformes entre módulos (ex.: `DOC_DOCUMENTOS` usa `DATA_VENCIMENTO`, `REG_TECNICO` usa `DATA_VALIDADE` — não são a mesma coisa).

---

## 5. Estado atual dos módulos e iniciativas em andamento

### 5.1 Módulo Financeiro "Cartão Flash" — legado (v1), em produção

Em produção via PRODUCAO_V2. Última marca conhecida: **FLASH.9.3 concluído em DEV (2026-06-25)** — conciliação real, geração automática de pendências, IA de categorização de gastos. Push para DEV feito; **push/deploy para PRODUCAO_V2 estava pendente de autorização** na última atualização de memória. Antes disso, evoluiu por dezenas de pacotes incrementais (FLASH.2 a FLASH.9), sempre com o padrão auditoria-antes-de-executar descrito na seção 6.

**Ação recomendada:** confirmar com o usuário se FLASH.9.1-9.3 já foi promovido a PRODUCAO_V2 ou ainda está pendente — isso muda o que é seguro tocar.

### 5.2 Módulo Financeiro "Flash V2" — reconstrução isolada, só em DEV

Reconstrução completa e paralela do módulo de cartão corporativo, **isolada do módulo legado** (schema próprio `FIN_FLASH_V2_*`, arquivos próprios). Evoluiu de V2.0 até **V2.16G** (última fechada e commitada: commit `d27f049`, pushed ao DEV). Inventário completo e atualizado vive em `docs/INVENTARIO_FIN_FLASH_V2.md`.

Pontos centrais:
- Regra de ouro: **nunca tocar PRODUCAO_V2 a partir deste trilho** — trabalho 100% em DEV até decisão explícita de promoção.
- Padrão de segurança: toda ação de escrita real é gated por uma auditoria `_SEM_GRAVAR` (só leitura/simulação) seguida de uma função `_AUTORIZADO(token)` que exige uma frase de confirmação exata como parâmetro.
- Já resolveu uma classe recorrente de bug: comparação de CPF sem normalizar (`===` bruto entre `number` e `string` perdendo zero à esquerda) apareceu em pelo menos 5 funções diferentes ao longo do tempo (V2.14, V2.16). Qualquer função nova que compare CPF **deve** usar `FIN_FLASH_V2_normCpf_`.
- V2.16G corrigiu 2 bugs P0 encontrados por uma auditoria sistêmica (V2.16F): cartões some do extrato quando filtrados por período (deveriam ser estáticos), e relatórios A4 mostravam "período: — a —" em vez do período real.
- **Pendente no momento deste briefing:** validação humana real no navegador do resultado da V2.16G (não só teste automatizado) antes de decidir o próximo pacote (V2.16H trataria "Recarga", que ainda não tem fluxo real de criação nesta versão V2).
- Existem **4 famílias de backend paralelo** (Extrato, Dashboard, Conferência, Pendências) que ainda não foram consolidadas — risco arquitetural conhecido e documentado, não ainda endereçado.

### 5.3 Rebuild do módulo Assistência Técnica

Rebuild completo aprovado com banco zerado (dados antigos viram `AST_ENTRADAS_LEGADO`, congelado). Escopo: 8 tabelas (`AST_ATENDIMENTOS`, `AST_HISTORICO`, `AST_FOTOS`, `AST_ACESSORIOS`, `AST_ASSINATURAS`, `AST_SOLICITACOES`, `AST_DOCUMENTOS`, `AST_ALERTAS`). Terceiros/Laboratório ficaram fora desta fase (código legado preservado). 21 status padronizados cobrindo o fluxo Entrada → Diagnóstico → Orçamento → Execução → Entrega. Tela de triagem antiga foi removida. Regra explícita do usuário: **"NÃO FAZER REMENDO"** — tratar o código atual como legado congelado, sempre trabalhar dentro da estrutura por etapas do rebuild.

Dois QR codes propositalmente separados: um de acompanhamento público de fase, outro de validação documental oficial (vinculado a hash/token via `SGO_Validacao`).

### 5.4 Módulo ORC (Orçamentos / Mini-CRM) — schema aprovado, push suspenso

Schema ORC 1.2 aprovado tecnicamente (13 abas: `ORC_ORCAMENTOS`, `ORC_ITENS`, `ORC_TEMPLATES`, `ORC_APROVACOES`, `ORC_LEADS`, etc.), mas **push para o Apps Script nunca foi feito** — `setupOrcamentosV2()` nunca foi executado, o banco `DB_COMERCIAL` ainda não existe. Motivo da suspensão: o workspace tinha esse trilho misturado com o rebuild de Assistência Técnica no mesmo diff, e `clasp push` não é seletivo (envia tudo ou nada) — decisão do usuário foi não subir os dois miscigenados sem separação clara.

**Antes de mexer neste módulo:** confirmar se o workspace ainda está misturado (`git diff --name-only`) e se o schema ORC 1.2 ainda reflete a decisão mais recente.

### 5.5 Go-live PRODUCAO_V2 (AUTH.10 series)

Execução de 2026-06-20: promoção controlada de DEV para um ambiente PRODUCAO_V2 novo (não era swap de ambiente existente — foi criação de projeto novo, cópia de arquivos via REST API, auditoria, e só depois primeiro deploy). Documentado passo a passo como AUTH.10A até AUTH.10O. Padrão a repetir em qualquer promoção futura: sempre por auditoria `_SEM_GRAVAR` antes de qualquer escrita, sempre preservando o PROD antigo intocado.

### 5.6 Migração visual "METROLABS Comfort Dark" — EM ANDAMENTO, INCOMPLETA (trabalho do Codex)

Iniciativa em curso no momento deste briefing, conduzida por outra instância de IA (Codex/OpenAI) no mesmo repositório. Objetivo: aplicar um novo tema visual ("METROLABS Comfort Dark — paleta ergonômica") nas telas operacionais do portal, **preservando integralmente** qualquer layout documental (PDFs, QR, validação pública, impressão A4).

**Estado no momento deste briefing:**
- Processo parou no meio por limite de uso da ferramenta, não por conclusão.
- Nada foi commitado nem enviado via `clasp push` — mudanças existem só no working tree local.
- Arquivos alterados até agora: `Index.html`, `JS_AssistenciaTecnica.html`, `JS_Core.html`, `JS_DashboardBI.html`, `JS_Fin_FlashV2.html`, `JS_Fin_Prestacao.html`, `JS_Frota.html`, `JS_Missoes.html`, `SGO_AssistenciaTecnica.js`, `SGO_DashboardBI.js`, `SGO_Fornecedores.js`, `SGO_Frota.js`, `UI_Estilos.html`. Sintaxe validada (`node --check` + parse de scripts inline) sem erros.
- Zona protegida (documentos/QR/validação) **não foi tocada** — verificado.
- Log de execução detalhado em 3 arquivos:
  - `docs/AUDITORIA_GLOBAL_SGO_QUALIDADE_20260707.md`
  - `docs/AUDITORIA_LAYOUT_METROLABS_COMFORT_20260707.md`
  - `docs/MIGRACAO_LAYOUT_METROLABS_DARK_COMPACT.md` (tem um checklist com itens `[x]`/`[ ]` — os `[ ]` são o trabalho pendente)
- Itens pendentes do checklist: auditar `Index.html` por completo, auditar `JS_*.html` por blocos de impressão/documento, validar globalmente que nenhum documento/relatório/validador foi alterado, aplicar o "lote 3" nos módulos mistos.
- Diretório `_tmp_metrolabs_model/` é uma cópia de referência de outro projeto Apps Script usado só para estudar a paleta — não faz parte do projeto real, já excluído via `.claspignore`.

**Se você (ChatGPT) for continuar este trabalho:** leia os 3 arquivos acima primeiro, siga o checklist pendente, e feche cada lote com commit git separado antes de continuar (isso ainda não estava sendo feito e é a lição aprendida desta interrupção — ver seção 9).

### 5.7 Backlog aprovado: IA + Português BR (sequência obrigatória, NÃO executar em lote)

Diretriz aprovada pelo usuário em 2026-05-06, ainda válida como regra global:
1. Finalizar e validar o PDF premium da OS em `/dev`
2. Revisão de português BR **restrita ao módulo OS** (`JS_OS.html`, `JS_OS_Execucao.html`, `JS_Mobile.html`, `SGO_DocumentFactory.js`, `Validacao_Documento.html`)
3. Criar camada `SGO_IA.js` (já existe — verificar se este passo foi concluído)
4. Adicionar botões de IA só nos campos prioritários da OS
5. Só depois expandir para outros módulos

Regras absolutas desta diretriz: nunca alterar nomes internos/status de banco/colunas/funções como efeito colateral de correção de texto; nunca colocar chave de API no frontend; nunca salvar texto gerado por IA sem confirmação do usuário; nunca fazer varredura global fora desta ordem sem autorização explícita.

**Nota de tensão:** a migração visual do Codex (seção 5.6) já está fazendo correções de português em vários módulos simultaneamente (Frota, Assistência Técnica, Missões, Dashboard, etc.), o que diverge desta sequência restrita aprovada em 2026-05-06. Vale confirmar com o usuário se essa diretriz antiga ainda está em vigor ou se foi substituída pela auditoria global mais recente.

---

## 6. Padrões técnicos obrigatórios neste projeto

### 6.1 Padrão IIFE para módulos financeiros

`SGO_Fin.js` (IIFE `SGO_FIN`) e `SGO_Fin_Termos.js` (IIFE `SGO_FIN_TERMOS`) encapsulam suas funções auxiliares como **privadas** (`finAll_`, `finLog_`, `finGetById_`, `finInsert_`, `finUpdate_`, `finSessao_`, `finOk_`, `finErro_`, etc.). Elas **não existem no escopo global** — só o que está no `return {}` do IIFE é exposto.

**Padrão obrigatório para adicionar qualquer função nova nesses módulos:**
1. Implementar como função nomeada **dentro** do IIFE, antes do `return {}`
2. Usar as constantes `ABAS.*` já existentes em vez de strings hardcoded
3. Exportar no `return { ..., novaFuncao }`
4. Criar wrapper global **depois** do `})()`: `function finFlashNovaFuncao(...) { return SGO_FIN.novaFuncao(...); }`

Auditorias em `SGO_Setup_v2.js` não podem chamar essas funções privadas — usam `SpreadsheetApp` diretamente ou um helper leitor dedicado (ex.: `finAudit3LerAba_`).

### 6.2 Padrão de segurança para escrita real: `_SEM_GRAVAR` → `_AUTORIZADO`

Praticamente toda operação que grava dados de forma irreversível neste projeto segue este ciclo:
1. **Auditoria `_SEM_GRAVAR`** — só leitura, mapeia o estado atual, calcula o que *seria* feito, nunca escreve.
2. **Preview/preparação** (às vezes uma segunda função `_SEM_GRAVAR` ou `PREPARAR_*`) — monta o payload exato da mudança para revisão humana.
3. **Execução `_AUTORIZADO(payload)`** — só executa se receber um **token de confirmação textual exato** (ex.: `"AUTORIZO_ZERAR_CARTOES_FLASH34_INATIVANDO_TODOS"`), normalmente dentro de `LockService.getScriptLock()` para evitar concorrência, e **revalida o estado ao vivo** dentro do lock antes de gravar (nunca confia só na auditoria anterior).
4. **Auditoria pós-execução** — confirma que o resultado bate com o esperado e sinaliza se está pronto para o próximo pacote.

Esse padrão existe porque o projeto já teve bugs de duplicidade e concorrência em dinheiro real (cartões corporativos). **Não pule etapas deste ciclo ao implementar qualquer operação financeira ou destrutiva.**

### 6.3 `clasp` — armadilhas conhecidas

- **`clasp push` envia o projeto inteiro** (não é seletivo por arquivo/módulo). Nunca assuma que dá para subir só uma parte do workspace — se há dois trilhos de trabalho misturados e não revisados juntos, **não faça push** até separar ou validar os dois.
- **`--user` é uma flag global do clasp**, vai *antes* do subcomando: `clasp --user <perfil> --json run <funcao>`. Colocá-la depois (`clasp run <funcao> --user <perfil>`) é silenciosamente ignorada, cai no perfil "default" e pode aparentar (incorretamente) um bloqueio de permissão da Execution API/GCP quando na verdade é só a flag no lugar errado.
- **`clasp push` pode retornar `Skipping push.` silenciosamente** mesmo sem `--force` e sem erro visível, se houver qualquer arquivo chamado `appsscript.json` em subpastas não excluídas do `.claspignore` (ex.: cópias de projetos legados). O clasp compara todo arquivo com esse nome contra o remoto; se não bater, tenta confirmar sobrescrita do manifest — em modo não interativo isso aborta o push inteiro sem explicação clara. Nunca resolva isso com `--force`; resolva excluindo a pasta ofensora no `.claspignore`.
- **`HtmlService.createHtmlOutputFromFile(...).getContent()` remove comentários JS (`//...`)** do conteúdo servido, mesmo que o arquivo fonte tenha o comentário intacto. Qualquer auditoria que faça `html.indexOf('marcador')` para verificar presença de um trecho de frontend **não pode usar um comentário como marcador** — precisa usar um token de código real.
- Antes de qualquer push, é hábito estabelecido no projeto rodar: `git diff --name-only`, `git diff --check`, confirmar ausência de alterações na zona documental protegida, e só então `clasp push`.

### 6.4 Zona documental protegida — cuidado redobrado

Estes arquivos/fluxos geram documentos oficiais (PDF, QR, validação pública, impressão A4) e **não devem receber mudanças visuais/estruturais "de passagem"** durante refactors ou correções de texto genéricas:
`SGO_DocumentFactory.js`, `SGO_Documentos.js`, `SGO_QRCode.js`, `SGO_Validacao.js`, `Validacao_Documento.html`, e qualquer bloco com `@media print`, `window.print`, `MimeType.PDF`, `DriveApp.createFile`, `iframe.srcdoc`, HTML A4, "comprovante", "termo", "certificado", "relatório emitido". Vários arquivos são **mistos** (tela operacional + preview documental no mesmo arquivo, ex. `JS_AssistenciaTecnica.html`) — qualquer mudança nesses precisa ser feita bloco a bloco, nunca com find-and-replace global.

---

## 7. Regras invioláveis do projeto (across all módulos)

- Nunca alterar `PROD antigo` (script congelado).
- Nunca fazer `clasp push --force`.
- Nunca fazer deploy de novo webapp sem pedido explícito do usuário.
- Nunca migrar dados em massa ou rodar setup geral em PRODUCAO_V2 sem autorização explícita.
- Nunca colocar chave de API no frontend.
- Nunca salvar texto gerado por IA sem confirmação humana.
- Nunca aprovar gasto financeiro automaticamente via IA — IA só sugere/categoriza, decisão final é humana.
- Nenhum gasto sem comprovante no fluxo financeiro.
- Nunca usar `prompt()`/`confirm()` nativos do navegador nas telas do projeto (convenção de UX do time).
- Toda ação relevante deve gerar log/auditoria rastreável.
- Antes de escrever qualquer função nova em módulo financeiro: seguir o padrão IIFE (seção 6.1) e o padrão `_SEM_GRAVAR`/`_AUTORIZADO` (seção 6.2).

---

## 8. Estado do git no momento deste briefing (2026-07-07)

- Branch `master`, sincronizada com `origin/master`.
- **15 arquivos modificados sem commit** — trabalho do Codex descrito na seção 5.6 (migração visual + correções de português), validado sintaticamente mas incompleto.
- **Vários arquivos novos não versionados**: `docs/AUDITORIA_GLOBAL_SGO_QUALIDADE_20260707.md`, `docs/AUDITORIA_LAYOUT_METROLABS_COMFORT_20260707.md`, `docs/MIGRACAO_LAYOUT_METROLABS_DARK_COMPACT.md`, `docs/layouts/LAYOUT_PADRAO_METROLABS_DARK_COMPACT.md`, `docs/manual_portal_sgo_cnpj_db/` (manual em construção, 16 arquivos), `_tmp_metrolabs_model/` (referência externa, ignorada no clasp).
- Não há push nem deploy pendente aplicado a nenhum ambiente a partir deste diff.
- 201 commits no histórico total do projeto.

---

## 9. Lição operacional desta sessão (aplicar daqui pra frente)

O Codex parou no meio de uma tarefa longa por limite de uso da ferramenta. A recuperação só foi possível porque ele documentou seu progresso em arquivos `.md` detalhados por lote, com escopo, proteções e validação de cada etapa. Isso funcionou como "memória externa" substituindo a memória de sessão perdida.

**Regra a partir de agora, para qualquer IA trabalhando neste projeto (você incluso):**
1. Para qualquer tarefa que envolva múltiplos arquivos ou múltiplas etapas, **feche cada lote com um commit git separado**, não deixe tudo acumulado sem commit até o fim — se o processo for interrompido, o trabalho até ali fica seguro e recuperável via `git log`, não só via markdown solto.
2. Documente decisões arquiteturais e o estado de iniciativas em andamento (como este arquivo) — não confie que a próxima sessão (sua ou de outra ferramenta) vai lembrar do contexto.
3. Nunca faça `clasp push`/deploy sem que o usuário revise e autorize explicitamente, mesmo que o código esteja sintaticamente correto.

---

## 10. Perguntas em aberto para alinhar com o usuário antes de agir

- FLASH.9.1-9.3 (módulo Financeiro legado) já foi promovido a PRODUCAO_V2 ou ainda está pendente de autorização?
- A migração visual Comfort Dark (Codex) deve continuar agora, e por qual ferramenta (você, Claude Code, ou o próprio Codex retomando)?
- A diretriz de 2026-05-06 (sequência restrita IA + Português BR só no módulo OS) ainda está em vigor, ou foi substituída pela auditoria global de qualidade mais recente?
- O módulo ORC (Orçamentos) — ainda é prioridade, ou foi deprioritizado depois do rebuild de Assistência Técnica?
- V2.16H (Recarga no FIN_FLASH_V2) já tem decisão de produto, ou ainda está em aberto?
