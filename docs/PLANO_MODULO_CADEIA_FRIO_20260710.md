# Plano — Módulo Cadeia de Frio (SGO+ / Portal CNPJ-DB)

Documento de continuidade. Objetivo: registrar o plano completo decidido em 2026-07-10 antes de uma pausa, para retomada na manhã seguinte sem perda de contexto.

**Antes de agir sobre qualquer detalhe aqui: confirme no código atual.** Este documento é uma fotografia de 2026-07-10, ainda **nenhum arquivo de código foi criado** — é só o plano.

---

## 0. Contexto e urgência

- Usuário precisa começar a **gerar relatórios reais nesse módulo já na segunda-feira** (2026-07-13).
- Retomada prevista: manhã de domingo (2026-07-11), sessão focada.
- **Estimativa honesta**: construir o motor inteiro (não é um port, é um motor novo no mesmo padrão da Autoclave) é equivalente em esforço a uma sessão completa de port/construção — como as que já geraram Autoclave/Lavadora/Carta de Conformidade nativos em um dia. Dá para ter uma primeira versão testável (perfis mais comuns + distribuição em vazio/com carga) rodando em DEV até domingo à noite. Cobrir TODOS os perfis (freezer/ultrafreezer) + abertura de porta + queda de energia + caixa térmica com validação humana completa até segunda de manhã é apertado, mas viável se domingo for produtivo.
- **RESPONDIDO pelo usuário em 2026-07-10**: prioridade é **Câmara de Conservação (vacina), 2-8°C**, com **todos os três estudos**: distribuição 24h (o mais usado, prioridade #1 dentro da prioridade), abertura de porta **semi-aberta** (não a versão "total"), e simulação de queda de energia. Os demais equipamentos (refrigerador comum, câmara fria, freezer, ultrafreezer, caixa térmica) **ficam para depois** — não fazem parte da entrega de segunda. Construir a arquitetura genérica (ela já nasce cobrindo todos os perfis, conforme seção 2), mas o *trabalho de validação/teste real* de domingo deve focar 100% em Câmara de Conservação + os 3 estudos acima.

---

## 1. Referência de estudo — Norma ABNT NBR 16328:2023

Norma de qualificação térmica (temperatura/pressão/umidade) para autoclaves, lavadoras/termodesinfectoras, estufas, **refrigeradores/freezers/câmaras frias/ultrafreezers (Anexo G)**, câmaras climáticas, banho-maria, lavadoras ultrassônicas, liofilizadores, tanques/reatores, túneis, estufa a vácuo.

Pontos-chave usados neste plano:
- **Anexo G** (refrigeradores/freezers/câmaras frias/ultrafreezers): G.4 distribuição em vazio, G.5 distribuição com carga, G.6 abertura de porta, G.7 queda de energia. Todos com registro a cada 60s, relatório com temp máx/mín/média por sensor + indicação máx-mín/média-mín/máx-média + gráfico temperatura×tempo.
- **Art. 15 (regra geral, vale para qualquer equipamento)**: mín. 12 sensores se volume interno ≥60L, mín. 3 sensores se <60L. Nenhum sensor pode ser excluído do relatório final.
- **Anexo A/B**: conteúdo mínimo do protocolo e do relatório final (identificação do equipamento, instrumentos usados com erro de calibração, resultados, conclusão, assinatura).
- A norma **não detalha IQ/OQ como procedimento próprio** — só exige que a documentação de instalação/operação já exista e seja conferida no protocolo (Anexo A, item k). O que ela instrumenta em detalhe é desempenho térmico (mapeia para OQ "em vazio" + PQ "com carga" + testes de porta/energia).
- **Não existe conceito de F0/letalidade nem fases de vácuo/pulso em cadeia de frio** — isso é exclusivo de esterilização a vapor (Anexo C, autoclave). Cadeia de frio é monitoramento contínuo dentro de uma faixa alvo.

---

## 2. Decisões já fechadas com o usuário

1. **Escopo de equipamentos (v1, "tudo junto")**:

   | Equipamento | Faixa operacional | Observação |
   |---|---|---|
   | Refrigerador comum | 2 a 8°C | Perfil fixo |
   | Câmara de conservação de vacina | 2 a 8°C | Mesmo perfil térmico do refrigerador, rótulo/identificação diferente no relatório |
   | Câmara fria | Configurável por ensaio | Volumes maiores, temperatura varia por instalação — técnico define tMin/tMax na abertura do ensaio |
   | Freezer | -10°C / -20°C / -30°C | 3 subperfis (como os 134/121/127°C da Autoclave hoje) |
   | Ultrafreezer | -80°C / -85°C | 2 subperfis |
   | Caixa térmica | 2 a 8°C | **Ensaio diferente dos outros**: sem duração alvo fixa — o objetivo é medir autonomia (quanto tempo ela sustenta a faixa), não aprovar/reprovar contra um tempo pré-definido |

2. **Estudos cobertos (v1)**: distribuição em vazio (24h) + distribuição com carga (24h) + abertura de porta (total ou semi-aberta — tratada como metadado/descrição, mesma lógica de cálculo) + queda de energia (≥30min configurável, sem tempo fixo cravado no motor). Para caixa térmica: só autonomia.

3. **Arquitetura**: **projeto Apps Script standalone separado**, no mesmo padrão do `gerador_autoclave_relatorio` / `projeto_exec_1_akfycbwt` (motor fonte + depois proxy `doPost` para o Portal). Decisão explícita do usuário: quer manter essa separação porque no futuro vão retomar **outro portal** e inserir esse motor nele também — não faz sentido embutir nativo só no Portal atual.

4. **Fotos**: **fora de escopo por enquanto**. O usuário tem uma ideia própria para isso e vai conduzir depois que o módulo estiver rodando validado. Motor deve ficar **funcionalmente idêntico ao da Autoclave hoje** (que não tem upload de foto) — não implementar nada de imagem nesta fase.

5. **IQ (qualificação de instalação)**: fora de escopo por enquanto. Só motor térmico (OQ "em vazio" + PQ "com carga" + porta + energia), via importação de datalogger.

---

## 3. O que reaproveita do motor da Autoclave e o que é novo

Estudei o motor completo da Autoclave (`apps-script-imports/gerador_autoclave_relatorio/`: `Config.js`, `Main.js`, `Parser.js`, `AnaliseCiclo.js`, `Graficos.js`, `Planilha.js`, `LeakTest.js`, `Simulador.js`) e a versão portada no Portal (`apps-script-imports/portal_sgo_versao_cnpj_db/SGO_AutoRel_*.js` + `SGO_TemplateAutoclave.js` + `JS_AutoclaveRelatorio.html`, prefixo `tplAutoRel_`/`AutoRel_`).

| Peça da Autoclave | Cadeia de Frio |
|---|---|
| `Parser.js` (leitura de datalogger: Drive file/XLSX/CSV/colar texto, detecção de colunas por cabeçalho, detecção de padrão de data BR/US/ISO, reconstrução de timeline) | **Reaproveita quase sem alteração** — é agnóstico de equipamento, só lê tempo+temperatura(+pressão opcional) |
| `Config.js` → `UCFG.CICLOS` (F0, tBase, z por ciclo 134/121/127/60/55°C) | **Substitui** por `PERFIS` por tipo de equipamento (faixa operacional tMin/tMax) + sensores mínimos calculados pelo volume interno declarado (regra do art. 15, não hardcode fixo em 12 como a Autoclave faz hoje) |
| `AnaliseCiclo.js` → cálculo de F0 e detecção de fases (pré-vácuo/pulso/rampa/exposição/secagem/despressurização) | **Não se aplica** — sem letalidade, sem fases de vácuo. Motor novo (mais simples): estatística contínua por sensor (mín/máx/média, indicação máx-mín/média-mín/máx-média) na janela toda + rotina de **detecção de ruptura de faixa** (usada nos 3 casos: porta, energia, autonomia da caixa) |
| Override manual de janela (`extrairOverrideJanela_`, `localizarIndicePorTempo_` em `AnaliseCiclo.js`) | **Reaproveita direto** — é exatamente o mecanismo certo para o técnico marcar "abri a porta às 14:32, fechei às 14:37" e o motor localizar os índices no arquivo, e a partir dali medir ruptura/recuperação |
| `motivosReprovacao`/`alertasAnalise`/`observacoesAnalise` (texto técnico estruturado) | **Reaproveita o padrão**, adaptando o critério (faixa operacional em vez de F0 mínimo) |
| `Planilha.js`/`Graficos.js` (dashboard em Google Sheets, texto rico com negrito automático em termos como "APROVADO"/"REPROVADO", gráficos nativos, link de exportação PDF paisagem) | **Reaproveita o padrão inteiro** — troca as abas de F0/pressão por abas de faixa/porta/energia/autonomia |
| Diagrama de distribuição de sensores (Fig C.2/C.3 da Autoclave) | Novo layout, baseado na Fig G.1 da norma (níveis/prateleiras de refrigerador/câmara/freezer) |
| Busca de CNPJ (BrasilAPI), padrão proxy `doPost` + `tplXxx_`/`Xxx_`, backup antes de editar, DEV primeiro sempre, nunca criar deployment novo | **Idêntico**, sem mudança |
| Upload de foto | **Fora de escopo** (decisão do usuário, seção 2.4) |

---

## 4. Estrutura de arquivos proposta (ainda não criada)

Novo projeto standalone, nome sugerido `gerador_cadeia_frio_relatorio` (espelhando `gerador_autoclave_relatorio`):

- `Config.js` — perfis operacionais (refrigerador/vacina 2-8°C, câmara fria configurável, freezer -10/-20/-30°C, ultrafreezer -80/-85°C, caixa térmica 2-8°C modo autonomia), sensores mínimos por volume, pastas Drive, cores
- `Parser.js` — leitura de datalogger (adaptado do Parser.js atual, mudança mínima)
- `Engine.js` (substitui `AnaliseCiclo.js`) — estatística por sensor, detecção de ruptura de faixa (compartilhada entre porta/energia/autonomia), motor de aprovação/reprovação
- `Planilha.js` + `Graficos.js` — geração do Sheets com abas + gráficos + link PDF
- `Main.js` — doGet, apiDispatch, apiConsultarCnpj, apiPreviewEntrada, apiConverter (mesmo papel do Main.js da Autoclave)
- `Index.html` / `App.html` / `Estilos.html` — frontend do standalone (mesmo padrão)

Depois, quando validado: proxy `doPost` no standalone + `SGO_CadeiaFrio.js`/`JS_CadeiaFrio.html` no Portal (`apps-script-imports/portal_sgo_versao_cnpj_db/`), prefixo `tplCadeiaFrio_`/`CadeiaFrio_`, seguindo as convenções documentadas em `docs/STATUS_SESSAO_PORTAL_CNPJ_DB_20260709.md` (backup antes de editar, DEV primeiro, nunca `clasp push --force`, nunca criar deployment novo).

---

## 5. Estrutura do relatório (abas do Google Sheets)

1. Capa/identificação — cliente (CNPJ via BrasilAPI), equipamento, tipo de perfil, status geral
2. Instrumentos e calibração (exigência do Anexo A/B da norma)
3. Distribuição em vazio — tabela por sensor + gráfico temperatura×tempo com linhas de faixa (tMin/tMax)
4. Distribuição com carga — idem
5. Abertura de porta — tempo até ruptura / tempo até recuperação + gráfico do evento
6. Queda de energia — idem
7. (Só para caixa térmica) Autonomia — tempo total sustentado, sem faixa de aprovação/reprovação, é caracterização
8. Dados brutos
9. Conclusão consolidada — texto rico, negrito automático, cor por status (mesmo padrão da Autoclave)

Sem aba de fotos (fora de escopo, seção 2.4).

---

## 6. Progresso — 2026-07-10 (tarde)

**Código local construído e com sintaxe validada (`node --check` em todos os .js, script/CSS extraídos e checados no Index.html).** Nada disso foi enviado ao Google ainda (sem `clasp push`, sem `clasp create`) — só existe localmente em `apps-script-imports/gerador_cadeia_frio_relatorio/`.

Arquivos criados:
- `appsscript.json` — manifesto (mesmo padrão do motor de Autoclave: Drive API avançada, webapp anônimo, timezone BR)
- `Config.js` — `CFCFG` com todos os 9 perfis da seção 2 (Câmara Vacina, Refrigerador, Câmara Fria, Freezer -10/-20/-30, Ultrafreezer -80/-85, Caixa Térmica), regra de sensores mínimos por volume (`cfCalcularSensoresMinimos_`), paleta de cores
- `Parser.js` — cópia do Parser.js da Autoclave com `UCFG` trocado por `CFCFG` (função é agnóstica de equipamento, não precisou de mudança lógica)
- `Engine.js` — motor novo: `cfAnalisarDistribuicao` (distribuição em vazio/com carga — estatística por sensor + indicação máx-mín/média-mín/máx-média + detecção de pior desvio da faixa), `cfAnalisarEventoRuptura` (abertura de porta e queda de energia — localiza a janela do evento pelo horário informado pelo técnico, detecta primeira ruptura e recuperação total, aprovação opcional contra um tempo-alvo), `cfAnalisarAutonomia` (caixa térmica — mede até romper, sem tempo-alvo)
- `Main.js` — `doGet`, `apiDispatch`, `apiPing`, `apiConsultarCnpj` (BrasilAPI), `apiUploadArquivo`, `apiPreviewEntrada`, `apiConverter` (cérebro: perfil → faixa → sensores → Parser → Engine → Planilha → Graficos → PDF)
- `Planilha.js` — gera o Google Sheets: aba Capa, Resultados (varia por tipo de estudo), Dados Brutos (com colunas de referência Limite Mín/Máx para o gráfico), Conclusão (texto rico com negrito/cor por status)
- `Graficos.js` — gráfico nativo de linha (temperatura × tempo) com linhas tracejadas de limite mín/máx, lido da aba de dados brutos
- `Index.html` — frontend único (sem separar em App/Estilos): cliente/CNPJ, equipamento, perfil (dropdown dinâmico vindo de `apiPing`), faixa operacional (editável só quando o perfil permite), tipo de estudo (filtrado pelos estudos disponíveis do perfil), campos condicionais de evento (início/fim, tipo de abertura, tempo-alvo) para porta/energia, grade de sensores ativos, importação de datalogger (Drive ID/link ou colar texto), pré-visualização, geração do relatório com link de planilha/PDF

## 7. Próximos passos (retomar 2026-07-11)

1. **Confirmar/ajustar as faixas dos perfis configuráveis** (câmara fria, freezer, ultrafreezer) com o usuário — os valores atuais em `Config.js` são estimativas de partida, não validadas.
2. ~~Preencher `LAUDOS_FOLDER_ID` e `UPLOAD_FOLDER_ID`~~ — **resolvido de outra forma em 2026-07-13**: em vez de exigir IDs fixos em `Config.js`, `Main.js` ganhou `cfObterPastaPersistente_()`, que cria as pastas "Cadeia de Frio - Laudos" e "Cadeia de Frio - Uploads" na raiz do Drive na primeira execução e guarda o ID em `PropertiesService` para reuso. `Config.js` continua com os campos vazios de propósito (fallback automático). Só editar `Config.js` se o usuário quiser apontar para pastas específicas.
3. ~~Provisionar o projeto Apps Script de verdade~~ — **feito em 2026-07-13, manhã**: `clasp create`, scriptId `1m89MNJCm384yHQCaJekHKAOb0CUul8W1_e1lGTHCQd3mX6WegQMKuT5G`. Sessão anterior fechou logo depois desse passo; retomada confirmou que nada tinha sido perdido.
4. ~~`clasp push`~~ — **feito em 2026-07-13** (8 arquivos). `clasp run` para provisionamento automático das pastas não funcionou (mesmo bloqueio de Execution API sem GCP dedicado já visto no FIN_FLASH_V2 — ver [[feedback_clasp_run_user_flag_position]]); contornado com o fallback de `PropertiesService` do item 2 em vez de perseguir a configuração de GCP.
5. **Testar de ponta a ponta no navegador com um datalogger real de Câmara de Conservação** — **próximo passo pendente**. URL de teste (`@HEAD`, sempre reflete o último `clasp push`): `https://script.google.com/macros/s/AKfycbycv287aWYHH9RWHthMnJ2Pc_DpNakH1n2hP0-tijg/exec`. Testar os 3 estudos (distribuição 24h, abertura de porta semi-aberta, queda de energia) — é aqui que bugs de verdade vão aparecer (parsing de datalogger real, formato de data/hora do equipamento específico, etc.).
6. Só depois da validação humana: pensar no proxy `doPost` + módulo no Portal (`SGO_CadeiaFrio.js`/`JS_CadeiaFrio.html`, prefixo `tplCadeiaFrio_`).
7. Equipamentos fora da prioridade atual (refrigerador comum, câmara fria, freezer, ultrafreezer, caixa térmica) já têm perfil configurado no `Config.js`, mas **não foram testados** — tratar como não confiável até validação específica de cada um.

## 8. Paridade com a Autoclave — tema dark + Relatório Interno (2026-07-13)

Portado do motor de Autoclave (`apps-script-imports/gerador_autoclave_relatorio/`) e adaptado ao domínio de cadeia de frio:

- **Tema dark**: `Estilos.html` novo (cópia do padrão "METROLABS COMFORT DARK" da Autoclave). `Index.html` reescrito para usar o vocabulário de classes da Autoclave (`header-card`, `panel`, `form-row/form-group/form-control`, `btn-primary/btn-secondary`, `status-badge`, `alert-box`, `data-table`, `check-grid/check-item`) em vez do CSS claro hardcoded anterior. JS de UI (IDs) não mudou.
- **Modo Relatório Interno (dados reconstituídos)**: botão "RELATÓRIO INTERNO" no header pede senha (`SIMULADOR_ADMIN_SENHA` em Script Properties, ou fallback `METROLABS@2026` em `Config.js`), seleciona `modoEntrada = SIMULADO_ADMIN` e revela um bloco de formulário com início/fim do estudo, temperatura alvo e intervalo entre leituras. Para estudos de abertura de porta / queda de energia, **reaproveita os campos normais "Início do evento"/"Fim do evento"** da seção 3 em vez de duplicar — mais simples que a Autoclave porque a física de cadeia de frio não tem pré-vácuo/esterilização/secagem, só permanência dentro de faixa operacional. Arquivo novo `Simulador.js` (`cfGerarDadosSimuladosAdmin_`) gera a curva sintética: estável em torno do alvo para estudos de distribuição, ou estável até o evento + excursão além de tMax + recuperação gradual (se "fim do evento" foi informado) para os estudos de ruptura. `Planilha.js` estampa a faixa "RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA" nas abas Capa, Resultados e Conclusão (não na aba "Dados Brutos" — ali quebraria o range fixo que `Graficos.js` lê para montar o gráfico).
- **Console Operacional / LOG OPERACIONAL**: faltou na primeira leva (a Autoclave tem um painel de log em tempo real via `writeLog()`/`#terminalLog`, usando o `.terminal`/`.terminal-wrap` do `Estilos.html` que já tinha sido portado mas ficou sem uso). Adicionado painel "Console Operacional" no fim do `Index.html` da Cadeia de Frio com `writeLog()` local, e chamadas de log nos pontos-chave do fluxo (carregamento do sistema, consulta de CNPJ, ativação do modo Relatório Interno, pré-visualização, geração do relatório — incluindo motivos de reprovação/alertas/observações da análise).
- **Autonomia (caixa térmica)**: ramo próprio no `Simulador.js`, separado dos ramos de Distribuição/Evento (não reaproveita a curva genérica que nunca rompe). Modela decaimento térmico passivo (lei de aquecimento de Newton): parte de um ponto frio dentro da faixa (`tMin + 25% da amplitude`) e sobe assintoticamente rumo a uma temperatura ambiente fixa de 27°C. Novo campo opcional "Autonomia estimada (min)" na UI calibra a constante de tempo `tau` para que a curva rompa `tMax` perto do valor informado (sem preencher, default é romper perto de 55% da janela do estudo); se o valor informado for maior que a janela, a ruptura não aparece nos dados — mesmo comportamento de "autonomia não observada" do motor real (`Engine.js → cfAnalisarAutonomia`). Sem conflito com os outros dois ramos: `ehAutonomia` é verificado antes de `ehEvento` em `cfCalcularTemperaturaBaseSimulada_`.
- Enviado ao Google com `clasp push` em 2026-07-13 (10 arquivos, revisão final incluindo o log e a autonomia). **Ainda não testado no navegador** — usuário vai testar o modo Relatório Interno agora para já gerar um relatório de teste.
