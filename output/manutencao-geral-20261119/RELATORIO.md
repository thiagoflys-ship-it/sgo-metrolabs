# Manutenção geral do SGO+ — 19/11/2026

Pedido do dono: mapear todo o SGO+, procurar erros, corrigir e ver se tudo se conversa. Base: produção atual (legado **cand33**, `financeiro-auditoria-20261119`). Candidato: `output/financeiro-20261116/cand34` (8 arquivos alterados). Nada foi publicado, nada foi gravado no banco de produção e nenhuma API externa foi chamada (o único ensaio no contêiner foi de leitura e foi apagado no fim).

## 1. Resumo

| Item | Situação |
|---|---|
| Fotografia diária do Financeiro (18/11 não saiu e não deixou log) | **Corrigido** (registro de avisos + refazer sozinha após reinício) |
| Rotinas do Auvo falhando a cada 15 min até 18/11 21:30 (308 + 6 + 6 erros em 7 dias) | Já resolvido em cand31; **conferido**: nenhuma rotina do Auvo na tabela `gatilhos`, nenhum erro do agendador desde 18/11 21:30 |
| Ajuda citando telas e botões do Auvo que saíram em 18/11 | **Corrigido** (4 arquivos de ajuda) |
| E-mail > abrir cliente: atalho reserva para tela inexistente (`abrir("cadastros")`) | **Corrigido** |
| Toda função chamada pelas telas existe no legado (114 funções diretas + 371 com os chamadores de módulo) | **OK** — teste novo |
| Todo menu e todo `abrir("tela")` tem tela (116 rotas) | **OK** depois da correção do E-mail — teste novo |
| Toda rotina agendada existe no legado (14 da produção + todos os `newTrigger` do código) | **OK** — teste novo |
| Caixas de Acessos usadas no código e não cadastradas | **OK** (379 caixas no catálogo; todas as usadas existem) |
| Datas UTC × Brasília | **OK** (contêiner em America/Sao_Paulo; os `toISOString().slice(0,10)` restantes trabalham em UTC de ponta a ponta ou são reserva de `Utilities.formatDate`) |
| Pendências de servidor (fora do legado) | 3 itens para o coordenador (seção 6) |

Placar da suíte: ver seção 7.

## 2. Mapa do sistema

### 2.1 Módulos (menu → tela → servidor)

| Grupo do menu | Telas | Estado |
|---|---|---|
| Principal | Início, Minhas atividades, Atividades da equipe, Avisos, Meus avisos, Assistente do ponto, E-mail | ok; E-mail corrigido (atalho do cliente) |
| Qualificação e inspeção | Autoclaves, Lavadoras, Cadeia de frio, Estufa e banho-maria, Baixa temperatura, Declaração QI/QO, NR-13, Modo personalizado | ok (erros do registro são validações com mensagem: ensaio com poucas leituras, sensor sem arquivo) |
| Calibração | Certificado, Relatório de calibração, Padrões | ok; 2 recusas de 18/11 por padrão com U95 não numérico (dado a corrigir no cadastro do padrão) |
| Documentos | Declaração de execução, PGT e POP, Registros operacionais | ok |
| Planejamento | Planejamento CME, Cronograma de execução | ok |
| Operação | Histórico do Auvo (somente consulta), Frota, Depósito de viagem, Recarga Caju | ok; Auvo só histórico; bloqueio da Frota e rastreador seguem desligados (não mexido) |
| Financeiro | Painel financeiro (Omie: visão geral, contas, conciliação, indicadores, régua, agenda, relatórios, especialista, contas fixas, pagamentos, orçamento, espelho, fechamento, trilha), Conciliação Caju | **corrigido** (fotografia diária) |
| Comercial / Ganhos | 11 telas do Comercial, Ganhos dos vendedores | ok |
| Compras | 11 telas | ok |
| Assistência técnica | 10 telas + aplicativo do técnico | ok; ajuda corrigida (botões do Auvo que saíram) |
| Licitações | 16 telas | ok (4 avisos de PNCP fora do ar em 15/11, externo) |
| Representação, Portal do cliente (12 telas), Automação predial | ok |
| Gestão | Caixa de decisões, Desempenho, Relatório do dia, Qualidade, Conduta | ok |
| Cadastros | Clientes, Unidades, Equipamentos, Ciclos da lavadora, Vínculos, Correções de cadastro, Documentos, Inventário | ok; ajuda corrigida (ligação com o Auvo) |
| Administração | Usuários, Configurações, Chaves e senhas, Segurança do acesso, Acessos, Piloto do WhatsApp, Matriz de avisos, Assistente | ok; ajuda corrigida (WhatsApp citava "chamados do Auvo") |

### 2.2 Rotinas agendadas (tabela `gatilhos`, sistema `sgo`)

| Rotina | Frequência | Função no legado | Estado |
|---|---|---|---|
| Assistencia_rotinaGatilho | 15 min | existe | ok |
| Atividades_rotinaAtrasos | 60 min | existe | ok (1 espera de trava em 16/11, isolada) |
| AutPred_rotinaPedidos | 1 min | existe | ok |
| CajuConc_rotinaGatilho | 15 min | existe | ok |
| Compras_rotinaGatilho | 15 min | existe | ok |
| Conduta_gerarRelatorioSemanalAutomatico_ | domingo 18:00 | existe | ok |
| Conduta_rotinaDiaria_ | 06:00 | existe | ok |
| Frota_rastreadorRotina | 2 min | existe | ok (rastreador desligado em Chaves; a rotina só confere) |
| **Gestao_rotinaDecisoes** | 15 min | existe | ok; dentro dela roda a **fotografia diária do Financeiro** (corrigida), relatório semanal, contas fixas, fechamento, pagamentos, resumo da Diretoria, Sedna, viagem, Recarga Caju |
| Licitacoes_rotinaAlertas | 5 min | existe | ok |
| Ponto_rotina | 5 min | existe | ok |
| SGO_comSincronizarPessoasDiario | 07:00 | existe | ok |
| SGO_comWhatsappRodada | 5 min | existe | ok |
| SGO_waPilotoResumoDiario | 18:00 | existe | ok |

As 8 rotinas `cmd*` da mesma tabela são do COMMAND (sistema `command`, descontinuado; não mexido). Rotinas do Auvo: nenhuma (retiradas em 18/11; os últimos erros foram às 21:30 de 18/11, antes da publicação da retirada). O agendador só grava no registro quando a rotina **falha**; desde 19/11 00:05 não há falha de rotina.

### 2.3 Integrações

| Integração | Estado |
|---|---|
| Omie (leitura e gravação pelo SGO+) | ok; limite de requisições às 00:40 de 19/11 (ensaios da auditoria); fotografia corrigida |
| Tuya (portões, eventos) | funciona, mas a conexão de eventos cai e volta a cada ~5 min (1.701 avisos em 7 dias) — servidor, seção 6 |
| Ponte local dos portões | ok (2 comandos "incerto" e 1 relógio do celular fora de hora em 18/11) |
| WhatsApp (oficial/piloto), e-mail, Caju, Gemini | sem erro no registro em 7 dias |
| PNCP (Licitações) | 4 avisos de serviço fora do ar em 15/11 (externo) |
| Auvo | cancelado; só histórico |

## 3. Erros reais encontrados (registro e logs, 12 a 19/11/2026)

| Grupo | Qtde (7 dias) | Causa | Impacto | Situação |
|---|---|---|---|---|
| Rotinas do Auvo: "API integration is disabled" | 320 (308 incremental + 6 reversa + 6 pendências) | Auvo desativou a API em 12/11 | log poluído; nada para o usuário | resolvido em cand31; conferido |
| **Fotografia do Financeiro de 18/11 não saiu** | 0 linhas de log | ver seção 4 | Indicadores, Régua e Agenda ficaram com a de 17/11 | **corrigido** |
| "Sessão expirada" em Frota/Conduta/Auvo_apiDispatch | 91 | quadros do Início recarregando numa aba aberta depois das 6 h de sessão | nenhum (a tela pede login) | ok; sugestão no servidor (seção 6) |
| `SGO_versaoTelas` e `comApi` recusadas para sessão de representada | 13 + 6 | o servidor recusa essas duas funções para a representada | a representada não recebe o aviso de "nova versão" nem o bate-papo | servidor (seção 6) |
| Validações com mensagem para o usuário (Conduta fora do prazo/mês fechado, Frota com abastecimento pendente ou CNH sem validade, cadastro incompleto, ensaio com poucas leituras, sensor sem arquivo, padrão sem U95) | ~40 | regra de negócio ou dado incompleto | o usuário recebe o quê/por quê/o que fazer | ok (dados a corrigir pelos responsáveis) |
| "Aplicativo do técnico: hora is not defined" | 6 (09 a 12/11) | variável sem declaração | falha no app de campo | já corrigido antes; nenhum caso depois de 12/11; conferido |
| "EACCES scandir /app/legado" + "processos não conseguem iniciar" | 37 (12/11 15:42) | permissão de arquivo numa publicação | SGO+ parado por minutos | resolvido (publicador faz `chmod 644`) |
| "Registro de acesso ao Financeiro: duplicate key abas_pkey" | 1 (16/11) | duas telas criando a mesma aba ao mesmo tempo | nenhum (registro de acesso perdido uma vez) | isolado, aba já existe |
| Lentidão (`lento`) | 951 em 2 dias | Início (pendências, resumo, alertas) 2,3–2,5 s na mediana e até 12–24 s no pico; CertCal_apiDispatch mediana 14 s, pico 63 s; Comercial_api mediana 4,2 s | espera do usuário | observação; não é defeito de função (seção 6) |

## 4. Fotografia diária do Financeiro — causa e correção

**O que aconteceu.** A fotografia é feita pela rotina da Gestão (de 15 em 15 minutos) a partir das 06:00. Ela lê o Omie em vários passos (saldos, plano de contas, ~6.200 títulos em ~31 páginas, 12 meses de pagamentos, orçamento) e guarda o que já leu **na memória do servidor**; só o ponto de parada (cursor) fica gravado. Em 17/11 levou 2 h (06:00–08:02); em 16/11, 4 h 15.

Em 18/11 o servidor foi **reiniciado a cada publicação**: 14 publicações do SGO+ entre 06:33 e 00:02 (cand19 a cand32), com intervalos de 30 a 100 minutos. Cada reinício apaga a memória e a rotina recomeça do primeiro passo; a partir das 08:00 (expediente) ela lê só 8 páginas por rodada e espera quando a tela do Financeiro está consultando o Omie. Nunca chegou ao fim. Na virada do dia o cursor de 18/11 foi descartado **sem nenhum registro**: a rotina devolvia o andamento só para o agendador, que não grava rodada bem-sucedida, e a fotografia não escrevia nada no log. Conferido em produção (ensaio de leitura): fotografia ligada, Omie configurado, horário 06:00, sem cursor nem pedido pendente, última fotografia 17/11 08:02.

**Correção (SGO_Financeiro_Foto.js).**
1. Ficam no registro do servidor, como **aviso** (sem valor em reais): o recomeço por memória perdida ("recomeçou do primeiro passo (recomeço N) … o servidor reiniciou"), a leitura do Omie que falhou e ficou de fora, e a fotografia que **não terminou no dia** ("parou em … depois de N rodada(s) e M recomeço(s)").
2. A tela (Indicadores > "Atualizar agora") diz quantas vezes a fotografia em andamento recomeçou e por quê.
3. Quando a fotografia de hoje já foi feita mas a **lista de títulos se perdeu num reinício** (Régua de cobrança, Agenda e previsão param), a rotina **refaz sozinha**, no máximo **2 vezes por dia** (origem `RECUPERACAO`), só leitura do Omie, no ritmo da rotina. Não refaz quando a fotografia de hoje já não tinha conseguido ler os títulos (a falha é do Omie). Antes, só voltava se alguém tocasse em "Pedir nova fotografia".

O desenho de sigilo foi mantido: a lista de títulos continua só na memória do servidor (nada novo em tabela). Por isso um dia com muitos reinícios entre 06:00 e o fim da fotografia ainda pode ficar sem fotografia — agora com o registro de até onde chegou (decisão pendente, seção 5).

## 5. Pendências que dependem do dono ou de dados

1. **Guardar o progresso da fotografia no banco** (códigos do Omie e valores, sem nomes) para ela sobreviver a reinícios. Hoje a regra de sigilo é "a lista de títulos nunca vai para tabela". Decisão do dono. Enquanto isso, o coordenador evita publicar entre 06:00 e 08:30 (seção 8).
2. **Padrão com U95 não numérico** (CertCal, 18/11 12:28): corrigir o cadastro do padrão em "Cadastro e validade" e anexar o PDF de novo (dado).
3. **Cadastros incompletos** que travam emissão (cliente com endereço antigo num campo só, unidade sem cidade/UF, equipamento sem modelo/série): Cadastros > Correções de cadastro (dado).
4. **Condutor com CNH sem validade** e **veículo GFU5G11 com abastecimento pendente** (Frota, 16–17/11): regularizar em Frota (dado).

## 6. Itens do servidor Node (fora do legado; para o coordenador)

1. **Tuya: conexão de eventos reabre a cada ~5 min** (1.701 avisos "eventos da Tuya: conectado" em 7 dias; 12 por hora). Conferir em `servicos/tuyaMensagens.ts` se falta o ping/keepalive do websocket; enquanto cai, um evento pode se perder. Pelo menos baixar o "conectado" para `info`.
2. **Representada**: liberar `SGO_versaoTelas` (só lê o carimbo das telas) e decidir sobre `comApi` (bate-papo) para a sessão de representada, ou fazer a tela não chamar. Hoje gera 19 avisos de segurança e a representada não recebe o aviso de nova versão.
3. **"Sessão expirada" registrada como erro** (91 em 7 dias): é o fluxo normal de sessão vencida; registrar como `aviso` para não esconder erro real.
4. Lentidão do Início (pendências/resumo/alertas em paralelo) e do CertCal: medir por ação antes de mexer (o registro `lento` não guarda a ação do dispatch).

## 7. Testes

- Novo: `tests/manutencao-geral-20261119.test.cjs` — 11 verificações: 5 da fotografia (recomeço com aviso, virada do dia com aviso, leitura que falha com aviso, recuperação sozinha com limite de 2 por dia e Régua de volta, sem recuperação quando o Omie falhou nos títulos), ajuda/manual/base do assistente, ajuda sem Auvo, atalho do E-mail, e as três estáticas de "tudo se conversa" (funções das telas, menus, rotinas). Em cand33: 8 falham, 3 passam (as estáticas que já estavam certas). Em cand34: 11/11.
- Ajustado: `tests/financeiro-cobranca-agenda.test.cjs` — a linha que exigia "já foi feita" depois de apagar a lista da memória agora exige que a rotina **não** pare (comportamento novo, intencional).
- Suíte completa (cand34, 19/11 02:37): **2698 passam, 0 falham** (298 arquivos, nenhum com saída diferente de zero; referência 2687/0 + 11 novos). A rodada `suite-base.txt` (2686/1) foi feita durante a edição e não vale como placar. Arquivo: `output/manutencao-geral-20261119/suite.txt`.

## 8. Arquivos alterados (cand33 → cand34)

| Arquivo | Mudança |
|---|---|
| `SGO_Financeiro_Foto.js` | avisos no registro (recomeço, falha de leitura, não terminou no dia); contador de recomeços no estado da tela; recuperação sozinha da lista perdida (até 2/dia, `FIN_FOTO_RECUPERACAO`) |
| `SGO_Ajuda_Financeiro.js` | "O que fazer" da lista perdida e item novo "a fotografia recomeçou" (CRLF preservado, inclusive a linha 37 que era LF) |
| `SGO_AssistenteManuais.js` | base do assistente gerada de novo por `_tools/gerar_base_assistente.cjs` (só as mudanças do manual do Financeiro) |
| `SGO_Ajuda_Assistencia.js` | sem os botões "Trazer os questionários do Auvo" e "Montar os checklists…" (saíram da tela em 18/11) |
| `SGO_Ajuda_Cadastros.js` | ligação com o Auvo só para consulta (sem "Integração Auvo") |
| `SGO_Ajuda_Principal.js` | sem a frase da sincronização de tarefas do Auvo |
| `SGO_Ajuda_Administracao.js` | WhatsApp: "chamados da Assistência" no lugar de "chamados do Auvo" |
| `JS_Email.html` | reserva de "abrir cliente" vai para a tela Clientes |

Fora do legado: `docs/MANUAL_PAINEL_FINANCEIRO.md` (parágrafo "Quando a fotografia não sai", memória do servidor e duas linhas da tabela de problemas), `tests/manutencao-geral-20261119.test.cjs` (novo), `tests/financeiro-cobranca-agenda.test.cjs` (1 linha). Fins de linha conferidos arquivo por arquivo contra cand33 (iguais). Patches: `legado-cand33-cand34.patch`, `tests-docs.patch`.

## 9. O que o coordenador faz ao publicar

1. Publicar cand34 sobre a base `financeiro-auditoria-20261119` (8 arquivos, nenhum novo). **Evitar a janela 06:00–08:30**: a fotografia do dia está sendo feita e cada reinício a faz recomeçar.
2. Depois de publicar fora da janela: se a fotografia de hoje já existia, a próxima rodada da Gestão (até 15 min) a refaz sozinha (aviso "se perdeu da memória do servidor" no registro). Conferir em `propriedades` a chave `FIN_FOTO_RECUPERACAO` e, ao fim, a fotografia em `linhas` (aba `FIN_FOTOS`, `ORIGEM = RECUPERACAO`).
3. Conferir no dia seguinte, às 08:30, que há fotografia do dia em `FIN_FOTOS` e que o registro não tem aviso "não terminou".
4. Registrar no `AGENTS.md`. Encaminhar os itens da seção 6 (servidor) e os da seção 5 (dono/dados).
